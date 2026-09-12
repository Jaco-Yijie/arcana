import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { ShareCard, type ShareCardEntry } from '@/features/reading/ShareCard'
import { getEntry } from '@/store/journalStore'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'
import { resolveDeckId } from '@/decks/ids'

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

  const shareEntry: ShareCardEntry = {
    deckId: resolveDeckId(entry.deckId, entry.deckSchema),
    spreadName: spread?.name ?? null,
    cards: cards.map(({ pos, card, orientation }) => ({
      label: pos.label,
      card,
      orientation,
    })),
    /* 核心结论优先取 V2 结构化解读的主题句；老记录回落到 V1 headline */
    insight: entry.structuredReading?.readingTheme ?? entry.reading?.headline[0] ?? null,
    /* 隐私：只有用户主动勾选才带上原问题 */
    question: showQuestion ? entry.question : null,
    date: new Date(entry.createdAt).toLocaleDateString('zh-CN'),
  }

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
        {/* 固定 4:5 的独立分享版面。不是截整页 —— 截图会把导航、折叠区、
            滚动位置一起带走，而且每个人的比例都不一样。 */}
        <ShareCard entry={shareEntry} />

        <p className="px-1 text-caption text-text-faint">
          {/* 如实说明为什么没有「保存图片」按钮，而不是给一个上线就坏的按钮。 */}
          长按或截图保存这张卡片。导出 PNG 需要牌面来源允许跨源读取
          （当前对象存储未开放 CORS），暂未提供。
        </p>

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
