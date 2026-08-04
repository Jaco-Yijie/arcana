/**
 * MockReadingProvider。
 *
 * 【为什么不重写一套文案】
 * 直接复用 V1 的 `generateReading()`，再把它「升维」成 V2 的结构化形状。
 * 另写一套句式池必然会和 V1 漂移，而 V1 那套是经过语气红线审计的。
 *
 * 它的价值不只是「没有 Key 也能跑 UI」，更是让整条契约链路
 * （重建上下文 → 校验 → 投影 → 错误码 → 前端渲染）能在零 token 成本下反复测试。
 */

import type {
  ReadingContext,
  ReadingRelationship,
  StructuredReading,
  StructuredReadingCard,
} from '../../src/types/reading.ts'
import type { ProviderResult, ReadingProvider } from './types.ts'
import { generateReading } from '../../src/features/reading/mockReading.ts'
import type { ReadingPlacement } from '../../src/features/reading/mockReading.ts'
import type { SpreadId } from '../../src/types/spread.ts'

/** 由服务端已经算好的 stats 直接生成关系条目，不猜、不硬凑 */
function deriveRelationships(context: ReadingContext): ReadingRelationship[] {
  const out: ReadingRelationship[] = []
  const { stats, cards } = context
  if (cards.length < 2) return out

  for (const [suit, count] of Object.entries(stats.suitCounts)) {
    if ((count ?? 0) >= 2) {
      const involved = cards.filter((c) => c.suit === suit)
      out.push({
        cards: involved.map((c) => c.cardId),
        kind: 'suit-repetition',
        interpretation: `同一花色在这次牌面里出现了 ${count} 次（${involved
          .map((c) => `「${c.position.positionName}」的${c.cardNameZh}`)
          .join('、')}）。如果把这几张牌联系起来看，它们更像是在反复指向同一类处境，而不是各说各的。`,
      })
    }
  }

  if (stats.majorCount >= Math.ceil(cards.length / 2) && stats.majorCount >= 2) {
    out.push({
      cards: cards.filter((c) => c.arcana === 'major').map((c) => c.cardId),
      kind: 'major-density',
      interpretation: `${cards.length} 张里有 ${stats.majorCount} 张大阿卡纳。这组牌更倾向于在谈一个阶段性的、你未必能完全控制节奏的主题，而不是某个具体的日常安排。`,
    })
  }

  if (stats.reversedCount > 0 && stats.reversedCount === cards.length) {
    out.push({
      cards: cards.map((c) => c.cardId),
      kind: 'orientation-balance',
      interpretation: `所有牌都是逆位。这里值得注意的是：与其把它读成「事情不顺」，不如理解为当前的力气可能用在了不太顺的方向上，调整的空间也在这里。`,
    })
  }

  if (out.length === 0) {
    // 兜底：相邻牌位对照。多张牌阵至少要有一条关系（校验器要求）
    const [a, b] = [cards[0]!, cards[cards.length - 1]!]
    out.push({
      cards: [a.cardId, b.cardId],
      kind: 'arc',
      interpretation: `从「${a.position.positionName}」的${a.cardNameZh}到「${b.position.positionName}」的${b.cardNameZh}，这条线索的落点发生了变化。在你当前的问题背景下，这个变化本身比任何一张牌单独的含义更值得看。`,
    })
  }

  return out
}

/** 一句话主题。用牌阵名 + 牌面最突出的特征，保证短。 */
function shortTheme(context: ReadingContext): string {
  const { stats, spread } = context
  if (stats.total === 1) return `${spread.spreadName} · 一个提醒`
  if (stats.reversedCount === stats.total) return `${spread.spreadName} · 需要调整方向的一组牌`
  if (stats.reversedCount === 0) return `${spread.spreadName} · 方向比较一致的一组牌`
  if (stats.majorCount >= Math.ceil(stats.total / 2)) return `${spread.spreadName} · 阶段性的主题`
  return `${spread.spreadName} · 正在变化中的局面`
}

export class MockReadingProvider implements ReadingProvider {
  readonly id = 'mock' as const
  readonly model = null

  async generate(context: ReadingContext): Promise<ProviderResult> {
    const startedAt = Date.now()

    const placements: ReadingPlacement[] = context.cards.map((c) => ({
      positionId: c.position.positionId,
      cardId: c.cardId,
      orientation: c.orientation,
    }))

    const v1 = generateReading({
      question: context.question,
      spreadId: context.spread.spreadId as SpreadId,
      placements,
      mode: context.mode,
      theme: context.theme,
    })

    const cards: StructuredReadingCard[] = context.cards.map((c) => {
      const analysis = v1.cardAnalyses.find((a) => a.cardId === c.cardId)
      return {
        cardId: c.cardId,
        cardName: c.cardNameZh,
        position: c.position.positionName,
        orientation: c.orientation,
        interpretation: analysis?.text ?? (c.orientation === 'upright' ? c.baseMeaning.upright : c.baseMeaning.reversed),
        connectionToQuestion: context.question
          ? `在你当前的问题背景下，这张牌落在「${c.position.positionName}」上，更接近于在提醒你留意${c.position.positionMeaning}`
          : `这张牌落在「${c.position.positionName}」上，指向的是${c.position.positionMeaning}`,
      }
    })

    const reading: StructuredReading = {
      version: 2,
      // readingTheme 是当标题渲染的，必须短。V1 的 headline[0] 是整段话，放到 overallEnergy 才对。
      readingTheme: shortTheme(context),
      overallEnergy: [v1.headline[0], v1.headline[1]].filter(Boolean).join('\n\n') || v1.trend,
      cards,
      relationships: deriveRelationships(context),
      narrative: v1.trend,
      answerToQuestion: v1.watchOut[0] ?? v1.trend,
      reflectionQuestions: v1.actions.slice(0, 4),
      safetyNotice: context.safetyNotice,
      meta: {
        provider: 'mock',
        model: null,
        generatedAt: Date.now(),
        latencyMs: Date.now() - startedAt,
        repaired: false,
        toneAdjusted: false,
        fallbackReason: 'no-api-key',
      },
    }

    return { ok: true, reading }
  }
}
