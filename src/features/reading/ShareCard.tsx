/**
 * 分享卡（Share Card）—— 固定 4:5 的独立 DOM。
 *
 * 【为什么是独立 DOM，而不是截整页】
 * 截整页会把导航、折叠区、追问框、滚动位置一起带走，得到的是一张
 * 「某人的浏览器截图」，不是一张作品。而且整页宽高随视口变，
 * 每个人分享出来的比例都不一样。这里固定 1080×1350（社交平台竖版通用比例），
 * 用 aspect-ratio 承载，内部一切尺寸走容器查询单位 `cqw` ——
 * 于是同一份 DOM 在预览里是 320px 宽，导出时可以是 1080px 宽，版式完全一致。
 *
 * 【隐私：问题默认不出现】
 * 用户写下的问题往往是这次占卜里最私人的一句。默认只展示牌、牌阵、牌组、
 * 一句核心结论与日期；要不要带上原问题，由用户自己勾。
 * 这条与 AC-14 一致，不因为「分享图更好看」而放宽。
 *
 * 【关于导出 PNG —— 当前做不到，原因如实记在这里】
 * 把这张卡渲染成 PNG 需要 canvas，而 canvas 一旦画入跨源图片就会被污染，
 * `toBlob()` 直接抛 SecurityError。实测当前牌面来源
 * （Cloudflare R2 的 .r2.dev 公共地址）**不返回 `Access-Control-Allow-Origin`**，
 * 所以远端资产模式下导出必然失败 —— 本地资产模式（同源）反而能成。
 *
 * 与其做一个「本地能用、上线就坏」的按钮，这一版只交付可分享的版面本身，
 * 让用户自己截图。要真正导出，前置条件是给 R2 桶配 CORS，
 * 那是基础设施改动，不在本轮范围里。
 */

import type { TarotCard } from '@/types/tarot'
import type { DeckId } from '@/decks/ids'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { DeckSigil } from '@/components/deck/DeckSigil'
import { getDeck } from '@/decks/registry'

export interface ShareCardEntry {
  deckId: DeckId
  spreadName: string | null
  cards: { label: string; card: TarotCard; orientation: 'upright' | 'reversed' }[]
  /** 一句核心结论。取 readingTheme / headline[0] */
  insight: string | null
  /** 用户主动勾选后才传 */
  question?: string | null
  date: string
}

export function ShareCard({ entry }: { entry: ShareCardEntry }) {
  const deck = getDeck(entry.deckId)
  const n = entry.cards.length
  /* 牌宽按张数收缩，保证 1–5 张都能在同一版式里排下且不溢出。
     单位是 cqw（容器宽度百分比）—— 预览与导出尺寸不同，版式必须一致。 */
  const cardW = n <= 1 ? '46cqw' : n <= 3 ? '25cqw' : '16cqw'

  return (
    <div
      /* @container 让内部的 cqw 生效。固定 4:5 = 1080×1350 */
      className="@container relative isolate w-full overflow-hidden rounded-lg border border-line-hairline bg-bg-deep"
      style={{ aspectRatio: '1080 / 1350' }}
      data-share-card
    >
      {/* 牌组徽记：分享图上唯一的氛围元素，右上角，克制 */}
      <div className="pointer-events-none absolute right-[-4cqw] top-[-2cqw]">
        <DeckSigil deckId={entry.deckId} size="46cqw" opacity={0.1} />
      </div>

      <div className="relative flex h-full flex-col justify-between p-[7cqw]">
        <header>
          <p
            className="font-serif text-text-hi"
            style={{ fontSize: '5.2cqw', letterSpacing: '0.02em' }}
          >
            Arcana
          </p>
          <p className="mt-[1cqw] text-text-faint" style={{ fontSize: '2.6cqw' }}>
            {deck.name}
            {entry.spreadName ? ` · ${entry.spreadName}` : ''}
          </p>
        </header>

        {/* 牌 —— 分享图的主角 */}
        <div className="flex items-start justify-center" style={{ gap: n <= 3 ? '5cqw' : '2.5cqw' }}>
          {entry.cards.map((c, i) => (
            <div key={`${c.label}-${i}`} className="flex min-w-0 flex-col items-center gap-[1.6cqw]">
              <CardFrame width={cardW} size="md" state="locked" deckId={entry.deckId}>
                <TarotCardFace
                  card={c.card}
                  orientation={c.orientation}
                  deckId={entry.deckId}
                  size="sm"
                  variant="thumb"
                  showName={false}
                />
              </CardFrame>
              <span
                className="tracking-wide-caps text-text-faint"
                style={{ fontSize: '2.2cqw' }}
              >
                {c.label}
              </span>
              <span className="text-text-low" style={{ fontSize: '2.2cqw' }}>
                {c.card.nameZh}
                {c.orientation === 'reversed' ? '·逆' : ''}
              </span>
            </div>
          ))}
        </div>

        <div>
          {/* 只有用户主动勾选才出现 */}
          {entry.question && (
            <p className="mb-[2.5cqw] text-text-low" style={{ fontSize: '2.8cqw' }}>
              「{entry.question}」
            </p>
          )}
          {entry.insight && (
            <p
              className="font-serif leading-snug text-text-hi"
              style={{ fontSize: '4.2cqw' }}
            >
              {entry.insight}
            </p>
          )}
          <div className="mt-[4cqw] flex items-baseline justify-between border-t border-line-hairline pt-[3cqw]">
            <span className="text-text-faint" style={{ fontSize: '2.2cqw' }}>
              {entry.date}
            </span>
            <span className="tracking-wide-caps text-text-faint" style={{ fontSize: '2.2cqw' }}>
              亲手抽出的牌
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareCard
