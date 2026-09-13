import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useI18n } from '@/i18n'
import { positionLabel, positionMeaning } from '@/i18n/domain'
import { useCardText } from '@/hooks/useCardText'
import type { Orientation, TarotCard } from '@/types/tarot'
import type { SpreadId, SpreadPosition } from '@/types/spread'

interface CardMeaningSheetProps {
  card: TarotCard
  orientation: Orientation
  position: SpreadPosition | null
  /** 牌位名要按牌阵取 —— 同一个 positionId（obstacle）在两个牌阵里含义不同 */
  spreadId: SpreadId
  onClose: () => void
  /**
   * 抽屉实测高度回调（仅移动端）。
   * 调用方据此让出底部空间，保证牌桌与主 CTA 都不被盖住。
   * 关闭时回调 0。
   */
  onHeightChange?: (h: number) => void
}

/** 面板最大高度（相对视口）。留出的 45% 是给牌桌的 —— 见下方 UX 铁律 */
export const SHEET_MAX_VH = 0.55

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption tracking-wide-caps text-text-faint">{label}</span>
      <p className="text-read text-text-mid">{text}</p>
    </div>
  )
}

function Body({
  card,
  orientation,
  position,
  spreadId,
  expanded,
  setExpanded,
}: {
  card: TarotCard
  orientation: Orientation
  position: SpreadPosition | null
  spreadId: SpreadId
  expanded: boolean
  setExpanded: (v: boolean) => void
}) {
  const { t } = useI18n()
  const cardText = useCardText()
  const text = cardText(card)
  const reversed = orientation === 'reversed'
  const keywords = reversed ? text.keywordsReversed : text.keywordsUpright
  const pick = (v: { upright: string; reversed: string }) => (reversed ? v.reversed : v.upright)

  return (
    <>
      <div className="flex items-baseline gap-2">
        <h3 className="ritual-heading" style={{ fontSize: 'var(--text-display)' }}>
          {text.name}
        </h3>

      </div>
      <p className="mt-1 text-note text-gold-dim">
        {reversed ? t('card.reversed') : t('card.upright')}
      </p>
      <p className="mt-2 text-body text-text-low">{keywords.slice(0, 5).join(' · ')}</p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 rounded-sm text-caption text-silver-dim underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-silver"
        >
          {t('card.viewDetail')}
        </button>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <Section
            label={t('card.section.base')}
            text={reversed ? text.meaningReversed : text.meaningUpright}
          />
          {position && (
            <Section
              label={t('card.section.position', {
                label: positionLabel(t, spreadId, position.id),
              })}
              text={positionMeaning(t, spreadId, position.id)}
            />
          )}
          <Section label={t('card.section.love')} text={pick(text.love)} />
          <Section label={t('card.section.career')} text={pick(text.career)} />
          <Section label={t('card.section.study')} text={pick(text.study)} />
          <Section label={t('card.section.finance')} text={pick(text.finance)} />
          <Section label={t('card.section.advice')} text={pick(text.advice)} />
          <Section label={t('card.section.symbols')} text={text.symbols.join(' · ')} />
        </div>
      )}
    </>
  )
}

/**
 * 牌义弹层（两层展示，简报 §21）。
 * 第一层只有：牌名 + 正/逆位 + 3–5 个关键词。翻开后不要马上出现整屏文字。
 *
 * ══════════════════════════════════════════════════════════════
 * 【UX 铁律：面板永远不能完全遮住它正在解释的那张牌】
 *
 * 翻牌是这个产品的情绪高点。旧实现在翻开 720ms 后从底部升起一块面板，
 * 位置恰好盖住刚翻开的那张牌 —— 高点当场被一块文字挡掉。
 *
 * 现在两件事保证它不再发生：
 *   1. 面板高度封顶 55vh，剩下的 45% 永远留给牌桌
 *   2. 面板打开时 RevealPage 把牌桌整体上移，让当前牌落在面板之上
 * 第 2 条在 RevealPage 里实现，本组件通过 SHEET_MAX_VH 与它共享同一个常量。
 * ══════════════════════════════════════════════════════════════
 *
 * 【关闭方式 —— 旧版只有一个，而且看不出来】
 * 旧版唯一的关闭入口是顶部那根小灰条，没有遮罩、不响应点击外部、不响应 Escape。
 * 实测在 664px 高的窗口里它同时盖住了「开始完整解读」，用户只能靠猜。
 * 现在：遮罩 + 点击外部 + Escape + 明确的关闭按钮，四条都有。
 */
export function CardMeaningSheet({
  card,
  orientation,
  position,
  spreadId,
  onClose,
  onHeightChange,
}: CardMeaningSheetProps) {
  const { t } = useI18n()
  const cardText = useCardText()
  const displayName = cardText(card).name
  const [expanded, setExpanded] = useState(false)
  const isDesktop = useIsDesktop()
  const panelRef = useRef<HTMLDivElement>(null)

  /* 把抽屉的实际高度报给调用方。用 ResizeObserver 而不是让调用方去量 ——
     在渲染期读 DOM 会和动画构成反馈回路，实测能把入场动画卡死。 */
  useEffect(() => {
    if (isDesktop || !onHeightChange) return
    const el = panelRef.current
    if (!el) return
    const report = () => onHeightChange(Math.round(el.getBoundingClientRect().height))
    report()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => {
      ro.disconnect()
      onHeightChange(0)
    }
  }, [isDesktop, onHeightChange])

  /* 换一张牌时收回详细态：上一张展开着，下一张不该继承那个状态 */
  useEffect(() => {
    setExpanded(false)
  }, [card.id, orientation])

  /* Escape 关闭。捕获阶段监听，保证在任何页面级快捷键之前生效 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  /* 打开时把焦点移进面板 —— 键盘用户否则会停在牌桌上，Tab 不进来 */
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  /* ── 桌面端：右侧常驻栏 ──
     底部抽屉是移动端手势，桌面端用它只会挡住牌，而右边本来就是空的。 */
  if (isDesktop) {
    return (
      <motion.aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        aria-label={t('card.meaningAria', { name: displayName })}
        className="surface-veil pointer-events-auto absolute top-4 right-4 bottom-4 z-40 flex flex-col rounded-lg outline-none"
        /* 右栏宽度随视口连续变化，不写死 300px */
        style={{ width: 'clamp(15rem, 24vw, 22rem)' }}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <div className="flex items-center justify-end px-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('card.closeMeaning')}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-text-faint transition-colors duration-[var(--duration-quick)] hover:text-text-hi focus-visible:outline focus-visible:outline-2 focus-visible:outline-silver"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <Body
            card={card}
            orientation={orientation}
            position={position}
            spreadId={spreadId}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        </div>
      </motion.aside>
    )
  }

  /* ── 移动端：底部抽屉 ── */
  return (
    <>
      {/* 遮罩：点击外部关闭。透明度很低 —— 它的作用是接住点击，不是压暗牌桌 */}
      <motion.div
        className="fixed inset-0 z-30 bg-bg-void/25"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onPointerDown={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-label={t('card.meaningAria', { name: displayName })}
          className="surface-veil pointer-events-auto flex w-full flex-col rounded-t-xl outline-none"
          initial={{ y: 220 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          /* 高度封顶：剩下的 45vh 是留给牌桌的，不是浪费。
             宽度用连续函数，320px 上不会被 420px 的死宽度撑出横向滚动。 */
          style={{ maxHeight: `${SHEET_MAX_VH * 100}dvh`, maxWidth: 'min(94vw, 30rem)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative flex shrink-0 items-center justify-center py-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-sm px-6 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-silver"
              aria-label={t('card.collapseMeaning')}
            >
              <span className="h-1 w-9 rounded-pill bg-line-strong" />
            </button>
            {/* 明确的文字关闭入口：小灰条对第一次来的人不构成 affordance */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 flex h-9 min-w-9 items-center justify-center rounded-sm px-3 text-caption text-text-faint transition-colors duration-[var(--duration-quick)] active:text-text-mid focus-visible:outline focus-visible:outline-2 focus-visible:outline-silver"
            >
              {t('common.collapse')}
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-5"
            style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
          >
            <Body
              card={card}
              orientation={orientation}
              position={position}
              spreadId={spreadId}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default CardMeaningSheet
