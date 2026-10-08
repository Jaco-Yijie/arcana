import '../env.ts'
import pg from 'pg'

let pool: pg.Pool | undefined

export function database(): pg.Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      options: '-c timezone=UTC',
      max: 10,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    })
    pool.on('error', () => console.error('[database] idle connection failed'))
  }
  return pool
}

export async function closeDatabase() {
  await pool?.end()
  pool = undefined
}
