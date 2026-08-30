import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'
import type { DeckFrameSpec } from '@/decks/types'
import type { DeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'

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
  /**
   * 显式覆盖宽度（任意 CSS 长度，例如 `'88px'` / `'var(--fan-card-w)'`）。
   *
   * 【为什么必须有这个出口】
   * 宽度由本组件写成 **inline style**，而 inline style 的优先级高于 class。
   * 所以外部传 `className="w-8"` 是**完全无效**的 —— 它会被静默忽略，
   * 卡牌仍然按 size 档位渲染。Deck Library 曾经就这么写，
   * 结果 5 张预览牌每张都是 64px 而不是 32px，整行溢出容器 62px，
   * 表现为「牌挂在容器外面」，而且看代码完全看不出来。
   *
   * 尺寸只能有一个出口。要改宽度就传这个 prop，不要试图用 class 覆盖。
   */
  width?: string
  /**
   * 这张卡属于哪副牌 —— 决定描边、内衬与暗角。
   *
   * 【为什么加这个】`DeckVisualSpec.frame` 曾经有 5 个字段、给 10 套牌各赋了值，
   * 而本组件一个都不读，全库消费方为 0。也就是说
   * 「elysian 是 double inlay」这类声明一个像素都没渲染出来，
   * 而 deck:check 里那条「5 套装帧互不相同」的断言一直在守空气。
   * 现在它们有了唯一的渲染方。
   *
   * 不传则用中性默认装帧（牌桌之外的通用卡位、占位框等）。
   */
  deckId?: DeckId
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

/** 中性默认装帧：不属于任何牌组的卡位（空牌位、通用缩略图）用它 */
const NEUTRAL_FRAME: DeckFrameSpec = {
  borderColor: 'var(--color-line-soft)',
  borderWidth: 1,
  inlay: 'hairline',
  vignette: 0,
}

/** 内衬线：用 inset box-shadow 画，不占布局、不影响圆角 */
function inlayShadow(spec: DeckFrameSpec): string {
  const tint = 'color-mix(in oklab, var(--color-silver) 12%, transparent)'
  const base = `inset 0 1px 0 ${tint}, inset 0 -1px 0 color-mix(in oklab, var(--color-bg-void) 55%, transparent)`
  if (spec.inlay === 'none') return base
  const line = `inset 0 0 0 1px color-mix(in oklab, ${spec.borderColor} 22%, transparent)`
  if (spec.inlay === 'hairline') return `${line}, ${base}`
  /* double：两道内衬，间距 2px */
  return `${line}, inset 0 0 0 3px color-mix(in oklab, ${spec.borderColor} 12%, transparent), ${base}`
}

export function CardFrame({
  size = 'md',
  selected = false,
  state = 'resting',
  placeholder = false,
  fluid = false,
  width,
  deckId,
  className = '',
  children,
  style,
  ref,
  ...rest
}: CardFrameProps) {
  const frame = deckId ? getDeck(deckId).visual.frame : NEUTRAL_FRAME
  const themed = Boolean(deckId) && !placeholder
  const frameStyle: CSSProperties = {
    /* 标准塔罗比例 1 : 1.667，token 化以保证全站唯一来源 */
    aspectRatio: 'var(--card-ratio)',
    /* 优先级：显式 width > fluid > size 档位。style 仍可最终覆盖 */
    width: width ?? (fluid ? '100%' : WIDTH_VAR[size]),
    /* 牌组装帧：描边由 deck 决定；未选中时才生效，选中态仍走统一的银色强调 */
    ...(themed && !selected
      ? { borderColor: frame.borderColor, borderWidth: `${frame.borderWidth}px` }
      : null),
    ...style,
  }

  const classes = [
    'relative isolate block shrink-0 overflow-hidden table-surface',
    RADIUS_CLASS[size],
    placeholder
      ? 'border border-dashed border-line-hairline bg-bg-void/35'
      : `border ${themed ? '' : 'border-line-soft'} bg-card-sky-a ${SHADOW_CLASS[state]}`,
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

      {/* 暗角：把视线收回牌面中心。强度由牌组决定（wonderland 0.5，ethereal 0.1） */}
      {themed && frame.vignette > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            backgroundImage: `radial-gradient(120% 90% at 50% 45%, transparent 45%, color-mix(in oklab, var(--color-bg-void) ${Math.round(frame.vignette * 100)}%, transparent) 100%)`,
          }}
        />
      )}

      {/* 边缘内光 + 牌组内衬线：让卡牌边缘有厚度，而不是一张贴纸 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: themed
            ? inlayShadow(frame)
            : 'inset 0 1px 0 color-mix(in oklab, var(--color-silver) 12%, transparent), inset 0 -1px 0 color-mix(in oklab, var(--color-bg-void) 55%, transparent)',
        }}
      />
    </div>
  )
}

export default CardFrame
