import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { listEntries, toSummary } from '@/store/journalStore'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'
import { formatRelative, truncate } from '@/utils/format'

export default function JournalPage() {
  const navigate = useNavigate()
  const summaries = useMemo(() => listEntries().map(toSummary), [])

  if (summaries.length === 0) {
    return (
      <AppShell back="/" title="塔罗日记">
        <div className="flex flex-col items-center gap-5 pt-24 text-center">
          <p className="text-note text-text-low">还没有记录。</p>
          <Button size="lg" variant="primary" onClick={() => navigate('/')}>
            去抽一张
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell back="/" title="塔罗日记">
      <div className="flex flex-col gap-3 pt-2">
        {summaries.map((s) => (
          <Link
            key={s.id}
            to={`/journal/${s.id}`}
            className="surface-veil flex flex-col gap-2.5 rounded-lg p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-note text-text-hi">
                {s.question ? truncate(s.question, 20) : '随缘抽一张'}
              </span>
              <span className="shrink-0 text-caption text-text-faint">
                {formatRelative(s.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {s.cards.slice(0, 5).map((c, i) => (
                <CardFrame key={i} size="sm" state="locked" className="w-7">
                  <TarotCardFace
                    card={getCard(c.cardId)}
                    orientation={c.orientation}
                    size="sm"
                    showName={false}
                  />
                </CardFrame>
              ))}
              <span className="ml-1 text-caption text-text-faint">
                {s.spreadId ? getSpread(s.spreadId).name : ''}
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
