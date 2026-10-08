import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/atoms/Button'
import { LanguageSwitcher } from '@/components/identity/LanguageSwitcher'
import { AccountError, accountRequest } from '@/features/auth/client'
import { useI18n } from '@/i18n'
import { deckName, spreadName } from '@/i18n/domain'
import { ALL_DECK_IDS } from '@/decks/ids'
import { spreads } from '@/data/spreads'
import type { AdminCohort, AdminDeck, AdminFeedback, AdminOverview, AdminRange, AdminRetention, AdminSpread, AdminTrend } from '@/types/admin'
import '@/styles/admin.css'

interface DashboardData {
  overview: AdminOverview
  trends: AdminTrend[]
  decks: AdminDeck[]
  spreads: AdminSpread[]
  feedback: AdminFeedback
  retention: AdminRetention
}

function Section({ title, note, children, className = '' }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return <section className={`admin-panel ${className}`}>
    <div className="admin-panel-heading"><h2>{title}</h2>{note && <p>{note}</p>}</div>
    {children}
  </section>
}

const tooltipStyle = { backgroundColor: '#222a38', border: '1px solid #485164', borderRadius: 8, color: '#f1f3f7', fontSize: 12 }

function TrendChart({ rows, metric, label, color, bar = false }: { rows: AdminTrend[]; metric: 'newUsers' | 'activeUsers' | 'readings'; label: string; color: string; bar?: boolean }) {
  const { t } = useI18n()
  const empty = rows.every(row => row[metric] === 0)
  const axes = <>
    <CartesianGrid stroke="#303847" vertical={false} />
    <XAxis dataKey="date" tickFormatter={date => String(date).slice(5)} minTickGap={24} tick={{ fill: '#aeb6c4', fontSize: 11 }} axisLine={false} tickLine={false} />
    <YAxis allowDecimals={false} width={36} domain={[0, 'auto']} tick={{ fill: '#aeb6c4', fontSize: 11 }} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f1f3f7' }} />
  </>
  return <>
    {empty && <p className="admin-empty-note">{t('admin.noActivity')}</p>}
    <div className="admin-chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {bar ? <BarChart data={rows} accessibilityLayer margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          {axes}<Bar dataKey={metric} name={label} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart> : <LineChart data={rows} accessibilityLayer margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          {axes}<Line type="linear" dataKey={metric} name={label} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>}
      </ResponsiveContainer>
    </div>
    <details className="admin-data-table"><summary>{t('admin.viewData')}</summary>
      <table><thead><tr><th>{t('admin.date')}</th><th>{label}</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.date}><td>{row.date}</td><td>{row[metric]}</td></tr>)}
      </tbody></table>
    </details>
  </>
}

function Ranking({ rows, label, number, percent }: { rows: { id: string; name: string; readings: number; percentage: number }[]; label: string; number: (n: number) => string; percent: (n: number | null) => string }) {
  const { t } = useI18n()
  if (!rows.length) return <p className="admin-empty">{t('admin.noReadings')}</p>
  return <>
    <div className="admin-ranking-chart" role="img" aria-label={label} style={{ height: Math.max(120, rows.length * 43) }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart layout="vertical" data={rows} accessibilityLayer margin={{ top: 0, right: 22, left: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 'auto']} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={132} tick={{ fill: '#d6dbe5', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f1f3f7' }} />
          <Bar dataKey="readings" name={t('admin.readings')} fill="#b7a47c" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <table className="admin-ranking-table"><thead><tr><th>{t('admin.name')}</th><th>{t('admin.readings')}</th><th>{t('admin.share')}</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{number(row.readings)}</td><td>{percent(row.percentage)}</td></tr>)}</tbody>
    </table>
  </>
}

function Cohorts({ cohorts, percent }: { cohorts: AdminCohort[]; percent: (n: number | null) => string }) {
  const { t } = useI18n()
  return <details className="admin-data-table"><summary>{t('admin.cohorts')}</summary>
    <div className="admin-table-scroll"><table><thead><tr><th>{t('admin.date')}</th><th>{t('admin.users')}</th><th>D1</th><th>D7</th><th>D30</th></tr></thead>
      <tbody>{cohorts.map(cohort => <tr key={cohort.date}><td>{cohort.date}</td><td>{cohort.users}</td>
        {(['d1', 'd7', 'd30'] as const).map(day => <td key={day} title={`${cohort[day].returned} / ${cohort[day].eligible}`}>{percent(cohort[day].rate)}</td>)}
      </tr>)}</tbody></table></div>
  </details>
}

export default function AdminPage() {
  const { t, locale } = useI18n()
  const [range, setRange] = useState<AdminRange>('30d')
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<number | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError(null)
    const get = <T,>(path: string) => accountRequest<T>(`/api/admin/${path}`, undefined, undefined, controller.signal)
    void Promise.all([
      get<AdminOverview>('overview'), get<AdminTrend[]>(`trends?range=${range}`),
      get<AdminDeck[]>(`decks?range=${range}`), get<AdminSpread[]>(`spreads?range=${range}`),
      get<AdminFeedback>(`feedback?range=${range}`), get<AdminRetention>('retention'),
    ]).then(([overview, trends, decks, spreadRows, feedback, retention]) => {
      if (!controller.signal.aborted) setData({ overview, trends, decks, spreads: spreadRows, feedback, retention })
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof AccountError ? cause.status : 503)
    })
    return () => controller.abort()
  }, [range, attempt])

  const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n)
  const percent = (n: number | null) => n === null ? t('admin.notEnough') : `${number(n)}%`
  if (error === 401) return <Navigate to="/login" state={{ returnTo: '/admin' }} replace />
  const overview = data?.overview
  const selectedLabel = t(`admin.ranges.${range}`)
  return <div className="admin-shell">
    <header className="admin-header">
      <div className="admin-brand"><span aria-hidden="true">✦</span><h1>Tarot Admin</h1></div>
      <div className="admin-header-actions"><Link to="/">{t('admin.back')}</Link><LanguageSwitcher />
        <label>{t('admin.range')}<select value={range} onChange={event => setRange(event.target.value as AdminRange)}>
          {(['7d', '30d', '90d'] as const).map(value => <option key={value} value={value}>{t(`admin.ranges.${value}`)}</option>)}
        </select></label><Button variant="quiet" onClick={() => setAttempt(value => value + 1)} disabled={!data && error === null}>{t('admin.refresh')}</Button>
      </div>
    </header>
    <main className="admin-main">
      <div className="admin-context"><p>{t('admin.scope')}</p><p>{t('admin.updated')}: {overview ? new Intl.DateTimeFormat(locale, { timeZone: overview.timeZone, dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(overview.generatedAt)) : '—'}{overview && <span> · {overview.timeZone}</span>}</p></div>
      {error !== null ? <div role="alert" className="admin-state"><h2>{t(error === 403 ? 'admin.forbidden' : 'admin.error')}</h2><p>{t(error === 403 ? 'admin.forbiddenNote' : 'admin.errorNote')}</p>{error !== 403 && <Button onClick={() => setAttempt(value => value + 1)}>{t('auth.retry')}</Button>}</div>
        : !data || !overview ? <div role="status" className="admin-state">{t('admin.loading')}</div> : <>
          <div className="admin-kpis">
            <Section title={t('admin.totalUsers')}><strong>{number(overview.totalUsers)}</strong><p>{t('admin.newToday')}: {number(overview.newUsersToday)}</p></Section>
            <Section title={t('admin.dau')}><strong>{number(overview.dau)}</strong><p>DAU / MAU: {percent(overview.mau ? 100 * overview.dau / overview.mau : null)}</p></Section>
            <Section title={t('admin.todayReadings')}><strong>{number(overview.readingsToday)}</strong><p>{t('admin.last7')}: {number(overview.readings7d)}</p></Section>
            <Section title={t('admin.averageRating')}><strong>{overview.averageRating === null ? '—' : number(overview.averageRating)}<small> / 5</small></strong><p>{t('admin.allFeedback')}: {number(overview.feedbackCount)}</p></Section>
          </div>
          <div className="admin-summary" aria-label={t('admin.moreMetrics')}>
            <span>{t('admin.users7')}: <b>{number(overview.newUsers7d)}</b></span><span>{t('admin.users30')}: <b>{number(overview.newUsers30d)}</b></span>
            <span>WAU: <b>{number(overview.wau)}</b></span><span>MAU: <b>{number(overview.mau)}</b></span>
            <span>{t('admin.totalReadings')}: <b>{number(overview.totalReadings)}</b></span><span>{t('admin.readings30')}: <b>{number(overview.readings30d)}</b></span>
            <span>{t('admin.perActive')}: <b>{number(overview.readingsPerActiveUser)}</b></span>
          </div>
          <div className="admin-trends">
            <Section title={t('admin.growth')} note={selectedLabel}><TrendChart rows={data.trends} metric="newUsers" label={t('admin.newUsers')} color="#baab87" /></Section>
            <Section title={t('admin.activeUsers')} note={t('admin.activeDefinition')}><TrendChart rows={data.trends} metric="activeUsers" label={t('admin.activeUsers')} color="#9fb8ca" /></Section>
            <Section title={t('admin.readings')} note={selectedLabel}><TrendChart rows={data.trends} metric="readings" label={t('admin.readings')} color="#a59abf" bar /></Section>
          </div>
          <div className="admin-pairs">
            <Section title={t('admin.topDecks')} note={t('admin.shareNote')}><Ranking label={t('admin.topDecks')} number={number} percent={percent} rows={data.decks.map(row => {
              const id = ALL_DECK_IDS.find(id => id === row.deckId)
              return { ...row, id: row.deckId, name: id ? deckName(t, id) : t('admin.unknownDeck') }
            })} /></Section>
            <Section title={t('admin.topSpreads')} note={t('admin.shareNote')}><Ranking label={t('admin.topSpreads')} number={number} percent={percent} rows={data.spreads.map(row => {
              const spread = spreads.find(spread => spread.id === row.spreadType)
              return { ...row, id: row.spreadType, name: spread ? spreadName(t, spread.id) : t('admin.unknownSpread') }
            })} /></Section>
            <Section title={t('admin.retention')} note={t('admin.retentionNote')}>
              <div className="admin-retention">{(['d1', 'd7', 'd30'] as const).map(day => <div key={day}><h3>{day.toUpperCase()}</h3><strong>{percent(data.retention[day])}</strong><p>{t('admin.eligible')}: {number(data.retention.denominators[day])}</p></div>)}</div>
              <Cohorts cohorts={data.retention.cohorts} percent={percent} />
            </Section>
            <Section title={t('admin.feedback')} note={selectedLabel}>
              <div className="admin-feedback-summary"><strong>{data.feedback.averageRating === null ? '—' : number(data.feedback.averageRating)} <small>/ 5</small></strong><span>{number(data.feedback.total)} {t('admin.feedbackCount')}</span></div>
              {!data.feedback.total && <p className="admin-empty-note">{t('admin.noFeedback')}</p>}
              <div className="admin-ratings">{(['5', '4', '3', '2', '1'] as const).map(rating => {
                const count = data.feedback.distribution[rating]
                const share = data.feedback.total ? 100 * count / data.feedback.total : 0
                return <div key={rating}><span>{rating} ★</span><meter min={0} max={100} value={share} aria-label={`${rating} ${t('admin.stars')}`} /><span>{percent(share)}</span><b>{number(count)}</b></div>
              })}</div>
            </Section>
          </div>
        </>}
      <footer className="admin-footer">{t('admin.footer')}</footer>
    </main>
  </div>
}
