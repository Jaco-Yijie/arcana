import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ImmersiveShell } from '@/components/layout/ImmersiveShell'
import { StepHint } from '@/components/layout/StepHint'
import { Button } from '@/components/atoms/Button'
import { ShuffleStack } from '@/features/table/components/ShuffleStack'
import { useSession } from '@/hooks/useSession'
import { useFeedback } from '@/hooks/useFeedback'
import type { ShuffleGesture } from '@/features/table/engine'

/**
 * 洗牌页。
 * 【G-03】页面上不存在任何「一键洗牌 / 帮我洗 / 跳过」的入口。
 * 「洗好了」在 shuffleCount === 0 时**根本不渲染** —— 不是 disabled 灰按钮。
 * 灰按钮会让用户盯着它想怎么点亮；不存在，才没有「可以跳过洗牌」的观感。
 */
export default function ShufflePage() {
  const navigate = useNavigate()
  const { session, shuffle, shuffleCount, markShuffled } = useSession()
  const feedback = useFeedback()
  const [interacting, setInteracting] = useState(false)
  const [cooldown, setCooldown] = useState(false)

  if (!session) return <Navigate to="/" replace />

  const handleGesture = (gesture: ShuffleGesture) => {
    const result = shuffle(gesture)
    if (result?.applied) {
      feedback.riffle()
      // 手势后冷却：避免松手瞬间误触到「洗好了」
      setCooldown(true)
      window.setTimeout(() => setCooldown(false), 200)
    }
    return result
  }

  return (
    <ImmersiveShell step="shuffle" interacting={interacting}>
      <StepHint step="shuffle" text="滑动牌堆进行洗牌。" done={shuffleCount > 0} />

      <div className="min-h-0 flex-1">
        <ShuffleStack
          onGesture={handleGesture}
          onInteractingChange={setInteracting}
          shuffleCount={shuffleCount}
        />
      </div>

      <div className="flex h-8 items-center justify-center">
        {shuffleCount > 0 && (
          <p className="text-caption text-text-faint tabular-nums">已洗 {shuffleCount} 次</p>
        )}
      </div>

      <div
        className="px-5 pt-3"
        style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
      >
        <AnimatePresence>
          {shuffleCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Button
                size="lg"
                variant="primary"
                block
                disabled={cooldown}
                onClick={() => {
                  markShuffled()
                  navigate('/table/cut')
                }}
              >
                洗好了
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ImmersiveShell>
  )
}
