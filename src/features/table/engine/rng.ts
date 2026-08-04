/**
 * rng.ts — 可复现的伪随机数发生器（Seeded PRNG）
 *
 * 【为什么必须是 seeded 的】
 * 简报 §8 与 AC-01：牌的身份必须在 Session 初始化那一刻就被确定，
 * 并且在 Session 恢复（G-22）后必须一模一样。
 * 只要「seed + 用户操作序列」相同，牌序就必须相同 —— 这要求整条链路上
 * 不能出现任何不可复现的随机源。
 *
 * 【红线 G-01】
 * 本引擎除 `createSeed()` 的降级路径外，**任何地方都不得调用 Math.random()**。
 * 决定牌面的随机性一律来自 `createRng(seed)`。
 *
 * 本文件无 React / DOM 依赖（`createSeed` 会做能力检测后降级），可被任意模块直接 import。
 */

/** 一个可复现的随机数发生器实例 */
export interface Rng {
  /** [0, 1) 浮点 */
  next(): number
  /** [0, 2^32) 无符号整数 */
  nextU32(): number
  /** [0, maxExclusive) 整数；maxExclusive <= 0 时返回 0 */
  nextInt(maxExclusive: number): number
  /** [min, maxExclusive) 整数 */
  nextIntBetween(min: number, maxExclusive: number): number
}

/**
 * mulberry32 —— 32-bit 状态、无依赖、分布良好、速度快。
 * 对本产品的需求（一副 78 张牌的置换）完全足够，且实现短到可以人工审计。
 */
export function createRng(seed: number): Rng {
  // 保证状态是 32-bit 无符号；seed 为 0 时给一个非零默认值，避免退化。
  let state = (seed >>> 0) || 0x9e3779b9

  const nextU32 = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0)
  }

  const next = (): number => nextU32() / 4294967296

  const nextInt = (maxExclusive: number): number => {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0
    return Math.floor(next() * maxExclusive)
  }

  return {
    next,
    nextU32,
    nextInt,
    nextIntBetween: (min, maxExclusive) => min + nextInt(maxExclusive - min),
  }
}

/**
 * 32-bit 字符串哈希（FNV-1a 变体 + 末尾雪崩）。
 * 用于把十六进制 seed 字符串折叠成 PRNG 需要的 32-bit 整数。
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // 雪崩（avalanche），让相邻字符串的哈希充分分散
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return h >>> 0
}

/** 把若干个 32-bit 值可交换性地混合成一个 32-bit 值（顺序敏感） */
export function mixSeeds(...values: number[]): number {
  let h = 0x2545f491
  for (const v of values) {
    h ^= (v | 0) >>> 0
    h = Math.imul(h, 0x27220a95)
    h ^= h >>> 13
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  return h >>> 0
}

/** 把浮点数量化成稳定的 32-bit 整数，避免浮点噪声破坏可复现性 */
export function quantize(value: number, precision = 1000): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * precision) | 0
}

/**
 * 生成 System Random 种子（简报 §8 第 2 点）。
 * 优先 `crypto.getRandomValues`（真正的系统随机源）；
 * 环境不支持时才降级到 `Math.random` —— 这是全引擎唯一允许出现 Math.random 的地方，
 * 且它只影响「初始 seed」，不影响「点击后是否现场抽牌」这条红线。
 */
export function createSeed(byteLength = 8): string {
  const bytes = new Uint8Array(byteLength)
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }
  if (g.crypto && typeof g.crypto.getRandomValues === 'function') {
    g.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      // 降级路径（fallback），仅用于生成 seed
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}
