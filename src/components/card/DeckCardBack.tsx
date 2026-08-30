/**
 * 按 Deck 分派的卡背。
 *
 * 【硬约束：同一副牌的 78 张卡背必须完全一致】
 * 卡背只由 `deckId` 决定，函数签名里**根本没有 cardId** ——
 * 从类型上就不可能因牌而异，也就不可能在翻开前泄露牌面。
 *
 * 【为什么不写 `if (deckId === 'moonlight')`】
 * 从 deck 定义里读 `cardBack` 这个 style 键再分派。
 * 以后加第六套牌组只需要加数据 + 加一个构图函数，不用回来改分派逻辑。
 *
 * 五种构图语言（都用极细线条 + 几何对称，因为它会在一次抽牌里重复出现 78 次）：
 *   lunar         月相 + 同心星轨      Moonlight
 *   orbit         暗金同心环 + 罗盘刻度 Classic
 *   botanic       对称枝叶 + 年轮       Forest
 *   constellation 星座连线 + 天体轨迹   Celestial
 *   veil          层叠帷幕 + 中心留白   Shadow
 */

import { useId, useState } from 'react'
import type { CardBackComposition } from '@/decks/types'
import type { DeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'
import { getManifest } from '@/decks/artwork/manifests'
import { cardBackRepoPath, cardBackUrl } from '@/decks/artwork/paths'

interface Props {
  deckId: DeckId
  /** sm 尺寸下省略最细的刻度与星点，避免糊成一团 */
  simplified?: boolean
  className?: string
}

const LINE = 'var(--color-silver)'
const GOLD = 'var(--color-gold)'

/** 外环刻度：n 等分，长短交替。四折对称，不是随机撒点。 */
function ticks(count: number, longEvery: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360
    const long = i % longEvery === 0
    return { angle, inner: long ? 40 : 43, outer: 46, opacity: long ? 0.4 : 0.2 }
  })
}

/** 四折对称星点 —— 随机撒点在重复 78 次后会显得廉价 */
const STARS = [
  { x: 60, y: 26, r: 1.15, o: 0.5 },
  { x: 60, y: 174, r: 1.15, o: 0.5 },
  { x: 24, y: 60, r: 0.85, o: 0.34 },
  { x: 96, y: 60, r: 0.85, o: 0.34 },
  { x: 24, y: 140, r: 0.85, o: 0.34 },
  { x: 96, y: 140, r: 0.85, o: 0.34 },
  { x: 38, y: 38, r: 0.6, o: 0.24 },
  { x: 82, y: 38, r: 0.6, o: 0.24 },
  { x: 38, y: 162, r: 0.6, o: 0.24 },
  { x: 82, y: 162, r: 0.6, o: 0.24 },
]

function Frame({ uid, accent = LINE }: { uid: string; accent?: string }) {
  return (
    <>
      <rect x="0" y="0" width="120" height="200" fill={`url(#${uid}-bg)`} />
      <rect
        x="5.5"
        y="5.5"
        width="109"
        height="189"
        rx="7"
        fill="none"
        stroke={accent}
        strokeOpacity="0.24"
        strokeWidth="0.7"
      />
      <rect
        x="9"
        y="9"
        width="102"
        height="182"
        rx="5"
        fill="none"
        stroke={accent}
        strokeOpacity="0.12"
        strokeWidth="0.5"
      />
    </>
  )
}

function Lunar({ uid, simplified }: { uid: string; simplified: boolean }) {
  return (
    <>
      {!simplified &&
        ticks(24, 6).map((t, i) => (
          <line
            key={i}
            x1={60 + t.inner * Math.cos((t.angle * Math.PI) / 180)}
            y1={100 + t.inner * Math.sin((t.angle * Math.PI) / 180)}
            x2={60 + t.outer * Math.cos((t.angle * Math.PI) / 180)}
            y2={100 + t.outer * Math.sin((t.angle * Math.PI) / 180)}
            stroke={LINE}
            strokeOpacity={t.opacity}
            strokeWidth="0.5"
          />
        ))}
      {[34, 26, 18].map((r, i) => (
        <circle key={r} cx="60" cy="100" r={r} fill="none" stroke={LINE} strokeOpacity={0.16 - i * 0.03} strokeWidth="0.55" />
      ))}
      {/* 中心月相 */}
      <defs>
        <mask id={`${uid}-moon`}>
          <rect x="0" y="0" width="120" height="200" fill="#000" />
          <circle cx="60" cy="100" r="10" fill="#fff" />
          <circle cx="66" cy="96" r="9" fill="#000" />
        </mask>
      </defs>
      <rect x="46" y="86" width="28" height="28" fill={LINE} fillOpacity="0.8" mask={`url(#${uid}-moon)`} />
      {!simplified && (
        <g fill={LINE}>
          {STARS.map((s) => (
            <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r={s.r} fillOpacity={s.o} />
          ))}
        </g>
      )}
    </>
  )
}

/* uid 原本用于一处已删除的 <use href> 死引用，现在不再需要 */
function Orbit({ simplified }: { uid: string; simplified: boolean }) {
  return (
    <>
      {!simplified &&
        ticks(32, 8).map((t, i) => (
          <line
            key={i}
            x1={60 + (t.inner - 4) * Math.cos((t.angle * Math.PI) / 180)}
            y1={100 + (t.inner - 4) * Math.sin((t.angle * Math.PI) / 180)}
            x2={60 + (t.outer - 4) * Math.cos((t.angle * Math.PI) / 180)}
            y2={100 + (t.outer - 4) * Math.sin((t.angle * Math.PI) / 180)}
            stroke={GOLD}
            strokeOpacity={t.opacity * 0.9}
            strokeWidth="0.5"
          />
        ))}
      {[30, 22, 14].map((r, i) => (
        <circle key={r} cx="60" cy="100" r={r} fill="none" stroke={GOLD} strokeOpacity={0.26 - i * 0.05} strokeWidth="0.6" />
      ))}
      {/* 罗盘四向 */}
      {[0, 90, 180, 270].map((a) => (
        <line
          key={a}
          x1={60 + 10 * Math.cos((a * Math.PI) / 180)}
          y1={100 + 10 * Math.sin((a * Math.PI) / 180)}
          x2={60 + 34 * Math.cos((a * Math.PI) / 180)}
          y2={100 + 34 * Math.sin((a * Math.PI) / 180)}
          stroke={GOLD}
          strokeOpacity="0.3"
          strokeWidth="0.55"
        />
      ))}
      <circle cx="60" cy="100" r="4.5" fill={GOLD} fillOpacity="0.55" />
    </>
  )
}

function Botanic({ simplified }: { uid: string; simplified: boolean }) {
  const leaf = (dir: 1 | -1, y: number, len: number, o: number) => (
    <path
      key={`${dir}-${y}`}
      d={`M60 ${y} Q${60 + dir * len * 0.6} ${y - len * 0.42} ${60 + dir * len} ${y - len * 0.1}
          Q${60 + dir * len * 0.55} ${y + len * 0.2} 60 ${y}`}
      fill="none"
      stroke={LINE}
      strokeOpacity={o}
      strokeWidth="0.6"
    />
  )
  return (
    <>
      {/* 主茎 */}
      <line x1="60" y1="40" x2="60" y2="160" stroke={LINE} strokeOpacity="0.3" strokeWidth="0.7" />
      {[62, 84, 106, 128].map((y, i) => (
        <g key={y}>
          {leaf(1, y, 26 - i * 2, 0.26 - i * 0.03)}
          {leaf(-1, y, 26 - i * 2, 0.26 - i * 0.03)}
        </g>
      ))}
      {/* 年轮 */}
      {!simplified &&
        [36, 28, 20].map((r, i) => (
          <circle key={r} cx="60" cy="100" r={r} fill="none" stroke={LINE} strokeOpacity={0.1 - i * 0.02} strokeWidth="0.5" />
        ))}
      <circle cx="60" cy="100" r="3.2" fill={LINE} fillOpacity="0.45" />
    </>
  )
}

function Constellation({ simplified }: { uid: string; simplified: boolean }) {
  const nodes = [
    { x: 60, y: 58 }, { x: 40, y: 82 }, { x: 78, y: 92 },
    { x: 52, y: 116 }, { x: 84, y: 132 }, { x: 60, y: 150 },
  ]
  const chain = nodes.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x} ${n.y}`).join(' ')
  return (
    <>
      {/* 天体轨迹 */}
      <ellipse cx="60" cy="100" rx="42" ry="20" fill="none" stroke={LINE} strokeOpacity="0.13" strokeWidth="0.55" transform="rotate(-18 60 100)" />
      <ellipse cx="60" cy="100" rx="42" ry="20" fill="none" stroke={LINE} strokeOpacity="0.10" strokeWidth="0.5" transform="rotate(28 60 100)" />
      <path d={chain} fill="none" stroke={LINE} strokeOpacity="0.28" strokeWidth="0.6" />
      <g>
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={i === 0 || i === 5 ? 2 : 1.4} fill={GOLD} fillOpacity={0.7} />
        ))}
      </g>
      {!simplified && (
        <g fill={LINE}>
          {STARS.map((s) => (
            <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r={s.r * 0.8} fillOpacity={s.o * 0.7} />
          ))}
        </g>
      )}
    </>
  )
}

function Veil({ uid, simplified }: { uid: string; simplified: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-veil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LINE} stopOpacity="0.16" />
          <stop offset="1" stopColor={LINE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 层叠帷幕：越靠中心越淡，留出一块安静的空 */}
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${8 + i * 6} 200 C${8 + i * 6} ${120 - i * 14} ${112 - i * 6} ${120 - i * 14} ${112 - i * 6} 200 Z`}
          fill={`url(#${uid}-veil)`}
          stroke={LINE}
          strokeOpacity={0.12 - i * 0.025}
          strokeWidth="0.5"
        />
      ))}
      {!simplified &&
        [30, 21].map((r, i) => (
          <circle key={r} cx="60" cy="88" r={r} fill="none" stroke={LINE} strokeOpacity={0.12 - i * 0.04} strokeWidth="0.5" />
        ))}
      <circle cx="60" cy="88" r="3" fill={LINE} fillOpacity="0.4" />
    </>
  )
}

const COMPOSITIONS: Record<
  CardBackComposition,
  (p: { uid: string; simplified: boolean }) => React.ReactNode
> = {
  lunar: Lunar,
  orbit: Orbit,
  botanic: Botanic,
  constellation: Constellation,
  veil: Veil,
}

/**
 * 卡背素材未提供时的呈现。
 *
 * 【为什么不借用 legacy 的程序化卡背】
 * 那是「同一 SVG 换配色」——本次改造明确禁止的四件事之一。
 * 五套 artwork 牌组的卡背必须是各自的真实素材，缺了就如实显示缺。
 */
function MissingBack({
  deckId,
  showPath,
  reason = '卡背未提供',
}: {
  deckId: DeckId
  showPath: boolean
  reason?: string
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bg-void/92 p-1.5 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-[3px] border border-dashed border-line-soft"
      />
      <span className="text-[9px] leading-none tracking-wide-caps text-text-faint">{reason}</span>
      {showPath && (
        <span className="font-mono text-[8px] leading-tight break-all text-text-faint">
          {cardBackRepoPath(deckId)}
        </span>
      )}
    </div>
  )
}

export function DeckCardBack({ deckId, simplified = false, className = '' }: Props) {
  const uid = useId().replace(/:/g, '')
  const [failed, setFailed] = useState(false)
  const deck = getDeck(deckId)
  const spec = deck.visual.cardBack

  /* artwork 牌组：真实卡背素材。**签名里没有 cardId** ——
     78 张卡背结构上不可能因牌而异，也就不可能在翻开前泄露牌面。 */
  if (spec.kind === 'raster') {
    const manifest = getManifest(deckId)
    const asset = manifest?.deck.back ?? null
    /* 登记了但 404 时也要退回缺失态。裸 <img> 失败会透明，
       露出 CardFrame 的 bg-card-sky-a，看起来就是「一张纯色卡背设计」——
       那是在用空白冒充成品。 */
    if (!asset || failed) {
      return (
        <MissingBack
          deckId={deckId}
          showPath={!simplified}
          reason={failed ? '卡背加载失败' : '卡背未提供'}
        />
      )
    }
    return (
      <img
        /* simplified = Library / 小尺寸场景，走 thumb 档；
           牌桌上的卡背是 md/lg，用 full */
        src={cardBackUrl(deckId, asset.rev ?? manifest!.rev, simplified && asset.thumb ? 'thumb' : 'full')}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={asset.w}
        height={asset.h}
        decoding="async"
        onError={() => setFailed(true)}
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    )
  }

  const Composition = COMPOSITIONS[spec.composition ?? 'lunar']

  return (
    <svg
      viewBox="0 0 120 200"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      focusable="false"
      className={`block h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="var(--color-card-sky-a)" />
          <stop offset="1" stopColor="var(--color-card-sky-b)" />
        </linearGradient>
      </defs>
      <Frame uid={uid} accent={spec.composition === 'orbit' ? GOLD : LINE} />
      <Composition uid={uid} simplified={simplified} />
    </svg>
  )
}

export default DeckCardBack
