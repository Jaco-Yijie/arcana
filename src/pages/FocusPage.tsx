import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImmersiveShell } from '@/components/layout/ImmersiveShell'
import { Button } from '@/components/atoms/Button'
import { useSession } from '@/hooks/useSession'
import { getSpread } from '@/data/spreads'
import { getRandomTheme } from '@/data/randomThemes'

/**
 * 抽牌前准备。
 * 「专注一下」只做非常轻量的仪式：背景压暗 + 显示问题 + 一句提示。
 * 没有倒计时、没有进度环、没有呼吸引导 —— 这不是 Meditation App。
 */
export default function FocusPage() {
  const navigate = useNavigate()
  const { session, goToStage } = useSession()
  const [focused, setFocused] = useState(false)

  if (!session || !session.spreadId) return <Navigate to="/" replace />

  const spread = getSpread(session.spreadId)
  const displayQuestion =
    session.mode === 'random'
      ? session.theme && session.theme !== 'free'
        ? getRandomTheme(session.theme).label
        : '随缘抽一张'
      : session.usedOptimized && session.optimizedQuestion
        ? session.optimizedQuestion
        : session.question

  const begin = () => {
    goToStage('shuffle')
    navigate('/table/shuffle')
  }

  return (
    <ImmersiveShell
      step={null}
      exitLabel={focused ? '退出专注' : '返回'}
      onExit={() => (focused ? setFocused(false) : navigate(session.mode === 'random' ? '/question?mode=random' : '/spread'))}
    >
      <motion.div
        className="flex flex-1 flex-col items-center justify-center px-8 text-center"
        animate={{ opacity: focused ? 1 : 1 }}
      >
        <motion.div
          className="pointer-events-none fixed inset-0 bg-bg-void"
          animate={{ opacity: focused ? 0.6 : 0 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <p className="font-serif text-display text-text-hi text-glow-soft">{displayQuestion}</p>

          {!focused ? (
            <p className="text-caption text-text-faint">
              {spread.name} · {spread.cardCount} 张
            </p>
          ) : (
            <p className="text-note text-text-low">在心里再想一次你的问题。</p>
          )}
        </div>
      </motion.div>

      <div
        className="relative z-10 flex flex-col items-center gap-3 px-5"
        style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
      >
        <Button size="lg" variant="primary" block onClick={begin}>
          {focused ? '我准备好了' : '直接开始'}
        </Button>
        {!focused && (
          <button
            type="button"
            onClick={() => setFocused(true)}
            className="text-caption text-text-faint"
          >
            专注一下
          </button>
        )}
      </div>
    </ImmersiveShell>
  )
}
