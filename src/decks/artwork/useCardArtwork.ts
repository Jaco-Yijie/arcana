/**
 * Layer 2 · 牌面资产加载 hook
 *
 * 【R1：请求只在「这张牌已翻开」之后发起】
 * 本 hook 会在挂载时调用 plan.load()，也就是**发起网络请求**。
 * 所以它只能被挂载在「已翻开」的分支里 —— FlipCard 现有的 showFace
 * 逻辑天然满足这一点。任何把它提到翻牌之前的改动，
 * 都等于让 DevTools 的 Network 面板剧透下一张牌是什么（G-05）。
 *
 * 【失败处理】
 * 加载失败不回退到别的牌组、不回退到程序化图，
 * 而是退回 missing 态并把期望路径显示出来 ——
 * 一张加载不出来的牌应该长得像「这里缺一张牌」，
 * 而不是长得像「另一副牌的牌」。
 */

import { useEffect, useState } from 'react'
import type { ArtworkAsset, AssetVariant, RasterArtworkPlan } from '../types'

export type ArtworkLoadState =
  | { status: 'loading' }
  | { status: 'ready'; asset: ArtworkAsset }
  | { status: 'error'; message: string }

export function useCardArtwork(
  plan: RasterArtworkPlan,
  variant: AssetVariant = 'full',
): ArtworkLoadState {
  const [state, setState] = useState<ArtworkLoadState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    plan
      .load(variant)
      .then((asset) => {
        if (alive) setState({ status: 'ready', asset })
      })
      .catch((error: unknown) => {
        if (alive) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '资产加载失败',
          })
        }
      })
    return () => {
      alive = false
    }
    /* 依赖 identity + variant 而不是 plan 对象：plan 每次 resolve 都是新对象，
       但只要指向同一份美术的同一档就不该重新加载。
       identity 里含 rev，所以返修一版画会自然触发重新加载。 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.identity.key, variant])

  return state
}
