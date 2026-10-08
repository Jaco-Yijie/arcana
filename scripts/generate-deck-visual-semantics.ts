/**
 * 牌组视觉语义批处理 —— 开发阶段一次性把真实原画交给 DeepSeek Vision。
 *
 *     npm run visual:semantics -- --dry-run
 *     npm run visual:semantics -- --pilot
 *     npm run visual:semantics -- --deck legacy-shadow --card major-09
 *     npm run visual:semantics -- --major-only
 *     npm run visual:semantics -- --all
 *     npm run visual:semantics -- --all --force
 *
 * ══════════════════════════════════════════════════════════════
 * 【Resume 是硬要求，不是优化】
 * 390 张跑到第 300 张失败、下次从头再来，是这类脚本最常见也最贵的失败方式。
 * 这里每成功一张就**立刻落盘**（按牌组写文件），下次再跑时逐张比对
 * artwork.lock.json 里的 sha256：一样就跳过，不一样才重算。
 * 换掉 legacy-shadow/major-09.webp 只会让那一张变 stale。
 *
 * 【失败绝不伪造】
 * 图缺、超时、JSON 坏、校验不过 —— 该条记录就是不存在。
 * 绝不用 canonical meaning 反推一份假的视觉描述：那会让
 * 「AI 看见了这幅画」变成一句谎话，而且是一句带着证据身份的谎话。
 * 运行时缺这一条，那张牌的解读退回 V2.5 原样。
 * ══════════════════════════════════════════════════════════════
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { DeckCardVisualSemantics, DeckVisualRuntimeFile, DeckVisualSemanticsFile } from '../src/types/visualSemantics.ts'
import type { VisualFreshness } from '../src/types/visualSemantics.ts'
import { VISUAL_SEMANTICS_VERSION, freshnessOf, toRuntimeRecord } from '../src/types/visualSemantics.ts'
import type { DeckId } from '../src/decks/ids.ts'
import { cardById } from '../src/data/deck/index.ts'
import { localizeCard, registerCardText } from '../src/data/deck/localized.ts'
import { cardTextEn } from '../src/data/deck/i18n/en-US.ts'
import {
  VISION_CONCURRENCY,
  VISION_MAX_TOKENS,
  VISION_MODEL,
  VISION_TIMEOUT_MS,
  VisionFailure,
  callDeepSeekVision,
  imageToDataUrl,
} from '../server/providers/deepseekVision.ts'
import {
  DECK_LOOK,
  VISION_PROMPT_VERSION,
  VISUAL_ANALYSIS_SYSTEM_PROMPT,
  buildVisualAnalysisUserText,
  visionPromptHash,
} from '../server/prompts/deckVisualAnalysisPrompt.ts'
import { validateVisualSemantics } from '../server/validation/visualSemanticsSchema.ts'
import { parseWithRepair } from '../server/validation/jsonRepair.ts'
import { config } from '../server/env.ts'

registerCardText('en-US', cardTextEn)

const ROOT = resolve(import.meta.dirname, '..')
const DATA_DIR = resolve(ROOT, 'src/data/deckVisualSemantics')
const RUNTIME_DIR = resolve(DATA_DIR, 'runtime')
const LOCK_PATH = resolve(ROOT, 'artwork.lock.json')

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'


/* ── artwork.lock.json：素材真相源 ───────────────────────────── */

interface ArtworkLock {
  decks: string[]
  files: Record<string, { bytes: number; sha256: string }>
}

interface EligibleCard {
  deckId: DeckId
  cardId: string
  /** 仓库相对路径，与 lock 的 key 同源 */
  assetPath: string
  absPath: string
  assetHash: string
}

function loadLock(): ArtworkLock {
  if (!existsSync(LOCK_PATH)) {
    throw new Error('找不到 artwork.lock.json —— 没有素材真相源就不能生成视觉语义')
  }
  return JSON.parse(readFileSync(LOCK_PATH, 'utf8')) as ArtworkLock
}

/**
 * 从 lock 里推导「哪些牌真的有独立原画」。
 *
 * **刻意不硬编码 5×78=390。** lock 里有什么就处理什么：
 * 将来 ethereal 那五套补齐原画并进 lock，这里会自动把它们算进去，
 * 不需要改一行代码。
 */
function discoverEligible(lock: ArtworkLock): EligibleCard[] {
  const out: EligibleCard[] = []
  for (const [key, meta] of Object.entries(lock.files)) {
    /* 只要 cards/，不要 thumbs/（同一张画的缩略图）、不要 deck/（封面卡背，不是牌） */
    const m = /^([^/]+)\/cards\/([^/]+)\.webp$/.exec(key)
    if (!m) continue
    const [, deckId, cardId] = m
    if (!cardById[cardId!]) continue // lock 里出现非 canonical cardId 就跳过，不猜
    const assetPath = `public/assets/decks/${key}`
    out.push({
      deckId: deckId as DeckId,
      cardId: cardId!,
      assetPath,
      absPath: resolve(ROOT, assetPath),
      assetHash: meta.sha256,
    })
  }
  out.sort((a, b) => (a.deckId === b.deckId ? a.cardId.localeCompare(b.cardId) : a.deckId.localeCompare(b.deckId)))
  return out
}

/* ── 数据集读写 ───────────────────────────────────────────────── */

function filePathFor(deckId: string): string {
  return resolve(DATA_DIR, `${deckId}.json`)
}

function runtimePathFor(deckId: string): string {
  return resolve(RUNTIME_DIR, `${deckId}.json`)
}

function loadDeckFile(deckId: DeckId): DeckVisualSemanticsFile {
  const p = filePathFor(deckId)
  if (!existsSync(p)) return { version: VISUAL_SEMANTICS_VERSION, deckId, cards: {} }
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as DeckVisualSemanticsFile
    if (parsed.version !== VISUAL_SEMANTICS_VERSION) {
      /* schema 升版 = 全部 stale。不做迁移：重跑一次比写一个迁移器便宜且可信 */
      return { version: VISUAL_SEMANTICS_VERSION, deckId, cards: {} }
    }
    return parsed
  } catch {
    return { version: VISUAL_SEMANTICS_VERSION, deckId, cards: {} }
  }
}

/**
 * 写出这副牌组的两份文件。
 *
 * cardId 升序写出，保证 git diff 稳定 —— 不然每次跑都是一份乱序的巨大 diff，
 * 而这份 diff 正是「这次改了哪几张牌」的唯一审阅材料。
 */
function saveDeckFile(file: DeckVisualSemanticsFile): void {
  mkdirSync(DATA_DIR, { recursive: true })
  mkdirSync(RUNTIME_DIR, { recursive: true })
  const keys = Object.keys(file.cards).sort()

  /* ① 完整记录 —— 真相源，供 QA / diff / 重新生成 */
  const sorted: Record<string, DeckCardVisualSemantics> = {}
  for (const k of keys) sorted[k] = file.cards[k]!
  writeFileSync(
    filePathFor(file.deckId),
    `${JSON.stringify({ version: file.version, deckId: file.deckId, cards: sorted }, null, 1)}\n`,
    'utf8',
  )

  /* ② runtime 投影 —— 只有能进 Prompt 的六项，这一份才会被打进前端包。
     不缩进：它是机器产物，没人会去读，而 390 条的缩进要多花 ~90KB。 */
  const runtime: DeckVisualRuntimeFile = { version: file.version, deckId: file.deckId, cards: {} }
  for (const k of keys) runtime.cards[k] = toRuntimeRecord(file.cards[k]!)
  writeFileSync(runtimePathFor(file.deckId), `${JSON.stringify(runtime)}\n`, 'utf8')
}

/**
 * 把 runtime 投影重新从完整记录推一遍。
 *
 * 【为什么每次运行都做，而不是只在写入时做】
 * runtime/ 是派生产物。如果只在「这一张重新生成了」时才写，那么
 * 改了投影规则（比如调整字段）之后，一次全缓存命中的运行会什么都不做，
 * 留下一份过期的 runtime —— 而它才是真正进前端包的那份。
 * 每次都推一遍很便宜（纯本地 JSON），却让「产物过期」这个失败模式不存在。
 */
function syncRuntimeArtifacts(deckIds: Iterable<DeckId>): number {
  let n = 0
  for (const deckId of new Set(deckIds)) {
    const file = loadDeckFile(deckId)
    if (Object.keys(file.cards).length === 0) continue
    saveDeckFile(file)
    n += 1
  }
  return n
}

/* ── stale 判定 ───────────────────────────────────────────────── */

/** 当前这一版 Prompt 的指纹。整轮只算一次 —— 它对每张牌都一样 */
const CURRENT_PROMPT_HASH = visionPromptHash()

/* ── 单张分析 ─────────────────────────────────────────────────── */

const RETRY_DELAYS_MS = [1_000, 4_000, 12_000]

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export interface AnalyzeFailure {
  deckId: string
  cardId: string
  assetPath: string
  errorType: string
  detail: string
}

async function analyzeCard(
  card: EligibleCard,
): Promise<{ entry: DeckCardVisualSemantics; usage: { promptTokens: number; completionTokens: number } } | { failure: AnalyzeFailure }> {
  const fail = (errorType: string, detail: string) => ({
    failure: { deckId: card.deckId, cardId: card.cardId, assetPath: card.assetPath, errorType, detail },
  })

  try {
    await stat(card.absPath)
  } catch {
    return fail('image-missing', `磁盘上没有 ${card.assetPath}`)
  }

  const meaning = localizeCard(cardById[card.cardId]!, 'en-US')
  const userText = buildVisualAnalysisUserText({
    cardId: card.cardId,
    cardName: meaning.name,
    canonicalUpright: meaning.meaningUpright,
    canonicalReversed: meaning.meaningReversed,
    deckLook: DECK_LOOK[card.deckId] ?? 'No art-direction note recorded for this deck.',
  })

  let dataUrl: string
  try {
    dataUrl = await imageToDataUrl(card.absPath)
  } catch (err) {
    return fail('image-read', err instanceof Error ? err.message : String(err))
  }

  let lastError = 'unknown'
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const res = await callDeepSeekVision(VISUAL_ANALYSIS_SYSTEM_PROMPT, userText, dataUrl)
      const parsed = parseWithRepair(res.content)
      if (!parsed) {
        lastError = 'invalid-json'
      } else {
        const outcome = validateVisualSemantics(parsed.value, {
          deckId: card.deckId,
          cardId: card.cardId,
          assetPath: card.assetPath,
          assetHash: card.assetHash,
          promptVersion: VISION_PROMPT_VERSION,
          promptHash: CURRENT_PROMPT_HASH,
          model: VISION_MODEL,
          latencyMs: res.latencyMs,
        })
        if (outcome.entry) return { entry: outcome.entry, usage: res.usage }
        lastError = `schema-invalid: ${outcome.problems.join('; ')}`
      }
    } catch (err) {
      if (err instanceof VisionFailure) {
        if (!err.retryable) return fail(err.code, err.message)
        lastError = `${err.code}: ${err.message}`
      } else {
        lastError = err instanceof Error ? err.message : String(err)
      }
    }
    /* 校验不过也重试一次：温度 0.2 下同一张图重跑通常会稳定下来，
       但不无限试 —— 试满就记为失败，让人去看那张图 */
    const delay = RETRY_DELAYS_MS[attempt]
    if (delay === undefined) break
    await sleep(delay)
  }
  return fail(lastError.split(':')[0] ?? 'unknown', lastError)
}

/* ── CLI ──────────────────────────────────────────────────────── */

interface Options {
  deck: string | null
  card: string | null
  majorOnly: boolean
  pilot: boolean
  all: boolean
  force: boolean
  dryRun: boolean
  limit: number | null
}

/** Pilot 代表牌：覆盖人物 / 独行 / 束缚 / 夜景 / 离开五种很不同的构图 */
const PILOT_CARDS = ['major-00', 'major-09', 'major-15', 'major-18', 'cups-08']

function parseArgs(argv: string[]): Options {
  const o: Options = { deck: null, card: null, majorOnly: false, pilot: false, all: false, force: false, dryRun: false, limit: null }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--deck') o.deck = argv[++i] ?? null
    else if (a === '--card') o.card = argv[++i] ?? null
    else if (a === '--limit') o.limit = Number(argv[++i] ?? '0') || null
    else if (a === '--major-only') o.majorOnly = true
    else if (a === '--pilot') o.pilot = true
    else if (a === '--all') o.all = true
    else if (a === '--force') o.force = true
    else if (a === '--dry-run') o.dryRun = true
  }
  return o
}

function selectCards(all: EligibleCard[], o: Options): EligibleCard[] {
  let list = all
  if (o.deck) list = list.filter((c) => c.deckId === o.deck)
  if (o.card) list = list.filter((c) => c.cardId === o.card)
  if (o.majorOnly) list = list.filter((c) => c.cardId.startsWith('major-'))
  if (o.pilot) list = list.filter((c) => PILOT_CARDS.includes(c.cardId))
  if (o.limit) list = list.slice(0, o.limit)
  return list
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))]!
}

async function main(): Promise<void> {
  const o = parseArgs(process.argv.slice(2))
  const lock = loadLock()
  const eligible = discoverEligible(lock)

  /* ── Inventory：从真相源算出来，不预设 390 ── */
  const byDeck = new Map<string, EligibleCard[]>()
  for (const c of eligible) {
    if (!byDeck.has(c.deckId)) byDeck.set(c.deckId, [])
    byDeck.get(c.deckId)!.push(c)
  }
  console.log(`\n${B}Artwork Inventory（来源：artwork.lock.json）${X}`)
  for (const [deckId, cards] of byDeck) {
    console.log(`  ${deckId.padEnd(20)} ${String(cards.length).padStart(3)} 张独立原画`)
  }
  console.log(`  ${D}合计 ${eligible.length} 张${X}\n`)

  const targets = selectCards(eligible, o)
  if (targets.length === 0) {
    console.log(`${Y}没有匹配的牌。检查 --deck / --card 拼写。${X}`)
    return
  }

  /* ── 逐张判断要不要跑 ── */
  const files = new Map<string, DeckVisualSemanticsFile>()
  const loadFile = (deckId: DeckId) => {
    if (!files.has(deckId)) files.set(deckId, loadDeckFile(deckId))
    return files.get(deckId)!
  }

  const todo: { card: EligibleCard; why: VisualFreshness }[] = []
  const counts: Record<VisualFreshness, number> = {
    fresh: 0, missing: 0, 'stale-asset': 0, 'stale-prompt': 0, 'stale-schema': 0, 'stale-untracked': 0,
  }
  for (const card of targets) {
    const why = freshnessOf(loadFile(card.deckId).cards[card.cardId], {
      assetHash: card.assetHash,
      promptHash: CURRENT_PROMPT_HASH,
    })
    counts[why] += 1
    if (why !== 'fresh' || o.force) todo.push({ card, why })
  }

  console.log(`${B}选中 ${targets.length} 张${X}  ${D}fresh=${counts.fresh} missing=${counts.missing} stale-asset=${counts['stale-asset']} stale-prompt=${counts['stale-prompt']} stale-schema=${counts['stale-schema']} stale-untracked=${counts['stale-untracked']}${X}`)
  console.log(`${B}需要调用 Vision：${todo.length} 张${X}${o.force ? `  ${Y}(--force：忽略缓存)${X}` : ''}`)
  console.log(`${D}model=${VISION_MODEL} concurrency=${VISION_CONCURRENCY} timeout=${VISION_TIMEOUT_MS}ms maxTokens=${VISION_MAX_TOKENS}${X}`)
  console.log(`${D}prompt=${VISION_PROMPT_VERSION} hash=${CURRENT_PROMPT_HASH.slice(0, 16)}…${X}\n`)

  if (o.dryRun) {
    for (const { card, why } of todo.slice(0, 40)) {
      console.log(`  ${D}${why.padEnd(14)}${X} ${card.deckId}/${card.cardId}  ${D}${card.assetPath}${X}`)
    }
    if (todo.length > 40) console.log(`  ${D}… 还有 ${todo.length - 40} 张${X}`)
    console.log(`\n${Y}--dry-run：没有调用任何 API，没有写任何文件。${X}\n`)
    return
  }

  if (todo.length === 0) {
    const synced = syncRuntimeArtifacts(targets.map((t) => t.deckId))
    console.log(`${G}全部已是最新，无需调用。${X} ${D}（已重新导出 ${synced} 份 runtime 投影）${X}\n`)
    return
  }
  if (!config.ready) {
    console.log(`${R}没有配置 DEEPSEEK_API_KEY —— 无法调用 Vision。${X}\n`)
    process.exitCode = 1
    return
  }

  /* ── 并发执行 ── */
  const t0 = Date.now()
  const latencies: number[] = []
  const failures: AnalyzeFailure[] = []
  let done = 0
  let ok = 0
  let promptTokens = 0
  let completionTokens = 0

  /* 落盘用一把「锁」串行化：多个 worker 会写同一个牌组文件，
     并发 writeFileSync 会产生半截 JSON */
  let writeChain: Promise<void> = Promise.resolve()
  const persist = (deckId: DeckId, entry: DeckCardVisualSemantics) => {
    writeChain = writeChain.then(() => {
      const f = loadFile(deckId)
      f.cards[entry.cardId] = entry
      saveDeckFile(f)
    })
    return writeChain
  }

  let cursor = 0
  const worker = async () => {
    for (;;) {
      const i = cursor++
      if (i >= todo.length) return
      const { card } = todo[i]!
      const res = await analyzeCard(card)
      done += 1
      if ('entry' in res) {
        ok += 1
        latencies.push(res.entry.meta.latencyMs)
        promptTokens += res.usage.promptTokens
        completionTokens += res.usage.completionTokens
        await persist(card.deckId, res.entry)
        const conf = res.entry.confidence.overall
        const tag = conf === 'high' ? G : conf === 'medium' ? '' : Y
        console.log(
          `  ${G}✔${X} [${String(done).padStart(3)}/${todo.length}] ${card.deckId}/${card.cardId} ` +
            `${D}${res.entry.meta.latencyMs}ms${X} ${tag}${conf}${X} ${D}${res.entry.scene.slice(0, 64)}…${X}`,
        )
      } else {
        failures.push(res.failure)
        console.log(
          `  ${R}✘${X} [${String(done).padStart(3)}/${todo.length}] ${card.deckId}/${card.cardId} ` +
            `${R}${res.failure.errorType}${X} ${D}${res.failure.detail.slice(0, 90)}${X}`,
        )
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(VISION_CONCURRENCY, todo.length) }, worker))
  await writeChain
  syncRuntimeArtifacts(targets.map((t) => t.deckId))

  /* ── 报告 ── */
  const sorted = [...latencies].sort((a, b) => a - b)
  const totalMs = Date.now() - t0
  console.log(`\n${B}────────────────────────────────────────────────${X}`)
  console.log(`  成功 ${G}${ok}${X} / 失败 ${failures.length ? R : ''}${failures.length}${X} / 跳过（已最新） ${counts.fresh - (o.force ? counts.fresh : 0)}`)
  if (sorted.length > 0) {
    console.log(`  延迟 P50 ${pct(sorted, 50)}ms · P95 ${pct(sorted, 95)}ms · max ${sorted[sorted.length - 1]}ms`)
  }
  console.log(`  总耗时 ${(totalMs / 1000).toFixed(1)}s`)
  if (promptTokens || completionTokens) console.log(`  token prompt=${promptTokens} completion=${completionTokens}`)
  if (failures.length > 0) {
    console.log(`\n${R}失败项${X}`)
    for (const f of failures) console.log(`  ${f.deckId}/${f.cardId}  ${f.errorType}  ${D}${f.assetPath}${X}\n    ${D}${f.detail.slice(0, 200)}${X}`)
    console.log(`\n${D}失败的牌没有写入任何数据 —— 运行时会自动退回 V2.5。重跑本命令即可续传。${X}`)
  }
  console.log(`${B}────────────────────────────────────────────────${X}\n`)
  if (failures.length > 0) process.exitCode = 1
}

/** 供 QA 脚本复用 —— 不重复一份发现逻辑 */
export { discoverEligible, loadLock, PILOT_CARDS, CURRENT_PROMPT_HASH }

/* 只有直接执行时才跑 main；被 import 时不跑 */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? ' ')) {
  await main()
}
