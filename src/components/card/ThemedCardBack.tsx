/**
 * 牌桌上的卡背。
 *
 * 牌桌的四个组件（洗牌堆 / 切牌堆 / 扇形 / 手牌）都用这一个，
 * 所以换牌组时整条抽牌流程的卡背会一起变，不用逐个改。
 *
 * 【它读的是 session 冻结的牌组，不是当前选中的牌组】
 * 一次抽牌进行到一半时去换牌组，牌桌上的卡背**不该跟着变** ——
 * 那会让人觉得手里这叠牌被换掉了。冻结规则见 SessionContext.lockDeck。
 * 没有进行中的会话时（例如 Deck Library 预览），退回当前选中的牌组。
 *
 * 【它仍然是「统一牌背」】
 * 同一次抽牌里 78 张的卡背完全一致 —— 牌组决定的是**这一副牌长什么样**，
 * 不是「每张牌长什么样」。DeckCardBack 的签名里没有 cardId，
 * 所以「抽牌前泄露牌面」在结构上不可能发生。
 */

import { DeckCardBack } from './DeckCardBack'
import { useEffectiveDeckId } from '@/hooks/useEffectiveDeck'

interface Props {
  simplified?: boolean
  className?: string
}

export function ThemedCardBack({ simplified, className }: Props) {
  return (
    <DeckCardBack deckId={useEffectiveDeckId()} simplified={simplified} className={className} />
  )
}

export default ThemedCardBack
