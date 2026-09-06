/**
 * 牌面图像层 —— 按 CardArtworkPlan 的三个分支渲染。
 *
 * 【三个分支，三种诚实的呈现】
 *   raster      真实插画。加载中显示同色底，不显示别的图
 *   procedural  legacy 牌组的程序化牌面（仅 legacy 可达）
 *   missing     素材未提供 —— **如实显示**，并把期望路径写在上面
 *
 * 【为什么 missing 态要长成这样】
 * 它刻意不好看，也刻意不像一张牌。
 * 如果缺素材时显示一张漂亮的占位图，那就是「用占位图冒充最终牌面」，
 * 而且会让人误以为这副牌已经能用了。
 * 一张缺失的牌就该看起来像一个待办事项 —— 上面直接写着文件该放哪。
 */

import type { AssetVariant, CardArtworkPlan, RasterArtworkPlan } from '@/decks/types'
import { useCardArtwork } from '@/decks/artwork/useCardArtwork'
import { ProceduralCardArt } from '@/decks/legacy/ProceduralCardArt'
import type { ArtMotif } from '@/decks/legacy/proceduralArt'

function RasterArtwork({
  plan,
  showPath,
  variant,
}: {
  plan: RasterArtworkPlan
  showPath: boolean
  variant: AssetVariant
}) {
  const state = useCardArtwork(plan, variant)
  /* ── thumb 兜底（Phase D5）──
     【为什么需要】实测 Slow 4G 冷缓存下，点「翻开这张牌」到牌面真正可见要 1662ms，
     其中 15/17 个采样帧是**空白卡面** —— 翻牌动画放完了，画还没到。
     原实现在 full 未就绪时只铺一层卡面底色，那就是那片空白。

     【为什么用 thumb 而不是别的占位】
     thumb 是**同一张画**，只是 240px 宽，中位数 12.9 KB（full 是 294.9 KB，23 倍差距）。
     它几乎总是先到，而且比例、构图、颜色与 full 完全一致 ——
     换成 full 时是同一个 <img> 换 src，盒子不动、不重播翻牌动画、不产生 CLS。
     用灰块或模糊占位都做不到这一点。

     【为什么不做长时间 blur 过渡】
     用户要的是立刻看见牌，不是看一张糊牌慢慢变清楚。所以没有 transition，
     thumb → full 是直接替换。240px 的图放在 112 CSS px 的盒子里本来就不糊。 */
  const wantsFull = variant === 'full' && plan.hasThumb
  const thumb = useCardArtwork(plan, wantsFull ? 'thumb' : variant)
  const fallbackThumb =
    wantsFull && state.status === 'loading' && thumb.status === 'ready' ? thumb.asset : null

  if (state.status === 'ready' || fallbackThumb) {
    const asset = state.status === 'ready' ? state.asset : fallbackThumb!
    return (
      <img
        src={asset.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        /* 写死原图像素尺寸，浏览器据此预留空间，消除 CLS */
        width={plan.width}
        height={plan.height}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  if (state.status === 'error') {
    /* 【已登记的牌加载失败 → 程序化兜底，而不是「加载失败」方块】
       这两种情况看起来都是「没有图」，但对用户的意义完全相反：
       素材从未交付（missing 分支）是待办事项，必须如实显示；
       而这里是素材已交付、已登记，只是这一次没拿到 —— 弱网、CDN 抖动、文件被误删。
       用户此刻正在读自己的占卜结果，「加载失败」对他不可操作，
       牌阵的完整性才是全部意义。所以有兜底就用兜底，并留一条 warn 给开发者。

       没有 fallback 的（raster 牌组）行为完全不变，仍然如实显示失败。 */
    if (plan.fallback) {
      if (import.meta.env?.DEV) {
        console.warn(
          `[artwork] 已登记的牌面加载失败，已回退到程序化牌面：${plan.deckId}/${plan.cardId} ← ${plan.path}`,
        )
      }
      return (
        <ProceduralCardArt
          deckId={plan.deckId}
          motif={plan.fallback.motif as ArtMotif}
          hue={plan.fallback.hue}
          tier={plan.fallback.tier}
        />
      )
    }
    return (
      <MissingArtwork cardId={plan.cardId} path={plan.path} showPath={showPath} reason="加载失败" />
    )
  }

  /* 加载中：只铺本牌组自己的卡面底色。
     刻意**不**先显示线稿再换成原画 —— 那种「突然变好看」的落差
     会让人觉得线稿版本是次一等的牌。 */
  return <div className="absolute inset-0 bg-card-sky-a" />
}

function MissingArtwork({
  cardId,
  path,
  showPath,
  reason = '素材未提供',
}: {
  cardId: string
  path: string
  showPath: boolean
  reason?: string
}) {
  /* 底板用近乎不透明的 bg-void：空灵/经典/蛋白潮汐的 card-sky 是**浅色**的，
     半透明底板压在象牙纸上会得到一片浑浊的中间调，文字直接糊掉。
     缺失态在任何牌组下都必须一眼可读 —— 它是给人看的待办事项，不是装饰。 */
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden bg-bg-void/92 p-1.5 text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-[3px] border border-dashed border-line-soft"
      />
      <span className="text-[9px] leading-none tracking-wide-caps text-text-faint">{reason}</span>
      <span className="font-mono text-[9px] leading-tight break-all text-text-mid">{cardId}</span>
      {showPath && (
        <span className="mt-0.5 font-mono text-[8px] leading-tight break-all text-text-faint">
          {path}
        </span>
      )}
    </div>
  )
}

/**
 * @param showPath 是否把期望的资产路径直接画在牌面上。
 *   只在大尺寸（lg，单张聚焦 / 对比页）开启 —— 小尺寸放不下，
 *   但缺失这件事本身在任何尺寸都必须可见。
 */
export function CardArtworkLayer({
  plan,
  showPath = false,
  variant = 'full',
}: {
  plan: CardArtworkPlan
  showPath?: boolean
  /**
   * 取哪一档资产。
   *
   * Deck Library 的预览扇必须用 `thumb`：那里同时挂 25 张牌面 + 5 张封面，
   * 走 full（1080×1800，约 220KB）就是单页 6MB，
   * 而实际显示宽度只有约 44 CSS px —— 像素面积浪费 500 倍。
   */
  variant?: AssetVariant
}) {
  switch (plan.kind) {
    case 'raster':
      return <RasterArtwork plan={plan} showPath={showPath} variant={variant} />
    case 'procedural':
      /* ★ plan.deckId 必须传下去 —— 这就是 V2.4「五套牌共用同一张牌面」的断点所在。
         plan 里一直有 deckId，只是从来没有人把它交给渲染层。
         deck:check 的 G 组会断言这个 prop 存在。 */
      return (
        <ProceduralCardArt
          deckId={plan.deckId}
          motif={plan.motif as ArtMotif}
          hue={plan.hue}
          tier={plan.tier}
        />
      )
    case 'missing':
      return <MissingArtwork cardId={plan.cardId} path={plan.expectedPath} showPath={showPath} />
  }
}

export default CardArtworkLayer
