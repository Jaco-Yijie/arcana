/**
 * shuffle.ts — 洗牌（Shuffle）置换算法
 *
 * 【定位】纯逻辑。这里不产生动画，只产生「新的牌序 + 足够 UI 复原这次洗牌过程的元数据」。
 *
 * 【核心约束】
 * - G-03：洗牌不能是一个按钮。所以本文件的入口只接受一个**手势**（ShuffleGesture），
 *   没有手势就没有置换 —— `applyShuffleGesture` 对无效手势直接原样返回（applied: false）。
 * - G-21：手势的方向 / 距离 / 时长 / 起止位置必须**实质影响**结果，
 *   它们既通过 entropy digest 进入 PRNG 的 seed，也直接决定切割点与交错粒度。
 * - G-22：同样的起始牌组 + 同样的 entropy + 同样的手势参数 → 一定得到同样的结果。
 *   所以所有浮点输入都会被量化（quantize）后再参与 seed 计算。
 * - G-02：只做**置换**（permutation），绝不重新生成牌组内容。
 *
 * 【为什么模拟真实洗牌而不是直接 Fisher-Yates】
 * Fisher-Yates 一次就把牌打得完全乱，用户「洗第二次」在数学上毫无意义，
 * 手势幅度大小也无从体现 —— 那样 entropy 就退化成装饰（正中 G-21）。
 * riffle（交切洗）/ strip（切叠洗）的混乱程度天然随手势幅度与次数递增，
 * 「我多洗几次、洗得更用力」才真的对应「牌更乱」。
 */

import type { DeckEntry, InteractionEntropy } from '@/types/session'
import type { Orientation } from '@/types/tarot'
import { createRng, hashString, mixSeeds, quantize } from './rng'
import { recordDrag, recordShuffle } from './entropy'
import { deckFingerprint } from './deck'

/** 洗牌手法：riffle = 交切洗（纵向拖动）；strip = 切叠洗 / overhand（横向滑动） */
export type ShuffleKind = 'riffle' | 'strip'

/** 低于该位移的手势视为误触，不构成一次洗牌（AC-02：没操作就不能变牌序） */
export const MIN_SHUFFLE_DISTANCE = 24

/** 一次洗牌手势 */
export interface ShuffleGesture {
  /** 水平位移（px），右正左负 */
  dx: number
  /** 垂直位移（px），下正上负 */
  dy: number
  /** 手势时长（ms） */
  durationMs: number
  /** 手势起点落在牌堆上的位置比例 0–1（牌堆顶端 = 0） */
  startRatio: number
  /** 手势终点落在牌堆上的位置比例 0–1 */
  endRatio: number
}

export interface ShuffleResult {
  deck: DeckEntry[]
  entropy: InteractionEntropy
  /** 手势是否被采纳。false 时 deck / entropy 原样返回 */
  applied: boolean
  /** 本次使用的手法，供 UI 选择对应的错位重组动画 */
  kind: ShuffleKind
  /** 本次的切割点（牌数下标），UI 用它决定牌堆从哪里裂开 */
  cutPoint: number
  /** 交错/叠放的分组大小序列，UI 可据此做逐叠落下的动画 */
  packets: number[]
  /** 本次是否发生了「把一叠转过来再叠回去」（见下方 orientation 说明） */
  rotatedPacket: boolean
}

/** 手势位移量 */
export function gestureDistance(g: ShuffleGesture): number {
  return Math.hypot(Number.isFinite(g.dx) ? g.dx : 0, Number.isFinite(g.dy) ? g.dy : 0)
}

/** 是否构成一次有效洗牌手势 */
export function isValidShuffleGesture(g: ShuffleGesture): boolean {
  return gestureDistance(g) >= MIN_SHUFFLE_DISTANCE
}

/**
 * 手法判定：横向为主 → strip（切叠洗）；否则 → riffle（交切洗）。
 * 1.2 的偏置让「斜着拖」默认落到 riffle，避免用户在纵向拖动时因手抖被判成横滑。
 */
export function classifyGesture(g: ShuffleGesture): ShuffleKind {
  const dx = Math.abs(g.dx)
  const dy = Math.abs(g.dy)
  return dx > dy * 1.2 ? 'strip' : 'riffle'
}

/** 手势强度 0–1：位移越长、速度越快越接近 1（对应「洗得更用力」） */
function vigorOf(g: ShuffleGesture): number {
  const distance = gestureDistance(g)
  const duration = Math.max(1, Number.isFinite(g.durationMs) ? g.durationMs : 1)
  const speed = distance / duration // px/ms
  const byDistance = Math.min(1, distance / 320)
  const bySpeed = Math.min(1, speed / 1.6)
  return Math.min(1, byDistance * 0.65 + bySpeed * 0.35)
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5
  return Math.min(1, Math.max(0, v))
}

function flipOrientation(o: Orientation): Orientation {
  return o === 'upright' ? 'reversed' : 'upright'
}

function rotatePacket(entries: DeckEntry[]): DeckEntry[] {
  // 180° 转叠：整叠翻转顺序，且每张牌的正逆位互换 —— 与实体牌堆的物理行为一致
  return entries
    .slice()
    .reverse()
    .map((e) => ({ cardId: e.cardId, orientation: flipOrientation(e.orientation) }))
}

/** riffle：把牌堆从 cutPoint 掰成两叠，两叠交错落下 */
function riffle(deck: readonly DeckEntry[], cutPoint: number, maxChunk: number, rng: ReturnType<typeof createRng>) {
  const left = deck.slice(0, cutPoint)
  const right = deck.slice(cutPoint)
  const out: DeckEntry[] = []
  const packets: number[] = []
  let li = 0
  let ri = 0
  let takeLeft = rng.next() < 0.5

  while (li < left.length || ri < right.length) {
    const source = takeLeft ? left : right
    const cursor = takeLeft ? li : ri
    if (cursor >= source.length) {
      takeLeft = !takeLeft
      continue
    }
    const chunk = Math.min(1 + rng.nextInt(maxChunk), source.length - cursor)
    for (let k = 0; k < chunk; k += 1) out.push(source[cursor + k])
    packets.push(chunk)
    if (takeLeft) li += chunk
    else ri += chunk
    takeLeft = !takeLeft
  }
  return { out, packets }
}

/**
 * strip / overhand：从牌堆一端连续抓下若干小叠，反序叠成新堆。
 * 手势方向决定从哪一端抓 —— 这让「往左滑」和「往右滑」得到实质不同的结果。
 */
function strip(
  deck: readonly DeckEntry[],
  packetCount: number,
  fromTop: boolean,
  rotate: boolean,
  rng: ReturnType<typeof createRng>,
) {
  const source = deck.slice()
  const out: DeckEntry[] = []
  const packets: number[] = []
  const base = Math.max(1, Math.floor(source.length / packetCount))

  while (source.length > 0) {
    const jitter = rng.nextIntBetween(-Math.floor(base / 2), Math.floor(base / 2) + 1)
    const size = Math.max(1, Math.min(source.length, base + jitter))
    const packet = fromTop ? source.splice(0, size) : source.splice(source.length - size, size)
    packets.push(size)
    // 反序叠放：后抓的一叠压在上面 —— overhand 洗牌的本质
    out.unshift(...(rotate ? rotatePacket(packet) : packet))
  }
  return { out, packets }
}

/**
 * 施加一次洗牌手势。
 *
 * @param seed Session 的 `shuffleSeed`。System Random 与 userInteractionEntropy 在这里合流：
 *             `rngSeed = mix(hash(seed), entropy.digest, 量化后的手势参数)`，
 *             即简报 §8 要求的 `systemRandom + userInteractionEntropy`。
 *
 * 关于 orientation（正逆位）：
 * 常规 riffle 洗牌**不改变**任何一张牌的正逆位，牌的身份与朝向跟着牌一起走。
 * 唯一会改变朝向的是「向左的切叠洗」—— 对应实体牌桌上把抓起的一叠转 180° 再叠回去，
 * 这是一个由用户方向手势触发的、确定性的、连续整叠的物理动作，
 * 满足简报 §8「用户操作进一步扰动牌序**与方向**」，且不构成 G-02 的「整体重新随机」。
 */
export function applyShuffleGesture(
  deck: readonly DeckEntry[],
  entropy: InteractionEntropy,
  gesture: ShuffleGesture,
  seed: string,
): ShuffleResult {
  const kind = classifyGesture(gesture)

  if (!isValidShuffleGesture(gesture)) {
    return {
      deck: deck.slice(),
      entropy,
      applied: false,
      kind,
      cutPoint: 0,
      packets: [],
      rotatedPacket: false,
    }
  }

  const n = deck.length
  if (n < 2) {
    return { deck: deck.slice(), entropy, applied: false, kind, cutPoint: 0, packets: [], rotatedPacket: false }
  }

  // 1) 先把这次手势累积进 entropy（距离 / 方向 / 时间 / 次数都进去）
  const nextEntropy = recordShuffle(
    recordDrag(entropy, { dx: gesture.dx, dy: gesture.dy, dt: gesture.durationMs }),
  )

  // 2) systemRandom(seed) + userInteractionEntropy + 量化后的手势参数 → 本次置换的 PRNG
  const rng = createRng(
    mixSeeds(
      hashString(seed),
      nextEntropy.digest,
      quantize(gesture.dx, 1),
      quantize(gesture.dy, 1),
      quantize(gesture.durationMs, 1),
      quantize(clamp01(gesture.startRatio), 1000),
      quantize(clamp01(gesture.endRatio), 1000),
      kind === 'strip' ? 0x5354_5250 : 0x5249_4646,
    ),
  )

  const vigor = vigorOf(gesture)
  let out: DeckEntry[]
  let packets: number[]
  let cutPoint: number
  let rotatedPacket = false

  if (kind === 'riffle') {
    // 切割点由「手势起点落在牌堆的哪个位置」主导，rng 只给 ±3 张的手抖
    const desired = Math.round(clamp01(gesture.startRatio) * n)
    const jitter = rng.nextIntBetween(-3, 4)
    cutPoint = Math.min(n - 1, Math.max(1, desired + jitter))
    // 洗得越用力，交错粒度越细（1 张 1 张地落），牌越乱
    const maxChunk = Math.max(1, Math.round(6 - vigor * 5))
    const r = riffle(deck, cutPoint, maxChunk, rng)
    out = r.out
    packets = r.packets
  } else {
    // 横滑：往右滑从牌堆顶端抓，往左滑从底端抓并把整叠转过来
    const fromTop = gesture.dx >= 0
    rotatedPacket = !fromTop
    const packetCount = Math.max(2, Math.round(3 + vigor * 6))
    cutPoint = Math.min(n - 1, Math.max(1, Math.round(clamp01(gesture.endRatio) * n)))
    const r = strip(deck, packetCount, fromTop, rotatedPacket, rng)
    out = r.out
    packets = r.packets
  }

  // 3) 安全网：AC-02 要求「洗过之后牌序必须发生可验证的变化」。
  //    极端参数下理论上可能得到恒等置换，这里兜底再做一次小幅整体旋转。
  if (deckFingerprint(out) === deckFingerprint(deck)) {
    const shift = 1 + rng.nextInt(n - 1)
    out = [...out.slice(shift), ...out.slice(0, shift)]
  }

  return { deck: out, entropy: nextEntropy, applied: true, kind, cutPoint, packets, rotatedPacket }
}
