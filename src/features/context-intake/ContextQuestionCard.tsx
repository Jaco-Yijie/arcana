/**
 * 一道背景选择题。
 *
 * 【为什么是 aria-pressed 的按钮组，而不是 radiogroup】
 * 这里每道题都允许「不回答」—— 点一下选中，再点一下取消。
 * 标准 radio 语义不支持取消选择，用它会让读屏用户以为选了就必须留着。
 * 所以用一组互斥的切换按钮：Tab 逐个聚焦，Enter / Space 切换，aria-pressed 表达选中。
 */

import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ContextIntakeQuestion } from '@/types/reading'

interface Props {
  item: ContextIntakeQuestion
  index: number
  selectedOptionId: string | null
  onSelect: (optionId: string | null) => void
}

export function ContextQuestionCard({ item, index, selectedOptionId, onSelect }: Props) {
  const headingId = useId()
  const reduceMotion = useReducedMotion()

  return (
    <motion.fieldset
      className="flex flex-col gap-3"
      aria-labelledby={headingId}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.08 * index, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <legend id={headingId} className="mb-1 text-read text-text-hi">
        {item.question}
      </legend>
      <div className="flex flex-col gap-2" role="group" aria-labelledby={headingId}>
        {item.options.map((option) => {
          const active = option.id === selectedOptionId
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : option.id)}
              className={[
                'relative flex min-h-12 w-full items-center overflow-hidden rounded-lg border px-4 py-3 text-left text-note',
                'transition-colors duration-[var(--duration-base)] active:scale-[0.99]',
                'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-silver/70',
                active
                  ? 'border-silver/55 bg-surface-1/60 text-text-hi'
                  : 'border-line-hairline bg-bg-void/40 text-text-mid hover:border-line-soft',
              ].join(' ')}
            >
              {/* 与解读模式选择同一种选中语言：左侧亮起一道细边 */}
              {active && <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-px bg-gold/70" />}
              {option.label}
            </button>
          )
        })}
      </div>
    </motion.fieldset>
  )
}
