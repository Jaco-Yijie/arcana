/**
 * Layer 1 · 塔罗语义层数据（Tarot Meaning Layer）—— 78 张完整体系
 *
 * 数据层必须 78 张齐全：摊牌阶段用户面对的是一整副牌，
 * 若数据不全会直接破坏「这是我自己从整副牌里抽出来的」这一核心感受。
 *
 * 【这一层与牌组无关】
 * 本目录只回答「这张牌是什么」：id、牌名、编号、大小阿卡纳、花色、正逆位牌义、
 * keywords、symbols。它**不回答「它长什么样」** —— 那属于 Layer 2（src/decks）。
 *
 * 所以这里没有任何 deckId，也没有任何视觉字段。
 * 五套牌组画的是同一批 cardId，牌义逐字节相同，由 MEANING_FINGERPRINT 与
 * deck:check 的 D 组断言共同钉死。
 *
 * 【路径为什么不改】
 * server/context/rebuild.ts 依赖 `src/data/deck/index.ts` 这个路径，
 * 而它属于绝对不可修改的红线文件。分层靠规则与断言成立，不靠目录改名。
 */

import type { TarotCard } from '@/types/tarot'
import { majorArcana } from './majorArcana'
import { minorArcana } from './minorArcana'

/** 78 张的完整牌序（大阿卡纳 0–21 在前，小阿卡纳按花色在后） */
export const allCards: TarotCard[] = [...majorArcana, ...minorArcana]

export const EXPECTED_CARD_COUNT = 78

/**
 * 模块加载期的轻量完整性检查。
 * 数据缺张 / id 重复属于会污染整个抽牌流程的错误，必须在启动时就暴露。
 */
function assertDeckIntegrity(cards: TarotCard[]): void {
  if (cards.length !== EXPECTED_CARD_COUNT) {
    throw new Error(
      `[deck] 牌组数量异常：期望 ${EXPECTED_CARD_COUNT} 张，实际 ${cards.length} 张`,
    )
  }
  const seen = new Set<string>()
  for (const card of cards) {
    if (seen.has(card.id)) {
      throw new Error(`[deck] 牌 id 重复：${card.id}`)
    }
    seen.add(card.id)
  }
}

assertDeckIntegrity(allCards)

/** id → 牌 的索引表，供 O(1) 查询 */
export const cardById: Record<string, TarotCard> = Object.fromEntries(
  allCards.map((card) => [card.id, card]),
)

/**
 * 按 id 取牌。id 不存在属于程序错误（牌序只可能来自本牌组），直接抛出。
 */
export function getCard(id: string): TarotCard {
  const card = cardById[id]
  if (!card) {
    throw new Error(`[deck] 未找到牌：${id}`)
  }
  return card
}

export { majorArcana, minorArcana }
