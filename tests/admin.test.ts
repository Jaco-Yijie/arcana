import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { after, test } from 'node:test'
import { SignJWT } from 'jose'
import { database, closeDatabase } from '../server/db/index.ts'
import { migrate } from '../server/db/migrate.ts'
import { authKey, signToken } from '../server/auth.ts'
import { handleAdminApi } from '../server/api/adminRoute.ts'
import { handleUserApi } from '../server/api/userRoute.ts'
import { ADMIN_ENDPOINTS, analyticsTimeZone, queryAnalytics } from '../server/admin/analytics.ts'
import { OVERVIEW_SQL, TRENDS_SQL, RETENTION_SQL, DECKS_SQL, SPREADS_SQL, FEEDBACK_SQL } from '../server/admin/queries.ts'

const asOf = '2026-09-14T04:00:00.000Z'
const skip = !process.env.TEST_DATABASE_URL
if (!skip) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
after(closeDatabase)

test('operating timezone defaults to Shanghai and rejects invalid configuration', () => {
  const previous = process.env.APP_TIMEZONE
  delete process.env.APP_TIMEZONE
  assert.equal(analyticsTimeZone(), 'Asia/Shanghai')
  process.env.APP_TIMEZONE = 'Not/A_Timezone'
  assert.throws(analyticsTimeZone)
  if (previous === undefined) delete process.env.APP_TIMEZONE
  else process.env.APP_TIMEZONE = previous
})

test('SQL metrics: empty/single user, windows, DAU union, weighted exact-day retention, percentages and DST', { skip }, async () => {
  const client = await database().connect()
  try {
    await client.query('BEGIN')
    const schema = `admin_qa_${randomUUID().replaceAll('-', '')}`
    await client.query(`CREATE SCHEMA ${schema}`)
    await client.query(`SET LOCAL search_path TO ${schema}`)
    for (const name of ['001_user_system', '002_admin_analytics']) {
      await client.query(await readFile(new URL(`../server/db/migrations/${name}.sql`, import.meta.url), 'utf8'))
    }
    assert.equal((await client.query('SHOW timezone')).rows[0].TimeZone, 'UTC')
    const query = (endpoint: typeof ADMIN_ENDPOINTS[number], days = 30, zone = 'Asia/Shanghai', at = asOf) => queryAnalytics(client, endpoint, days, zone, at)
    const empty = await query('overview')
    for (const name of ['totalUsers', 'newUsersToday', 'newUsers7d', 'newUsers30d', 'dau', 'wau', 'mau', 'totalReadings', 'readingsToday', 'readings7d', 'readings30d', 'readingsPerActiveUser', 'feedbackCount']) assert.equal(empty[name], 0, name)
    for (const name of ['d1Retention', 'd7Retention', 'd30Retention', 'averageRating']) assert.equal(empty[name], null, name)
    assert.deepEqual(await query('decks'), [])
    assert.deepEqual(await query('spreads'), [])
    assert.deepEqual(await query('feedback'), { total: 0, averageRating: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } })
    for (const days of [7, 30, 90]) {
      const rows = await query('trends', days)
      assert.equal(rows.length, days)
      assert.ok(rows.every((row: { newUsers: number; activeUsers: number; readings: number }) => row.newUsers === 0 && row.activeUsers === 0 && row.readings === 0))
      assert.equal(rows.at(-1).date, '2026-09-14')
    }

    const user = async (date: string, status = 'active') => {
      const id = randomUUID()
      await client.query('INSERT INTO users(id,email,password_hash,username,created_at,status) VALUES($1,$2,$3,$4,$5,$6)', [id, `${id}@example.test`, 'test-fixture-only', 'Fixture', date, status])
      return id
    }
    const login = async (id: string, date: string) => {
      await client.query('INSERT INTO user_sessions(id,user_id,login_time,expires_at) VALUES($1,$2,$3,$4)', [randomUUID(), id, date, '2027-01-01T00:00:00Z'])
    }
    const reading = async (id: string, date: string, deck = 'legacy-moonlight', spread = 'single') => {
      const readingId = randomUUID()
      await client.query("INSERT INTO readings(id,user_id,client_session_id,deck_id,spread_type,question,cards,interpretation,created_at) VALUES($1,$2,$3,$4,$5,'Private fixture question','[]','Private fixture interpretation',$6)", [readingId, id, randomUUID(), deck, spread, date])
      return readingId
    }
    await client.query('SAVEPOINT empty_database')
    await user('2026-09-14T01:00:00Z')
    const single = await query('overview')
    assert.equal(single.totalUsers, 1)
    assert.equal(single.newUsersToday, 1)
    assert.equal(single.d1Retention, null)
    assert.equal(single.averageRating, null)
    await client.query('ROLLBACK TO SAVEPOINT empty_database')

    const ids: string[] = []
    for (const [date, status] of [
      ['2026-09-04T00:00:00Z'], ['2026-09-04T00:00:00Z'], ['2026-09-12T00:00:00Z'],
      ['2026-09-13T00:00:00Z'], ['2026-09-14T01:00:00Z'], ['2026-09-08T00:00:00Z'],
      ['2026-09-06T00:00:00Z'], ['2026-08-10T00:00:00Z', 'disabled'], ['2026-09-13T16:05:00Z'],
    ]) ids.push(await user(date, status))
    const [a, b, c, d, e, f, g, h, i] = ids
    for (let n = 0; n < 5; n++) await login(a, `2026-09-14T01:0${n}:00Z`)
    await login(a, '2026-09-05T02:00:00Z')
    await login(a, '2026-09-11T02:00:00Z')
    await login(b, '2026-09-06T02:00:00Z')
    await login(d, '2026-09-14T02:00:00Z')
    await login(e, '2026-09-14T02:00:00Z')
    const r1 = await reading(a, '2026-09-14T02:00:00Z')
    await reading(c, '2026-09-14T02:00:00Z')
    await reading(i, '2026-09-13T16:10:00Z', 'legacy-classic', 'past-present-future')
    const r2 = await reading(c, '2026-09-13T02:00:00Z', 'legacy-classic', 'past-present-future')
    await reading(g, '2026-09-07T02:00:00Z')
    const r3 = await reading(g, '2026-09-13T02:00:00Z', 'legacy-forest', 'relationship')
    await reading(h, '2026-09-09T02:00:00Z', 'legacy-forest', 'relationship')
    for (const [uid, rid, rating] of [[a, r1, 1], [c, r2, 4], [g, r3, 5]]) {
      await client.query('INSERT INTO feedback(id,user_id,reading_id,rating,comment,created_at) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), uid, rid, rating, 'Private fixture feedback', '2026-09-14T02:30:00Z'])
    }
    const overview = await query('overview')
    const expected = { totalUsers: 8, newUsersToday: 2, newUsers7d: 5, newUsers30d: 8, dau: 5, wau: 7, mau: 8, totalReadings: 7, readingsToday: 3, readings7d: 6, readings30d: 7, readingsPerActiveUser: 7 / 8, d1Retention: 50, d7Retention: 50, d30Retention: 100, feedbackCount: 3 }
    for (const [key, value] of Object.entries(expected)) assert.equal(overview[key], value, key)
    assert.equal(overview.averageRating, 10 / 3)
    const retention = await query('retention')
    assert.deepEqual(retention.denominators, { d1: 6, d7: 4, d30: 1 })
    assert.equal(retention.cohorts.find((row: { date: string }) => row.date === '2026-09-13').d1.rate, null, 'Today is not a complete return day')
    const trends7 = await query('trends', 7)
    assert.equal(trends7[0].date, '2026-09-08')
    assert.deepEqual(trends7.at(-1), { date: '2026-09-14', newUsers: 2, activeUsers: 5, readings: 3 })
    for (const days of [30, 90]) assert.equal((await query('trends', days)).length, days)
    assert.equal((await query('trends', 7, 'UTC')).at(-1).newUsers, 1, 'Shanghai midnight must not be treated as UTC midnight')
    const decks = await query('decks')
    assert.equal(decks[0].deckId, 'legacy-moonlight')
    assert.equal(decks[0].readings, 3)
    assert.ok(Math.abs(decks[0].percentage - 300 / 7) < 1e-9)
    const spreadRows = await query('spreads')
    assert.equal(spreadRows[0].spreadType, 'single')
    assert.ok(Math.abs(spreadRows[0].percentage - 300 / 7) < 1e-9)
    assert.deepEqual((await query('feedback')).distribution, { '1': 1, '2': 0, '3': 0, '4': 1, '5': 1 })
    for (const deck of ['ethereal', 'elysian', 'opaline']) await reading(f, '2026-09-14T02:00:00Z', deck)
    const top5 = await query('decks')
    assert.equal(top5.length, 5)
    assert.equal(top5.reduce((sum: number, row: { percentage: number }) => sum + row.percentage, 0), 90, 'Top 5 denominator includes the omitted sixth deck')

    await user('2026-03-08T06:30:00Z')
    await user('2026-03-08T07:30:00Z')
    const dst = await query('trends', 7, 'America/New_York', '2026-03-09T16:00:00Z')
    assert.equal(dst.length, 7)
    assert.equal(dst.find((row: { date: string }) => row.date === '2026-03-08').newUsers, 2)
    assert.equal(new Set(dst.map((row: { date: string }) => row.date)).size, 7)
  } finally { await client.query('ROLLBACK'); client.release() }
})

test('Admin API verifies current DB role on all endpoints and never exposes private fields', { skip }, async () => {
  process.env.JWT_SECRET = randomBytes(48).toString('base64url')
  await migrate()
  await migrate()
  const uid = randomUUID(), sid = randomUUID()
  const createdIds = [uid]
  await database().query("INSERT INTO users(id,email,password_hash,username) VALUES($1,$2,'fixture','Fixture')", [uid, `${uid}@example.test`])
  await database().query("INSERT INTO user_sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')", [sid, uid])
  const cookie = `arcana_session=${await signToken(uid, sid)}`
  const server = createServer((req, res) => {
    const url = new URL(req.url!, 'http://localhost')
    void (async () => { if (!await handleAdminApi(req, res, url) && !await handleUserApi(req, res, url)) { res.statusCode = 404; res.end() } })()
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  const request = (path: string, token = cookie) => fetch(`${base}${path}`, { headers: { Cookie: token } })
  try {
    for (const name of ADMIN_ENDPOINTS) {
      assert.equal((await request(`/api/admin/${name}`, '')).status, 401, name)
      assert.equal((await request(`/api/admin/${name}`)).status, 403, name)
    }
    const forgedRole = await new SignJWT({ sid, role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setIssuer('arcana').setAudience('arcana-web').setIssuedAt().setExpirationTime('1h').sign(authKey())
    assert.equal((await request('/api/admin/overview', `arcana_session=${forgedRole}`)).status, 403)
    const password = randomBytes(16).toString('hex')
    const registered = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${randomUUID()}@example.test`, password, confirmPassword: password, role: 'admin' }) })
    assert.equal(registered.status, 201)
    const registeredUser = (await registered.json()).user
    createdIds.push(registeredUser.id)
    assert.equal(registeredUser.role, 'user', 'Public registration cannot grant admin')
    await database().query("UPDATE users SET role='admin' WHERE id=$1", [uid])
    for (const name of ADMIN_ENDPOINTS) {
      const response = await request(`/api/admin/${name}`)
      assert.equal(response.status, 200, name)
      assert.match(response.headers.get('content-type')!, /application\/json/)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      const raw = await response.text()
      assert.doesNotMatch(raw, /"(?:email|password_hash|ip|comment|question|interpretation|device|user_id)"\s*:/)
      assert.doesNotMatch(raw, /NaN|Infinity|undefined/)
    }
    for (const days of [7, 30, 90]) {
      const response = await request(`/api/admin/trends?range=${days}d`)
      assert.equal(response.status, 200)
      assert.equal((await response.json()).length, days)
    }
    for (const invalid of ['range=8d', 'range=', 'range=7d&range=30d', 'range=7d&role=admin']) assert.equal((await request(`/api/admin/trends?${invalid}`)).status, 400)
    assert.equal((await request('/api/admin/overview?range=7d')).status, 400)
    assert.equal((await fetch(`${base}/api/admin/overview`, { method: 'POST', headers: { Cookie: cookie } })).status, 405)
    await database().query("UPDATE users SET role='user' WHERE id=$1", [uid])
    assert.equal((await request('/api/admin/overview')).status, 403, 'Role changes invalidate access without reissuing JWT')
    await database().query("UPDATE users SET role='admin',status='disabled' WHERE id=$1", [uid])
    assert.equal((await request('/api/admin/overview')).status, 401)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await database().query('DELETE FROM users WHERE id=ANY($1::uuid[])', [createdIds])
  }
})

test('EXPLAIN ANALYZE core queries on rollback-only synthetic volume', { skip }, async () => {
  const client = await database().connect()
  try {
    await client.query('BEGIN')
    const schema = `admin_perf_${randomUUID().replaceAll('-', '')}`
    await client.query(`CREATE SCHEMA ${schema}`)
    await client.query(`SET LOCAL search_path TO ${schema}`)
    for (const name of ['001_user_system', '002_admin_analytics']) await client.query(await readFile(new URL(`../server/db/migrations/${name}.sql`, import.meta.url), 'utf8'))
    await client.query("INSERT INTO users(id,email,password_hash,username,created_at) SELECT md5('user'||n)::uuid, n||'@example.test','fixture','Fixture',$1::timestamptz-interval '120 days' FROM generate_series(1,2000)n", [asOf])
    await client.query("INSERT INTO user_sessions(id,user_id,login_time,expires_at) SELECT md5('login'||n)::uuid,md5('user'||(1+n%2000))::uuid,$1::timestamptz-(1+n%120)*interval '1 day',$1::timestamptz+interval '7 days' FROM generate_series(1,20000)n", [asOf])
    await client.query("INSERT INTO readings(id,user_id,client_session_id,deck_id,spread_type,question,cards,interpretation,created_at) SELECT md5('reading'||n)::uuid,md5('user'||(1+n%2000))::uuid,n::text,'ethereal','single','','[]','fixture',$1::timestamptz-(1+n%120)*interval '1 day' FROM generate_series(1,6000)n", [asOf])
    for (const table of ['users', 'user_sessions', 'readings', 'feedback']) await client.query(`ANALYZE ${table}`)
    const reports = []
    for (const [name, sql, params] of [
      ['overview', OVERVIEW_SQL, ['Asia/Shanghai', asOf]], ['retention', RETENTION_SQL, ['Asia/Shanghai', asOf]],
      ['trends', TRENDS_SQL, ['Asia/Shanghai', asOf, 30]], ['decks', DECKS_SQL, ['Asia/Shanghai', asOf, 30]],
      ['spreads', SPREADS_SQL, ['Asia/Shanghai', asOf, 30]], ['feedback', FEEDBACK_SQL, ['Asia/Shanghai', asOf, 30]],
    ] as const) {
      const plan = (await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, [...params])).rows[0]['QUERY PLAN'][0]
      assert.ok(Number.isFinite(plan['Execution Time']))
      reports.push({ name, executionMs: plan['Execution Time'], planningMs: plan['Planning Time'], plan: plan.Plan })
    }
    if (process.env.ADMIN_EXPLAIN_REPORT) await writeFile(process.env.ADMIN_EXPLAIN_REPORT, JSON.stringify({ fixture: { users: 2000, sessions: 20000, readings: 6000 }, reports }, null, 2))
    console.log('EXPLAIN ms:', reports.map(row => `${row.name}=${row.executionMs}`).join(', '))
  } finally { await client.query('ROLLBACK'); client.release() }
})
