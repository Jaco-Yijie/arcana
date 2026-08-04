/**
 * 占卜会话（Tarot Session）类型
 *
 * 【最高优先原则的类型级体现】
 * 进入 Session 时立刻生成 `deck`（78 张的隐藏牌序 + 每张的隐藏正逆位）。
 * 用户之后的所有操作只是「选择 deck 中的某个 index」，
 * 系统在任何时刻都不得在用户点击之后再决定他抽到哪张牌。
 */

import type { Orientation } from './tarot'
import type { SpreadId } from './spread'
import type { StructuredReading } from './reading'

/** 入口模式：带着问题来 / 随缘抽一张 */
export type SessionMode = 'question' | 'random'

/** 随缘抽一张的轻主题 */
export type RandomThemeId =
  | 'free'
  | 'today'
  | 'recent-state'
  | 'watch-out'
  | 'advice'

/** 流程阶段（用于路由守卫与断点续抽） */
export type SessionStage =
  | 'question'
  | 'spread'
  | 'prepare'
  | 'shuffle'
  | 'cut'
  | 'draw'
  | 'reveal'
  | 'reading'
  | 'done'

export type SessionStatus = 'in-progress' | 'completed'

/**
 * 隐藏牌组中的一条目。牌序 index 即「牌在牌堆中的位置」。
 * 用户在摊牌界面选中的是位置，不是牌。
 */
export interface DeckEntry {
  cardId: string
  orientation: Orientation
}

/**
 * 用户交互熵（User Interaction Entropy）
 * 与 systemRandom 一起决定最终牌序：systemRandom + userInteractionEntropy
 */
export interface InteractionEntropy {
  /** 完成过多少次有效洗牌动作 */
  shuffleCount: number
  /** 累计拖动距离（px） */
  dragDistance: number
  /** 方向序列的累计符号量（左负右正） */
  dragDirectionSum: number
  /** 采样的交互时间间隔（ms），保留最近 N 个 */
  timings: number[]
  /** 用户选择过的切牌位置（牌堆比例 0–1） */
  cutPositions: number[]
  /** 上述所有信号折叠成的 32-bit 熵值，供 PRNG 混入 */
  digest: number
}

/** 用户从摊开的扇形中拿起的一张牌（尚未确定放到哪个牌位） */
export interface DrawnCard {
  /** 在隐藏牌组 deck 中的下标 —— 这是「用户选的位置」 */
  deckIndex: number
  /** 拿起的时间，用于按顺序展示 */
  pickedAt: number
}

/** 已经摆到牌阵某个牌位上的牌 */
export interface Placement {
  positionId: string
  deckIndex: number
  /** 是否已翻开。翻开后不可替换。 */
  revealed: boolean
  revealedAt?: number
}

/** 每张牌的解读段落 */
export interface CardAnalysis {
  positionId: string
  positionLabel: string
  cardId: string
  orientation: Orientation
  /** 该牌落在该牌位上的含义 */
  text: string
}

/** Mock AI 综合解读 */
export interface Reading {
  generatedAt: number
  /** 先短：1–2 段核心结论 */
  headline: string[]
  /** 后长：以下内容默认折叠 */
  cardAnalyses: CardAnalysis[]
  /** 卡牌之间的关系 */
  relations: string[]
  /** 综合趋势 */
  trend: string
  /** 值得注意的问题 */
  watchOut: string[]
  /** 可以考虑的行动方向 */
  actions: string[]
  /** 触发安全边界时的提示文案，否则为 null */
  safetyNotice: string | null
}

export type FollowUpRole = 'user' | 'assistant'

export interface FollowUpMessage {
  id: string
  role: FollowUpRole
  content: string
  createdAt: number
}

export interface TarotSession {
  id: string
  createdAt: number
  updatedAt: number
  status: SessionStatus
  stage: SessionStage
  mode: SessionMode

  /** 用户原始问题 */
  question: string
  /** Mock AI 优化后的问题；用户可以不接受 */
  optimizedQuestion: string | null
  /** 用户最终采用的是不是优化版本 */
  usedOptimized: boolean
  /** 随缘模式的轻主题 */
  theme: RandomThemeId | null

  deckId: string
  spreadId: SpreadId | null

  /** 系统随机种子（十六进制字符串），Session 创建时生成 */
  shuffleSeed: string
  entropy: InteractionEntropy

  /** 隐藏牌组：78 张，抽牌前用户不可见 */
  deck: DeckEntry[]
  /** 是否已完成洗牌 / 切牌阶段 */
  shuffled: boolean
  cut: boolean

  /** 用户从扇形中拿起的牌 */
  drawn: DrawnCard[]
  /** 用户摆到牌位上的牌 */
  placements: Placement[]

  /**
   * V1 结构的解读。
   * V2 之后它变成**兼容投影**：真正渲染用的是 `structuredReading`，
   * 但 `journalStore.toSummary()` / `JournalDetailPage` / `SharePage` 仍然读这里，
   * 所以每次生成 V2 解读时都会同步写一份 V1 投影进来（见 `legacyProjection.ts`）。
   * 历史日记里只有这个字段，没有 `structuredReading`。
   */
  reading: Reading | null
  /**
   * V2 结构化解读。**可选** —— 老记录没有这个字段，Reading 页会回落到 V1 渲染。
   * 加字段而不是改 `reading` 的类型，是为了让已经躺在 localStorage 里的日记原样可读。
   */
  structuredReading?: StructuredReading | null
  followUps: FollowUpMessage[]

  /** 用户事后补充 */
  mood: string | null
  note: string | null
  outcome: string | null
}

/** 日记列表用的轻量摘要 */
export interface JournalEntrySummary {
  id: string
  createdAt: number
  question: string
  spreadId: SpreadId | null
  mode: SessionMode
  cards: { cardId: string; orientation: Orientation }[]
  headline: string
}
