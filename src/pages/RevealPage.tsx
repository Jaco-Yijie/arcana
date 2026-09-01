import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { resolveDeckId } from '@/decks/ids'
import { computeSpreadLayout } from '@/features/table/layout/spreadLayout'
import { useElementSize } from '@/hooks/useElementSize'
import { useIsDesktop } from '@/hooks/useMediaQuery'

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
  const [boardRef, boardSize] = useElementSize<HTMLDivElement>({ w: 328, h: 460 })
  const isDesktop = useIsDesktop()
  /* 移动端抽屉的实测高度。由抽屉自己用 ResizeObserver 上报 ——
     调用方**绝不能**在渲染期去量它：牌桌与抽屉都在做动画，
     渲染期读 DOM 会构成反馈回路，实测把抽屉动画卡在半路。 */
  const [sheetH, setSheetH] = useState(0)
  const handleSheetHeight = useCallback((h: number) => setSheetH(h), [])

  const spread = session?.spreadId ? getSpread(session.spreadId) : null
  const allRevealed =
    !!session && !!spread && session.placements.length === spread.cardCount &&
    session.placements.every((p) => p.revealed)

  /* 牌位像素位置由牌桌实测尺寸反解。
     hooks 必须在早退之前调用，所以这里对 spread 为 null 的情况给一个空布局。 */
  const layout = useMemo(
    () => (spread ? computeSpreadLayout(spread, boardSize.w, boardSize.h) : null),
    [spread, boardSize.w, boardSize.h],
  )
  const slotById = useMemo(
    () => new Map((layout?.slots ?? []).map((sl) => [sl.id, sl])),
    [layout],
  )

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

  /* 牌阵在牌桌里居中 */
  const padX = Math.max(0, (boardSize.w - (layout?.boardW ?? 0)) / 2)
  const padY = Math.max(0, (boardSize.h - (layout?.boardH ?? 0)) / 2)


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

  /* 桌面端面板是右侧常驻栏；移动端是底部抽屉。两者让位方式不同 */
  const sidePanelOpen = !!sheetPlacement && isDesktop

  return (
    <ImmersiveShell
      variant="table"
      step="reveal"
      /* 移动端抽屉升起时，内容列让出等高的底部空间 */
      bottomInset={!isDesktop && sheetPlacement ? sheetH : 0}
      /* 【Task 8-2】刻意**不传 counter**。
         翻牌页底部已经有「已翻开 n/m」，且它紧邻用户正在操作的区域，
         并在全部翻开时原地让位给 CTA。头部再显示一次同一个状态就是重复。
         抽牌页保留头部 counter —— 那里它是唯一的一处。 */
      onExit={() => navigate('/')}
    >
      {/* 提示语必须在牌层**之上**：牌是绝对定位的，
          放在同一层时会盖住它，实测「准备好后，翻开它。」只露出半句 */}
      <div className="relative z-20">
        <StepHint step="reveal" text="准备好后，翻开它。" done={anyRevealed} />
      </div>

      {/* 【UX 铁律】面板打开时牌桌与 CTA 一起让出底部空间（见 ImmersiveShell.bottomInset），
          保证正在被解释的那张牌与「开始完整解读」都仍然露出。
          翻牌是情绪高点，不能刚翻开就被一块文字面板盖掉。 */}
      <motion.div
        ref={boardRef}
        className={[
          'relative z-0 min-h-0 flex-1',
          /* 桌面端面板是常驻右栏，不是浮层 —— 它打开时内容必须让出这块宽度，
             否则牌桌与 CTA 会被压在面板底下（L-04）。 */
          sidePanelOpen ? 'lg:mr-[324px]' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingInline: 'clamp(0.5rem, 3vw, 1.5rem)' }}
      >
        {spread.positions.map((pos, i) => {
          const placed = session.placements.find((p) => p.positionId === pos.id)
          if (!placed) return null
          const entry = session.deck[placed.deckIndex]
          const card = getCard(entry.cardId)
          const slot = slotById.get(pos.id)
          if (!slot) return null
          return (
            <div
              key={pos.id}
              className="absolute flex flex-col items-center"
              style={{
                left: padX + slot.card.x,
                top: padY + slot.card.y,
                width: slot.card.w,
                transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
              }}
            >
              <div
                onClick={() => placed.revealed && setOpenSheetFor(pos.id)}
                style={{ width: slot.card.w, height: slot.card.h }}
              >
                <FlipCard
                  card={card}
                  orientation={entry.orientation}
                  /* 本次会话冻结的牌组，不是当前选中的那副 */
                  deckId={resolveDeckId(session.deckId, session.deckSchema)}
                  revealed={placed.revealed}
                  /* 尺寸由布局引擎给，牌背与牌面共用同一个盒子 ——
                     翻牌前后尺寸完全一致，不产生结构性跳动（L-06） */
                  width={slot.card.w}
                  idleDelay={i * 0.4}
                  onReveal={flipLock ? undefined : () => handleReveal(pos.id)}
                />
              </div>
              <span
                className="flex select-none items-center justify-center overflow-hidden text-center text-[11px] leading-tight tracking-wide-caps text-text-faint"
                style={{
                  width: slot.label.w,
                  height: slot.label.h,
                  marginLeft: slot.label.x - slot.card.x,
                }}
              >
                {/* ── 牌外说明层 ──
                    牌面上的中文名遮罩已经撤掉（原画自己印着标题，见 TarotCardFace），
                    所以正逆位必须在这里补上 —— 它是牌的状态，原画里没有也不可能有，
                    而正逆位是解读结论的一半。
                    中文牌名不放这里：翻开即弹出的牌义面板已经给了中文名 + 英文名，
                    三处都写一遍就回到了 D1 判为问题的那种重复。 */}
                {placed.revealed && entry.orientation === 'reversed'
                  ? `${pos.label} · 逆位`
                  : pos.label}
              </span>
            </div>
          )
        })}
      </motion.div>

      <div
        className={[
          /* 【为什么这条带子要缩】
             它原本是固定 `min-h-28`（112px）。牌桌拿的是剩下的高度，
             而牌宽由牌桌高度反解 —— 所以这 112px 直接换算成牌面尺寸。
             1024×768 上牌桌只剩约 590px，5 张牌分三行，算出来就是 94px 的牌，
             比 360 手机上的 100px 还小。那不是「桌面没适配」，是这条带子太贪。

             收到 5rem（80px）。CTA 按钮本体 52px，加上下内边距刚好放得下，
             而底部安全区由 `paddingBottom: max(1rem, safe-area + 0.5rem)` 单独兜住，
             不靠这条 min-height 撑 —— 所以缩它不会让 iPhone 的 CTA 顶到 home indicator。
             实测收益：1024×768 牌宽 94 → 100px，1440×900 116 → 124px。 */
          'flex min-h-20 flex-col justify-end px-5 pt-1',
          sidePanelOpen ? 'lg:mr-[324px]' : '',
        ]
          .filter(Boolean)
          .join(' ')}
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
          onHeightChange={handleSheetHeight}
        />
      )}
    </ImmersiveShell>
  )
}
