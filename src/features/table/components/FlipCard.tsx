import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CardFrame } from '@/components/card/CardFrame'
import type { CardSize } from '@/components/card/CardFrame'
import { CardBack } from '@/components/card/CardBack'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { capturePointer } from './pointer'
import type { Orientation, TarotCard } from '@/types/tarot'

const FLIP_MS = 520
/** 翻到一半才切换牌面 —— 提前切换会在动画中泄露牌面（AC-07） */
const SWAP_MS = 260
const SWIPE_UP = 32

interface FlipCardProps {
  card: TarotCard
  orientation: Orientation
  revealed: boolean
  size?: CardSize
  /** 用户主动触发翻牌。未提供 = 不可翻（例如动画锁定期间） */
  onReveal?: () => void
  idleDelay?: number
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
  revealed,
  size = 'md',
  onReveal,
  idleDelay = 0,
}: FlipCardProps) {
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

  return (
    // 未翻开的牌轻微上下浮动，告诉用户「可以翻」。idleDelay 让各张牌错开，
    // 避免整齐划一显得像在播放动画而不是在等你动手。
    <motion.div
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={() => (start.current = null)}
      className="table-surface relative"
      style={{ perspective: 900 }}
      role={canReveal ? 'button' : undefined}
      aria-label={canReveal ? '翻开这张牌' : undefined}
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
          <CardFrame size={size} state={revealed ? 'locked' : 'resting'}>
            {showFace ? (
              <TarotCardFace card={card} orientation={orientation} size={size} />
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
