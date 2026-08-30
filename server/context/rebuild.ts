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
import { selectDomainMeaning } from '../../src/features/reading/domainMeaning.ts'
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

  /* 问题分类必须在建卡之前算出来 —— 每张牌要按它挑领域牌义。
     原来这一行在 return 语句里（建卡之后），所以分类结果压根传不进卡片，
     78 张牌各自写好的 love / career / study / finance 就全被丢掉了：
     模型被告知「这是事业问题」，却只拿到通用牌义。 */
  const question0 = typeof request.question === 'string' ? request.question.trim() : ''
  const mode0 = request.mode === 'random' ? 'random' : 'question'
  const questionCategory = classifyQuestion(
    question0,
    mode0,
    request.theme ?? null,
  ) as QuestionCategory

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
      /* 元素：牌上写了就用牌上的，否则按花色推。
         大阿卡纳没有花色，此前一律被兜底成 'spirit' —— 22 张大牌的元素其实是假的。
         现在 5 张代表牌写了真值（愚者/魔术师/恋人=风，女祭司/死神=水）。 */
      element: card.element ?? (card.suit ? SUIT_ELEMENT[card.suit] : 'spirit'),
      orientation: incoming.orientation,
      position: {
        id: pos.id,
        name: pos.label,
        meaning: pos.meaning,
        index,
        /* deprecated 别名，与上面三者永远同值。留着是为了不让尚未迁移的
           读取方突然拿到 undefined —— 一次改名不值得引发一次线上事故。 */
        positionId: pos.id,
        positionName: pos.label,
        positionMeaning: pos.meaning,
      },
      baseMeaning: {
        upright: card.meaningUpright,
        reversed: card.meaningReversed,
      },
      /* 按问题类型选一段既有的领域牌义。**不生成任何文本，只是选取。**
         选取只依赖 cardId 与 questionCategory，与 deckId 无关 ——
         换牌组时这个字段逐字节不变。 */
      domainMeaning: selectDomainMeaning(card, questionCategory),
      keywords: {
        upright: card.keywordsUpright,
        reversed: card.keywordsReversed,
      },
      symbols: card.symbols,
    }
  })

  const question = question0
  const mode = mode0
  // 安全边界由服务端判定并原样透传，模型无权改写
  const risk = detectRisk(question)

  return {
    sessionId: String(request.sessionId ?? ''),
    question,
    questionCategory,
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
    // 只记录，不参与任何判断。写进 Prompt 是明确禁止的（见 ReadingContext.deckId）
    deckId: typeof request.deckId === 'string' ? request.deckId.slice(0, 32) : null,
    safetyNotice: risk.notice,
  }
}
