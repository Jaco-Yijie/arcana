/**
 * 牌组封面。
 *
 * 【它不是任何一张牌】
 * 封面是「这副牌的包装盒」，可以画得比单张牌更放得开。
 * 但它**绝不能**是 78 张里的某一张 —— 那会让那张牌获得不当的分量，
 * 用户会记住「经典那套的封面是死神」，进而给整副牌染上语义。
 * 它是独立资产，物理上也不在 `cards/` 里，而在 `deck/` 子目录 ——
 * 这样美术不可能「顺手」把一张牌放成封面。
 *
 * 【三态，与牌面完全一致】
 * registered + 加载成功 → 显示
 * registered + 加载失败 → **退回缺失态**，不是留白
 * 未 registered        → 缺失态 + 期望路径
 *
 * 第二条是补上的一个真实漏洞：旧版是裸 `<img>` 无 onError，
 * 登记了但文件 404 时图片透明，露出 CardFrame 的 `bg-card-sky-a`，
 * 看起来就是「一张纯色的封面设计」—— 这比程序化占位图更隐蔽地冒充成品。
 */

import { useState } from 'react'
import type { AssetVariant } from '@/decks/types'
import type { DeckId } from '@/decks/ids'
import { getManifest } from '@/decks/artwork/manifests'
import { deckCoverRepoPath, deckCoverUrl } from '@/decks/artwork/paths'
import { DeckCardBack } from '@/components/card/DeckCardBack'

interface Props {
  deckId: DeckId
  /** 是否把期望路径画出来（小尺寸放不下） */
  showPath?: boolean
  /**
   * 取哪一档。Deck Library 里封面只有 112–164 CSS px 宽，
   * 没有理由下载 1200 宽的原图 —— 默认走 thumb。
   * 需要大图的场合（未来的封面详情）显式传 'full'。
   */
  variant?: AssetVariant
  className?: string
}

export function DeckCover({ deckId, showPath = true, variant = 'thumb', className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const manifest = getManifest(deckId)
  const asset = manifest?.deck.cover ?? null
  /* 没有单独的缩略图时如实回退到 full —— 与牌面同样的处理 */
  const useThumb = variant === 'thumb' && asset?.thumb === true

  if (asset && !failed) {
    return (
      <img
        src={deckCoverUrl(deckId, asset.rev ?? manifest!.rev, useThumb ? 'thumb' : 'full')}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={asset.w}
        height={asset.h}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  /* ── 缺席时回退到卡背，而不是「封面未提供」虚线框 ──
     【为什么是卡背，不是某一张牌】
     本文件顶部那条规则没有松动：封面**绝不能**是 78 张里的某一张，
     否则那张牌会获得不当的分量，用户会记住「经典那套的封面是死神」。
     卡背不在这条规则里 —— 它不是任何一张牌，而且它正是用户在
     洗牌、切牌、摊牌全程盯着看 78 次的那一面，用它代表这副牌最诚实。

     【为什么不再显示「封面未提供」】
     D1 实测：5 套 78/78 全交付的牌组，封面位全是虚线空框（9 次），
     而封面是这一页自己定义的「第一视觉入口」。
     一个空框旁边挂着五张真实原画 —— 视觉重心完全错位，
     且它把一个**已完成**的产品说成了半成品。

     开发期的路径提示保留在 showPath 后面：只有显式要求时才出现，
     正式页面（showPath={false}）不会看到任何工程信息。 */
  if (!showPath) {
    return (
      <div className={`h-full w-full ${className}`}>
        <DeckCardBack deckId={deckId} simplified />
      </div>
    )
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center gap-1 bg-bg-void/92 p-2 text-center ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1.5 rounded-[3px] border border-dashed border-line-soft"
      />
      <span className="text-[10px] leading-none tracking-wide-caps text-text-faint">
        {failed ? '封面加载失败' : '封面未提供'}
      </span>
      <span className="font-mono text-[8px] leading-tight break-all text-text-faint">
        {deckCoverRepoPath(deckId)}
      </span>
    </div>
  )
}

export default DeckCover
