/**
 * Multi-Agent Visual QA —— 第 0 步：匿名审核集与批次编排。
 *
 *     npx tsx scripts/blind-review-prepare.ts --pilot        10 张 + 1 张控制案例
 *     npx tsx scripts/blind-review-prepare.ts --rest         剩余 85 张
 *     npx tsx scripts/blind-review-prepare.ts --all          全部 95 张 + 控制
 *
 * ══════════════════════════════════════════════════════════════
 * 【这一层解决的唯一问题：Reviewer 不许知道自己在看哪张牌】
 *
 * 光改文件名是没用的 —— 五套牌**每一张原画上都印着罗马数字和英文牌名**
 * （`III` / `Three of Swords`）。Reviewer 一睁眼就读到牌名，
 * 然后按 Tarot 先验去"数"物件数量，这正是 review.json 里
 * legacy-celestial/wands-06 那条记录证明过的失效模式：
 * Vision 连跑 4 次有 3 次把画面里的 4 支权杖写成 five，
 * 因为 Six of Wands 的传统构图是「5 支 + 骑手手里 1 支」。
 *
 * 所以匿名化必须动像素 —— 但只动印刷文字带：
 *   顶部 y 0..75     罗马数字带
 *   底部 y 848..933  牌名带
 * 主体 y 75..848（83% 画面高度）逐像素原样：不 crop、不 resize、
 * 不调色、不镜像、不加任何文字。五套牌的标题带位置实测一致
 * （数字 y≈25-48，牌名 y≈858-911），所以一套几何全牌组通用。
 *
 * 【代价，以及为什么可以接受】
 * 95 条里有 74 条的 keyObjects 引用了印刷文字
 * （`gold border with the numeral VIII and the title Eight of Swords`）。
 * 这些条目盲审阶段无法核实，全部标 NOT_VERIFIABLE 走第二阶段补审通道，
 * **不计入盲审裁决**。它们是边框装饰，不在本轮要查的清单
 * （人物数 / 花色数 / 月相 / 持物 / 空间关系）里 —— 丢掉它们的可审性，
 * 换回 Blind Review 本身成立，这笔交换是划算的。
 *
 * 【reviewId 为什么要打乱】
 * 按字母序编号会让 review-001..018 全是 celestial —— 连号本身就泄露牌组，
 * 而牌组一旦泄露，"这套牌的第 5 张剑牌"就离牌名不远了。
 * 用固定种子打乱：既不泄露，又能复现。
 * ══════════════════════════════════════════════════════════════
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'
import type { DeckCardVisualSemantics } from '../src/types/visualSemantics.ts'

const ROOT = resolve(import.meta.dirname, '..')
const SPOT_PATH = resolve(ROOT, 'qa/visual-semantics/spot-check.md')
const PNG_DIR = resolve(ROOT, 'qa/visual-semantics/png')
/** run 作用域 —— pilot 与每一波各自独立，产物不互相覆盖 */
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const WAVE = Number(argValue('--wave') ?? 0)
const WAVES = Number(argValue('--waves') ?? 5)
const RUN = argValue('--run') ?? (WAVE > 0 ? `wave-${WAVE}` : 'pilot')
const BLIND_DIR = resolve(ROOT, 'qa/visual-semantics/blind-review', RUN)
const OUT_DIR = resolve(ROOT, 'qa/visual-semantics/multi-agent-review', RUN)

/* ── 遮蔽几何 —— 实测五套牌统一 ──────────────────────────── */
const CARD_W = 560
const CARD_H = 933
/** 顶部罗马数字带。实测数字落在 y 25..48，留足余量 */
const MASK_TOP = 75
/** 底部牌名带。实测牌名落在 y 858..911，从 848 起遮 */
const MASK_BOTTOM_FROM = 848
/** 中性灰。不用纯黑/纯白 —— 那会被误读成画面里的暗部或高光 */
const MASK_RGB = { r: 118, g: 118, b: 118 }

/** 控制案例：已知 ground truth，但**不在** spot-check 的 95 张里 */
const CONTROL_KEY = 'legacy-celestial/wands-06'

const REVIEWERS = ['reviewer-a', 'reviewer-b', 'reviewer-c', 'reviewer-d', 'reviewer-e'] as const
type ReviewerId = (typeof REVIEWERS)[number]

/* ── 固定种子随机 —— 每次跑出同一套编号 ──────────────────── */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], rnd: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/* ── spot-check 清单 = 审核范围 ───────────────────────────── */
function spotCheckKeys(): string[] {
  const out: string[] = []
  for (const m of readFileSync(SPOT_PATH, 'utf8').matchAll(/^## \d+\.\s+(\S+)\s+\/\s+(\S+)/gm)) {
    out.push(`${m[1]}/${m[2]}`)
  }
  return out
}

/* ══════════════════════════════════════════════════════════════
 * 风险标注（§7）
 *
 * 这些标记**只进 manifest**（Coordinator 可见），绝不进 Reviewer 的 Prompt ——
 * 告诉 Reviewer「这张是高风险数字牌」等于提示它「这里有个数量要数」，
 * 属于变相泄露牌类型。标记的唯一用途是决定**派几个人看**。
 * ══════════════════════════════════════════════════════════ */

/** §7.3 点名的高风险视觉元素 */
const RISK_TOKENS = [
  'moon', 'sun', 'crown', 'blindfold', 'halo', 'wing', 'sword', 'cup', 'chalice',
  'wand', 'staff', 'pentacle', 'coin', 'throne', 'door', 'gate', 'path', 'horse',
  'tower', 'water', 'river', 'lake', 'sea',
]

interface RiskProfile {
  highRisk: boolean
  reasons: string[]
  figureCount: number
  confidence: string
  uncertainCount: number
}

function riskOf(entry: DeckCardVisualSemantics): RiskProfile {
  const reasons: string[] = []
  const [suit, rank] = entry.cardId.split('-')
  const rankNum = Number(rank)

  /* §7.1 数字牌 —— 牌号与画面物件数没有必然关系，是 card-rank prior 的重灾区 */
  const isPip = ['cups', 'swords', 'wands', 'pentacles'].includes(suit ?? '') && rankNum >= 1 && rankNum <= 10
  if (isPip) reasons.push(`pip-card(${suit}-${rank})`)

  /* §7.2 多人物 */
  const figureCount = entry.figures.length
  if (figureCount > 1) reasons.push(`multi-figure(${figureCount})`)

  /* §7.3 高风险元素出现在可见事实里 */
  const haystack = [
    entry.scene,
    ...entry.keyObjects,
    ...entry.spatialRelations,
    ...entry.foreground,
    ...entry.background,
  ].join(' ').toLowerCase()
  const hit = RISK_TOKENS.filter((t) => haystack.includes(t))
  if (hit.length > 0) reasons.push(`risk-objects(${[...new Set(hit)].slice(0, 6).join(',')})`)

  /* §7.4 模型自陈 medium */
  if (entry.confidence.overall !== 'high') reasons.push(`confidence(${entry.confidence.overall})`)

  /* §7.5 uncertainDetails 非空 */
  const uncertainCount = entry.confidence.uncertainDetails.length
  if (uncertainCount > 0) reasons.push(`uncertain-details(${uncertainCount})`)

  /* §7.7 模型自己说数不清 / 有遮挡 */
  const un = entry.confidence.uncertainDetails.join(' ').toLowerCase()
  if (/\b(number|count|obscur|overlap|partly|hidden|too small|not resolvable|indistinct)\b/.test(un)) {
    reasons.push('occlusion-or-count-doubt')
  }

  return {
    highRisk: reasons.length > 0,
    reasons,
    figureCount,
    confidence: entry.confidence.overall,
    uncertainCount,
  }
}

/* ── Pilot 选片（§31）───────────────────────────────────────
 *
 * 硬约束：5 个 deck 全覆盖 · ≥3 medium · ≥3 high · ≥3 数字牌 ·
 *         ≥1 多人 · ≥1 月亮/光源 · ≥1 高风险持物/空间关系
 * 在满足约束的前提下用固定种子挑，保证可复现。
 */
function pickPilot(
  keys: string[],
  full: Record<string, Record<string, DeckCardVisualSemantics>>,
  rnd: () => number,
): string[] {
  const meta = new Map<string, { deck: string; entry: DeckCardVisualSemantics; risk: RiskProfile }>()
  for (const k of keys) {
    const [deck, card] = k.split('/') as [string, string]
    const entry = full[deck]?.[card]
    if (!entry) continue
    meta.set(k, { deck, entry, risk: riskOf(entry) })
  }

  const hasMoon = (k: string) => {
    const e = meta.get(k)!.entry
    const s = [e.scene, ...e.keyObjects, e.lighting].join(' ').toLowerCase()
    return /\b(moon|crescent|sun|lantern|lamp|glow|starlight)\b/.test(s)
  }
  const isPip = (k: string) => /-(0[1-9]|10)$/.test(k) && !k.includes('major')
  const isMulti = (k: string) => meta.get(k)!.risk.figureCount > 1
  const conf = (k: string) => meta.get(k)!.risk.confidence

  const picked: string[] = []
  const take = (k: string) => {
    if (!picked.includes(k)) picked.push(k)
  }

  /* 每个 deck 先各拿 1 张，保证 5 个 deck 全覆盖 —— 同时优先挑满足特殊约束的 */
  const decks = [...new Set(keys.map((k) => k.split('/')[0]!))].sort()
  for (const d of decks) {
    const pool = shuffled(keys.filter((k) => k.startsWith(`${d}/`)), rnd)
    /* 每副牌优先选一张「信息量最大」的：多人 > 有月亮/光源 > 其它 */
    const best = pool.find(isMulti) ?? pool.find(hasMoon) ?? pool[0]!
    take(best)
  }

  /* 补齐各项硬约束 */
  const need = (pred: (k: string) => boolean, n: number) => {
    const have = picked.filter(pred).length
    if (have >= n) return
    for (const k of shuffled(keys, rnd)) {
      if (picked.filter(pred).length >= n) break
      if (pred(k)) take(k)
    }
  }
  need((k) => conf(k) === 'medium', 3)
  need((k) => conf(k) === 'high', 3)
  need(isPip, 3)
  need(isMulti, 1)
  need(hasMoon, 1)
  need((k) => meta.get(k)!.risk.reasons.some((r) => r.startsWith('risk-objects')), 1)

  /* 凑满 10 张 */
  for (const k of shuffled(keys, rnd)) {
    if (picked.length >= 10) break
    take(k)
  }
  return picked.slice(0, 10)
}

/* ── 批次分配（§6）─────────────────────────────────────────
 *
 * 不按 deck 切 —— shadow 35 / classic 10 这种分布按 deck 分会让
 * 一个 Reviewer 整批都是同一套牌，它会开始学这套牌的风格并互相印证。
 * 先打乱再轮转发牌，每个 Reviewer 手里都是五套牌混着的。
 *
 * 高风险项发给**两个**不同 Reviewer（§7）：第二个人从错位的起点轮转，
 * 保证 (A,B) 这种配对不会固定成一对。
 */
function assign(
  reviewIds: string[],
  highRisk: Set<string>,
  rnd: () => number,
): Record<ReviewerId, string[]> {
  const out = Object.fromEntries(REVIEWERS.map((r) => [r, [] as string[]])) as Record<ReviewerId, string[]>
  const order = shuffled(reviewIds, rnd)

  order.forEach((id, i) => {
    out[REVIEWERS[i % REVIEWERS.length]!].push(id)
  })
  /* 第二审：偏移 2 位，避免总是相邻的两个 reviewer 配对 */
  order.forEach((id, i) => {
    if (!highRisk.has(id)) return
    const second = REVIEWERS[(i + 2) % REVIEWERS.length]!
    if (!out[second].includes(id)) out[second].push(id)
  })
  return out
}

/* ── 匿名图生成 ───────────────────────────────────────────── */
async function writeBlindImage(srcPng: string, destPng: string): Promise<void> {
  const top = await sharp({
    create: { width: CARD_W, height: MASK_TOP, channels: 3, background: MASK_RGB },
  }).png().toBuffer()
  const bottom = await sharp({
    create: { width: CARD_W, height: CARD_H - MASK_BOTTOM_FROM, channels: 3, background: MASK_RGB },
  }).png().toBuffer()

  await sharp(srcPng)
    .composite([
      { input: top, top: 0, left: 0 },
      { input: bottom, top: MASK_BOTTOM_FROM, left: 0 },
    ])
    /* 元数据一并抹掉 —— 不留任何指回原文件的线索 */
    .png({ compressionLevel: 9 })
    .toFile(destPng)
}

/* ══════════════════════════════════════════════════════════════ */

const args = process.argv.slice(2)
const mode = args.includes('--rest') ? 'rest' : args.includes('--all') ? 'all' : 'pilot'

const FULL = loadAllFullVisualSemantics()
const allKeys = spotCheckKeys()
if (allKeys.length === 0) throw new Error('spot-check.md 里一条都没读到')

const rnd = mulberry32(20260927)
const pilotKeys = pickPilot(allKeys, FULL, rnd)

let scope: string[]
if (mode === 'pilot') scope = [...pilotKeys, CONTROL_KEY]
else if (mode === 'rest') scope = allKeys.filter((k) => !pilotKeys.includes(k))
else scope = [...allKeys, CONTROL_KEY]

/* 分波：85 张塞给 5 个 Agent 是每人 34 张，上下文一定爆。
   切成若干波，每波各自跑完整链路，波与波之间 Agent 全新 ——
   顺带消除同一个 Agent 连看几十张后产生的跨图先验。
   切片在**打乱之后**做，保证每一波内部仍是五套牌混合。 */
if (WAVE > 0) {
  const sliceRnd = mulberry32(31337)
  const pool = shuffled(scope, sliceRnd)
  const per = Math.ceil(pool.length / WAVES)
  scope = pool.slice((WAVE - 1) * per, WAVE * per)
}

/* reviewId 分配：先打乱，连号不泄露牌组 */
const idRnd = mulberry32(mode === 'pilot' ? 77001 : 77002 + WAVE)
/* 编号跨波唯一：pilot 占 001-099，wave k 从 100*k 起 */
const ID_OFFSET = WAVE > 0 ? WAVE * 100 : 0
const ordered = shuffled(scope, idRnd)

mkdirSync(BLIND_DIR, { recursive: true })
mkdirSync(resolve(OUT_DIR, 'batches'), { recursive: true })
mkdirSync(resolve(OUT_DIR, 'blind-observations'), { recursive: true })
mkdirSync(resolve(OUT_DIR, 'comparisons'), { recursive: true })
mkdirSync(resolve(OUT_DIR, 'judge'), { recursive: true })

if (existsSync(BLIND_DIR)) {
  rmSync(BLIND_DIR, { recursive: true, force: true })
  mkdirSync(BLIND_DIR, { recursive: true })
}

interface ManifestRow {
  reviewId: string
  deckId: string
  cardId: string
  blindImage: string
  sourcePng: string
  sourceAsset: string
  assetHash: string
  modelConfidence: string
  uncertainDetails: string[]
  figureCount: number
  highRisk: boolean
  riskReasons: string[]
  isControl: boolean
  spotCheckIndex: number | null
}

const rows: ManifestRow[] = []
const highRisk = new Set<string>()

let n = 0
for (const key of ordered) {
  n += 1
  const reviewId = `review-${String(n + ID_OFFSET).padStart(3, '0')}`
  const [deckId, cardId] = key.split('/') as [string, string]
  const entry = FULL[deckId]?.[cardId]
  if (!entry) {
    console.log(`⚠ 跳过 ${key}：没有视觉语义记录`)
    continue
  }
  const risk = riskOf(entry)
  if (risk.highRisk) highRisk.add(reviewId)

  const srcPng = resolve(PNG_DIR, `${deckId}__${cardId}.png`)
  const destPng = resolve(BLIND_DIR, `${reviewId}.png`)

  rows.push({
    reviewId,
    deckId,
    cardId,
    blindImage: `qa/visual-semantics/blind-review/${RUN}/${reviewId}.png`,
    sourcePng: `qa/visual-semantics/png/${deckId}__${cardId}.png`,
    sourceAsset: entry.source.assetPath,
    assetHash: entry.source.assetHash,
    modelConfidence: entry.confidence.overall,
    uncertainDetails: entry.confidence.uncertainDetails,
    figureCount: risk.figureCount,
    highRisk: risk.highRisk,
    riskReasons: risk.reasons,
    isControl: key === CONTROL_KEY,
    spotCheckIndex: allKeys.indexOf(key) >= 0 ? allKeys.indexOf(key) + 1 : null,
  })

  /* 控制案例不在 png/ 里（--png 只导未审项），直接从原画导 */
  const from = existsSync(srcPng) ? srcPng : resolve(ROOT, entry.source.assetPath)
  if (!existsSync(from)) throw new Error(`找不到图片：${from}`)
  if (existsSync(srcPng)) {
    await writeBlindImage(from, destPng)
  } else {
    /* 原画尺寸与 png/ 不同，先 resize 到同一宽度再遮 —— 与 visual:review --png 同一口径 */
    const tmp = resolve(BLIND_DIR, `.${reviewId}.tmp.png`)
    await sharp(from).resize(CARD_W).png().toFile(tmp)
    await writeBlindImage(tmp, destPng)
    rmSync(tmp, { force: true })
  }
}

const batches = assign(rows.map((r) => r.reviewId), highRisk, mulberry32(88001))

writeFileSync(
  resolve(OUT_DIR, 'manifest.json'),
  `${JSON.stringify(
    {
      version: 1,
      run: RUN,
      wave: WAVE || null,
      mode,
      generatedAt: new Date().toISOString(),
      note: 'Coordinator-only。绝不提供给第一阶段 Reviewer —— 它把 reviewId 直接映回 cardId。',
      mask: { top: [0, MASK_TOP], bottom: [MASK_BOTTOM_FROM, CARD_H], rgb: MASK_RGB, cropped: false, resized: false, recolored: false },
      counts: {
        total: rows.length,
        highRisk: [...highRisk].length,
        byDeck: rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.deckId]: (a[r.deckId] ?? 0) + 1 }), {}),
        byConfidence: rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.modelConfidence]: (a[r.modelConfidence] ?? 0) + 1 }), {}),
      },
      assignments: batches,
      rows,
    },
    null,
    2,
  )}\n`,
  'utf8',
)

/* Reviewer 批次文件：**只有 reviewId 与图片路径**，一个字的牌面信息都没有 */
for (const r of REVIEWERS) {
  const ids = batches[r]
  writeFileSync(
    resolve(OUT_DIR, 'batches', `${r}.json`),
    `${JSON.stringify(
      {
        reviewer: r,
        stage: 'blind-observation',
        images: ids.map((id) => ({ reviewId: id, path: `qa/visual-semantics/blind-review/${RUN}/${id}.png` })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

console.log(`\n匿名审核集已生成  run=${RUN}  mode=${mode}${WAVE ? `  wave ${WAVE}/${WAVES}` : ''}`)
console.log(`  图片 ${rows.length} 张 → qa/visual-semantics/blind-review/${RUN}/`)
console.log(`  高风险（双人盲审）${[...highRisk].length} 张`)
console.log(`  遮蔽 top 0-${MASK_TOP} · bottom ${MASK_BOTTOM_FROM}-${CARD_H} · 主体 ${CARD_H - MASK_TOP - (CARD_H - MASK_BOTTOM_FROM)}px 原样`)
console.log(`\n批次：`)
for (const r of REVIEWERS) console.log(`  ${r}  ${batches[r].length} 张  ${batches[r].join(' ')}`)
console.log(`\n牌组分布：`)
for (const [d, c] of Object.entries(rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.deckId]: (a[r.deckId] ?? 0) + 1 }), {}))) {
  console.log(`  ${d}  ${c}`)
}
console.log()
