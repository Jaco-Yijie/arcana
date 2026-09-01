import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CardFrame } from '@/components/card/CardFrame'
import type { CardSize } from '@/components/card/CardFrame'
import { ThemedCardBack as CardBack } from '@/components/card/ThemedCardBack'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { capturePointer } from './pointer'
import type { Orientation, TarotCard } from '@/types/tarot'
import type { DeckId } from '@/decks/ids'

const FLIP_MS = 520
/** 翻到一半才切换牌面 —— 提前切换会在动画中泄露牌面（AC-07） */
const SWAP_MS = 260
const SWIPE_UP = 32

interface FlipCardProps {
  card: TarotCard
  orientation: Orientation
  /**
   * 本次会话冻结的牌组。**必须来自 session.deckId，不能来自 DeckContext** ——
   * 抽到一半换牌组时，牌桌上已经翻开的牌不该跟着变。
   */
  deckId: DeckId
  revealed: boolean
  size?: CardSize
  /**
   * 显式像素宽度。牌桌由布局引擎按实际尺寸反解卡宽时用它。
   *
   * 【为什么牌背与牌面必须共用这一个宽度】
   * 翻牌前后如果尺寸有任何差异，整个牌阵会在翻转瞬间重排 —— 那正是
   * L-06 禁止的结构性跳动。这里传一次，`CardFrame` 两态同用。
   * 圆角与牌名字号仍按 size 档位走，由 width 自动推导出合适的档。
   */
  width?: number
  /** 用户主动触发翻牌。未提供 = 不可翻（例如动画锁定期间） */
  onReveal?: () => void
  idleDelay?: number
}

/** 由实际像素宽度推导圆角与字号档位。断点取自 theme.css 的 --card-w-* */
function sizeForWidth(w: number): CardSize {
  if (w < 88) return 'sm'
  if (w < 144) return 'md'
  return 'lg'
}

/**
 * 翻牌。
 *
 * 【AC-05】只有用户的 Tap 或上滑会触发；没有倒计时、没有「全部翻开」、没有自动翻开。
 * 【G-08】动画只有翻转 + 极轻微的边缘辉光，无粒子、无闪光、无 SSR 抽卡表现。
 */
export function FlipCard({
  card,
  orientation,
  deckId,
  revealed,
  size: sizeProp,
  width,
  onReveal,
  idleDelay = 0,
}: FlipCardProps) {
  const size: CardSize = sizeProp ?? (width ? sizeForWidth(width) : 'md')
  const reduceMotion = useReducedMotion()
  const [showFace, setShowFace] = useState(revealed)
  const [flipping, setFlipping] = useState(false)
  const start = useRef<{ x: number; y: number; t: number } | null>(null)

  useEffect(() => {
    if (!revealed) {
      setShowFace(false)
      return
    }
    if (showFace) return
    setFlipping(true)
    const swap = window.setTimeout(() => setShowFace(true), reduceMotion ? 0 : SWAP_MS)
    const done = window.setTimeout(() => setFlipping(false), reduceMotion ? 0 : FLIP_MS)
    return () => {
      window.clearTimeout(swap)
      window.clearTimeout(done)
    }
  }, [revealed, showFace, reduceMotion])

  const canReveal = !revealed && !!onReveal

  const handleDown = (e: React.PointerEvent) => {
    if (!canReveal) return
    capturePointer(e)
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  const handleUp = (e: React.PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s || !canReveal) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    const dist = Math.hypot(dx, dy)
    const isTap = dist < 8 && performance.now() - s.t < 400
    const isSwipeUp = -dy >= SWIPE_UP && Math.abs(dy) > Math.abs(dx)
    if (isTap || isSwipeUp) onReveal?.()
  }

  /* ── 键盘翻牌 ──
     【为什么必须有】
     这个元素本来就声明了 `role="button"` + `aria-label="翻开这张牌"`，
     但只挂了 onPointerUp，也没有 tabIndex —— 于是辅助技术会把它读成一个按钮，
     用户按下 Enter 却什么都不会发生，而且键盘根本聚焦不到它。
     翻牌是这个产品的核心动作，它不能只对鼠标和手指开放
     （D2-05 已经给「摆牌」补过同一条路径，翻牌当时没覆盖到）。

     Enter 与 Space 都接：role=button 的原生语义是两个键都能激活。
     Space 必须 preventDefault，否则页面会同时滚动一屏。 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canReveal) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      onReveal?.()
    }
  }

  return (
    // 未翻开的牌轻微上下浮动，告诉用户「可以翻」。idleDelay 让各张牌错开，
    // 避免整齐划一显得像在播放动画而不是在等你动手。
    <motion.div
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={() => (start.current = null)}
      onKeyDown={handleKeyDown}
      className="table-surface relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-silver/70"
      style={{ perspective: 900 }}
      role={canReveal ? 'button' : undefined}
      aria-label={canReveal ? '翻开这张牌' : undefined}
      /* 已翻开的牌退出 Tab 序列 —— 它不再是一个可操作的控件，
         留在序列里只会让键盘用户多按几次 Tab 才走完牌阵 */
      tabIndex={canReveal ? 0 : undefined}
      animate={canReveal && !reduceMotion ? { y: [0, -2, 0] } : { y: 0 }}
      transition={
        canReveal && !reduceMotion
          ? { duration: 3.2, repeat: Infinity, delay: idleDelay, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
    >
      <motion.div
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateY: revealed ? 180 : 0,
          scale: flipping ? 1.08 : 1,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: FLIP_MS / 1000, ease: [0.32, 0.72, 0, 1] }
        }
      >
        <div style={{ transform: showFace ? 'rotateY(180deg)' : undefined }}>
          <CardFrame
            size={size}
            width={width !== undefined ? `${width}px` : undefined}
            state={revealed ? 'locked' : 'resting'}
            deckId={deckId}
          >
            {/* showFace 为真才挂载牌面 —— 这同时是 G-05 的 R1 防线：
                牌面资产的网络请求只可能发生在这张牌翻开之后。 */}
            {showFace ? (
              <TarotCardFace
                card={card}
                orientation={orientation}
                deckId={deckId}
                size={size}
                /* 牌桌知道这张牌到底多宽（布局引擎算出来的），
                   把它传下去，资产档位就能按真实设备像素选，而不是按三个粗档。
                   见 TarotCardFace 的 displayWidth 注释。 */
                displayWidth={width}
              />
            ) : (
              <CardBack simplified={size === 'sm'} />
            )}
          </CardFrame>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default FlipCard
