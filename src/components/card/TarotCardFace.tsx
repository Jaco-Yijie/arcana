/**
 * 牌面内容层（放进 CardFrame 里）—— Layer 1 与 Layer 2 的装配点。
 *
 * 【职责边界】
 * 这个组件是**唯一**把「这张牌是什么」和「这副牌长什么样」拼在一起的地方：
 *   - 牌名、编号数值、正逆位  ← Layer 1（card，来自 src/data/deck）
 *   - 插画、字体、编号排版    ← Layer 2（deckId，来自 src/decks）
 * 两边的数据在这里相遇，但**不互相污染**：
 * 牌名永远来自 card.nameZh，牌组只能决定它用什么字体画，不能决定它叫什么。
 *
 * 【为什么 deckId 是必填的】
 * 设成可选就会有人不传，然后日记回看会默默用「当前」牌组渲染 ——
 * 用户三个月前用蛋白潮汐抽的牌，今天打开变成了经典。
 * 必填强制每个调用点显式表态：这张牌该用哪副牌的画。
 *
 * 【逆位 —— Phase C3 改过一次，原方案与改的理由都留在这里】
 * 原方案：逆位在数据层即 `rotate(180deg)` 呈现，翻开后直接就是那个朝向。
 * 那个方案的前提是 paths.ts 规则 4「原画里不烘焙任何文字与数字」。
 *
 * C2 交付的 390 张原画把罗马数字与英文题字画进了构图（且是装饰边框的一部分，
 * 裁掉会破坏画面），于是 180° 旋转会让**画里的字倒过来**。
 * 冲突记录在 Arcana_Full_390/logs/path-contract-note.txt。
 *
 * 现方案：**不旋转图像**，逆位由独立的视觉标记表达 ——
 * 牌面顶部一条逆位色带 + 右上角倒置箭头 + 底部「逆位」字样。
 * 标记必须在 sm 尺寸（牌阵里的小牌）也可见，否则用户在摊开的牌阵上
 * 分不出正逆位，而正逆位恰恰是解读结论的一半。
 *
 * 【没有变的部分】
 * 牌面资产里**依然不存在** -reversed 文件 —— 正逆位共用同一个文件。
 * orientation 仍然只来自数据层，本组件不产生也不改写它。
 */

import type { Orientation, TarotCard } from '@/types/tarot'
import type { AssetVariant } from '@/decks/types'
import type { DeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'
import { artworkHasBakedText } from '@/decks/artwork/manifests'
import { THUMB_SPEC } from '@/decks/artwork/paths'
import { CardArtwork } from './CardArtwork'
import type { CardSize } from './CardFrame'

interface TarotCardFaceProps {
  card: TarotCard
  orientation: Orientation
  /** 用哪副牌的画来画这张牌。**必填** —— 见上方注释 */
  deckId: DeckId
  size?: CardSize
  /** 牌名是否画在牌面内（牌阵中的小牌不画，避免拥挤） */
  showName?: boolean
  /**
   * 取哪一档资产。sm 尺寸默认走 thumb —— Deck Library 与日记缩略图
   * 显示宽度只有几十 px，没有理由下载 1080 宽的原图。
   */
  variant?: AssetVariant
  /**
   * 这张牌实际会被渲染成多宽（CSS px）。给了就按**真实设备像素**选档，
   * 不给就退回按 size 档位选（既有行为不变）。
   *
   * 【为什么需要它 —— D3 实测】
   * `size` 是三个粗档，而 `sizeForWidth` 把 88–143px 全归进 `md`，`md` 取 full。
   * 于是 390×844 上翻牌页的牌宽 112px，却下载了 1080 宽的原图：
   * 112 × dpr2 = 224 设备像素，原图 1080 —— **过采样 4.8×，每张约 250KB**。
   * 一次五张牌的解读因此过网 1215.6KB，而这些像素一个都没被用上。
   *
   * 【判据是「够不够」，不是「省不省」】
   * 只有当 thumb 的真实像素宽 ≥ 这张牌需要的设备像素时才降档 ——
   * 也就是**按构造不可能变糊**。DPR3 的手机需要 336px，thumb 只有 240px，
   * 那里照常取 full。省下来的全是本来就看不见的像素。
   */
  displayWidth?: number
  /**
   * 仅供 DEV Visual QA（`/dev/benchmark`）：渲染 `status: 'benchmark'` 的试产原画。
   *
   * 【为什么这个口子开在这里，而不是让 QA 页自己拼一张牌】
   * Style Anchor 评审要判断的是「这五张牌摆在一起像不像五副不同的牌」，
   * 判断对象必须是**用户真正会看到的那张牌** —— 同样的边框、同样的编号、
   * 同样的牌名渐变、同样的 object-cover。QA 页自己拼一个近似的牌面，
   * 评审通过的东西和线上的东西就不是一回事了。
   *
   * 默认 false，且 artwork:check 的 B-04 断言正式调用点没有一处传 true。
   */
  previewBenchmark?: boolean
}

const NAME_CLASS: Record<CardSize, string> = {
  sm: 'text-[9px]',
  md: 'text-caption',
  lg: 'text-note',
}

/** 阿拉伯数字 → 罗马数字。只服务编号排版，与牌义无关 */
const ROMAN: readonly [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

function toRoman(n: number): string {
  if (n === 0) return '0'
  let rest = n
  let out = ''
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph
      rest -= value
    }
  }
  return out
}

const NUMBER_POSITION: Record<'top' | 'bottom' | 'corner', string> = {
  top: 'top-1 left-1/2 -translate-x-1/2',
  bottom: 'bottom-1 left-1/2 -translate-x-1/2',
  corner: 'top-1 left-1.5',
}

/**
 * 传进来的 displayWidth 是**布局引擎算出的牌宽**（`slot.card.w`），
 * 而真正绘制图像的那个盒子比它更大 —— CardFrame 的边框与内衬把它撑开了。
 *
 * 【这个系数是量出来的，不是估出来的】
 * 1440×900 上实测：inline style 写的是 **114.71px**，
 * 而 `<img>` 的实际绘制宽度是 **121.72px** —— 放大了 **6.1%**。
 * 1920 上同样是 6.1%（143.1 → 151.86），说明它是 CardFrame 的固定属性。
 *
 * 【不修正会怎样 —— 这是实测抓到的真实错误】
 * 按 114.71 算，dpr2 下需要 229px，thumb 的 240px 看起来够；
 * 按真实的 121.72 算需要 **243px**，thumb 不够。
 * 于是 1440 这一档会**选错档并且真的糊一点**，而且只糊在这一个视口 ——
 * 这正是最难被发现的一类错。
 *
 * 1.08 = 实测的 6.1% 再留一点亚像素取整的余量。宁可多取一档 full，
 * 也不能在「原画是第一视觉层」的产品里让牌面变糊。
 */
const FRAME_INFLATION = 1.08

/**
 * 档位决策。显式 variant > 按真实设备像素 > 按 size 档位。
 *
 * `THUMB_SPEC.card.width` 是缩略图的真实像素宽（240），与生成器共用同一份常量 ——
 * 哪天缩略图规格改了，这里的阈值跟着变，不会漂移成两个数字。
 */
function pickVariant(size: CardSize, displayWidth?: number): AssetVariant {
  if (size === 'sm') return 'thumb'
  if (displayWidth === undefined || displayWidth <= 0) return 'full'
  /* SSR / 无 window 时按 dpr=1 估；真实浏览器里一定有值 */
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const needed = displayWidth * FRAME_INFLATION * dpr
  return needed <= THUMB_SPEC.card.width ? 'thumb' : 'full'
}

export function TarotCardFace({
  card,
  orientation,
  deckId,
  size = 'md',
  showName = true,
  variant,
  displayWidth,
  previewBenchmark = false,
}: TarotCardFaceProps) {
  const reversed = orientation === 'reversed'
  const deck = getDeck(deckId)
  const { typography, numbering } = deck.visual

  /* 编号数值来自 Layer 1，牌组只决定「怎么画」。
     大阿卡纳才画编号 —— 小阿卡纳的 number 是 1–14，单独画出来没有意义。

     【bakedText 这一项是 Phase C3 加的】
     C2 的原画把罗马数字画在了顶部正中 —— 恰好是 NUMBER_POSITION.top 的位置。
     不加这个判断，大阿卡纳会在同一个像素位置叠出两个编号。
     判断依据来自资产侧的登记（DECKS_WITH_BAKED_TEXT），不是 deckId 前缀。 */
  const bakedText = artworkHasBakedText(deckId)
  const showNumber =
    numbering.style !== 'none' && card.arcana === 'major' && size !== 'sm' && !bakedText
  const numberText =
    numbering.style === 'roman' ? toRoman(card.number) : String(card.number).padStart(2, '0')

  return (
    <div className="absolute inset-0">
      {/* 【不再旋转】见文件头注释：原画自带文字，旋转会倒字。
          逆位改由下方的标记层表达，插画与编号保持正向。 */}
      <div className="absolute inset-0">
        {/* 正式牌面入口：解析规则集中在 CardArtwork 一处 */}
        <CardArtwork
          deckId={deckId}
          cardId={card.id}
          showPath={size === 'lg'}
          variant={variant ?? pickVariant(size, displayWidth)}
          previewBenchmark={previewBenchmark}
        />

        {showNumber && (
          <span
            className={`pointer-events-none absolute ${NUMBER_POSITION[numbering.position]} text-[10px] leading-none text-text-hi/70`}
            style={{ fontFamily: numbering.font }}
          >
            {numberText}
          </span>
        )}
      </div>

      {/* ── 逆位标记层 ──
          【为什么必须在 sm 也可见】
          牌阵里的小牌不画牌名（showName=false），如果逆位只靠底部那行
          「逆位」字样表达，用户在摊开的牌阵上就完全分不出朝向 ——
          而正逆位是解读结论的一半。所以标记与 showName 解耦，独立渲染。

          【为什么是色带 + 箭头而不是给整张牌加滤镜】
          滤镜会改变画面本身的颜色，而五套牌的调色正是它们的身份；
          「逆位」是牌的状态，不该动到牌的画。
          标记全部画在画面之外的边缘，不遮挡构图主体。 */}
      {reversed && (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* 顶部色带：最先进入视野的位置，小尺寸下也是唯一还能看清的元素 */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gold-dim/80" />
          {/* 右上角倒置箭头：把「反过来」这件事画出来，不依赖文字 */}
          <span
            className={`absolute right-0.5 top-0.5 leading-none text-gold-dim ${
              size === 'sm' ? 'text-[8px]' : 'text-[11px]'
            }`}
            style={{ transform: 'rotate(180deg)', display: 'inline-block' }}
          >
            ⌃
          </span>
        </div>
      )}

      {/* ── 牌名遮罩层：原画自己印了标题时**不画** ──
          【D1 实测到的问题】
          五套正式牌组的原画底部都烘焙了英文题字带（`DECKS_WITH_BAKED_TEXT`）。
          这一层在它正上方铺一条 `from-bg-void/85` 的渐变再压中文牌名，
          结果不是「两个名字并存」，而是**原画的题字带被整条盖掉**，
          同时顶部烘焙的罗马数字被压扁到不可读 —— 画被 UI 毁掉了一条。

          【为什么是不画，而不是调透明度】
          调淡只会让两行字互相干扰得更含糊。原画已经回答了「这是哪张牌」，
          UI 再回答一次就是重复；重复的代价是遮住画，而画是这个产品最贵的资产。
          中文名有产品价值（不是所有人认得英文牌名），但它属于**牌外的说明层** ——
          由调用方画在牌下方，与牌位名同级（见 RevealPage 的 caption）。

          【逆位不受影响】
          正逆位是牌的**状态**，原画里没有、也不可能有 —— 上面那层独立的
          逆位标记（色带 + 倒置箭头）照常渲染，不随本层一起消失。 */}
      {showName && !bakedText && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 bg-gradient-to-t from-bg-void/85 to-transparent px-1 pt-4 pb-1.5">
          <span
            className={`text-text-hi ${NAME_CLASS[size]} leading-tight text-center`}
            style={{
              fontFamily: typography.nameFont,
              fontWeight: typography.nameWeight,
              letterSpacing: typography.nameTracking,
              textTransform: typography.nameCase === 'upper' ? 'uppercase' : undefined,
            }}
          >
            {card.nameZh}
          </span>
          {reversed && (
            <span className="text-[9px] tracking-wide-caps text-gold-dim">逆位</span>
          )}
        </div>
      )}
    </div>
  )
}

export default TarotCardFace
