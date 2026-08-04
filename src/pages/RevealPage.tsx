import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImmersiveShell } from '@/components/layout/ImmersiveShell'
import { StepHint } from '@/components/layout/StepHint'
import { Button } from '@/components/atoms/Button'
import { FlipCard } from '@/features/table/components/FlipCard'
import { CardMeaningSheet } from '@/features/table/components/CardMeaningSheet'
import { useSession } from '@/hooks/useSession'
import { useFeedback } from '@/hooks/useFeedback'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'

/**
 * 翻牌页。
 * 【AC-05】没有「全部翻开」按钮、没有倒计时、没有自动翻开。
 * 【AC-10】全部翻完后不自动跳转 —— 先让整个牌阵完整可见 600ms，再升起「开始完整解读」。
 */
export default function RevealPage() {
  const navigate = useNavigate()
  const { session, revealCard, goToStage } = useSession()
  const feedback = useFeedback()
  const [openSheetFor, setOpenSheetFor] = useState<string | null>(null)
  const [flipLock, setFlipLock] = useState(false)
  const [ctaReady, setCtaReady] = useState(false)

  const spread = session?.spreadId ? getSpread(session.spreadId) : null
  const allRevealed =
    !!session && !!spread && session.placements.length === spread.cardCount &&
    session.placements.every((p) => p.revealed)

  // 全部翻开后先「看看你的牌」，600ms 之后 CTA 才出现
  useEffect(() => {
    if (!allRevealed) {
      setCtaReady(false)
      return
    }
    const t = window.setTimeout(() => setCtaReady(true), 600)
    return () => window.clearTimeout(t)
  }, [allRevealed])

  if (!session || !spread) return <Navigate to="/" replace />

  const revealedCount = session.placements.filter((p) => p.revealed).length
  const anyRevealed = revealedCount > 0

  const handleReveal = (positionId: string) => {
    if (flipLock) return
    setFlipLock(true)
    revealCard(positionId)
    feedback.flip()
    // 一张牌翻转期间锁住其余牌，避免误连翻两张
    window.setTimeout(() => setFlipLock(false), 520)
    window.setTimeout(() => setOpenSheetFor(positionId), 720)
  }

  const sheetPlacement = openSheetFor
    ? session.placements.find((p) => p.positionId === openSheetFor) ?? null
    : null

  return (
    <ImmersiveShell
      step="reveal"
      counter={`${revealedCount}/${spread.cardCount}`}
      onExit={() => navigate('/')}
    >
      <StepHint step="reveal" text="准备好后，翻开它。" done={anyRevealed} />

      <div className="relative mx-4 min-h-0 flex-1">
        {spread.positions.map((pos, i) => {
          const placed = session.placements.find((p) => p.positionId === pos.id)
          if (!placed) return null
          const entry = session.deck[placed.deckIndex]
          const card = getCard(entry.cardId)
          return (
            <div
              key={pos.id}
              className="absolute flex flex-col items-center gap-1.5"
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div onClick={() => placed.revealed && setOpenSheetFor(pos.id)}>
                <FlipCard
                  card={card}
                  orientation={entry.orientation}
                  revealed={placed.revealed}
                  size="md"
                  idleDelay={i * 0.4}
                  onReveal={flipLock ? undefined : () => handleReveal(pos.id)}
                />
              </div>
              <span className="text-[11px] tracking-wide-caps text-text-faint">{pos.label}</span>
            </div>
          )
        })}
      </div>

      <div
        className="flex min-h-28 flex-col justify-end px-5 pt-2"
        style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
      >
        {allRevealed && ctaReady ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <Button
                size="lg"
                variant="primary"
                block
                onClick={() => {
                  goToStage('reading')
                  navigate('/reading')
                }}
              >
                开始完整解读
              </Button>
            </motion.div>
          ) : (
            <motion.p
              key="progress"
              className="pb-3 text-center text-caption text-text-faint tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {allRevealed
                ? `${spread.cardCount} 张都翻开了`
                : `已翻开 ${revealedCount}/${spread.cardCount}`}
            </motion.p>
          )}
      </div>

      {sheetPlacement && (
        <CardMeaningSheet
          card={getCard(session.deck[sheetPlacement.deckIndex].cardId)}
          orientation={session.deck[sheetPlacement.deckIndex].orientation}
          position={spread.positions.find((p) => p.id === sheetPlacement.positionId) ?? null}
          onClose={() => setOpenSheetFor(null)}
        />
      )}
    </ImmersiveShell>
  )
}
