import { readFile } from 'node:fs/promises'
import { database, closeDatabase } from './index.ts'

export async function migrate() {
  const client = await database().connect()
  try {
    await client.query('BEGIN')
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query('SELECT pg_advisory_xact_lock(73409121)')
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())')
    for (const version of ['001_user_system', '002_admin_analytics']) {
      const applied = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [version])
      if (!applied.rowCount) {
        await client.query(await readFile(new URL(`./migrations/${version}.sql`, import.meta.url), 'utf8'))
        await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version])
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

if (process.argv[1]?.endsWith('/migrate.ts')) {
  try {
    await migrate()
    console.log('Database migrations complete')
  } catch {
    console.error('Database migration failed. Check DATABASE_URL, connectivity and database permissions.')
    process.exitCode = 1
  } finally {
    await closeDatabase()
  }
}
