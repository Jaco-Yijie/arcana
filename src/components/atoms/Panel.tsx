import type { HTMLAttributes, ReactNode, Ref } from 'react'

/**
 * Panel — 通用表面容器
 *
 * 全站只允许这一种「浮起的面」。牌阵卡片、牌义分区、日记条目、安全提示
 * 都用它，靠 tone 与 padding 区分层级，而不是各自发明新的边框和阴影。
 *
 * tone：
 * - veil：默认。半透明磨砂面，浮在星空之上（首页卡片、牌义面板）。
 * - inset：凹陷面，用于「嵌在页面里的一段引用」（用户的原始问题、AI 结论）。
 * - bare：只有发丝分隔边，无底色（列表项、可点条目）。
 * - caution：安全边界提示专用，唯一允许使用语义色描边的面。
 */

export type PanelTone = 'veil' | 'inset' | 'bare' | 'caution'
export type PanelPad = 'none' | 'sm' | 'md' | 'lg'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone
  pad?: PanelPad
  /** 可点击条目：加上按压反馈（真正的语义仍由外部的 button/role 决定） */
  interactive?: boolean
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
}

const TONE: Record<PanelTone, string> = {
  veil: 'surface-veil rounded-lg',
  inset: 'rounded-lg bg-bg-void/55 border border-line-hairline',
  bare: 'rounded-lg border border-line-hairline bg-transparent',
  caution: 'rounded-lg bg-bg-void/45 border border-caution/28',
}

const PAD: Record<PanelPad, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-6',
}

export function Panel({
  tone = 'veil',
  pad = 'md',
  interactive = false,
  className = '',
  children,
  ref,
  ...rest
}: PanelProps) {
  const classes = [
    'relative',
    TONE[tone],
    PAD[pad],
    interactive
      ? 'cursor-pointer transition-[transform,border-color,background-color] duration-[var(--duration-quick)] ease-[var(--ease-drift)] hover:border-line-soft active:scale-[0.99]'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  )
}

export default Panel
