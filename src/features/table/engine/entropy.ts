/**
 * entropy.ts — 用户交互熵（User Interaction Entropy）的累积与折叠
 *
 * 【红线 G-21】
 * `interactionEntropy` 不允许是「只存不用」的装饰字段。
 * 本文件产出的 `digest` 会被 shuffle.ts / cut.ts 直接混入 PRNG 的 seed，
 * 也就是说：用户拖了多远、往哪个方向拖、拖了多久、洗了几次、在哪里切，
 * **实质地改变了最终牌序**。自检脚本 §6 会验证这一点。
 *
 * 【为什么 timings 只保留最近 32 个】
 * 简报 §15：整个 Session（含 entropy）持续写入 localStorage。
 * 一次洗牌可能产生上百个 pointermove 采样，无上限累积会让存储爆炸且拖慢序列化。
 * 32 个样本已经足够提供时间维度的不可预测性。
 *
 * 本文件是纯函数集合：全部返回新对象，不修改入参（配合 React 状态更新）。
 */

import type { InteractionEntropy } from '@/types/session'
import { mixSeeds, quantize } from './rng'

/** timings 环形缓冲的容量 */
export const MAX_TIMINGS = 32

/** 一次拖动采样 */
export interface DragSample {
  /** 水平位移（px），右正左负 */
  dx: number
  /** 垂直位移（px），下正上负 */
  dy: number
  /** 距上一次采样的时间间隔（ms） */
  dt: number
}

export function createEntropy(): InteractionEntropy {
  const base: InteractionEntropy = {
    shuffleCount: 0,
    dragDistance: 0,
    dragDirectionSum: 0,
    timings: [],
    cutPositions: [],
    digest: 0,
  }
  return { ...base, digest: digestOf(base) }
}

/** 把 timings 追加进环形缓冲，只保留最近 MAX_TIMINGS 个 */
function pushTiming(timings: number[], dt: number): number[] {
  if (!Number.isFinite(dt) || dt <= 0) return timings
  // 上限 4000ms：用户中途发呆产生的超长间隔没有信息量，反而会压掉其它样本的差异
  const clamped = Math.min(Math.round(dt), 4000)
  const next = timings.length >= MAX_TIMINGS ? timings.slice(timings.length - MAX_TIMINGS + 1) : timings.slice()
  next.push(clamped)
  return next
}

/** 记录一次拖动采样：累积距离、方向符号量、时间间隔 */
export function recordDrag(e: InteractionEntropy, sample: DragSample): InteractionEntropy {
  const dx = Number.isFinite(sample.dx) ? sample.dx : 0
  const dy = Number.isFinite(sample.dy) ? sample.dy : 0
  const distance = Math.hypot(dx, dy)

  const next: InteractionEntropy = {
    ...e,
    dragDistance: e.dragDistance + distance,
    // 方向符号量：右正左负，累积后能反映「这个人整体往哪边推牌」
    dragDirectionSum: e.dragDirectionSum + Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx))),
    timings: pushTiming(e.timings, sample.dt),
  }
  return { ...next, digest: digestOf(next) }
}

/** 记录一次「完成的洗牌动作」（一次有效手势 = 一次洗牌） */
export function recordShuffle(e: InteractionEntropy): InteractionEntropy {
  const next: InteractionEntropy = { ...e, shuffleCount: e.shuffleCount + 1 }
  return { ...next, digest: digestOf(next) }
}

/** 记录一次切牌位置（牌堆比例 0–1） */
export function recordCut(e: InteractionEntropy, ratio: number): InteractionEntropy {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0.5))
  const next: InteractionEntropy = {
    ...e,
    // 切牌位置全部保留：用户最多切几次，量级可控，且每一次都是强信号
    cutPositions: [...e.cutPositions, clamped],
  }
  return { ...next, digest: digestOf(next) }
}

/**
 * 把 shuffleCount / dragDistance / dragDirectionSum / timings / cutPositions
 * 折叠成一个 32-bit 值，供 PRNG 混入。
 * 纯函数：同样的 entropy 一定得到同样的 digest（G-22 会话恢复的前提）。
 */
export function digestOf(e: InteractionEntropy): number {
  let h = mixSeeds(
    e.shuffleCount | 0,
    quantize(e.dragDistance, 100),
    e.dragDirectionSum | 0,
    e.timings.length,
    e.cutPositions.length,
  )
  for (let i = 0; i < e.timings.length; i += 1) {
    // 带上下标，保证时间间隔的「顺序」也参与，而不只是集合
    h = mixSeeds(h, e.timings[i] | 0, i)
  }
  for (let i = 0; i < e.cutPositions.length; i += 1) {
    h = mixSeeds(h, quantize(e.cutPositions[i], 10000), i + 0x51)
  }
  return h >>> 0
}
