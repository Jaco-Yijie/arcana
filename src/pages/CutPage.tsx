import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImmersiveShell } from '@/components/layout/ImmersiveShell'
import { StepHint } from '@/components/layout/StepHint'
import { Button } from '@/components/atoms/Button'
import { CutStack } from '@/features/table/components/CutStack'
import type { CutPhase } from '@/features/table/components/CutStack'
import { useSession } from '@/hooks/useSession'
import { useFeedback } from '@/hooks/useFeedback'
import { useI18n } from '@/i18n'

const DECK_SIZE = 78

/**
 * 切牌页。
 * 【G-04】没有默认切点、没有「随机切」「帮我切」。`ratio` 初始为 null，
 * 用户没有指定过位置之前，「从这里切开」不渲染。
 */
export default function CutPage() {
  const navigate = useNavigate()
  const { session, cut, goToStage } = useSession()
  const feedback = useFeedback()
  const { t } = useI18n()
  const [ratio, setRatio] = useState<number | null>(null)
  const [phase, setPhase] = useState<CutPhase>('unset')
  const [interacting, setInteracting] = useState(false)

  if (!session) return <Navigate to="/" replace />

  const handleRatio = (r: number) => {
    setRatio(r)
    if (phase === 'unset') setPhase('picked')
  }

  const doSplit = () => {
    if (ratio === null) return
    cut(ratio)
    feedback.place()
    setPhase('split')
  }

  const doMerge = () => {
    feedback.riffle()
    setPhase('done')
  }

  const cardNumber = ratio === null ? null : Math.max(1, Math.round(ratio * DECK_SIZE))

  const cta =
    phase === 'picked' ? (
      <Button size="lg" variant="primary" display block onClick={doSplit}>
        {t('table.cut.cutHere')}
      </Button>
    ) : phase === 'split' ? (
      <Button size="lg" variant="primary" display block onClick={doMerge}>
        {t('table.cut.merge')}
      </Button>
    ) : phase === 'done' ? (
      <Button
        size="lg"
        variant="primary"
        display
        block
        onClick={() => {
          goToStage('draw')
          navigate('/table/draw')
        }}
      >
        {t('table.cut.spreadOut')}
      </Button>
    ) : null

  return (
    <ImmersiveShell step="cut" interacting={interacting}>
      <StepHint step="cut" text={t('table.cut.hint')} done={ratio !== null} />

      <div className="min-h-0 flex-1">
        <CutStack
          phase={phase}
          ratio={ratio}
          onRatioChange={handleRatio}
          onInteractingChange={setInteracting}
        />
      </div>

      <div className="flex h-8 items-center justify-center">
        <p className="text-caption text-text-faint tabular-nums">
          {cardNumber === null ? t('table.cut.none') : t('table.cut.approx', { n: cardNumber })}
        </p>
      </div>

      <div
        className="flex flex-col items-center gap-2 px-5 pt-3"
        style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
      >
        {/* 刻意不做 CTA 的交叉淡出：文案变化本身就是状态反馈，
            多一层 exit 动画只会让按钮在关键节点上迟迟不响应。 */}
        {cta && (
          <motion.div
            key={phase}
            className="w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {cta}
          </motion.div>
        )}

        {phase !== 'split' && phase !== 'done' && (
          <button
            type="button"
            onClick={() => navigate('/table/shuffle')}
            className="text-caption text-text-faint"
          >
            {t('table.cut.reshuffle')}
          </button>
        )}
      </div>
    </ImmersiveShell>
  )
}
