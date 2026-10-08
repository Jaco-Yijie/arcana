import type { PoolClient } from 'pg'
import type { AdminRetention } from '../../src/types/admin.ts'
import { UserApiError } from '../auth.ts'
import { OVERVIEW_SQL, TRENDS_SQL, DECKS_SQL, SPREADS_SQL, FEEDBACK_SQL, RETENTION_SQL } from './queries.ts'

export const ADMIN_ENDPOINTS = ['overview', 'trends', 'decks', 'spreads', 'feedback', 'retention'] as const
export type AdminEndpoint = typeof ADMIN_ENDPOINTS[number]

export function analyticsTimeZone() {
  const zone = process.env.APP_TIMEZONE || 'Asia/Shanghai'
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format() }
  catch { throw new UserApiError(503, 'invalid-timezone') }
  return zone
}

export async function queryAnalytics(client: PoolClient, endpoint: AdminEndpoint, days = 30, timeZone = analyticsTimeZone(), asOf?: string) {
  const snapshot = asOf ?? (await client.query('SELECT CURRENT_TIMESTAMP AS now')).rows[0].now.toISOString()
  const params = [timeZone, snapshot]
  if (endpoint === 'retention') return (await client.query<AdminRetention>(RETENTION_SQL, params)).rows[0]
  if (endpoint === 'overview') {
    const result = (await client.query(OVERVIEW_SQL, params)).rows[0]
    const retention = (await client.query<AdminRetention>(RETENTION_SQL, params)).rows[0]
    return { ...result, d1Retention: retention.d1, d7Retention: retention.d7, d30Retention: retention.d30, timeZone, generatedAt: snapshot }
  }
  const sql = { trends: TRENDS_SQL, decks: DECKS_SQL, spreads: SPREADS_SQL, feedback: FEEDBACK_SQL }[endpoint]
  const result = await client.query(sql, [...params, days])
  return endpoint === 'feedback' ? result.rows[0] : result.rows
}
