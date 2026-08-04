import { useId } from 'react'
import type { ReactNode } from 'react'
import type { ArtMotif, CardArt as CardArtSpec } from '@/types/tarot'

/**
 * CardArt — 程序化牌面（Procedural card face）
 *
 * MVP 不做 78 张原创插画，牌面由 SVG 程序化生成：
 * - `motif` 决定构图母题（12 种，每种在 64px 宽下仍可辨识）
 * - `hue`   只在 240°–272° 的窄色带内做**轻微**偏移 —— 保证 78 张仍像同一副牌
 * - `tier`  signature 比 placeholder 多一层细节（星座 + 长弧 + 母题小配件），
 *           但两者共用完全相同的视觉语言：夜空渐变 / 地平线 / 银色发丝线 / 单一光源
 *
 * 牌面上**不绘制牌名文字**（牌名由外部组件渲染）。
 * 纯展示组件，无业务逻辑。
 */

export interface CardArtProps {
  motif: ArtMotif
  /** 0–360，映射到 240°–272° 的窄色带 */
  hue: number
  tier: CardArtSpec['tier']
  className?: string
}

/* ── 调色板 ─────────────────────────────────────────────────────────────── */

interface Palette {
  skyTop: string
  skyMid: string
  skyLow: string
  ground: string
  /** 地面最深处 */
  abyss: string
  stone: string
  lumen: string
}

/** 银与金为全牌组共享常量，不随 hue 变化 —— 它们是「同一副牌」的锚点 */
const LINE = 'oklch(0.87 0.022 248)'
const WARM = 'oklch(0.845 0.058 88)'

function makePalette(hue: number): Palette {
  const norm = (((hue % 360) + 360) % 360) / 360
  const h = 240 + norm * 32 // 240 – 272，窄带偏移
  return {
    skyTop: `oklch(0.195 0.038 ${h.toFixed(1)})`,
    skyMid: `oklch(0.295 0.050 ${(h + 6).toFixed(1)})`,
    skyLow: `oklch(0.395 0.048 ${(h + 12).toFixed(1)})`,
    ground: `oklch(0.165 0.028 ${(h - 6).toFixed(1)})`,
    abyss: `oklch(0.105 0.020 ${(h - 8).toFixed(1)})`,
    stone: `oklch(0.215 0.030 ${(h - 2).toFixed(1)})`,
    lumen: `oklch(0.935 0.020 ${(h + 4).toFixed(1)})`,
  }
}

/** 由 hue 派生的确定性伪随机（同一张牌每次渲染完全一致） */
function seededPoints(hue: number): Array<{ x: number; y: number; r: number }> {
  let s = (Math.round(hue) * 7919 + 104729) % 2147483647
  const next = () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
  return Array.from({ length: 6 }, (_, i) => {
    const rightBand = i % 2 === 1
    return {
      x: (rightBand ? 78 : 10) + next() * 30,
      y: 14 + next() * 44,
      r: 0.7 + next() * 0.7,
    }
  })
}

/* ── 共享图元 ───────────────────────────────────────────────────────────── */

/**
 * 地面。刻意**不用纯黑平涂** —— 平涂黑会让牌面变成「上下两块色」，
 * 立刻显廉价。改为：地平线处有一层大气霾光，向下逐渐吃进黑暗。
 */
function Ground({ uid, y = 132 }: { uid: string; y?: number }) {
  return (
    <>
      <rect x="0" y={y} width="120" height={200 - y} fill={`url(#${uid}-ground)`} />
      <rect x="0" y={y} width="120" height="14" fill={`url(#${uid}-haze)`} />
      <line x1="0" y1={y} x2="120" y2={y} stroke={LINE} strokeOpacity="0.26" strokeWidth="0.7" />
    </>
  )
}

/**
 * placeholder 层：星座的**简化版**（3 颗星 + 一段连线），比 signature 淡一档。
 *
 * 为什么必须有这一层：`hue` 只驱动配色，而配色被刻意压在 240°–272° 的窄带里，
 * 所以同一个 motif 的两张牌在颜色上几乎不可分辨。星点位置由 hue 派生，
 * 78 张牌有 56 个唯一 hue —— 这一层是让「这不是刚才那张牌」成立的主要依据。
 */
function PlaceholderMark({ hue }: { hue: number }) {
  const pts = seededPoints(hue).slice(0, 3)
  const chain = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')
  return (
    <g>
      <path d={chain} fill="none" stroke={LINE} strokeOpacity="0.11" strokeWidth="0.4" />
      <g fill={LINE}>
        {pts.map((q) => (
          <circle key={`${q.x}-${q.y}`} cx={q.x} cy={q.y} r={q.r * 0.85} fillOpacity="0.38" />
        ))}
      </g>
    </g>
  )
}

/** signature 层：星座 + 一道横贯的极淡长弧。构图语言与 placeholder 相同，只是更满一层。 */
function SignatureLayer({ hue }: { hue: number }) {
  const pts = seededPoints(hue)
  const left = pts.filter((_, i) => i % 2 === 0)
  const right = pts.filter((_, i) => i % 2 === 1)
  const chain = (g: typeof pts) => g.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')
  return (
    <g>
      <path
        d="M-10 66 Q60 6 130 66"
        fill="none"
        stroke={LINE}
        strokeOpacity="0.1"
        strokeWidth="0.6"
      />
      <path d={chain(left)} fill="none" stroke={LINE} strokeOpacity="0.16" strokeWidth="0.45" />
      <path d={chain(right)} fill="none" stroke={LINE} strokeOpacity="0.16" strokeWidth="0.45" />
      <g fill={LINE}>
        {pts.map((q) => (
          <circle key={`${q.x}-${q.y}`} cx={q.x} cy={q.y} r={q.r} fillOpacity="0.5" />
        ))}
      </g>
    </g>
  )
}

/* ── 12 种母题 ──────────────────────────────────────────────────────────── */

interface MotifCtx {
  p: Palette
  sig: boolean
  /** 供 mask / gradient 使用的唯一前缀 */
  uid: string
}

/** 通用：几何生成的直线射线 */
function rays(cx: number, cy: number, r0: number, r1: number, from: number, to: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = ((from + ((to - from) * i) / (count - 1)) * Math.PI) / 180
    return {
      key: i,
      x1: cx + r0 * Math.cos(a),
      y1: cy + r0 * Math.sin(a),
      x2: cx + r1 * Math.cos(a),
      y2: cy + r1 * Math.sin(a),
    }
  })
}

const MOTIFS: Record<ArtMotif, (c: MotifCtx) => ReactNode> = {
  /** 月：巨大的下弦月与水面倒影 */
  moon: ({ p, sig, uid }) => (
    <>
      <defs>
        <mask id={`${uid}-m`}>
          <rect x="0" y="0" width="120" height="200" fill="#000" />
          <circle cx="58" cy="74" r="27" fill="#fff" />
          <circle cx="70" cy="64" r="24.5" fill="#000" />
        </mask>
      </defs>
      <circle cx="58" cy="74" r="46" fill={`url(#${uid}-halo)`} />
      <rect x="28" y="44" width="60" height="60" fill={p.lumen} mask={`url(#${uid}-m)`} />
      {sig && (
        <circle
          cx="58"
          cy="74"
          r="36"
          fill="none"
          stroke={LINE}
          strokeOpacity="0.14"
          strokeWidth="0.6"
          strokeDasharray="2 7"
        />
      )}
      <Ground uid={uid} />
      <path d="M52 132 L64 132 L74 200 L44 200 Z" fill={`url(#${uid}-spill)`} />
    </>
  ),

  /** 星：一颗八芒主星，光池落在地面 */
  star: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="74" r="44" fill={`url(#${uid}-halo)`} />
      <path
        d="M60 32 L63.5 70.5 L102 74 L63.5 77.5 L60 116 L56.5 77.5 L18 74 L56.5 70.5 Z"
        fill={p.lumen}
        fillOpacity="0.9"
      />
      <path
        d="M60 50 L62.4 71.6 L84 74 L62.4 76.4 L60 98 L57.6 76.4 L36 74 L57.6 71.6 Z"
        fill={p.lumen}
        fillOpacity="0.4"
        transform="rotate(45 60 74)"
      />
      <circle cx="60" cy="74" r="4.2" fill={p.lumen} />
      <g fill={LINE} fillOpacity="0.45">
        <circle cx="26" cy="40" r="1.2" />
        <circle cx="96" cy="46" r="1" />
        <circle cx="88" cy="106" r="0.9" />
        <circle cx="30" cy="112" r="0.9" />
      </g>
      {sig && (
        <ellipse
          cx="60"
          cy="74"
          rx="40"
          ry="40"
          fill="none"
          stroke={LINE}
          strokeOpacity="0.12"
          strokeWidth="0.55"
        />
      )}
      <Ground uid={uid} />
      <ellipse cx="60" cy="132" rx="36" ry="7" fill={p.lumen} fillOpacity="0.1" />
    </>
  ),

  /** 日：一轮暖色圆盘半沉于地平线，短射线向上 */
  sun: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="132" r="52" fill={`url(#${uid}-warm)`} />
      <circle cx="60" cy="132" r="25" fill={WARM} fillOpacity="0.85" />
      <circle cx="60" cy="132" r="25" fill="none" stroke={p.lumen} strokeOpacity="0.35" strokeWidth="0.7" />
      <g stroke={WARM} strokeOpacity="0.5" strokeWidth="1.3" strokeLinecap="round">
        {rays(60, 132, 31, 42, -168, -12, 11).map((r) => (
          <line key={r.key} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      {sig && (
        <circle
          cx="60"
          cy="132"
          r="47"
          fill="none"
          stroke={WARM}
          strokeOpacity="0.2"
          strokeWidth="0.6"
          strokeDasharray="1.5 6"
        />
      )}
      <Ground uid={uid} />
      <ellipse cx="60" cy="132" rx="44" ry="5" fill={WARM} fillOpacity="0.18" />
    </>
  ),

  /** 门：一道独立的拱门，拱内透出光（与 threshold 的方形门洞刻意区分） */
  gate: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} />
      {/* 拱内的光 */}
      <path d="M42 132 V80 A18 18 0 0 1 78 80 V132 Z" fill={`url(#${uid}-shaft)`} />
      {sig && (
        <>
          <circle cx="60" cy="86" r="3" fill={p.lumen} fillOpacity="0.85" />
          <circle cx="60" cy="86" r="10" fill="none" stroke={p.lumen} strokeOpacity="0.18" strokeWidth="0.6" />
        </>
      )}
      {/* 拱身：两腿 + 半圆拱，一条连续轮廓 */}
      <path
        d="M31 132 V80 A29 29 0 0 1 89 80 V132 H78 V80 A18 18 0 0 0 42 80 V132 Z"
        fill={p.stone}
        stroke={LINE}
        strokeOpacity="0.3"
        strokeWidth="0.8"
      />
      {/* 拱心石 */}
      <path d="M56.5 50 H63.5 L62 57 H58 Z" fill={p.stone} stroke={LINE} strokeOpacity="0.32" strokeWidth="0.6" />
      <ellipse cx="60" cy="132" rx="27" ry="5.5" fill={p.lumen} fillOpacity="0.13" />
    </>
  ),

  /** 路：透视收束至地平线上的一点 */
  path: ({ p, sig, uid }) => (
    <>
      <g fill={LINE} fillOpacity="0.4">
        <circle cx="28" cy="44" r="1.1" />
        <circle cx="92" cy="34" r="0.9" />
        <circle cx="72" cy="66" r="0.8" />
      </g>
      <Ground uid={uid} />
      <path d="M18 200 L57 132 L63 132 L102 200 Z" fill={p.stone} fillOpacity="0.55" />
      <g stroke={LINE} strokeOpacity="0.42" strokeWidth="1.1">
        <line x1="18" y1="200" x2="57" y2="132" />
        <line x1="102" y1="200" x2="63" y2="132" />
      </g>
      <g stroke={LINE} strokeOpacity="0.2" strokeWidth="0.7">
        <line x1="25.4" y1="190" x2="94.6" y2="190" />
        <line x1="35.2" y1="172" x2="84.8" y2="172" />
        <line x1="43.9" y1="156" x2="76.1" y2="156" />
        <line x1="51.6" y1="142" x2="68.4" y2="142" />
      </g>
      {sig && <path d="M14 176 Q40 160 55 140" fill="none" stroke={LINE} strokeOpacity="0.16" strokeWidth="0.7" />}
      <circle cx="60" cy="128" r="3.4" fill={p.lumen} fillOpacity="0.9" />
      <circle cx="60" cy="128" r="11" fill="none" stroke={p.lumen} strokeOpacity="0.16" strokeWidth="0.6" />
    </>
  ),

  /** 镜：以水平轴为界的对称与倒影 */
  mirror: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="56" r="8" fill={p.lumen} fillOpacity="0.85" />
      <path d="M28 124 L60 76 L92 124 Z" fill={p.stone} stroke={LINE} strokeOpacity="0.3" strokeWidth="0.8" />
      <Ground uid={uid} y={124} />
      <path d="M28 124 L60 172 L92 124 Z" fill={p.lumen} fillOpacity="0.09" />
      <circle cx="60" cy="192" r="8" fill={p.lumen} fillOpacity="0.14" />
      {sig && (
        <g stroke={LINE} strokeOpacity="0.18" strokeWidth="0.5">
          <line x1="60" y1="30" x2="60" y2="70" />
          <line x1="60" y1="178" x2="60" y2="200" />
        </g>
      )}
      <line x1="10" y1="124" x2="110" y2="124" stroke={p.lumen} strokeOpacity="0.3" strokeWidth="0.6" />
    </>
  ),

  /** 轨：一个核心与三条倾斜的椭圆轨道 */
  orbit: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="92" r="34" fill={`url(#${uid}-halo)`} />
      <g fill="none" stroke={LINE} strokeWidth="0.9">
        <ellipse cx="60" cy="92" rx="44" ry="16" strokeOpacity="0.3" transform="rotate(-20 60 92)" />
        <ellipse cx="60" cy="92" rx="34" ry="11" strokeOpacity="0.22" transform="rotate(28 60 92)" />
        <ellipse cx="60" cy="92" rx="23" ry="8" strokeOpacity="0.16" transform="rotate(-62 60 92)" />
        {sig && (
          <ellipse
            cx="60"
            cy="92"
            rx="52"
            ry="20"
            strokeOpacity="0.12"
            strokeWidth="0.6"
            strokeDasharray="2 6"
            transform="rotate(8 60 92)"
          />
        )}
      </g>
      <circle cx="60" cy="92" r="7.5" fill={p.lumen} fillOpacity="0.92" />
      <circle cx="97" cy="79" r="2.4" fill={p.lumen} fillOpacity="0.8" />
      <circle cx="31" cy="103" r="1.7" fill={p.lumen} fillOpacity="0.55" />
      {sig && <circle cx="76" cy="63" r="1.4" fill={WARM} fillOpacity="0.7" />}
      <Ground uid={uid} />
    </>
  ),

  /** 幕：层叠的雾带遮住背后的光 */
  veil: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="62" r="42" fill={`url(#${uid}-halo)`} />
      <circle cx="60" cy="62" r="19" fill={p.lumen} fillOpacity="0.55" />
      {sig && <circle cx="30" cy="36" r="1.3" fill={LINE} fillOpacity="0.4" />}
      <Ground uid={uid} />
      <g fill="none" stroke={p.lumen} strokeLinecap="round">
        <path d="M-6 52 Q30 44 60 52 T126 52" strokeWidth="7" strokeOpacity="0.1" />
        <path d="M-6 74 Q30 84 60 74 T126 74" strokeWidth="10" strokeOpacity="0.14" />
        <path d="M-6 98 Q30 88 60 98 T126 98" strokeWidth="12" strokeOpacity="0.13" />
        <path d="M-6 122 Q30 132 60 122 T126 122" strokeWidth="14" strokeOpacity="0.11" />
        <path d="M-6 150 Q30 140 60 150 T126 150" strokeWidth="16" strokeOpacity="0.08" />
        {sig && (
          <>
            <path d="M-6 62 Q30 70 60 62 T126 62" strokeWidth="3" strokeOpacity="0.1" />
            <path d="M-6 136 Q30 128 60 136 T126 136" strokeWidth="3" strokeOpacity="0.08" />
          </>
        )}
      </g>
    </>
  ),

  /** 种：地平线上的种子、向上的生长弧与向下的根 */
  seed: ({ p, sig, uid }) => (
    <>
      <g fill="none" stroke={LINE}>
        <path d="M30 124 Q60 56 90 124" strokeOpacity="0.13" strokeWidth="0.8" />
        <path d="M37 124 Q60 74 83 124" strokeOpacity="0.2" strokeWidth="0.8" />
        <path d="M44 124 Q60 92 76 124" strokeOpacity="0.28" strokeWidth="0.8" />
      </g>
      <line x1="60" y1="120" x2="60" y2="64" stroke={p.lumen} strokeOpacity="0.35" strokeWidth="0.9" />
      <circle cx="60" cy="64" r="2.6" fill={p.lumen} fillOpacity="0.85" />
      {sig && (
        <>
          <circle cx="60" cy="88" r="1.4" fill={p.lumen} fillOpacity="0.5" />
          <circle cx="60" cy="64" r="8" fill="none" stroke={p.lumen} strokeOpacity="0.18" strokeWidth="0.6" />
        </>
      )}
      <Ground uid={uid} />
      <ellipse cx="60" cy="130" rx="7.5" ry="9" fill={p.lumen} fillOpacity="0.8" />
      <g fill="none" stroke={LINE} strokeOpacity="0.22" strokeWidth="0.7">
        <path d="M60 139 Q52 152 44 168" />
        <path d="M60 139 Q68 152 76 168" />
        <path d="M60 139 L60 174" />
      </g>
    </>
  ),

  /** 潮：层叠的水波，天上一枚小月 */
  tide: ({ p, sig, uid }) => (
    <>
      <defs>
        <mask id={`${uid}-m`}>
          <rect x="0" y="0" width="120" height="200" fill="#000" />
          <circle cx="60" cy="44" r="12" fill="#fff" />
          <circle cx="66" cy="39" r="11" fill="#000" />
        </mask>
      </defs>
      <circle cx="60" cy="44" r="26" fill={`url(#${uid}-halo)`} />
      <rect x="44" y="28" width="32" height="32" fill={p.lumen} mask={`url(#${uid}-m)`} />
      {sig && (
        <g fill={LINE} fillOpacity="0.4">
          <circle cx="26" cy="70" r="1" />
          <circle cx="94" cy="62" r="0.9" />
        </g>
      )}
      <path d="M0 108 Q30 98 60 108 T120 108 L120 200 L0 200 Z" fill={p.ground} fillOpacity="0.55" />
      <path d="M0 108 Q30 98 60 108 T120 108" fill="none" stroke={p.lumen} strokeOpacity="0.22" strokeWidth="0.7" />
      <path d="M0 132 Q30 142 60 132 T120 132 L120 200 L0 200 Z" fill={p.ground} fillOpacity="0.75" />
      <path d="M0 132 Q30 142 60 132 T120 132" fill="none" stroke={p.lumen} strokeOpacity="0.18" strokeWidth="0.7" />
      <path d="M0 158 Q30 148 60 158 T120 158 L120 200 L0 200 Z" fill={p.ground} fillOpacity="0.9" />
      <path d="M0 158 Q30 148 60 158 T120 158" fill="none" stroke={p.lumen} strokeOpacity="0.14" strokeWidth="0.7" />
      <path d="M0 180 Q30 190 60 180 T120 180 L120 200 L0 200 Z" fill={p.ground} />
    </>
  ),

  /** 焰：一簇有内核的火焰 */
  flame: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} />
      <circle cx="60" cy="102" r="40" fill={`url(#${uid}-warm)`} />
      <path
        d="M60 52 C75 78 81 97 81 111 C81 127 71 136 60 136 C49 136 39 127 39 111 C39 97 45 78 60 52 Z"
        fill={WARM}
        fillOpacity="0.28"
        stroke={WARM}
        strokeOpacity="0.5"
        strokeWidth="0.9"
      />
      <path
        d="M60 78 C68 94 71.5 105 71.5 113 C71.5 123 66 129 60 129 C54 129 48.5 123 48.5 113 C48.5 105 52 94 60 78 Z"
        fill={WARM}
        fillOpacity="0.55"
      />
      <path
        d="M60 100 C63 108 64.2 113 64.2 117 C64.2 123 62.4 126.5 60 126.5 C57.6 126.5 55.8 123 55.8 117 C55.8 113 57 108 60 100 Z"
        fill={p.lumen}
        fillOpacity="0.9"
      />
      {sig && (
        <g fill={WARM} fillOpacity="0.5">
          <circle cx="48" cy="60" r="1.4" />
          <circle cx="73" cy="48" r="1.1" />
          <circle cx="62" cy="34" r="0.9" />
        </g>
      )}
      <ellipse cx="60" cy="136" rx="24" ry="4.5" fill={WARM} fillOpacity="0.18" />
    </>
  ),

  /** 阈：一堵墙、一道门洞，光溢到地面 */
  threshold: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} />
      <path d="M46 132 L74 132 L94 200 L26 200 Z" fill={`url(#${uid}-spill)`} />
      <rect x="12" y="42" width="96" height="6" rx="1.5" fill={p.stone} stroke={LINE} strokeOpacity="0.28" strokeWidth="0.7" />
      <path
        d="M15 48 H105 V132 H74 V64 H46 V132 H15 Z"
        fill={p.stone}
        stroke={LINE}
        strokeOpacity="0.26"
        strokeWidth="0.7"
      />
      <rect x="46" y="64" width="28" height="68" fill={`url(#${uid}-shaft)`} />
      <path d="M46 132 V64 H74 V132" fill="none" stroke={LINE} strokeOpacity="0.34" strokeWidth="0.9" />
      {sig && (
        <>
          <circle cx="60" cy="28" r="1.6" fill={LINE} fillOpacity="0.5" />
          <path d="M46 64 Q60 52 74 64" fill="none" stroke={LINE} strokeOpacity="0.2" strokeWidth="0.7" />
        </>
      )}
    </>
  ),
}

/* ── 组件 ───────────────────────────────────────────────────────────────── */

export function CardArt({ motif, hue, tier, className = '' }: CardArtProps) {
  const uid = useId().replace(/:/g, '')
  const p = makePalette(hue)
  const sig = tier === 'signature'
  const render = MOTIFS[motif]

  return (
    <svg
      viewBox="0 0 120 200"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      focusable="false"
      className={`block h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="0.55" stopColor={p.skyMid} />
          <stop offset="1" stopColor={p.skyLow} />
        </linearGradient>
        <radialGradient id={`${uid}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.lumen} stopOpacity="0.3" />
          <stop offset="0.5" stopColor={p.lumen} stopOpacity="0.09" />
          <stop offset="1" stopColor={p.lumen} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-warm`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={WARM} stopOpacity="0.34" />
          <stop offset="0.5" stopColor={WARM} stopOpacity="0.1" />
          <stop offset="1" stopColor={WARM} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.stone} stopOpacity="0.9" />
          <stop offset="0.32" stopColor={p.ground} />
          <stop offset="1" stopColor={p.abyss} />
        </linearGradient>
        <linearGradient id={`${uid}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.lumen} stopOpacity="0.11" />
          <stop offset="1" stopColor={p.lumen} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-shaft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.lumen} stopOpacity="0.28" />
          <stop offset="1" stopColor={p.lumen} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${uid}-spill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.lumen} stopOpacity="0.18" />
          <stop offset="1" stopColor={p.lumen} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.46" r="0.72">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.34" />
        </radialGradient>
      </defs>

      {/* 夜空底 */}
      <rect x="0" y="0" width="120" height="200" fill={`url(#${uid}-sky)`} />

      {/* 星象层：signature 更满一层，placeholder 也必须有，否则同 motif 的牌互相无法区分 */}
      {sig ? <SignatureLayer hue={hue} /> : <PlaceholderMark hue={hue} />}

      {/* 母题构图 */}
      {render({ p, sig, uid })}

      {/* 暗角：把视线收回中心，也让 78 张牌的边缘统一 */}
      <rect x="0" y="0" width="120" height="200" fill={`url(#${uid}-vig)`} />

      {/* 内框发丝线：与 CardBack 同一装帧语言 */}
      <rect
        x="4.5"
        y="4.5"
        width="111"
        height="191"
        rx="6"
        fill="none"
        stroke={LINE}
        strokeOpacity="0.16"
        strokeWidth="0.6"
      />
    </svg>
  )
}

export default CardArt
