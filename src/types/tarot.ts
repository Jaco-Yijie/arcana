/**
 * Layer 1 · 塔罗语义层类型（Tarot Meaning Layer）
 *
 * 【这一层的宪法】
 * 本文件描述「这张牌是什么」，**不描述「它长什么样」**。
 * 它对 deckId 完全无感知 —— 全文件不允许出现 deckId 这个标识符，
 * 也不允许 import 任何 `@/decks/**` 或 `@/atmosphere/**` 的东西。
 * 换一副牌组，本层的任何取值都不得发生一个字节的变化（deck:check D 组断言）。
 *
 * 设计约定：
 * - `TarotCard` 只描述「牌本身」的静态含义，**不带 orientation（正逆位）**。
 * - 正逆位属于一次抽牌中的牌实例，保存在 `DeckEntry` / `Placement` 上（见 session.ts）。
 *   这样同一张牌在不同 Session 中可以有不同朝向，而牌义数据只有一份。
 */

/** 大阿卡纳 / 小阿卡纳 */
export type Arcana = 'major' | 'minor'

/** 小阿卡纳的四个花色（Suit） */
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles'

/** 正位 / 逆位 */
export type Orientation = 'upright' | 'reversed'

/** 生活领域（Life domain）——用于详细牌义分区展示 */
export type LifeDomain = 'love' | 'career' | 'study' | 'finance'

/** 按正逆位区分的一段文本 */
export interface OrientedText {
  upright: string
  reversed: string
}

/**
 * 元素名。与 `types/reading.ts` 的 `TarotElement` 取值一致，
 * 但在这里独立声明 —— 牌义层不 import reading 层（那是解读侧的类型）。
 */
export type TarotElementName = 'fire' | 'water' | 'air' | 'earth' | 'spirit'

/** 一张塔罗牌的完整静态定义 */
export interface TarotCard {
  /** 稳定 id，例如 'major-09' / 'cups-03' */
  id: string
  /** 英文牌名，例如 'The Hermit' */
  name: string
  /** 中文牌名，例如 '隐士' */
  nameZh: string
  /** 大阿卡纳 0–21；小阿卡纳 1–14（11=Page 12=Knight 13=Queen 14=King） */
  number: number
  arcana: Arcana
  /** 仅小阿卡纳有 */
  suit?: Suit

  keywordsUpright: string[]
  keywordsReversed: string[]
  meaningUpright: string
  meaningReversed: string

  love: OrientedText
  career: OrientedText
  study: OrientedText
  finance: OrientedText
  advice: OrientedText

  /**
   * 自我状态与成长方向。
   *
   * 【为什么新增而不是把 study 改名】
   * `study`（学业与考试）与「自我成长」是两回事：前者是外部任务，
   * 后者是内在状态。改名会让 78 张牌里已写好的学业牌义全部错位。
   *
   * optional：目前只有 5 张代表牌写了。
   * `selectDomainMeaning` 在缺失时返回 null 而不是找替代 ——
   * 找替代会让「这段是专门为这个领域写的」这个前提失效。
   */
  personalGrowth?: OrientedText

  /**
   * 象征元素，例如 ['提灯', '雪原', '独行']。
   *
   * 【它是牌义，不是画面描述】symbols 会进 Prompt（server/prompts），
   * 所以它**必须与牌组无关** —— 一旦让某套牌组改写 symbols，
   * 「换牌组后 Prompt 逐字节相同」这条断言立刻失败，产品哲学随之瓦解。
   * 各牌组画面上实际画了什么，属于 Layer 2，与本字段无关。
   */
  symbols: string[]

  /**
   * 结构化象征：每个意象配一句它在这张牌里意味着什么。
   *
   * 与上面扁平的 `symbols` 并存而不是取代它 —— `symbols` 已经进了 Prompt
   * 并被「换牌组后 Prompt 逐字节相同」那条断言覆盖，动它风险大于收益。
   * 这一份是给**界面**用的：牌义详情页可以逐条展开，而不是甩一串词。
   *
   * optional：目前只有 5 张代表牌写了。
   */
  symbolism?: { title: string; meaning: string }[]

  /**
   * 元素归属。
   *
   * 【为什么牌上要存，明明 SUIT_ELEMENT 能推】
   * 花色能推出小阿卡纳的元素，但**大阿卡纳没有花色** ——
   * 现在它们在 ReadingContext 里一律被兜底成 'spirit'，
   * 等于 22 张大牌的元素信息是假的。存在牌上才能给对。
   *
   * optional：目前只有 5 张代表牌写了；未写的仍走 SUIT_ELEMENT 推导。
   */
  element?: TarotElementName

  /** 占星对应，例如 '天王星' / '水星'。传统塔罗体系的一部分，纯参考。optional */
  astrology?: string

  /* ★ 这里曾经有 `art: CardArt`。它已被移除 —— 见 src/decks/legacy/proceduralArt.ts。
     牌面长什么样属于视觉层；把它长在牌义上，会让一张牌结构上只能有一套美术。
     deck:check 的 D 组断言会阻止任何人把它加回来。 */
}
