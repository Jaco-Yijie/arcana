/**
 * Phase C1A · 正式牌面渲染入口
 *
 * ══════════════════════════════════════════════════════════════
 *   <CardArtwork deckId cardId />
 *        │
 *        ├─ resolveCardArtwork(deckId, cardId)
 *        │     hybrid: 有已交付原画 → raster
 *        │             没有         → procedural 回退
 *        │     raster: 有登记       → raster
 *        │             没有         → missing（如实显示，不冒充）
 *        │
 *        └─ CardArtworkLayer 按 plan.kind 渲染
 *
 * 【为什么要在 CardArtworkLayer 之上再包一层】
 * `CardArtworkLayer` 的入参是**已经解析好的 plan** —— 它是渲染器，不是入口。
 * 调用方要用它就必须先自己调 resolver，于是「什么时候解析、传哪个 deckId」
 * 散落在各处；`TarotCardFace` 里就有一份，`DeckLibraryPage` 里还有一份。
 *
 * 390 张原画上线期间，解析规则会反复调整（status 门槛、回退策略、预取时机）。
 * 那些改动必须只发生在一个地方。这一层就是那个地方。
 *
 * 【它不做什么】
 * 不画边框、不画牌名、不画编号 —— 那些是 CardFrame 与 TarotCardFace 的职责，
 * 且它们按 DeckVisualSpec 走。这里只负责「这张牌的画面是什么」。
 * ══════════════════════════════════════════════════════════ */

import { useMemo } from 'react'
import { CardArtworkLayer } from './CardArtworkLayer'
import { resolveCardArtwork } from '@/decks/artwork/resolver'
import type { AssetVariant } from '@/decks/types'
import type { DeckId } from '@/decks/ids'

export interface CardArtworkProps {
  deckId: DeckId
  cardId: string
  /**
   * 取哪一档资产。Deck Library 的预览扇必须用 `thumb` ——
   * 那里同时挂几十张牌面，走 full 会是单页数 MB。
   */
  variant?: AssetVariant
  /** 缺素材时把期望路径画在牌面上。只在大尺寸开启 */
  showPath?: boolean
  /**
   * 仅供 DEV Visual QA：把 `status: 'benchmark'` 的试产原画也渲染出来。
   *
   * 正式牌面（TarotCardFace / Deck Library / 牌桌 / 解读页）**永远不传这个 prop** ——
   * benchmark 是未经人工批准的试产，它出现在用户面前就等于把没验收的东西发出去了。
   * 唯一的调用点是 `src/dev/BenchmarkReviewPage.tsx`。
   */
  previewBenchmark?: boolean
}

export function CardArtwork({
  deckId,
  cardId,
  variant = 'full',
  showPath = false,
  previewBenchmark = false,
}: CardArtworkProps) {
  /* 解析是纯函数且不发网络请求，但 78 张牌同屏时仍值得记住结果 */
  const plan = useMemo(
    () => resolveCardArtwork(deckId, cardId, { previewBenchmark }),
    [deckId, cardId, previewBenchmark],
  )
  return <CardArtworkLayer plan={plan} variant={variant} showPath={showPath} />
}

export default CardArtwork
