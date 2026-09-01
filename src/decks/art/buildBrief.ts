/**
 * Phase C1A · Brief 合成器
 *
 * ══════════════════════════════════════════════════════════════
 *   Layer 1 语义层（78 张）   →  brief.tarot        牌义，五套逐字节相同
 *   DeckArtBible             →  brief.deckTranslation  这套牌怎么画
 *   CardBriefSeed（手写）     →  brief.visual       这一张画什么
 *                            →  合成 CardArtBrief
 *
 * 【为什么要合成而不是直接手写整个 Brief】
 * 手写整份 Brief 意味着牌义会被抄进 25 份文件里 —— 抄写就是漂移的开始，
 * 而「为了画面漂亮改牌义」正是 §8 的红线。
 * 这里 `tarot` 全部现读现填，作者在 seeds 里根本没有它的位置。
 * ART-03 断言同一 cardId 在五套下的 tarot 字段完全一致。
 * ══════════════════════════════════════════════════════════ */

import { allCards } from '@/data/deck'
import type { DeckId } from '../ids'
import { getArtBible } from './bibles'
import { BENCHMARK_SEEDS } from './briefs'
import type { BriefTarot, CardArtBrief } from './types'

const cardById = new Map(allCards.map((c) => [c.id, c]))

const COUNT_WORDS: Readonly<Record<number, string>> = {
  2: 'TWO',
  3: 'THREE',
  4: 'FOUR',
  5: 'FIVE',
  6: 'SIX',
  7: 'SEVEN',
  8: 'EIGHT',
  9: 'NINE',
  10: 'TEN',
}

const SUIT_SYMBOLS: Readonly<Record<string, string>> = {
  wands: 'wands',
  cups: 'cups',
  swords: 'swords',
  pentacles: 'pentacle symbols (coin/disks with a clear five-pointed pentagram)',
}

export function briefKey(deckId: DeckId, cardId: string): string {
  return `${deckId}:${cardId}`
}

/**
 * 未来生产 Prompt 的硬约束入口。
 *
 * 这些条件不能退化成 `roughly` / `about` / `canonical symbols`：
 * 它们描述的是画面必须满足的可核验事实，而不是创作建议。
 */
export function buildProductionPromptConstraints(cardId: string): readonly string[] {
  const card = cardById.get(cardId)
  if (!card) return []

  if (card.arcana === 'minor' && card.number >= 2 && card.number <= 10 && card.suit) {
    const count = COUNT_WORDS[card.number]
    const symbol = SUIT_SYMBOLS[card.suit]
    if (count && symbol) {
      return [
        `EXACTLY ${count} clearly identifiable ${symbol}.`,
        'Every counted symbol must be individually visible, non-overlapping, and inside the frame.',
        'No border ornament, background object, reflection, or shadow may be mistaken for an additional counted symbol.',
      ]
    }
  }

  if (cardId === 'major-12') {
    return [
      "HARD ARCHETYPE: the human subject's own body is upside-down.",
      'The person is in an actual suspended orientation: head lower than hips and feet higher than head.',
      'The inversion must not be shown only through a reflection, shadow, landscape, architecture, or a rotated whole image.',
      'The posture and expression are calm, voluntary, contemplative, and clearly awake.',
      'The scene is symbolic and non-violent, with no injury, pain, struggle, or execution imagery.',
    ]
  }

  return []
}

/** 从语义层读出牌义部分。**唯一来源，不接受任何覆盖参数** */
function tarotOf(cardId: string): BriefTarot | null {
  const c = cardById.get(cardId)
  if (!c) return null
  return {
    cardId: c.id,
    name: c.name,
    nameZh: c.nameZh,
    arcana: c.arcana,
    suit: c.suit,
    number: c.number,
    semanticCore: c.keywordsUpright,
    symbolism: c.symbols,
    symbolMeanings: c.symbolism ?? [],
    meaningUpright: c.meaningUpright,
    meaningReversed: c.meaningReversed,
  }
}

/**
 * 合成一张 Brief。缺 seed 或缺 bible 时返回 null ——
 * **不编造**：没写的 brief 就是没写，不能用模板凑一份看起来完整的东西。
 */
export function buildCardArtBrief(deckId: DeckId, cardId: string): CardArtBrief | null {
  const bible = getArtBible(deckId)
  const seed = BENCHMARK_SEEDS[briefKey(deckId, cardId)]
  const tarot = tarotOf(cardId)
  if (!bible || !seed || !tarot) return null

  return {
    cardId,
    deckId,
    tarot,
    visual: seed.visual,
    deckTranslation: {
      medium: `${bible.medium.primary}；${bible.medium.secondary.join('、')}。表面：${bible.medium.surfaceTexture}`,
      palette: [...bible.palette.dominant, ...bible.palette.accent],
      lineLanguage: `${bible.lineLanguage.weight}。${bible.lineLanguage.behavior}。边缘：${bible.lineLanguage.edgeCharacter}`,
      lighting: `${bible.lighting.source}，${bible.lighting.direction}。对比：${bible.lighting.contrast}。${bible.lighting.behavior}`,
      environment: `${bible.composition.depth}。留白：${bible.composition.negativeSpace}。透视：${bible.composition.perspective}`,
      frame: `${bible.frame.structure}。装饰：${bible.frame.ornament}。牌名：${bible.frame.titlePlacement}。编号：${bible.frame.numberPlacement}`,
      typography: `${bible.typography.personality}；${bible.typography.caseStyle}；编号 ${bible.typography.numberingStyle}`,
    },
    mustInclude: seed.mustInclude,
    optional: seed.optional ?? [],
    /* 这一张的禁令 + 整套牌的禁令 + 调色板禁令，全部合并 */
    forbidden: [
      ...(seed.forbidden ?? []),
      ...bible.forbidden,
      ...bible.palette.forbidden.map((c) => `禁用颜色：${c}`),
    ],
    visualProductionConstraints: buildProductionPromptConstraints(cardId),
    thumbnailAnchor: seed.thumbnailAnchor,
  }
}

/** 全部已写好的 Benchmark Brief */
export function allBenchmarkBriefs(): CardArtBrief[] {
  return Object.keys(BENCHMARK_SEEDS)
    .map((key) => {
      const [deckId, cardId] = key.split(':') as [DeckId, string]
      return buildCardArtBrief(deckId, cardId)
    })
    .filter((b): b is CardArtBrief => b !== null)
}
