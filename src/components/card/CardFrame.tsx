import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'

/**
 * CardFrame — 卡牌统一外框（Card frame）
 *
 * 全站**所有**卡牌（牌背 CardBack / 牌面 CardArt / 空牌位占位）都必须包在本组件里，
 * 由它单点掌管：宽高比、圆角、描边、阴影、选中态、按压态。
 * 这样正反面、扇形摊牌、牌阵牌位、日记缩略图才会是同一副牌的同一种物理实体。
 *
 * 纯展示组件：不含任何抽牌/翻牌业务逻辑，不监听手势（手势由 Feature 层通过
 * 透传的 props / 外层 motion 容器接管）。
 */

/** 卡牌尺寸档位 */
export type CardSize = 'sm' | 'md' | 'lg'

/** 卡牌状态：视觉语言的四种物理状态 */
export type CardState =
  /** 静置在牌堆/牌桌上 */
  | 'resting'
  /** 被用户拿起（拖拽中） */
  | 'lifted'
  /** 已落入牌位并锁定（已翻开） */
  | 'locked'

export interface CardFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** sm 64px（摊牌/缩略） · md 112px（牌阵牌位） · lg 176px（单张聚焦） */
  size?: CardSize
  /** 用户当前选中的那一张：银色描边加强 + 轻微抬升，不发光 */
  selected?: boolean
  /** 物理状态，决定阴影层级 */
  state?: CardState
  /** 空牌位占位：虚线发丝边 + 透明底 */
  placeholder?: boolean
  /** 让宽度跟随父容器（扇形布局用），此时 size 只决定圆角档位 */
  fluid?: boolean
  className?: string
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
}

const WIDTH_VAR: Record<CardSize, string> = {
  sm: 'var(--card-w-sm)',
  md: 'var(--card-w-md)',
  lg: 'var(--card-w-lg)',
}

/** 圆角随尺寸缩放，保证「看起来是同一个圆角」而不是等比放大的塑料感 */
const RADIUS_CLASS: Record<CardSize, string> = {
  sm: 'rounded-xs',
  md: 'rounded-sm',
  lg: 'rounded-md',
}

const SHADOW_CLASS: Record<CardState, string> = {
  resting: 'shadow-card',
  lifted: 'shadow-lift',
  locked: 'shadow-card',
}

export function CardFrame({
  size = 'md',
  selected = false,
  state = 'resting',
  placeholder = false,
  fluid = false,
  className = '',
  children,
  style,
  ref,
  ...rest
}: CardFrameProps) {
  const frameStyle: CSSProperties = {
    /* 标准塔罗比例 1 : 1.667，token 化以保证全站唯一来源 */
    aspectRatio: 'var(--card-ratio)',
    width: fluid ? '100%' : WIDTH_VAR[size],
    ...style,
  }

  const classes = [
    'relative isolate block shrink-0 overflow-hidden table-surface',
    RADIUS_CLASS[size],
    placeholder
      ? 'border border-dashed border-line-hairline bg-bg-void/35'
      : `border border-line-soft bg-card-sky-a ${SHADOW_CLASS[state]}`,
    // 选中：加强描边 + 极轻微抬起。刻意不加 glow —— 发光是游戏抽卡 UI 的语言。
    selected && !placeholder ? 'border-silver/55 -translate-y-1' : '',
    'transition-[transform,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-drift)]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={classes} style={frameStyle} {...rest}>
      {children}
      {/* 统一的边缘内光：让卡牌边缘有厚度，而不是一张贴纸 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            'inset 0 1px 0 color-mix(in oklab, var(--color-silver) 12%, transparent), inset 0 -1px 0 color-mix(in oklab, var(--color-bg-void) 55%, transparent)',
        }}
      />
    </div>
  )
}

export default CardFrame
