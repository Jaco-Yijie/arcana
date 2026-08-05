/**
 * V2.2 — Reading Performance Benchmark
 *
 * 只做测量，不改任何产品逻辑。
 *
 * 用**完全相同**的 question / spread / cards / orientation / ReadingContext，
 * 分别跑 deepseek-v4-pro 与 deepseek-v4-flash 各 N 次。
 *
 * 为什么用流式测：非流式拿不到 TTFB（首字节等于全部返回）。
 * 开 stream 后可以分别记录：
 *   - TTFB           收到第一个 chunk 的时间
 *   - 首个推理 chunk  模型开始「想」的时间
 *   - 首个正文 chunk  **用户真正能看到东西的时间** ← 这是流式方案的核心指标
 *   - 总时长
 * 同时 `stream_options.include_usage` 会在最后一个 chunk 带回 token 用量。
 *
 * 用法：
 *   npx tsx scripts/reading-bench.ts            # 每个模型 3 次
 *   npx tsx scripts/reading-bench.ts --runs 1   # 快速试跑
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { rebuildContext } from '../server/context/rebuild.ts'
import { buildMessages } from '../server/prompts/tarotReadingPrompt.ts'
import { config } from '../server/env.ts'
import type { ReadingRequest } from '../src/types/reading.ts'

const RUNS = Number(process.argv[process.argv.indexOf('--runs') + 1]) || 3
const MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash'] as const
const OUT_DIR = 'bench-out'

/** 固定的一组三张牌 —— 所有测试共用，保证可比 */
const FIXTURE: ReadingRequest = {
  sessionId: 'bench',
  question: '我在工作上总是很犹豫，可以从哪里看清楚一点？',
  mode: 'question',
  theme: null,
  spreadId: 'past-present-future',
  readingMode: 'standard',
  cards: [
    { positionId: 'past', cardId: 'major-09', orientation: 'upright' },
    { positionId: 'present', cardId: 'swords-11', orientation: 'reversed' },
    { positionId: 'future', cardId: 'major-17', orientation: 'upright' },
  ],
}

interface Sample {
  model: string
  run: number
  status: number
  finishReason: string | null
  promptChars: number
  inputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  cachedTokens: number | null
  ttfbMs: number | null
  firstReasoningMs: number | null
  /** 用户真正开始看到内容的时刻 —— 流式方案能不能救场，全看这个数 */
  firstContentMs: number | null
  totalMs: number
  contentChars: number
  error?: string
}

async function runOnce(model: string, run: number): Promise<Sample> {
  const context = rebuildContext(FIXTURE)
  const messages = buildMessages(context)
  const promptChars = messages.reduce((n, m) => n + m.content.length, 0)

  const started = Date.now()
  const base: Sample = {
    model,
    run,
    status: 0,
    finishReason: null,
    promptChars,
    inputTokens: null,
    outputTokens: null,
    reasoningTokens: null,
    cachedTokens: null,
    ttfbMs: null,
    firstReasoningMs: null,
    firstContentMs: null,
    totalMs: 0,
    contentChars: 0,
  }

  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: AbortSignal.timeout(300_000),
    })
  } catch (err) {
    base.totalMs = Date.now() - started
    base.error = err instanceof Error ? err.name : 'fetch-failed'
    return base
  }

  base.status = res.status
  if (!res.ok || !res.body) {
    base.totalMs = Date.now() - started
    base.error = `HTTP ${res.status}`
    return base
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (base.ttfbMs === null) base.ttfbMs = Date.now() - started

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue

      let chunk: Record<string, unknown>
      try {
        chunk = JSON.parse(payload)
      } catch {
        continue
      }

      const usage = chunk.usage as Record<string, unknown> | undefined
      if (usage) {
        base.inputTokens = (usage.prompt_tokens as number) ?? null
        base.outputTokens = (usage.completion_tokens as number) ?? null
        const detail = usage.completion_tokens_details as Record<string, number> | undefined
        base.reasoningTokens = detail?.reasoning_tokens ?? null
        base.cachedTokens = (usage.prompt_cache_hit_tokens as number) ?? null
      }

      const choice = (chunk.choices as Record<string, unknown>[] | undefined)?.[0]
      if (!choice) continue
      if (choice.finish_reason) base.finishReason = String(choice.finish_reason)

      const delta = choice.delta as Record<string, unknown> | undefined
      if (!delta) continue

      if (delta.reasoning_content && base.firstReasoningMs === null) {
        base.firstReasoningMs = Date.now() - started
      }
      if (typeof delta.content === 'string' && delta.content.length > 0) {
        if (base.firstContentMs === null) base.firstContentMs = Date.now() - started
        content += delta.content
      }
    }
  }

  base.totalMs = Date.now() - started
  base.contentChars = content.length

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(`${OUT_DIR}/${model}-run${run}.json`, content, 'utf8')
  return base
}

function pad(s: string | number, n: number): string {
  const t = String(s)
  return t + ' '.repeat(Math.max(0, n - t.length))
}

async function main(): Promise<void> {
  if (!config.apiKey) {
    console.error('缺少 DEEPSEEK_API_KEY')
    process.exit(1)
  }

  const ctx = rebuildContext(FIXTURE)
  const msgs = buildMessages(ctx)
  console.log('固定输入：3 张牌 / past-present-future / 同一个问题')
  console.log(
    `Prompt 体积：system ${msgs[0]!.content.length} 字 + user ${msgs[1]!.content.length} 字 = ${
      msgs[0]!.content.length + msgs[1]!.content.length
    } 字\n`,
  )

  const samples: Sample[] = []
  for (const model of MODELS) {
    for (let run = 1; run <= RUNS; run += 1) {
      process.stdout.write(`跑 ${model} 第 ${run}/${RUNS} 次… `)
      const s = await runOnce(model, run)
      samples.push(s)
      console.log(
        s.error
          ? `失败 ${s.error} (${s.totalMs}ms)`
          : `总 ${(s.totalMs / 1000).toFixed(1)}s | 首正文 ${
              s.firstContentMs === null ? '-' : (s.firstContentMs / 1000).toFixed(1) + 's'
            } | out ${s.outputTokens}`,
      )
    }
  }

  console.log('\n' + '='.repeat(112))
  console.log(
    pad('model', 20) + pad('run', 5) + pad('HTTP', 6) + pad('finish', 9) +
    pad('in', 7) + pad('out', 7) + pad('reason', 8) + pad('cached', 8) +
    pad('TTFB', 9) + pad('首推理', 9) + pad('首正文', 9) + pad('总时长', 9),
  )
  console.log('-'.repeat(112))
  for (const s of samples) {
    console.log(
      pad(s.model, 20) + pad(s.run, 5) + pad(s.status, 6) + pad(s.finishReason ?? '-', 9) +
      pad(s.inputTokens ?? '-', 7) + pad(s.outputTokens ?? '-', 7) +
      pad(s.reasoningTokens ?? '-', 8) + pad(s.cachedTokens ?? '-', 8) +
      pad(s.ttfbMs === null ? '-' : (s.ttfbMs / 1000).toFixed(1) + 's', 9) +
      pad(s.firstReasoningMs === null ? '-' : (s.firstReasoningMs / 1000).toFixed(1) + 's', 9) +
      pad(s.firstContentMs === null ? '-' : (s.firstContentMs / 1000).toFixed(1) + 's', 9) +
      pad((s.totalMs / 1000).toFixed(1) + 's', 9),
    )
  }

  console.log('\n平均值：')
  for (const model of MODELS) {
    const ok = samples.filter((s) => s.model === model && !s.error)
    if (ok.length === 0) {
      console.log(`  ${model}: 全部失败`)
      continue
    }
    const avg = (f: (s: Sample) => number | null) => {
      const v = ok.map(f).filter((x): x is number => x !== null)
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN
    }
    console.log(
      `  ${pad(model, 20)} 总 ${(avg((s) => s.totalMs) / 1000).toFixed(1)}s | ` +
        `首正文 ${(avg((s) => s.firstContentMs) / 1000).toFixed(1)}s | ` +
        `in ${avg((s) => s.inputTokens).toFixed(0)} | out ${avg((s) => s.outputTokens).toFixed(0)} | ` +
        `推理 ${avg((s) => s.reasoningTokens).toFixed(0)} | 正文 ${avg((s) => s.contentChars).toFixed(0)} 字`,
    )
  }

  writeFileSync(`${OUT_DIR}/samples.json`, JSON.stringify(samples, null, 2), 'utf8')
  console.log(`\n原始数据与各次输出已存到 ${OUT_DIR}/`)
}

void main()
