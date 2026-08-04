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
import { formatDateTime } from '@/utils/format'

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
      <span className="text-caption tracking-wide-caps text-text-faint">{label}</span>
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
  const [entry, setEntry] = useState<JournalEntry | null>(() => (id ? getEntry(id) : null))

  const commit = useCallback(
    (patch: Partial<Pick<JournalEntry, 'mood' | 'note' | 'outcome'>>) => {
      if (!id) return
      const next = patchEntry(id, patch)
      if (next) setEntry(next)
    },
    [id],
  )

  if (!entry) {
    return (
      <AppShell back="/journal" title="日记">
        <div className="flex flex-col items-center gap-5 pt-24 text-center">
          <p className="text-note text-text-low">找不到这条记录。</p>
          <Button size="lg" variant="ghost" onClick={() => navigate('/journal')}>
            回到日记列表
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
      title={formatDateTime(entry.createdAt)}
      action={
        <Link to={`/share/${entry.id}`} className="flex h-11 items-center text-caption text-text-faint">
          分享
        </Link>
      }
    >
      <div className="flex flex-col gap-6 pt-2">
        <section className="flex flex-col gap-1">
          <span className="text-caption tracking-wide-caps text-text-faint">问题</span>
          <p className="text-read text-text-hi">{entry.question || '随缘抽一张'}</p>
          {entry.optimizedQuestion && (
            <p className="text-caption text-text-faint">
              优化版本：{entry.optimizedQuestion}
              {entry.usedOptimized ? '（已采用）' : '（未采用）'}
            </p>
          )}
          {spread && <p className="mt-1 text-caption text-text-low">{spread.name}</p>}
        </section>

        <section className="flex flex-wrap gap-3">
          {cards.map(({ pos, card, orientation }) => (
            <div key={pos.id} className="flex flex-col items-center gap-1">
              <CardFrame size="sm" state="locked">
                <TarotCardFace card={card} orientation={orientation} size="sm" showName={false} />
              </CardFrame>
              <span className="text-[10px] text-text-faint">{pos.label}</span>
              <span className="text-[10px] text-text-low">
                {card.nameZh}
                {orientation === 'reversed' ? '·逆' : ''}
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
            <span className="text-caption tracking-wide-caps text-text-faint">后续追问</span>
            {entry.followUps.map((m) => (
              <p
                key={m.id}
                className={m.role === 'user' ? 'text-note text-text-hi' : 'text-read text-text-low'}
              >
                {m.role === 'user' ? '问：' : ''}
                {m.content}
              </p>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-4 pb-6">
          <EditableBlock
            label="当时的心情"
            placeholder="抽这次牌的时候，我的状态是…"
            value={entry.mood ?? ''}
            onCommit={(v) => commit({ mood: v })}
          />
          <EditableBlock
            label="我的笔记"
            placeholder="我自己看到的东西…"
            value={entry.note ?? ''}
            onCommit={(v) => commit({ note: v })}
          />
          <EditableBlock
            label="后来发生了什么"
            placeholder="过一段时间再回来写…"
            value={entry.outcome ?? ''}
            onCommit={(v) => commit({ outcome: v })}
          />
        </section>
      </div>
    </AppShell>
  )
}
