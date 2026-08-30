/**
 * Layer 1 · 牌义指纹（Meaning fingerprint）
 *
 * 【它防的是什么】
 * 多牌组改造要触碰 1892 行牌义数据（剥离 78 个 art 字段）。
 * 在那种规模的机械改动里手滑改到一个 meaningReversed 是完全可能的，
 * 而且会淹没在 diff 里，code review 根本看不见。
 *
 * 更长远地说：牌义是本产品唯一不可变的东西。
 * 「换牌组不改变牌义」这句话，如果没有一个可比对的常量，
 * 就只是一句注释；有了它，任何一次误改都会让 deck:check 立刻变红。
 *
 * 【为什么只哈希这 16 个字段】
 * 它们构成「这张牌是什么」的全部。刻意**不含**任何视觉字段 ——
 * 视觉本来就该随牌组变化，把它算进指纹会让这条断言失去意义。
 */

import { allCards } from './index'
import type { TarotCard } from '@/types/tarot'

/** 参与指纹计算的语义字段。顺序固定，改动顺序会改变指纹。 */
export const MEANING_FIELDS = [
  'id',
  'name',
  'nameZh',
  'number',
  'arcana',
  'suit',
  'keywordsUpright',
  'keywordsReversed',
  'meaningUpright',
  'meaningReversed',
  'love',
  'career',
  'study',
  'finance',
  'advice',
  'symbols',
  /* 后加的语义字段。它们同样是牌义，同样必须受保护 ——
     personalGrowth 是「自我成长」那一段解释，symbolism 是逐条象征释义，
     两者都会被读给用户或模型看，误改的后果与改错 meaningReversed 一样。
     element / astrology 是传统体系的归属，同理。 */
  'personalGrowth',
  'symbolism',
  'element',
  'astrology',
] as const satisfies readonly (keyof TarotCard)[]

/** 把 78 张牌的语义字段序列化成稳定字符串（不含任何视觉信息） */
export function serializeMeaning(cards: readonly TarotCard[] = allCards): string {
  return JSON.stringify(
    cards.map((card) =>
      Object.fromEntries(
        MEANING_FIELDS.map((key) => [key, (card as unknown as Record<string, unknown>)[key] ?? null]),
      ),
    ),
  )
}

/**
 * FNV-1a 64（十六进制）。
 * 刻意不用 node:crypto —— 本模块会被浏览器端 import，必须零依赖、同构可跑。
 * 用途是「检测意外改动」，不是密码学抗碰撞，FNV 完全够用。
 */
function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = (hash * prime) & mask
  }
  return hash.toString(16).padStart(16, '0')
}

/** 当前 78 张牌义的指纹 */
export function computeMeaningFingerprint(cards: readonly TarotCard[] = allCards): string {
  return `fnv1a64:${fnv1a64(serializeMeaning(cards))}`
}

/**
 * 已归档的牌义指纹。
 *
 * 【什么时候允许改这个常量】
 * 只有当你**有意**修订了某张牌的牌义时。那属于产品内容变更，
 * 应当单独提交、单独 review，并在 commit message 里说明改了哪张牌的哪一段。
 *
 * 【什么时候绝不允许改】
 * 做牌组、做视觉、做任何 Layer 2 / Layer 3 的工作时。
 * 如果那种改动让这条断言变红，说明你**误伤了牌义** —— 去修代码，不要来改这个常量。
 */
export const MEANING_FINGERPRINT = 'fnv1a64:335496fcc1712d90'
