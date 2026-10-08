/**
 * Multi-Agent Visual QA —— 第 5 步：把 Judge 批准的修正写进现有复核层。
 *
 *     npx tsx scripts/blind-review-apply.ts            只打印计划（默认 dry-run）
 *     npx tsx scripts/blind-review-apply.ts --write    真的写 review.json
 *
 * ══════════════════════════════════════════════════════════════
 * 【它只写 qa/visual-semantics/review.json，和人手写的是同一个文件】
 * §21 要求不能建立第二套 override 逻辑 —— 所以这里不发明任何新字段、
 * 不新增新文件、不碰 src/data/deckVisualSemantics/。生成数据永远是
 * 「模型当时看到的」那份原始记录，多 Agent 的结论和人的结论走同一条
 * replace / patch / uncertainFields 通道，运行时由同一个 applyVisualReview 合并。
 *
 * 【溯源怎么存（§19）】
 * 不加字段。reviewer 写成 `multi-agent:reviewer-a+reviewer-c/judge-agent`，
 * reason 里写清依据。这两个字段在 applyVisualReview 里**本来就被丢弃**，
 * 永远不会进 Reading Prompt —— 这正是 §19 要的效果，而且不需要改任何类型。
 *
 * 【为什么默认 dry-run】
 * 这一步是整条链路上唯一会改真实数据的地方。AUTO_CORRECT 的门槛再高，
 * 也应该让人看一眼计划再落笔 —— 尤其是 replace 规则匹配不上时，
 * 静默失效比写错更难发现。
 * ══════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { getGeneratedVisualSemantics } from '../src/data/deckVisualSemantics/index.ts'
import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'
import { reviewKey } from '../src/types/visualSemantics.ts'
import type {
  VisualReviewEntry,
  VisualReviewFile,
  VisualPatchableField,
} from '../src/types/visualSemantics.ts'

const ROOT = resolve(import.meta.dirname, '..')
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const RUN = argValue('--run') ?? 'pilot'
const OUT_DIR = resolve(ROOT, 'qa/visual-semantics/multi-agent-review', RUN)
const REVIEW_PATH = resolve(ROOT, 'qa/visual-semantics/review.json')

const WRITE = process.argv.includes('--write')

/** uncertainDetails 只在完整记录里，用来解释「为什么这条规则不可能生效」 */
const FULL = loadAllFullVisualSemantics()
function getGeneratedVisualSemanticsUncertain(deckId: string, cardId: string): string[] | null {
  return FULL[deckId]?.[cardId]?.confidence.uncertainDetails ?? null
}

const G = '\x1b[32m'; const Y = '\x1b[33m'; const R = '\x1b[31m'; const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'

interface JudgeDecision {
  reviewId: string
  decision: 'AUTO_PASS' | 'AUTO_CORRECT' | 'HUMAN_REVIEW' | 'MARK_UNCERTAIN'
  confidence: string
  reason: string
  independentFinding?: string
  correctionConfidence?: string
  judgeSourceFile?: string
  uncertainFields?: VisualPatchableField[]
  /** 条目级丢弃 —— 比整字段精确得多，优先使用 */
  uncertainItems?: { field: VisualPatchableField; item: string }[]
  patch?: { replace?: { find: string; with: string }[] }
}

interface ManifestRow {
  reviewId: string
  deckId: string
  cardId: string
  isControl: boolean
}

function load<T>(sub: string): T[] {
  const dir = resolve(OUT_DIR, sub)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .flatMap((f) => {
      const raw = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as T | T[]
      const rows = Array.isArray(raw) ? raw : [raw]
      return sub === 'judge' ? rows.map((row) => ({ ...row, judgeSourceFile: `${RUN}/judge/${f}` })) : rows
    })
}

const manifest = JSON.parse(readFileSync(resolve(OUT_DIR, 'manifest.json'), 'utf8')) as {
  rows: ManifestRow[]
}
const byId = new Map(manifest.rows.map((r) => [r.reviewId, r]))
const judgements = load<JudgeDecision>('judge')
const comparisons = load<{ reviewId: string; reviewer: string }>('comparisons')

const file: VisualReviewFile & { _readme?: unknown } = existsSync(REVIEW_PATH)
  ? (JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) as VisualReviewFile)
  : { version: 1, entries: {} }

const today = new Date().toISOString().slice(0, 10)
let planned = 0
let deadRules = 0
let skipped = 0

console.log(`\n${B}写入计划${X}  ${WRITE ? `${R}--write（真的会落盘）${X}` : `${D}dry-run${X}`}\n`)

for (const j of judgements) {
  const row = byId.get(j.reviewId)
  if (!row) continue
  const key = reviewKey(row.deckId, row.cardId)
  if ((file.entries[key] as { reviewMethod?: string } | undefined)?.reviewMethod === 'human-final') {
    console.log(`${G}★ HUMAN_FINAL ${X}${key}，保留人工最终裁决，不覆盖`)
    skipped += 1
    continue
  }
  const reviewers = [...new Set(comparisons.filter((c) => c.reviewId === j.reviewId).map((c) => c.reviewer))]
  const provenance = `multi-agent:${reviewers.join('+')}/judge-agent`

  if (j.decision === 'HUMAN_REVIEW') {
    console.log(`${R}⊘ HUMAN_REVIEW${X}  ${key}  ${D}不写入，进人工队列${X}`)
    skipped += 1
    continue
  }

  /* 控制案例：review.json 里已经有一条人工修正。
     多 Agent 这轮是**盲测**，不是要覆盖人的结论 —— 保留原条目，只报告是否一致。 */
  if (row.isControl && file.entries[key]) {
    console.log(`${Y}★ 控制案例${X}  ${key}  ${D}已有人工修正，保留不覆盖（judge=${j.decision}）${X}`)
    skipped += 1
    continue
  }

  const entry: VisualReviewEntry & { reviewMethod?: string; provenance?: unknown } = { ...(file.entries[key] ?? { reviewStatus: 'pass' }) }

  entry.reviewMethod = 'multi-agent'
  entry.provenance = { run: RUN, reviewId: j.reviewId, reviewers, judge: { sourceFile: j.judgeSourceFile, decision: j.decision, confidence: j.confidence, correctionConfidence: j.correctionConfidence, independentFinding: j.independentFinding } }

  if (j.decision === 'AUTO_PASS') {
    entry.reviewStatus = 'pass'
    entry.reason = j.reason
  }
  if (j.decision === 'MARK_UNCERTAIN' || (j.uncertainItems ?? []).length > 0 || (j.uncertainFields ?? []).length > 0) {
    /* ══ 条目级丢弃优先于整字段丢弃 ══
     *
     * 【整字段太钝，Pilot 量化过这笔账】
     * forest/swords-05 只有 1 条「持剑数量」存疑，但 uncertainFields: ['keyObjects']
     * 会把这张牌 **全部 8 条** keyObjects 一起清空 —— 包括「地上平放两把剑」
     * 这种两名 Reviewer 都独立确认过的可靠证据。为一个数字丢掉七条真话。
     *
     * 【怎么在不改核心代码的前提下做到条目级】
     * VisualReviewEntry 没有 uncertainItems 字段，而 §35 明确不许改其它功能。
     * 但 patch 本来就是「整字段覆盖」—— 把「保留项」原样列进去，
     * 效果就是精确删掉那一条。不新增任何类型、不碰 applyVisualReview。
     *
     * 【代价要说清楚】patch 是快照，下次 visual:semantics 重新生成后，
     * 新增的条目不会自动出现在这个字段里（replace 才跨重生成存活）。
     * 所以只在 Judge 明确点名了具体条目时才用；没点名就退回整字段。
     */
    const items = j.uncertainItems ?? []
    if (items.length > 0) {
      const generated = getGeneratedVisualSemantics(row.deckId, row.cardId)
      if (!generated) {
        console.log(`${R}✘ ${key} 没有生成记录 —— 跳过${X}`)
        skipped += 1
        continue
      }
      const patch: Partial<Record<VisualPatchableField, string[]>> = {}
      let droppedAny = false
      for (const field of [...new Set(items.map((i) => i.field))]) {
        const current = generated[field]
        if (field === 'scene') {
          entry.uncertainFields = [...new Set<VisualPatchableField>([...(entry.uncertainFields ?? []), 'scene'])]
          droppedAny = true
          console.log(`${G}✔ MARK_UNCERTAIN ${X}${key} scene（非列表锚句，使用字段过滤）`)
          continue
        }
        if (String(field) === 'model self-reported uncertainty') {
          console.log(`${D}QA-only annotation: ${key} ${field}，不进入 Runtime，无需 override${X}`)
          continue
        }
        if (!Array.isArray(current)) {
          console.log(`${R}✘ ${key} 条目级丢弃不支持非列表字段 ${field} —— 跳过该字段${X}`)
          continue
        }
        const drop = items.filter((i) => i.field === field).map((i) => i.item.trim().replace(/^[-*]\s+/, '').trim())
        const kept = current.filter((c) => !drop.some((d) => c.includes(d) || d.includes(c)))
        if (kept.length === current.length) {
          console.log(`${R}✘ ${key} ${field}：要丢的条目一条都没匹配上 —— 跳过${X}`)
          continue
        }
        patch[field] = kept
        droppedAny = true
        console.log(
          `${G}✔ MARK_UNCERTAIN ${X}${key}  ${D}${field} 条目级丢弃 ${current.length - kept.length}/${current.length}，保留 ${kept.length} 条${X}`,
        )
      }
      if (!droppedAny) {
        skipped += 1
        continue
      }
      entry.reviewStatus = 'uncertain'
      entry.uncertainFields = [...new Set([...(entry.uncertainFields ?? []), ...(j.uncertainFields ?? [])])]
      entry.patch = { ...(entry.patch ?? {}), ...patch }
      entry.reason = j.reason
      entry.reviewedAt = today
      entry.reviewer = provenance
    } else if ((j.uncertainFields ?? []).length === 0) {
      console.log(`${R}✘ ${key} 判为 MARK_UNCERTAIN 却既没点名条目也没点名字段 —— 跳过${X}`)
      skipped += 1
      continue
    }
    entry.reviewStatus = 'uncertain'
    entry.uncertainFields = [...new Set([...(entry.uncertainFields ?? []), ...(j.uncertainFields ?? [])])]
    entry.reason = j.reason
  }
  if (j.decision === 'AUTO_CORRECT' || (j.patch?.replace ?? []).length > 0) {
    /* AUTO_CORRECT */
    const rules = (j.patch?.replace ?? []).filter((r) => r?.find)
    if (rules.length === 0) {
      console.log(`${R}✘ ${key} 判为 AUTO_CORRECT 却没给 replace 规则 —— 跳过${X}`)
      skipped += 1
      continue
    }
    /* 规则必须真的匹配得上生成数据 —— 匹配不上的 replace 是静默失效，
       而静默失效的修正比不修正更危险：报告说改了，数据没改。

       【锚点归一化：一个真实踩到的坑】
       揭示包是 Markdown，列表项渲染成 `  - small lanterns hanging on the posts`。
       Agent 被要求「用现有文本里的精确子串」，于是它连 `- ` 前缀一起抄了下来，
       规则全部匹配不上。前缀纯粹是渲染产物、不是数据的一部分，
       所以这里剥掉它再匹配 —— 这不改变规则的含义。

       【不可 patch 的字段直接拒绝】
       `uncertainDetails` 里的句子也会出现在揭示包里，但它不在
       DeckVisualEvidence 中，applyVisualReview 根本不作用于它。
       针对它的 replace 写进去只会变成一条永远不生效的死规则。 */
    const generated = getGeneratedVisualSemantics(row.deckId, row.cardId)
    const hay = JSON.stringify(generated)
    /* find 与 with **都要**剥前缀。只剥 find 的话，
       替换文本会把一个多余的 `- ` 注进 keyObjects 条目里 ——
       一个渲染产物变成了数据内容，而且没人会再去看它一眼。 */
    const stripBullet = (s: string) => s.trim().replace(/^[-*]\s+/, '').trim()
    const normalized = rules.map((r) => ({
      find: stripBullet(r.find),
      with: stripBullet(r.with),
    }))
    const live = normalized.filter((r) => hay.includes(r.find))
    const dead = normalized.filter((r) => !hay.includes(r.find))
    for (const r of dead) {
      const inUncertain = (
        getGeneratedVisualSemanticsUncertain(row.deckId, row.cardId) ?? []
      ).some((u) => u.includes(r.find))
      console.log(
        `  ${R}✘ 匹配不上，丢弃：「${r.find}」${X}${
          inUncertain ? `  ${D}（它在 uncertainDetails 里 —— 该字段不可 patch，也不进 Reading Prompt）${X}` : ''
        }`,
      )
      if (!inUncertain) deadRules += 1
    }
    if (live.length === 0) {
      console.log(`${R}✘ ${key} 全部 replace 规则都匹配不上 —— 跳过${X}`)
      skipped += 1
      continue
    }
    if (entry.reviewStatus !== 'uncertain') entry.reviewStatus = 'corrected'
    entry.replace = [...new Map([...(entry.replace ?? []), ...live].map((r) => [r.find, r])).values()]
    entry.reason = j.reason
  }

  entry.reviewedAt = today
  entry.reviewer = provenance
  file.entries[key] = entry
  planned += 1

  const tag = j.decision === 'AUTO_CORRECT' ? Y : G
  console.log(`${tag}✔ ${j.decision.padEnd(15)}${X}${key}  ${D}${reviewers.join('+')} · ${j.confidence}${X}`)
  for (const r of entry.replace ?? []) console.log(`    ${D}replace「${r.find}」→「${r.with}」${X}`)
  for (const f of entry.uncertainFields ?? []) console.log(`    ${D}uncertain ${f}（整字段不进 Prompt）${X}`)
}

if (deadRules > 0) throw new Error(`${deadRules} unmatched runtime replacement rules; refusing write`)

if (WRITE && planned > 0) {
  const entries: Record<string, VisualReviewEntry> = {}
  for (const k of Object.keys(file.entries).sort()) entries[k] = file.entries[k]!
  writeFileSync(REVIEW_PATH, `${JSON.stringify({ ...file, entries }, null, 2)}\n`, 'utf8')
  console.log(`\n${G}已写入 ${planned} 条 → ${REVIEW_PATH}${X}`)
} else if (planned > 0) {
  console.log(`\n${D}dry-run，未落盘。确认无误后加 --write${X}`)
}
console.log(`\n  计划 ${planned} · 跳过 ${skipped}${deadRules > 0 ? ` · ${R}失效规则 ${deadRules}${X}` : ''}\n`)
