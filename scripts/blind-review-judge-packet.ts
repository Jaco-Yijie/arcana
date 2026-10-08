/**
 * Multi-Agent Visual QA —— 第 3 步：Judge 包。
 *
 *     npx tsx scripts/blind-review-judge-packet.ts
 *
 * ══════════════════════════════════════════════════════════════
 * 【Judge 不复审一切 —— 那样它就是第六个 Reviewer】
 * 只有以下情形进 Judge（§13）：
 *   · 任一 Reviewer 判了 corrected / uncertain
 *   · 两个 Reviewer 的 verdict 不一致
 *   · Reviewer 自评 confidence 低
 *   · 双审对同一个数量/人物数/月相/持物/空间关系给出不同结果
 * 两人都高可信 PASS 的，不重看 —— 让 Judge 把注意力花在真正含糊的地方。
 *
 * 【Judge 必须重新看图（§14）】
 * 所以包里给的是**匿名图路径**，不是牌名。Judge 先自己看，再读双方结论。
 * 顺序写在 Prompt 里，这里只负责把该给的东西准备好、不该给的挡住。
 * ══════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const RUN = argValue('--run') ?? 'pilot'
const OUT_DIR = resolve(ROOT, 'qa/visual-semantics/multi-agent-review', RUN)

interface Obs { reviewId: string; reviewer: string; visibleFacts: Record<string, unknown>; uncertainObservations?: string[]; reviewConfidence?: string }
interface Cmp { reviewId: string; reviewer: string; verdict: string; issues?: unknown[]; suggestedPatch?: unknown }

function load<T>(sub: string): T[] {
  const dir = resolve(OUT_DIR, sub)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      const raw = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as T | T[]
      return Array.isArray(raw) ? raw : [raw]
    })
}

const manifest = JSON.parse(readFileSync(resolve(OUT_DIR, 'manifest.json'), 'utf8')) as {
  rows: { reviewId: string; blindImage: string; isControl: boolean; modelConfidence: string }[]
}
const observations = load<Obs>('blind-observations')
const comparisons = load<Cmp>('comparisons')

const LOW_CONF = /low|medium-low/i

mkdirSync(resolve(OUT_DIR, 'judge-packets'), { recursive: true })

const contested: string[] = []
const skipped: string[] = []

for (const row of manifest.rows) {
  const cs = comparisons.filter((c) => c.reviewId === row.reviewId)
  const os = observations.filter((o) => o.reviewId === row.reviewId)
  if (cs.length === 0) continue

  const verdicts = [...new Set(cs.map((c) => c.verdict))]
  /* 多数派 verdict —— 三审时 Judge 需要知道票型，而不只是「有分歧」 */
  const tally: Record<string, number> = {}
  for (const c of cs) tally[c.verdict] = (tally[c.verdict] ?? 0) + 1
  const anyProblem = cs.some((c) => c.verdict !== 'pass')
  const split = verdicts.length > 1
  const lowConf = os.some((o) => LOW_CONF.test(o.reviewConfidence ?? ''))

  /* 数量分歧：两人对同一类目给了不同数字 */
  const counts = os.map((o) => {
    const m = new Map<string, (number | null)[]>()
    for (const x of ((o.visibleFacts.objects ?? []) as { type: string; count: number | null }[])) {
      const k = x.type.toLowerCase()
      m.set(k, [...(m.get(k) ?? []), x.count ?? null])
    }
    return m
  })
  /* 两两比对 —— 加了平票裁决之后可能有 3 位 Reviewer，
     只比 counts[0] vs counts[1] 会漏掉第三人带来的分歧 */
  let countSplit = false
  for (let i = 0; i < counts.length; i += 1) {
    for (let j = i + 1; j < counts.length; j += 1) {
      for (const [k, la] of counts[i]!) {
        const lb = counts[j]!.get(k)
        if (lb && la.length === 1 && lb.length === 1 && typeof la[0] === 'number' && typeof lb[0] === 'number' && la[0] !== lb[0]) {
          countSplit = true
        }
      }
    }
  }
  const figs = os.map((o) => o.visibleFacts.figureCount).filter((v) => typeof v === 'number')
  const figSplit = new Set(figs).size > 1

  const reasons: string[] = []
  if (anyProblem) reasons.push('reviewer raised corrected/uncertain')
  if (split) reasons.push(`verdict split: ${verdicts.join(' vs ')}`)
  if (lowConf) reasons.push('low reviewer confidence')
  if (countSplit) reasons.push('object-count disagreement')
  if (figSplit) reasons.push('figure-count disagreement')

  if (reasons.length === 0) {
    skipped.push(row.reviewId)
    continue
  }
  contested.push(row.reviewId)

  writeFileSync(
    resolve(OUT_DIR, 'judge-packets', `${row.reviewId}.json`),
    `${JSON.stringify(
      {
        reviewId: row.reviewId,
        blindImage: row.blindImage,
        escalationReasons: reasons,
        reviewerCount: cs.length,
        verdictTally: tally,
        /* 现有语义的脱敏版 —— 与 Reviewer 第二阶段看到的完全一致 */
        existingSemanticFile: `qa/visual-semantics/multi-agent-review/${RUN}/reveal/${row.reviewId}.md`,
        reviewers: cs.map((c) => ({
          reviewer: c.reviewer,
          verdict: c.verdict,
          issues: c.issues ?? [],
          suggestedPatch: c.suggestedPatch ?? null,
          blindObservation: observations.find((o) => o.reviewId === c.reviewId && o.reviewer === c.reviewer) ?? null,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

writeFileSync(
  resolve(OUT_DIR, 'judge-packets', '_index.json'),
  `${JSON.stringify({ contested, skippedUnanimousPass: skipped }, null, 2)}\n`,
  'utf8',
)

console.log(`\nJudge 包：${contested.length} 张需复核 · ${skipped.length} 张双人高可信 PASS 直接放行`)
for (const id of contested) console.log(`  ${id}`)
if (skipped.length > 0) console.log(`\n  放行：${skipped.join(' ')}`)
console.log()
