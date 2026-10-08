import type { IncomingMessage, ServerResponse } from 'node:http'
import { requireAdmin, UserApiError } from '../auth.ts'
import { database } from '../db/index.ts'
import { sendJson } from '../http.ts'
import { ADMIN_ENDPOINTS, queryAnalytics } from '../admin/analytics.ts'

export async function handleAdminApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (!url.pathname.startsWith('/api/admin/')) return false
  try {
    await requireAdmin(req)
    const endpoint = ADMIN_ENDPOINTS.find(name => url.pathname === `/api/admin/${name}`)
    if (!endpoint) throw new UserApiError(404, 'not-found')
    if (req.method !== 'GET') throw new UserApiError(405, 'method-not-allowed')
    const hasRange = ['trends', 'decks', 'spreads', 'feedback'].includes(endpoint)
    for (const key of url.searchParams.keys()) {
      if (!hasRange || key !== 'range') throw new UserApiError(400, 'invalid-range')
    }
    if (url.searchParams.getAll('range').length > 1) throw new UserApiError(400, 'invalid-range')
    const range = url.searchParams.get('range') ?? (endpoint === 'trends' ? '7d' : '30d')
    if (!['7d', '30d', '90d'].includes(range)) throw new UserApiError(400, 'invalid-range')
    const client = await database().connect()
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
      const result = await queryAnalytics(client, endpoint, Number(range.slice(0, -1)))
      await client.query('COMMIT')
      sendJson(res, 200, result)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
  } catch (error) {
    const known = error instanceof UserApiError
    if (!known) console.error('[admin-api] Analytics query failed. Check database migrations and connectivity.')
    sendJson(res, known ? error.status : 503, { error: { code: known ? error.code : 'service-unavailable' } })
  }
  return true
}
