/**
 * 视觉语义人工复核 CLI —— 走完 spot-check 清单用的最小工具。
 *
 *     npm run visual:review                       进度总览 + 下一张待审
 *     npm run visual:review -- --next             下一张待审（含全部字段与图片路径）
 *     npm run visual:review -- --card celestial/wands-06      看某一张（合并前后都给）
 *     npm run visual:review -- --card X --pass
 *     npm run visual:review -- --card X --uncertain --fields keyObjects --reason "数不清"
 *     npm run visual:review -- --card X --replace "five upright wands=>four upright wands" --reason "..."
 *     npm run visual:review -- --card X --set keyObjects="a|b|c" --reason "..."
 *     npm run visual:review -- --png              把待审的图导出来对着看
 *     npm run visual:review -- --list             列出全部已审条目
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么是 CLI 而不是一个审核后台】
 * 这份工作一共 95 张、一次性、一个人做。写后台的时间比看完 95 张还长，
 * 而且后台意味着另一套状态存储 —— 而复核结论必须进 git、必须能在 PR 里被 diff。
 * 一个 JSON + 一个 CLI 就能满足全部需求，多一层都是负担。
 *
 * 【它只写 qa/visual-semantics/review.json】
 * 生成数据一个字节都不碰。运行时靠 getDeckVisualSemantics 合并。
 * ══════════════════════════════════════════════════════════
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { VisualReviewEntry, VisualReviewFile, VisualPatchableField } from '../src/types/visualSemantics.ts'
import { applyVisualReview, reviewKey } from '../src/types/visualSemantics.ts'
import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'
import { getGeneratedVisualSemantics, projectVisualEvidence } from '../src/data/deckVisualSemantics/index.ts'
import { PRODUCTION_DECK_IDS } from '../src/decks/ids.ts'

const ROOT = resolve(import.meta.dirname, '..')
const REVIEW_PATH = resolve(ROOT, 'qa/visual-semantics/review.json')
const SPOT_PATH = resolve(ROOT, 'qa/visual-semantics/spot-check.md')

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const FULL = loadAllFullVisualSemantics()

/* ── review.json 读写 ─────────────────────────────────────── */

function loadReview(): VisualReviewFile & { _readme?: unknown } {
  if (!existsSync(REVIEW_PATH)) return { version: 1, entries: {} }
  return JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) as VisualReviewFile
}

/** 按 key 升序写出，保证 git diff 稳定 */
function saveReview(file: VisualReviewFile & { _readme?: unknown }): void {
  mkdirSync(resolve(ROOT, 'qa/visual-semantics'), { recursive: true })
  const entries: Record<string, VisualReviewEntry> = {}
  for (const k of Object.keys(file.entries).sort()) entries[k] = file.entries[k]!
  writeFileSync(REVIEW_PATH, `${JSON.stringify({ ...file, entries }, null, 2)}\n`, 'utf8')
}

/* ── 参数 ─────────────────────────────────────────────────── */

const args = process.argv.slice(2)
const has = (f: string) => args.includes(f)
const argOf = (f: string) => {
  const i = args.indexOf(f)
  return i >= 0 ? args[i + 1] : undefined
}

/**
 * `celestial/wands-06` 与 `legacy-celestial/wands-06` 都要能用。
 * 内部 id 带 legacy- 前缀（历史原因，见 decks/ids.ts），但没人愿意每次都打全。
 */
function normalizeKey(raw: string): string | null {
  const [rawDeck, cardId] = raw.split('/')
  if (!rawDeck || !cardId) return null
  const deckId = PRODUCTION_DECK_IDS.find((d) => d === rawDeck || d === `legacy-${rawDeck}`)
  if (!deckId) return null
  return FULL[deckId]?.[cardId] ? reviewKey(deckId, cardId) : null
}

/* ── spot-check 清单 = 待审范围 ───────────────────────────── */

function spotCheckList(): string[] {
  if (!existsSync(SPOT_PATH)) return []
  const out: string[] = []
  for (const m of readFileSync(SPOT_PATH, 'utf8').matchAll(/^## \d+\.\s+(\S+)\s+\/\s+(\S+)/gm)) {
    out.push(`${m[1]}/${m[2]}`)
  }
  return out
}

/* ── 展示 ─────────────────────────────────────────────────── */

function show(key: string, review: VisualReviewFile): void {
  const [deckId, cardId] = key.split('/') as [string, string]
  const full = FULL[deckId]?.[cardId]
  if (!full) {
    console.log(`${R}找不到 ${key}${X}`)
    return
  }
  const entry = review.entries[key]
  const generated = getGeneratedVisualSemantics(deckId, cardId)!
  const merged = applyVisualReview(generated, entry)

  console.log(`\n${B}${key}${X}  ${D}model confidence=${full.confidence.overall}${X}  ${
    entry ? `${G}reviewStatus=${entry.reviewStatus}${X}` : `${Y}reviewStatus=unreviewed${X}`
  }`)
  console.log(`  ${D}图片：${full.source.assetPath}${X}\n`)
  console.log(`  ${B}scene${X}            ${merged.scene}`)
  console.log(`  ${B}keyObjects${X}       ${merged.keyObjects.join('; ') || '（无）'}`)
  console.log(`  ${B}spatialRelations${X} ${merged.spatialRelations.join('; ') || '（无）'}`)
  console.log(`  ${B}visualTensions${X}   ${merged.visualTensions.join('; ') || '（无）'}`)
  console.log(`  ${B}motifs${X}           ${merged.deckSpecificMotifs.join('; ') || '（无）'}`)
  console.log(`  ${D}uncertainDetails ${full.confidence.uncertainDetails.join('; ') || '（无）'}${X}`)

  if (entry) {
    console.log(`\n  ${Y}人工修正${X}  ${D}${entry.reason ?? ''}${X}`)
    for (const r of entry.replace ?? []) console.log(`    replace  「${r.find}」→「${r.with}」`)
    for (const f of Object.keys(entry.patch ?? {})) console.log(`    patch    ${f}`)
    for (const f of entry.uncertainFields ?? []) console.log(`    uncertain ${f}（整字段不进 Prompt）`)
    /* 规则失效是无声的 —— 必须当场报出来 */
    for (const r of entry.replace ?? []) {
      const anywhere = JSON.stringify(generated).includes(r.find)
      if (!anywhere) console.log(`    ${R}✘ 这条 replace 已经匹配不上了（生成数据变过？）：「${r.find}」${X}`)
    }
  }

  const ev = projectVisualEvidence(merged)
  console.log(`\n  ${D}实际进 Reading Prompt：${ev ? JSON.stringify(ev).length : 0} 字${X}`)
}

/* ── 写入 ─────────────────────────────────────────────────── */

function mutate(key: string): void {
  const file = loadReview()
  const prev = file.entries[key]
  const entry: VisualReviewEntry = { ...(prev ?? { reviewStatus: 'pass' }) }

  if (has('--pass')) entry.reviewStatus = 'pass'
  if (has('--uncertain')) entry.reviewStatus = 'uncertain'

  const fields = argOf('--fields')
  if (fields) entry.uncertainFields = fields.split(',').map((f) => f.trim()) as VisualPatchableField[]

  const rep = argOf('--replace')
  if (rep) {
    const [find, to] = rep.split('=>')
    if (!find || to === undefined) {
      console.log(`${R}--replace 的格式是 "原文=>新文"${X}`)
      process.exit(1)
    }
    entry.replace = [...(entry.replace ?? []), { find: find.trim(), with: to.trim() }]
    entry.reviewStatus = 'corrected'
  }

  const set = argOf('--set')
  if (set) {
    const eq = set.indexOf('=')
    const field = set.slice(0, eq).trim() as VisualPatchableField
    const value = set.slice(eq + 1)
    entry.patch = { ...(entry.patch ?? {}), [field]: field === 'scene' ? value : value.split('|').map((v) => v.trim()) }
    entry.reviewStatus = 'corrected'
  }

  const reason = argOf('--reason')
  if (reason) entry.reason = reason
  entry.reviewedAt = new Date().toISOString().slice(0, 10)
  entry.reviewer = entry.reviewer ?? 'manual'

  file.entries[key] = entry
  saveReview(file)
  console.log(`${G}✔ 已写入 ${key} → ${entry.reviewStatus}${X}`)
}

/* ── main ─────────────────────────────────────────────────── */

const review = loadReview()
const spot = spotCheckList()
const rawCard = argOf('--card')

if (rawCard) {
  const key = normalizeKey(rawCard)
  if (!key) {
    console.log(`${R}认不出这张牌：${rawCard}${X}  ${D}格式如 celestial/wands-06${X}`)
    process.exit(1)
  }
  const writing = has('--pass') || has('--uncertain') || argOf('--replace') || argOf('--set')
  if (writing) mutate(key)
  show(key, loadReview())
  console.log()
  process.exit(0)
}

if (has('--list')) {
  console.log(`\n${B}已审条目${X}`)
  for (const [k, e] of Object.entries(review.entries).sort()) {
    const tag = e.reviewStatus === 'corrected' ? Y : e.reviewStatus === 'uncertain' ? R : G
    console.log(`  ${tag}${e.reviewStatus.padEnd(10)}${X} ${k}  ${D}${e.reason?.slice(0, 60) ?? ''}${X}`)
  }
  console.log()
  process.exit(0)
}

/* 进度总览 */
const done = spot.filter((k) => review.entries[k] !== undefined)
const pending = spot.filter((k) => review.entries[k] === undefined)
const byStatus = { pass: 0, corrected: 0, uncertain: 0 } as Record<string, number>
for (const e of Object.values(review.entries)) byStatus[e.reviewStatus] = (byStatus[e.reviewStatus] ?? 0) + 1

console.log(`\n${B}人工复核进度${X}  ${D}范围 = qa/visual-semantics/spot-check.md${X}`)
console.log(`  已审 ${done.length} / ${spot.length}   ${G}pass ${byStatus.pass ?? 0}${X} · ${Y}corrected ${byStatus.corrected ?? 0}${X} · ${R}uncertain ${byStatus.uncertain ?? 0}${X}`)

if (has('--png')) {
  const sharp = (await import('sharp')).default
  const pngDir = resolve(ROOT, 'qa/visual-semantics/png')
  mkdirSync(pngDir, { recursive: true })
  let n = 0
  for (const k of pending) {
    const [deckId, cardId] = k.split('/') as [string, string]
    const full = FULL[deckId]?.[cardId]
    if (!full) continue
    await sharp(resolve(ROOT, full.source.assetPath)).resize(560).png().toFile(resolve(pngDir, `${deckId}__${cardId}.png`))
    n += 1
  }
  console.log(`  ${D}${n} 张待审图片已导出到 qa/visual-semantics/png/（不进 git）${X}`)
}

if (pending.length > 0) {
  console.log(`\n${B}下一张待审${X}`)
  show(pending[0]!, review)
  console.log(`\n  ${D}标记：npm run visual:review -- --card ${pending[0]!.replace('legacy-', '')} --pass${X}`)
} else {
  console.log(`\n  ${G}spot-check 清单已全部审完${X}`)
}
console.log()
