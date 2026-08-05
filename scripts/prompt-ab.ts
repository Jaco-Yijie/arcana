/**
 * V2.3 — Prompt A/B 对比
 *
 * 同一组 Question / Spread / Cards / Orientation，分别跑：
 *   v1            旧 Prompt + 默认推理（= 改造前的生产行为）
 *   v2-standard   新 Prompt standard + thinking disabled
 *   v2-deep       新 Prompt deep     + thinking enabled
 *
 * **完整输出全部落盘**（`ab-out/`），供人工评判解读质量 ——
 * 自动指标只能测「有没有」，测不出「好不好」。
 *
 * 用法：
 *   npx tsx scripts/prompt-ab.ts             # 10 组 × 3 变体
 *   npx tsx scripts/prompt-ab.ts --cases 2   # 快速试跑
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { rebuildContext } from '../server/context/rebuild.ts'
import { buildMessages as buildV1 } from '../server/prompts/tarotReadingPrompt.ts'
import { buildMessages as buildV2 } from '../server/prompts/tarotReadingPromptV2.ts'
import {
  assembleReading,
  extractJsonObject,
  validateReading,
} from '../server/validation/readingSchema.ts'
import { checkTone } from '../server/validation/toneGuard.ts'
import { config } from '../server/env.ts'
import type { ReadingMode, ReadingRequest } from '../src/types/reading.ts'

const OUT = 'ab-out'
const LIMIT = Number(process.argv[process.argv.indexOf('--cases') + 1]) || 10

type C = [string, string, 'upright' | 'reversed']
function req(id: string, q: string, spreadId: string, cards: C[], mode: ReadingMode = 'standard'): ReadingRequest {
  return {
    sessionId: id,
    question: q,
    mode: q ? 'question' : 'random',
    theme: q ? null : 'today',
    spreadId,
    readingMode: mode,
    cards: cards.map(([positionId, cardId, orientation]) => ({ positionId, cardId, orientation })),
  }
}

/** 10 组用例，覆盖张数 / 大小阿卡纳偏重 / 正逆位分布 / 花色重复 / 问题类型 */
const CASES: { name: string; req: ReadingRequest }[] = [
  { name: '01-单张-随缘', req: req('c1', '', 'single', [['guidance', 'major-17', 'upright']]) },
  { name: '02-三张-全正位', req: req('c2', '我想看清这段时间的工作状态', 'past-present-future', [
      ['past', 'major-01', 'upright'], ['present', 'wands-03', 'upright'], ['future', 'major-19', 'upright']]) },
  { name: '03-三张-混合逆位', req: req('c3', '我最近总是拖延，卡在哪里', 'situation-obstacle-advice', [
      ['situation', 'pentacles-11', 'reversed'], ['obstacle', 'swords-09', 'reversed'], ['advice', 'major-09', 'upright']]) },
  { name: '04-三张-大阿卡纳偏重', req: req('c4', '这一年对我意味着什么', 'past-present-future', [
      ['past', 'major-13', 'upright'], ['present', 'major-16', 'reversed'], ['future', 'major-21', 'upright']]) },
  { name: '05-三张-同花色重复', req: req('c5', '我该怎么安排接下来的钱', 'situation-obstacle-advice', [
      ['situation', 'pentacles-02', 'upright'], ['obstacle', 'pentacles-05', 'reversed'], ['advice', 'pentacles-08', 'upright']]) },
  { name: '06-五张-决策类', req: req('c6', '我该留在现在的公司还是去新的机会', 'two-choices', [
      ['current', 'swords-02', 'upright'], ['a-process', 'wands-08', 'upright'], ['a-result', 'major-10', 'upright'],
      ['b-process', 'cups-05', 'reversed'], ['b-result', 'major-17', 'upright']]) },
  { name: '07-五张-关系类', req: req('c7', '在这段关系里我现在最需要看清什么', 'relationship', [
      ['self', 'cups-01', 'upright'], ['other', 'swords-04', 'reversed'], ['between', 'major-06', 'upright'],
      ['obstacle', 'swords-03', 'reversed'], ['direction', 'cups-10', 'upright']]) },
  { name: '08-三张-全逆位困难牌', req: req('c8', '我最近为什么这么累', 'past-present-future', [
      ['past', 'wands-10', 'reversed'], ['present', 'swords-08', 'reversed'], ['future', 'pentacles-04', 'reversed']]) },
  { name: '09-三张-矛盾牌面', req: req('c9', '这个项目还值得继续投入吗', 'situation-obstacle-advice', [
      ['situation', 'major-16', 'upright'], ['obstacle', 'cups-08', 'upright'], ['advice', 'wands-04', 'upright']]) },
  { name: '10-五张-关系失衡', req: req('c10', '我和他之间到底出了什么问题', 'relationship', [
      ['self', 'cups-08', 'reversed'], ['other', 'swords-07', 'upright'], ['between', 'swords-03', 'upright'],
      ['obstacle', 'major-15', 'upright'], ['direction', 'swords-10', 'reversed']]) },
]

interface Variant { tag: string; build: (ctx: ReturnType<typeof rebuildContext>) => { role: string; content: string }[]; thinking: Record<string, unknown>; mode: ReadingMode }

const VARIANTS: Variant[] = [
  { tag: 'v1', build: (c) => buildV1(c), thinking: {}, mode: 'standard' },
  { tag: 'v2-standard', build: (c) => buildV2(c), thinking: { thinking: { type: 'disabled' } }, mode: 'standard' },
  { tag: 'v2-deep', build: (c) => buildV2(c), thinking: { thinking: { type: 'enabled' } }, mode: 'deep' },
]

interface Row {
  case: string; variant: string; ok: boolean; err?: string
  totalS: number; firstContentS: number | null
  outTokens: number | null; reasoningTokens: number | null
  chars: number; relCount: number; altCount: number; toneHits: number
  qHits: number; posHits: number; orientHits: number; dupPct: number
}

async function run(caseName: string, request: ReadingRequest, v: Variant): Promise<Row> {
  const ctx = rebuildContext({ ...request, readingMode: v.mode })
  const messages = v.build(ctx)
  const t0 = Date.now()
  let firstContent: number | null = null
  let content = ''
  let usage: Record<string, unknown> | null = null

  const row: Row = {
    case: caseName, variant: v.tag, ok: false, totalS: 0, firstContentS: null,
    outTokens: null, reasoningTokens: null, chars: 0, relCount: 0, altCount: 0,
    toneHits: 0, qHits: 0, posHits: 0, orientHits: 0, dupPct: 0,
  }

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-v4-pro', messages, response_format: { type: 'json_object' },
        temperature: config.temperature, max_tokens: config.maxTokens,
        stream: true, stream_options: { include_usage: true }, ...v.thinking,
      }),
      signal: AbortSignal.timeout(300_000),
    })
    if (!res.ok || !res.body) { row.err = `HTTP ${res.status}`; row.totalS = (Date.now() - t0) / 1000; return row }

    const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
    for (;;) {
      const { done, value } = await rd.read(); if (done) break
      buf += dec.decode(value, { stream: true })
      const ls = buf.split('\n'); buf = ls.pop() ?? ''
      for (const l of ls) {
        const t = l.trim(); if (!t.startsWith('data:')) continue
        const p = t.slice(5).trim(); if (p === '[DONE]') continue
        let c: Record<string, unknown>; try { c = JSON.parse(p) } catch { continue }
        if (c.usage) usage = c.usage as Record<string, unknown>
        const d = (c.choices as Record<string, unknown>[] | undefined)?.[0]?.delta as Record<string, unknown> | undefined
        if (!d) continue
        if (typeof d.content === 'string' && d.content) {
          if (firstContent === null) firstContent = Date.now() - t0
          content += d.content
        }
      }
    }
  } catch (e) {
    row.err = e instanceof Error ? e.name : 'error'; row.totalS = (Date.now() - t0) / 1000; return row
  }

  row.totalS = (Date.now() - t0) / 1000
  row.firstContentS = firstContent === null ? null : firstContent / 1000
  row.outTokens = (usage?.completion_tokens as number) ?? null
  row.reasoningTokens =
    ((usage?.completion_tokens_details as Record<string, number> | undefined)?.reasoning_tokens) ?? null

  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}/${caseName}__${v.tag}.raw.json`, content, 'utf8')

  try {
    const out = validateReading(extractJsonObject(content), ctx)
    const r = assembleReading(out, ctx, {
      provider: 'deepseek', model: 'deepseek-v4-pro', generatedAt: Date.now(),
      latencyMs: Date.now() - t0, toneAdjusted: false,
    })
    writeFileSync(`${OUT}/${caseName}__${v.tag}.reading.json`, JSON.stringify(r, null, 2), 'utf8')

    const all = [r.readingTheme, r.overallEnergy, r.narrative, r.answerToQuestion,
      ...r.cards.flatMap((c) => [c.interpretation, c.connectionToQuestion]),
      ...r.relationships.map((x) => x.interpretation),
      ...(r.alternativeInterpretations ?? []).map((x) => x.interpretation)].join('')

    row.ok = true
    row.chars = all.length
    row.relCount = r.relationships.length
    row.altCount = r.alternativeInterpretations?.length ?? 0
    row.toneHits = checkTone(r).length
    const qw = request.question ? request.question.replace(/[，。？、]/g, '').split('').filter((_, i) => i % 1 === 0) : []
    row.qHits = new Set(qw.filter((ch) => all.includes(ch))).size
    row.posHits = ctx.cards.filter((c) => all.includes(c.position.positionName)).length
    row.orientHits = (all.includes('逆位') ? 1 : 0) + (all.includes('正位') ? 1 : 0)
    const grams = new Set<string>(); let dup = 0, tot = 0
    for (let i = 0; i + 12 <= all.length; i += 4) { const g = all.slice(i, i + 12); tot++; if (grams.has(g)) dup++; grams.add(g) }
    row.dupPct = tot ? (dup / tot) * 100 : 0
  } catch (e) {
    row.err = `校验失败: ${e instanceof Error ? e.message : ''}`
  }
  return row
}

function pad(v: string | number, n: number) { const t = String(v); return t + ' '.repeat(Math.max(0, n - t.length)) }

async function main() {
  if (!config.apiKey) { console.error('缺少 DEEPSEEK_API_KEY'); process.exit(1) }
  const cases = CASES.slice(0, LIMIT)
  console.log(`A/B：${cases.length} 组 × ${VARIANTS.length} 变体 = ${cases.length * VARIANTS.length} 次调用\n`)

  const rows: Row[] = []
  for (const c of cases) {
    for (const v of VARIANTS) {
      process.stdout.write(`${pad(c.name, 22)}${pad(v.tag, 13)}… `)
      const r = await run(c.name, c.req, v)
      rows.push(r)
      console.log(r.err ? `❌ ${r.err}` :
        `${r.totalS.toFixed(0)}s 首${r.firstContentS?.toFixed(1) ?? '-'}s 关系${r.relCount} 另解${r.altCount} 语气${r.toneHits} ${r.chars}字`)
    }
  }

  console.log('\n' + '='.repeat(104))
  console.log(pad('case', 22) + pad('variant', 13) + pad('总时长', 9) + pad('首正文', 9) +
    pad('字数', 7) + pad('关系', 6) + pad('另解', 6) + pad('语气', 6) + pad('牌位', 6) + pad('重复%', 7))
  console.log('-'.repeat(104))
  for (const r of rows) {
    console.log(pad(r.case, 22) + pad(r.variant, 13) +
      pad(r.totalS.toFixed(0) + 's', 9) + pad(r.firstContentS === null ? '-' : r.firstContentS.toFixed(1) + 's', 9) +
      pad(r.chars, 7) + pad(r.relCount, 6) + pad(r.altCount, 6) + pad(r.toneHits, 6) +
      pad(r.posHits, 6) + pad(r.dupPct.toFixed(1), 7))
  }

  console.log('\n按变体汇总：')
  for (const v of VARIANTS) {
    const ok = rows.filter((r) => r.variant === v.tag && r.ok)
    if (!ok.length) { console.log(`  ${v.tag}: 无成功样本`); continue }
    const avg = (f: (r: Row) => number) => ok.reduce((a, b) => a + f(b), 0) / ok.length
    console.log(`  ${pad(v.tag, 13)} 成功 ${ok.length}/${rows.filter((r) => r.variant === v.tag).length} | ` +
      `总 ${avg((r) => r.totalS).toFixed(0)}s | 首正文 ${avg((r) => r.firstContentS ?? 0).toFixed(1)}s | ` +
      `${avg((r) => r.chars).toFixed(0)}字 | 关系 ${avg((r) => r.relCount).toFixed(1)} | ` +
      `另解 ${avg((r) => r.altCount).toFixed(1)} | 语气违规 ${avg((r) => r.toneHits).toFixed(2)} | ` +
      `重复 ${avg((r) => r.dupPct).toFixed(1)}%`)
  }
  writeFileSync(`${OUT}/summary.json`, JSON.stringify(rows, null, 2), 'utf8')
  console.log(`\n完整输出已存到 ${OUT}/（每组 .raw.json 原始返回 + .reading.json 结构化结果）`)
}

void main()
