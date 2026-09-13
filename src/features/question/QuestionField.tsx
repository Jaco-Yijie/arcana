/**
 * 问题输入。
 *
 * 【为什么不是大 textarea】
 * 一个巨大的空白方框会让人进入「填表」的心态 —— 像问卷、像客服工单。
 * 而这里要的是「把现在最想弄清楚的一件事放在这里」。
 *
 * 所以：默认只有 1 行高的细长输入区，随内容自然增长，最多约 4 行。
 * 一开始就给一大片空白，只会让人不知道要写多少才算够。
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { INSPIRATION_IDS } from './questionInspiration'
import { useI18n } from '@/i18n'

const MIN_ROWS_PX = 30
const MAX_ROWS_PX = 132

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  maxLength: number
}

export function QuestionField({ value, onChange, onSubmit, maxLength }: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)
  const [showInspiration, setShowInspiration] = useState(false)

  // 随内容增长，但有上限 —— 不让它长成一整页
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(MAX_ROWS_PX, Math.max(MIN_ROWS_PX, el.scrollHeight))}px`
  }, [value])

  useEffect(() => {
    // 进页面就聚焦，省掉一次点击
    const t = window.setTimeout(() => ref.current?.focus(), 420)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* 引导句。输入时降低存在感，把注意力让给问题本身 */}
      <motion.p
        className="ritual-heading"
        style={{ fontSize: 'clamp(1.25rem, 1.1vw + 1rem, 1.6rem)', lineHeight: 1.7 }}
        animate={{ opacity: focused && value.length > 0 ? 0.45 : 1 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {t('question.lead1')}
        <br />
        {t('question.lead2')}
      </motion.p>

      {/* 细长输入区：一条线，不是一个方框 */}
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
              e.preventDefault()
              onSubmit()
            }
          }}
          rows={1}
          placeholder={t('question.placeholder')}
          className="w-full resize-none bg-transparent pb-3 text-read leading-relaxed text-text-hi outline-none placeholder:text-text-faint"
          style={{ height: MIN_ROWS_PX }}
        />
        {/* 下边线是唯一的边框 —— 聚焦时变亮，代替整个方框 */}
        <motion.span
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-silver"
          animate={{ opacity: focused ? 0.55 : 0.2, scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
        {value.length > maxLength - 40 && (
          <span className="absolute -bottom-6 right-0 text-caption text-text-faint tabular-nums">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {/* 灵感：不让用户面对完全空白的输入框 */}
      <div className="flex flex-col gap-3">
        {!showInspiration ? (
          <button
            type="button"
            onClick={() => setShowInspiration(true)}
            className="self-start text-caption text-text-low underline underline-offset-4"
          >
            {t('question.inspirationToggle')}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="flex flex-col gap-2.5"
          >
            <span className="text-caption text-text-faint">{t('question.inspirationHint')}</span>
            <div className="flex flex-wrap gap-2">
              {INSPIRATION_IDS.map((id) => {
                const question = t(`question.inspiration.${id}.question`)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onChange(question)
                      ref.current?.focus()
                    }}
                    className="rounded-pill border border-line-hairline px-3.5 py-2 text-left text-caption text-text-mid transition-colors duration-[var(--duration-quick)] active:border-line-strong"
                  >
                    <span className="text-text-faint">{t(`question.inspiration.${id}.label`)}</span>
                    <span className="mx-1.5 text-text-faint">·</span>
                    {question}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default QuestionField
