/**
 * 会话期间的主题冻结。
 *
 * 【为什么需要这个组件】
 * DeckContext 把「当前选中牌组」的变量写到 <html> 上，这在没有进行中会话时是对的。
 * 但一次抽牌进行到一半时，用户去 Deck Library 换了一副牌 ——
 * 如果 <html> 上的变量跟着变，牌桌就会出现**构图与配色打架**的状态：
 * 卡背还是月光的月相（因为 ThemedCardBack 读的是 session 冻结的牌组），
 * 颜色却已经是森语的绿。看起来像出了 bug，而不像"氛围换了"。
 *
 * 所以冻结必须是**整套**的：既冻结画什么，也冻结用什么颜色画。
 *
 * 【为什么不直接在 DeckContext 里做】
 * DeckProvider 在组件树上位于 SessionProvider **外面**，读不到 session。
 * 这个组件挂在 SessionProvider 内部，在 DeckContext 写完之后再覆盖一次 ——
 * 同一个元素上后写的生效，不需要改动 Provider 的嵌套顺序。
 *
 * 【它不影响 Deck Library 的预览】
 * 库里每一行都用自己的变量套在自己的子树上（inline style 优先级更高），
 * 所以会话期间进去挑牌，每套牌仍然各自显示自己的颜色。
 * 被冻结的只有页面 chrome —— 而那恰恰是诚实的：你正在用这副牌抽牌。
 */

import { useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { useDeck } from '@/hooks/useDeck'
import { resolveDeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'
import { getAtmosphere } from '@/atmosphere/registry'

export function DeckThemeSync() {
  const { session } = useSession()
  const { deckId } = useDeck()

  /* 只有「已冻结且进行中」的会话才覆盖。
     未冻结时（还没进牌桌）用户换牌组应当立刻可见 —— 那是他在挑牌。 */
  const frozen =
    session && session.status === 'in-progress' && session.deckLocked
      ? resolveDeckId(session.deckId, session.deckSchema)
      : null

  useEffect(() => {
    const effective = frozen ?? deckId
    const { themeVars } = getAtmosphere(getDeck(effective).atmosphereId)
    const root = document.documentElement
    for (const [key, value] of Object.entries(themeVars)) {
      root.style.setProperty(key, value)
    }
    root.dataset.deck = effective
  }, [frozen, deckId])

  return null
}

export default DeckThemeSync
