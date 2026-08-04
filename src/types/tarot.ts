/**
 * 塔罗静态数据类型（Static tarot data types）
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
 * 牌面美术母题（Art motif）。
 * MVP 不做 78 张原创插画，牌面由程序化 SVG 生成，`motif` 决定构图母题。
 */
export type ArtMotif =
  | 'moon'
  | 'star'
  | 'sun'
  | 'gate'
  | 'path'
  | 'mirror'
  | 'orbit'
  | 'veil'
  | 'seed'
  | 'tide'
  | 'flame'
  | 'threshold'

/** 牌面美术描述（Art spec） */
export interface CardArt {
  motif: ArtMotif
  /** 色相偏移 0–360，用于在统一设计系统内区分每张牌 */
  hue: number
  /**
   * signature = 代表性 Mock Card（有专门构图）
   * placeholder = 统一风格占位牌（同一设计系统，构图程序化生成）
   */
  tier: 'signature' | 'placeholder'
}

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

  /** 象征元素，例如 ['提灯', '雪原', '独行'] */
  symbols: string[]

  /** 牌面视觉（程序化生成，非位图） */
  art: CardArt
}

/** 牌组（Deck）。MVP 只有一套。 */
export interface TarotDeck {
  id: string
  name: string
  nameEn: string
  description: string
  cards: TarotCard[]
}
