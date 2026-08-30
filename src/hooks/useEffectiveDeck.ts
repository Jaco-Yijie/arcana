/**
 * 「此刻该用哪副牌来画」的唯一判定。
 *
 * 进行中且已冻结的会话 → 用会话冻结的那副
 * 其余情况（还没进牌桌、没有会话）→ 用当前选中的那副
 *
 * 【为什么要抽成一个 hook】
 * 冻结规则一旦在多处各写一遍，迟早会有一处漏掉，
 * 表现就是「卡背是月光的构图，背景却是森语的绿」这种打架状态。
 * 判定只有一份，才不会分叉。
 */

import { useDeck } from './useDeck'
import { useSession } from './useSession'
import { resolveDeckId } from '@/decks/ids'
import type { DeckId } from '@/decks/ids'

export function useEffectiveDeckId(): DeckId {
  const { deckId } = useDeck()
  const { session } = useSession()
  if (session && session.status === 'in-progress' && session.deckLocked) {
    return resolveDeckId(session.deckId, session.deckSchema)
  }
  return deckId
}
