import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Orientation, TarotCard } from '@/types/tarot'
import type { SpreadPosition } from '@/types/spread'

interface CardMeaningSheetProps {
  card: TarotCard
  orientation: Orientation
  position: SpreadPosition | null
  onClose: () => void
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption tracking-wide-caps text-text-faint">{label}</span>
      <p className="text-read text-text-mid">{text}</p>
    </div>
  )
}

/**
 * 牌义弹层（两层展示，简报 §21）。
 * 第一层只有：牌名 + 正/逆位 + 3–5 个关键词。翻开后不要马上出现整屏文字。
 */
export function CardMeaningSheet({ card, orientation, position, onClose }: CardMeaningSheetProps) {
  const [expanded, setExpanded] = useState(false)
  const reversed = orientation === 'reversed'
  const keywords = reversed ? card.keywordsReversed : card.keywordsUpright
  const pick = (t: { upright: string; reversed: string }) => (reversed ? t.reversed : t.upright)

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
      <motion.div
        className="surface-veil w-full max-w-[420px] rounded-t-xl"
        initial={{ y: 220 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
        style={{ maxHeight: expanded ? '72dvh' : 'auto' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center py-2"
          aria-label="收起"
        >
          <span className="h-1 w-9 rounded-pill bg-line-strong" />
        </button>

        <div
          className={expanded ? 'overflow-y-auto px-5 pb-8' : 'px-5 pb-6'}
          style={expanded ? { maxHeight: 'calc(72dvh - 40px)' } : undefined}
        >
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-display text-text-hi">{card.nameZh}</h3>
            <span className="text-caption text-text-faint">{card.name}</span>
          </div>
          <p className="mt-1 text-note text-gold-dim">{reversed ? '逆位' : '正位'}</p>
          <p className="mt-2 text-body text-text-low">{keywords.slice(0, 5).join(' · ')}</p>

          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-4 text-caption text-silver-dim underline underline-offset-4"
            >
              查看详细牌义
            </button>
          ) : (
            <div className="mt-5 flex flex-col gap-4">
              <Section label="基础牌义" text={reversed ? card.meaningReversed : card.meaningUpright} />
              {position && <Section label={`牌位 · ${position.label}`} text={position.meaning} />}
              <Section label="感情" text={pick(card.love)} />
              <Section label="事业" text={pick(card.career)} />
              <Section label="学业" text={pick(card.study)} />
              <Section label="财务" text={pick(card.finance)} />
              <Section label="建议" text={pick(card.advice)} />
              <Section label="象征元素" text={card.symbols.join(' · ')} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default CardMeaningSheet
