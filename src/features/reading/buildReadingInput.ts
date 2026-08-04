/**
 * 把 TarotSession 转成 Reading / Follow-up 需要的输入。
 *
 * 【AC-12】Context 严格只含：当前问题、牌阵、卡牌+正逆位、当前 Reading。
 * 这里是唯一的组装点 —— 历史日记永远进不来，从类型上就没有入口。
 */

import type { TarotSession } from '@/types/session'
import type { Spread } from '@/types/spread'
import type { ReadingInput, ReadingPlacement } from './mockReading'
import type { FollowUpContext } from './followUp'

/** 用户最终采用的问题：接受了优化就用优化版，否则用原问题 */
export function effectiveQuestion(session: TarotSession): string {
  if (session.usedOptimized && session.optimizedQuestion) return session.optimizedQuestion
  return session.question
}

/** 按牌阵牌位顺序排列（而不是用户摆放的顺序），让解读结构稳定 */
export function orderedPlacements(session: TarotSession, spread: Spread): ReadingPlacement[] {
  return spread.positions
    .map((pos) => {
      const placed = session.placements.find((p) => p.positionId === pos.id)
      if (!placed) return null
      const entry = session.deck[placed.deckIndex]
      if (!entry) return null
      return { positionId: pos.id, cardId: entry.cardId, orientation: entry.orientation }
    })
    .filter((p): p is ReadingPlacement => p !== null)
}

export function buildReadingInput(session: TarotSession, spread: Spread): ReadingInput {
  return {
    question: effectiveQuestion(session),
    spreadId: spread.id,
    placements: orderedPlacements(session, spread),
    mode: session.mode,
    theme: session.theme,
  }
}

export function buildFollowUpContext(session: TarotSession, spread: Spread): FollowUpContext | null {
  if (!session.reading) return null
  return {
    question: effectiveQuestion(session),
    spreadId: spread.id,
    cards: orderedPlacements(session, spread),
    reading: session.reading,
  }
}
