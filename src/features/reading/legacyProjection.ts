/**
 * V2 `StructuredReading` → V1 `Reading` 的投影。
 *
 * 【为什么需要它】
 * `session.reading`（V1 结构）被四个地方直接消费：
 *   - `journalStore.toSummary()` → `reading.headline[0]`
 *   - `JournalDetailPage`        → `reading.headline`
 *   - `SharePage`                → `reading.headline[0]`
 *   - Reading 页的 V1 渲染分支
 * 而 localStorage 里已经躺着一批 V1 结构的历史日记。
 *
 * 所以 V2 的做法不是「换掉 Reading 结构」，而是**两份都写**：
 * 结构化解读存进 `session.structuredReading` 供 Reading 页渲染，
 * 同时投影出一份 V1 `Reading` 存进 `session.reading`，
 * 让上面四个消费点**一行都不用改**，新旧记录也能在同一个列表里共存。
 */

import type { CardAnalysis, Reading } from '@/types/session'
import type { ReadingRequest, StructuredReading } from '@/types/reading'
import type { Spread } from '@/types/spread'

export function toLegacyReading(
  structured: StructuredReading,
  request: ReadingRequest,
  spread: Spread,
): Reading {
  const positionIdOf = new Map(request.cards.map((c) => [c.cardId, c.positionId]))
  const labelOf = new Map(spread.positions.map((p) => [p.id, p.label]))

  const cardAnalyses: CardAnalysis[] = structured.cards.map((c) => {
    const positionId = positionIdOf.get(c.cardId) ?? c.position
    return {
      positionId,
      positionLabel: labelOf.get(positionId) ?? c.position,
      cardId: c.cardId,
      orientation: c.orientation,
      // V1 每张牌只有一段文字，这里把「这张牌的解释」与「它与问题的关联」合并
      text: [c.interpretation, c.connectionToQuestion].filter(Boolean).join('\n\n'),
    }
  })

  return {
    generatedAt: structured.meta.generatedAt,
    // V1 的 headline 是「先短后长」里的那个短：主题 + 整体基调
    headline: [structured.readingTheme, structured.overallEnergy].filter(
      (s): s is string => typeof s === 'string' && s.trim().length > 0,
    ),
    cardAnalyses,
    relations: structured.relationships.map((r) => r.interpretation),
    trend: structured.narrative,
    // V1 的 watchOut 在 V2 里没有直接对应项，用「对问题的回答」兜底，保证详情页不空
    watchOut: structured.answerToQuestion ? [structured.answerToQuestion] : [],
    actions: structured.reflectionQuestions,
    safetyNotice: structured.safetyNotice,
  }
}
