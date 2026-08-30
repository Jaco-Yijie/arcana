/**
 * Deck 选择与整站换肤。
 *
 * 【为什么能不改任何页面就换整套氛围】
 * 现有组件已经全部消费 `var(--color-*)` token（见 styles/theme.css 的 `@theme`）。
 * 所以换牌组只需要把这些变量在 `<html>` 上重新赋值 ——
 * 洗牌、切牌、摊牌、翻牌、解读页一行代码都不用动。
 *
 * 【它绝不影响抽牌】
 * 这里只写 CSS 变量和一个 deckId。随机、牌序、正逆位、cardId、牌义
 * 全部与本文件无关 —— 它连 engine 都没有 import。
 *
 * 【迁移】
 * V2.4 的 deckId 取值（moonlight/classic/…）与本版本不同，且 `classic`
 * 在两个版本里是完全不同的两副牌。所以 v1 的值存在**独立的 storage key** 里，
 * 读到之后经 resolveDeckId 映射到 legacy-* 并写入 v2 key，一次性静默完成。
 */

import { createContext, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { DeckId } from '@/decks/ids'
import { DEFAULT_DECK_ID, resolveDeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'
import { StorageKeys, readJSON, writeJSON } from '@/utils/storage'

interface DeckContextValue {
  deckId: DeckId
  setDeckId: (id: DeckId) => void
  deck: ReturnType<typeof getDeck>
}

export const DeckContext = createContext<DeckContextValue | null>(null)

/**
 * 读取当前 deckId，必要时从 v1 迁移。
 *
 * 迁移只做一次：读到 v1 的值 → 映射 → 写入 v2 key。
 * v1 的 key 刻意**不删除** —— 万一映射表将来要修，原值还在。
 */
function loadDeckId(): DeckId {
  const v2 = readJSON<string | null>(StorageKeys.deck, null)
  if (v2 !== null) return resolveDeckId(v2, 2)

  const v1 = readJSON<string | null>(StorageKeys.deckV1, null)
  const migrated = resolveDeckId(v1, 1)
  if (v1 !== null) writeJSON(StorageKeys.deck, migrated)
  return v1 !== null ? migrated : DEFAULT_DECK_ID
}

export function DeckProvider({ children }: { children: ReactNode }) {
  const [deckId, setDeckIdState] = useState<DeckId>(loadDeckId)

  /* 【本文件不写 <html> 的 CSS 变量】
     写入由 DeckThemeSync 单独负责，它挂在 SessionProvider 内部，
     能同时看到「当前选择」和「会话冻结」两个来源。
     曾经这里也写过一次，结果是：React 的子 effect 先于父 effect 执行，
     DeckThemeSync 写完的冻结主题会被这里立刻覆盖回去 ——
     表现为牌桌上卡背是月光的构图、颜色却是森语的绿。
     单一写入方，才没有先后顺序可争。 */

  const setDeckId = useCallback((id: DeckId) => {
    writeJSON(StorageKeys.deck, id)
    setDeckIdState(id)
  }, [])

  const value = useMemo<DeckContextValue>(
    () => ({ deckId, setDeckId, deck: getDeck(deckId) }),
    [deckId, setDeckId],
  )

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}
