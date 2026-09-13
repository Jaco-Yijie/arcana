import { useLocalizedContent, TranslationStatus } from '@/i18n/useLocalizedContent'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { listEntries, toSummary } from '@/store/journalStore'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'
import { resolveDeckId } from '@/decks/ids'
import { formatRelative, truncate } from '@/utils/format'
import { useI18n } from '@/i18n'
import { spreadName } from '@/i18n/domain'

export default function JournalPage() {
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const sourceSummaries = useMemo(() => listEntries().map(toSummary), [])

  const localized = useLocalizedContent(sourceSummaries)
  const summaries = localized.value
  if (localized.pending) return <AppShell back="/" title={t('journal.title')}><TranslationStatus error={localized.error} retry={localized.retry} /></AppShell>

  if (summaries.length === 0) {
    return (
      <AppShell back="/" title={t('journal.title')}>
        <div className="flex flex-col items-center gap-5 pt-24 text-center">
          <p className="text-note text-text-low">{t('journal.empty')}</p>
          <Button size="lg" variant="primary" onClick={() => navigate('/')}>
            {t('journal.goDraw')}
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/" title={t('journal.title')}>
      <div className="flex flex-col gap-3 pt-2">
        {summaries.map((s) => (
          <Link
            key={s.id}
            to={`/journal/${s.id}`}
            className="surface-veil flex flex-col gap-2.5 rounded-lg p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-note text-text-hi">
                {s.question ? truncate(s.question, 20) : t('journal.randomDraw')}
              </span>
              <span className="shrink-0 text-caption text-text-faint">
                {formatRelative(s.createdAt, locale)}
              </span>
            </div>

            {/* 缩略图带可横向滚动，牌阵名固定在右侧不参与压缩。
                旧版牌阵名是同一个 flex 行里唯一可收缩的元素 ——
                五张牌的条目会把「二选一」挤成单字竖排。 */}
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
              {s.cards.slice(0, 5).map((c, i) => (
                <CardFrame key={i} size="sm" state="locked" className="w-7 shrink-0" deckId={resolveDeckId(s.deckId, s.deckSchema)}>
                  <TarotCardFace
                    card={getCard(c.cardId)}
                    orientation={c.orientation}
                    /* 历史保真：用当时那副牌渲染，不是当前选中的那副 */
                    deckId={resolveDeckId(s.deckId, s.deckSchema)}
                    size="sm"
                    showName={false}
                  />
                </CardFrame>
              ))}
              </div>
              <span className="shrink-0 whitespace-nowrap text-caption text-text-faint">
                {s.spreadId ? spreadName(t, getSpread(s.spreadId).id) : ''}
              </span>
            </div>

            {s.headline && (
              <p className="line-clamp-2 text-caption text-text-low">{s.headline}</p>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
