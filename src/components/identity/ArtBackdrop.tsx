/**
 * Art Backdrop V3 —— 分层背景
 *
 * 【为什么是分层而不是一张大图】
 * 一张全屏底图在 390 与 1920 两端必然二选一：要么手机上被裁掉主体，
 * 要么桌面上被拉糊。而且它一旦压过卡牌，这个产品的主角就换人了。
 * 分层的好处是每一层可以各自决定「在小屏上怎么退让」：
 * 云气收窄、植物线稿整层隐藏、月轮改变位置，互不牵连。
 *
 * 【五层，从后往前】
 *   1 wash      深色渐变 + 两处极低饱和的光晕（纯 CSS，0 字节）
 *   2 grain     宣纸颗粒（240×240 feTurbulence 平铺，443 B）
 *   3 damask    古典纹样暗压（160×160 平铺，588 B）
 *   4 art       水墨山影 / 云气 / 植物线稿 / 月轮（4 个 SVG，合计 3.8 KB）
 *   5 sigil     现有的牌组徽记轴线与印记（原样保留）
 *
 * 【为什么不用 WebGL / canvas / 动画滤镜】
 * 明确要求之外，还有一个实际原因：这一层在**每一个页面**都在，
 * 包括牌桌那五步。那些页面上每一帧都在做指针跟随与卡牌变换，
 * 背景不能参与合成竞争。所以全部是静态位图/矢量，
 * 唯一的动效是月轮那一层 24s 的极慢漂移，并且 prefers-reduced-motion 下关掉。
 *
 * 【它不参与布局】
 * `position: fixed; inset: 0; z-index: -1; pointer-events: none`，
 * 且不含任何会引起 reflow 的内容 —— 换页面时它不重绘。
 */

export type BackdropVariant = 'page' | 'cover' | 'home'

export function ArtBackdrop({
  cover = false,
  variant,
}: {
  /** @deprecated 用 variant="cover"。保留是为了不动既有调用点 */
  cover?: boolean
  variant?: BackdropVariant
}) {
  const kind: BackdropVariant = variant ?? (cover ? 'cover' : 'page')
  return (
    <div aria-hidden="true" className={`art-backdrop art-backdrop-${kind}`}>
      <div className="art-wash" />
      <div className="art-grain" />
      <div className="art-damask" />
      <div className="art-moon" />
      <div className="art-cloud" />
      <div className="art-ink" />
      <div className="art-botanical" />
      <div className="art-axis" />
      <span className="art-seal">☽</span>
      <div className="art-vignette" />
    </div>
  )
}

export default ArtBackdrop
