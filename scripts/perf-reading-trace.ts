/**
 * D5 · Standard / Deep Reading 延迟分解（STEP 0：只测量，不改代码）
 *
 * 【为什么直接打服务端而不是走浏览器】
 * 要回答的是「慢在哪一段」，浏览器会把 provider 排队、模型生成、SSE 传输、React 渲染
 * 糊成一个 40 秒的数字。这里用 Node 直连 `/api/tarot/reading/stream`，
 * 逐个 SSE 事件打时间戳，把「模型多久吐出第一个字」和「前端多久能上屏」分开。
 *
 * 浏览器侧的 T0/T10（点击→最终渲染）由 qa/performance-d5/_browser.mjs 另测。
 *
 * 用法：tsx scripts/perf-reading-trace.ts <standard|deep> <cards:1|3|5> [runs]
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { allCards } from '../src/data/deck/index.ts'
import { getSpread } from '../src/data/spreads.ts'
import { buildMessages } from '../server/prompts/index.ts'
import { rebuildContext } from '../server/context/rebuild.ts'
import type { ReadingRequest, ReadingMode } from '../src/types/reading.ts'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'qa', 'performance-d5')
mkdirSync(OUT, { recursive: true })
const BASE = process.env.ARCANA_BASE ?? 'http://localhost:8787'

const mode = (process.argv[2] ?? 'standard') as ReadingMode
const nCards = Number(process.argv[3] ?? 3)
const runs = Number(process.argv[4] ?? 1)

const SPREADS: Record<number, string> = { 1: 'single', 3: 'past-present-future', 5: 'two-choices' }
const spreadId = SPREADS[nCards]
if (!spreadId) { console.error('cards 只能是 1 / 3 / 5'); process.exit(1) }
const spread = getSpread(spreadId as never)

const QUESTION = '我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？'

/** 固定选牌，让不同 run 之间的输入完全一致 —— 否则测的是牌不是速度 */
function buildRequest(seedOffset: number): ReadingRequest {
  const picks = spread.positions.map((p, i) => {
    const card = allCards[(i * 17 + seedOffset * 3 + 5) % allCards.length]!
    return { positionId: p.id, cardId: card.id, orientation: (i % 2 === 0 ? 'upright' : 'reversed') as 'upright' | 'reversed' }
  })
  return { question: QUESTION, spreadId: spread.id, cards: picks, mode: 'question', readingMode: mode } as ReadingRequest
}

interface Trace {
  mode: ReadingMode; cards: number; run: number
  promptChars: number; systemChars: number; userChars: number; estInputTokens: number
  t: Record<string, number | null>
  outputChars: number | null; estOutputTokens: number | null
  phases: Array<{ phase: string; at: number }>
  deltaCount: number
  firstThemeClosedMs: number | null
  firstDeltaMs: number | null
  ok: boolean; error?: string
}

/** 与前端 extractPartial 同一条件：字段已闭合才算「可上屏」 */
function themeClosed(acc: string): boolean {
  return /"readingTheme"\s*:\s*"(?:[^"\\]|\\.)*"\s*,/.test(acc)
}

async function once(run: number): Promise<Trace> {
  const req = buildRequest(run)
  /* 用服务端同一份 builder 量 prompt 大小 —— 不是估的 */
  const ctx = rebuildContext(req)
  const msgs = buildMessages(ctx)
  const systemChars = msgs.filter((m) => m.role === 'system').reduce((s, m) => s + m.content.length, 0)
  const userChars = msgs.filter((m) => m.role !== 'system').reduce((s, m) => s + m.content.length, 0)
  const promptChars = systemChars + userChars

  const tr: Trace = {
    mode, cards: nCards, run,
    promptChars, systemChars, userChars,
    estInputTokens: Math.round(promptChars / 1.6), // 中文约 1.6 char/token
    t: { T0_start: 0, T1_requestSent: null, T5_responseHeaders: null, T6_firstDelta: null, T7_themeClosed: null, T9_done: null },
    outputChars: null, estOutputTokens: null,
    phases: [], deltaCount: 0, firstThemeClosedMs: null, firstDeltaMs: null, ok: false,
  }

  const t0 = performance.now()
  const ms = () => Math.round(performance.now() - t0)
  let res: Response
  try {
    tr.t.T1_requestSent = ms()
    res = await fetch(`${BASE}/api/tarot/reading/stream`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req),
    })
  } catch (e) { tr.error = String(e); return tr }
  tr.t.T5_responseHeaders = ms()
  if (!res.ok || !res.body) { tr.error = `HTTP ${res.status}`; return tr }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''; let acc = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const blocks = buf.split('\n\n'); buf = blocks.pop() ?? ''
    for (const block of blocks) {
      const ev = /^event: (.+)$/m.exec(block)?.[1]
      const dataLine = /^data: (.+)$/m.exec(block)?.[1]
      if (!ev || !dataLine) continue
      let payload: Record<string, unknown>
      try { payload = JSON.parse(dataLine) } catch { continue }
      if (ev === 'phase') tr.phases.push({ phase: String(payload.phase), at: ms() })
      else if (ev === 'delta') {
        tr.deltaCount += 1
        if (tr.t.T6_firstDelta === null) { tr.t.T6_firstDelta = ms(); tr.firstDeltaMs = ms() }
        acc += String(payload.text ?? '')
        if (tr.t.T7_themeClosed === null && themeClosed(acc)) {
          tr.t.T7_themeClosed = ms(); tr.firstThemeClosedMs = ms()
        }
      } else if (ev === 'done') {
        tr.t.T9_done = ms(); tr.ok = true
        const reading = payload.reading as Record<string, unknown>
        tr.outputChars = JSON.stringify(reading).length
        tr.estOutputTokens = Math.round(tr.outputChars / 1.6)
      } else if (ev === 'failed') {
        tr.t.T9_done = ms(); tr.error = JSON.stringify(payload.error)
      }
    }
  }
  if (tr.t.T9_done === null) tr.t.T9_done = ms()
  return tr
}

const results: Trace[] = []
for (let i = 0; i < runs; i++) {
  process.stdout.write(`  run ${i + 1}/${runs} … `)
  const r = await once(i)
  results.push(r)
  console.log(
    r.ok
      ? `首 delta ${r.firstDeltaMs}ms · 首段可上屏 ${r.firstThemeClosedMs}ms · 完成 ${r.t.T9_done}ms · 输出 ${r.outputChars} 字符`
      : `失败 ${r.error}`,
  )
}

const okRuns = results.filter((r) => r.ok)
const stat = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(s.length * p))]!
  return { min: s[0]!, median: q(0.5), p80: q(0.8), max: s[s.length - 1]! }
}
const summary = okRuns.length ? {
  mode, cards: nCards, runs: okRuns.length,
  promptChars: okRuns[0]!.promptChars,
  systemChars: okRuns[0]!.systemChars,
  userChars: okRuns[0]!.userChars,
  estInputTokens: okRuns[0]!.estInputTokens,
  firstDeltaMs: stat(okRuns.map((r) => r.firstDeltaMs!)),
  firstMeaningfulMs: stat(okRuns.filter((r) => r.firstThemeClosedMs !== null).map((r) => r.firstThemeClosedMs!)),
  totalMs: stat(okRuns.map((r) => r.t.T9_done!)),
  outputChars: stat(okRuns.map((r) => r.outputChars!)),
  estOutputTokens: stat(okRuns.map((r) => r.estOutputTokens!)),
  deltaCount: stat(okRuns.map((r) => r.deltaCount)),
} : null

const file = join(OUT, `reading-${mode}-${nCards}card.json`)
const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), summary, runs: results, previous: prev?.summary ?? null }, null, 2))

console.log(`\n${mode} · ${nCards} 张牌 · ${okRuns.length}/${runs} 成功`)
if (summary) {
  console.log(`  prompt        ${summary.promptChars} 字符（system ${summary.systemChars} + user ${summary.userChars}）≈ ${summary.estInputTokens} tokens`)
  console.log(`  首 delta      min ${summary.firstDeltaMs.min} · median ${summary.firstDeltaMs.median} · p80 ${summary.firstDeltaMs.p80} · max ${summary.firstDeltaMs.max} ms`)
  console.log(`  首段可上屏    min ${summary.firstMeaningfulMs.min} · median ${summary.firstMeaningfulMs.median} · p80 ${summary.firstMeaningfulMs.p80} · max ${summary.firstMeaningfulMs.max} ms`)
  console.log(`  总完成        min ${summary.totalMs.min} · median ${summary.totalMs.median} · p80 ${summary.totalMs.p80} · max ${summary.totalMs.max} ms`)
  console.log(`  输出          median ${summary.outputChars.median} 字符 ≈ ${summary.estOutputTokens.median} tokens · delta ${summary.deltaCount.median} 次`)
}
console.log(`  → ${file.replace(ROOT + '/', '')}`)
