/** Audit persisted multi-agent decisions through the real runtime path. No model calls. */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { allVisualReviews, getDeckVisualSemantics, getGeneratedVisualSemantics, projectVisualEvidence } from '../src/data/deckVisualSemantics/index.ts'
import { toRuntimeRecord } from '../src/types/visualSemantics.ts'
import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'

const root = resolve(import.meta.dirname, '..')
const base = resolve(root, 'qa/visual-semantics/multi-agent-review')
const full = loadAllFullVisualSemantics()
const reviews = allVisualReviews()
const humanFinal = JSON.parse(readFileSync(resolve(base, 'human-final-decisions.json'), 'utf8')) as Decision[]
const humanById = new Map(humanFinal.map((j) => [j.reviewId, j]))
const baseline = JSON.parse(readFileSync(resolve(base, 'generated-source-baseline.json'), 'utf8')) as Record<string, string>
for (const [path, hash] of Object.entries(baseline)) {
  assert.equal(createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex'), hash, `Generated source changed: ${path}`)
}
interface Decision {
  reviewId: string
  decision: string
  uncertainItems?: { field: string; item: string }[]
  uncertainFields?: string[]
}
const audit: { reviewId: string; card: string; decision: string; runtimeEvidencePresent: boolean }[] = []
const annotations: { reviewId: string; field: string; item: string }[] = []
const corrections: { card: string; field: string; before: string; after: string; reason?: string }[] = []
const filters: { card: string; field: string; removed: string[] }[] = []
for (const run of ['pilot', 'wave-1', 'wave-2', 'wave-3', 'wave-4', 'wave-5']) {
  const dir = resolve(base, run)
  const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')) as { rows: { reviewId: string; deckId: string; cardId: string }[] }
  const decisions = readdirSync(resolve(dir, 'judge')).filter((f) => f.endsWith('.json')).flatMap((f) => {
    const raw = JSON.parse(readFileSync(resolve(dir, 'judge', f), 'utf8')) as Decision | Decision[]
    return Array.isArray(raw) ? raw : [raw]
  })
  for (const row of manifest.rows) {
    const matches = decisions.filter((j) => j.reviewId === row.reviewId)
    assert.equal(matches.length, 1, `${row.reviewId}: must have exactly one final decision`)
    const j = humanById.get(row.reviewId) ?? matches[0]!
    const key = `${row.deckId}/${row.cardId}`
    const generated = getGeneratedVisualSemantics(row.deckId, row.cardId)!
    assert.deepEqual(generated, toRuntimeRecord(full[row.deckId]![row.cardId]!), `${key}: raw runtime drift`)
    if (!['AUTO_CORRECT', 'MARK_UNCERTAIN', 'CORRECTED'].includes(j.decision)) continue
    const review = reviews[key]
    assert.ok(review, `${key}: missing review-layer entry`)
    const runtime = getDeckVisualSemantics(row.deckId, row.cardId)!
    const ev = projectVisualEvidence(runtime, 'deep')
    assert.ok(ev, `${key}: entire card discarded`)
    for (const item of j.uncertainItems ?? []) {
      if (item.field === 'model self-reported uncertainty') { annotations.push({ reviewId: row.reviewId, ...item }); continue }
      const value = runtime[item.field as keyof typeof runtime]
      assert.ok(!JSON.stringify(value).includes(item.item), `${key}/${item.field}: uncertain item leaked`)
    }
    for (const field of review.uncertainFields ?? []) assert.deepEqual(runtime[field], field === 'scene' ? '' : [])
    for (const rule of review.replace ?? []) {
      for (const field of ['scene', 'keyObjects', 'spatialRelations', 'visualTensions', 'emphasizedAspects', 'deckSpecificMotifs'] as const) {
        const before = generated[field]
        const items = typeof before === 'string' ? [before] : before
        if (items.some((x) => x.includes(rule.find))) {
          assert.ok(!JSON.stringify(runtime[field]).includes(rule.find), `${key}/${field}: correction did not apply`)
          corrections.push({ card: key, field, before: rule.find, after: rule.with, reason: review.reason })
        }
      }
    }
    for (const field of ['scene', 'keyObjects', 'spatialRelations', 'visualTensions', 'emphasizedAspects', 'deckSpecificMotifs'] as const) {
      if (!review.uncertainFields?.includes(field) && review.patch?.[field] === undefined) continue
      const before = generated[field]
      const after = runtime[field]
      const removed = typeof before === 'string' ? (before !== after ? [before] : []) : before.filter((x) => !(after as string[]).includes(x))
      filters.push({ card: key, field, removed })
    }
    audit.push({ reviewId: row.reviewId, card: key, decision: j.decision, runtimeEvidencePresent: Boolean(ev) })
  }
}
const result = { generatedFilesUnchanged: Object.keys(baseline).length, affectedCardsAudited: audit.length, runtimeVisionApiCalls: 0, canonicalAndPromptVerification: 'tests/visual-semantics.test.ts: Multi-agent QA', audit, corrections, filters, qaOnlyAnnotations: annotations }
writeFileSync(resolve(base, 'runtime-audit.json'), JSON.stringify(result, null, 2) + '\n')
console.log(`Audited ${audit.length} affected cards; ${Object.keys(baseline).length} generated files unchanged; 0 Vision calls.`)
