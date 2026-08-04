/**
 * deck.ts — 隐藏牌组状态（Hidden Deck State）
 *
 * ============================================================================
 * 【为什么必须在 Session 初始化那一刻生成】—— 对应 AC-01 / G-01 / G-02
 * ============================================================================
 * 简报 §8 明确禁止：「用户点了某张牌 → 才 randomCard() → 告诉他抽到了 The Moon」。
 * 那种做法里，牌不是被「发现」的，而是被「触发生成」的，
 * 用户的洗牌/切牌/选牌全部沦为播放动画，产品的核心价值当场归零。
 *
 * 正确做法（本文件的全部职责）：
 *   1. 进入 Tarot Session 的那一刻，用 System Random 的 seed 一次性生成
 *      78 张的完整顺序 + 每张的隐藏正逆位（orientation）。
 *   2. 之后 shuffle / cut 只做**置换**（permutation），永远不重新生成牌组内容
 *      —— 重新整体随机会触发 G-02。
 *   3. 用户选牌时唯一被允许调用的入口是 `cardAt(deck, index)`：
 *      **纯查表，零随机**。点击事件的调用链里出现任何随机数生成 = AC-01 失败。
 *
 * 因此本文件里，随机只出现在 `buildHiddenDeck` 中；
 * `cardAt` 是刻意写得极其无聊的一行查表 —— 它无聊，产品才成立。
 * ============================================================================
 */

import type { DeckEntry } from '@/types/session'
import type { Orientation } from '@/types/tarot'
import { createRng, hashString, mixSeeds } from './rng'

/** 逆位出现概率。0.5 = 正逆位等概率，符合实体牌堆随手翻转的直觉。 */
const REVERSED_PROBABILITY = 0.5

/**
 * 生成隐藏牌组：完整牌序 + 每张牌的隐藏正逆位。
 * 只应在 Session 初始化时调用一次（A8 步骤）。
 *
 * @param seed  Session 的 `shuffleSeed`（System Random 十六进制字符串）
 * @param cardIds 牌组内全部卡牌 id（标准体系为 78 个）
 */
export function buildHiddenDeck(seed: string, cardIds: readonly string[]): DeckEntry[] {
  const ids = cardIds.slice()
  const seedHash = hashString(seed)

  // 牌序与正逆位使用两条互相独立的随机流，避免「排在前面的牌更容易逆位」这类相关性
  const orderRng = createRng(mixSeeds(seedHash, 0x4f52_4445)) // 'ORDE'
  const orientRng = createRng(mixSeeds(seedHash, 0x4f52_4e54)) // 'ORNT'

  // Fisher-Yates 洗牌：产出的一定是原数组的一个合法排列（无重复、无丢失）
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = orderRng.nextInt(i + 1)
    const tmp = ids[i]
    ids[i] = ids[j]
    ids[j] = tmp
  }

  return ids.map((cardId) => {
    const orientation: Orientation = orientRng.next() < REVERSED_PROBABILITY ? 'reversed' : 'upright'
    return { cardId, orientation }
  })
}

/**
 * 抽牌的**唯一入口**：把「用户选的位置」翻译成「那张牌」。
 * 纯查表，绝不含随机 —— 这正是 AC-01 的验证点。
 */
export function cardAt(deck: readonly DeckEntry[], index: number): DeckEntry {
  const entry = deck[index]
  if (!entry) {
    throw new RangeError(`cardAt: index ${index} 超出隐藏牌组范围（size=${deck.length}）`)
  }
  return entry
}

/**
 * 校验一个牌组仍然是原始牌组的合法排列（无重复、无丢失）。
 * 每次洗牌/切牌后都应当成立；供自检脚本与开发期断言使用。
 */
export function isValidPermutation(deck: readonly DeckEntry[], cardIds: readonly string[]): boolean {
  if (deck.length !== cardIds.length) return false
  const seen = new Set<string>()
  for (const entry of deck) {
    if (seen.has(entry.cardId)) return false
    seen.add(entry.cardId)
  }
  for (const id of cardIds) {
    if (!seen.has(id)) return false
  }
  return true
}

/** 把牌组折叠成可比较的指纹字符串，用于「牌序是否变化」的断言 */
export function deckFingerprint(deck: readonly DeckEntry[]): string {
  return deck.map((e) => `${e.cardId}${e.orientation === 'reversed' ? '-' : '+'}`).join('|')
}
