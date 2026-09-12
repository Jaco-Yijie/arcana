/**
 * Layer 3 · 氛围渲染层
 *
 * 【它是环境，不是内容】
 * 沿用 V1 立下的规矩：安静到用户注意不到，
 * 只在离开页面时隐约觉得「刚才那个空间是有深度的」。
 * 换了牌组，用户应该先觉得「气氛不一样了」，而不是「多了一个动画」。
 *
 * 【实现约束（与 V1 一致，不放松）】
 * - 不用 canvas 逐帧渲染 —— 移动端功耗。纯 CSS 渐变 + 静态 SVG。
 * - 所有点位用固定种子在模块加载时算一次，**永不重算**：切页面时背景不跳。
 * - 点是静止的，不闪烁。唯一的运动是雾层的极慢漂移与呼吸。
 * - `prefers-reduced-motion: reduce` 时全部静止。
 *
 * 【颜色从哪来】
 * 底色直接吃 `var(--color-bg-*)`，也就是 DeckContext 写在 <html> 上的那套变量。
 * 这里只负责**形状与密度**，色相由氛围数据决定 —— 两边不会打架。
 */

import type { ReactNode } from 'react'
import type { AtmosphereLighting, AtmosphereStructure } from './types'
import { getAtmosphere } from './registry'
import { getDeck } from '@/decks/registry'
import { useEffectiveDeckId } from '@/hooks/useEffectiveDeck'
import { DeckSigil } from '@/components/deck/DeckSigil'

export interface DeckAtmosphereProps {
  /** 专注 / 阅读时进一步压暗（不卸载，避免重排闪烁） */
  dimmed?: boolean
  className?: string
}

interface Dot {
  x: number
  y: number
  r: number
  o: number
}

/** 确定性点位：同一个 seed 永远给出同一批点 */
function dots(seed: number, count: number, shape: (t: number) => { r: number; o: number }): Dot[] {
  let s = seed
  const next = () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
  return Array.from({ length: count }, () => {
    const t = next()
    const { r, o } = shape(t)
    return {
      x: Math.round(next() * 390 * 10) / 10,
      y: Math.round(next() * 844 * 10) / 10,
      r,
      o,
    }
  })
}

/* 每种氛围一个种子，互不相同 —— 换牌组时点位是真的换了一批 */
const STARFIELD = dots(20260803, 58, (t) => ({
  r: t > 0.94 ? 1.5 : t > 0.72 ? 1 : 0.65,
  o: t > 0.94 ? 0.5 : t > 0.72 ? 0.3 : 0.16,
}))

const NEBULA_STARS = dots(19911214, 96, (t) => ({
  r: t > 0.96 ? 1.6 : t > 0.8 ? 0.95 : 0.5,
  o: t > 0.96 ? 0.55 : t > 0.8 ? 0.28 : 0.13,
}))

/** 纸面斑点：更小更暗，密度低，不能像星星 */
const PARCHMENT_SPECKS = dots(17760704, 40, (t) => ({
  r: t > 0.9 ? 0.9 : 0.55,
  o: t > 0.9 ? 0.14 : 0.08,
}))

/** 林间光斑：少而大 */
const CANOPY_MOTES = dots(20010911, 22, (t) => ({
  r: t > 0.7 ? 2.2 : 1.3,
  o: t > 0.7 ? 0.13 : 0.07,
}))

/* ── artwork 牌组的四批点位 ── */

/** 空灵：雾里的微尘，极少、极淡，几乎只是噪点 */
const VEIL_MOTES = dots(20260101, 18, (t) => ({
  r: t > 0.8 ? 1.6 : 1.0,
  o: t > 0.8 ? 0.10 : 0.055,
}))

/** Elysian：斜射光柱里的浮尘，比空灵密一点、暖一点 */
const OBSIDIAN_DUST = dots(19620517, 34, (t) => ({
  r: t > 0.85 ? 1.4 : 0.8,
  o: t > 0.85 ? 0.12 : 0.06,
}))

/** 仙境：藤蔓间的孢子，大小分化明显 */
const THICKET_SPORES = dots(18651126, 26, (t) => ({
  r: t > 0.72 ? 2.0 : 1.1,
  o: t > 0.72 ? 0.11 : 0.06,
}))

/** 老屋：灯下的灰尘，只聚在光源附近，所以数量少 */
const OLDROOM_DUST = dots(19091009, 28, (t) => ({
  r: t > 0.88 ? 1.2 : 0.7,
  o: t > 0.88 ? 0.11 : 0.055,
}))

/* ══════════════════════════════════════════════════════════════
 * 十种氛围的 SVG 细节层
 * ══════════════════════════════════════════════════════════ */

const SILVER = 'var(--color-silver)'
const VOID = 'var(--color-bg-void)'

function Specks({ list, fill = SILVER }: { list: Dot[]; fill?: string }) {
  return (
    <g fill={fill}>
      {list.map((d) => (
        <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={d.r} fillOpacity={d.o} />
      ))}
    </g>
  )
}

/* ── A. artwork 牌组 ── */

/** 空灵：几层横向的雾带，边缘全是化开的；没有一根硬线 */
function VeilLightDetail() {
  const bands = [
    { y: 300, h: 92, o: 0.055 },
    { y: 452, h: 130, o: 0.042 },
    { y: 630, h: 104, o: 0.032 },
  ]
  return (
    <>
      {bands.map((b) => (
        <rect
          key={b.y}
          x="-40"
          y={b.y}
          width="470"
          height={b.h}
          fill={SILVER}
          fillOpacity={b.o}
          style={{ filter: 'blur(26px)' }}
        />
      ))}
      {/* 地平线暗示：一条几乎不存在的水平线 */}
      <line x1="-40" y1="548" x2="430" y2="548" stroke={SILVER} strokeOpacity="0.05" strokeWidth="0.7" />
      <Specks list={VEIL_MOTES} />
    </>
  )
}

/** Elysian：右上斜射的两道光柱 + 底部围墙剪影 */
function ObsidianDetail() {
  return (
    <>
      <path
        d="M300 -40 L430 -40 L250 884 L150 884 Z"
        fill={SILVER}
        fillOpacity="0.045"
        style={{ filter: 'blur(30px)' }}
      />
      <path
        d="M392 -40 L470 -40 L340 884 L288 884 Z"
        fill={SILVER}
        fillOpacity="0.03"
        style={{ filter: 'blur(22px)' }}
      />
      {/* 围墙：把画面收在一个有边界的园子里 */}
      <path d="M-40 884 L-40 742 L92 742 L92 706 L188 706 L188 758 L430 758 L430 884 Z" fill={VOID} fillOpacity="0.55" />
      <Specks list={OBSIDIAN_DUST} />
    </>
  )
}

/** 蛋白潮汐：退潮线。几条不平行的弧，像湿沙上留下的水痕 */
function IridescentDetail() {
  const tides = [
    { d: 'M-40 620 Q120 588 240 612 Q340 632 430 604', o: 0.07 },
    { d: 'M-40 676 Q140 646 260 670 Q356 690 430 664', o: 0.055 },
    { d: 'M-40 736 Q110 710 250 730 Q350 746 430 724', o: 0.04 },
    { d: 'M-40 800 Q150 776 268 794 Q360 808 430 790', o: 0.028 },
  ]
  return (
    <>
      {tides.map((t) => (
        <path key={t.d} d={t.d} fill="none" stroke={SILVER} strokeOpacity={t.o} strokeWidth="1.1" />
      ))}
      {/* 一片极淡的反光，位置刻意偏离中心 */}
      <ellipse
        cx="252"
        cy="700"
        rx="150"
        ry="46"
        fill={SILVER}
        fillOpacity="0.035"
        style={{ filter: 'blur(30px)' }}
      />
    </>
  )
}

/** 仙境阴影：拱门 + 两侧藤蔓。比例刻意拧过 —— 门开在偏左，不在正中 */
function ThicketDetail() {
  return (
    <>
      {/* 顶部藤蔓压低天空 */}
      <path
        d="M-40 -20 Q60 120 20 210 Q130 140 176 250 Q210 150 300 220 Q340 130 430 190 L430 -20 Z"
        fill={VOID}
        fillOpacity="0.62"
      />
      {/* 拱门：偏左，且比人矮 */}
      <path
        d="M118 844 L118 470 Q118 396 176 396 Q234 396 234 470 L234 844"
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.075"
        strokeWidth="1.3"
      />
      {/* 门里透出的那一点光 */}
      <path d="M126 844 L126 474 Q126 406 176 406 Q226 406 226 474 L226 844 Z" fill={SILVER} fillOpacity="0.028" />
      {/* 缠上来的藤 */}
      <path
        d="M234 844 Q262 700 216 604 Q180 528 232 452"
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.05"
        strokeWidth="0.9"
      />
      <Specks list={THICKET_SPORES} />
    </>
  )
}

/** 经典：左上一盏灯的光晕 + 下方桌沿。没有星星，这是室内 */
function OldroomDetail() {
  return (
    <>
      <circle cx="72" cy="96" r="112" fill={SILVER} fillOpacity="0.05" style={{ filter: 'blur(34px)' }} />
      <circle cx="72" cy="96" r="46" fill={SILVER} fillOpacity="0.045" style={{ filter: 'blur(18px)' }} />
      {/* 桌沿：一条略微倾斜的实线，提示有个平面 */}
      <path d="M-40 690 L430 664" fill="none" stroke={SILVER} strokeOpacity="0.07" strokeWidth="1" />
      <path d="M-40 690 L430 664 L430 884 L-40 884 Z" fill={VOID} fillOpacity="0.42" />
      <Specks list={OLDROOM_DUST} />
    </>
  )
}

/* ── B. legacy 牌组（V2.4 原样保留） ── */

function StarfieldDetail() {
  return (
    <>
      <path d="M-60 250 Q195 60 450 250" fill="none" stroke={SILVER} strokeOpacity="0.07" strokeWidth="0.8" />
      <path d="M-60 640 Q195 500 450 700" fill="none" stroke={SILVER} strokeOpacity="0.05" strokeWidth="0.8" />
      <Specks list={STARFIELD} />
    </>
  )
}

function ParchmentDetail() {
  const fibres = [104, 208, 316, 430, 548, 662, 772]
  return (
    <>
      {fibres.map((y, i) => (
        <path
          key={y}
          d={`M-20 ${y} Q195 ${y + (i % 2 ? -6 : 6)} 410 ${y + (i % 3 ? 2 : -3)}`}
          fill="none"
          stroke={SILVER}
          strokeOpacity={0.045}
          strokeWidth="0.7"
        />
      ))}
      <path d="M0 0 L92 0 Q40 40 0 92 Z" fill={SILVER} fillOpacity="0.022" />
      <path d="M390 844 L298 844 Q350 804 390 752 Z" fill={SILVER} fillOpacity="0.022" />
      <Specks list={PARCHMENT_SPECKS} />
    </>
  )
}

function CanopyDetail() {
  return (
    <>
      <path
        d="M-40 -20 Q60 90 30 150 Q120 96 170 168 Q210 80 268 140 Q300 70 430 120 L430 -20 Z"
        fill={VOID}
        fillOpacity="0.55"
      />
      <path
        d="M-40 -20 Q40 60 10 110 Q100 70 140 120 Q190 50 250 96 Q290 40 430 76 L430 -20 Z"
        fill={VOID}
        fillOpacity="0.7"
      />
      <path
        d="M-40 864 Q70 786 150 820 Q230 770 300 812 Q360 782 430 806 L430 864 Z"
        fill={VOID}
        fillOpacity="0.5"
      />
      <Specks list={CANOPY_MOTES} />
    </>
  )
}

function NebulaDetail() {
  return (
    <>
      <path
        d="M-60 700 Q195 420 450 180"
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.06"
        strokeWidth="46"
        strokeLinecap="round"
        style={{ filter: 'blur(22px)' }}
      />
      <path d="M-60 720 Q195 440 450 200" fill="none" stroke={SILVER} strokeOpacity="0.05" strokeWidth="0.7" />
      <Specks list={NEBULA_STARS} />
    </>
  )
}

function DepthDetail() {
  return (
    <>
      {[190, 262, 340].map((r, i) => (
        <circle
          key={r}
          cx="195"
          cy="470"
          r={r}
          fill="none"
          stroke={SILVER}
          strokeOpacity={0.035 - i * 0.01}
          strokeWidth="0.7"
        />
      ))}
    </>
  )
}

/**
 * 空间结构 → SVG 细节层。
 *
 * 【为什么按 structure 索引而不是 atmosphereId】
 * 按 id 索引时，「这十套的空间结构互不相同」这件事只存在于这张表的形状里，
 * 断言无从下手 —— 只能验证「十个 key 各自有函数」，验证不了它们真的不同。
 * 改由 structure 索引之后，结构变成一个**可声明、可比较、可断言**的维度，
 * 并且新增一套氛围时必须显式选一个结构，不能忘。
 */
const DETAIL: Record<AtmosphereStructure, () => ReactNode> = {
  'fog-bands': VeilLightDetail,
  'light-shafts': ObsidianDetail,
  'tide-lines': IridescentDetail,
  'arch-and-vines': ThicketDetail,
  'lamp-and-table': OldroomDetail,
  'open-starfield': StarfieldDetail,
  'paper-fibre': ParchmentDetail,
  'canopy-gaps': CanopyDetail,
  'nebula-band': NebulaDetail,
  'concentric-depth': DepthDetail,
}

/* ══════════════════════════════════════════════════════════════
 * 光源层
 *
 * 【这一层是本轮新增的，也是「氛围不只靠 Hue」的主要抓手】
 * 旧版光源方向藏在 layers.shape 那串渐变坐标里，强度也压得极低，
 * 十套页面因此读起来是「同一个暗空间换了个主题色」。
 *
 * 现在每种光源模型有自己的一整套渲染：主光位置与形状、衰减速度、
 * 以及配套的暗角。它们的差异是**结构性**的 ——
 * 「光从下面反上来」和「光从左上一盏灯来」不可能靠调色相互相冒充。
 *
 * 强度刻意比旧版高一档，但仍受两条既有纪律约束：
 * chroma 全部 ≤ 0.06；不出现荧光渐变与光爆。
 * ══════════════════════════════════════════════════════════ */

interface LightingSpec {
  /** 主光层。CSS backgroundImage */
  key: string
  /** 主光强度 */
  opacity: number
  /** 配套暗角。null 表示这套光不需要额外收边 */
  vignette: string | null
}

const S = 'var(--color-silver)'
const GOLD = 'var(--color-gold)'

const LIGHTING: Record<AtmosphereLighting, LightingSpec> = {
  /** 漫射：没有来源，整片空间均匀抬亮，最亮处在中段偏下 */
  'diffuse-mist': {
    key:
      `radial-gradient(140% 90% at 50% 58%, color-mix(in oklab, ${S} 16%, transparent) 0%, transparent 72%),` +
      `radial-gradient(120% 70% at 50% 30%, color-mix(in oklab, ${S} 9%, transparent) 0%, transparent 78%)`,
    opacity: 0.9,
    vignette: null,
  },
  /** 月光：高处冷白，柔边，影子很淡 */
  moonlight: {
    key:
      `radial-gradient(58% 34% at 50% 4%, color-mix(in oklab, ${S} 22%, transparent) 0%, transparent 68%),` +
      `linear-gradient(to bottom, color-mix(in oklab, ${S} 7%, transparent) 0%, transparent 46%)`,
    opacity: 0.85,
    vignette:
      'radial-gradient(120% 84% at 50% 26%, transparent 52%, color-mix(in oklab, var(--color-bg-void) 62%, transparent) 100%)',
  },
  /** 硬斜射：明确方向、长影、明暗界线清楚 */
  'hard-oblique': {
    key:
      `linear-gradient(148deg, color-mix(in oklab, ${GOLD} 20%, transparent) 0%, color-mix(in oklab, ${GOLD} 6%, transparent) 26%, transparent 48%),` +
      `radial-gradient(60% 40% at 88% 2%, color-mix(in oklab, ${GOLD} 24%, transparent) 0%, transparent 62%)`,
    opacity: 0.95,
    vignette:
      'linear-gradient(148deg, transparent 44%, color-mix(in oklab, var(--color-bg-void) 78%, transparent) 100%)',
  },
  /** 叶隙碎光：多个小光斑，方向一致但被打散 */
  dappled: {
    key:
      `radial-gradient(20% 13% at 24% 16%, color-mix(in oklab, ${GOLD} 26%, transparent) 0%, transparent 70%),` +
      `radial-gradient(16% 10% at 62% 9%, color-mix(in oklab, ${GOLD} 22%, transparent) 0%, transparent 72%),` +
      `radial-gradient(24% 15% at 44% 32%, color-mix(in oklab, ${GOLD} 16%, transparent) 0%, transparent 74%),` +
      `radial-gradient(14% 9% at 82% 24%, color-mix(in oklab, ${GOLD} 18%, transparent) 0%, transparent 72%)`,
    opacity: 0.9,
    vignette:
      'radial-gradient(110% 80% at 46% 14%, transparent 40%, color-mix(in oklab, var(--color-bg-void) 74%, transparent) 100%)',
  },
  /** 水下焦散：光从下方反上来，横向带状 */
  caustics: {
    key:
      `radial-gradient(130% 42% at 50% 104%, color-mix(in oklab, ${S} 22%, transparent) 0%, transparent 70%),` +
      `repeating-linear-gradient(to top, transparent 0px, transparent 26px, color-mix(in oklab, ${S} 5%, transparent) 30px, transparent 36px)`,
    opacity: 0.85,
    vignette:
      'linear-gradient(to top, transparent 34%, color-mix(in oklab, var(--color-bg-void) 66%, transparent) 100%)',
  },
  /** 暖局部光：一盏灯，衰减极快，外圈迅速吃进暗处 */
  'warm-lamp': {
    key:
      `radial-gradient(34% 24% at 18% 12%, color-mix(in oklab, ${GOLD} 34%, transparent) 0%, transparent 62%),` +
      `radial-gradient(58% 40% at 18% 12%, color-mix(in oklab, ${GOLD} 10%, transparent) 0%, transparent 74%)`,
    opacity: 1,
    vignette:
      'radial-gradient(88% 66% at 20% 14%, transparent 30%, color-mix(in oklab, var(--color-bg-void) 84%, transparent) 100%)',
  },
  /** 顶光：从正上方压下来，上亮下暗，过渡短 */
  'top-light': {
    key:
      `linear-gradient(to bottom, color-mix(in oklab, ${S} 20%, transparent) 0%, color-mix(in oklab, ${S} 5%, transparent) 22%, transparent 44%)`,
    opacity: 0.9,
    vignette:
      'linear-gradient(to bottom, transparent 40%, color-mix(in oklab, var(--color-bg-void) 70%, transparent) 100%)',
  },
  /** 边缘光：中间是暗的，只有四边亮 —— 与所有其它光源相反 */
  'edge-light': {
    key:
      `radial-gradient(96% 76% at 50% 50%, transparent 40%, color-mix(in oklab, ${S} 15%, transparent) 88%, color-mix(in oklab, ${S} 20%, transparent) 100%)`,
    opacity: 0.9,
    vignette:
      'radial-gradient(72% 56% at 50% 50%, color-mix(in oklab, var(--color-bg-void) 72%, transparent) 0%, transparent 70%)',
  },
  /** 四散：没有主光源，只有很多自己发光的小点 */
  scattered: {
    key:
      `radial-gradient(42% 26% at 22% 74%, color-mix(in oklab, ${S} 14%, transparent) 0%, transparent 76%),` +
      `radial-gradient(38% 24% at 78% 28%, color-mix(in oklab, ${S} 13%, transparent) 0%, transparent 76%),` +
      `radial-gradient(30% 20% at 54% 52%, color-mix(in oklab, ${S} 10%, transparent) 0%, transparent 78%)`,
    opacity: 0.9,
    vignette: null,
  },
  /** 来源不明：位置说不通，而且有第二个互相矛盾的光 */
  'uncanny-glow': {
    key:
      `radial-gradient(26% 18% at 71% 33%, color-mix(in oklab, ${GOLD} 28%, transparent) 0%, transparent 66%),` +
      `radial-gradient(18% 30% at 14% 68%, color-mix(in oklab, ${S} 14%, transparent) 0%, transparent 72%)`,
    opacity: 0.95,
    vignette:
      'radial-gradient(84% 70% at 62% 36%, transparent 26%, color-mix(in oklab, var(--color-bg-void) 80%, transparent) 100%)',
  },
}

export function DeckAtmosphere({ dimmed = false, className = '' }: DeckAtmosphereProps) {
  /* 会话冻结后跟着 session 走，否则背景会和牌桌上的卡背打架 */
  const deckId = useEffectiveDeckId()
  const spec = getAtmosphere(getDeck(deckId).atmosphereId)
  const { layers } = spec
  /* ★ structure / lighting 在这里进入渲染链 —— deck:check 的 H 组断言这两行存在 */
  const Detail = DETAIL[spec.structure]
  const light = LIGHTING[spec.lighting]

  return (
    <div
      aria-hidden="true"
      data-atmosphere={spec.atmosphereId}
      className={[
        'pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-deep',
        'transition-opacity duration-[var(--duration-page)] ease-[var(--ease-veil)]',
        dimmed ? 'opacity-45' : 'opacity-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 第一层：整体明暗塑形 */}
      <div className="absolute inset-0" style={{ backgroundImage: layers.shape }} />

      {/* 第一层半：光源。十套各有一套完整的光线模型，
          「光从哪来、衰减多快、暗角收在哪」在这里决定。 */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: light.key, opacity: light.opacity }}
      />

      {/* 第二层：雾。唯一会动的东西，幅度小到不会被察觉成动画 */}
      {layers.driftOpacity > 0 && (
        <>
          <div
            className="drift-slow motion-reduce:animate-none absolute -inset-[8%]"
            style={{ backgroundImage: layers.drift, opacity: layers.driftOpacity }}
          />
          <div
            className="animate-breathe motion-reduce:animate-none absolute -inset-[6%]"
            style={{ backgroundImage: layers.breath, opacity: layers.driftOpacity }}
          />
        </>
      )}

      {/* 第三层：这套氛围特有的细节。静态 SVG，slice 铺满任意视口 */}
      <svg
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
        <Detail />
      </svg>

      {/* ── 第三层·补：牌组徽记（Deck Signature） ──

          【为什么补这一层 —— E3 审计的结论】
          上面那层 `<Detail />` 十套各有一套完全不同的空间结构（光柱、退潮线、
          拱门藤蔓、月晕、帷幕），但它们的 fillOpacity 只有 0.028–0.07 ——
          实测下来人眼基本看不见。结果是：代码里写了十种房间，
          用户那边只感觉换了个背景色。

          差异不能靠色相补（chroma ≤ 0.05 时两个色相几乎不可分），
          也不该靠加粒子和 blur 补（项目已有性能预算，STEP 2 明确禁止）。
          一个**形状明确、位置固定、完全静止**的徽记是最便宜的可分辨手段。

          【为什么放右上、为什么只有 0.11】
          它必须能被看见，但绝不能和牌抢视觉主角。右上角是全站布局里
          唯一稳定的空白象限（左上是返回、中间是牌、底部是操作区）。
          0.11 是「扫一眼能注意到，盯着看才看清」的量 ——
          再高就会在深色底上形成一块抢眼的亮斑。 */}
      <div className="absolute right-[-6%] top-[4%] md:right-[2%] md:top-[6%]">
        <DeckSigil deckId={deckId} size="min(42vw, 22rem)" opacity={0.11} />
      </div>

      {/* 第三层半：本套光源配套的暗角。与主光成对，缺了它光就飘着收不住 */}
      {light.vignette && (
        <div className="absolute inset-0" style={{ backgroundImage: light.vignette }} />
      )}

      {/* 第四层：底部压暗，保证底部操作区文字对比度始终达标 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          backgroundImage:
            'linear-gradient(to top, color-mix(in oklab, var(--color-bg-void) 78%, transparent), transparent)',
        }}
      />
    </div>
  )
}

export default DeckAtmosphere
