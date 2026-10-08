import { applyQaReview } from './visual-review-qa.ts'
/**
 * 视觉语义的人工抽查报告 + 跨牌组对照。
 *
 *     npm run visual:qa                    覆盖率 / 新鲜度 / 跨牌组差异 + 20 张随机抽查清单
 *     npm run visual:qa -- --card cups-08  只看某张牌的跨牌组对照
 *     npm run visual:qa -- --sample 40     换一个抽查规模
 *     npm run visual:qa -- --png           顺带把抽查的图导成 png，方便逐张对着看
 *
 * 【为什么需要人工这一环】
 * 程序能判断「五副牌的描述是不是逐字相同」，判断不了「这段描述对不对得上那张画」。
 * 后者只有看着图才知道，而它恰恰是这一层唯一真正致命的失败方式。
 * 所以这个脚本的产出是**一份要人看的清单**，不是一个绿灯。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  allVisualReviews,
  getDeckVisualSemantics,
  getGeneratedVisualSemantics,
  visualSemanticsCoverage,
} from '../src/data/deckVisualSemantics/index.ts'
import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'
import type { VisualFreshness } from '../src/types/visualSemantics.ts'
import { VISUAL_SEMANTICS_VERSION, freshnessOf } from '../src/types/visualSemantics.ts'
import { VISION_PROMPT_VERSION, visionPromptHash } from '../server/prompts/deckVisualAnalysisPrompt.ts'

const CURRENT_PROMPT_HASH = visionPromptHash()

/* QA 看的是**完整记录**（含 palette / confidence / softenedAspects），
   不是进前端包的那份投影 —— 人工核对需要看到模型到底写了什么 */
const FULL = loadAllFullVisualSemantics()
const allVisualSemantics = () => Object.values(FULL).flatMap((cards) => Object.values(cards))

const ROOT = resolve(import.meta.dirname, '..')
const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const lock = JSON.parse(readFileSync(resolve(ROOT, 'artwork.lock.json'), 'utf8')) as {
  files: Record<string, { sha256: string }>
}

const eligible = Object.keys(lock.files)
  .map((k) => /^([^/]+)\/cards\/([^/]+)\.webp$/.exec(k))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ deckId: m[1]!, cardId: m[2]!, key: m[0] }))

const args = process.argv.slice(2)
const argOf = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const onlyCard = argOf('--card')
const wantPng = args.includes('--png')

/* ── 1. 覆盖率 ─────────────────────────────────────────────── */

console.log(`\n${B}① 覆盖率${X}`)
const coverage = visualSemanticsCoverage()
const expected = new Map<string, number>()
for (const e of eligible) expected.set(e.deckId, (expected.get(e.deckId) ?? 0) + 1)
let missingTotal = 0
for (const [deckId, want] of [...expected].sort()) {
  const have = coverage[deckId] ?? 0
  const missing = eligible.filter((e) => e.deckId === deckId && !getDeckVisualSemantics(deckId, e.cardId))
  missingTotal += missing.length
  const mark = missing.length === 0 ? `${G}✔${X}` : `${R}✘${X}`
  console.log(`  ${mark} ${deckId.padEnd(20)} ${String(have).padStart(3)}/${want}`)
  if (missing.length > 0) console.log(`      ${R}缺：${missing.map((m) => m.cardId).join(', ')}${X}`)
}
console.log(`  ${D}合计 ${allVisualSemantics().length}/${eligible.length}${X}`)

/* ── 2. 新鲜度：图 / Prompt / schema 三项齐验 ─────────────────
 *
 * 只看 assetHash 是不够的 —— 那正是上一轮埋下的坑：改完 Vision Prompt 之后
 * 图没换，于是旧数据全部仍被判为 fresh，387 条旧 + 3 条新混在一起而系统全绿。
 * 现在三项任意一项不同都算 stale。 */

console.log(`\n${B}② 新鲜度（assetHash + visionPromptHash + schemaVersion）${X}`)
console.log(`  ${D}当前 Prompt：${VISION_PROMPT_VERSION} · ${CURRENT_PROMPT_HASH.slice(0, 16)}…${X}`)

const freshness: Record<VisualFreshness, string[]> = {
  fresh: [], missing: [], 'stale-asset': [], 'stale-prompt': [], 'stale-schema': [], 'stale-untracked': [],
}
for (const e of eligible) {
  const entry = FULL[e.deckId]?.[e.cardId]
  const state = freshnessOf(entry, {
    assetHash: lock.files[e.key]!.sha256,
    promptHash: CURRENT_PROMPT_HASH,
  })
  freshness[state].push(`${e.deckId}/${e.cardId}`)
}
const staleTotal = eligible.length - freshness.fresh.length
for (const [state, ids] of Object.entries(freshness) as [VisualFreshness, string[]][]) {
  if (state === 'fresh') continue
  if (ids.length === 0) continue
  console.log(`  ${R}✘ ${state.padEnd(15)} ${ids.length} 张${X}  ${D}${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ' …' : ''}${X}`)
}
console.log(
  staleTotal === 0
    ? `  ${G}✔ ${freshness.fresh.length}/${eligible.length} 全部新鲜${X}`
    : `  ${R}✘ stale 合计 ${staleTotal} 张 —— 跑 npm run visual:semantics -- --all${X}`,
)

/* 分项计数：报告里要的就是这三行 */
const assetMismatch = eligible.filter((e) => {
  const entry = FULL[e.deckId]?.[e.cardId]
  return entry !== undefined && entry.source.assetHash !== lock.files[e.key]!.sha256
}).length
const promptMismatch = eligible.filter((e) => {
  const entry = FULL[e.deckId]?.[e.cardId]
  return entry !== undefined && entry.generator?.promptHash !== CURRENT_PROMPT_HASH
}).length
const schemaMismatch = eligible.filter((e) => {
  const entry = FULL[e.deckId]?.[e.cardId]
  return entry !== undefined && (entry.version !== VISUAL_SEMANTICS_VERSION || entry.generator?.schemaVersion !== VISUAL_SEMANTICS_VERSION)
}).length
console.log(`  ${D}assetHash mismatch ${assetMismatch} · promptHash mismatch ${promptMismatch} · schemaVersion mismatch ${schemaMismatch}${X}`)

/* 全库必须出自同一个 model —— 混用不同视觉模型是另一种「看不见的版本漂移」 */
const models = new Set(allVisualSemantics().map((e) => e.meta.model))
console.log(
  models.size <= 1
    ? `  ${G}✔ 全库同一视觉模型：${[...models][0] ?? '（空）'}${X}`
    : `  ${R}✘ 混用了 ${models.size} 个视觉模型：${[...models].join(', ')}${X}`,
)

/* runtime/ 是派生产物，改了投影规则却忘了重导就会过期 —— 而它才是进前端包的那份 */
const desync = eligible.filter((e) => {
  const full = FULL[e.deckId]?.[e.cardId]
  const rt = getDeckVisualSemantics(e.deckId, e.cardId)
  return full !== undefined && (rt === null || rt.assetHash !== full.source.assetHash)
})
console.log(
  desync.length === 0
    ? `  ${G}✔ runtime/ 投影与完整记录同步${X}`
    : `  ${R}✘ ${desync.length} 张的 runtime 投影过期 —— 重跑 npm run visual:semantics -- --all${X}`,
)
const stale = { length: staleTotal }

/* ── 3. 跨牌组差异（背诵检测） ──────────────────────────────── */

console.log(`\n${B}③ 跨牌组差异 —— 同一 cardId 的描述雷同 = 模型在背 Rider-Waite${X}`)
const byCard = new Map<string, { deckId: string; scene: string; objects: string }[]>()
for (const e of allVisualSemantics()) {
  if (!byCard.has(e.cardId)) byCard.set(e.cardId, [])
  byCard.get(e.cardId)!.push({
    deckId: e.deckId,
    scene: e.scene.trim().toLowerCase(),
    objects: [...e.keyObjects].sort().join('|').toLowerCase(),
  })
}
const identical: string[] = []
for (const [cardId, rows] of byCard) {
  if (rows.length < 2) continue
  if (new Set(rows.map((r) => r.scene)).size < rows.length) identical.push(`${cardId}（scene 重复）`)
  else if (new Set(rows.map((r) => r.objects)).size < rows.length) identical.push(`${cardId}（keyObjects 重复）`)
}
console.log(
  identical.length === 0
    ? `  ${G}✔ ${byCard.size} 个 cardId，没有一个在牌组之间出现雷同描述${X}`
    : `  ${Y}⚠ 以下 cardId 出现雷同，需要人工看图：${identical.join('、')}${X}`,
)

/* ── 3.5 人工复核层 ────────────────────────────────────────── */

console.log(`\n${B}④ 人工复核（reviewStatus，与模型 confidence 无关）${X}`)
const reviews = allVisualReviews()
const statusCount = { pass: 0, corrected: 0, uncertain: 0 } as Record<string, number>
for (const e of Object.values(reviews)) statusCount[e.reviewStatus] = (statusCount[e.reviewStatus] ?? 0) + 1
const reviewed = Object.keys(reviews).length
console.log(
  `  已审 ${reviewed} / ${eligible.length}  ·  pass ${statusCount.pass ?? 0} · corrected ${statusCount.corrected ?? 0} · uncertain ${statusCount.uncertain ?? 0} · unreviewed ${eligible.length - reviewed}`,
)

/* 失效的 override 是无声的：规则还在，但已经匹配不上任何东西，
   于是修正静默消失而所有断言依旧全绿 —— 正是这一层要消灭的那类问题 */
const deadRules: string[] = []
const noEffect: string[] = []
for (const [k, entry] of Object.entries(reviews)) {
  const [deckId, cardId] = k.split('/') as [string, string]
  const generated = getGeneratedVisualSemantics(deckId, cardId)
  if (!generated) {
    deadRules.push(`${k}（这张牌在数据集里不存在）`)
    continue
  }
  const raw = JSON.stringify(generated)
  for (const r of entry.replace ?? []) {
    if (!raw.includes(r.find)) deadRules.push(`${k} → 「${r.find}」匹配不上了`)
  }
  const merged = JSON.stringify(getDeckVisualSemantics(deckId, cardId))
  const full = FULL[deckId]![cardId]!
  const qaChanged = JSON.stringify(applyQaReview(full, entry)) !== JSON.stringify(full)
  if (entry.reviewStatus !== 'pass' && merged === raw && !qaChanged) noEffect.push(k)
}
console.log(
  deadRules.length === 0
    ? `  ${G}✔ 全部 override 规则仍然命中${X}`
    : `  ${R}✘ ${deadRules.length} 条 override 已失效：${deadRules.slice(0, 3).join(' | ')}${X}`,
)
if (noEffect.length > 0) {
  console.log(`  ${Y}⚠ 这些条目标了 corrected/uncertain 却没有改变任何输出：${noEffect.join(', ')}${X}`)
}

/* ── 4. 置信度分布 ─────────────────────────────────────────── */

console.log(`\n${B}⑤ 模型自评置信度${X}`)
const conf = { high: 0, medium: 0, low: 0 }
const lowOnes: string[] = []
for (const e of allVisualSemantics()) {
  conf[e.confidence.overall] += 1
  if (e.confidence.overall === 'low') lowOnes.push(`${e.deckId}/${e.cardId}`)
}
console.log(`  high ${conf.high} · medium ${conf.medium} · low ${conf.low}`)
if (lowOnes.length > 0) console.log(`  ${Y}low 的这些优先人工看：${lowOnes.join(', ')}${X}`)

/* ── 5. 跨牌组对照（--card） ───────────────────────────────── */

if (onlyCard) {
  console.log(`\n${B}⑥ ${onlyCard} 跨牌组对照${X}`)
  for (const e of allVisualSemantics().filter((x) => x.cardId === onlyCard)) {
    console.log(`\n  ${B}${e.deckId}${X}  ${D}${e.source.assetPath}${X}`)
    console.log(`    scene       : ${e.scene}`)
    console.log(`    keyObjects  : ${e.keyObjects.join('; ')}`)
    console.log(`    spatial     : ${e.spatialRelations.join('; ')}`)
    console.log(`    tensions    : ${e.visualTensions.join('; ')}`)
    console.log(`    motifs      : ${e.deckSpecificMotifs.join('; ')}`)
    console.log(`    emphasized  : ${e.semanticBridge.emphasizedAspects.join(' | ')}`)
    console.log(`    softened    : ${e.semanticBridge.softenedAspects.join(' | ')}`)
    if (e.semanticBridge.tensionWithCanonical) {
      console.log(`    ${Y}vs canonical: ${e.semanticBridge.tensionWithCanonical.join(' | ')}${X}`)
    }
    console.log(`    ${D}uncertain   : ${e.confidence.uncertainDetails.join('; ') || '（无）'}${X}`)
  }
  console.log()
  process.exit(missingTotal === 0 && stale.length === 0 && desync.length === 0 && deadRules.length === 0 ? 0 : 1)
}

/* ── 6. 人工抽查清单（分层抽样）─────────────────────────────
 *
 * 【为什么不是随机抽 20 张】
 * 随机抽样对「哪里最可能出错」是盲的。上一轮 39 张 medium 里找到 3 处偏差，
 * 而它们全部集中在两类牌上：带数字的小阿卡纳，以及月亮/皇帝这种
 * 传统图样极强的大牌。随机抽 20 张有很大概率一条都抽不到。
 *
 * 所以按风险分层：
 *   A 全部 medium —— 模型自己说「不太确定」的
 *   B 全部 low    —— 同上，更严重
 *   C 每副牌至少 10 张 high —— 保证覆盖面，不让任何一副牌成为盲区
 *   D 高先验风险牌优先 —— 编号小牌、月亮、太阳、皇帝、女皇、恶魔、
 *                      高塔、星星、宝剑组、多人物场景
 */

/** 固定种子 —— 每次抽到同一批，「上次看过了」这件事才成立 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  let x = seed
  const rand = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool
}

/** 传统图样最强、最容易被记忆覆盖的牌 */
const HIGH_PRIOR_MAJORS = new Set([
  'major-18', // 月亮：月相
  'major-19', // 太阳
  'major-17', // 星星
  'major-16', // 高塔：坠落的王冠
  'major-15', // 恶魔：锁链、角
  'major-04', // 皇帝：王冠、公羊
  'major-03', // 女皇
  'major-11', // 正义：剑与天平
  'major-08', // 力量：狮子
  'major-06', // 恋人：天使、蛇
])
const NUMBERED_MINOR = /^(cups|wands|swords|pentacles)-(0[1-9]|10)$/

function riskOf(e: { cardId: string; figures: unknown[]; confidence: { overall: string } }): number {
  let r = 0
  if (e.confidence.overall === 'low') r += 100
  if (e.confidence.overall === 'medium') r += 50
  if (NUMBERED_MINOR.test(e.cardId)) r += 20        // 牌号 ≠ 物件数量
  if (HIGH_PRIOR_MAJORS.has(e.cardId)) r += 18      // 传统图样极强
  if (e.cardId.startsWith('swords-')) r += 6        // 宝剑组：剑的数量最易出错
  if (e.figures.length >= 2) r += 5                 // 多人物：姿态与持物更难
  return r
}

const all = allVisualSemantics()
const targetSize = Number(argOf('--sample') ?? 90)

const picked = new Map<string, (typeof all)[number]>()
const key = (e: { deckId: string; cardId: string }) => `${e.deckId}/${e.cardId}`
const take = (e: (typeof all)[number]) => picked.set(key(e), e)

/* A + B：全部 medium 与 low，一张不漏 */
const lowConf = all.filter((e) => e.confidence.overall === 'low')
const medConf = all.filter((e) => e.confidence.overall === 'medium')
lowConf.forEach(take)
medConf.forEach(take)

/* C：每副牌至少 10 张 high，按风险排序后取前 N（同分用固定种子打散） */
const PER_DECK_HIGH = 10
for (const deckId of Object.keys(FULL).sort()) {
  const highs = seededShuffle(
    Object.values(FULL[deckId] ?? {}).filter((e) => e.confidence.overall === 'high'),
    20260928,
  ).sort((a, b) => riskOf(b) - riskOf(a))
  highs.slice(0, PER_DECK_HIGH).forEach(take)
}

/* D：全库按风险补到目标规模 */
for (const e of seededShuffle(all, 20260928).sort((a, b) => riskOf(b) - riskOf(a))) {
  if (picked.size >= targetSize) break
  take(e)
}

const sample = [...picked.values()].sort((a, b) =>
  a.deckId === b.deckId ? a.cardId.localeCompare(b.cardId) : a.deckId.localeCompare(b.deckId),
)

const byDeckCount = new Map<string, number>()
const byConfCount = { high: 0, medium: 0, low: 0 } as Record<string, number>
for (const e of sample) {
  byDeckCount.set(e.deckId, (byDeckCount.get(e.deckId) ?? 0) + 1)
  byConfCount[e.confidence.overall] = (byConfCount[e.confidence.overall] ?? 0) + 1
}

const reportLines: string[] = [
  '# 视觉语义人工抽查清单',
  '',
  `生成时间：${new Date().toISOString()}`,
  `Vision Prompt：\`${VISION_PROMPT_VERSION}\` · \`${CURRENT_PROMPT_HASH.slice(0, 16)}…\``,
  `抽查 **${sample.length} / ${all.length}** 条（固定种子，每次同一批）`,
  '',
  `置信度分布：high ${byConfCount.high ?? 0} · medium ${byConfCount.medium ?? 0} · low ${byConfCount.low ?? 0}`,
  `按牌组：${[...byDeckCount].sort().map(([d, n]) => `${d} ${n}`).join(' · ')}`,
  '',
  '## 抽样规则',
  '',
  '- 全部 `medium` 与 `low` 置信度条目（模型自己说不确定的）',
  `- 每副牌至少 ${PER_DECK_HIGH} 张 \`high\`，按先验风险排序`,
  '- 高风险优先：编号小阿卡纳（牌号 ≠ 物件数量）、月亮/太阳/星星/高塔/恶魔/皇帝/女皇/正义/力量/恋人、宝剑组、多人物场景',
  '',
  '## 逐条核对四件事',
  '',
  '1. `scene` 与 `keyObjects` 里的东西，图上**真的有**吗？',
  '2. **数量**对吗？牌名里的数字不代表画面里的数量（例：Six of Wands 未必画 6 根）。',
  '3. 有没有 Rider-Waite 里有、而这张图上**没有**的东西被写进来？',
  '   重点看：月相 · 太阳 · 王冠 · 光环 · 翅膀 · 蒙眼布 · 马 · 塔 · 王座 · 门 · 路 · 水 · 山 · 各花色数量',
  '4. `uncertainDetails` 里该有的东西有没有漏（看不清却写死了）？',
  '',
]
for (const [i, e] of sample.entries()) {
  reportLines.push(
    `## ${i + 1}. ${e.deckId} / ${e.cardId}  ·  \`${e.confidence.overall}\``,
    '',
    `图片：\`${e.source.assetPath}\``,
    '',
    `- **scene**: ${e.scene}`,
    `- **keyObjects**: ${e.keyObjects.join('; ') || '（无）'}`,
    `- **spatialRelations**: ${e.spatialRelations.join('; ') || '（无）'}`,
    `- **uncertainDetails**: ${e.confidence.uncertainDetails.join('; ') || '（无）'}`,
    `- deckSpecificMotifs: ${e.deckSpecificMotifs.join('; ') || '（无）'}`,
    `- emphasizedAspects: ${e.semanticBridge.emphasizedAspects.join(' | ') || '（无）'}`,
    '',
  )
}
const outDir = resolve(ROOT, 'qa/visual-semantics')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'spot-check.md'), reportLines.join('\n'), 'utf8')

console.log(`\n${B}⑦ 人工抽查清单（分层）${X}`)
console.log(`  ${sample.length} / ${all.length} 条已写入 ${D}qa/visual-semantics/spot-check.md${X}`)
console.log(`  ${D}置信度 high ${byConfCount.high ?? 0} · medium ${byConfCount.medium ?? 0} · low ${byConfCount.low ?? 0}${X}`)
console.log(`  ${D}按牌组 ${[...byDeckCount].sort().map(([d, n]) => `${d} ${n}`).join(' · ')}${X}`)

if (wantPng) {
  const sharp = (await import('sharp')).default
  const pngDir = resolve(outDir, 'png')
  mkdirSync(pngDir, { recursive: true })
  for (const e of sample) {
    const src = resolve(ROOT, e.source.assetPath)
    if (!existsSync(src)) continue
    await sharp(src).resize(540).png().toFile(resolve(pngDir, `${e.deckId}_${e.cardId}.png`))
  }
  console.log(`  ${D}图片已导出到 qa/visual-semantics/png/（该目录不进 git）${X}`)
}

console.log()
process.exit(missingTotal === 0 && stale.length === 0 && desync.length === 0 && deadRules.length === 0 ? 0 : 1)
