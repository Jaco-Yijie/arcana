/**
 * Question Focus Moment —— 提交问题后那 1.6 秒。
 *
 * 【它要做什么】
 * 让问题从输入框「离开」，变成一句被放在中央、被认真对待的话。
 * 这一小步的作用是把用户从「填表」的心态切换到「我在问一件事」。
 *
 * 【它不做什么】
 * 不倒计时、不强制冥想、不做长动画。1.6 秒，然后自己走掉。
 * 仪式感来自节奏，不是来自拖慢流程。
 */

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

const HOLD_MS = 1600

interface Props {
  question: string
  onDone: () => void
}

export function QuestionFocusMoment({ question, onDone }: Props) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const t = window.setTimeout(onDone, reduceMotion ? 300 : HOLD_MS)
    return () => window.clearTimeout(t)
  }, [onDone, reduceMotion])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32 }}
      style={{ background: 'var(--color-bg-void)' }}
    >
      <motion.p
        className="max-w-[320px] text-center font-serif text-display leading-relaxed text-text-hi"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {question}
      </motion.p>

      <motion.p
        className="text-note text-text-low"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.5 }}
      >
        先把这个问题放在心里。
      </motion.p>
    </motion.div>
  )
}

export default QuestionFocusMoment
