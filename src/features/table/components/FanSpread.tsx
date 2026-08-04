import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CardFrame } from '@/components/card/CardFrame'
import { CardBack } from '@/components/card/CardBack'
import { capturePointer } from './pointer'
import { computeFanMetrics, computeFanLayout, hitTestFan } from '@/features/table/engine'
import type { FanCardLayout } from '@/features/table/engine'

const CARD_W = 76
const CARD_H = 130
/** 位移死区：手指刚落下的抖动不触发任何事（UX Spec §6.2 防线 3） */
const DEAD_ZONE = 12
/** 上滑抽牌的最小位移 */
const PICK_DISTANCE = 32
const TAP_MOVE = 8
const TAP_MS = 400

type Intent = 'undecided' | 'scroll' | 'pick'

interface FanSpreadProps {
  /** 牌堆张数（78）。这里只渲染牌背，永远不知道是哪张牌。 */
  count: number
  /** 已经被拿走的牌（index），不再渲染 */
  takenIndexes: number[]
  /** 用户选中某个位置。参数是**牌在牌堆中的下标**，不是「一张牌」。 */
  onPick: (deckIndex: number) => void
  /** 手上已经有牌时锁定：点击只抖动，不拿起 */
  locked: boolean
  onInteractingChange?: (interacting: boolean) => void
}

/**
 * 摊牌扇形。
 *
 * 【这里是「用户选择位置」的地方】
 * 组件完全不知道每个位置上是哪张牌 —— 它只回调 deckIndex。
 * 牌的身份在 Session 初始化时就已确定，这里既不生成也不查询（AC-01 / G-01）。
 *
 * 【手势冲突】横滑浏览 vs 上滑抽牌，用 12px 死区 + 轴锁定解决；
 * 向下滑一律判为滚动，避免误抽。
 */
export function FanSpread({
  count,
  takenIndexes,
  onPick,
  locked,
  onInteractingChange,
}: FanSpreadProps) {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 375, h: 214 })
  const [scrollOffset, setScrollOffset] = useState(0)
  const [nudgeIndex, setNudgeIndex] = useState<number | null>(null)

  const gesture = useRef({
    active: false,
    /** 本次按下是为了让惯性滚动停下 —— 这样的手势不应该抽牌 */
    stoppedFling: false,
    intent: 'undecided' as Intent,
    startX: 0,
    startY: 0,
    startOffset: 0,
    startTime: 0,
    index: null as number | null,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  })
  const momentumRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const metrics = computeFanMetrics({
    count,
    containerWidth: size.w,
    containerHeight: size.h,
    scrollOffset: 0,
    cardWidth: CARD_W,
    cardHeight: CARD_H,
  })

  // 进入时停在扇形中点：用户第一眼看到的是「一整副牌的中间」，而不是第 1 张
  useEffect(() => {
    setScrollOffset(metrics.maxScrollOffset / 2)
    // 只在容器尺寸/张数确定后跑一次
  }, [metrics.maxScrollOffset])

  const clampOffset = useCallback(
    (v: number) => Math.min(metrics.maxScrollOffset, Math.max(0, v)),
    [metrics.maxScrollOffset],
  )

  const stopMomentum = () => {
    if (momentumRef.current !== null) {
      cancelAnimationFrame(momentumRef.current)
      momentumRef.current = null
    }
  }

  const runMomentum = useCallback(
    (initialVelocity: number) => {
      let v = initialVelocity
      const step = () => {
        v *= 0.94
        if (Math.abs(v) < 0.06) {
          momentumRef.current = null
          return
        }
        setScrollOffset((prev) => clampOffset(prev - v * 16))
        momentumRef.current = requestAnimationFrame(step)
      }
      momentumRef.current = requestAnimationFrame(step)
    },
    [clampOffset],
  )

  useEffect(() => stopMomentum, [])

  const layouts: FanCardLayout[] = computeFanLayout({
    count,
    containerWidth: size.w,
    containerHeight: size.h,
    scrollOffset,
    cardWidth: CARD_W,
    cardHeight: CARD_H,
  })

  const localPoint = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 惯性滚动中按下 = 「我要停下来」，不是「我要抽这张」。
    // 不记住这一点的话，用户甩完扇形按住停下，就会被抽走一张他根本没在看的牌。
    const wasFlinging = momentumRef.current !== null
    stopMomentum()
    capturePointer(e)
    const p = localPoint(e)
    gesture.current = {
      active: true,
      stoppedFling: wasFlinging,
      intent: 'undecided',
      startX: e.clientX,
      startY: e.clientY,
      startOffset: scrollOffset,
      startTime: performance.now(),
      index: hitTestFan(layouts, p.x, p.y),
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g.active) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY

    if (g.intent === 'undecided') {
      if (Math.hypot(dx, dy) < DEAD_ZONE) return
      // 向下滑一律判为滚动，避免误抽
      g.intent = Math.abs(dx) >= Math.abs(dy) ? 'scroll' : dy < 0 ? 'pick' : 'scroll'
      onInteractingChange?.(true)
    }

    if (g.intent === 'scroll') {
      const now = performance.now()
      const dt = now - g.lastT
      if (dt > 0) g.velocity = (e.clientX - g.lastX) / dt
      g.lastX = e.clientX
      g.lastT = now
      setScrollOffset(clampOffset(g.startOffset - dx))
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g.active) return
    g.active = false
    onInteractingChange?.(false)

    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    const dist = Math.hypot(dx, dy)
    const duration = performance.now() - g.startTime

    const isTap = dist < TAP_MOVE && duration < TAP_MS
    const isPickSwipe = g.intent === 'pick' && -dy >= PICK_DISTANCE

    if ((isTap || isPickSwipe) && !g.stoppedFling && g.index !== null && !takenIndexes.includes(g.index)) {
      if (locked) {
        // 手上已经有牌：抖一下，不拿起
        setNudgeIndex(g.index)
        window.setTimeout(() => setNudgeIndex(null), 240)
      } else {
        onPick(g.index)
      }
    } else if (g.intent === 'scroll' && Math.abs(g.velocity) > 0.25) {
      runMomentum(g.velocity)
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="table-surface relative h-full w-full overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {layouts.map((l) => {
        if (takenIndexes.includes(l.index)) return null
        // 视口外的牌不渲染（78 张全渲染在低端机上会掉帧）
        if (l.x < -CARD_W * 1.5 || l.x > size.w + CARD_W * 0.5) return null
        return (
          <motion.div
            key={l.index}
            className="absolute top-0 left-0"
            style={{ width: l.width, height: l.height, zIndex: l.zIndex }}
            // initial={false}：牌必须先「在」。逐张展开的入场动画只是加分项，
            // 一旦它没跑完（低端机、后台标签页、rAF 节流），整副牌会停在 opacity 0 —— 那是致命的。
            // 宁可没有入场动画，也不能出现「牌堆是空的」。
            initial={false}
            animate={{
              x: l.x + (nudgeIndex === l.index ? 6 : 0),
              y: l.y,
              rotate: l.rotate,
              scale: l.scale,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <CardFrame size="sm" fluid state="resting">
              <CardBack simplified />
            </CardFrame>
          </motion.div>
        )
      })}
    </div>
  )
}

export default FanSpread
