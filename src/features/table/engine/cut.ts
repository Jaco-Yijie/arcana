/**
 * cut.ts — 切牌（Cut）
 *
 * 【核心约束 G-04 / AC-03】
 * 切点**只能**由用户在牌堆上指定。本文件不提供任何默认切点、随机切点、
 * 「帮我切」的便捷函数 —— `applyCut` 的 `ratio` 是必填参数，没有默认值，
 * 调用方必须拿到用户的真实触点才能调用它。
 *
 * 【AC-03】不同的 ratio 必须产生不同的牌序。
 * 因此：切点下标完全由 ratio 决定；entropy 只提供一个**与 ratio 无关**的常量级偏移
 * （0 或 ±1 张，取决于用户此前的操作历史）。
 * 由于该偏移对同一 Session 内的所有 ratio 都是同一个值，
 * 「不同下标 → 不同牌序」这一性质仍然严格成立。
 */

import type { DeckEntry, InteractionEntropy } from '@/types/session'
import { recordCut } from './entropy'

/**
 * 切点比例的可用区间。
 * 太靠近 0 或 1 的切牌在物理上等于没切（恒等置换），
 * 会让用户觉得「我切了但什么也没发生」，因此夹在 [0.05, 0.95]。
 */
export const MIN_CUT_RATIO = 0.05
export const MAX_CUT_RATIO = 0.95

export interface CutResult {
  deck: DeckEntry[]
  entropy: InteractionEntropy
  /** 实际切在第几张（牌数下标），UI 用它把牌堆画成上下两叠 */
  cutIndex: number
  /** 上叠张数 = cutIndex；下叠张数 = deck.length - cutIndex */
  upperCount: number
  lowerCount: number
}

/** 把用户触点比例夹到有效区间 */
export function clampCutRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0.5
  return Math.min(MAX_CUT_RATIO, Math.max(MIN_CUT_RATIO, ratio))
}

/**
 * 按用户指定的 ratio 切牌：牌堆分成上下两叠，**下叠放到上面**再合并。
 *
 * @param ratio 用户在牌堆上指定的切点，0（顶端）–1（底端）。必填，无默认值。
 */
export function applyCut(deck: readonly DeckEntry[], ratio: number, entropy: InteractionEntropy): CutResult {
  const n = deck.length
  const clamped = clampCutRatio(ratio)

  if (n < 2) {
    return {
      deck: deck.slice(),
      entropy: recordCut(entropy, clamped),
      cutIndex: 0,
      upperCount: 0,
      lowerCount: n,
    }
  }

  // 用户的 ratio 是主导因素
  const base = Math.round(clamped * n)
  // entropy 只给一个与 ratio 无关的常量偏移（-1 / 0 / +1），模拟手指压下去时的一两张误差
  const drift = (entropy.digest % 3) - 1
  const cutIndex = Math.min(n - 1, Math.max(1, base + drift))

  const upper = deck.slice(0, cutIndex)
  const lower = deck.slice(cutIndex)

  return {
    // 下叠放到上面 —— 与实体切牌一致
    deck: [...lower, ...upper],
    entropy: recordCut(entropy, clamped),
    cutIndex,
    upperCount: upper.length,
    lowerCount: lower.length,
  }
}
