/**
 * 客户端本地 Mock —— 只在「完全连不上后端」且处于开发模式时使用。
 *
 * 它复用 V1 的 `generateReading()`，然后升维成 V2 结构，
 * 让 Reading 页在没有后端的情况下也能渲染完整的 V2 布局。
 * `meta.provider` 如实标成 `mock`，UI 会据此显示提示 —— 绝不伪装成真解读。
 */

import type { ReadingRequest, StructuredReading, StructuredReadingCard } from '@/types/reading'
import type { SpreadId } from '@/types/spread'
import { generateReading } from './mockReading'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'

export function localMockReading(request: ReadingRequest): StructuredReading {
  const startedAt = Date.now()
  const spread = getSpread(request.spreadId as SpreadId)

  const v1 = generateReading({
    question: request.question,
    spreadId: spread.id,
    placements: request.cards.map((c) => ({
      positionId: c.positionId,
      cardId: c.cardId,
      orientation: c.orientation,
    })),
    mode: request.mode,
    theme: request.theme,
  })

  const cards: StructuredReadingCard[] = request.cards.map((c) => {
    const pos = spread.positions.find((p) => p.id === c.positionId)
    const card = getCard(c.cardId)
    const analysis = v1.cardAnalyses.find((a) => a.cardId === c.cardId)
    return {
      cardId: c.cardId,
      cardName: card.nameZh,
      position: pos?.label ?? c.positionId,
      orientation: c.orientation,
      interpretation:
        analysis?.text ??
        (c.orientation === 'upright' ? card.meaningUpright : card.meaningReversed),
      connectionToQuestion: pos
        ? `这张牌落在「${pos.label}」上，指向的是${pos.meaning}`
        : '',
    }
  })

  return {
    version: 2,
    // 短标题：headline[0] 是整段话，当标题渲染会很难看
    readingTheme: `${spread.name} · 本地示例解读`,
    overallEnergy: [v1.headline[0], v1.headline[1]].filter(Boolean).join('\n\n') || v1.trend,
    cards,
    relationships: v1.relations.map((text, i) => ({
      cards: request.cards.map((c) => c.cardId).slice(0, Math.max(2, i + 1)),
      kind: 'dominant-theme' as const,
      interpretation: text,
    })),
    narrative: v1.trend,
    answerToQuestion: v1.watchOut[0] ?? v1.trend,
    reflectionQuestions: v1.actions.slice(0, 4),
    safetyNotice: v1.safetyNotice,
    meta: {
      provider: 'mock',
      model: null,
      generatedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
      repaired: false,
      toneAdjusted: false,
      fallbackReason: 'unreachable',
    },
  }
}
