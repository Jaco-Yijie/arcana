/**
 * 牌组徽记（Deck Sigil）—— Layer 3 的**可读**视觉锚点。
 *
 * 【为什么要新建，而不是复用卡背的构图】
 * 卡背 `DeckCardBack` 里已经有同一套五种构图（lunar / orbit / botanic /
 * constellation / veil），但它们是按 0.6 的牌面比例排的，而且外面还包着牌框、
 * 内衬线和暗角。把它搬到 Hero 的右栏会变成「第四张牌」，与左栏的真牌打架。
 * 更重要的是那是一个已经稳定的模块，为了取一个图形去改它不划算。
 *
 * 【为什么需要它 —— E3 审计的结论】
 * 十套氛围各自本来就有专属 SVG（光柱、退潮线、拱门藤蔓、月晕），
 * 但 `fillOpacity` 只有 0.028–0.07 —— 实际上人眼看不见。
 * 于是「换牌组」在用户那里只剩下换了个背景色，
 * 而代码里明明写了五种完全不同的空间结构。
 *
 * 差异不该靠色相（chroma ≤ 0.05 时几乎不可分），也不该靠堆粒子和 blur
 * （项目已有性能预算）。一个**形状明确、位置固定、静止不动**的徽记，
 * 是这三者里唯一既便宜又一眼可分的。
 *
 * 【克制的边界，照 STEP 2 的约束办】
 *   · 纯静态 SVG，无动画、无 canvas、无 WebGL
 *   · 单色描边（currentColor），不做多层 glow
 *   · 全篇 0 个 blur / backdrop-filter
 *   · 只有一个核心图形，不叠装饰
 */

import type { CardBackComposition } from '@/decks/types'
import type { DeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'

const S = 100 // viewBox 边长，统一坐标系

/** 月光：一轮偏心的月 + 两道同心星轨。缺口朝右上，不是正圆 */
function Lunar() {
  return (
    <>
      <circle cx="50" cy="46" r="19" fill="currentColor" fillOpacity="0.16" />
      <path
        d="M50 27a19 19 0 1 0 0 38 24 24 0 0 1 0-38Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
      <circle cx="50" cy="46" r="31" fill="none" stroke="currentColor" strokeOpacity="0.28" />
      <circle cx="50" cy="46" r="42" fill="none" stroke="currentColor" strokeOpacity="0.14" />
    </>
  )
}

/** 古典：暗金同心环 + 四个方位刻度。规整、对称、有度量感 */
function Orbit() {
  return (
    <>
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeOpacity="0.42" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeOpacity="0.22" />
      <circle cx="50" cy="50" r="5" fill="currentColor" fillOpacity="0.45" />
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="50"
          y1="8"
          x2="50"
          y2="16"
          stroke="currentColor"
          strokeOpacity="0.4"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
    </>
  )
}

/** 森语：一株对称的枝，根部一圈年轮。轴线略偏左，避免标本图式的死板 */
function Botanic() {
  return (
    <>
      <line x1="48" y1="86" x2="48" y2="24" stroke="currentColor" strokeOpacity="0.42" />
      {[
        { y: 36, dx: 20 },
        { y: 50, dx: 26 },
        { y: 64, dx: 20 },
      ].map((b) => (
        <g key={b.y}>
          <path
            d={`M48 ${b.y} Q${48 - b.dx * 0.6} ${b.y - 8} ${48 - b.dx} ${b.y + 2}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.3"
          />
          <path
            d={`M48 ${b.y} Q${48 + b.dx * 0.6} ${b.y - 8} ${48 + b.dx} ${b.y + 2}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.3"
          />
        </g>
      ))}
      <circle cx="48" cy="24" r="4.5" fill="currentColor" fillOpacity="0.4" />
      <circle cx="48" cy="86" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" />
    </>
  )
}

/** 星图：一组连线的星。刻意不是任何真实星座 —— 它是这副牌的记号，不是天文图 */
function Constellation() {
  const stars = [
    { x: 24, y: 30, r: 2.4 },
    { x: 44, y: 20, r: 1.6 },
    { x: 58, y: 40, r: 3 },
    { x: 40, y: 54, r: 1.8 },
    { x: 72, y: 66, r: 2.2 },
    { x: 30, y: 74, r: 1.5 },
  ]
  return (
    <>
      <polyline
        points="24,30 44,20 58,40 40,54 30,74"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.26"
      />
      <line x1="58" y1="40" x2="72" y2="66" stroke="currentColor" strokeOpacity="0.26" />
      {stars.map((s) => (
        <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r={s.r} fill="currentColor" fillOpacity="0.55" />
      ))}
    </>
  )
}

/** 幽影：层叠的帷幕，中心留一道缝。图形本身在「遮」，这是这副牌的态度 */
function Veil() {
  return (
    <>
      {[
        { x: 10, w: 30, o: 0.3 },
        { x: 60, w: 30, o: 0.3 },
        { x: 2, w: 12, o: 0.16 },
        { x: 86, w: 12, o: 0.16 },
      ].map((c) => (
        <rect
          key={c.x}
          x={c.x}
          y="14"
          width={c.w}
          height="72"
          fill="currentColor"
          fillOpacity={c.o}
          rx="2"
        />
      ))}
      {/* 缝里透出来的一线光 */}
      <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeOpacity="0.5" />
    </>
  )
}

const GLYPH: Record<CardBackComposition, () => React.JSX.Element> = {
  lunar: Lunar,
  orbit: Orbit,
  botanic: Botanic,
  constellation: Constellation,
  veil: Veil,
}

interface Props {
  deckId: DeckId
  /** 边长（任意 CSS 长度）。徽记是正方形 */
  size?: string
  /** 整体不透明度。Hero 用 0.5 左右，背景锚点用 0.16 左右 */
  opacity?: number
  className?: string
}

export function DeckSigil({ deckId, size = '10rem', opacity = 0.5, className = '' }: Props) {
  /* raster 牌组的 cardBack 没有 composition（它们用真实卡背图），
     退回 'lunar' —— 徽记是氛围锚点，不是牌背，缺省有值比不渲染好。 */
  const composition = getDeck(deckId).visual.cardBack.composition ?? 'lunar'
  const Glyph = GLYPH[composition]
  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none shrink-0 text-silver ${className}`}
      style={{ opacity }}
    >
      <Glyph />
    </svg>
  )
}

export default DeckSigil
