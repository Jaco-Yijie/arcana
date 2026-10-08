/**
 * Multi-Agent Visual QA —— 第 2 步：揭示包生成。
 *
 *     npx tsx scripts/blind-review-reveal.ts review-002 review-006 ...
 *
 * ══════════════════════════════════════════════════════════════
 * 【它在流程里的位置】
 *   图片 → 盲观察 → **冻结** → 揭示现有语义（本文件）→ 逐项比对
 *
 * 顺序是防偏见机制的全部意义所在（§23）：Reviewer 必须先把自己看到的
 * 写死，才能看到模型写了什么。反过来给，Reviewer 会不自觉地去「找证据
 * 支持已有描述」，而不是独立观察 —— confirmation bias 正是这轮要排除的东西。
 *
 * 【为什么揭示包还要再脱一次敏】
 * 盲审阶段靠遮蔽像素把牌名挡住了，但**现有语义的文字里还写着牌名** ——
 * 95 条里 74 条的 keyObjects 长这样：
 *   "gold border with the numeral VIII and the title Eight of Swords"
 * 原样递过去，等于在第二阶段把第一阶段辛苦挡住的东西全还回去。
 * Reviewer 一旦知道这是 Eight of Swords，它对自己刚写的「4 把剑」
 * 会突然不自信 —— 而那恰恰可能是对的。
 *
 * 所以揭示包里：
 *   · 引用印刷文字的条目 → [MASKED REGION — 本轮不审]
 *   · 任何 "<数词> of <花色>" 牌名 → [CARD NAME REDACTED]
 *   · 罗马数字标题 → [NUMERAL REDACTED]
 * 被遮的条目**不计入 verdict**，走人工补审通道。
 * ══════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'
import { getGeneratedVisualSemantics, projectVisualEvidence } from '../src/data/deckVisualSemantics/index.ts'
import { applyVisualReview } from '../src/types/visualSemantics.ts'
import type { VisualReviewFile } from '../src/types/visualSemantics.ts'

const ROOT = resolve(import.meta.dirname, '..')
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const RUN = argValue('--run') ?? 'pilot'
const OUT_DIR = resolve(ROOT, 'qa/visual-semantics/multi-agent-review', RUN)
const REVIEW_PATH = resolve(ROOT, 'qa/visual-semantics/review.json')

/* ── 脱敏 ─────────────────────────────────────────────────── */

const RANK_WORD = 'ace|one|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king'
const SUIT_WORD = 'cups|swords|wands|pentacles|coins|discs|chalices|staves'
/** "Eight of Swords" / "the Six of Wands" */
const CARD_NAME_RE = new RegExp(`\\b(?:${RANK_WORD})\\s+of\\s+(?:${SUIT_WORD})\\b`, 'gi')
/** 指向印刷文字带的整条条目 —— 已被遮蔽，本轮无法核实 */
const PRINTED_TEXT_RE = /\b(numeral|card title|title text|title band|lettering|cartouche with|the title)\b/i
/** 孤立的罗马数字（标题用） */
const ROMAN_RE = /\b(?:numeral\s+)?(X{0,3}(?:IX|IV|V?I{1,3}|VI{1,3}|XI{1,3}|XV|XX|XXI))\b(?=\s|$|,|;)/g

const MASKED = '[MASKED REGION — 印刷文字带已遮蔽，本轮不审此条]'

function redact(text: string): string {
  return text.replace(CARD_NAME_RE, '[CARD NAME REDACTED]').replace(ROMAN_RE, '[NUMERAL REDACTED]')
}

/** 整条是否因为指向被遮区域而不可审 */
function isUnverifiable(item: string): boolean {
  return PRINTED_TEXT_RE.test(item)
}

function redactList(items: string[]): { items: string[]; maskedCount: number } {
  let maskedCount = 0
  const out = items.map((i) => {
    if (isUnverifiable(i)) {
      maskedCount += 1
      return MASKED
    }
    return redact(i)
  })
  return { items: out, maskedCount }
}

/* ══════════════════════════════════════════════════════════════ */

interface ManifestRow {
  reviewId: string
  deckId: string
  cardId: string
  modelConfidence: string
  uncertainDetails: string[]
  isControl: boolean
}

const manifest = JSON.parse(readFileSync(resolve(OUT_DIR, 'manifest.json'), 'utf8')) as {
  rows: ManifestRow[]
}
const FULL = loadAllFullVisualSemantics()
const review: VisualReviewFile = existsSync(REVIEW_PATH)
  ? (JSON.parse(readFileSync(REVIEW_PATH, 'utf8')) as VisualReviewFile)
  : { version: 1, entries: {} }

const wanted = process.argv.slice(2).filter((a) => a.startsWith('review-'))
const rows = manifest.rows.filter((r) => wanted.length === 0 || wanted.includes(r.reviewId))

mkdirSync(resolve(OUT_DIR, 'reveal'), { recursive: true })

const packets: Record<string, unknown> = {}

for (const row of rows) {
  const generated = getGeneratedVisualSemantics(row.deckId, row.cardId)
  const full = FULL[row.deckId]?.[row.cardId]
  if (!generated || !full) {
    console.log(`⚠ ${row.reviewId}: 没有生成记录`)
    continue
  }
  /* 与运行时完全同一条链路：generated → review override → projection。
     审的必须是「真正会进 Reading Prompt 的那份」，不是原始生成值。

     【控制案例是唯一的例外，而且必须是例外】
     §32 的控制案例已经有人工修正了（five→four）。如果按常规合并后揭示，
     Reviewer 看到的是**已经改对的** "four upright wands" —— 它当然会判 PASS，
     而这条 PASS 什么都没证明。控制案例的全部意义是：在不知道修正存在的前提下，
     多 Agent 链路能不能独立重新发现同一个错误。
     所以这一条揭示**未修正的原始生成值**，让它有机会犯错、也有机会抓错。 */
  const merged = row.isControl
    ? generated
    : applyVisualReview(generated, review.entries[`${row.deckId}/${row.cardId}`])
  const projected = projectVisualEvidence(merged)

  const ko = redactList(merged.keyObjects)
  const sr = redactList(merged.spatialRelations)
  const vt = redactList(merged.visualTensions)
  const dm = redactList(merged.deckSpecificMotifs)
  const ea = redactList(merged.emphasizedAspects)

  packets[row.reviewId] = {
    reviewId: row.reviewId,
    existingSemantic: {
      scene: redact(merged.scene),
      keyObjects: ko.items,
      spatialRelations: sr.items,
      visualTensions: vt.items,
      deckSpecificMotifs: dm.items,
      emphasizedAspects: ea.items,
    },
    modelSelfReportedUncertainty: full.confidence.uncertainDetails.map(redact),
    modelConfidence: row.modelConfidence,
    maskedItemCount: ko.maskedCount + sr.maskedCount + vt.maskedCount + dm.maskedCount + ea.maskedCount,
    runtimeProjectionBytes: projected ? JSON.stringify(projected).length : 0,
  }
}

writeFileSync(
  resolve(OUT_DIR, 'reveal', 'packets.json'),
  `${JSON.stringify(packets, null, 2)}\n`,
  'utf8',
)

/* 给每个 reviewId 也单独吐一份可直接贴进 Prompt 的纯文本 */
for (const [id, p] of Object.entries(packets)) {
  const q = p as {
    existingSemantic: Record<string, string | string[]>
    modelSelfReportedUncertainty: string[]
    modelConfidence: string
  }
  const lines: string[] = [`## ${id} —— 现有 Visual Semantic（模型生成，待你核对）`, '']
  lines.push(`**scene**: ${q.existingSemantic.scene as string}`, '')
  for (const f of ['keyObjects', 'spatialRelations', 'visualTensions', 'deckSpecificMotifs', 'emphasizedAspects']) {
    const list = q.existingSemantic[f] as string[]
    lines.push(`**${f}**:`)
    if (list.length === 0) lines.push('  (empty)')
    for (const i of list) lines.push(`  - ${i}`)
    lines.push('')
  }
  lines.push(`**model self-reported uncertainty** (confidence=${q.modelConfidence}):`)
  for (const u of q.modelSelfReportedUncertainty) lines.push(`  - ${u}`)
  writeFileSync(resolve(OUT_DIR, 'reveal', `${id}.md`), `${lines.join('\n')}\n`, 'utf8')
}

console.log(`揭示包已生成 ${Object.keys(packets).length} 份 → ${resolve(OUT_DIR, 'reveal')}`)
for (const [id, p] of Object.entries(packets)) {
  const q = p as { maskedItemCount: number }
  console.log(`  ${id}  遮蔽条目 ${q.maskedItemCount}`)
}
