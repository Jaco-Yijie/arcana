// $1 is an IANA operating timezone; $2 is a database-sourced snapshot timestamp.
// Bounds are converted once to absolute instants so timestamp indexes remain usable.
export const BOUNDS = `WITH clock AS (
  SELECT $1::text AS tz, $2::timestamptz AS as_of
), local_day AS (
  SELECT *, (as_of AT TIME ZONE tz)::date AS today FROM clock
), bounds AS (
  SELECT *, today::timestamp AT TIME ZONE tz AS start_today,
    (today - 6)::timestamp AT TIME ZONE tz AS start_7d,
    (today - 29)::timestamp AT TIME ZONE tz AS start_30d FROM local_day
)`

export const OVERVIEW_SQL = `${BOUNDS}, activity AS (
  SELECT user_id, login_time AS at FROM user_sessions, bounds WHERE login_time >= start_30d AND login_time < as_of
  UNION ALL
  SELECT user_id, created_at AS at FROM readings, bounds WHERE created_at >= start_30d AND created_at < as_of
), users_totals AS (
  SELECT count(*) FILTER(WHERE status <> 'disabled')::int AS "totalUsers",
    count(*) FILTER(WHERE created_at >= start_today)::int AS "newUsersToday",
    count(*) FILTER(WHERE created_at >= start_7d)::int AS "newUsers7d",
    count(*) FILTER(WHERE created_at >= start_30d)::int AS "newUsers30d"
  FROM users, bounds WHERE created_at < as_of
), activity_totals AS (
  SELECT count(DISTINCT user_id) FILTER(WHERE at >= start_today)::int AS dau,
    count(DISTINCT user_id) FILTER(WHERE at >= start_7d)::int AS wau,
    count(DISTINCT user_id)::int AS mau FROM activity, bounds
), reading_totals AS (
  SELECT count(*)::int AS "totalReadings",
    count(*) FILTER(WHERE created_at >= start_today)::int AS "readingsToday",
    count(*) FILTER(WHERE created_at >= start_7d)::int AS "readings7d",
    count(*) FILTER(WHERE created_at >= start_30d)::int AS "readings30d"
  FROM readings, bounds WHERE created_at < as_of
), feedback_totals AS (
  SELECT count(*)::int AS "feedbackCount", avg(rating)::float8 AS "averageRating"
  FROM feedback, bounds WHERE created_at < as_of
)
SELECT *, coalesce("readings30d"::float8 / nullif(mau, 0), 0) AS "readingsPerActiveUser"
FROM users_totals CROSS JOIN activity_totals CROSS JOIN reading_totals CROSS JOIN feedback_totals`

export const TRENDS_SQL = `${BOUNDS}, period AS (
  SELECT *, (today - ($3::int - 1))::timestamp AT TIME ZONE tz AS start_at FROM bounds
), days AS (
  SELECT today - n AS day FROM period CROSS JOIN generate_series(0, $3::int - 1) n
), new_users AS (
  SELECT (created_at AT TIME ZONE tz)::date AS day, count(*)::int AS total
  FROM users, period WHERE created_at >= start_at AND created_at < as_of GROUP BY 1
), daily_readings AS (
  SELECT (created_at AT TIME ZONE tz)::date AS day, count(*)::int AS total
  FROM readings, period WHERE created_at >= start_at AND created_at < as_of GROUP BY 1
), activity AS (
  SELECT user_id, (login_time AT TIME ZONE tz)::date AS day
  FROM user_sessions, period WHERE login_time >= start_at AND login_time < as_of
  UNION
  SELECT user_id, (created_at AT TIME ZONE tz)::date AS day
  FROM readings, period WHERE created_at >= start_at AND created_at < as_of
), daily_active AS (
  SELECT day, count(*)::int AS total FROM activity GROUP BY day
)
SELECT to_char(days.day, 'YYYY-MM-DD') AS date, coalesce(n.total, 0) AS "newUsers",
  coalesce(a.total, 0) AS "activeUsers", coalesce(r.total, 0) AS readings
FROM days LEFT JOIN new_users n USING(day) LEFT JOIN daily_active a USING(day)
LEFT JOIN daily_readings r USING(day) ORDER BY days.day`

// The identifiers are fixed in source, never supplied by a request parameter.
function rankingSql(column: 'deck_id' | 'spread_type', alias: 'deckId' | 'spreadType') {
  return `${BOUNDS}, totals AS (
    SELECT ${column}, count(*)::int AS readings FROM readings, bounds
    WHERE created_at >= (today - ($3::int - 1))::timestamp AT TIME ZONE tz AND created_at < as_of
    GROUP BY ${column}
  ) SELECT ${column} AS "${alias}", readings,
    (100.0 * readings / sum(readings) OVER())::float8 AS percentage
  FROM totals ORDER BY readings DESC, ${column} LIMIT 5`
}
export const DECKS_SQL = rankingSql('deck_id', 'deckId')
export const SPREADS_SQL = rankingSql('spread_type', 'spreadType')

export const FEEDBACK_SQL = `${BOUNDS}
SELECT count(*)::int AS total, avg(rating)::float8 AS "averageRating",
  jsonb_build_object('1', count(*) FILTER(WHERE rating=1), '2', count(*) FILTER(WHERE rating=2),
    '3', count(*) FILTER(WHERE rating=3), '4', count(*) FILTER(WHERE rating=4), '5', count(*) FILTER(WHERE rating=5)) AS distribution
FROM feedback, bounds
WHERE created_at >= (today - ($3::int - 1))::timestamp AT TIME ZONE tz AND created_at < as_of`

export const RETENTION_SQL = `${BOUNDS}, members AS (
  SELECT id, (created_at AT TIME ZONE tz)::date AS cohort_date FROM users, bounds WHERE created_at < as_of
), targets AS (
  SELECT members.*, n, tz, today, cohort_date + n < today AS mature,
    (cohort_date + n)::timestamp AT TIME ZONE tz AS target_start,
    (cohort_date + n + 1)::timestamp AT TIME ZONE tz AS target_end
  FROM members CROSS JOIN bounds CROSS JOIN (VALUES(1),(7),(30)) horizons(n)
), observed AS (
  SELECT cohort_date, n, mature,
    CASE WHEN mature THEN
      EXISTS(SELECT 1 FROM user_sessions s WHERE s.user_id=targets.id AND s.login_time >= target_start AND s.login_time < target_end)
      OR EXISTS(SELECT 1 FROM readings r WHERE r.user_id=targets.id AND r.created_at >= target_start AND r.created_at < target_end)
    ELSE false END AS returned FROM targets
), cohort_rates AS (
  SELECT cohort_date, n, count(*)::int AS users,
    count(*) FILTER(WHERE mature)::int AS eligible,
    count(*) FILTER(WHERE mature AND returned)::int AS returned,
    (100.0 * count(*) FILTER(WHERE mature AND returned) / nullif(count(*) FILTER(WHERE mature),0))::float8 AS rate
  FROM observed GROUP BY cohort_date,n
), totals AS (
  SELECT n, sum(eligible)::int AS eligible,
    (100.0 * sum(returned) / nullif(sum(eligible),0))::float8 AS rate FROM cohort_rates GROUP BY n
), cohorts AS (
  SELECT cohort_date, max(users) AS users,
    jsonb_object_agg('d'||n, jsonb_build_object('eligible',eligible,'returned',returned,'rate',rate)) AS measures
  FROM cohort_rates GROUP BY cohort_date ORDER BY cohort_date DESC LIMIT 90
)
SELECT (SELECT rate FROM totals WHERE n=1) AS d1,
  (SELECT rate FROM totals WHERE n=7) AS d7, (SELECT rate FROM totals WHERE n=30) AS d30,
  jsonb_build_object('d1',coalesce((SELECT eligible FROM totals WHERE n=1),0),
    'd7',coalesce((SELECT eligible FROM totals WHERE n=7),0),
    'd30',coalesce((SELECT eligible FROM totals WHERE n=30),0)) AS denominators,
  coalesce((SELECT jsonb_agg(jsonb_build_object('date',to_char(cohort_date,'YYYY-MM-DD'),'users',users) || measures ORDER BY cohort_date DESC) FROM cohorts),'[]'::jsonb) AS cohorts`
