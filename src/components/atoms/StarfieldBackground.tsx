/**
 * StarfieldBackground — 全局星空 / 雾气背景层
 *
 * 原则：这是**环境**，不是**内容**。它必须安静到用户注意不到它，
 * 只有在离开页面时才隐约觉得「刚才那个空间是有深度的」。
 *
 * 实现约束：
 * - 不使用 canvas 逐帧渲染（移动端功耗）。纯 CSS 渐变 + 一张静态 SVG。
 * - 星点位置在模块加载时用确定性种子生成一次，永不重算 —— 页面切换时星空不跳动。
 * - 星点静止不闪烁；唯一的运动是雾层 24s 的极慢漂移与 14s 的呼吸。
 * - `prefers-reduced-motion: reduce` 时全部静止（theme.css 全局降级 + 本组件显式 motion-reduce）。
 */

export interface StarfieldBackgroundProps {
  /** 专注模式 / 阅读模式下进一步压暗（不卸载，避免重排闪烁） */
  dimmed?: boolean
  className?: string
}

interface Star {
  x: number
  y: number
  r: number
  o: number
}

/** 确定性星点：固定种子，保证任何一次渲染结果完全一致 */
function generateStars(): Star[] {
  let s = 20260803
  const next = () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
  return Array.from({ length: 58 }, () => {
    const t = next()
    return {
      x: Math.round(next() * 390 * 10) / 10,
      y: Math.round(next() * 844 * 10) / 10,
      // 绝大多数是极小极暗的点，只有少数几颗稍亮
      r: t > 0.94 ? 1.5 : t > 0.72 ? 1 : 0.65,
      o: t > 0.94 ? 0.5 : t > 0.72 ? 0.3 : 0.16,
    }
  })
}

const STARS = generateStars()

export function StarfieldBackground({ dimmed = false, className = '' }: StarfieldBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-deep',
        'transition-opacity duration-[var(--duration-page)] ease-[var(--ease-veil)]',
        dimmed ? 'opacity-45' : 'opacity-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 第一层：整体空间的明暗塑形 —— 上暗下略亮，模拟深夜天文馆穹顶 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(120% 78% at 50% 108%, oklch(0.30 0.038 262 / 0.55) 0%, transparent 62%),' +
            'radial-gradient(90% 60% at 50% -10%, oklch(0.20 0.030 268 / 0.7) 0%, transparent 70%)',
        }}
      />

      {/* 第二层：雾。唯一会动的东西，24s 漂移 + 14s 呼吸，幅度小到不会被察觉为动画 */}
      <div
        className="drift-slow motion-reduce:animate-none absolute -inset-[8%]"
        style={{
          backgroundImage:
            'radial-gradient(46% 30% at 24% 30%, oklch(0.42 0.042 258 / 0.16) 0%, transparent 70%),' +
            'radial-gradient(52% 26% at 78% 66%, oklch(0.38 0.048 250 / 0.13) 0%, transparent 72%)',
        }}
      />
      <div
        className="animate-breathe motion-reduce:animate-none absolute -inset-[6%]"
        style={{
          backgroundImage:
            'radial-gradient(38% 22% at 60% 14%, oklch(0.48 0.030 254 / 0.1) 0%, transparent 74%)',
        }}
      />

      {/* 第三层：星点与星轨。静态 SVG，slice 铺满任意视口 */}
      <svg
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
        {/* 两条极淡的星轨弧线 —— 提示「这里有天体在运行」，但几乎看不见 */}
        <path
          d="M-60 250 Q195 60 450 250"
          fill="none"
          stroke="oklch(0.87 0.022 248)"
          strokeOpacity="0.07"
          strokeWidth="0.8"
        />
        <path
          d="M-60 640 Q195 500 450 700"
          fill="none"
          stroke="oklch(0.87 0.022 248)"
          strokeOpacity="0.05"
          strokeWidth="0.8"
        />
        <g fill="oklch(0.93 0.014 252)">
          {STARS.map((star) => (
            <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.r} fillOpacity={star.o} />
          ))}
        </g>
      </svg>

      {/* 第四层：底部压暗，保证底部操作区文字对比度始终达标 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ backgroundImage: 'linear-gradient(to top, oklch(0.145 0.022 265 / 0.72), transparent)' }}
      />
    </div>
  )
}

export default StarfieldBackground
