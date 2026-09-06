/**
 * D5 · Reveal 实际会用到的 390 张 full artwork 体积分布（STEP 0）
 * 只统计，不重新编码。
 */
import { statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'
import { getManifest } from '../src/decks/artwork/manifests.ts'
import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import { cardArtworkUrl, urlToRepoPath } from '../src/decks/artwork/paths.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'qa', 'performance-d5')
mkdirSync(OUT, { recursive: true })

interface Row { deckId: string; cardId: string; bytes: number; thumbBytes: number }
const rows: Row[] = []
for (const deckId of ALL_DECK_IDS.filter(isDeckPlayable)) {
  const m = getManifest(deckId)!
  for (const [cardId, entry] of Object.entries(m.cards)) {
    const rev = entry.rev ?? m.rev
    const full = join(ROOT, urlToRepoPath(cardArtworkUrl(deckId, cardId, rev, 'full')))
    const thumb = join(ROOT, urlToRepoPath(cardArtworkUrl(deckId, cardId, rev, 'thumb')))
    rows.push({ deckId, cardId, bytes: statSync(full).size, thumbBytes: statSync(thumb).size })
  }
}
const sizes = rows.map((r) => r.bytes).sort((a, b) => a - b)
const q = (p: number) => sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * p))]!
const avg = sizes.reduce((s, x) => s + x, 0) / sizes.length
const kb = (b: number) => +(b / 1024).toFixed(1)

const dist = {
  count: sizes.length,
  min: kb(sizes[0]!), p50: kb(q(0.5)), p75: kb(q(0.75)), p90: kb(q(0.9)), p95: kb(q(0.95)),
  max: kb(sizes[sizes.length - 1]!), average: kb(avg),
  totalMB: +(sizes.reduce((s, x) => s + x, 0) / 1048576).toFixed(1),
}
/* 离群判据：> 平均值 3 倍。不是「最大的 20 张」都算离群 —— 那只是排序结果 */
const OUTLIER_FACTOR = 3
const outliers = rows.filter((r) => r.bytes > avg * OUTLIER_FACTOR)
const top20 = [...rows].sort((a, b) => b.bytes - a.bytes).slice(0, 20)

const byDeck = Object.fromEntries(
  [...new Set(rows.map((r) => r.deckId))].map((d) => {
    const xs = rows.filter((r) => r.deckId === d).map((r) => r.bytes).sort((a, b) => a - b)
    return [d, { count: xs.length, p50: kb(xs[Math.floor(xs.length / 2)]!), max: kb(xs[xs.length - 1]!),
      totalMB: +(xs.reduce((s, x) => s + x, 0) / 1048576).toFixed(1) }]
  }),
)
const thumbSizes = rows.map((r) => r.thumbBytes).sort((a, b) => a - b)

writeFileSync(join(OUT, 'artwork-size.json'), JSON.stringify({
  full: dist, byDeck,
  thumb: { p50: kb(thumbSizes[Math.floor(thumbSizes.length / 2)]!), max: kb(thumbSizes[thumbSizes.length - 1]!),
    totalMB: +(thumbSizes.reduce((s, x) => s + x, 0) / 1048576).toFixed(1) },
  outlierRule: `> ${OUTLIER_FACTOR} × average (${kb(avg * OUTLIER_FACTOR)} KB)`,
  outliers: outliers.map((r) => ({ deck: r.deckId, card: r.cardId, kb: kb(r.bytes), ratio: +(r.bytes / avg).toFixed(2) })),
  top20: top20.map((r) => ({ deck: r.deckId, card: r.cardId, kb: kb(r.bytes), ratio: +(r.bytes / avg).toFixed(2) })),
}, null, 2))

console.log(`full artwork 体积分布（${dist.count} 张，合计 ${dist.totalMB} MB）`)
console.log(`  min ${dist.min} · p50 ${dist.p50} · p75 ${dist.p75} · p90 ${dist.p90} · p95 ${dist.p95} · max ${dist.max} KB · 平均 ${dist.average} KB`)
console.log(`\n按牌组：`)
for (const [d, s] of Object.entries(byDeck)) console.log(`  ${d.padEnd(18)} p50 ${String(s.p50).padStart(6)} KB · max ${String(s.max).padStart(6)} KB · ${s.totalMB} MB`)
console.log(`\nthumb: p50 ${kb(thumbSizes[Math.floor(thumbSizes.length / 2)]!)} KB · max ${kb(thumbSizes[thumbSizes.length - 1]!)} KB · 合计 ${(thumbSizes.reduce((s, x) => s + x, 0) / 1048576).toFixed(1)} MB`)
console.log(`\nARTWORK_SIZE_OUTLIER（> ${OUTLIER_FACTOR}× 平均 = ${kb(avg * OUTLIER_FACTOR)} KB）：${outliers.length} 张`)
for (const r of top20.slice(0, 8)) console.log(`  ${r.deckId}/${r.cardId}  ${kb(r.bytes)} KB  (${(r.bytes / avg).toFixed(2)}x)`)
console.log(`\n最大 20 张（仅供参考，不等于离群）：`)
for (const r of top20.slice(0, 8)) console.log(`  ${r.deckId}/${r.cardId}  ${kb(r.bytes)} KB  (${(r.bytes / avg).toFixed(2)}x)`)
