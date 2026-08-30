/** 牌阵（Spread）类型 */

export type SpreadId =
  | 'single'
  | 'past-present-future'
  | 'situation-obstacle-advice'
  | 'two-choices'
  | 'relationship'

/**
 * 牌阵中的一个牌位（Position）
 *
 * 【为什么从 x/y 浮点改成 row/col 逻辑网格 —— Phase C0】
 * 旧模型是 0–1 的自由浮点坐标，配合 DrawTable 里写死的 `ZONE_H = 110` 与
 * `height: 288`。两者相除得到一个硬阈值：**纵向间距小于 0.382 的牌位一定重叠**。
 * 二选一（Δ0.34）与关系（Δ0.26）当场中招，且与视口无关 —— 改几个数字也修不好，
 * 因为自由浮点从一开始就允许把牌位写进重叠状态，没有任何东西拦得住。
 *
 * 现在牌位只声明**逻辑位置**，像素位置由 `computeSpreadLayout` 从
 * 牌桌实际尺寸反解。卡牌尺寸随牌桌走，单元格互相平铺，
 * 「两张牌重叠」在结构上不可能发生。
 *
 * 【逻辑网格 ≠ 视觉必须是矩形】
 * 网格只负责占位、定尺寸、防重叠。Celtic Cross / 马蹄形 / 金字塔 / 环形
 * 这些非矩形牌阵，将来用 rowSpan + offset + rotation 这几个**视觉修饰**表达。
 * 修饰量以「单元格内的自由空间」为单位并被钳制在 [-1, 1]，
 * 所以**任何修饰都突不破碰撞检测** —— 这是刻意的设计，不是限制。
 */
export interface SpreadPosition {
  id: string
  /** 牌位名，例如「过去」 */
  label: string
  /** 一句话解释这个牌位代表什么，用于引导与解读 */
  meaning: string
  /** 逻辑网格列，0-based */
  col: number
  /** 逻辑网格行，0-based */
  row: number
  /** 跨列。默认 1 */
  colSpan?: number
  /** 跨行。默认 1 */
  rowSpan?: number
  /**
   * 视觉修饰：横向偏移。
   * 单位是「单元格里卡牌之外的自由空间的一半」，取值 [-1, 1]，超出即钳制。
   * 因为自由空间本来就属于这个单元格，偏移到极限也碰不到邻居。
   */
  offsetX?: number
  /** 视觉修饰：纵向偏移。单位与 offsetX 相同 */
  offsetY?: number
  /**
   * 视觉修饰：旋转角度（度）。
   * 引擎会按旋转后的包围盒反解卡牌尺寸，所以旋转同样不会造成相交。
   */
  rotation?: number
  /** 可选：分组标签，例如二选一牌阵的 'A' / 'B' */
  group?: string
}

/** 牌阵的逻辑网格尺寸 */
export interface SpreadGrid {
  cols: number
  rows: number
}

export interface Spread {
  id: SpreadId
  name: string
  nameEn: string
  /** 一句话说明适合问什么 */
  description: string
  cardCount: number
  /** 逻辑网格。所有 position 的 row/col 必须落在其中，由 layout:check 断言 */
  grid: SpreadGrid
  positions: SpreadPosition[]
  /** 适合的问题类型关键词，用于 Mock 推荐 */
  matchKeywords: string[]
  /** 新手友好度，1 最友好 —— 用于排序与推荐 */
  simplicity: number
}
