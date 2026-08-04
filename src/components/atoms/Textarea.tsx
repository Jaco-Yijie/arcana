import { useId } from 'react'
import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react'

/**
 * Textarea — 多行输入
 *
 * 主要承载两类内容：用户的问题（`/question`）与塔罗日记的笔记。
 * 两者都是「用户在对自己说话」，所以行高放宽到 1.8，字号 16px，
 * 视觉上更接近一页纸而不是一个表单控件。
 */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** 右下角字数提示（需外部传入当前长度与上限） */
  counter?: { value: number; max: number }
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({
  label,
  hint,
  error,
  counter,
  className = '',
  id,
  rows = 4,
  ref,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const describedBy = error || hint ? `${fieldId}-desc` : undefined
  const overflow = counter ? counter.value > counter.max : false

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label htmlFor={fieldId} className="text-caption tracking-wide-caps text-text-low uppercase">
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'w-full resize-none rounded-sm px-4 py-3.5',
          'text-read leading-[1.8] text-text-hi placeholder:text-text-faint',
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

      {(error || hint || counter) && (
        <div className="flex items-start justify-between gap-4">
          <p id={describedBy} className={`text-caption ${error ? 'text-caution' : 'text-text-faint'}`}>
            {error ?? hint}
          </p>
          {counter && (
            <span className={`text-caption tabular-nums ${overflow ? 'text-caution' : 'text-text-faint'}`}>
              {counter.value}/{counter.max}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Textarea
