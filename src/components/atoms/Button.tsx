import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

/**
 * Button — 基础按钮
 *
 * 调性规则：primary **不是**一块高饱和实心色块。
 * 在这套设计系统里，「主要」由更亮的描边 + 更高的文字对比度表达，
 * 而不是由更大的颜色面积表达 —— 大色块按钮会立刻把页面拉向电商/游戏 UI。
 *
 * 三档语义：
 * - primary：这一步的主要动作（继续、开始解读）。一屏最多一个。
 * - ghost：并列的次要动作（保留我的问题、查看全部牌阵）。
 * - quiet：可忽略的第三动作（跳过、返回、稍后再说）。
 */

export type ButtonVariant = 'primary' | 'ghost' | 'quiet'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 占满容器宽度（移动端底部主动作常用） */
  block?: boolean
  /**
   * 走「铭刻档」字体（--font-inscription）。
   *
   * 【为什么必须显式声明，而不是自动判断】
   * 上一版是拿 children 去和一张固定文案表做字符串比对，命中就换字体。
   * 那个做法有两个问题：i18n 之后文案不再是字面量（比对必然落空），
   * 以及铭刻档的中文来自**子集字体**，只覆盖 display-keys.json 里那几条 ——
   * 自动判断没有办法知道某句话在不在子集里，猜错就是静默的字体回退。
   * 显式 opt-in 之后，责任落在调用点，而调用点知道自己写的是哪条 key。
   */
  display?: boolean
  children?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

const BASE = [
  'relative inline-flex items-center justify-center gap-2 select-none',
  'ritual-button font-normal',
  'transition-[color,background-color,border-color,transform,box-shadow]',
  'duration-[var(--duration-quick)] ease-[var(--ease-drift)]',
  'active:duration-[var(--duration-tap)]',
  'disabled:pointer-events-none disabled:opacity-40',
].join(' ')

/* V3：内边距整体放大一档。按钮之所以「像网页按钮」，
   一半原因是它紧贴着文字 —— 仪式入口需要自己的呼吸空间。 */
const SIZE: Record<ButtonSize, string> = {
  // 44px / 56px —— 均满足 ≥44×44 触控目标
  md: 'min-h-11 px-7 py-2.5 text-note rounded-sm',
  lg: 'min-h-14 px-10 py-3.5 text-[1.0625rem] rounded-md',
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: [
    'text-text-hi bg-surface-1/70 border border-silver/40',
    'shadow-flat backdrop-blur-sm',
    'hover:border-silver/60 hover:bg-surface-2/70',
    'active:scale-[0.985] active:bg-surface-1/90',
  ].join(' '),
  ghost: [
    'text-text-mid bg-transparent border border-line-hairline',
    'hover:text-text-hi hover:border-line-soft',
    'active:scale-[0.985] active:bg-surface-1/40',
  ].join(' '),
  quiet: [
    'text-text-low bg-transparent border border-transparent px-3',
    'hover:text-text-mid',
    'active:text-text-hi',
  ].join(' '),
}

export function Button({
  variant = 'ghost',
  size = 'md',
  block = false,
  display = false,
  className = '',
  type = 'button',
  children,
  ref,
  ...rest
}: ButtonProps) {
  const classes = [
    BASE,
    SIZE[size],
    VARIANT[variant],
    `ritual-button-${variant}`,
    display ? 'ritual-button-fixed' : '',
    /* 四角刻记只给 lg —— 它是「一屏一个决定」的那个按钮。
       md 上加同样的刻记会让整页看起来像挂满了徽章。 */
    variant === 'primary' && size === 'lg' ? 'ritual-corner' : '',
    block ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} type={type} className={classes} {...rest}>
      {/* primary 顶部一道极细高光，制造「有厚度的薄片」而不是「一块色」 */}
      {variant === 'primary' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow: 'inset 0 1px 0 color-mix(in oklab, var(--color-silver) 16%, transparent)',
          }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  )
}

export default Button
