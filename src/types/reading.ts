/**
 * V2 解读引擎的类型契约（客户端与服务端共享）。
 *
 * 【本文件是 Frontend / Backend / Prompt 三方的唯一接口】
 * 客户端用 `@/types/reading` 导入；服务端用相对路径 `../src/types/reading.ts` 导入。
 * 这里只有类型，没有运行时代码 —— 所以服务端 import 它不会引入任何前端依赖。
 *
 * 【最高优先原则在本文件的体现】
 * `ReadingContext` 是**只读的既成事实**：牌、正逆位、牌位在用户抽完之后就已经确定，
 * 这里只是把它们如实转述给 LLM。LLM 的输出（`StructuredReading`）里
 * **没有任何字段能够改变牌面** —— 它只能返回文字解释。
 * 想让 LLM 换一张牌，在类型上就无处可写。
 */

import type { Arcana, Orientation, Suit } from './tarot'
import type { RandomThemeId, SessionMode } from './session'

/* ═══════════════════════════════════════════════════════════════════
 * 输入：ReadingContext —— 发给 LLM 的既成事实
 * ═══════════════════════════════════════════════════════════════ */

/**
 * 元素。小阿卡纳由花色派生；大阿卡纳记为 `spirit`。
 *
 * 为什么大阿卡纳不硬套四元素：传统体系里大阿卡纳的元素归属依赖占星对应，
 * 各家不一致。V2 不重写 78 张牌数据（本轮明确不做），与其编造，
 * 不如显式标成 `spirit` 并在 Prompt 里告诉模型「大阿卡纳不参与花色元素统计」。
 */
export type TarotElement = 'fire' | 'water' | 'air' | 'earth' | 'spirit'

export const SUIT_ELEMENT: Record<Suit, TarotElement> = {
  wands: 'fire',
  cups: 'water',
  swords: 'air',
  pentacles: 'earth',
}

/** 问题类别。用于让模型知道该往哪个生活面向落地，不用于做任何预测。 */
export type QuestionCategory =
  | 'relationship'
  | 'career'
  | 'study'
  | 'finance'
  | 'decision'
  | 'self'
  | 'general'

/** 牌位信息 */
export interface ReadingContextPosition {
  positionId: string
  positionName: string
  positionMeaning: string
  /** 在牌阵中的顺序，0 起。用于「开始 → 中间 → 结尾」的叙事推进。 */
  index: number
}

/** 一张已经抽定的牌。所有字段都来自本地 78 张牌数据，不让模型自己回忆牌义。 */
export interface ReadingContextCard {
  cardId: string
  cardName: string
  cardNameZh: string
  arcana: Arcana
  /** 大阿卡纳为 null */
  suit: Suit | null
  number: number
  element: TarotElement
  orientation: Orientation
  position: ReadingContextPosition
  baseMeaning: {
    upright: string
    reversed: string
  }
  keywords: {
    upright: string[]
    reversed: string[]
  }
  /** 象征元素，给模型一点具体意象可抓，避免空泛 */
  symbols: string[]
}

export interface ReadingContextSpread {
  spreadId: string
  spreadName: string
  description: string
  cardCount: number
}

/**
 * 预先算好的牌面统计。
 *
 * 【为什么要服务端算好再喂给模型】
 * 用户对 V1 最主要的不满是「每张牌彼此独立、缺组合分析」。而组合分析的前提是数得对 ——
 * 语言模型数「有几张逆位、哪个花色重复了」是出了名的不可靠。
 * 与其让它自己数错再据此长篇发挥，不如把事实摆在它面前，让它只负责**解释**这些事实。
 */
export interface ReadingStats {
  total: number
  majorCount: number
  minorCount: number
  uprightCount: number
  reversedCount: number
  /** 花色 → 张数，只统计小阿卡纳 */
  suitCounts: Partial<Record<Suit, number>>
  /** 元素 → 张数，`spirit` 即大阿卡纳，不参与四元素冲突判断 */
  elementCounts: Partial<Record<TarotElement, number>>
  /** 出现两次及以上的数字 */
  repeatedNumbers: number[]
}

export interface ReadingContext {
  sessionId: string
  /** 用户最终采用的问题（原问题或其接受的优化版）。随缘模式可为空串。 */
  question: string
  questionCategory: QuestionCategory
  mode: SessionMode
  /** 随缘模式的轻主题 */
  theme: RandomThemeId | null
  spread: ReadingContextSpread
  /** 顺序即牌位顺序 */
  cards: ReadingContextCard[]
  stats: ReadingStats
  /** 命中安全边界时的提示，由服务端原样透传到输出，不交给模型改写 */
  safetyNotice: string | null
}

/* ═══════════════════════════════════════════════════════════════════
 * 输出：StructuredReading —— 结构化解读
 * ═══════════════════════════════════════════════════════════════ */

/**
 * 关系类型。用于让模型自己声明「这条关系是基于什么发现的」，
 * 也让 QA 能客观检查关系分析是不是真的做了，而不是拿两张牌名硬凑一句话。
 */
export type RelationshipKind =
  | 'major-density'
  | 'minor-density'
  | 'suit-repetition'
  | 'element-repetition'
  | 'element-conflict'
  | 'number-pattern'
  | 'orientation-balance'
  | 'neighbouring'
  | 'arc'
  | 'supporting'
  | 'conflicting'
  | 'turning-point'
  | 'dominant-theme'

export interface ReadingRelationship {
  /** 涉及的 cardId。允许 1 张（如整体正逆位比例）到 N 张 */
  cards: string[]
  kind: RelationshipKind
  interpretation: string
}

export interface StructuredReadingCard {
  cardId: string
  cardName: string
  position: string
  orientation: Orientation
  /** 这张牌落在这个牌位上意味着什么（不是牌义字典条目） */
  interpretation: string
  /** 它与用户这个具体问题的关联 */
  connectionToQuestion: string
}

export type ReadingProviderId = 'mock' | 'deepseek'

export interface ReadingMeta {
  provider: ReadingProviderId
  /** mock 时为 null */
  model: string | null
  generatedAt: number
  latencyMs: number
  /**
   * 输出经过服务端修复才达标（例如模型漏了字段、关系引用了不存在的 cardId 被剔除）。
   * 前端不需要因此报错，但 QA 需要看得见。
   */
  repaired: boolean
  /** 命中语气红线被服务端处理过 */
  toneAdjusted: boolean
  /**
   * 为什么这份解读不是来自 LLM。
   * 只有 `provider === 'mock'` 时才有意义 —— UI 必须据此给出**准确**的原因，
   * 而不是一律说「未配置 API Key」：Key 配好了但模型措辞没过语气红线时，
   * 那句话会把人引到完全错误的排查方向上去。
   */
  fallbackReason?: 'no-api-key' | 'tone-guard' | 'unreachable' | null
}

export interface StructuredReading {
  version: 2
  readingTheme: string
  overallEnergy: string
  cards: StructuredReadingCard[]
  relationships: ReadingRelationship[]
  narrative: string
  answerToQuestion: string
  reflectionQuestions: string[]
  /** 由服务端从 ReadingContext 透传，模型无权改写 */
  safetyNotice: string | null
  meta: ReadingMeta
}

/* ═══════════════════════════════════════════════════════════════════
 * 传输契约
 * ═══════════════════════════════════════════════════════════════ */

/**
 * 错误码。前端据此决定「能不能重试 / 要不要降级到 Mock / 给用户看什么话」。
 * 任何一种都不得导致重新抽牌。
 */
export type ReadingErrorCode =
  | 'missing-api-key'
  | 'unauthorized'
  | 'forbidden'
  | 'rate-limited'
  | 'upstream-error'
  | 'network-error'
  | 'timeout'
  | 'invalid-json'
  | 'empty-response'
  | 'schema-invalid'
  | 'bad-request'
  | 'unknown'

export interface ReadingError {
  code: ReadingErrorCode
  /** 给用户看的中文文案，已经是可直接渲染的成品 */
  message: string
  /** 同样的输入再试一次有没有意义 */
  retryable: boolean
  /** 允许前端退回本地 Mock 解读（牌不变） */
  canFallbackToMock: boolean
  /**
   * 简短的排查线索（例如「牌数与牌阵不符」）。
   * **只放我们自己写的原因，绝不放上游返回的原始报文** —— 那可能带上账号或密钥相关信息。
   */
  detail?: string
}

export type ReadingResponse =
  | { ok: true; reading: StructuredReading }
  | { ok: false; error: ReadingError }

/**
 * 客户端 → 服务端的请求体。
 *
 * 【刻意做得很薄】
 * 客户端**一个字的牌义都不传**，只传「哪个牌位、哪张牌、什么朝向」。
 * 牌义、关键词、元素、统计全部由服务端用它自己那份 78 张牌数据重新解析。
 *
 * 两个好处：
 *   1. 模型永远拿不到被篡改或臆造的牌义；
 *   2. 服务端手里有唯一真值，`AC-V2-10`（校验模型有没有偷偷换牌）才有基准可比。
 *
 * 同时这也是 Retry 能「逐字节相同」的原因 —— 载荷里没有任何时间戳或派生内容。
 */
export interface ReadingRequestCard {
  positionId: string
  cardId: string
  orientation: Orientation
}

export interface ReadingRequest {
  sessionId: string
  question: string
  mode: SessionMode
  theme: RandomThemeId | null
  spreadId: string
  /** 顺序即牌位顺序 */
  cards: ReadingRequestCard[]
}

/** `GET /api/tarot/config` —— 让前端知道服务端当前用哪个 Provider，避免前端持有任何密钥相关配置 */
export interface ReadingConfigResponse {
  provider: ReadingProviderId
  model: string | null
  /** 服务端是否具备真正调用 DeepSeek 的条件（有 Key） */
  ready: boolean
}
