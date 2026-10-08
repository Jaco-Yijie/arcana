import './env.ts'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { SignJWT, jwtVerify } from 'jose'
import { database } from './db/index.ts'

const derive = promisify(scrypt)
export const SESSION_SECONDS = 7 * 24 * 60 * 60
const COOKIE = 'arcana_session'

export class UserApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code }
}

export function authKey() {
  const secret = process.env.JWT_SECRET ?? ''
  if (Buffer.byteLength(secret) < 32) throw new UserApiError(503, 'auth-unavailable')
  return new TextEncoder().encode(secret)
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(password, salt, 64) as Buffer
  return `scrypt:${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !encoded || !/^[a-f0-9]{128}$/.test(encoded)) return false
  const hash = await derive(password, salt, 64) as Buffer
  return timingSafeEqual(hash, Buffer.from(encoded, 'hex'))
}

export function signToken(userId: string, sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('arcana').setAudience('arcana-web').setSubject(userId)
    .setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).sign(authKey())
}

export function setSessionCookie(res: ServerResponse, token: string | null) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? SESSION_SECONDS : 0}${secure}`)
}

export async function requireUser(req: IncomingMessage) {
  const token = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!token) throw new UserApiError(401, 'unauthorized')
  const key = authKey()
  let sub: string | undefined
  let sid: unknown
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'arcana', audience: 'arcana-web', requiredClaims: ['sub', 'sid', 'exp', 'iat'] })
    sub = payload.sub
    sid = payload.sid
  } catch { throw new UserApiError(401, 'unauthorized') }
  if (!isUuid(sub) || !isUuid(sid)) throw new UserApiError(401, 'unauthorized')
  const result = await database().query(
    `SELECT u.id, u.email, u.username, u.avatar, u.created_at, u.last_login_at, u.status, u.role
     FROM users u JOIN user_sessions s ON s.user_id = u.id
     WHERE u.id = $1 AND s.id = $2 AND u.status = 'active' AND s.revoked_at IS NULL AND s.expires_at > now()`, [sub, sid])
  if (!result.rowCount) throw new UserApiError(401, 'unauthorized')
  return { user: result.rows[0], sessionId: sid }
}

export async function requireAdmin(req: IncomingMessage) {
  const authenticated = await requireUser(req)
  if (authenticated.user.role !== 'admin') throw new UserApiError(403, 'forbidden')
  return authenticated
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function assertSameOrigin(req: IncomingMessage) {
  // JSON-only writes plus origin validation protect cookie-authenticated actions.
  if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw new UserApiError(415, 'json-required')
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new UserApiError(403, 'invalid-origin')
  if (req.headers.origin) {
    const expected = process.env.APP_ORIGIN ?? `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${req.headers.host}`
    if (req.headers.origin !== expected) throw new UserApiError(403, 'invalid-origin')
  }
}
