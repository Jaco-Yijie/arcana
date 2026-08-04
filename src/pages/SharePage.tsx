import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { Panel } from '@/components/atoms/Panel'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { getEntry } from '@/store/journalStore'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'

/**
 * 分享预览。不接任何真实社交网络 SDK。
 * 【AC-14】默认只展示卡牌 / 正逆位 / 牌阵 / 核心结论；
 * 原问题、笔记、心情、后续记录默认隐藏，只有原问题可以由用户自己打开。
 */
export default function SharePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const entry = useMemo(() => (id ? getEntry(id) : null), [id])
  const [showQuestion, setShowQuestion] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!entry) {
    return (
      <AppShell back="/journal" title="分享">
        <p className="pt-24 text-center text-note text-text-low">找不到这条记录。</p>
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

  const text = [
    spread ? `牌阵：${spread.name}` : '',
    ...cards.map(
      (c) => `${c.pos.label}：${c.card.nameZh}（${c.orientation === 'reversed' ? '逆位' : '正位'}）`,
    ),
    showQuestion && entry.question ? `问题：${entry.question}` : '',
    entry.reading?.headline[0] ?? '',
  ]
    .filter(Boolean)
    .join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <AppShell
      back={`/journal/${entry.id}`}
      title="分享预览"
      footer={
        <Button size="lg" variant="primary" block onClick={copy}>
          {copied ? '已复制' : '复制文案'}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        <Panel tone="veil" pad="md" className="flex flex-col gap-4">
          {spread && <p className="text-caption text-text-faint">{spread.name}</p>}
          <div className="flex flex-wrap gap-3">
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
          </div>
          {showQuestion && entry.question && (
            <p className="text-note text-text-mid">{entry.question}</p>
          )}
          {entry.reading?.headline[0] && (
            <p className="text-read text-text-hi">{entry.reading.headline[0]}</p>
          )}
        </Panel>

        <label className="flex items-center justify-between gap-4 px-1">
          <span className="flex flex-col gap-0.5">
            <span className="text-body text-text-hi">显示我的原问题</span>
            <span className="text-caption text-text-faint">默认关闭</span>
          </span>
          <input
            type="checkbox"
            checked={showQuestion}
            onChange={(e) => setShowQuestion(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-silver)]"
          />
        </label>

        <p className="px-1 text-caption text-text-faint">
          笔记、心情、后来发生了什么不会出现在分享内容里。
        </p>

        <button
          type="button"
          onClick={() => navigate(`/journal/${entry.id}`)}
          className="text-caption text-text-faint"
        >
          返回记录
        </button>
      </div>
    </AppShell>
  )
}
