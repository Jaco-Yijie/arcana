import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { SignJWT } from 'jose'
import { hashPassword, verifyPassword, signToken, authKey } from '../server/auth.ts'
import { handleUserApi, validateReading } from '../server/api/userRoute.ts'
import { database, closeDatabase } from '../server/db/index.ts'
import { migrate } from '../server/db/migrate.ts'
import { allCards } from '../src/data/deck/index.ts'
import { handleReadingStream } from '../server/api/readingRoute.ts'
import { config } from '../server/env.ts'

test('password hashes use independent salts and reject incorrect passwords', async () => {
  const password = randomBytes(20).toString('hex')
  const first = await hashPassword(password)
  assert.notEqual(first, await hashPassword(password))
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword(`${password}x`, first), false)
  assert.equal(await verifyPassword(password, 'invalid'), false)
})

const reading = () => ({
  client_session_id: `ses_${randomUUID()}`,
  deck_id: 'ethereal', spread_type: 'single', question: 'What should I reflect on today?',
  cards: [{ cardId: allCards[0].id, orientation: 'upright', positionId: 'guidance' }],
  interpretation: JSON.stringify({ summary: 'Pause and consider your next step.' }),
  created_at: new Date().toISOString(),
})

test('reading validation rejects missing, invalid and mismatched cards', () => {
  assert.doesNotThrow(() => validateReading(reading()))
  for (const patch of [{ cards: [] }, { cards: [null] }, { deck_id: 'unknown' }, { spread_type: 'unknown' },
    { created_at: 'not-a-date' }, { interpretation: '' }, { cards: [{ cardId: 'invalid', orientation: 'upright', positionId: 'guidance' }] }]) {
    assert.throws(() => validateReading({ ...reading(), ...patch }))
  }
})

test('Mock streaming completes without an AI key and preserves card identity', async () => {
  const previousProvider = config.provider
  config.provider = 'mock'
  const server = createServer((req, res) => { void handleReadingStream(req, res) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const response = await fetch(`http://127.0.0.1:${address.port}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: randomUUID(), question: '看看最近的状态', mode: 'question', theme: null,
        spreadId: 'single', cards: reading().cards, readingMode: 'standard', language: 'zh', deckId: 'ethereal' }),
    })
    assert.equal(response.status, 200)
    const stream = await response.text()
    const event = stream.split('\n\n').find(item => item.startsWith('event: done\n'))
    assert.ok(event, 'Expected a completed Mock reading event')
    const data = JSON.parse(event.split('\ndata: ')[1])
    assert.equal(data.reading.meta.provider, 'mock')
    assert.equal(data.reading.cards[0].cardId, allCards[0].id)
  } finally {
    config.provider = previousProvider
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

test('PostgreSQL: authentication, isolation, idempotency, feedback and revocation', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  // Never use the normal application database implicitly.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.JWT_SECRET = randomBytes(48).toString('base64url')
  process.env.APP_ORIGIN = 'http://localhost:5173'
  await migrate()
  await migrate()
  const ids: string[] = []
  const server = createServer((req, res) => {
    void handleUserApi(req, res, new URL(req.url!, 'http://localhost')).then(handled => {
      if (!handled) { res.statusCode = 404; res.end() }
    })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  const request = async (path: string, data?: unknown, cookie = '', userId = '', origin = 'http://localhost:5173') => {
    const response = await fetch(`${base}${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie, 'X-Arcana-User': userId },
      body: data === undefined ? undefined : JSON.stringify(data),
    })
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '', cookieHeader: response.headers.get('set-cookie') ?? '' }
  }
  try {
    assert.equal((await request('/api/readings')).status, 401)
    const email = `qa-${randomUUID()}@example.test`
    const password = randomBytes(20).toString('hex')
    const data = { email, password, confirmPassword: password }
    assert.equal((await request('/api/auth/register', { ...data, confirmPassword: 'mismatch' })).status, 400)
    const registered = await request('/api/auth/register', { ...data, email: email.toUpperCase() })
    assert.equal(registered.status, 201)
    ids.push(registered.body.user.id)
    assert.equal(registered.body.user.email, email)
    assert.equal('password_hash' in registered.body.user, false)
    assert.ok(registered.cookieHeader.includes('HttpOnly'))
    assert.ok(registered.cookieHeader.includes('SameSite=Lax'))
    assert.equal((await request('/api/auth/me', undefined, registered.cookie)).status, 200)
    assert.equal((await request('/api/auth/register', data)).status, 409)
    assert.equal((await request('/api/auth/login', { email, password: `${password}x` })).status, 401)
    const login = await request('/api/auth/login', { email, password })
    assert.equal(login.status, 200)
    assert.ok(login.body.user.last_login_at)
    const other = await request('/api/auth/register', { ...data, email: `qa-${randomUUID()}@example.test` })
    assert.equal(other.status, 201)
    ids.push(other.body.user.id)
    const payload = { ...reading(), user_id: ids[1] }
    const saved = await request('/api/readings', payload, login.cookie, ids[0])
    assert.equal(saved.status, 201)
    const duplicate = await request('/api/readings', payload, login.cookie, ids[0])
    assert.equal(duplicate.status, 200)
    assert.equal(duplicate.body.reading.id, saved.body.reading.id)
    const detail = await request(`/api/readings/${saved.body.reading.id}`, undefined, login.cookie)
    assert.equal(detail.body.reading.user_id, ids[0])
    assert.equal(detail.body.reading.deck_id, payload.deck_id)
    assert.equal(detail.body.reading.spread_type, payload.spread_type)
    assert.equal(detail.body.reading.question, payload.question)
    assert.equal(detail.body.reading.created_at, payload.created_at)
    assert.deepEqual(detail.body.reading.cards, payload.cards)
    assert.equal(detail.body.reading.interpretation, payload.interpretation)
    assert.equal((await request(`/api/readings/${saved.body.reading.id}`, undefined, other.cookie)).status, 404)
    assert.equal((await request('/api/readings', undefined, other.cookie)).body.readings.length, 0)
    assert.equal((await request('/api/readings', payload, other.cookie, ids[0])).status, 409)
    assert.equal((await request('/api/readings', payload, login.cookie, ids[0], 'https://external.invalid')).status, 403)
    const feedback = { reading_id: saved.body.reading.id, rating: 5, comment: 'Helpful reflection.' }
    assert.equal((await request('/api/feedback', feedback, other.cookie)).status, 404)
    assert.equal((await request('/api/feedback', { ...feedback, rating: 6 }, login.cookie)).status, 400)
    assert.equal((await request('/api/feedback', feedback, login.cookie)).status, 200)
    assert.equal((await request('/api/auth/me', undefined, `${login.cookie}tampered`)).status, 401)
    const expired = await new SignJWT({ sid: randomUUID() }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(ids[0]).setIssuer('arcana').setAudience('arcana-web').setIssuedAt().setExpirationTime('0s').sign(authKey())
    assert.equal((await request('/api/auth/me', undefined, `arcana_session=${expired}`)).status, 401)
    const nonexistentSession = await signToken(ids[0], randomUUID())
    assert.equal((await request('/api/auth/me', undefined, `arcana_session=${nonexistentSession}`)).status, 401)
    assert.equal((await request('/api/auth/logout', {}, login.cookie)).status, 200)
    assert.equal((await request('/api/auth/me', undefined, login.cookie)).status, 401)
    await database().query("UPDATE users SET status='disabled' WHERE id=$1", [ids[0]])
    assert.equal((await request('/api/auth/me', undefined, registered.cookie)).status, 401)
    assert.equal((await request('/api/auth/login', { email, password })).status, 401)
    const sessions = await database().query('SELECT device,ip,login_time,expires_at,revoked_at FROM user_sessions WHERE user_id=$1', [ids[0]])
    assert.equal(sessions.rowCount, 2)
    assert.ok(sessions.rows.some(row => row.revoked_at))
    assert.ok(sessions.rows.every(row => row.device && row.ip && row.expires_at > row.login_time))
    const count = await database().query('SELECT count(*)::int AS count FROM readings WHERE user_id=$1', [ids[0]])
    assert.equal(count.rows[0].count, 1)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    if (ids.length) await database().query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids])
    await closeDatabase()
  }
})
