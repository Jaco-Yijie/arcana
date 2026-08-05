/**
 * ReadingRequest → ReadingContext。
 *
 * 【服务端不信任客户端发来的牌义】
 * 客户端只发「哪个牌位、哪张牌、什么朝向」。牌义、关键词、象征、元素、统计
 * 全部在这里用服务端自己那份 78 张牌数据重新解析。
 *
 * 两个后果，都是我们要的：
 *   1. 模型永远拿不到被篡改或臆造的牌义；
 *   2. 服务端手里有唯一真值，才谈得上「校验模型有没有偷偷换牌」（AC-V2-10）。
 *
 * 任何 cardId / spreadId / positionId 对不上本地数据 → 直接 `bad-request`，不发给模型。
 */

import type {
  QuestionCategory,
  ReadingContext,
  ReadingContextCard,
  ReadingRequest,
  ReadingStats,
  TarotElement,
} from '../../src/types/reading.ts'
import { SUIT_ELEMENT } from '../../src/types/reading.ts'
import type { Suit } from '../../src/types/tarot.ts'
import { cardById } from '../../src/data/deck/index.ts'
import { spreadById } from '../../src/data/spreads.ts'
import { classifyQuestion } from '../../src/features/reading/questionCategory.ts'
import { detectRisk } from '../../src/features/reading/safety.ts'
import type { SpreadId } from '../../src/types/spread.ts'

export class ContextError extends Error {}

function computeStats(cards: ReadingContextCard[]): ReadingStats {
  const suitCounts: Partial<Record<Suit, number>> = {}
  const elementCounts: Partial<Record<TarotElement, number>> = {}
  const numberSeen = new Map<number, number>()

  let majorCount = 0
  let reversedCount = 0

  for (const c of cards) {
    if (c.arcana === 'major') majorCount += 1
    if (c.orientation === 'reversed') reversedCount += 1
    if (c.suit) suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1
    elementCounts[c.element] = (elementCounts[c.element] ?? 0) + 1
    numberSeen.set(c.number, (numberSeen.get(c.number) ?? 0) + 1)
  }

  return {
    total: cards.length,
    majorCount,
    minorCount: cards.length - majorCount,
    uprightCount: cards.length - reversedCount,
    reversedCount,
    suitCounts,
    elementCounts,
    repeatedNumbers: [...numberSeen.entries()]
      .filter(([, n]) => n >= 2)
      .map(([num]) => num)
      .sort((a, b) => a - b),
  }
}

export function rebuildContext(request: ReadingRequest): ReadingContext {
  const spread = spreadById[request.spreadId as SpreadId]
  if (!spread) throw new ContextError(`未知牌阵：${request.spreadId}`)

  if (!Array.isArray(request.cards) || request.cards.length === 0) {
    throw new ContextError('没有可解读的牌')
  }
  if (request.cards.length !== spread.cardCount) {
    throw new ContextError(
      `牌数与牌阵不符：牌阵需要 ${spread.cardCount} 张，收到 ${request.cards.length} 张`,
    )
  }

  const seenPositions = new Set<string>()
  const seenCards = new Set<string>()

  // 按牌阵定义的牌位顺序重建，客户端传来的顺序不作数
  const cards: ReadingContextCard[] = spread.positions.map((pos, index) => {
    const incoming = request.cards.find((c) => c.positionId === pos.id)
    if (!incoming) throw new ContextError(`牌位缺失：${pos.id}`)
    if (seenPositions.has(pos.id)) throw new ContextError(`牌位重复：${pos.id}`)
    seenPositions.add(pos.id)

    if (incoming.orientation !== 'upright' && incoming.orientation !== 'reversed') {
      throw new ContextError(`非法正逆位：${String(incoming.orientation)}`)
    }

    const card = cardById[incoming.cardId]
    if (!card) throw new ContextError(`未知卡牌：${incoming.cardId}`)
    if (seenCards.has(card.id)) throw new ContextError(`同一张牌出现了两次：${card.id}`)
    seenCards.add(card.id)

    return {
      cardId: card.id,
      cardName: card.name,
      cardNameZh: card.nameZh,
      arcana: card.arcana,
      suit: card.suit ?? null,
      number: card.number,
      element: card.suit ? SUIT_ELEMENT[card.suit] : 'spirit',
      orientation: incoming.orientation,
      position: {
        positionId: pos.id,
        positionName: pos.label,
        positionMeaning: pos.meaning,
        index,
      },
      baseMeaning: {
        upright: card.meaningUpright,
        reversed: card.meaningReversed,
      },
      keywords: {
        upright: card.keywordsUpright,
        reversed: card.keywordsReversed,
      },
      symbols: card.symbols,
    }
  })

  const question = typeof request.question === 'string' ? request.question.trim() : ''
  const mode = request.mode === 'random' ? 'random' : 'question'
  // 安全边界由服务端判定并原样透传，模型无权改写
  const risk = detectRisk(question)

  return {
    sessionId: String(request.sessionId ?? ''),
    question,
    questionCategory: classifyQuestion(question, mode, request.theme ?? null) as QuestionCategory,
    mode,
    theme: request.theme ?? null,
    spread: {
      spreadId: spread.id,
      spreadName: spread.name,
      description: spread.description,
      cardCount: spread.cardCount,
    },
    cards,
    stats: computeStats(cards),
    // 用户选的模式。默认 standard —— 不替用户决定要不要多花一分钟
    readingMode: request.readingMode === 'deep' ? 'deep' : 'standard',
    safetyNotice: risk.notice,
  }
}
