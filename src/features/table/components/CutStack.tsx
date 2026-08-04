import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MAX_CUT_RATIO, MIN_CUT_RATIO } from '@/features/table/engine'
import { capturePointer } from './pointer'

const STACK_HEIGHT = 300
const STACK_WIDTH = 180
const SLICES = 40

export type CutPhase = 'unset' | 'picked' | 'split' | 'done'

interface CutStackProps {
  phase: CutPhase
  /** 用户当前指定的切点比例；null = 还没选过（不存在默认切点，G-04） */
  ratio: number | null
  onRatioChange: (ratio: number) => void
  onInteractingChange?: (interacting: boolean) => void
}

/**
 * 侧视牌堆 + 切牌指示线。
 *
 * 【G-04】不存在默认切点：`ratio` 初始为 null，指示线停在中点但显式标注「未选择」，
 * 且在用户拖动/点击之前，页面不渲染「从这里切开」按钮。系统永远不会替用户切。
 */
export function CutStack({ phase, ratio, onRatioChange, onInteractingChange }: CutStackProps) {
  const stackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const ratioFromClientY = useCallback((clientY: number) => {
    const rect = stackRef.current?.getBoundingClientRect()
    if (!rect || rect.height === 0) return 0.5
    const raw = (clientY - rect.top) / rect.height
    return Math.min(MAX_CUT_RATIO, Math.max(MIN_CUT_RATIO, raw))
  }, [])

  const locked = phase === 'split' || phase === 'done'

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked) return
    capturePointer(e)
    setDragging(true)
    onInteractingChange?.(true)
    onRatioChange(ratioFromClientY(e.clientY))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || locked) return
    onRatioChange(ratioFromClientY(e.clientY))
  }

  const endDrag = () => {
    setDragging(false)
    onInteractingChange?.(false)
  }

  // 指示线位置：未选择时停在中点，但语义上是「未选择」
  const displayRatio = ratio ?? 0.5
  const lineY = displayRatio * STACK_HEIGHT

  // split 阶段：上叠上移、下叠下移，留出肉眼可见的间隙
  const splitGap = phase === 'split' ? 64 : 0

  return (
    <div
      className="table-surface relative flex h-full w-full items-center justify-center"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        ref={stackRef}
        className="relative"
        style={{ width: STACK_WIDTH, height: STACK_HEIGHT }}
      >
        {Array.from({ length: SLICES }, (_, i) => {
          const t = i / (SLICES - 1)
          const isUpper = t < displayRatio
          const y = t * STACK_HEIGHT
          return (
            <motion.div
              key={i}
              // initial={false}：牌堆一进入就在位，不做 40 张逐个下落的入场动画
              initial={false}
              className="absolute left-0 rounded-hair border-t bg-card-sky-a"
              style={{
                width: STACK_WIDTH,
                height: 8,
                borderColor: 'var(--color-line-hairline)',
                zIndex: i,
              }}
              animate={{
                y: y + (isUpper ? -splitGap : splitGap),
                x: phase === 'done' ? 0 : isUpper && splitGap ? 6 : 0,
              }}
              transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
            />
          )
        })}

        {/* 切牌指示线 + 拖柄 */}
        {!locked && (
          <motion.div
            className="pointer-events-none absolute left-0 flex items-center"
            // 牌堆切片带 z-index 到 39，指示线必须显式抬到它们之上，否则会被压在牌堆底下
            style={{ width: STACK_WIDTH + 44, zIndex: 50 }}
            animate={{
              y: lineY - 22,
              opacity: ratio === null ? 0.5 : 1,
              ...(ratio === null ? { x: [0, 0, 0] } : {}),
            }}
            transition={{ duration: dragging ? 0 : 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <span
              className="h-11 flex-1"
              style={{
                background:
                  'linear-gradient(to bottom, transparent calc(50% - 1px), var(--color-silver) 50%, transparent calc(50% + 1px))',
              }}
            />
            <motion.span
              className="flex h-11 w-11 items-center justify-center rounded-pill border border-line-strong bg-surface-2"
              animate={
                ratio === null && !dragging
                  ? { y: [0, -4, 4, 0] }
                  : { y: 0, scale: dragging ? 1.08 : 1 }
              }
              transition={
                ratio === null && !dragging
                  ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.16 }
              }
            >
              <span className="block h-px w-4 bg-silver" />
            </motion.span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CutStack
