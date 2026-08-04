import { useId } from 'react'

/**
 * CardBack — 统一牌背（Card back）
 *
 * 【硬性契约】78 张牌的牌背必须**逐像素完全一致**。
 * 本组件不接受任何与「是哪张牌」相关的入参（无 card / id / index / seed），
 * 从结构上杜绝牌面信息泄露（AC-07 / G-05）。
 *
 * 设计：深蓝夜空底 + 极细银线构成的同心星轨与刻度环 + 中心一枚小月相。
 * 纯 SVG（矢量，可无损放大，78 次重复出现不会出现位图糊边或廉价感）。
 * 唯一的可变参数是 `simplified` —— 仅在 sm 尺寸下减少刻度与星点的绘制量，
 * 属于渲染性能取舍，对所有牌一视同仁，不携带任何牌面信息。
 */

/* 牌背调色板：与 src/styles/theme.css 的 token 同源，
   此处写成字面量以避免 SVG presentation attribute 对 var() 的兼容差异。 */
const SKY_TOP = 'oklch(0.205 0.040 258)' /* ≈ --color-card-sky-a 再压暗一档 */
const SKY_BOTTOM = 'oklch(0.145 0.030 262)' /* ≈ --color-bg-void */
const SILVER = 'oklch(0.87 0.022 248)' /* --color-silver */
const GOLD = 'oklch(0.845 0.058 88)' /* --color-gold */

export interface CardBackProps {
  /** sm 尺寸下降低绘制量（不改变构图语言，仅省略最细的刻度与星点） */
  simplified?: boolean
  className?: string
}

/** 外环刻度：24 等分，长短交替（长刻度对应 4 个方位） */
const TICKS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 360
  const long = i % 6 === 0
  return { angle, inner: long ? 40 : 43, outer: 46, opacity: long ? 0.4 : 0.2 }
})

/** 星点：四折对称排布，避免「随机撒点」带来的廉价感 */
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

export function CardBack({ simplified = false, className = '' }: CardBackProps) {
  const uid = useId().replace(/:/g, '')
  const skyId = `${uid}-sky`
  const haloId = `${uid}-halo`
  const moonId = `${uid}-moon`

  return (
    <svg
      viewBox="0 0 120 200"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="牌背"
      focusable="false"
      className={`block h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={SKY_TOP} />
          <stop offset="1" stopColor={SKY_BOTTOM} />
        </linearGradient>

        <radialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={SILVER} stopOpacity="0.16" />
          <stop offset="0.55" stopColor={SILVER} stopOpacity="0.05" />
          <stop offset="1" stopColor={SILVER} stopOpacity="0" />
        </radialGradient>

        <mask id={moonId}>
          <rect x="0" y="0" width="120" height="200" fill="#000" />
          <circle cx="60" cy="100" r="6.6" fill="#fff" />
          <circle cx="63.1" cy="97.6" r="6.1" fill="#000" />
        </mask>
      </defs>

      {/* 底：夜空渐变 + 中心极淡光晕 */}
      <rect x="0" y="0" width="120" height="200" fill={`url(#${skyId})`} />
      <circle cx="60" cy="100" r="62" fill={`url(#${haloId})`} />

      {/* 双层内框：给牌背一个「装帧」而不是一张贴图 */}
      <rect
        x="5.5"
        y="5.5"
        width="109"
        height="189"
        rx="7"
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.24"
        strokeWidth="0.7"
      />
      <rect
        x="9.5"
        y="9.5"
        width="101"
        height="181"
        rx="5"
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.1"
        strokeWidth="0.5"
      />

      {/* 同心星轨 */}
      <g fill="none" stroke={SILVER} strokeWidth="0.6">
        <circle cx="60" cy="100" r="38" strokeOpacity="0.26" />
        <circle cx="60" cy="100" r="27" strokeOpacity="0.16" />
        <circle cx="60" cy="100" r="16.5" strokeOpacity="0.11" />
      </g>

      {/* 一条倾斜的椭圆轨道 —— 打破完全对称，产生「天体运行」的暗示 */}
      <ellipse
        cx="60"
        cy="100"
        rx="46"
        ry="19"
        fill="none"
        stroke={SILVER}
        strokeOpacity="0.14"
        strokeWidth="0.55"
        transform="rotate(-22 60 100)"
      />

      {/* 外环刻度 */}
      {!simplified && (
        <g stroke={SILVER} strokeWidth="0.55" strokeLinecap="round">
          {TICKS.map((t) => (
            <line
              key={t.angle}
              x1="60"
              y1={100 - t.inner}
              x2="60"
              y2={100 - t.outer}
              strokeOpacity={t.opacity}
              transform={`rotate(${t.angle} 60 100)`}
            />
          ))}
        </g>
      )}

      {/* 星点 */}
      {!simplified && (
        <g fill={SILVER}>
          {STARS.map((s) => (
            <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r={s.r} fillOpacity={s.o} />
          ))}
        </g>
      )}

      {/* 中心月相：全站唯一允许的「符号」，小、冷金、不发光 */}
      <rect x="50" y="90" width="22" height="22" fill={GOLD} fillOpacity="0.72" mask={`url(#${moonId})`} />

      {/* 月相下方一道极短的地平线，给中心一个落点 */}
      <line
        x1="46"
        y1="114"
        x2="74"
        y2="114"
        stroke={SILVER}
        strokeOpacity="0.18"
        strokeWidth="0.5"
      />

      {/* 上下两枚极小的定位菱形，充当牌背的「上下文标记」 */}
      <g fill={SILVER} fillOpacity="0.22">
        <path d="M60 16.6 62 20 60 23.4 58 20Z" />
        <path d="M60 176.6 62 180 60 183.4 58 180Z" />
      </g>
    </svg>
  )
}

export default CardBack
