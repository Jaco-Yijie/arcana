/**
 * fan.ts — 摊牌（Fan Spread）布局数学
 *
 * 【定位】纯数学，不含 React / DOM。UI 只负责把这里算出来的
 * `{ x, y, rotate, scale, zIndex }` 贴到 transform 上。
 *
 * 【要解决的三个真实问题】
 * 1. 简报 §9：78 张全部背面朝上、横向扇形展开、可左右滑动浏览。
 *    375px 宽的手机放不下 78 张，所以布局必须是「一条比屏幕长得多的弧」+ 横向滚动。
 * 2. AC-15 / G-20：移动端手指可点。卡牌互相重叠时，每张牌必须留出
 *    **≥ MIN_EXPOSURE（28px）** 的可点区域，否则用户根本选不中他想要的那张。
 * 3. 重叠意味着一个点会同时落在多张牌的矩形里。`hitTestFan` 取 zIndex 最高的那张
 *    —— 也就是用户**眼睛看到的那张** —— 这是移动端选牌不误触的关键。
 *    （如果 UI 用 DOM 事件冒泡也能得到同样结果，但 Canvas / 自定义手势层必须用它。）
 */

/** 每张牌至少要露出这么宽，手指才点得中 */
export const MIN_EXPOSURE = 28

export interface FanLayoutInput {
  /** 牌数（通常 78） */
  count: number
  /** 可视容器宽度（px） */
  containerWidth: number
  /** 可视容器高度（px） */
  containerHeight: number
  /** 当前横向滚动位移（px，向右滚为正） */
  scrollOffset: number
  cardWidth: number
  cardHeight: number
  /** 每张牌最小露出宽度，默认 MIN_EXPOSURE */
  minExposure?: number
  /** 扇形两端留白，默认 16 */
  sidePadding?: number
  /** 边缘牌的最大倾角（deg），默认 12 */
  maxTiltDeg?: number
  /** 弧线下沉深度（px），默认 22。中心高、两侧低 */
  arcDepth?: number
  /** 中心牌的最大放大倍数，默认 1.06 */
  focusScale?: number
  /** 中心牌的最大上浮（px），默认 14 */
  focusLift?: number
  /** 中心提示区半径（px）。默认 cardWidth * 1.2 */
  focusRadius?: number
}

export interface FanCardLayout {
  index: number
  /** 未缩放时左上角相对可视容器的坐标 */
  x: number
  y: number
  /** 未缩放尺寸 */
  width: number
  height: number
  /** deg */
  rotate: number
  zIndex: number
  scale: number
  /** 是否落在中心提示区（略微上浮放大，提示「这些是你现在能选的」） */
  focused: boolean
  /** 这张牌未被右侧邻牌覆盖的可点宽度（px），保证 ≥ minExposure */
  exposure: number
}

export interface FanMetrics {
  /** 相邻两张牌的横向间距 = 每张牌的露出宽度 */
  step: number
  /** 整条扇形的总宽度，UI 用它设置滚动内容宽度 */
  contentWidth: number
  /** scrollOffset 的上限 */
  maxScrollOffset: number
  sidePadding: number
}

type ResolvedInput = Required<FanLayoutInput>

function resolve(input: FanLayoutInput): ResolvedInput {
  const cardWidth = Math.max(1, input.cardWidth)
  return {
    count: Math.max(0, Math.floor(input.count)),
    containerWidth: Math.max(1, input.containerWidth),
    containerHeight: Math.max(1, input.containerHeight),
    scrollOffset: Number.isFinite(input.scrollOffset) ? input.scrollOffset : 0,
    cardWidth,
    cardHeight: Math.max(1, input.cardHeight),
    minExposure: input.minExposure ?? MIN_EXPOSURE,
    sidePadding: input.sidePadding ?? 16,
    maxTiltDeg: input.maxTiltDeg ?? 12,
    arcDepth: input.arcDepth ?? 22,
    focusScale: input.focusScale ?? 1.06,
    focusLift: input.focusLift ?? 14,
    focusRadius: input.focusRadius ?? cardWidth * 1.2,
  }
}

export function computeFanMetrics(input: FanLayoutInput): FanMetrics {
  const r = resolve(input)
  // 卡牌必须始终保持重叠感，所以 step 不允许超过 cardWidth 的 72%
  const maxStep = r.cardWidth * 0.72
  const available = r.containerWidth - r.sidePadding * 2 - r.cardWidth
  const ideal = r.count > 1 ? available / (r.count - 1) : 0
  // 下限 minExposure 是硬要求：宁可让扇形超出屏幕需要滚动，也不能让牌挤到点不中
  const step = Math.min(maxStep, Math.max(r.minExposure, ideal))
  const contentWidth = r.count > 0 ? (r.count - 1) * step + r.cardWidth + r.sidePadding * 2 : 0
  return {
    step,
    contentWidth,
    maxScrollOffset: Math.max(0, contentWidth - r.containerWidth),
    sidePadding: r.sidePadding,
  }
}

/**
 * 计算每张牌的位置。
 * 弧线锚定在**可视区中心**而不是扇形中心：用户滚动时，弧顶始终跟着视口走，
 * 这样任何时候屏幕中间的那几张都是抬起来的，「随时可以从任意位置选」才成立（简报 §9）。
 */
export function computeFanLayout(input: FanLayoutInput): FanCardLayout[] {
  const r = resolve(input)
  if (r.count === 0) return []

  const { step } = computeFanMetrics(input)
  const viewCenterX = r.containerWidth / 2
  const halfView = Math.max(1, r.containerWidth / 2)
  const baseY = Math.max(0, (r.containerHeight - r.cardHeight) / 2 - r.arcDepth * 0.5)

  const out: FanCardLayout[] = []
  for (let i = 0; i < r.count; i += 1) {
    const x = r.sidePadding + i * step - r.scrollOffset
    const centerX = x + r.cardWidth / 2
    const rawT = (centerX - viewCenterX) / halfView
    const t = Math.min(1.6, Math.max(-1.6, rawT))

    const distance = Math.abs(centerX - viewCenterX)
    const focusWeight = r.focusRadius > 0 ? Math.max(0, 1 - distance / r.focusRadius) : 0
    const focused = focusWeight > 0

    const scale = 1 + (r.focusScale - 1) * focusWeight
    const y = baseY + r.arcDepth * t * t - r.focusLift * focusWeight

    out.push({
      index: i,
      x,
      y,
      width: r.cardWidth,
      height: r.cardHeight,
      rotate: t * r.maxTiltDeg,
      // 基础层叠：右边的牌压住左边的牌，所以每张牌的左侧 step 宽度是它的专属可点区。
      // 中心提示区整体抬到最上层，被放大的牌不会被邻牌切掉一角。
      zIndex: i + (focused ? r.count : 0),
      scale,
      focused,
      exposure: i === r.count - 1 ? r.cardWidth : Math.min(r.cardWidth, step),
    })
  }
  return out
}

/**
 * 命中判定：返回该点最上层那张牌的 index，没命中返回 null。
 *
 * 卡牌大量重叠，一个触点通常落在 3–4 张牌的矩形内，
 * 必须取 zIndex 最大的那张 —— 否则用户点到的会是被压在下面、他根本看不见的牌。
 * 刻意忽略 rotate：倾角只有十几度，按未旋转矩形判定会给出更宽容的触摸区，
 * 移动端手指粗，宁可宽容也不要「点了没反应」。
 */
export function hitTestFan(layouts: readonly FanCardLayout[], x: number, y: number): number | null {
  let best: FanCardLayout | null = null
  for (const l of layouts) {
    const halfW = (l.width * l.scale) / 2
    const halfH = (l.height * l.scale) / 2
    const cx = l.x + l.width / 2
    const cy = l.y + l.height / 2
    if (x < cx - halfW || x > cx + halfW || y < cy - halfH || y > cy + halfH) continue
    if (best === null || l.zIndex > best.zIndex) best = l
  }
  return best === null ? null : best.index
}

/** 把第 index 张牌滚到视口中心所需的 scrollOffset（引导、会话恢复时定位用） */
export function scrollOffsetForIndex(input: FanLayoutInput, index: number): number {
  const r = resolve(input)
  const m = computeFanMetrics(input)
  const target = r.sidePadding + index * m.step + r.cardWidth / 2 - r.containerWidth / 2
  return Math.min(m.maxScrollOffset, Math.max(0, target))
}
