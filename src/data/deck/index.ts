/**
 * 梦幻超现实塔罗牌组（Dreamlike Tarot Deck）—— 78 张完整体系
 *
 * 数据层必须 78 张齐全：摊牌阶段用户面对的是一整副牌，
 * 若数据不全会直接破坏「这是我自己从整副牌里抽出来的」这一核心感受。
 *
 * 图像层不在此处：每张牌只声明 `art.motif / art.hue / art.tier`，
 * 由 CardArt 组件程序化生成画面（MVP 不做 78 张原创插画）。
 */

import type { TarotCard, TarotDeck } from '@/types/tarot'
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

/** MVP 唯一牌组 */
export const dreamlikeDeck: TarotDeck = {
  id: 'dreamlike',
  name: '梦幻超现实塔罗牌组',
  nameEn: 'Dreamlike Tarot',
  description:
    '深夜、星空、雾与星轨构成的超现实空间。底层为标准 78 张体系，牌面以统一的冷色调程序化绘制，牌背完全一致。',
  cards: allCards,
}

export { majorArcana, minorArcana }
