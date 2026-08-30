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
 * 【逆位】
 * 逆位在**数据层**即 rotate(180deg) 呈现，翻开后直接就是那个朝向 ——
 * 刻意不做「翻开后再转过来」的二次动画，那会让人觉得是系统在当场决定方向。
 * 也正因为如此，牌面资产里**不存在** -reversed 文件：同一张图转 180°。
 */

import type { Orientation, TarotCard } from '@/types/tarot'
import type { AssetVariant } from '@/decks/types'
import type { DeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'
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

export function TarotCardFace({
  card,
  orientation,
  deckId,
  size = 'md',
  showName = true,
  variant,
  previewBenchmark = false,
}: TarotCardFaceProps) {
  const reversed = orientation === 'reversed'
  const deck = getDeck(deckId)
  const { typography, numbering } = deck.visual

  /* 编号数值来自 Layer 1，牌组只决定「怎么画」。
     大阿卡纳才画编号 —— 小阿卡纳的 number 是 1–14，单独画出来没有意义。 */
  const showNumber = numbering.style !== 'none' && card.arcana === 'major' && size !== 'sm'
  const numberText =
    numbering.style === 'roman' ? toRoman(card.number) : String(card.number).padStart(2, '0')

  return (
    <div className="absolute inset-0">
      {/* 插画与编号一起翻转：编号是印在牌上的，不是 UI */}
      <div
        className="absolute inset-0"
        style={{ transform: reversed ? 'rotate(180deg)' : undefined }}
      >
        {/* 正式牌面入口：解析规则集中在 CardArtwork 一处 */}
        <CardArtwork
          deckId={deckId}
          cardId={card.id}
          showPath={size === 'lg'}
          variant={variant ?? (size === 'sm' ? 'thumb' : 'full')}
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

      {showName && (
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
