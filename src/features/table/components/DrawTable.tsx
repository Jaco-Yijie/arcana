import { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CardFrame } from '@/components/card/CardFrame'
import { CardBack } from '@/components/card/CardBack'
import { capturePointer } from './pointer'
import { FanSpread } from './FanSpread'
import type { Spread } from '@/types/spread'
import type { Placement } from '@/types/session'

/** 吸附判定半径（拖拽牌中心 → 牌位中心）。远大于卡牌半宽，避免「一直弹回来」的挫败 */
const SNAP_RADIUS = 56
/** 拖拽启动阈值 */
const DRAG_THRESHOLD = 6
/** 手指偏移：卡牌相对手指上移，保证牌和目标牌位都不被手指遮住 */
const FINGER_OFFSET = 40

const ZONE_W = 64
const ZONE_H = 110

interface DragState {
  /** 从手牌拖出 = deckIndex；从牌位拖回 = 该牌位 id */
  source: { kind: 'hand'; deckIndex: number } | { kind: 'zone'; positionId: string; deckIndex: number }
  x: number
  y: number
  started: boolean
  startX: number
  startY: number
}

interface DrawTableProps {
  spread: Spread
  deckCount: number
  /** 用户已拿在手上的牌（deckIndex），MVP 同时只允许 1 张 */
  handIndex: number | null
  placements: Placement[]
  takenIndexes: number[]
  onPick: (deckIndex: number) => void
  onPlace: (deckIndex: number, positionId: string) => void
  onLift: (positionId: string) => void
  onInteractingChange?: (interacting: boolean) => void
  /** Hand 区的引导文案（空手 / 有牌两种） */
  handHint: React.ReactNode
}

/**
 * 摊牌 · 选牌 · 摆牌 一体化牌桌。
 *
 * 空间结构（UX Spec §3.8）：Board 牌阵（上）/ Hand 手牌（中）/ Fan 扇形（下）。
 * 这个「目标—手—牌堆」的上中下隐喻让拖拽方向天然由下往上，与真人摆牌一致；
 * 同时 Fan 落在拇指舒适区，Board 只需要看得见。
 *
 * 【AC-04】牌只能通过 pointermove 拖进牌位：仅点击永远不会落位。
 * 【G-06】靠近牌位时只做描边高亮 + 放大，卡牌本身**不位移** —— 不是磁吸。
 */
export function DrawTable({
  spread,
  deckCount,
  handIndex,
  placements,
  takenIndexes,
  onPick,
  onPlace,
  onLift,
  onInteractingChange,
  handHint,
}: DrawTableProps) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const zoneRefs = useRef(new Map<string, HTMLDivElement>())
  const zoneCenters = useRef<{ id: string; x: number; y: number; empty: boolean }[]>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverZone, setHoverZone] = useState<string | null>(null)
  // state 用于渲染，ref 用于事件处理里读「此刻的真值」
  const dragRef = useRef<DragState | null>(null)
  const hoverRef = useRef<string | null>(null)

  const placementOf = useCallback(
    (positionId: string) => placements.find((p) => p.positionId === positionId) ?? null,
    [placements],
  )

  /** 拖拽开始时快照所有牌位中心，避免拖动中反复 layout */
  const snapshotZones = useCallback(
    (excludeId?: string) => {
      const root = rootRef.current?.getBoundingClientRect()
      if (!root) return
      zoneCenters.current = spread.positions
        .map((pos) => {
          const el = zoneRefs.current.get(pos.id)
          if (!el) return null
          const r = el.getBoundingClientRect()
          const occupied = placementOf(pos.id)
          return {
            id: pos.id,
            x: r.left - root.left + r.width / 2,
            y: r.top - root.top + r.height / 2,
            // 已翻开的牌位永远不接受落牌；空位或来源位可接受
            empty: !occupied || occupied.revealed === false || pos.id === excludeId,
          }
        })
        .filter((z): z is { id: string; x: number; y: number; empty: boolean } => z !== null)
        .filter((z) => {
          const occupied = placementOf(z.id)
          return !occupied?.revealed
        })
    },
    [spread.positions, placementOf],
  )

  const localPoint = (clientX: number, clientY: number) => {
    const r = rootRef.current?.getBoundingClientRect()
    return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) }
  }

  const beginDrag = (
    e: React.PointerEvent,
    source: DragState['source'],
    excludeId?: string,
  ) => {
    capturePointer(e)
    snapshotZones(excludeId)
    const p = localPoint(e.clientX, e.clientY)
    const initial: DragState = {
      source,
      x: p.x,
      y: p.y - FINGER_OFFSET,
      started: false,
      startX: e.clientX,
      startY: e.clientY,
    }
    dragRef.current = initial
    hoverRef.current = null
    setDrag(initial)
  }

  const moveDrag = (e: React.PointerEvent) => {
    const prev = dragRef.current
    if (!prev) return
    const dist = Math.hypot(e.clientX - prev.startX, e.clientY - prev.startY)
    const started = prev.started || dist >= DRAG_THRESHOLD
    if (started && !prev.started) onInteractingChange?.(true)

    const p = localPoint(e.clientX, e.clientY)
    const next: DragState = { ...prev, started, x: p.x, y: p.y - FINGER_OFFSET }
    dragRef.current = next
    setDrag(next)

    if (!started) return
    // 吸附判定基于**拖拽牌中心**而不是手指位置，配合 40px 手指偏移，
    // 牌和目标牌位都不会被手指挡住。
    let nearest: string | null = null
    let best = SNAP_RADIUS
    for (const z of zoneCenters.current) {
      if (!z.empty) continue
      const d = Math.hypot(z.x - next.x, z.y - next.y)
      if (d < best) {
        best = d
        nearest = z.id
      }
    }
    // 用 ref 保存：pointerup 的处理函数拿到的必须是最新命中结果，
    // 只靠 state 会读到上一帧的值，导致「明明拖到位了却弹回去」。
    hoverRef.current = nearest
    setHoverZone(nearest)
  }

  const endDrag = () => {
    const prev = dragRef.current
    const zone = hoverRef.current
    dragRef.current = null
    hoverRef.current = null
    onInteractingChange?.(false)
    setDrag(null)
    setHoverZone(null)

    if (!prev || !prev.started) return
    if (zone) {
      onPlace(prev.source.deckIndex, zone)
    } else if (prev.source.kind === 'zone') {
      // 拖出牌位但没落到别处 → 回到手牌，牌位空出来（换牌，AC-06，不弹确认框）
      onLift(prev.source.positionId)
    }
  }

  const boardFull = placements.length === spread.cardCount

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      {/* ── Board 牌阵画布 ─────────────────────────────── */}
      <div
        ref={boardRef}
        className="relative mx-4 shrink-0"
        style={{ height: 288 }}
      >
        {spread.positions.map((pos) => {
          const placed = placementOf(pos.id)
          const hovering = hoverZone === pos.id
          const draggingThis =
            drag?.started && drag.source.kind === 'zone' && drag.source.positionId === pos.id
          return (
            <div
              key={pos.id}
              ref={(el) => {
                if (el) zoneRefs.current.set(pos.id, el)
                else zoneRefs.current.delete(pos.id)
              }}
              className="absolute flex flex-col items-center gap-1"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                width: ZONE_W,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                animate={{ scale: hovering ? 1.06 : 1 }}
                transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
                style={{ width: ZONE_W, height: ZONE_H }}
              >
                {placed ? (
                  // 拖拽期间**不能卸载**这个元素：它持有 pointer capture，
                  // 一旦从 DOM 移除，后续的 pointermove / pointerup 全部收不到，拖拽会永久卡住。
                  // 所以只把它隐藏，不把它删掉。
                  <div
                    onPointerDown={(e) =>
                      !placed.revealed &&
                      beginDrag(e, { kind: 'zone', positionId: pos.id, deckIndex: placed.deckIndex }, pos.id)
                    }
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="h-full w-full"
                    style={{ opacity: draggingThis ? 0 : 1 }}
                  >
                    <CardFrame size="sm" fluid state="resting" className="h-full w-full">
                      <CardBack simplified />
                    </CardFrame>
                  </div>
                ) : (
                  <CardFrame
                    size="sm"
                    fluid
                    placeholder
                    className={[
                      'h-full w-full transition-colors duration-[var(--duration-quick)]',
                      hovering ? 'border-silver/75 border-solid' : '',
                      handIndex !== null && !hovering ? 'border-line-soft' : '',
                    ].join(' ')}
                  />
                )}
              </motion.div>
              <span className="text-[11px] tracking-wide-caps text-text-faint">{pos.label}</span>
            </div>
          )
        })}
      </div>

      {/* ── Hand 手牌区：始终回答「现在轮到我做什么」 ────── */}
      <div className="relative flex shrink-0 items-center justify-center gap-3 px-5" style={{ height: 96 }}>
        {handIndex !== null && (
          // 同上：拖拽中只隐藏、不卸载，否则 pointer capture 随元素一起消失
          <div
            onPointerDown={(e) => beginDrag(e, { kind: 'hand', deckIndex: handIndex })}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="touch-none"
            style={{ opacity: drag?.started && drag.source.kind === 'hand' ? 0 : 1 }}
          >
            <CardFrame size="sm" state="lifted" selected>
              <CardBack simplified />
            </CardFrame>
          </div>
        )}
        <p className="max-w-[190px] text-caption text-text-low">{handHint}</p>
      </div>

      {/* ── Fan 扇形区：拇指舒适区 ──────────────────────── */}
      <div className="relative min-h-0 flex-1">
        {!boardFull && (
          <FanSpread
            count={deckCount}
            takenIndexes={takenIndexes}
            onPick={onPick}
            locked={handIndex !== null}
            onInteractingChange={onInteractingChange}
          />
        )}
      </div>

      {/* ── 拖拽中的牌（跟手层） ───────────────────────── */}
      {drag?.started && (
        <motion.div
          className="pointer-events-none absolute top-0 left-0 z-50"
          style={{ width: ZONE_W }}
          animate={{ x: drag.x - ZONE_W / 2, y: drag.y - ZONE_H / 2 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.06, ease: 'linear' }}
        >
          <CardFrame size="sm" fluid state="lifted" selected>
            <CardBack simplified />
          </CardFrame>
        </motion.div>
      )}
    </div>
  )
}

export default DrawTable
