import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { database } from '../db/index.ts'
import { assertSameOrigin, authKey, hashPassword, isUuid, requireUser, SESSION_SECONDS, setSessionCookie, signToken, UserApiError, verifyPassword } from '../auth.ts'
import { readJsonBody, sendJson, tooManyRequests } from '../http.ts'
import { ALL_DECK_IDS } from '../../src/decks/ids.ts'
import { spreads } from '../../src/data/spreads.ts'
import { allCards } from '../../src/data/deck/index.ts'

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let value: unknown
  try { value = await readJsonBody(req) } catch { throw new UserApiError(400, 'invalid-body') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UserApiError(400, 'invalid-body')
  return value as Record<string, unknown>
}

function credentials(data: Record<string, unknown>, register: boolean) {
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
  const password = typeof data.password === 'string' ? data.password : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserApiError(400, 'invalid-email')
  if (password.length < (register ? 8 : 1) || password.length > 128) throw new UserApiError(400, 'invalid-password')
  if (register && password !== data.confirmPassword) throw new UserApiError(400, 'password-mismatch')
  return { email, password }
}

export function validateReading(data: Record<string, unknown>) {
  const spread = spreads.find(item => item.id === data.spread_type)
  if (typeof data.client_session_id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.client_session_id)
    || !ALL_DECK_IDS.some(id => id === data.deck_id) || !spread
    || typeof data.question !== 'string' || data.question.length > 10000
    || typeof data.interpretation !== 'string' || !data.interpretation.trim() || data.interpretation.length > 150000
    || !Array.isArray(data.cards) || data.cards.length !== spread.cardCount
    || typeof data.created_at !== 'string' || !Number.isFinite(Date.parse(data.created_at))
    || Date.parse(data.created_at) > Date.now() + 300000) throw new UserApiError(400, 'invalid-reading')
  const cards = data.cards as Record<string, unknown>[]
  if (cards.some(card => !card || typeof card !== 'object'
      || !allCards.some(item => item.id === card.cardId)
      || !['upright', 'reversed'].includes(String(card.orientation))
      || !spread.positions.some(position => position.id === card.positionId))
    || new Set(cards.map(card => card.cardId)).size !== cards.length
    || new Set(cards.map(card => card.positionId)).size !== cards.length) throw new UserApiError(400, 'invalid-reading')
  return {
    client_session_id: data.client_session_id, deck_id: data.deck_id, spread_type: spread.id,
    question: data.question, interpretation: data.interpretation, created_at: data.created_at,
    cards: cards.map(({ cardId, orientation, positionId }) => ({ cardId, orientation, positionId })),
  }
}

const publicColumns = 'id, email, username, avatar, created_at, last_login_at, status, role'
// A missing account still runs scrypt, avoiding a fast account-existence timing signal.
const dummyHash = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`

export async function handleUserApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  const path = url.pathname
  if (!path.startsWith('/api/auth/') && path !== '/api/readings' && !path.startsWith('/api/readings/') && path !== '/api/feedback') return false
  try {
    if (req.method === 'POST') assertSameOrigin(req)
    if ((path === '/api/auth/register' || path === '/api/auth/login') && req.method === 'POST') {
      if (tooManyRequests(req)) throw new UserApiError(429, 'rate-limited')
      authKey()
      const register = path.endsWith('/register')
      const { email, password } = credentials(await body(req), register)
      const passwordHash = register ? await hashPassword(password) : null
      const client = await database().connect()
      try {
        await client.query('BEGIN')
        let user
        if (register) {
          const result = await client.query(`INSERT INTO users(id,email,password_hash,username,last_login_at) VALUES($1,$2,$3,$4,now()) RETURNING ${publicColumns}`,
            [randomUUID(), email, passwordHash, email.split('@')[0].slice(0, 80)])
          user = result.rows[0]
        } else {
          const result = await client.query('SELECT * FROM users WHERE email = $1 FOR UPDATE', [email])
          const candidate = result.rows[0]
          const valid = await verifyPassword(password, candidate?.password_hash ?? dummyHash)
          if (!valid || !candidate || candidate.status !== 'active') throw new UserApiError(401, 'invalid-credentials')
          const updated = await client.query(`UPDATE users SET last_login_at = now() WHERE id = $1 RETURNING ${publicColumns}`, [candidate.id])
          user = updated.rows[0]
        }
        const sessionId = randomUUID()
        const token = await signToken(user.id, sessionId)
        await client.query('INSERT INTO user_sessions(id,user_id,device,ip,expires_at) VALUES($1,$2,$3,$4,$5)',
          [sessionId, user.id, (req.headers['user-agent'] ?? '').slice(0, 512), req.socket.remoteAddress ?? null, new Date(Date.now() + SESSION_SECONDS * 1000)])
        await client.query('COMMIT')
        setSessionCookie(res, token)
        sendJson(res, register ? 201 : 200, { user })
      } catch (error) {
        await client.query('ROLLBACK')
        if ((error as { code?: string }).code === '23505') throw new UserApiError(409, 'email-exists')
        throw error
      } finally { client.release() }
      return true
    }
    if (path === '/api/auth/logout' && req.method === 'POST') {
      try {
        const { sessionId } = await requireUser(req)
        await database().query('UPDATE user_sessions SET revoked_at = now() WHERE id = $1', [sessionId])
      } catch (error) {
        if (!(error instanceof UserApiError && error.status === 401)) throw error
      }
      setSessionCookie(res, null)
      sendJson(res, 200, { ok: true })
      return true
    }
    const { user } = await requireUser(req)
    if (path === '/api/auth/me' && req.method === 'GET') {
      sendJson(res, 200, { user })
    } else if (path === '/api/readings' && req.method === 'POST') {
      if (req.headers['x-arcana-user'] !== user.id) throw new UserApiError(409, 'account-changed')
      const data = validateReading(await body(req))
      // Ignore client-supplied user IDs. The verified session exclusively determines ownership.
      const values = [randomUUID(), user.id, data.client_session_id, data.deck_id, data.spread_type, data.question, JSON.stringify(data.cards), data.interpretation, data.created_at]
      const result = await database().query(
        `INSERT INTO readings(id,user_id,client_session_id,deck_id,spread_type,question,cards,interpretation,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(user_id,client_session_id) DO NOTHING RETURNING id,created_at`, values)
      const reading = result.rows[0] ?? (await database().query('SELECT id,created_at FROM readings WHERE user_id=$1 AND client_session_id=$2', [user.id, data.client_session_id])).rows[0]
      sendJson(res, result.rowCount ? 201 : 200, { reading })
    } else if (path === '/api/readings' && req.method === 'GET') {
      const offset = Number(url.searchParams.get('offset') ?? 0)
      if (!Number.isSafeInteger(offset) || offset < 0) throw new UserApiError(400, 'invalid-body')
      const result = await database().query('SELECT * FROM readings WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $2', [user.id, offset])
      sendJson(res, 200, { readings: result.rows, nextOffset: result.rows.length === 50 ? offset + 50 : null })
    } else if (path.startsWith('/api/readings/') && req.method === 'GET') {
      const id = path.slice('/api/readings/'.length)
      if (!isUuid(id)) throw new UserApiError(404, 'not-found')
      const result = await database().query('SELECT * FROM readings WHERE id=$1 AND user_id=$2', [id, user.id])
      if (!result.rowCount) throw new UserApiError(404, 'not-found')
      sendJson(res, 200, { reading: result.rows[0] })
    } else if (path === '/api/feedback' && req.method === 'POST') {
      const data = await body(req)
      if (!isUuid(data.reading_id) || !Number.isInteger(data.rating) || Number(data.rating) < 1 || Number(data.rating) > 5
        || (data.comment !== undefined && (typeof data.comment !== 'string' || data.comment.length > 4000))) throw new UserApiError(400, 'invalid-feedback')
      const result = await database().query(
        `INSERT INTO feedback(id,user_id,reading_id,rating,comment)
         SELECT $1,$2,id,$4,$5 FROM readings WHERE id=$3 AND user_id=$2
         ON CONFLICT(user_id,reading_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment RETURNING *`,
        [randomUUID(), user.id, data.reading_id, data.rating, data.comment ?? ''])
      if (!result.rowCount) throw new UserApiError(404, 'not-found')
      sendJson(res, 200, { feedback: result.rows[0] })
    } else { throw new UserApiError(404, 'not-found') }
  } catch (error) {
    const known = error instanceof UserApiError
    if (!known) console.error('[user-api] Database operation failed; check connectivity and migrations.')
    sendJson(res, known ? error.status : 503, { error: { code: known ? error.code : 'service-unavailable' } })
  }
  return true
}
