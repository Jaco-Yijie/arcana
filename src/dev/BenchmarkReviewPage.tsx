/**
 * DEV-ONLY · Benchmark Style Anchor 评审台（Phase C1B-1 §15）
 *
 * ══════════════════════════════════════════════════════════════
 * 这不是产品功能。它只干一件事：
 *
 *   把同一张牌的五个版本放在**完全相同的条件下**并排，
 *   让"这五套到底是不是五副不同的牌"这个问题可以被真正回答。
 *
 * 【为什么必须专门做一个页面】
 * 在 Deck Library 里比较是无效的：那里每套牌带着自己的
 * Atmosphere（背景、光晕、色温）。看起来"很不一样"的感觉，
 * 有很大一部分来自页面环境而不是牌本身。
 * 遮住牌名之后还能不能分辨 —— 这才是 Deck Differentiation Gate 问的问题。
 *
 * 所以这里：同一个中性底、同一个尺寸、同一张牌、零 Atmosphere。
 * 剩下的差异全部来自原画。
 *
 * 【四轮比较对应 §16】
 *   ROUND A  正常大小并排        → 第一眼是否不同
 *   ROUND B  隐藏牌名与牌组名    → 不靠文字能否归属
 *   ROUND C  60px 缩略图         → 主体是否还认得出
 *   ROUND D  灰阶                → 差异是否只靠色相撑着
 *
 * ROUND D 是最容易被跳过、也最容易暴露问题的一轮：
 * 如果灰阶之后五张全都变成"差不多的深色构图"，
 * 那说明五套的区别只有调色板，Art Direction 并没有真正成立。
 * 灰阶只发生在这个页面的 CSS 滤镜里，**不会改动任何素材**。
 *
 * 【它不进导航】
 * 只在 import.meta.env.DEV 下注册路由。生产构建里这个模块不会被挂上去。
 * ══════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { allCards } from '@/data/deck'
import { CANONICAL_DECK_IDS, getArtBible } from '@/decks/art/bibles'
import { BENCHMARK_CARD_IDS } from '@/decks/art/briefs'
import { getManifest, STYLE_ANCHOR_CARD_ID } from '@/decks/artwork/manifests'
import { resolveCardArtwork } from '@/decks/artwork/resolver'
import type { DeckId } from '@/decks/ids'

type Round = 'A' | 'B' | 'C' | 'D'

const ROUND_LABEL: Record<Round, string> = {
  A: 'A · 正常大小',
  B: 'B · 隐藏文字',
  C: 'C · 60px 缩略',
  D: 'D · 灰阶',
}

const ROUND_HINT: Record<Round, string> = {
  A: '五张并排。第一眼能不能看出这是五副不同的牌？',
  B: '牌名与牌组名全部隐藏。仍然要能说出哪张是月光、哪张是幽影。',
  C: '缩到 60px 宽。主体还认得出来吗？五套还有区别吗？',
  D: '临时灰阶（仅 CSS 滤镜，不改素材）。如果五张全变成差不多的深色构图，说明区别只靠色相撑着。',
}

/** ROUND C 的宽度。60px 是 Quality Gate A-05 的判据，不是随手取的 */
const THUMB_W = 60
const NORMAL_W = 168
const ZOOM_W = 420

export function BenchmarkReviewPage() {
  const [cardId, setCardId] = useState(STYLE_ANCHOR_CARD_ID)
  const [round, setRound] = useState<Round>('A')
  const [zoom, setZoom] = useState<DeckId | null>(null)
  /* §15 要求「隐藏牌名」与「60px 缩略」是两个**独立**开关：
     评审时经常需要「60px + 遮名」同时开 —— 那是 A-05 与 A-04 的交集，
     也是最难过的一档。四轮是 §16 的流程，独立开关是 §15 的工具，两者不冲突。 */
  const [hideTextManual, setHideTextManual] = useState(false)

  const card = useMemo(() => allCards.find((c) => c.id === cardId), [cardId])

  /* 每套牌当前实际解析到什么 —— 这一行决定了页面顶部的横幅说什么。
     不问"图应该在吗"，问"resolver 现在真的给了什么"。 */
  const resolved = useMemo(
    () =>
      CANONICAL_DECK_IDS.map((deckId) => ({
        deckId,
        plan: resolveCardArtwork(deckId, cardId, { previewBenchmark: true }),
        staged: Boolean(getManifest(deckId)?.cards[cardId]),
      })),
    [cardId],
  )

  const rasterCount = resolved.filter((r) => r.plan.kind === 'raster').length
  const width = round === 'C' ? THUMB_W : NORMAL_W
  const hideText = round === 'B' || hideTextManual

  if (!card) return <div className="p-8 text-text-mid">未知 cardId：{cardId}</div>

  return (
    <div className="min-h-dvh bg-bg-void px-4 py-6 text-text-hi sm:px-8">
      <header className="mx-auto max-w-5xl">
        <p className="text-[11px] tracking-wide-caps text-gold-dim">DEV ONLY · 不在导航中</p>
        <h1 className="mt-1 text-title">Benchmark Style Anchor 评审台</h1>

        {/* 顶部横幅：诚实地说出现在看到的是什么。
            这一条比页面上任何东西都重要 —— 没有它，
            五张程序化回退图会被当成"Benchmark 已完成"。 */}
        {rasterCount === 0 ? (
          <p className="mt-3 rounded border border-gold-dim/40 bg-gold-dim/8 px-3 py-2 text-caption leading-relaxed text-text-mid">
            <strong className="text-gold-dim">IMAGE_GENERATION_BLOCKED</strong> —— 尚未登记任何
            benchmark 原画。下面五张显示的是{' '}
            <strong className="text-text-hi">ProceduralCardArt 程序化回退</strong>，
            <strong className="text-text-hi">不是</strong> Benchmark Artwork。
            此状态下的比较结果 <strong className="text-text-hi">不能</strong> 用于通过 Style Anchor 评审。
          </p>
        ) : (
          <p className="mt-3 rounded border border-line-soft bg-bg-void px-3 py-2 text-caption leading-relaxed text-text-mid">
            {rasterCount} / {CANONICAL_DECK_IDS.length} 套已登记 benchmark 原画。
            其余仍为程序化回退 —— 混合状态下不要下"五套已区分"的结论。
          </p>
        )}
      </header>

      {/* 控制条 */}
      <div className="mx-auto mt-5 flex max-w-5xl flex-wrap items-center gap-2">
        {(['A', 'B', 'C', 'D'] as Round[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRound(r)}
            className={`rounded border px-3 py-1.5 text-caption transition-colors ${
              round === r
                ? 'border-silver/55 bg-silver/10 text-text-hi'
                : 'border-line-soft text-text-mid hover:text-text-hi'
            }`}
          >
            {ROUND_LABEL[r]}
          </button>
        ))}

        <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-caption text-text-mid">
          <input
            type="checkbox"
            checked={hideText}
            disabled={round === 'B'}
            onChange={(e) => setHideTextManual(e.target.checked)}
          />
          隐藏文字{round === 'B' ? '（B 轮强制）' : ''}
        </label>

        <span className="ml-auto flex items-center gap-2">
          <label htmlFor="bm-card" className="text-caption text-text-faint">
            牌
          </label>
          <select
            id="bm-card"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="rounded border border-line-soft bg-bg-void px-2 py-1.5 text-caption text-text-hi"
          >
            {BENCHMARK_CARD_IDS.map((id) => {
              const c = allCards.find((x) => x.id === id)
              return (
                <option key={id} value={id}>
                  {c ? `${c.nameZh}（${id}）` : id}
                </option>
              )
            })}
          </select>
        </span>
      </div>

      <p className="mx-auto mt-2 max-w-5xl text-caption text-text-faint">{ROUND_HINT[round]}</p>

      {/* 五张并排。同一个中性底、同一个尺寸、零 Atmosphere */}
      <div
        className="mx-auto mt-6 flex max-w-5xl flex-wrap items-start justify-center gap-6"
        style={{ filter: round === 'D' ? 'grayscale(1)' : undefined }}
      >
        {resolved.map(({ deckId, plan, staged }) => {
          const bible = getArtBible(deckId)
          return (
            <div key={deckId} className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom(deckId)}
                title="点击放大"
                className="cursor-zoom-in border-0 bg-transparent p-0"
              >
                <CardFrame size="md" deckId={deckId} width={`${width}px`}>
                  <TarotCardFace
                    card={card}
                    orientation="upright"
                    deckId={deckId}
                    size={round === 'C' ? 'sm' : 'md'}
                    showName={!hideText}
                    variant="full"
                    previewBenchmark
                  />
                </CardFrame>
              </button>

              {/* ROUND B 隐藏一切文字标识 —— 包括这一行 */}
              {!hideText && (
                <div className="text-center">
                  <p className="text-caption text-text-hi">{bible?.identity.name ?? deckId}</p>
                  <p className="font-mono text-[10px] text-text-faint">{deckId}</p>
                  <p
                    className={`font-mono text-[10px] ${
                      plan.kind === 'raster' ? 'text-gold-dim' : 'text-text-faint'
                    }`}
                  >
                    {plan.kind}
                    {staged ? '' : ' · 未登记'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 单张放大 */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg-void/92 p-6"
          onClick={() => setZoom(null)}
          role="presentation"
        >
          <div className="flex flex-col items-center gap-3">
            <CardFrame size="lg" deckId={zoom} width={`${ZOOM_W}px`}>
              <TarotCardFace
                card={card}
                orientation="upright"
                deckId={zoom}
                size="lg"
                showName={!hideText}
                variant="full"
                previewBenchmark
              />
            </CardFrame>
            <p className="text-caption text-text-faint">点击任意处关闭</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default BenchmarkReviewPage
