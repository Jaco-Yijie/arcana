/** 牌阵（Spread）类型 */

export type SpreadId =
  | 'single'
  | 'past-present-future'
  | 'situation-obstacle-advice'
  | 'two-choices'
  | 'relationship'

/** 牌阵中的一个牌位（Position） */
export interface SpreadPosition {
  id: string
  /** 牌位名，例如「过去」 */
  label: string
  /** 一句话解释这个牌位代表什么，用于引导与解读 */
  meaning: string
  /**
   * 牌位在牌阵画布中的相对坐标，0–1。
   * (0,0) = 左上，(1,1) = 右下。前端按容器尺寸换算，保证移动端自适应。
   */
  x: number
  y: number
  /** 可选：分组标签，例如二选一牌阵的 'A' / 'B' */
  group?: string
}

export interface Spread {
  id: SpreadId
  name: string
  nameEn: string
  /** 一句话说明适合问什么 */
  description: string
  cardCount: number
  positions: SpreadPosition[]
  /** 适合的问题类型关键词，用于 Mock 推荐 */
  matchKeywords: string[]
  /** 新手友好度，1 最友好 —— 用于排序与推荐 */
  simplicity: number
}
