/**
 * Deep Reading 稳定性验收 —— 20 次真实调用。
 *
 * 【它测的是什么】
 * V2.4 的 P0 目标：Deep 模式连续 20 次真实调用，成功 ≥ 19 次。
 * 「成功」的定义很严格 —— 必须走完整条链路：
 *   流式取回 → JSON 解析（必要时修复）→ 逐张比对牌面 → 语气校验
 * 任何一步不过都算失败。**牌面对不上一律算失败，不管解读写得多好。**
 *
 * 【为什么不自己写重试逻辑】
 * 直接调 `generateStructuredReading`，和线上 SSE 路由是同一个函数。
 * 脚本里再抄一份重试策略的话，测的就不是真实行为了。
 *
 * 【为什么每个用例的牌是写死的】
 * 这里要测的是**模型输出的稳定性**，不是抽牌引擎。
 * 牌固定下来，20 次之间的差异才只剩模型本身；
 * 而且失败时可以拿同一副牌复现。抽牌引擎有自己的 engine:check。
 *
 * 用法：
 *   npx tsx scripts/deep-stability.ts            # 20 次
 *   npx tsx scripts/deep-stability.ts --runs 5   # 少跑几次，先探路
 *   npx tsx scripts/deep-stability.ts --standard # 对照组：standard 模式
 *
 * 产物：
 *   deep-stability-out/run-NN.json     每次的明细
 *   deep-stability-out/summary.json    汇总
 * 失败样本的原始输出会一并留下，方便事后分析。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import type { ReadingMode, ReadingRequest } from '../src/types/reading.ts'
import { rebuildContext } from '../server/context/rebuild.ts'
import { generateStructuredReading } from '../server/reading/generateReading.ts'
import { config, describeConfig } from '../server/env.ts'

const OUT_DIR = 'deep-stability-out'

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback
}

const RUNS = Number(arg('runs', '20'))
const MODE: ReadingMode = process.argv.includes('--standard') ? 'standard' : 'deep'
/** 两次之间歇一会儿，别把限流打出来 —— 那不是我们要测的失败 */
const GAP_MS = Number(arg('gap', '3000'))

/* ══════════════════════════════════════════════════════════════
 * 20 个用例：5 种牌阵 × 不同题材，覆盖容易出问题的几类
 * ══════════════════════════════════════════════════════════ */

type Draw = [positionId: string, cardId: string, orientation: 'upright' | 'reversed']

interface Case {
  label: string
  spreadId: string
  question: string
  cards: Draw[]
}

const CASES: Case[] = [
  /* ── 单张：最短输出，看空响应会不会更频繁 ─────────────── */
  { label: '单张·随缘', spreadId: 'single', question: '', cards: [['guidance', 'major-17', 'upright']] },
  { label: '单张·逆位', spreadId: 'single', question: '今天我最该留意什么', cards: [['guidance', 'major-16', 'reversed']] },

  /* ── 三张：主力场景 ───────────────────────────────────── */
  {
    label: '三张·工作状态',
    spreadId: 'past-present-future',
    question: '我想看清这段时间的工作状态',
    cards: [['past', 'major-01', 'upright'], ['present', 'wands-03', 'upright'], ['future', 'major-19', 'upright']],
  },
  {
    label: '三张·拖延',
    spreadId: 'situation-obstacle-advice',
    question: '我最近总是拖延，卡在哪里',
    cards: [['situation', 'pentacles-11', 'reversed'], ['obstacle', 'swords-09', 'reversed'], ['advice', 'major-09', 'upright']],
  },
  {
    label: '三张·大阿卡纳偏重',
    spreadId: 'past-present-future',
    question: '这一年对我意味着什么',
    cards: [['past', 'major-13', 'upright'], ['present', 'major-16', 'reversed'], ['future', 'major-21', 'upright']],
  },
  {
    label: '三张·同花色重复',
    spreadId: 'situation-obstacle-advice',
    question: '我该怎么安排接下来的钱',
    cards: [['situation', 'pentacles-02', 'upright'], ['obstacle', 'pentacles-05', 'reversed'], ['advice', 'pentacles-08', 'upright']],
  },
  {
    label: '三张·全逆位',
    spreadId: 'past-present-future',
    question: '我最近为什么这么累',
    cards: [['past', 'wands-10', 'reversed'], ['present', 'swords-08', 'reversed'], ['future', 'pentacles-04', 'reversed']],
  },
  {
    label: '三张·矛盾牌面',
    spreadId: 'situation-obstacle-advice',
    question: '我和团队之间的问题在哪里',
    cards: [['situation', 'wands-05', 'upright'], ['obstacle', 'cups-05', 'reversed'], ['advice', 'swords-05', 'upright']],
  },
  {
    label: '三张·高风险话题',
    spreadId: 'situation-obstacle-advice',
    question: '我最近身体不舒服，是不是得了什么病',
    cards: [['situation', 'cups-07', 'reversed'], ['obstacle', 'swords-07', 'upright'], ['advice', 'major-02', 'upright']],
  },
  {
    label: '三张·英文提问',
    spreadId: 'past-present-future',
    question: 'What should I focus on in the next three months?',
    cards: [['past', 'cups-02', 'upright'], ['present', 'major-07', 'upright'], ['future', 'pentacles-09', 'upright']],
  },
  {
    label: '三张·极短提问',
    spreadId: 'situation-obstacle-advice',
    question: '为什么',
    cards: [['situation', 'major-12', 'reversed'], ['obstacle', 'swords-10', 'upright'], ['advice', 'cups-08', 'upright']],
  },
  {
    label: '三张·很长的提问',
    spreadId: 'past-present-future',
    question:
      '我最近在考虑要不要换一个城市生活，一方面现在的工作还算稳定但看不到什么变化，另一方面新城市有朋友也有机会，可我担心自己只是想逃避，我想知道现在这个念头到底是成长还是逃避',
    cards: [['past', 'major-08', 'upright'], ['present', 'swords-02', 'reversed'], ['future', 'wands-08', 'upright']],
  },

  /* ── 五张：输出最长，V2.3 的 JSON 失败就出在这里 ───────── */
  {
    label: '五张·二选一',
    spreadId: 'two-choices',
    question: '我该留在现在的公司还是去新的机会',
    cards: [
      ['current', 'swords-02', 'upright'], ['a-process', 'wands-08', 'upright'], ['a-result', 'major-10', 'upright'],
      ['b-process', 'cups-05', 'reversed'], ['b-result', 'major-17', 'upright'],
    ],
  },
  {
    label: '五张·关系（V2.3 出错的那组）',
    spreadId: 'relationship',
    question: '在这段关系里我现在最需要看清什么',
    cards: [
      ['self', 'cups-01', 'upright'], ['other', 'swords-04', 'reversed'], ['between', 'major-06', 'upright'],
      ['obstacle', 'swords-03', 'reversed'], ['direction', 'cups-10', 'upright'],
    ],
  },
  {
    label: '五张·关系失衡',
    spreadId: 'relationship',
    question: '我们之间为什么总是有一方在退让',
    cards: [
      ['self', 'pentacles-04', 'reversed'], ['other', 'wands-07', 'upright'], ['between', 'swords-06', 'upright'],
      ['obstacle', 'cups-04', 'reversed'], ['direction', 'major-14', 'upright'],
    ],
  },
  {
    label: '五张·全逆位',
    spreadId: 'two-choices',
    question: '两个方向我都提不起劲，问题在哪',
    cards: [
      ['current', 'major-18', 'reversed'], ['a-process', 'cups-06', 'reversed'], ['a-result', 'pentacles-07', 'reversed'],
      ['b-process', 'wands-04', 'reversed'], ['b-result', 'swords-01', 'reversed'],
    ],
  },
  {
    label: '五张·大阿卡纳密集',
    spreadId: 'relationship',
    question: '这段关系正在把我带向哪里',
    cards: [
      ['self', 'major-00', 'upright'], ['other', 'major-11', 'reversed'], ['between', 'major-15', 'upright'],
      ['obstacle', 'major-20', 'reversed'], ['direction', 'major-03', 'upright'],
    ],
  },
  {
    label: '五张·数字重复',
    spreadId: 'two-choices',
    question: '这两条路我该怎么判断',
    cards: [
      ['current', 'cups-03', 'upright'], ['a-process', 'wands-03', 'upright'], ['a-result', 'swords-03', 'reversed'],
      ['b-process', 'pentacles-03', 'upright'], ['b-result', 'major-03', 'upright'],
    ],
  },

  /* ── 随缘模式（无提问）：answerToQuestion 最容易写飘 ───── */
  {
    label: '三张·随缘·今日',
    spreadId: 'past-present-future',
    question: '',
    cards: [['past', 'wands-02', 'upright'], ['present', 'cups-09', 'reversed'], ['future', 'major-04', 'upright']],
  },
  {
    label: '五张·随缘·关系',
    spreadId: 'relationship',
    question: '',
    cards: [
      ['self', 'swords-11', 'upright'], ['other', 'cups-12', 'upright'], ['between', 'major-10', 'reversed'],
      ['obstacle', 'pentacles-06', 'upright'], ['direction', 'wands-09', 'upright'],
    ],
  },
]

function toRequest(c: Case, mode: ReadingMode, run: number): ReadingRequest {
  return {
    sessionId: `stability_${String(run).padStart(2, '0')}`,
    question: c.question,
    mode: c.question ? 'question' : 'random',
    theme: c.question ? null : 'today',
    spreadId: c.spreadId,
    readingMode: mode,
    cards: c.cards.map(([positionId, cardId, orientation]) => ({ positionId, cardId, orientation })),
  } as ReadingRequest
}

/* ══════════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  if (!config.apiKey) {
    console.error(`${R}没有配置 DEEPSEEK_API_KEY —— 这个脚本必须打真实接口，不接受 Mock。${X}`)
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  console.log(`${B}Deep Reading 稳定性验收${X}`)
  console.log(`${D}${describeConfig()}${X}`)
  console.log(`${D}模式 ${MODE} · ${RUNS} 次 · 间隔 ${GAP_MS}ms${X}`)
  console.log(`${D}判定：解析 + 牌面一致 + 语气校验全过才算成功${X}\n`)

  const results: Record<string, unknown>[] = []
  let ok = 0
  let okFirstTry = 0
  let okAfterRetry = 0
  const failureCounts = new Map<string, number>()
  const repairedRuns: number[] = []

  for (let i = 0; i < RUNS; i += 1) {
    const c = CASES[i % CASES.length]!
    const request = toRequest(c, MODE, i + 1)
    const context = rebuildContext(request)

    const label = `${String(i + 1).padStart(2, '0')} ${c.label}`
    process.stdout.write(`  ${label} ${D}…${X}`)

    const t0 = Date.now()
    let raw = ''
    const outcome = await generateStructuredReading(context, {
      onContent: (delta) => {
        raw += delta
      },
      onRestart: () => {
        raw = '' // 重来一轮，旧片段作废
      },
    })
    const ms = Date.now() - t0

    const success = outcome.reading !== null
    const usedRetry = outcome.attempts.length > 1
    const repaired = outcome.attempts.some((a) => a.repaired)

    if (success) {
      ok += 1
      if (usedRetry) okAfterRetry += 1
      else okFirstTry += 1
      if (repaired) repairedRuns.push(i + 1)
    } else {
      const name = outcome.attempts[outcome.attempts.length - 1]?.failure ?? 'unknown'
      failureCounts.set(name, (failureCounts.get(name) ?? 0) + 1)
    }

    /* ── 牌面一致性复查：即便校验器说通过，这里再独立核一遍 ──
     * 这是最后一道关。校验器要是有 bug，20/20 就毫无意义。 */
    let cardsIntact: boolean | null = null
    if (outcome.reading) {
      cardsIntact =
        outcome.reading.cards.length === request.cards.length &&
        request.cards.every((want, idx) => {
          const got = outcome.reading!.cards[idx]
          return got?.cardId === want.cardId && got?.orientation === want.orientation
        })
      if (!cardsIntact) {
        // 真出现这种情况，整个验收作废，必须当场知道
        console.log(`\n${R}★ 牌面被改动却通过了校验 —— 校验器有问题，run ${i + 1}${X}`)
      }
    }

    const tag = !success
      ? `${R}失败${X} ${D}${outcome.attempts[outcome.attempts.length - 1]?.failure}${X}`
      : usedRetry
        ? `${Y}成功(重试后)${X}`
        : `${G}成功${X}`
    const extra = repaired ? ` ${Y}[JSON 已修复]${X}` : ''
    console.log(`\r  ${label} ${tag}${extra} ${D}${(ms / 1000).toFixed(1)}s${X}`)

    const record = {
      run: i + 1,
      case: c.label,
      spreadId: c.spreadId,
      question: c.question,
      mode: MODE,
      success,
      usedRetry,
      cardsIntact,
      totalMs: ms,
      attempts: outcome.attempts,
      error: outcome.error instanceof Error ? outcome.error.message : null,
    }
    results.push(record)
    writeFileSync(
      `${OUT_DIR}/run-${String(i + 1).padStart(2, '0')}.json`,
      JSON.stringify({ ...record, reading: outcome.reading }, null, 2),
    )
    // 失败样本留原文，事后要靠它定位
    if (!success && raw) {
      writeFileSync(`${OUT_DIR}/run-${String(i + 1).padStart(2, '0')}.raw.txt`, raw)
    }

    if (i < RUNS - 1) await new Promise((r) => setTimeout(r, GAP_MS))
  }

  const latencies = results.filter((r) => r.success).map((r) => r.totalMs as number).sort((a, b) => a - b)
  const pct = (p: number) => (latencies.length ? latencies[Math.floor(latencies.length * p)] ?? latencies[latencies.length - 1]! : 0)

  const summary = {
    mode: MODE,
    runs: RUNS,
    model: config.model,
    success: ok,
    successRate: `${ok}/${RUNS}`,
    successFirstTry: okFirstTry,
    successAfterRetry: okAfterRetry,
    retryRescued: okAfterRetry,
    jsonRepaired: repairedRuns,
    failures: Object.fromEntries(failureCounts),
    cardIntegrityViolations: results.filter((r) => r.cardsIntact === false).length,
    latency: {
      medianMs: pct(0.5),
      p90Ms: pct(0.9),
      maxMs: latencies[latencies.length - 1] ?? 0,
    },
    generatedAt: new Date().toISOString(),
  }
  writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify(summary, null, 2))

  const passed = ok >= Math.ceil(RUNS * 0.95)
  console.log(`\n${'─'.repeat(64)}`)
  console.log(`  成功        ${passed ? G : R}${ok}/${RUNS}${X}   ${D}（一次过 ${okFirstTry}，重试救回 ${okAfterRetry}）${X}`)
  if (repairedRuns.length) console.log(`  JSON 修复   ${Y}${repairedRuns.length} 次${X} ${D}run ${repairedRuns.join(', ')}${X}`)
  if (failureCounts.size) {
    console.log(`  失败分布    ${[...failureCounts].map(([k, v]) => `${k}×${v}`).join('  ')}`)
  }
  console.log(`  牌面完整    ${summary.cardIntegrityViolations === 0 ? `${G}全部一致${X}` : `${R}${summary.cardIntegrityViolations} 次被改动${X}`}`)
  console.log(`  耗时        ${D}中位 ${(summary.latency.medianMs / 1000).toFixed(1)}s · P90 ${(summary.latency.p90Ms / 1000).toFixed(1)}s · 最长 ${(summary.latency.maxMs / 1000).toFixed(1)}s${X}`)
  console.log(`  目标 ≥${Math.ceil(RUNS * 0.95)}/${RUNS}  ${passed ? `${G}达标${X}` : `${R}未达标${X}`}`)
  console.log('─'.repeat(64))
  console.log(`${D}明细见 ${OUT_DIR}/${X}`)

  process.exit(passed ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
