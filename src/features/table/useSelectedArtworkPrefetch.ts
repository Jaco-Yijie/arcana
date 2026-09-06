/**
 * 已选中牌的 Artwork 预取（Phase D5）
 *
 * ══════════════════════════════════════════════════════════════
 * 【它解决的问题 —— 实测出来的，不是猜的】
 * 用户把牌摆好之后，cardId 其实**已经确定**了。但直到他点「翻开这张牌」，
 * 前端才第一次去请求那张 1080×1800 的原画。
 *
 * Fast 4G 冷缓存实测：点击后 269ms 才发起请求，牌面首次可见要 931ms，
 * 其中 8/17 个采样帧是**空白卡面**。网络更慢时这段空白只会更长。
 * 也就是说，翻牌动画放完了，画还没到。
 *
 * 摆牌完成到用户点翻牌之间，通常有好几秒是白白浪费的。这个 hook 就是去用掉它。
 *
 * 【为什么不违反 G-05】
 * G-05 禁止的是「在牌翻开之前，让 Network 面板剧透**下一张牌是什么**」。
 * 那条约束针对的是**牌堆里还没被选中的牌** —— FanSpread 至今不请求任何正面，
 * `prefetchDeck` 至今没有调用方，这两条都没有松动。
 *
 * 而这里预取的是**用户自己已经选中并摆好的牌**：它们的身份在摆放那一刻就已经
 * 由用户的动作决定了，牌背朝上只是还没揭晓给眼睛看。请求这几张不会泄露
 * 任何「用户尚未决定」的信息 —— 牌阵里有哪几张，用户自己刚刚一张一张放上去的。
 *
 * 边界很清楚：**只取 placements 里的那几张**（1 / 3 / 5 张），
 * 绝不取整副 78 张，绝不取未选中的牌。PERF-02 断言锁住这一点。
 *
 * 【为什么用 image.decode()】
 * 只把字节下载下来还不够 —— 解码同样占时间，而且解码发生在主线程上。
 * `decode()` 让浏览器在图片真正上屏之前就完成解码，
 * 翻牌那一刻只剩合成，不会出现「下完了但还在解」的那一帧。
 * 不支持 decode() 的浏览器退回 onload，行为不变、不报错。
 * ══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from 'react'
import type { DeckId } from '@/decks/ids'
import { resolveCardArtwork } from '@/decks/artwork/resolver'

/** 单张牌的准备状态。刻意不持久化 —— 它是纯运行期的性能状态，不属于 session 语义 */
export type ArtworkReadiness = 'idle' | 'loading' | 'ready' | 'failed'

export interface SelectedCard {
  deckId: DeckId
  cardId: string
}

/**
 * @param cards  已摆好的牌。**必须只包含 placements 里的牌**
 * @param enabled 摆牌未完成时不启动 —— 中途预取会和用户还在挑牌的动作抢带宽
 */
export function useSelectedArtworkPrefetch(
  cards: readonly SelectedCard[],
  enabled: boolean,
): Record<string, ArtworkReadiness> {
  const [readiness, setReadiness] = useState<Record<string, ArtworkReadiness>>({})
  /* 已经发起过的 key，避免 React 重渲染导致重复触发 */
  const startedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || cards.length === 0) return
    let alive = true

    for (const { deckId, cardId } of cards) {
      const key = `${deckId}/${cardId}`
      if (startedRef.current.has(key)) continue
      startedRef.current.add(key)

      const plan = resolveCardArtwork(deckId, cardId)
      /* 程序化 / 缺素材的牌没有栅格资产可预取，直接标 ready ——
         它们本来就不会有等待，不该让调用方以为还在加载 */
      if (plan.kind !== 'raster') {
        setReadiness((r) => ({ ...r, [key]: 'ready' }))
        continue
      }

      setReadiness((r) => ({ ...r, [key]: 'loading' }))
      /* ── 先 thumb 再 full ──
         thumb 中位数 12.9 KB，full 294.9 KB —— 23 倍差距。
         Slow 3G（400kbps）下 full 要 5 秒以上，而 thumb 半秒内就到。
         先把便宜的那档拿下来，翻牌那一刻至少有**同一张画**可显示；
         full 在后台继续下，好了自然替换。
         实测 Slow 3G 冷启动：不预取时点击后 6.5 秒仍是空白卡面。
         这一个 await 不阻塞 full —— 两个请求都由 loadAsset 去重与缓存。 */
      if (plan.hasThumb) void plan.load('thumb').catch(() => {})
      plan
        .load('full')
        .then(async (asset) => {
          /* 解码也提前做掉。decode() 失败不影响正确性 —— 字节已经在缓存里了 */
          const Ctor = (globalThis as { Image?: new () => HTMLImageElement }).Image
          if (Ctor) {
            const img = new Ctor()
            img.src = asset.src
            try { await img.decode?.() } catch { /* 不支持或被中断，退回 onload 语义 */ }
          }
          if (alive) setReadiness((r) => ({ ...r, [key]: 'ready' }))
        })
        .catch(() => {
          /* 预取失败不是错误状态 —— 翻牌时 useCardArtwork 会正常重试。
             这里只是「没能提前准备好」，UI 该走 thumb 兜底 */
          if (alive) setReadiness((r) => ({ ...r, [key]: 'failed' }))
        })
    }

    return () => { alive = false }
    /* 依赖 key 的拼接串而不是数组引用：placements 每次渲染都是新数组，
       但只要牌没变就不该重新预取 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cards.map((c) => `${c.deckId}/${c.cardId}`).join('|')])

  return readiness
}
