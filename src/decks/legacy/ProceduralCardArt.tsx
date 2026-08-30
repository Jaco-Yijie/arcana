import { useId } from 'react'
import type { ReactNode } from 'react'
import type { ArtMotif, LegacyArtSpec } from './proceduralArt'
import { getArtProfile } from './artProfiles'
import type { DeckArtProfile } from './artProfiles'
import type { DeckId } from '../ids'

/**
 * ProceduralCardArt — legacy 牌组的程序化牌面
 *
 * ══════════════════════════════════════════════════════════════
 * 【它只服务 legacy 牌组，artwork 牌组永远拿不到它】
 *
 * 这就是 V2.4「五套牌组共用同一张牌面」的那个组件。
 * 它被保留下来只有一个理由：让现有用户的抽牌流程与历史日记不断。
 *
 * 五套 artwork 牌组**绝不允许**回退到这里 —— 那正是
 * 「用程序化占位图冒充最终牌面」，是本次改造明确禁止的四件事之一。
 * resolveCardArtwork 在结构上保证了这一点：procedural 分支只在
 * isLegacyDeck(deckId) 为真时返回。
 *
 * Phase 3（五套 78/78 全部就绪）之后，本文件与 legacy 牌组一并退役。
 * ══════════════════════════════════════════════════════════════
 *
 * 牌面由 SVG 程序化生成：
 * - `motif` 决定构图母题（26 种，每种在 64px 宽下仍可辨识）
 * - `hue`   只在 240°–272° 的窄色带内做**轻微**偏移 —— 保证 78 张仍像同一副牌
 * - `tier`  signature 比 placeholder 多一层细节（星座 + 长弧 + 母题小配件），
 *           但两者共用完全相同的视觉语言：夜空渐变 / 地平线 / 银色发丝线 / 单一光源
 *
 * 牌面上**不绘制牌名文字**（牌名由外部组件渲染）。
 * 纯展示组件，无业务逻辑。
 */

export interface ProceduralCardArtProps {
  /**
   * 本次渲染归属的牌组。
   *
   * ★ 这是 Phase C0 的核心改动。在此之前本组件只收 motif/hue/tier ——
   * deckId 在 `LEGACY_CARD_ART[cardId]` 那一步就被丢掉了，
   * 五套 legacy 牌因此渲染出逐像素相同的牌面。
   * 现在它决定卡面明度极性、线条性格、材质与光源，即
   * **换牌组是真的换了一副牌的画法**，不是换个滤镜。
   */
  deckId: DeckId
  motif: ArtMotif
  /** 0–360，在该牌组档案的 baseHue ± hueSpread 内做窄带偏移 */
  hue: number
  tier: LegacyArtSpec['tier']
  className?: string
}

/* ── 调色板 ─────────────────────────────────────────────────────────────── */

interface Palette {
  skyTop: string
  skyMid: string
  skyLow: string
  ground: string
  /** 地面最深处（浅色牌里它反而是最深的墨） */
  abyss: string
  stone: string
  /** 发光体 / 高光。深色牌里是冷白，浅色牌里是暖金 */
  lumen: string
  /** 线条与实体的颜色。深色牌里是银，浅色牌里是深棕刻线 */
  ink: string
  /** 暖色强调 */
  warm: string
}

/**
 * 由牌组档案 + 单张牌的 hue 生成调色板。
 *
 * 【极性翻转是结构性的，不是取反色】
 * `light` 极性下天地关系整个倒过来：天空是象牙纸（L 0.86），
 * 地面是压在纸上的深棕，线条是刻进去的墨，光是暖金晕染。
 * `dark` 极性下天空是夜（L 0.17–0.34），地面更深，线是银色发丝，光是冷白。
 * 两者不是同一组数字的加减，所以下面分两支写。
 */
function makePalette(profile: DeckArtProfile, hue: number): Palette {
  const norm = (((hue % 360) + 360) % 360) / 360
  /* 在 baseHue ± hueSpread/2 的窄带内偏移 —— 窄带保证 78 张仍像同一副牌 */
  const h = profile.baseHue - profile.hueSpread / 2 + norm * profile.hueSpread
  const c = profile.chroma
  const L = profile.groundValue
  const hh = (d: number) => (((h + d) % 360) + 360).toFixed(1)

  if (profile.polarity === 'light') {
    /* 纸面：天空最浅，越往下越暖越深；实体是压在纸上的深棕 */
    return {
      skyTop: `oklch(${L.toFixed(3)} ${c.toFixed(3)} ${hh(0)})`,
      skyMid: `oklch(${(L - 0.05).toFixed(3)} ${(c * 1.2).toFixed(3)} ${hh(-4)})`,
      skyLow: `oklch(${(L - 0.12).toFixed(3)} ${(c * 1.4).toFixed(3)} ${hh(-8)})`,
      ground: `oklch(${(L - 0.34).toFixed(3)} ${(c * 1.6).toFixed(3)} ${hh(-14)})`,
      abyss: `oklch(${(L - 0.52).toFixed(3)} ${(c * 1.3).toFixed(3)} ${hh(-18)})`,
      stone: `oklch(${(L - 0.26).toFixed(3)} ${(c * 1.5).toFixed(3)} ${hh(-10)})`,
      lumen: `oklch(${(L + 0.09).toFixed(3)} ${(c * 2.2).toFixed(3)} ${hh(6)})`,
      ink: `oklch(${(L - 0.6).toFixed(3)} ${(c * 1.1).toFixed(3)} ${hh(-16)})`,
      warm: `oklch(${(L - 0.3).toFixed(3)} ${(c * 3).toFixed(3)} ${hh(2)})`,
    }
  }

  /* 夜空：天空由深到略浅，地面吃进黑暗，线是银 */
  return {
    skyTop: `oklch(${(L - 0.05).toFixed(3)} ${c.toFixed(3)} ${hh(0)})`,
    skyMid: `oklch(${(L + 0.06).toFixed(3)} ${(c * 1.2).toFixed(3)} ${hh(6)})`,
    skyLow: `oklch(${(L + 0.14).toFixed(3)} ${(c * 1.15).toFixed(3)} ${hh(12)})`,
    ground: `oklch(${Math.max(0.05, L - 0.08).toFixed(3)} ${(c * 0.7).toFixed(3)} ${hh(-6)})`,
    abyss: `oklch(${Math.max(0.03, L - 0.14).toFixed(3)} ${(c * 0.5).toFixed(3)} ${hh(-8)})`,
    stone: `oklch(${Math.max(0.06, L - 0.03).toFixed(3)} ${(c * 0.8).toFixed(3)} ${hh(-2)})`,
    lumen: `oklch(${Math.min(0.97, L + 0.6).toFixed(3)} ${(c * 0.5).toFixed(3)} ${hh(4)})`,
    ink: `oklch(${Math.min(0.95, L + 0.54).toFixed(3)} ${(c * 0.55).toFixed(3)} ${hh(2)})`,
    warm: `oklch(${Math.min(0.92, L + 0.5).toFixed(3)} ${(c * 1.4).toFixed(3)} 88)`,
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
function Ground({ uid, p, y = 132 }: { uid: string; p: Palette; y?: number }) {
  return (
    <>
      <rect x="0" y={y} width="120" height={200 - y} fill={`url(#${uid}-ground)`} />
      <rect x="0" y={y} width="120" height="14" fill={`url(#${uid}-haze)`} />
      <line x1="0" y1={y} x2="120" y2={y} stroke={p.ink} strokeOpacity="0.26" strokeWidth="0.7" />
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
function PlaceholderMark({ hue, p }: { hue: number; p: Palette }) {
  const pts = seededPoints(hue).slice(0, 3)
  const chain = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')
  return (
    <g>
      <path d={chain} fill="none" stroke={p.ink} strokeOpacity="0.11" strokeWidth="0.4" />
      <g fill={p.ink}>
        {pts.map((q) => (
          <circle key={`${q.x}-${q.y}`} cx={q.x} cy={q.y} r={q.r * 0.85} fillOpacity="0.38" />
        ))}
      </g>
    </g>
  )
}

/** signature 层：星座 + 一道横贯的极淡长弧。构图语言与 placeholder 相同，只是更满一层。 */
function SignatureLayer({ hue, p }: { hue: number; p: Palette }) {
  const pts = seededPoints(hue)
  const left = pts.filter((_, i) => i % 2 === 0)
  const right = pts.filter((_, i) => i % 2 === 1)
  const chain = (g: typeof pts) => g.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ')
  return (
    <g>
      <path
        d="M-10 66 Q60 6 130 66"
        fill="none"
        stroke={p.ink}
        strokeOpacity="0.1"
        strokeWidth="0.6"
      />
      <path d={chain(left)} fill="none" stroke={p.ink} strokeOpacity="0.16" strokeWidth="0.45" />
      <path d={chain(right)} fill="none" stroke={p.ink} strokeOpacity="0.16" strokeWidth="0.45" />
      <g fill={p.ink}>
        {pts.map((q) => (
          <circle key={`${q.x}-${q.y}`} cx={q.x} cy={q.y} r={q.r} fillOpacity="0.5" />
        ))}
      </g>
    </g>
  )
}

/* ── 26 种母题 ──────────────────────────────────────────────────────────── */

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
          stroke={p.ink}
          strokeOpacity="0.14"
          strokeWidth="0.6"
          strokeDasharray="2 7"
        />
      )}
      <Ground uid={uid} p={p} />
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
      <g fill={p.ink} fillOpacity="0.45">
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
          stroke={p.ink}
          strokeOpacity="0.12"
          strokeWidth="0.55"
        />
      )}
      <Ground uid={uid} p={p} />
      <ellipse cx="60" cy="132" rx="36" ry="7" fill={p.lumen} fillOpacity="0.1" />
    </>
  ),

  /** 日：一轮暖色圆盘半沉于地平线，短射线向上 */
  sun: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="132" r="52" fill={`url(#${uid}-warm)`} />
      <circle cx="60" cy="132" r="25" fill={p.warm} fillOpacity="0.85" />
      <circle cx="60" cy="132" r="25" fill="none" stroke={p.lumen} strokeOpacity="0.35" strokeWidth="0.7" />
      <g stroke={p.warm} strokeOpacity="0.5" strokeWidth="1.3" strokeLinecap="round">
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
          stroke={p.warm}
          strokeOpacity="0.2"
          strokeWidth="0.6"
          strokeDasharray="1.5 6"
        />
      )}
      <Ground uid={uid} p={p} />
      <ellipse cx="60" cy="132" rx="44" ry="5" fill={p.warm} fillOpacity="0.18" />
    </>
  ),

  /**
   * 门：**开阔天空下一道独立的拱**，只有细轮廓，没有地面也没有实心墙体。
   *
   * 【为什么要和 threshold 拉开】
   * 旧版 gate 是「地面 + 实心石拱 + 拱内透光」，threshold 是「地面 + 实心墙 + 方形门洞透光」。
   * 两者都是「暗色实块上开一个透光的口，下面有地」——
   * 在 64px 缩略图上读起来是同一张牌。
   * 现在 gate 悬在空中、只有线；threshold 是压在地上的实体墙。构图前提就不同了。
   */
  gate: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="86" r="48" fill={`url(#${uid}-halo)`} />
      {/* 拱：只有一条细轮廓线，内部是空的 */}
      <path
        d="M30 158 V84 A30 30 0 0 1 90 84 V158"
        fill="none"
        stroke={p.ink}
        strokeOpacity="0.5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M41 158 V84 A19 19 0 0 1 79 84 V158"
        fill="none"
        stroke={p.ink}
        strokeOpacity="0.22"
        strokeWidth="0.8"
      />
      {/* 拱下方悬着的一点光，不落在任何地面上 */}
      <circle cx="60" cy="104" r="3.2" fill={p.lumen} fillOpacity="0.9" />
      {sig && (
        <>
          <circle cx="60" cy="104" r="13" fill="none" stroke={p.lumen} strokeOpacity="0.16" strokeWidth="0.6" />
          <path d="M56 66 H64" stroke={p.ink} strokeOpacity="0.34" strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
    </>
  ),

  /** 路：透视收束至地平线上的一点 */
  path: ({ p, sig, uid }) => (
    <>
      <g fill={p.ink} fillOpacity="0.4">
        <circle cx="28" cy="44" r="1.1" />
        <circle cx="92" cy="34" r="0.9" />
        <circle cx="72" cy="66" r="0.8" />
      </g>
      <Ground uid={uid} p={p} />
      <path d="M18 200 L57 132 L63 132 L102 200 Z" fill={p.stone} fillOpacity="0.55" />
      <g stroke={p.ink} strokeOpacity="0.42" strokeWidth="1.1">
        <line x1="18" y1="200" x2="57" y2="132" />
        <line x1="102" y1="200" x2="63" y2="132" />
      </g>
      <g stroke={p.ink} strokeOpacity="0.2" strokeWidth="0.7">
        <line x1="25.4" y1="190" x2="94.6" y2="190" />
        <line x1="35.2" y1="172" x2="84.8" y2="172" />
        <line x1="43.9" y1="156" x2="76.1" y2="156" />
        <line x1="51.6" y1="142" x2="68.4" y2="142" />
      </g>
      {sig && <path d="M14 176 Q40 160 55 140" fill="none" stroke={p.ink} strokeOpacity="0.16" strokeWidth="0.7" />}
      <circle cx="60" cy="128" r="3.4" fill={p.lumen} fillOpacity="0.9" />
      <circle cx="60" cy="128" r="11" fill="none" stroke={p.lumen} strokeOpacity="0.16" strokeWidth="0.6" />
    </>
  ),

  /** 镜：以水平轴为界的对称与倒影 */
  mirror: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="56" r="8" fill={p.lumen} fillOpacity="0.85" />
      <path d="M28 124 L60 76 L92 124 Z" fill={p.stone} stroke={p.ink} strokeOpacity="0.3" strokeWidth="0.8" />
      <Ground uid={uid} p={p} y={124} />
      <path d="M28 124 L60 172 L92 124 Z" fill={p.lumen} fillOpacity="0.09" />
      <circle cx="60" cy="192" r="8" fill={p.lumen} fillOpacity="0.14" />
      {sig && (
        <g stroke={p.ink} strokeOpacity="0.18" strokeWidth="0.5">
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
      <g fill="none" stroke={p.ink} strokeWidth="0.9">
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
      {sig && <circle cx="76" cy="63" r="1.4" fill={p.warm} fillOpacity="0.7" />}
      <Ground uid={uid} p={p} />
    </>
  ),

  /** 幕：层叠的雾带遮住背后的光 */
  veil: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="62" r="42" fill={`url(#${uid}-halo)`} />
      <circle cx="60" cy="62" r="19" fill={p.lumen} fillOpacity="0.55" />
      {sig && <circle cx="30" cy="36" r="1.3" fill={p.ink} fillOpacity="0.4" />}
      <Ground uid={uid} p={p} />
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
      <g fill="none" stroke={p.ink}>
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
      <Ground uid={uid} p={p} />
      <ellipse cx="60" cy="130" rx="7.5" ry="9" fill={p.lumen} fillOpacity="0.8" />
      <g fill="none" stroke={p.ink} strokeOpacity="0.22" strokeWidth="0.7">
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
        <g fill={p.ink} fillOpacity="0.4">
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
      <Ground uid={uid} p={p} />
      <circle cx="60" cy="102" r="40" fill={`url(#${uid}-warm)`} />
      <path
        d="M60 52 C75 78 81 97 81 111 C81 127 71 136 60 136 C49 136 39 127 39 111 C39 97 45 78 60 52 Z"
        fill={p.warm}
        fillOpacity="0.28"
        stroke={p.warm}
        strokeOpacity="0.5"
        strokeWidth="0.9"
      />
      <path
        d="M60 78 C68 94 71.5 105 71.5 113 C71.5 123 66 129 60 129 C54 129 48.5 123 48.5 113 C48.5 105 52 94 60 78 Z"
        fill={p.warm}
        fillOpacity="0.55"
      />
      <path
        d="M60 100 C63 108 64.2 113 64.2 117 C64.2 123 62.4 126.5 60 126.5 C57.6 126.5 55.8 123 55.8 117 C55.8 113 57 108 60 100 Z"
        fill={p.lumen}
        fillOpacity="0.9"
      />
      {sig && (
        <g fill={p.warm} fillOpacity="0.5">
          <circle cx="48" cy="60" r="1.4" />
          <circle cx="73" cy="48" r="1.1" />
          <circle cx="62" cy="34" r="0.9" />
        </g>
      )}
      <ellipse cx="60" cy="136" rx="24" ry="4.5" fill={p.warm} fillOpacity="0.18" />
    </>
  ),

  /** 柱：一对界柱，中间是知与未知的交界。女祭司那条线 */
  pillar: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <rect x="46" y="56" width="28" height="76" fill={`url(#${uid}-shaft)`} />
      {[34, 78].map((x) => (
        <g key={x}>
          <rect x={x} y="52" width="8" height="80" fill={p.stone} stroke={p.ink} strokeOpacity="0.32" strokeWidth="0.7" />
          <rect x={x - 2.5} y="46" width="13" height="7" rx="1" fill={p.stone} stroke={p.ink} strokeOpacity="0.28" strokeWidth="0.6" />
          <rect x={x - 2.5} y="128" width="13" height="6" rx="1" fill={p.stone} stroke={p.ink} strokeOpacity="0.28" strokeWidth="0.6" />
        </g>
      ))}
      {sig && <circle cx="60" cy="40" r="3" fill={p.lumen} fillOpacity="0.8" />}
      <ellipse cx="60" cy="132" rx="30" ry="5" fill={p.lumen} fillOpacity="0.1" />
    </>
  ),

  /** 阶：向上收束的台阶。过程、递进 */
  stair: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      {[0, 1, 2, 3, 4].map((i) => {
        const w = 76 - i * 12
        const y = 132 - i * 15
        return (
          <rect
            key={i}
            x={60 - w / 2}
            y={y - 15}
            width={w}
            height="15"
            fill={p.stone}
            fillOpacity={0.5 + i * 0.09}
            stroke={p.ink}
            strokeOpacity="0.26"
            strokeWidth="0.6"
          />
        )
      })}
      <circle cx="60" cy="48" r="3.4" fill={p.lumen} fillOpacity="0.9" />
      {sig && <circle cx="60" cy="48" r="12" fill="none" stroke={p.lumen} strokeOpacity="0.16" strokeWidth="0.6" />}
    </>
  ),

  /** 塔：一座细高的塔，顶上有光。突变发生在最高处 */
  tower: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <path d="M48 132 L50 44 L70 44 L72 132 Z" fill={p.stone} stroke={p.ink} strokeOpacity="0.3" strokeWidth="0.8" />
      <path d="M46 44 L60 30 L74 44 Z" fill={p.stone} stroke={p.ink} strokeOpacity="0.32" strokeWidth="0.7" />
      <rect x="56" y="62" width="8" height="12" rx="4" fill={`url(#${uid}-shaft)`} />
      <rect x="56" y="90" width="8" height="12" rx="4" fill={`url(#${uid}-shaft)`} />
      {sig && (
        <g stroke={p.ink} strokeOpacity="0.2" strokeWidth="0.6">
          <line x1="50" y1="76" x2="70" y2="76" />
          <line x1="49" y1="104" x2="71" y2="104" />
        </g>
      )}
      <circle cx="60" cy="26" r="2.8" fill={p.lumen} fillOpacity="0.9" />
      <ellipse cx="60" cy="132" rx="24" ry="4.5" fill={p.lumen} fillOpacity="0.1" />
    </>
  ),

  /** 环：一个完整闭合的圆。收束、完成 */
  circle: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="86" r="40" fill={`url(#${uid}-halo)`} />
      <circle cx="60" cy="86" r="33" fill="none" stroke={p.ink} strokeOpacity="0.42" strokeWidth="1.4" />
      <circle cx="60" cy="86" r="26" fill="none" stroke={p.ink} strokeOpacity="0.2" strokeWidth="0.7" />
      {sig && (
        <circle cx="60" cy="86" r="40" fill="none" stroke={p.ink} strokeOpacity="0.14" strokeWidth="0.6" strokeDasharray="2 6" />
      )}
      <circle cx="60" cy="86" r="4" fill={p.lumen} fillOpacity="0.9" />
      <Ground uid={uid} p={p} />
    </>
  ),

  /** 裂：一道竖直的分界把画面切成两半。取舍 */
  split: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <path d="M0 132 L54 132 L48 0 L0 0 Z" fill={p.stone} fillOpacity="0.34" />
      <path d="M120 132 L66 132 L72 0 L120 0 Z" fill={p.stone} fillOpacity="0.2" />
      <path d="M54 132 L48 0 L72 0 L66 132 Z" fill={`url(#${uid}-shaft)`} />
      <g stroke={p.ink} strokeOpacity="0.4" strokeWidth="1">
        <line x1="54" y1="132" x2="48" y2="0" />
        <line x1="66" y1="132" x2="72" y2="0" />
      </g>
      {sig && <circle cx="60" cy="152" r="3" fill={p.lumen} fillOpacity="0.7" />}
      <ellipse cx="60" cy="132" rx="18" ry="4" fill={p.lumen} fillOpacity="0.14" />
    </>
  ),

  /** 平线：只有一条水平分界。最安静的一个母题 */
  horizon: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="132" r="46" fill={`url(#${uid}-halo)`} />
      <Ground uid={uid} p={p} />
      <g stroke={p.ink} fill="none">
        <line x1="-4" y1="112" x2="124" y2="112" strokeOpacity="0.12" strokeWidth="0.6" />
        <line x1="-4" y1="122" x2="124" y2="122" strokeOpacity="0.2" strokeWidth="0.7" />
        <line x1="-4" y1="146" x2="124" y2="146" strokeOpacity="0.16" strokeWidth="0.7" />
        <line x1="-4" y1="160" x2="124" y2="160" strokeOpacity="0.1" strokeWidth="0.6" />
      </g>
      {sig && <circle cx="60" cy="132" r="5" fill={p.lumen} fillOpacity="0.75" />}
    </>
  ),

  /** 枝：一根向上分叉的枝。生长、可能性 */
  branch: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <g fill="none" stroke={p.ink} strokeLinecap="round">
        <path d="M60 134 L60 74" strokeOpacity="0.5" strokeWidth="2.2" />
        <path d="M60 108 Q46 98 40 80" strokeOpacity="0.4" strokeWidth="1.5" />
        <path d="M60 96 Q74 86 80 68" strokeOpacity="0.4" strokeWidth="1.5" />
        <path d="M60 84 Q52 74 48 60" strokeOpacity="0.3" strokeWidth="1.1" />
        {sig && <path d="M60 78 Q68 68 72 54" strokeOpacity="0.3" strokeWidth="1.1" />}
      </g>
      <g fill={p.lumen}>
        <circle cx="40" cy="80" r="2" fillOpacity="0.7" />
        <circle cx="80" cy="68" r="2.2" fillOpacity="0.8" />
        <circle cx="48" cy="60" r="1.6" fillOpacity="0.6" />
        {sig && <circle cx="72" cy="54" r="1.6" fillOpacity="0.6" />}
      </g>
      <ellipse cx="60" cy="134" rx="14" ry="3.5" fill={p.lumen} fillOpacity="0.12" />
    </>
  ),

  /**
   * 浪：**一道竖着卷起来的单浪**，占据画面主轴。
   *
   * 【为什么不再用横向层带】
   * 旧版 wave 是四条横向水带，而 tide 也是四条横向水带 + 一枚月亮 ——
   * 两者在缩略图上只差那枚小月亮，实际读作同一张牌。
   * 现在 tide 保持「安静的水平层」，wave 改成「一道竖起来的卷」：
   * 一个是躺着的，一个是立着的，主轴方向就不同。
   */
  wave: ({ p, sig, uid }) => (
    <>
      <circle cx="62" cy="88" r="42" fill={`url(#${uid}-halo)`} />
      {/* 浪body：从右下卷向左上，浪头在上方内扣 */}
      <path
        d="M96 176 C96 120 84 74 60 48 C40 26 26 34 30 58 C34 82 54 92 74 86 C58 100 44 122 44 176 Z"
        fill={p.ground}
        fillOpacity="0.72"
        stroke={p.ink}
        strokeOpacity="0.34"
        strokeWidth="1"
      />
      {/* 浪脊的高光 */}
      <path
        d="M60 48 C40 26 26 34 30 58 C34 82 54 92 74 86"
        fill="none"
        stroke={p.lumen}
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {sig && (
        <>
          <circle cx="40" cy="62" r="2.2" fill={p.lumen} fillOpacity="0.7" />
          <circle cx="52" cy="76" r="1.4" fill={p.lumen} fillOpacity="0.5" />
        </>
      )}
      {/* 底部只有一条极浅的水面线，不做层带 */}
      <line x1="0" y1="176" x2="120" y2="176" stroke={p.ink} strokeOpacity="0.22" strokeWidth="0.8" />
      <rect x="0" y="176" width="120" height="24" fill={p.abyss} fillOpacity="0.75" />
    </>
  ),

  /** 山：一道山脊剪影。远处的目标 */
  mountain: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="60" r="34" fill={`url(#${uid}-halo)`} />
      <circle cx="60" cy="54" r="7" fill={p.lumen} fillOpacity="0.8" />
      <path d="M-6 132 L28 92 L48 116 L74 74 L126 132 Z" fill={p.stone} fillOpacity="0.85" />
      <path d="M-6 132 L28 92 L48 116 L74 74 L126 132" fill="none" stroke={p.ink} strokeOpacity="0.3" strokeWidth="0.8" />
      {sig && <path d="M74 74 L84 88 L64 88 Z" fill={p.lumen} fillOpacity="0.24" />}
      <Ground uid={uid} p={p} />
    </>
  ),

  /** 暴：斜向的疾线。突然、无法抵挡 */
  storm: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <g stroke={p.ink} strokeLinecap="round">
        {[8, 24, 40, 56, 72, 88, 104].map((x, i) => (
          <line
            key={x}
            x1={x}
            y1={10 + (i % 3) * 8}
            x2={x - 26}
            y2={78 + (i % 2) * 10}
            strokeOpacity={0.16 + (i % 3) * 0.07}
            strokeWidth={0.8 + (i % 2) * 0.5}
          />
        ))}
      </g>
      <path d="M64 34 L50 78 L60 78 L52 118 L74 68 L62 68 L74 34 Z" fill={p.warm} fillOpacity="0.62" />
      {sig && <path d="M64 34 L50 78 L60 78 L52 118 L74 68 L62 68 L74 34 Z" fill="none" stroke={p.lumen} strokeOpacity="0.4" strokeWidth="0.6" />}
      <ellipse cx="60" cy="132" rx="30" ry="5" fill={p.warm} fillOpacity="0.14" />
    </>
  ),

  /** 剑：一把竖立的剑。清晰、切开混沌 */
  sword: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="80" r="34" fill={`url(#${uid}-halo)`} />
      <path d="M60 24 L64 40 L64 108 L60 116 L56 108 L56 40 Z" fill={p.lumen} fillOpacity="0.82" />
      <rect x="44" y="108" width="32" height="4" rx="1.5" fill={p.stone} stroke={p.ink} strokeOpacity="0.36" strokeWidth="0.6" />
      <rect x="57.5" y="112" width="5" height="18" rx="2" fill={p.stone} stroke={p.ink} strokeOpacity="0.3" strokeWidth="0.6" />
      <circle cx="60" cy="132" r="3.4" fill={p.stone} stroke={p.ink} strokeOpacity="0.32" strokeWidth="0.6" />
      {sig && <line x1="60" y1="40" x2="60" y2="106" stroke={p.ink} strokeOpacity="0.3" strokeWidth="0.5" />}
      <Ground uid={uid} p={p} y={144} />
    </>
  ),

  /** 杯：一只盛着光的杯。接纳、感受 */
  cup: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <circle cx="60" cy="72" r="30" fill={`url(#${uid}-halo)`} />
      <path d="M40 56 Q40 92 60 96 Q80 92 80 56 Z" fill={p.stone} stroke={p.ink} strokeOpacity="0.36" strokeWidth="0.9" />
      <path d="M43 60 Q43 86 60 90 Q77 86 77 60 Z" fill={`url(#${uid}-shaft)`} />
      <rect x="57.5" y="96" width="5" height="18" fill={p.stone} stroke={p.ink} strokeOpacity="0.3" strokeWidth="0.6" />
      <ellipse cx="60" cy="118" rx="15" ry="4" fill={p.stone} stroke={p.ink} strokeOpacity="0.32" strokeWidth="0.7" />
      {sig && <circle cx="60" cy="48" r="3" fill={p.lumen} fillOpacity="0.85" />}
      <ellipse cx="60" cy="132" rx="20" ry="4" fill={p.lumen} fillOpacity="0.12" />
    </>
  ),

  /** 冠：一道有尖的弧。被承认、被赋予 */
  crown: ({ p, sig, uid }) => (
    <>
      <circle cx="60" cy="76" r="36" fill={`url(#${uid}-halo)`} />
      <path
        d="M32 96 L28 56 L44 72 L60 44 L76 72 L92 56 L88 96 Z"
        fill={p.stone}
        stroke={p.ink}
        strokeOpacity="0.4"
        strokeWidth="0.9"
      />
      <rect x="30" y="96" width="60" height="7" rx="2" fill={p.stone} stroke={p.ink} strokeOpacity="0.34" strokeWidth="0.7" />
      <g fill={p.lumen}>
        <circle cx="28" cy="56" r="2.4" fillOpacity="0.85" />
        <circle cx="60" cy="44" r="3" fillOpacity="0.9" />
        <circle cx="92" cy="56" r="2.4" fillOpacity="0.85" />
        {sig && <circle cx="60" cy="82" r="2" fillOpacity="0.7" />}
      </g>
      <Ground uid={uid} p={p} />
    </>
  ),

  /** 灯：一盏悬着的灯。独自照亮一小圈 */
  lantern: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <circle cx="60" cy="82" r="44" fill={`url(#${uid}-halo)`} />
      <line x1="60" y1="20" x2="60" y2="52" stroke={p.ink} strokeOpacity="0.34" strokeWidth="0.8" />
      <path d="M50 52 L70 52 L74 100 L46 100 Z" fill={p.stone} stroke={p.ink} strokeOpacity="0.38" strokeWidth="0.8" />
      <path d="M53 56 L67 56 L70 96 L50 96 Z" fill={`url(#${uid}-shaft)`} />
      <ellipse cx="60" cy="78" rx="5" ry="8" fill={p.warm} fillOpacity="0.85" />
      <rect x="44" y="100" width="32" height="5" rx="1.5" fill={p.stone} stroke={p.ink} strokeOpacity="0.32" strokeWidth="0.6" />
      {sig && <ellipse cx="60" cy="132" rx="34" ry="7" fill={p.warm} fillOpacity="0.14" />}
    </>
  ),

  /** 阈：一堵墙、一道门洞，光溢到地面 */
  threshold: ({ p, sig, uid }) => (
    <>
      <Ground uid={uid} p={p} />
      <path d="M46 132 L74 132 L94 200 L26 200 Z" fill={`url(#${uid}-spill)`} />
      <rect x="12" y="42" width="96" height="6" rx="1.5" fill={p.stone} stroke={p.ink} strokeOpacity="0.28" strokeWidth="0.7" />
      <path
        d="M15 48 H105 V132 H74 V64 H46 V132 H15 Z"
        fill={p.stone}
        stroke={p.ink}
        strokeOpacity="0.26"
        strokeWidth="0.7"
      />
      <rect x="46" y="64" width="28" height="68" fill={`url(#${uid}-shaft)`} />
      <path d="M46 132 V64 H74 V132" fill="none" stroke={p.ink} strokeOpacity="0.34" strokeWidth="0.9" />
      {sig && (
        <>
          <circle cx="60" cy="28" r="1.6" fill={p.ink} fillOpacity="0.5" />
          <path d="M46 64 Q60 52 74 64" fill="none" stroke={p.ink} strokeOpacity="0.2" strokeWidth="0.7" />
        </>
      )}
    </>
  ),
}

/* ── 组件 ───────────────────────────────────────────────────────────────── */

/**
 * 线条性格 → SVG 滤镜。
 *
 * 【为什么用滤镜而不是逐母题改 strokeWidth】
 * 12 个母题里每根线的宽度都是手调过的构图决策，逐个乘一个系数只会把构图搞坏。
 * 而「线条性格」要表达的本来就不是粗细，是**边缘的质地** ——
 * 化开的、刻进去的、有机抖动的、几乎不存在的、硬切的。
 * 这几件事恰好正是滤镜擅长的，而且它作用在整组图元上，一次到位。
 */
function strokeFilter(profile: DeckArtProfile, uid: string): string | undefined {
  return profile.stroke === 'engraving' ? undefined : `url(#${uid}-stroke)`
}

function StrokeFilterDef({ profile, uid }: { profile: DeckArtProfile; uid: string }) {
  switch (profile.stroke) {
    /* 月光：没有一根硬边，全靠明度差成立 */
    case 'dissolving':
      return (
        <filter id={`${uid}-stroke`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      )
    /* 星图：线细到几乎不占面积 */
    case 'hairline':
      return (
        <filter id={`${uid}-stroke`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.18" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.78" />
          </feComponentTransfer>
        </filter>
      )
    /* 森语：有机抖动，线不是直的 */
    case 'organic':
      return (
        <filter id={`${uid}-stroke`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      )
    /* 幽影：明暗直接切开，没有过渡 */
    case 'harsh':
      return (
        <filter id={`${uid}-stroke`} x="-10%" y="-10%" width="120%" height="120%">
          <feComponentTransfer>
            <feFuncA type="gamma" exponent="0.62" />
          </feComponentTransfer>
        </filter>
      )
    default:
      return null
  }
}

/**
 * 光源覆层。缩略图尺寸下第二强的识别锚点 ——
 * 「光从斜上方来」和「光没有来源」一眼可分，色相在低饱和度下则完全不可分。
 */
function LightingLayer({ profile, uid }: { profile: DeckArtProfile; uid: string }) {
  switch (profile.lighting) {
    case 'top-left':
      return <rect x="0" y="0" width="120" height="200" fill={`url(#${uid}-lightTL)`} />
    case 'oblique':
      return (
        <>
          <path d="M84 0 L120 0 L52 200 L14 200 Z" fill={`url(#${uid}-shaft)`} opacity="0.5" />
          <rect x="0" y="126" width="120" height="74" fill={`url(#${uid}-underShade)`} />
        </>
      )
    case 'single-hard':
      return (
        <>
          <rect x="0" y="0" width="62" height="200" fill={`url(#${uid}-lightTL)`} opacity="0.7" />
          <rect x="62" y="0" width="58" height="200" fill={`url(#${uid}-underShade)`} opacity="0.85" />
        </>
      )
    case 'scattered':
    case 'diffuse':
    default:
      return null
  }
}

/** 材质覆层。极轻，只在放大时看得见；绝不做成噪点贴图 */
function TextureLayer({ profile, uid }: { profile: DeckArtProfile; uid: string }) {
  switch (profile.texture) {
    case 'paper':
    case 'grain':
      return (
        <rect
          x="0"
          y="0"
          width="120"
          height="200"
          filter={`url(#${uid}-tex)`}
          opacity={profile.texture === 'paper' ? 0.13 : 0.09}
        />
      )
    case 'wood':
      return (
        <g opacity="0.1">
          {[24, 58, 96, 134, 172].map((y, i) => (
            <path
              key={y}
              d={`M-6 ${y} Q30 ${y + (i % 2 ? -7 : 7)} 60 ${y} T126 ${y}`}
              fill="none"
              stroke={`oklch(0.5 0.04 60)`}
              strokeWidth="1.4"
            />
          ))}
        </g>
      )
    case 'mist':
      return (
        <rect x="0" y="0" width="120" height="200" fill={`url(#${uid}-mist)`} opacity="0.5" />
      )
    default:
      return null
  }
}

export function ProceduralCardArt({
  deckId,
  motif,
  hue,
  tier,
  className = '',
}: ProceduralCardArtProps) {
  const uid = useId().replace(/:/g, '')
  /* ★ deckId 在这里真正进入渲染管线 —— 它决定极性、明度、线条、光源、材质。
     deck:check 的 G 组会断言这一行存在。 */
  const profile = getArtProfile(deckId)
  const p = makePalette(profile, hue)
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
          <stop offset="0" stopColor={p.warm} stopOpacity="0.34" />
          <stop offset="0.5" stopColor={p.warm} stopOpacity="0.1" />
          <stop offset="1" stopColor={p.warm} stopOpacity="0" />
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
          <stop offset="1" stopColor="#000" stopOpacity={profile.vignette} />
        </radialGradient>

        {/* 光源用的三个渐变。哪个被用到由 profile.lighting 决定 */}
        <radialGradient id={`${uid}-lightTL`} cx="0.24" cy="0.16" r="0.78">
          <stop offset="0" stopColor={p.lumen} stopOpacity="0.2" />
          <stop offset="1" stopColor={p.lumen} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-underShade`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={p.abyss} stopOpacity="0" />
          <stop offset="1" stopColor={p.abyss} stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`${uid}-mist`} x1="0" y1="0" x2="0.1" y2="1">
          <stop offset="0" stopColor={p.lumen} stopOpacity="0.09" />
          <stop offset="0.5" stopColor={p.lumen} stopOpacity="0.03" />
          <stop offset="1" stopColor={p.lumen} stopOpacity="0.08" />
        </linearGradient>

        {/* 纸纤维 / 颗粒。用 feTurbulence 生成，不引入位图资产 */}
        <filter id={`${uid}-tex`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={profile.texture === 'paper' ? '0.85' : '1.6'}
            numOctaves="3"
            seed="11"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        <StrokeFilterDef profile={profile} uid={uid} />
      </defs>

      {/* 夜空底 */}
      <rect x="0" y="0" width="120" height="200" fill={`url(#${uid}-sky)`} />

      {/* 线条性格作用在整组图元上：化开 / 刻印 / 有机抖动 / 发丝 / 硬切 */}
      <g filter={strokeFilter(profile, uid)}>
        {/* 星象层：signature 更满一层，placeholder 也必须有，否则同 motif 的牌互相无法区分 */}
        {sig ? <SignatureLayer hue={hue} p={p} /> : <PlaceholderMark hue={hue} p={p} />}

        {/* 母题构图 */}
        {render({ p, sig, uid })}
      </g>

      {/* 光源：方向性比色相更容易被认出来 */}
      <LightingLayer profile={profile} uid={uid} />

      {/* 材质：纸 / 木 / 雾 / 颗粒 */}
      <TextureLayer profile={profile} uid={uid} />

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
        stroke={p.ink}
        strokeOpacity="0.16"
        strokeWidth="0.6"
      />
    </svg>
  )
}

export default ProceduralCardArt
