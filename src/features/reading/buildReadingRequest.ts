/**
 * TarotSession → ReadingRequest（发给自家后端的薄载荷）。
 *
 * 【这是「已成事实」的转录点，不是决策点】
 * 只转录「哪个牌位、哪张牌、什么朝向」。牌义一个字都不传 —— 由服务端用它自己那份
 * 78 张牌数据重新解析（见 docs/v2/11-architecture.md F-3）。
 *
 * 必须满足两个性质，否则 AC-V2-06（Retry payload 逐字节相同）不成立：
 *   1. **纯函数**：同一个 session + spread 永远产出同一个 request
 *   2. **零随机、零时间**：全文不得出现 `Math.random` / `Date.now`
 *
 * `sessionId` 用 session 自己的 id，不是新生成的 —— 重试时必须一样。
 */

import type { TarotSession } from '@/types/session'
import type { Spread } from '@/types/spread'
import type { ReadingMode, ReadingRequest, ReadingRequestCard } from '@/types/reading'
import { effectiveQuestion } from './buildReadingInput'

/**
 * 组装请求体。只包含**已翻开**的牌 ——
 * 没翻开的牌连身份都还不该被读取，更不该发出去。
 */
export function buildReadingRequest(
  session: TarotSession,
  spread: Spread,
  readingMode: ReadingMode = 'standard',
): ReadingRequest {
  const cards: ReadingRequestCard[] = spread.positions
    .map((pos) => {
      const placed = session.placements.find((p) => p.positionId === pos.id)
      if (!placed || !placed.revealed) return null
      const entry = session.deck[placed.deckIndex]
      if (!entry) return null
      return {
        positionId: pos.id,
        cardId: entry.cardId,
        orientation: entry.orientation,
      } satisfies ReadingRequestCard
    })
    .filter((c): c is ReadingRequestCard => c !== null)

  return {
    sessionId: session.id,
    question: effectiveQuestion(session),
    mode: session.mode,
    theme: session.theme,
    spreadId: spread.id,
    cards,
    readingMode,
  }
}

/** 牌是否已经全部翻开 —— 只有为 true 时才允许请求解读（AC-V2-01） */
export function isReadyForReading(session: TarotSession, spread: Spread): boolean {
  return (
    session.placements.length === spread.cardCount &&
    session.placements.every((p) => p.revealed)
  )
}
