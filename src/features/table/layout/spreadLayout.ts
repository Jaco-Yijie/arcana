/**
 * 牌阵响应式布局引擎（Phase C0）
 *
 * ══════════════════════════════════════════════════════════════
 *   Spread Definition（逻辑 row/col）
 *         ↓
 *   Board Dimensions（牌桌实际可用尺寸）
 *         ↓
 *   Card Dimensions（由两条约束反解）
 *         ↓
 *   Slot Rects（含 label 带）
 *         ↓
 *   Render
 * ══════════════════════════════════════════════════════════════
 *
 * 【它解决的问题】
 * 旧实现把牌桌高度写死 288px、牌位尺寸写死 64×110，牌位坐标却是 0–1 浮点。
 * 三个常量一相除就得到一个硬阈值：纵向间距 < 110/288 = 0.382 的牌位必然重叠。
 * 二选一与关系牌阵当场中招，而且**与视口无关** —— 那不是没调好，
 * 是布局模型允许「写出重叠的牌阵」。
 *
 * 【为什么重叠在这里是结构性不可能的】
 * 1. 单元格按 cols × rows 平铺，互不相交（这是网格的定义）
 * 2. 每个单元格里放的是「卡 + 间隙 + 标签」这一整个包围盒，且包围盒 ≤ 单元格
 * 3. 视觉修饰（offset / rotation）的量以**单元格内的剩余自由空间**为单位并被钳制
 *
 * 三条合起来：任意两个 slot 的包围盒都落在各自不相交的单元格里。
 * 所以 L-01（卡不相交）与 L-02（标签不压别人的卡）都不需要靠"调参数"保证。
 *
 * 【卡牌比例不改】
 * `CARD_RATIO` 必须与 theme.css 的 `--card-ratio` 一致，由 layout:check 断言。
 */

import type { Spread, SpreadPosition } from '@/types/spread'

/** 卡牌宽高比 w/h。**必须与 theme.css 的 --card-ratio 一致** */
export const CARD_RATIO = 0.5999

/* ── 版式常量（相对卡牌尺寸，不是绝对像素） ────────────────── */

/** 列间距 = 卡宽 × 此值。同时也是 offsetX 的活动余量来源 */
const GUTTER_X_RATIO = 0.18
/** 标签带高度 = 卡高 × 此值。标签结构性地属于单元格，不会溢出到邻居 */
const LABEL_BAND_RATIO = 0.20
/**
 * 标签带的绝对下限（px）。
 *
 * 【为什么不能只用比例】
 * 最长的牌位名是「A 方向发展」6 个字，11px 字号下约 72px 宽 ——
 * 小屏上卡宽只有 57px，它必然折成两行。而按比例算出来的带高只有 19px，
 * 一行都装不下，第二行被 overflow-hidden 直接切掉，实测就是这个样子。
 *
 * 所以带高取「比例」与「两行文字」的较大者。两行 = 2 × 15px 行高 + 2px 余量。
 */
const LABEL_MIN_H = 26
/** 行间距 = 卡高 × 此值。同时也是 offsetY 的活动余量来源 */
const GUTTER_Y_RATIO = 0.09

/**
 * 卡牌宽度的**期望**下限。
 *
 * 44 只保证「不重叠」，而这个产品的核心动作是**用户自己选牌**。
 * 实测 360×800 下 5 张牌阵的卡宽只有 50px —— 不重叠，但看不清也不好放。
 * 62 是「一眼能认出是张牌、手指放得准」的目标值。
 *
 * 【它是目标，不是地板 —— 这一点很重要】
 * 旧实现把它当硬地板：`clamp(rawCardW, 62, MAX)`。
 * 于是在 320×700 上，可用高度只够 53px 的牌，却被强行抬到 62px，
 * board 跟着涨到 416px，而可用高度只有 371px ——
 * **卡牌反过来把 board 撑破了**，底部那张直接被 `overflow:hidden` 裁掉。
 * 更糟的是这件事测不出来：`inspectLayout` 拿 slot 和「由 cardW 推导出来的 boardH」比，
 * 两者一起变大，越界永远为 0。
 *
 * 现在只有 `ABSOLUTE_MIN_CARD_W` 是真正的地板，62 退化为
 * 「低于它就置 cramped，交给调用方决定怎么办」。
 */
export const MIN_CARD_W = 62

/**
 * 绝对下限。低于它牌面已不可辨，但**仍然优先保证不溢出** ——
 * 宁可牌小，也不能把牌裁掉一半。
 */
export const ABSOLUTE_MIN_CARD_W = 40
/** 卡牌宽度上限。桌面端牌桌很大时不让单张牌膨胀成海报 */
export const MAX_CARD_W = 208

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface SlotLayout {
  id: string
  /** 卡牌矩形（未旋转时的几何位置） */
  card: Rect
  /** 标签带矩形 */
  label: Rect
  /** 卡 + 标签的包围盒；旋转时按旋转后的 AABB 计算 */
  bounds: Rect
  /** 视觉旋转角度（度）。渲染时施加，几何已按它预留了空间 */
  rotation: number
}

export interface SpreadLayout {
  /** 实际占用的牌桌尺寸（可能小于传入的可用尺寸，此时内容居中） */
  boardW: number
  boardH: number
  cardW: number
  cardH: number
  labelH: number
  slots: SlotLayout[]
  /** 可用尺寸不足以维持 MIN_CARD_W 时为 true —— 调用方应改用滚动容器 */
  cramped: boolean
}

/* ── 工具 ──────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** 旋转后包围盒相对原尺寸的膨胀系数 */
function rotationInflation(w: number, h: number, deg: number): { fw: number; fh: number } {
  if (!deg) return { fw: 1, fh: 1 }
  const r = (Math.abs(deg) * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return {
    fw: (w * c + h * s) / w,
    fh: (w * s + h * c) / h,
  }
}

function spanOf(pos: SpreadPosition): { colSpan: number; rowSpan: number } {
  return { colSpan: pos.colSpan ?? 1, rowSpan: pos.rowSpan ?? 1 }
}

/* ── 主函数 ────────────────────────────────────────────────── */

/**
 * 由牌桌可用尺寸反解出整个牌阵的像素布局。
 *
 * 纯函数：同样的输入永远给出同样的输出（L-07 deterministic）。
 * 不读 DOM、不读视口、不含随机。
 *
 * @param availW 牌桌可用宽度（已扣除页面左右内边距）
 * @param availH 牌桌可用高度（已扣除页头、提示条、底部操作区）
 */
export function computeSpreadLayout(
  spread: Spread,
  availW: number,
  availH: number,
): SpreadLayout {
  const { cols, rows } = spread.grid

  /* 单元格相对卡牌尺寸的倍数。
     旋转会让包围盒变大，所以先算出全牌阵最大的膨胀系数，
     用它抬高单元格需求 —— 这样旋转同样不会造成相交。 */
  let maxFw = 1
  let maxFh = 1
  for (const pos of spread.positions) {
    const { fw, fh } = rotationInflation(1, 1 / CARD_RATIO, pos.rotation ?? 0)
    if (fw > maxFw) maxFw = fw
    if (fh > maxFh) maxFh = fh
  }

  /* 一个单元格要装下：卡（可能旋转过）+ 标签带 + 行列间距 */
  const cellWPerCard = maxFw + GUTTER_X_RATIO

  /* 横向约束直接解 */
  const cardWFromWidth = availW / (cols * cellWPerCard)

  /* 纵向约束要分两种情况解，因为标签带高度是
     `max(cardH × 比例, 绝对下限)` —— 对 cardH 不是线性的。
       情况 A：比例项占优  cellH = cardH(maxFh + LABEL_RATIO + GUTTER_Y)
       情况 B：下限项占优  cellH = cardH(maxFh + GUTTER_Y) + LABEL_MIN_H
     先按 A 解，若解出来的带高确实 ≥ 下限则 A 自洽；否则改用 B。 */
  const cellHTarget = availH / rows
  const cardHViaRatio = cellHTarget / (maxFh + LABEL_BAND_RATIO + GUTTER_Y_RATIO)
  const cardHFromHeight =
    cardHViaRatio * LABEL_BAND_RATIO >= LABEL_MIN_H
      ? cardHViaRatio
      : Math.max(0, (cellHTarget - LABEL_MIN_H) / (maxFh + GUTTER_Y_RATIO))
  const cardWFromHeight = cardHFromHeight * CARD_RATIO

  /* 【只向下钳，不向上抬】
     rawCardW 是「可用空间允许的最大卡宽」。把它抬高等于宣称有更多空间，
     board 会随之涨过可用区域，底部的牌被容器裁掉。
     所以上限照常，下限只到 ABSOLUTE_MIN —— 期望值 MIN_CARD_W 只用来置 cramped。 */
  const rawCardW = Math.min(cardWFromWidth, cardWFromHeight)
  const cramped = rawCardW < MIN_CARD_W
  const cardW = clamp(rawCardW, ABSOLUTE_MIN_CARD_W, MAX_CARD_W)
  const cardH = cardW / CARD_RATIO
  const labelH = Math.max(cardH * LABEL_BAND_RATIO, LABEL_MIN_H)

  /* 【宽屏上把富余宽度用掉】
     卡牌尺寸由「宽度」与「高度」两条约束里更紧的那条决定。
     桌面上通常是高度先到顶：1120×420 的牌桌算出来的卡宽只有 64px，
     于是 3 列牌阵只占 227px，剩下 893px 全是空的 —— 牌桌看起来是被挤在中间的。

     解法不是把牌放大（那会突破高度约束造成越界），而是**把列拉开**：
     多出来的宽度分给列间距，牌阵因此铺满更大一片桌面。
     间距变大只会让牌离得更远，碰撞安全性反而更好，L-01/L-02 不受影响。 */
  const baseCellW = cardW * cellWPerCard
  const slackRatio = baseCellW > 0 ? availW / (cols * baseCellW) : 1
  /* 上限 2.2：再拉开牌就散了，读不出是一个牌阵 */
  const cellW = baseCellW * clamp(slackRatio, 1, 2.2)
  const cellH = cardH * (maxFh + GUTTER_Y_RATIO) + labelH

  const boardW = cols * cellW
  const boardH = rows * cellH

  /* 单元格里卡+标签之外的自由空间。offset 就在这个范围内活动，
     因此偏移到极限也只是贴到自己单元格的边，碰不到邻居。 */
  const freeX = (cellW - cardW * maxFw) / 2
  const freeY = (cellH - cardH * maxFh - labelH) / 2

  const slots: SlotLayout[] = spread.positions.map((pos) => {
    const { colSpan, rowSpan } = spanOf(pos)

    /* 跨格时以所跨区域的中心为准 */
    const cellCx = (pos.col + colSpan / 2) * cellW
    const cellCy = (pos.row + rowSpan / 2) * cellH

    const dx = clamp(pos.offsetX ?? 0, -1, 1) * freeX
    const dy = clamp(pos.offsetY ?? 0, -1, 1) * freeY

    /* 包围盒 = 卡 + 标签带，整体在单元格里居中 */
    const contentH = cardH + labelH
    const contentTop = cellCy - contentH / 2 + dy

    const card: Rect = {
      x: cellCx - cardW / 2 + dx,
      y: contentTop,
      w: cardW,
      h: cardH,
    }
    const label: Rect = {
      x: cellCx - cellW / 2 + dx,
      y: contentTop + cardH,
      w: cellW,
      h: labelH,
    }

    const rotation = pos.rotation ?? 0
    const { fw, fh } = rotationInflation(cardW, cardH, rotation)
    const rotW = cardW * fw
    const rotH = cardH * fh
    /* 包围盒取「旋转后的卡」与「标签带」的并集 */
    const bx = Math.min(card.x + cardW / 2 - rotW / 2, label.x)
    const bRight = Math.max(card.x + cardW / 2 + rotW / 2, label.x + label.w)
    const by = Math.min(card.y + cardH / 2 - rotH / 2, label.y)
    const bBottom = Math.max(card.y + cardH / 2 + rotH / 2, label.y + label.h)

    return {
      id: pos.id,
      card,
      label,
      bounds: { x: bx, y: by, w: bRight - bx, h: bBottom - by },
      rotation,
    }
  })

  return { boardW, boardH, cardW, cardH, labelH, slots, cramped }
}

/* ── 碰撞检测（供 layout:check 与开发期断言使用） ──────────── */

export function rectsIntersect(a: Rect, b: Rect, tolerance = 0.01): boolean {
  return (
    a.x < b.x + b.w - tolerance &&
    b.x < a.x + a.w - tolerance &&
    a.y < b.y + b.h - tolerance &&
    b.y < a.y + a.h - tolerance
  )
}

export interface CollisionReport {
  /** 卡与卡相交（L-01） */
  cardCollisions: Array<[string, string]>
  /** 某个标签压在别人的卡上（L-02） */
  labelOverCard: Array<[string, string]>
  /** 超出牌桌可用区域（L-03） */
  outOfBounds: string[]
}

/**
 * @param avail 牌桌**真实可用区域**。不传则退回用 layout 自己的 boardW/H。
 *
 * 【为什么必须传 avail】
 * 旧版只拿 slot 与 `layout.boardW/boardH` 比 —— 而这两个值本身就是由 cardW 推导出来的。
 * 卡宽被向上钳高时，board 会跟着一起变大，于是「slot 在 board 内」永远成立，
 * 而真正发生的事是 board 已经比容器大了，牌被 `overflow:hidden` 裁掉。
 * 实测 320×700 就是这样：boardH 416 > 可用 371，底部牌被裁，断言却全绿。
 */
export function inspectLayout(
  layout: SpreadLayout,
  avail?: { w: number; h: number },
): CollisionReport {
  const report: CollisionReport = { cardCollisions: [], labelOverCard: [], outOfBounds: [] }
  const { slots } = layout
  const boardW = avail ? Math.max(avail.w, layout.boardW) : layout.boardW
  const boardH = avail ? avail.h : layout.boardH

  /* board 比可用区域还大 = 整体溢出，所有 slot 都算越界 */
  if (avail && (layout.boardW > avail.w + 0.01 || layout.boardH > avail.h + 0.01)) {
    report.outOfBounds.push(
      `__board__ ${layout.boardW.toFixed(0)}×${layout.boardH.toFixed(0)} > 可用 ${avail.w.toFixed(0)}×${avail.h.toFixed(0)}`,
    )
  }

  for (let i = 0; i < slots.length; i += 1) {
    const a = slots[i]!
    /* L-03：包围盒必须完整落在牌桌内 */
    if (
      a.bounds.x < -0.01 ||
      a.bounds.y < -0.01 ||
      a.bounds.x + a.bounds.w > boardW + 0.01 ||
      a.bounds.y + a.bounds.h > boardH + 0.01
    ) {
      report.outOfBounds.push(a.id)
    }
    for (let j = i + 1; j < slots.length; j += 1) {
      const b = slots[j]!
      if (rectsIntersect(a.card, b.card)) report.cardCollisions.push([a.id, b.id])
      if (rectsIntersect(a.label, b.card)) report.labelOverCard.push([a.id, b.id])
      if (rectsIntersect(b.label, a.card)) report.labelOverCard.push([b.id, a.id])
    }
  }
  return report
}

/** 牌阵定义自身是否自洽：row/col 落在声明的 grid 内，且没有两个牌位占同一格 */
export function validateSpreadGrid(spread: Spread): string[] {
  const errors: string[] = []
  const occupied = new Map<string, string>()
  for (const pos of spread.positions) {
    const { colSpan, rowSpan } = spanOf(pos)
    if (pos.col < 0 || pos.row < 0) errors.push(`${pos.id}: row/col 不能为负`)
    if (pos.col + colSpan > spread.grid.cols) {
      errors.push(`${pos.id}: col ${pos.col}+${colSpan} 超出 grid.cols=${spread.grid.cols}`)
    }
    if (pos.row + rowSpan > spread.grid.rows) {
      errors.push(`${pos.id}: row ${pos.row}+${rowSpan} 超出 grid.rows=${spread.grid.rows}`)
    }
    for (let c = pos.col; c < pos.col + colSpan; c += 1) {
      for (let r = pos.row; r < pos.row + rowSpan; r += 1) {
        const key = `${c},${r}`
        const prev = occupied.get(key)
        if (prev) errors.push(`${pos.id} 与 ${prev} 占用同一格 (${key})`)
        else occupied.set(key, pos.id)
      }
    }
  }
  return errors
}
