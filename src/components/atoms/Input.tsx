import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

/**
 * Input — 单行输入
 *
 * 调性规则：输入框是「一片可以写字的暗面」，不是一个被框住的盒子。
 * 因此默认只有极淡的底面与发丝下边线，聚焦时下边线转为银色 —— 光落在你正在写的那一行上。
 */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode
  /** 输入框下方的辅助说明 */
  hint?: ReactNode
  /** 有值时覆盖 hint，并把下边线转为警示色 */
  error?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function Input({ label, hint, error, className = '', id, ref, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error || hint ? `${inputId}-desc` : undefined

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-caption tracking-wide-caps text-text-low uppercase"
        >
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full min-h-11 rounded-sm px-4 py-3',
          // 16px 起，防止 iOS Safari 聚焦时自动放大页面
          'text-read text-text-hi placeholder:text-text-faint',
          'bg-surface-1/45 border border-line-hairline',
          error ? 'border-b-caution/60' : 'border-b-line-soft',
          'outline-none appearance-none',
          'transition-[border-color,background-color] duration-[var(--duration-quick)] ease-[var(--ease-veil)]',
          'focus:bg-surface-1/70',
          error ? 'focus:border-caution/70' : 'focus:border-silver/45',
          'disabled:opacity-40',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />

      {(error || hint) && (
        <p id={describedBy} className={`text-caption ${error ? 'text-caution' : 'text-text-faint'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export default Input
