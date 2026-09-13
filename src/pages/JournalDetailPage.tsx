import { useLocalizedContent, TranslationStatus } from '@/i18n/useLocalizedContent'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { Panel } from '@/components/atoms/Panel'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { getEntry, patchEntry } from '@/store/journalStore'
import type { JournalEntry } from '@/store/journalStore'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'
import { resolveDeckId } from '@/decks/ids'
import { formatDateTime } from '@/utils/format'
import { useI18n } from '@/i18n'
import { positionLabel, spreadName } from '@/i18n/domain'
import { useCardName } from '@/hooks/useCardText'

/** 失焦即存，不放「保存」按钮 —— 与日记自动保存的逻辑保持一致 */
function EditableBlock({
  label,
  placeholder,
  value,
  onCommit,
}: {
  label: string
  placeholder: string
  value: string
  onCommit: (v: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <textarea
        value={draft}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        className="w-full resize-none rounded-sm border border-line-hairline bg-bg-void/40 p-3 text-read text-text-hi outline-none placeholder:text-text-faint focus:border-line-soft"
      />
    </div>
  )
}

export default function JournalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const cardName = useCardName()
  const [sourceEntry, setEntry] = useState<JournalEntry | null>(() => (id ? getEntry(id) : null))

  const localized = useLocalizedContent(sourceEntry)
  const entry = localized.value

  const commit = useCallback(
    (patch: Partial<Pick<JournalEntry, 'mood' | 'note' | 'outcome'>>) => {
      if (!id) return
      const next = patchEntry(id, patch)
      if (next) setEntry(next)
    },
    [id],
  )

  if (localized.pending) return <AppShell back="/journal"><TranslationStatus error={localized.error} retry={localized.retry} /></AppShell>
  if (!entry) {
    return (
      <AppShell back="/journal" title={t('journal.detailTitle')}>
        <div className="flex flex-col items-center gap-5 pt-24 text-center">
          <p className="text-note text-text-low">{t('journal.notFound')}</p>
          <Button size="lg" variant="ghost" onClick={() => navigate('/journal')}>
            {t('journal.backToList')}
          </Button>
        </div>
      </AppShell>
    )
  }

  const spread = entry.spreadId ? getSpread(entry.spreadId) : null
  const cards = (spread?.positions ?? [])
    .map((pos) => {
      const placed = entry.placements.find((p) => p.positionId === pos.id)
      if (!placed) return null
      const e = entry.deck[placed.deckIndex]
      return { pos, card: getCard(e.cardId), orientation: e.orientation }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <AppShell
      back="/journal"
      title={formatDateTime(entry.createdAt, locale)}
      action={
        <Link to={`/share/${entry.id}`} className="flex h-11 items-center text-caption text-text-faint">
          {t('common.share')}
        </Link>
      }
    >
      <div className="flex flex-col gap-6 pt-2">
        <section className="flex flex-col gap-1">
          <span className="eyebrow">{t('journal.question')}</span>
          <p className="text-read text-text-hi">{entry.question || t('journal.randomDraw')}</p>
          {entry.optimizedQuestion && (
            <p className="text-caption text-text-faint">
              {t('journal.optimized', { text: entry.optimizedQuestion })}
              {entry.usedOptimized ? t('journal.adopted') : t('journal.notAdopted')}
            </p>
          )}
          {spread && (
            <p className="mt-1 text-caption text-text-low">{spreadName(t, spread.id)}</p>
          )}
        </section>

        <section className="flex flex-wrap gap-3">
          {cards.map(({ pos, card, orientation }) => (
            <div key={pos.id} className="flex flex-col items-center gap-1">
              <CardFrame size="sm" state="locked" deckId={resolveDeckId(entry.deckId, entry.deckSchema)}>
                <TarotCardFace
                  card={card}
                  orientation={orientation}
                  /* 历史保真：用当时那副牌 */
                  deckId={resolveDeckId(entry.deckId, entry.deckSchema)}
                  size="sm"
                  showName={false}
                />
              </CardFrame>
              <span className="text-[10px] text-text-faint">
                {spread ? positionLabel(t, spread.id, pos.id) : pos.id}
              </span>
              <span className="text-[10px] text-text-low">
                {cardName(card)}
                {orientation === 'reversed' ? ` · ${t('card.reversedShort')}` : ''}
              </span>
            </div>
          ))}
        </section>

        {entry.reading && (
          <Panel tone="inset" pad="md" className="flex flex-col gap-3">
            {entry.reading.headline.map((h, i) => (
              <p key={i} className="text-read text-text-mid">
                {h}
              </p>
            ))}
          </Panel>
        )}

        {entry.followUps.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className="eyebrow">{t('journal.followUps')}</span>
            {entry.followUps.map((m) => (
              <p
                key={m.id}
                className={m.role === 'user' ? 'text-note text-text-hi' : 'text-read text-text-low'}
              >
                {m.role === 'user' ? t('journal.askPrefix') : ''}
                {m.content}
              </p>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-4 pb-6">
          <p className="eyebrow">{t('language.original')}</p>
          {entry.mood && entry.mood !== sourceEntry?.mood && <p className="text-read text-text-mid">{entry.mood}</p>}
          <EditableBlock
            label={t('journal.mood.label')}
            placeholder={t('journal.mood.placeholder')}
            value={sourceEntry?.mood ?? ''}
            onCommit={(v) => commit({ mood: v })}
          />
          {entry.note && entry.note !== sourceEntry?.note && <p className="text-read text-text-mid">{entry.note}</p>}
          <EditableBlock
            label={t('journal.note.label')}
            placeholder={t('journal.note.placeholder')}
            value={sourceEntry?.note ?? ''}
            onCommit={(v) => commit({ note: v })}
          />
          {entry.outcome && entry.outcome !== sourceEntry?.outcome && <p className="text-read text-text-mid">{entry.outcome}</p>}
          <EditableBlock
            label={t('journal.outcome.label')}
            placeholder={t('journal.outcome.placeholder')}
            value={sourceEntry?.outcome ?? ''}
            onCommit={(v) => commit({ outcome: v })}
          />
        </section>
      </div>
    </AppShell>
  )
}
