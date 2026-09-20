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
import type { LanguageCode } from '@/i18n/types'
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

/**
 * 解读模式 —— 由**用户**选择，不是系统替他决定。
 *
 * standard  更快拿到完整的牌面分析（thinking disabled）
 * deep      花更多时间综合牌与牌之间的关系、矛盾和隐藏线索（thinking enabled）
 *
 * 注意 standard **不等于**短、浅、保守 —— 它同样要有完整分析、牌位、正逆位、
 * 牌间关系、叙事，并真正回答问题，只是不过度探索次级象征。
 */
export type ReadingMode = 'standard' | 'deep'

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
/**
 * 牌位信息。
 *
 * 【为什么字段是 id / name / meaning 而不是 positionId / positionName / …】
 * 它已经嵌在 `position` 下面了，前缀纯属重复。更重要的是模型输出侧只有一个
 * 模糊的 `position: string`（存的是中文名），两边一对照就分不清
 * 「position 到底指 id 还是 name」。现在入参侧三者各有其名，不再有歧义。
 *
 * 旧的三个带前缀的字段作为 **deprecated 别名保留** —— 它们仍被赋值，
 * 所以任何还没改过来的读取方不会突然拿到 undefined。
 * 历史 session / 日记里存的是模型**输出**（`StructuredReadingCard.position`），
 * 那个字段一个字都没动，历史数据零迁移。
 */
export interface ReadingContextPosition {
  /** 牌位 id，例如 'guidance' / 'past' */
  id: string
  /** 牌位名，例如 '指引' */
  name: string
  /** 这一格关心什么 */
  meaning: string
  /** 在牌阵中的顺序，0 起。用于「开始 → 中间 → 结尾」的叙事推进。 */
  index: number

  /** @deprecated 用 `id`。保留仅为兼容尚未迁移的读取方 */
  positionId: string
  /** @deprecated 用 `name` */
  positionName: string
  /** @deprecated 用 `meaning` */
  positionMeaning: string
}

/** 一张已经抽定的牌。所有字段都来自本地 78 张牌数据，不让模型自己回忆牌义。 */
export interface ReadingContextCard {
  cardId: string
  cardName: string
  cardNameZh: string
  /**
   * 输出语言下的牌名。中文时 = cardNameZh，英文时 = cardName。
   *
   * 【为什么要第三个名字字段，而不是在读取处三元一下】
   * 这个值有两个下游：Prompt（告诉模型这张牌叫什么）与 readingSchema
   * （把 cardName 回填进最终结构，模型说什么都不算数）。
   * 两处必须逐字一致，否则模型写的牌名和界面显示的牌名会对不上。
   * 让 rebuildContext 定一次，比让每个消费方各自判断安全。
   */
  displayName: string
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
  /**
   * 按 questionCategory 选出的领域牌义。
   *
   * 【为什么它必须存在】牌义数据里每张牌都写了五个领域的解释，
   * 但此前只有 Mock provider 读得到 —— 真实 Prompt 只拿到通用牌义，
   * 模型明明被告知「这是事业问题」，却要自己从通用义现推到职业语境，
   * 而我们手上早就有一句专门为职业写好的。这一层把那句话递过去。
   *
   * 【它不改变牌义】只是从既有数据里选取，不生成任何文本。
   * 问题未明确归类（general），或这张牌尚未写该领域时，为 null ——
   * 如实缺席，不找替代。
   *
   * 【它与牌组无关】选取只依赖 cardId 与 questionCategory，
   * 换牌组时这个字段逐字节不变（deck:check 语义不变性断言覆盖）。
   */
  domainMeaning: {
    /** 'love' | 'career' | 'study' | 'finance' | 'personalGrowth' | 'advice' */
    domain: string
    /** 输出语言下的领域名，给模型看的 */
    label: string
    upright: string
    reversed: string
  } | null
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
  /**
   * 解读输出语言。
   *
   * 它决定三件事，缺一不可：
   *   1. Prompt 里那句「你必须使用 X 输出」
   *   2. 递给模型的牌名、牌位名、牌义用哪一份（中文母版 / 英文覆盖层）
   *   3. 安全提示与本地兜底解读的语言
   * 只做 1 而不做 2，会得到一份「英文行文里夹着中文牌名」的解读。
   */
  language: LanguageCode
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
  readingMode: ReadingMode
  /**
   * 抽牌时用的牌组。**Presentation Context only**。
   * Prompt 构造（server/prompts/*）逐字段读取 context，从不整体序列化，
   * 所以这个字段结构上就到不了模型那里。
   */
  deckId: string | null
  /** 命中安全边界时的提示，由服务端原样透传到输出，不交给模型改写 */
  safetyNotice: string | null
  /**
   * V2.4：命中了哪几类高风险话题（服务端关键词判定）。
   * Prompt 据此区分「医疗 / 法律 / 人身安全保持严格」与「其他话题正常给方向」——
   * 只有一句 safetyNotice 时模型分不清是哪一类，只能对所有命中一律保守。
   * 可选：旧的调用方不传时，Prompt 退回按 safetyNotice 的通用处理。
   */
  riskCategories?: ('medical' | 'financial' | 'legal' | 'harm')[]
  /**
   * 用户在解读前主动选择提供的现实背景（已由服务端清洗）。
   * 只包含实际回答的题；没有回答或整页跳过时为空数组 / 不存在 ——
   * Prompt 在这种情况下整段不出现，模型不会知道用户跳过了。
   */
  userContext?: ContextIntakeAnswer[]
}

/* ═══════════════════════════════════════════════════════════════════
 * 解读前动态背景提问（Context Intake）
 *
 * 用户写下问题之后、抽牌之前，按**原问题本身**生成 0–4 道可选的选择题。
 * 完全自愿：可以全答、答一部分、或整页跳过。只有实际回答的内容会进入解读。
 * ═══════════════════════════════════════════════════════════════ */

export interface ContextIntakeOption {
  id: string
  label: string
}

export interface ContextIntakeQuestion {
  id: string
  question: string
  options: ContextIntakeOption[]
}

/** POST /api/tarot/context-questions 的请求体 */
export interface ContextIntakeRequest {
  question: string
  language?: LanguageCode
}

/**
 * 应答。**失败也是 200 + questions: []** 之外的另一种形态：ok=false 只用于排查，
 * 客户端对两者的处理完全一样 —— 直接进入原本的流程，不提示、不阻断。
 */
export type ContextIntakeResponse =
  | { ok: true; questions: ContextIntakeQuestion[]; latencyMs: number }
  | { ok: false; reason: string; latencyMs: number }

/** 用户对一道题的回答。题干与选项文字一并保存：解读时要原样呈现给模型 */
export interface ContextIntakeAnswer {
  questionId: string
  question: string
  selectedOptionId: string
  selectedOptionLabel: string
}

/**
 * 本次解读的用户补充背景。只属于这一次会话 —— 不合并、不跨会话复用、不建画像。
 * skipped=true 表示用户点了「跳过，直接开始」；这一点**不会**告诉解读模型。
 */
export interface ReadingUserContext {
  skipped: boolean
  answers: ContextIntakeAnswer[]
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

/**
 * 另一种同样说得通的读法。
 *
 * 塔罗解读本来就不一定存在唯一叙事 —— 牌与牌冲突时，硬把它们统一成一个结论
 * 反而是失真。这个字段**不是每次都要有**，只在确实存在两种都站得住的解释时出现。
 */
export interface AlternativeInterpretation {
  interpretation: string
  /** 这个读法的依据是牌面上的什么 */
  reason: string
}

/**
 * V2.4：一条可以真正去做的下一步。
 *
 * 解读只描述状态、最后把问题反问给用户 —— 这是 V2.3 真实反馈里最集中的问题。
 * 所以把「判断之后做什么」单独做成结构化字段，而不是指望它混在 answerToQuestion 里。
 */
/**
 * V2.5：一条行动建议背后的牌面证据。
 *
 * 只写 reason 时，模型可以写出「宝剑八说明你被限制了」这种一句话理由 ——
 * 换成任何一张「困难牌」都成立。把证据拆成结构化条目，每条都钉在一张真实抽到的牌、
 * 它的牌位与朝向上，并写出这张牌在这里具体提供了什么信号。
 * cardId 由服务端校验必须是本次抽到的牌；position / orientation 以服务端数据为准。
 */
export interface ReadingActionEvidence {
  cardId: string
  position: string
  orientation: Orientation
  /** 这张牌在这个位置上，为这个动作提供了什么具体信号 */
  signal: string
}

/**
 * V2.5：这次真正影响决定的核心变量。
 *
 * 一副牌平均解释每一张时，解读会退化成「每张牌讲一点」。
 * 先点名一个核心问题，其余内容围绕它组织。
 */
export interface DecisionDriver {
  /** 真正影响决定的那个核心问题（常常不是用户字面上问的那个） */
  coreIssue: string
  /** 为什么它决定了答案 */
  whyItMatters: string
  /** 支撑它的牌面证据，每条指名牌 + 牌位 */
  evidence: string[]
}

export interface ReadingActionItem {
  /** 实际动作，不是「多沟通 / 听从内心」这类空泛建议 */
  action: string
  /** 为什么这个动作适合本次问题（本次的现实情况 + 牌面推导） */
  reason: string
  /**
   * V2.5：支撑这个动作的牌面证据，通常 1–3 条。
   * 可选 —— V2.5 之前存下的解读没有它。
   */
  evidence?: ReadingActionEvidence[]
  /**
   * 可选。只表示行动窗口 / 观察周期 / 验证周期（「接下来两周」），
   * **不是**塔罗对某件事何时发生的预测。
   */
  timeframe?: string
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
  language?: LanguageCode
  provider: ReadingProviderId
  /** 这次用的是哪种解读模式 */
  readingMode?: ReadingMode
  /** 用的哪版 Prompt，A/B 期间需要能追溯 */
  promptVersion?: 'v1' | 'v2'
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
  /**
   * V2.5：这次真正影响决定的核心变量。
   * 可选 —— V2.5 之前的解读、随缘模式或模型漏写时不存在。
   */
  decisionDriver?: DecisionDriver
  /**
   * V2.4：下一步具体可以做什么。Standard 2–3 条，Deep 3–5 条。
   * 可选 —— V2.4 之前存进日记的解读没有这个字段，读取方按空数组处理。
   */
  actionPlan?: ReadingActionItem[]
  /** V2.4：接下来值得观察的现实信号。同样可选，理由同上。 */
  watchFor?: string[]
  /** V2.4 起不再强制数量：Standard 0–1 条（V2.5），Deep 0–3 条，可以为空数组。 */
  reflectionQuestions: string[]
  /** 可选。牌面存在多种合理读法时才出现，不强制。 */
  alternativeInterpretations?: AlternativeInterpretation[]
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
  /** 用户选择的解读模式。重试时保持不变，除非用户主动改。 */
  readingMode: ReadingMode
  /**
   * 解读输出语言。缺省视为 'zh' —— 老客户端不带这个字段，
   * 不带就按中文处理，与改造前的行为逐字一致。
   */
  language?: LanguageCode
  /**
   * 抽牌时用的是哪副牌。**纯呈现信息**。
   * 服务端只把它记进 ReadingContext 供日志与日记回看，
   * 绝不写进 Prompt —— 换牌组不能改变解读的含义，也不能改变抽到的牌。
   */
  deckId?: string
  /**
   * 用户在解读前主动回答的背景选择题（只含实际回答的题）。
   * 可选：跳过、没有生成题目、老客户端都不带这个字段。
   * 它是 session 的固定字段，重试时 payload 依然逐字节相同（AC-V2-06）。
   */
  userContext?: { answers: ContextIntakeAnswer[] }
}

/** `GET /api/tarot/config` —— 让前端知道服务端当前用哪个 Provider，避免前端持有任何密钥相关配置 */
export interface ReadingConfigResponse {
  provider: ReadingProviderId
  model: string | null
  /** 服务端是否具备真正调用 DeepSeek 的条件（有 Key） */
  ready: boolean
}

/* ══════════════════════════════════════════════════════════════
 * 追问（Follow-up）—— D2 起接入真实模型
 *
 * 【为什么这里刻意不是「对话」】
 * V2 把追问接 LLM 收进了 Backlog，重启条件写得很清楚：
 * 「单轮、无累积、Context 仍受 AC-12 限制」。这三条在类型层就落死：
 *
 *   1. 载荷里**没有 history 字段** —— 结构上就拼不出多轮上下文，
 *      第二次追问与第一次看到的 Context 逐字节相同（G-13）
 *   2. 复用 `ReadingRequestCard[]`，与解读同一套服务端重建路径 ——
 *      模型永远拿不到客户端臆造的牌义
 *   3. 只多带一个 `reading`（本次解读的摘要），不带日记、不带过往 Session
 *
 * 无 Key 环境下服务端回落到规则式 `answerFollowUp`，
 * 克隆下来直接能跑这条承诺不变（GV2-09）。
 * ══════════════════════════════════════════════════════════════ */

export interface FollowUpRequest {
  sessionId: string
  /** 本次抽牌采用的问题（随缘模式可为空串） */
  question: string
  spreadId: string
  /** 顺序即牌位顺序。与 ReadingRequest 同构，走同一条重建路径 */
  cards: ReadingRequestCard[]
  /** 用户这一次问的话 */
  ask: string
  /** 回答语言。缺省 'zh' —— 与 ReadingRequest 同一套约定 */
  language?: LanguageCode
  /** 本次解读的摘要与结论，让追问能接着已经说过的话讲，而不是从零重读 */
  readingDigest: {
    headline: string
    summary: string
    answer: string
  }
}

export type FollowUpResponse =
  | {
      ok: true
      /** 单段回答。**不分节、不返回 Markdown** —— 前端不做任何文本解析（GV2-06） */
      answer: string
      provider: ReadingProviderId
    }
  | { ok: false; error: ReadingError }
