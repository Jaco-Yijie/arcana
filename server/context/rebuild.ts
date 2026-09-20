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
  ContextIntakeAnswer,
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
import { localizeCard } from '../../src/data/deck/localized.ts'
import { LOCALE_OF, normalizeLanguage, positionLabel, positionMeaning, spreadDescription, spreadName } from '../i18n.ts'
import { DOMAIN_LABEL_EN } from '../../src/features/reading/domainMeaning.ts'
import type { SpreadId } from '../../src/types/spread.ts'

export class ContextError extends Error {}

/**
 * 领域牌义的语言名。
 * `selectDomainMeaning` 拿到的已经是本地化后的牌义文本（我们把覆盖层
 * 合进了 card），但它填进去的 label 恒为中文 —— 那是给模型看的字段名，
 * 英文输出时要跟着换，否则 Prompt 里会出现「Career: 工作事业」这种混排。
 */
function localizeDomainMeaning(
  meaning: ReturnType<typeof selectDomainMeaning>,
  language: ReturnType<typeof normalizeLanguage>,
) {
  if (!meaning) return null
  if (language === 'zh') return meaning
  return { ...meaning, label: DOMAIN_LABEL_EN[meaning.domain] ?? meaning.label }
}

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
  /* 输出语言。它必须在建卡之前定下来 —— 每张牌的牌名、牌义、
     牌位名都按它取，晚一步就得回头重算。 */
  const language = normalizeLanguage(request.language)
  const locale = LOCALE_OF[language]

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

    /* 输出语言下的那一份牌义。中文时它就是语义层原值（零拷贝投影），
       英文时来自 78 张齐全的覆盖层。见 src/data/deck/localized.ts */
    const text = localizeCard(card, locale)

    return {
      cardId: card.id,
      cardName: card.name,
      cardNameZh: card.nameZh,
      displayName: text.name,
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
        name: positionLabel(language, spread.id, pos.id),
        meaning: positionMeaning(language, spread.id, pos.id),
        index,
        /* deprecated 别名，与上面三者永远同值。留着是为了不让尚未迁移的
           读取方突然拿到 undefined —— 一次改名不值得引发一次线上事故。 */
        positionId: pos.id,
        positionName: positionLabel(language, spread.id, pos.id),
        positionMeaning: positionMeaning(language, spread.id, pos.id),
      },
      baseMeaning: {
        upright: text.meaningUpright,
        reversed: text.meaningReversed,
      },
      /* 按问题类型选一段既有的领域牌义。**不生成任何文本，只是选取。**
         选取只依赖 cardId 与 questionCategory，与 deckId 无关 ——
         换牌组时这个字段逐字节不变。 */
      domainMeaning: localizeDomainMeaning(
        selectDomainMeaning({ ...card, ...text }, questionCategory),
        language,
      ),
      keywords: {
        upright: [...text.keywordsUpright],
        reversed: [...text.keywordsReversed],
      },
      symbols: [...text.symbols],
    }
  })

  const question = question0
  const mode = mode0
  // 安全边界由服务端判定并原样透传，模型无权改写
  const risk = detectRisk(question, language)

  return {
    sessionId: String(request.sessionId ?? ''),
    language,
    question,
    questionCategory,
    mode,
    theme: request.theme ?? null,
    spread: {
      spreadId: spread.id,
      spreadName: spreadName(language, spread.id),
      description: spreadDescription(language, spread.id),
      cardCount: spread.cardCount,
    },
    cards,
    stats: computeStats(cards),
    // 用户选的模式。默认 standard —— 不替用户决定要不要多花一分钟
    readingMode: request.readingMode === 'deep' ? 'deep' : 'standard',
    // 只记录，不参与任何判断。写进 Prompt 是明确禁止的（见 ReadingContext.deckId）
    deckId: typeof request.deckId === 'string' ? request.deckId.slice(0, 32) : null,
    safetyNotice: risk.notice,
    riskCategories: risk.categories,
    ...(mode === 'question' ? sanitizeUserContext(request.userContext) : {}),
  }
}

/* ── 解读前背景提问的回答 ─────────────────────────────────────────
 * 这些文字来自浏览器，和用户问题一样是**用户提供的数据**：
 * 限条数、限长度、去掉不完整的条目，但不改写内容。
 * 只保留实际回答的题；一题都没有时整个字段不出现，Prompt 里那一节也就不存在。 */
const USER_CONTEXT_LIMITS = { maxAnswers: 4, maxQuestionChars: 80, maxLabelChars: 40, maxIdChars: 40 }

function sanitizeUserContext(raw: unknown): { userContext?: ContextIntakeAnswer[] } {
  const answers = (raw as { answers?: unknown } | undefined)?.answers
  if (!Array.isArray(answers)) return {}
  const out: ContextIntakeAnswer[] = []
  const seen = new Set<string>()
  for (const item of answers) {
    if (out.length >= USER_CONTEXT_LIMITS.maxAnswers) break
    if (typeof item !== 'object' || item === null) continue
    const a = item as Record<string, unknown>
    const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')
    const questionId = text(a.questionId, USER_CONTEXT_LIMITS.maxIdChars)
    const question = text(a.question, USER_CONTEXT_LIMITS.maxQuestionChars)
    const selectedOptionId = text(a.selectedOptionId, USER_CONTEXT_LIMITS.maxIdChars)
    const selectedOptionLabel = text(a.selectedOptionLabel, USER_CONTEXT_LIMITS.maxLabelChars)
    if (!questionId || !question || !selectedOptionLabel || seen.has(questionId)) continue
    seen.add(questionId)
    out.push({ questionId, question, selectedOptionId, selectedOptionLabel })
  }
  return out.length > 0 ? { userContext: out } : {}
}
