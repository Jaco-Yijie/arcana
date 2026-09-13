import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { useSession } from '@/hooks/useSession'
import { recommendSpreads, spreadById, spreads } from '@/data/spreads'
import { truncate } from '@/utils/format'
import type { Spread, SpreadId } from '@/types/spread'
import { useI18n } from '@/i18n'
import { spreadDescription, spreadName } from '@/i18n/domain'

/**
 * 牌位缩略示意图：用点阵表示牌阵形状，让用户在选之前就看懂结构。
 *
 * 直接用 CSS Grid 铺 spread.grid —— 缩略图和真实牌桌读的是**同一份逻辑网格**，
 * 所以「示意图长这样、摆出来却是另一样」在结构上不会发生。
 */
function SpreadThumb({ spread }: { spread: Spread }) {
  return (
    <div
      className="grid h-12 w-16 shrink-0 gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${spread.grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${spread.grid.rows}, 1fr)`,
      }}
    >
      {spread.positions.map((p) => (
        <span
          key={p.id}
          className="place-self-center rounded-[2px] border border-line-soft bg-surface-2"
          style={{
            gridColumn: `${p.col + 1} / span ${p.colSpan ?? 1}`,
            gridRow: `${p.row + 1} / span ${p.rowSpan ?? 1}`,
            width: '62%',
            aspectRatio: 'var(--card-ratio)',
          }}
        />
      ))}
    </div>
  )
}

export default function SpreadPage() {
  const navigate = useNavigate()
  const { session, patchSession } = useSession()
  const { t } = useI18n()
  const [showAll, setShowAll] = useState(false)

  const recommended = useMemo(
    () => (session ? recommendSpreads(session.question, session.mode) : []),
    [session],
  )

  if (!session) return <Navigate to="/" replace />

  const choose = (id: SpreadId) => {
    patchSession({ spreadId: id, stage: 'prepare' })
    navigate('/focus')
  }

  const rest = spreads.filter((s) => !recommended.includes(s.id))

  const renderCard = (spread: Spread) => (
    <button
      key={spread.id}
      type="button"
      onClick={() => choose(spread.id)}
      className="surface-veil flex w-full items-center gap-4 rounded-lg p-4 text-left transition-transform duration-[var(--duration-quick)] active:scale-[0.985]"
    >
      <SpreadThumb spread={spread} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className="ritual-heading" style={{ fontSize: '1.15rem' }}>
            {spreadName(t, spread.id)}
          </span>
          <span className="text-caption text-text-faint">
            {t('common.cardsUnit', { n: spread.cardCount })}
          </span>
        </span>
        <span className="text-caption text-text-low">{spreadDescription(t, spread.id)}</span>
      </span>
    </button>
  )

  return (
    <AppShell back="/question?mode=question" title={t('spread.title')} centered>
      <div className="flex flex-col gap-4 pt-2">
        {session.question && (
          <p className="truncate text-caption text-text-faint">
            {truncate(session.usedOptimized && session.optimizedQuestion ? session.optimizedQuestion : session.question, 30)}
          </p>
        )}

        <h2 className="ritual-heading ritual-heading-marked">{t('spread.recommended')}</h2>
        <div className="flex flex-col gap-3">{recommended.map((id) => renderCard(spreadById[id]))}</div>

        {!showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 text-caption text-text-low underline underline-offset-4"
          >
            {t('spread.showAll')}
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            <p className="eyebrow">{t('spread.others')}</p>
            {rest.map(renderCard)}
          </div>
        )}

        <p className="mt-2 text-caption text-text-faint">
          {t('spread.note')}
        </p>
      </div>
    </AppShell>
  )
}
