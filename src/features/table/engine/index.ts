/**
 * Tarot Table 引擎（Engine）统一出口。
 *
 * 这一层是**纯逻辑**：无 React、无 DOM、无副作用、无 localStorage。
 * 前端只需要 `import { ... } from '@/features/table/engine'`。
 *
 * 典型调用顺序（对应 Product Spec 的 A8 → A12）：
 *   const seed   = createSeed()                               // A8 Session 初始化
 *   const deck   = buildHiddenDeck(seed, cardIds)             // A8 隐藏牌组一次性生成
 *   let entropy  = createEntropy()
 *   ;({ deck, entropy } = applyShuffleGesture(deck, entropy, gesture, seed))  // A9 每一次手势
 *   ;({ deck, entropy } = applyCut(deck, ratio, entropy))     // A10 用户指定切点
 *   const layouts = computeFanLayout({ ... })                 // A11 摊牌
 *   const picked  = hitTestFan(layouts, px, py)               // A12 用户点选位置
 *   const entry   = cardAt(deck, picked)                      // A12 位置 → 牌（纯查表，零随机）
 */

export type { Rng } from './rng'
export { createRng, createSeed, hashString, mixSeeds, quantize } from './rng'

export type { DragSample } from './entropy'
export { MAX_TIMINGS, createEntropy, recordDrag, recordShuffle, recordCut, digestOf } from './entropy'

export { buildHiddenDeck, cardAt, isValidPermutation, deckFingerprint } from './deck'

export type { ShuffleKind, ShuffleGesture, ShuffleResult } from './shuffle'
export {
  MIN_SHUFFLE_DISTANCE,
  applyShuffleGesture,
  classifyGesture,
  gestureDistance,
  isValidShuffleGesture,
} from './shuffle'

export type { CutResult } from './cut'
export { MIN_CUT_RATIO, MAX_CUT_RATIO, applyCut, clampCutRatio } from './cut'

export type { FanLayoutInput, FanCardLayout, FanMetrics } from './fan'
export { MIN_EXPOSURE, computeFanLayout, computeFanMetrics, hitTestFan, scrollOffsetForIndex } from './fan'
