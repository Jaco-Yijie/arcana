import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSettings } from '@/hooks/useSettings'
import type { GuidanceStep } from '@/types/settings'

interface StepHintProps {
  step: GuidanceStep
  text: string
  /** 该步骤是否已经发生过第一次有效操作。为 true 时 Hint 淡出且本次流程内不再出现。 */
  done: boolean
  className?: string
}

/**
 * 新手引导 Hint（UX Spec §5.2）。
 * 两档呈现：
 *   Guided 明显 —— 第一次：进入 600ms 后淡入，独立条，带呼吸
 *   Faded  弱化 —— 第二次以后：3.5s 无操作才淡入，纯文字，无呼吸
 * 永不阻断点击、永不使用遮罩、永不出现「下一步」教学按钮。
 */
export function StepHint({ step, text, done, className = '' }: StepHintProps) {
  const { shouldGuide, markGuidanceSeen } = useSettings()
  const [guided] = useState(() => shouldGuide(step))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (done) return
    const delay = guided ? 600 : 3500
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [guided, done])

  useEffect(() => {
    if (done) {
      setVisible(false)
      markGuidanceSeen(step)
    }
  }, [done, step, markGuidanceSeen])

  return (
    <div className={`flex h-9 items-center justify-center px-5 ${className}`}>
      <AnimatePresence>
        {visible && !done && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            // 呼吸必须用 framer 做，不能用 CSS animation：
            // CSS 动画的优先级高于 inline style，会盖掉 exit 的 opacity，Hint 就永远淡不掉。
            animate={{ opacity: guided ? [1, 0.68, 1] : 0.55, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={
              guided
                ? { opacity: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, y: { duration: 0.24 } }
                : { duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }
            }
            className={
              guided
                ? 'rounded-pill px-4 py-1 text-body text-text-mid'
                : 'text-caption text-text-low'
            }
          >
            {text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default StepHint
