import { useLocalizedContent, TranslationStatus } from '@/i18n/useLocalizedContent'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { ShareCard, type ShareCardEntry } from '@/features/reading/ShareCard'
import { getEntry } from '@/store/journalStore'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'
import { resolveDeckId } from '@/decks/ids'
import { useI18n } from '@/i18n'
import { positionLabel, spreadName } from '@/i18n/domain'
import { useCardName } from '@/hooks/useCardText'

/**
 * 分享预览。不接任何真实社交网络 SDK。
 * 【AC-14】默认只展示卡牌 / 正逆位 / 牌阵 / 核心结论；
 * 原问题、笔记、心情、后续记录默认隐藏，只有原问题可以由用户自己打开。
 */
export default function SharePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const cardName = useCardName()
  const entry = useMemo(() => (id ? getEntry(id) : null), [id])
  const [showQuestion, setShowQuestion] = useState(false)
  const [copied, setCopied] = useState(false)

  const localized = useLocalizedContent(useMemo(() => ({ insight: entry?.structuredReading?.readingTheme ?? entry?.reading?.headline[0] ?? '', question: showQuestion ? entry?.question ?? '' : '' }), [entry, showQuestion]))

  if (localized.pending) return <AppShell back={`/journal/${id}`}><TranslationStatus error={localized.error} retry={localized.retry} /></AppShell>
  if (!entry) {
    return (
      <AppShell back="/journal" title={t('share.titleShort')}>
        <p className="pt-24 text-center text-note text-text-low">{t('share.notFound')}</p>
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
    spreadName: spread ? spreadName(t, spread.id) : null,
    cards: cards.map(({ pos, card, orientation }) => ({
      label: spread ? positionLabel(t, spread.id, pos.id) : pos.id,
      cardName: cardName(card),
      card,
      orientation,
    })),
    /* 核心结论优先取 V2 结构化解读的主题句；老记录回落到 V1 headline */
    insight: localized.value.insight,
    /* 隐私：只有用户主动勾选才带上原问题 */
    question: showQuestion ? localized.value.question : null,
    date: new Date(entry.createdAt).toLocaleDateString(locale),
    footer: t('share.footer'),
  }

  /* 复制出去的纯文本也必须整份是同一种语言 —— 它会被贴到别处，
     而那里没有我们的界面来解释一个中英混排的片段是什么。 */
  const text = [
    spread ? t('share.text.spread', { name: spreadName(t, spread.id) }) : '',
    ...cards.map((c) =>
      t('share.text.card', {
        position: spread ? positionLabel(t, spread.id, c.pos.id) : c.pos.id,
        card: cardName(c.card),
        orientation: c.orientation === 'reversed' ? t('card.reversed') : t('card.upright'),
      }),
    ),
    showQuestion && entry.question ? t('share.text.question', { text: localized.value.question }) : '',
    localized.value.insight,
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
      title={t('share.title')}
      footer={
        <Button size="lg" variant="primary" block onClick={copy}>
          {copied ? t('share.copied') : t('share.copy')}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-2">
        {/* 固定 4:5 的独立分享版面。不是截整页 —— 截图会把导航、折叠区、
            滚动位置一起带走，而且每个人的比例都不一样。 */}
        <ShareCard entry={shareEntry} />

        <p className="px-1 text-caption text-text-faint">
          {/* 如实说明为什么没有「保存图片」按钮，而不是给一个上线就坏的按钮。 */}
          {t('share.exportNote')}
        </p>

        <label className="flex items-center justify-between gap-4 px-1">
          <span className="flex flex-col gap-0.5">
            <span className="text-body text-text-hi">{t('share.showQuestion')}</span>
            <span className="text-caption text-text-faint">{t('share.showQuestionHint')}</span>
          </span>
          <input
            type="checkbox"
            checked={showQuestion}
            onChange={(e) => setShowQuestion(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-silver)]"
          />
        </label>

        <p className="px-1 text-caption text-text-faint">
          {t('share.privacyNote')}
        </p>

        <button
          type="button"
          onClick={() => navigate(`/journal/${entry.id}`)}
          className="text-caption text-text-faint"
        >
          {t('share.backToRecord')}
        </button>
      </div>
    </AppShell>
  )
}
