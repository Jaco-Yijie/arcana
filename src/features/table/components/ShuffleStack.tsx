import { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CardFrame } from '@/components/card/CardFrame'
import { ThemedCardBack as CardBack } from '@/components/card/ThemedCardBack'
import { capturePointer } from './pointer'
import { MIN_SHUFFLE_DISTANCE } from '@/features/table/engine'
import type { ShuffleGesture, ShuffleResult } from '@/features/table/engine'

/** 用 18 个牌背实例表现整副牌的厚度 —— 视觉上的「一叠牌」，不是 78 个 DOM */
const LAYERS = 18

interface ShuffleStackProps {
  /** 完成一次手势时回调，返回引擎结果供动画使用；返回 null 表示手势无效 */
  onGesture: (gesture: ShuffleGesture) => ShuffleResult | null
  onInteractingChange?: (interacting: boolean) => void
  /** 已完成的有效洗牌次数，用于「牌堆确实变了」的视觉换脸 */
  shuffleCount: number
}

interface Point {
  x: number
  y: number
  t: number
}

/**
 * 洗牌牌堆。
 *
 * 【为什么不是一个按钮】G-03。这里唯一改变牌序的入口是用户的 pointer 手势：
 * 没有 pointermove 就没有 gesture，没有 gesture 引擎就原样返回牌堆。
 *
 * 拖动中牌堆按 dx 分裂成 3 个子堆（偏移 1.0 / 0.55 / 0.25），松手后弹回并重新叠合，
 * 顶部牌背换成另一个实例 —— 用户能看出「不是原来那堆」。
 */
export function ShuffleStack({ onGesture, onInteractingChange, shuffleCount }: ShuffleStackProps) {
  const reduceMotion = useReducedMotion()
  const startRef = useRef<Point | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState({ dx: 0, dy: 0 })
  const [settling, setSettling] = useState(false)
  // 每次有效洗牌换一个层序，让「重新叠合」在视觉上确实是另一堆
  const [layerSeed, setLayerSeed] = useState(0)

  const ratioOf = useCallback((clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || rect.height === 0) return 0.5
    return Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    capturePointer(e)
    startRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    setSettling(false)
    onInteractingChange?.(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    setDrag({ dx: e.clientX - start.x, dy: e.clientY - start.y })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    onInteractingChange?.(false)
    if (!start) return

    const gesture: ShuffleGesture = {
      dx: e.clientX - start.x,
      dy: e.clientY - start.y,
      durationMs: performance.now() - start.t,
      startRatio: ratioOf(start.y),
      endRatio: ratioOf(e.clientY),
    }

    setDrag({ dx: 0, dy: 0 })
    setSettling(true)

    const result = onGesture(gesture)
    if (result?.applied) setLayerSeed((s) => s + 1)
  }

  /* ── 键盘洗牌 ──
     【为什么必须有】D4 实测：只用键盘走流程，到洗牌页就走不下去了。
     牌堆没有 tabIndex、没有 role、没有键盘处理，而「洗好了」只在
     shuffleCount > 0 时才渲染 —— 于是键盘用户能 Tab 到的只有「退出」。
     核心流程对键盘与辅助技术用户是一条死路。
     （D2-05 补过「摆牌」、D3 补过「翻牌」，但那两处都在洗牌之后，够不着。）

     【熵仍然来自用户，G-03 没有松动】
     这里绝不调 Math.random()，也绝不用常量手势 —— 那等于系统替用户洗牌。
     键盘用户提供的是**按住的时长**：从 keydown 到 keyup 的毫秒数，
     再叠加 performance.now() 的亚毫秒抖动。和 pointer 手势一样，
     牌序的改变仍然由用户这一次动作决定，按两次也不会得到同一个手势。

     指针路径一行未改：两条路径共用同一个 onGesture 出口。 */
  const keyDownAt = useRef<number | null>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return
    e.preventDefault()          // 空格否则会滚动页面
    if (e.repeat) return        // 按住不放不算连续洗牌
    if (keyDownAt.current === null) keyDownAt.current = performance.now()
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return
    const t0 = keyDownAt.current
    keyDownAt.current = null
    if (t0 === null) return
    const t1 = performance.now()
    const held = Math.max(1, t1 - t0)
    const jitter = (t1 * 1000) % 1000 / 1000          // 亚毫秒抖动，0–1
    /* 距离必须越过 MIN_SHUFFLE_DISTANCE，否则引擎判定手势无效、牌堆原样返回 */
    const dxK = MIN_SHUFFLE_DISTANCE + held * 0.7 + jitter * 40
    const dyK = (jitter - 0.5) * 60
    const startRatio = jitter
    const endRatio = Math.min(1, Math.max(0, startRatio + ((held % 97) / 97 - 0.5) * 0.6))

    setSettling(true)
    const result = onGesture({ dx: dxK, dy: dyK, durationMs: held, startRatio, endRatio })
    if (result?.applied) setLayerSeed((s) => s + 1)
  }

  const { dx, dy } = drag
  const distance = Math.hypot(dx, dy)
  const willApply = distance >= MIN_SHUFFLE_DISTANCE
  const idle = shuffleCount === 0 && distance === 0 && !reduceMotion

  return (
    <div
      ref={stageRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      role="button"
      tabIndex={0}
      aria-label={
        shuffleCount === 0
          ? '牌堆。滑动可以洗牌；用键盘时按 Enter 或空格洗一次'
          : `牌堆，已洗 ${shuffleCount} 次。继续滑动，或按 Enter 或空格再洗一次`
      }
      className="table-surface relative flex h-full w-full cursor-grab items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-silver/70 active:cursor-grabbing"
    >
      {/* 待机轻推（Idle Nudge）：整堆轻微摆动，告诉用户「这个东西可以动」。洗过一次后停止。 */}
      <motion.div
        className="relative"
        // 子元素全为绝对定位，必须显式给容器高度，否则 flex 居中会算成 0 高
        style={{
          width: 'var(--card-w-lg)',
          height: 'calc(var(--card-w-lg) / var(--card-ratio))',
        }}
        animate={idle ? { x: [0, -3, 3, 0] } : { x: 0 }}
        transition={
          idle
            ? { duration: 0.9, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
      >
        {Array.from({ length: LAYERS }, (_, i) => {
          // 三个子堆：越靠上的堆跟手越多
          const group = i % 3
          const factor = [1, 0.55, 0.25][group]
          const offsetX = Math.max(-64, Math.min(64, dx * factor))
          const offsetY = Math.max(-24, Math.min(24, dy * factor * 0.35))
          const rotate = Math.max(-8, Math.min(8, (dx / 24) * factor))
          // 静置时的自然错落（用 layerSeed 扰动，制造「重新叠过」的感觉）
          const restJitter = ((i * 37 + layerSeed * 53) % 7) - 3

          return (
            <motion.div
              key={i}
              className="absolute inset-x-0 top-0"
              style={{ zIndex: i }}
              animate={{
                x: offsetX + restJitter * 0.6,
                y: offsetY - i * 0.6,
                rotate: rotate + restJitter * 0.25,
              }}
              transition={
                settling && !reduceMotion
                  ? { type: 'spring', stiffness: 190, damping: 22, mass: 0.9 }
                  : { duration: 0 }
              }
            >
              <CardFrame size="lg" state={distance > 4 ? 'lifted' : 'resting'} fluid>
                <CardBack simplified={i < LAYERS - 3} />
              </CardFrame>
            </motion.div>
          )
        })}

        {/* 手势达到有效阈值时，牌堆下缘出现一条极淡的银线——告诉用户「这一下算数了」 */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 left-1/2 h-px w-24 -translate-x-1/2 bg-silver"
          animate={{ opacity: willApply ? 0.35 : 0 }}
          transition={{ duration: 0.16 }}
        />
      </motion.div>
    </div>
  )
}

export default ShuffleStack
