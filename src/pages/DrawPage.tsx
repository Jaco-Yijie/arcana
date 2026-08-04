import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ImmersiveShell } from '@/components/layout/ImmersiveShell'
import { Button } from '@/components/atoms/Button'
import { DrawTable } from '@/features/table/components/DrawTable'
import { useSession } from '@/hooks/useSession'
import { useSettings } from '@/hooks/useSettings'
import { useFeedback } from '@/hooks/useFeedback'
import { getSpread } from '@/data/spreads'

/**
 * 摊牌 · 选牌 · 摆牌。
 * Hand 区的文案始终回答「现在轮到我做什么」——
 * 空手时是「慢慢浏览，选择你想拿起的牌。」，有牌时换成「把它放到对应牌位。」
 * 用户只需要盯这一块地方（UX Spec §5.3）。
 */
export default function DrawPage() {
  const navigate = useNavigate()
  const { session, pickCard, placeCard, liftCard, goToStage } = useSession()
  const { shouldGuide, markGuidanceSeen } = useSettings()
  const feedback = useFeedback()
  const [interacting, setInteracting] = useState(false)

  if (!session || !session.spreadId) return <Navigate to="/" replace />

  const spread = getSpread(session.spreadId)
  const handIndex = session.drawn.length > 0 ? session.drawn[session.drawn.length - 1].deckIndex : null
  const takenIndexes = [
    ...session.drawn.map((d) => d.deckIndex),
    ...session.placements.map((p) => p.deckIndex),
  ]
  const boardFull = session.placements.length === spread.cardCount

  // 两句引导共用 Hand 区同一块空间，是刻意的
  const guideDraw = shouldGuide('draw')
  const guidePlace = shouldGuide('place')
  const handHint = boardFull
    ? '牌都摆好了。'
    : handIndex !== null
      ? guidePlace
        ? '把它放到对应牌位。'
        : '拖到牌位上'
      : guideDraw
        ? '慢慢浏览，选择你想拿起的牌。'
        : '从牌堆里选一张'

  return (
    <ImmersiveShell
      step="draw"
      interacting={interacting}
      counter={`${session.placements.length}/${spread.cardCount}`}
    >
      <DrawTable
        spread={spread}
        deckCount={session.deck.length}
        handIndex={handIndex}
        placements={session.placements}
        takenIndexes={takenIndexes}
        onPick={(deckIndex) => {
          pickCard(deckIndex)
          markGuidanceSeen('draw')
          feedback.riffle()
        }}
        onPlace={(deckIndex, positionId) => {
          placeCard(deckIndex, positionId)
          markGuidanceSeen('place')
          feedback.place()
        }}
        onLift={(positionId) => {
          liftCard(positionId)
          feedback.tap()
        }}
        onInteractingChange={setInteracting}
        handHint={handHint}
      />

      <div
        className="px-5 pt-2"
        style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
      >
        <AnimatePresence>
          {boardFull ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Button
                size="lg"
                variant="primary"
                block
                onClick={() => {
                  goToStage('reveal')
                  navigate('/table/reveal')
                }}
              >
                去翻牌
              </Button>
            </motion.div>
          ) : (
            session.drawn.length === 0 &&
            session.placements.length === 0 && (
              <button
                type="button"
                onClick={() => navigate('/table/cut')}
                className="w-full text-center text-caption text-text-faint"
              >
                重新切牌
              </button>
            )
          )}
        </AnimatePresence>
      </div>
    </ImmersiveShell>
  )
}
