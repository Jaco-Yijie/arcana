/**
 * Reading Specificity 评测（V2.5 Evidence-Grounded Action Reading）—— 真实调用 DeepSeek。
 *
 * V2.4 之后的问题不是「敢不敢判断」，而是「换一副牌，建议几乎不变」。
 * 这份评测回答四个问题：
 *
 *   A. 反模板：同一个问题 × 三副不同的牌，行动建议是否全部落进该领域的固定模板
 *      （关系 → 暂停主动等对方；工作 → 投简历测市场；学习 → 调方法做计划）
 *   B. 跨牌面差异：同一个问题换牌之后，decisionDriver 与 actionPlan 是否真的变了
 *   C. 同牌面稳定：同一副牌重复生成，核心判断是否保持一致（相似度应高于跨牌面）
 *   D. 现实背景敏感：同一副牌，问题里的现实细节不同，建议是否跟着变、是否引用了这些细节
 *   E. 其他：A/B 是否讲出选择标准；英文输出是否干净；是否补编数字窗口
 *
 * 相似度用的是汉字 / 单词 bigram 的 Jaccard —— 很粗，但足以区分「几乎同一句话」与「不同的建议」。
 * 这些都是启发式检查，结果会连同原文写进 qa/reading-specificity/results.json 供人工复核。
 *
 * 用法：`npm run reading:specificity`（需要 DEEPSEEK_API_KEY）
 *       `npm run reading:specificity -- --only=REL` 只跑名字里含 REL 的组
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ReadingContext, ReadingRequest, StructuredReading } from '../src/types/reading.ts'
import { rebuildContext } from '../server/context/rebuild.ts'
import { DeepSeekReadingProvider } from '../server/providers/deepseek.ts'
import { config } from '../server/env.ts'
import { registerCardText } from '../src/data/deck/localized.ts'
import { cardTextEn } from '../src/data/deck/i18n/en-US.ts'

/* 与 server/index.ts 一致：英文牌义覆盖层要先注册，否则英文请求拿到的是中文牌名 */
registerCardText('en-US', cardTextEn)

const G = '\x1b[32m'
const R = '\x1b[31m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

let pass = 0
let fail = 0
function check(name: string, ok: boolean, note = ''): void {
  if (ok) pass += 1
  else fail += 1
  console.log(`  ${ok ? `${G}PASS` : `${R}FAIL`}${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
}
function section(title: string): void {
  console.log(`\n${B}${title}${X}`)
}

type Cards = [string, string, 'upright' | 'reversed'][]

function request(id: string, spreadId: string, question: string, cards: Cards, extra: Partial<ReadingRequest> = {}): ReadingRequest {
  return {
    sessionId: `spec_${id}`,
    question,
    mode: 'question',
    theme: null,
    spreadId,
    readingMode: 'standard',
    cards: cards.map(([positionId, cardId, orientation]) => ({ positionId, cardId, orientation })),
    ...extra,
  }
}

/* ══════════════════════════════════════════════════════════════
 * 用例
 * 刻意避开 Prompt 示例里用过的牌（隐士逆 / 宝剑八 / 圣杯六逆；圣杯二逆 / 宝剑七 / 宝剑皇后），
 * 否则测到的是「模型会不会抄示例」，而不是「会不会因牌而异」。
 * ══════════════════════════════════════════════════════════ */

const SOA = 'situation-obstacle-advice'

const REL_Q = '我应该继续主动联系他吗？'
const REL_SETS: Record<string, Cards> = {
  R1: [['situation', 'cups-08', 'upright'], ['obstacle', 'cups-02', 'reversed'], ['advice', 'major-09', 'upright']],
  R2: [['situation', 'cups-01', 'upright'], ['obstacle', 'major-15', 'upright'], ['advice', 'wands-01', 'upright']],
  /* R3 是一副明显支持推进的牌。第一版 R3（宝剑四逆 / 星币四 / 圣杯三）与 R1、R2 一样偏困难，
     三份都给「暂停」各有牌面依据 —— 那样测不出「困难关系牌 ≠ 一律停止主动」的反面：
     牌面支持主动时，模型会不会照样给暂停。 */
  R3: [['situation', 'major-06', 'upright'], ['obstacle', 'wands-02', 'upright'], ['advice', 'cups-12', 'upright']],
}

const CAREER_Q = '我应该离开这份工作吗？'
const CAREER_SETS: Record<string, Cards> = {
  C1: [['situation', 'pentacles-08', 'upright'], ['obstacle', 'wands-10', 'upright'], ['advice', 'major-04', 'upright']],
  C2: [['situation', 'cups-04', 'upright'], ['obstacle', 'major-12', 'upright'], ['advice', 'wands-08', 'upright']],
  C3: [['situation', 'pentacles-03', 'reversed'], ['obstacle', 'swords-05', 'upright'], ['advice', 'major-14', 'upright']],
}

const STUDY_Q = '我最近学习状态很差怎么办？'
const STUDY_SETS: Record<string, Cards> = {
  S1: [['situation', 'major-18', 'upright'], ['obstacle', 'swords-09', 'upright'], ['advice', 'pentacles-08', 'upright']],
  S2: [['situation', 'cups-07', 'upright'], ['obstacle', 'wands-07', 'reversed'], ['advice', 'major-01', 'upright']],
  S3: [['situation', 'wands-10', 'upright'], ['obstacle', 'pentacles-05', 'upright'], ['advice', 'cups-03', 'upright']],
}

/** 该领域「看起来合理、但与牌无关」的模板行动 */
const TEMPLATES = {
  REL: /暂停|停止主动|停止(?:主动)?联系|先不(?:要)?(?:主动|联系)|(?:不要|别)再主动|不再(?:主动|发起|找他|联系)|暂时不(?:要)?(?:再)?(?:主动|联系)|减少(?:主动|联系)|等(?:他|对方)(?:先|主动|发起|来)|让(?:他|对方)(?:先|主动|来)|把主动权交给/,
  CAREER: /简历|投递|外部(?:岗位|机会)|市场反馈|去面试|找新工作/,
  STUDY: /(?:调整|改进|更换|换一种)(?:学习)?方法|制定(?:一份|一个)?(?:学习)?计划|时间表|番茄/,
}

/* ══════════════════════════════════════════════════════════════
 * 工具
 * ══════════════════════════════════════════════════════════ */

function bigrams(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[㐀-鿿]|[a-z0-9]+/g) ?? []
  const out = new Set<string>()
  for (let i = 0; i < tokens.length - 1; i += 1) out.add(`${tokens[i]}|${tokens[i + 1]}`)
  return out
}
function similarity(a: string, b: string): number {
  const x = bigrams(a)
  const y = bigrams(b)
  if (x.size === 0 || y.size === 0) return 0
  let inter = 0
  for (const g of x) if (y.has(g)) inter += 1
  return inter / (x.size + y.size - inter)
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0)
const pairs = <T>(xs: T[]): [T, T][] => xs.flatMap((a, i) => xs.slice(i + 1).map((b) => [a, b] as [T, T]))

const actionsText = (r: StructuredReading) => (r.actionPlan ?? []).map((a) => a.action).join(' ')
const driverText = (r: StructuredReading) => r.decisionDriver?.coreIssue ?? ''

/** 一份解读的「行动是否被模板主导」：一半以上的 action 命中模板 */
function templateDominated(r: StructuredReading, template: RegExp): boolean {
  const actions = r.actionPlan ?? []
  if (actions.length === 0) return true
  return actions.filter((a) => template.test(a.action)).length * 2 >= actions.length
}

/**
 * 问题里没有、却出现在建议里的时长 / 次数 / 数量（「接下来一周」「25 分钟」「五道题」「每周至少一次」）。
 * 「三件事」「一次沟通」这类不算：前者是动作内容本身，后者没有伪装成精确窗口。
 */
function inventedNumbers(r: StructuredReading, question: string): string[] {
  const text = JSON.stringify({ a: r.actionPlan, w: r.watchFor, q: r.answerToQuestion })
  // 「第三次」由问题里的「两次」直接推出，不算补编：先把带「第」的序数去掉
  const zh =
    text.replace(/第[一二两三四五六七八九十\d]+次/g, '').match(
      /[0-9]+\s*(?:天|周|个月|星期|小时|分钟|份|次|道|页)|[一两二三四五六七八九十半]+\s*(?:天|周|个月|个星期|星期|小时|分钟|份|道题|道|页)|[两二三四五六七八九十]+\s*次|一到两周|一两周|每(?:天|周)至少/g,
    ) ?? []
  const en =
    text.match(/\b(?:\d+|one|two|three|four|five|a)\s+(?:days?|weeks?|months?|minutes?|hours?)\b|\bthis week\b|\bend of the week\b/gi) ?? []
  return [...zh, ...en].filter((h, i, all) => {
    if (question.toLowerCase().includes(h.toLowerCase())) return false
    // 「一道题」「一页笔记」是最小动作单位的举例，不是伪装成精确的窗口
    if (/^一\s*(?:道|页)/.test(h)) return false
    void all
    void i
    return true
  })
}

/** watchFor 里的感受类条目（「是感到轻松还是焦虑」）—— 不是可观察的现实信号 */
const FEELING_SIGNAL = /(?:感到|感觉|觉得)(?:更)?(?:轻松|焦虑|失落|有动力|充实)|焦虑(?:感)?(?:是否|是上升|有所)|是更轻松|更想(?:靠近|逃离)|\bfeel(?:ing)?\s+(?:relief|anxious|lighter)|\bdecreases or transforms\b/i

/** 首条行动是否落进模板 —— 用来判断「主要行动方向」 */
const firstActionIsTemplate = (r: StructuredReading, template: RegExp) => template.test(r.actionPlan?.[0]?.action ?? '')

interface Run {
  key: string
  ctx: ReadingContext
  reading: StructuredReading | null
  error?: string
  ms: number
}

const provider = new DeepSeekReadingProvider()

async function generate(key: string, req: ReadingRequest): Promise<Run> {
  const ctx = rebuildContext(req)
  const t0 = Date.now()
  const result = await provider.generate(ctx)
  return result.ok
    ? { key, ctx, reading: result.reading, ms: Date.now() - t0 }
    : { key, ctx, reading: null, error: result.error.code, ms: Date.now() - t0 }
}

/** 小并发池：DeepSeek 单次 20–60 秒，串行跑 15 次太久 */
async function pool<T>(jobs: (() => Promise<T>)[], size = 4): Promise<T[]> {
  const out: T[] = new Array(jobs.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(size, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++
        out[i] = await jobs[i]!()
      }
    }),
  )
  return out
}

function printReading(run: Run): void {
  const r = run.reading
  if (!r) {
    console.log(`    ${R}[${run.key}] 生成失败：${run.error}${X}`)
    return
  }
  const cards = run.ctx.cards.map((c) => `${c.position.name}:${c.cardNameZh}${c.orientation === 'reversed' ? '逆' : ''}`).join(' / ')
  console.log(`    ${B}[${run.key}]${X} ${D}${cards} · ${Math.round(run.ms / 1000)}s${X}`)
  console.log(`      核心：${driverText(r)}`)
  console.log(`      回答：${D}${r.answerToQuestion}${X}`)
  for (const a of r.actionPlan ?? []) {
    const ev = (a.evidence ?? []).map((e) => e.cardId).join(',')
    console.log(`      → ${a.action}${a.timeframe ? `（${a.timeframe}）` : ''} ${D}[${ev}]${X}`)
  }
  for (const w of r.watchFor ?? []) console.log(`      ◦ ${D}${w}${X}`)
}

/** 每份解读都要满足的基础特异性检查 */
function baseChecks(run: Run): void {
  const r = run.reading
  check(`[${run.key}] 生成成功`, !!r, run.error ?? '')
  if (!r) return
  const names = run.ctx.cards.map((c) => (run.ctx.language === 'en' ? c.cardName : c.cardNameZh))
  check(`[${run.key}] 有 decisionDriver`, !!r.decisionDriver?.coreIssue)
  check(`[${run.key}] answerToQuestion 指名了本次的牌`, names.some((n) => r.answerToQuestion.includes(n)))
  check(`[${run.key}] 每条行动都带牌面证据`, (r.actionPlan ?? []).length > 0 && (r.actionPlan ?? []).every((a) => (a.evidence ?? []).length > 0))
  const invented = inventedNumbers(r, run.ctx.question)
  check(`[${run.key}] 没有补编数字窗口`, invented.length === 0, invented.join(','))
  const feelings = (r.watchFor ?? []).filter((w) => FEELING_SIGNAL.test(w))
  check(`[${run.key}] watchFor 没有感受类条目`, feelings.length === 0, feelings.join(' | '))
  check(`[${run.key}] 标准模式反思问题 ≤ 1`, run.ctx.readingMode === 'deep' || r.reflectionQuestions.length <= 1, `${r.reflectionQuestions.length} 条`)
}

/* ══════════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  if (!config.ready) {
    console.log(`${R}需要 DEEPSEEK_API_KEY，本评测不跑 Mock。${X}`)
    process.exit(1)
  }
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)
  const want = (group: string) => !only || group.includes(only)

  console.log(`${B}Arcana — Reading Specificity 评测（V2.5）${X}  ${D}provider=deepseek (${provider.model})${X}`)

  const jobs: [string, ReadingRequest][] = []
  if (want('REL')) {
    for (const [k, cards] of Object.entries(REL_SETS)) jobs.push([`REL-${k}`, request(k, SOA, REL_Q, cards)])
    // 同牌面稳定性：R1 再跑两次
    jobs.push(['REL-R1#2', request('R1b', SOA, REL_Q, REL_SETS.R1!)])
    jobs.push(['REL-R1#3', request('R1c', SOA, REL_Q, REL_SETS.R1!)])
  }
  if (want('CAREER')) for (const [k, cards] of Object.entries(CAREER_SETS)) jobs.push([`CAREER-${k}`, request(k, SOA, CAREER_Q, cards)])
  if (want('STUDY')) for (const [k, cards] of Object.entries(STUDY_SETS)) jobs.push([`STUDY-${k}`, request(k, SOA, STUDY_Q, cards)])
  if (want('REALITY')) {
    jobs.push(['REALITY-twice', request('Ra', SOA, '我已经主动找过他两次，这周他都只是简单回复，我还应该继续主动吗？', REL_SETS.R1!)])
    jobs.push(['REALITY-declined', request('Rb', SOA, '上周是他主动约我吃饭，我因为加班拒绝了，之后我们就没再联系。我现在应该主动联系他吗？', REL_SETS.R1!)])
  }
  if (want('AB')) {
    jobs.push(['AB', request('ab', 'two-choices', '我该选 A：接受外地那份薪水更高的 offer，还是 B：留在本地现在的公司？', [
      ['current', 'swords-02', 'upright'],
      ['a-process', 'wands-08', 'upright'],
      ['a-result', 'pentacles-10', 'upright'],
      ['b-process', 'cups-05', 'upright'],
      ['b-result', 'pentacles-04', 'upright'],
    ])])
  }
  if (want('EN')) {
    jobs.push(['EN', request('en', SOA, 'I have messaged him first twice this week and he only replies briefly. Should I keep reaching out?', REL_SETS.R2!, { language: 'en' } as Partial<ReadingRequest>)])
  }

  console.log(`${D}共 ${jobs.length} 次真实调用，并发 4${X}`)
  const runs = await pool(jobs.map(([key, req]) => () => generate(key, req)))
  const byKey = new Map(runs.map((r) => [r.key, r]))
  const ok = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((r): r is Run => !!r?.reading)

  section('0. 每份解读的基础特异性')
  for (const run of runs) baseChecks(run)

  const crossSims: number[] = []

  for (const [group, sets, template] of [
    ['REL', REL_SETS, TEMPLATES.REL],
    ['CAREER', CAREER_SETS, TEMPLATES.CAREER],
    ['STUDY', STUDY_SETS, TEMPLATES.STUDY],
  ] as const) {
    if (!want(group)) continue
    section(`A/B. ${group} —— 同一个问题 × 三副不同的牌`)
    const group3 = ok(Object.keys(sets).map((k) => `${group}-${k}`))
    group3.forEach(printReading)
    if (group3.length < 3) {
      check(`${group} 三份都生成成功`, false)
      continue
    }
    const dominated = group3.filter((r) => templateDominated(r.reading!, template))
    check(`${group} 反模板：三份解读没有全部落进同一个模板`, dominated.length < 3,
      `模板主导：${dominated.map((r) => r.key).join(',') || '无'}`)
    const firstTemplate = group3.filter((r) => firstActionIsTemplate(r.reading!, template))
    check(`${group} 反模板：三份的首条行动没有全部是模板方向`, firstTemplate.length < 3,
      `首条是模板：${firstTemplate.map((r) => r.key).join(',') || '无'}`)
    const actionSims = pairs(group3).map(([a, b]) => similarity(actionsText(a.reading!), actionsText(b.reading!)))
    const driverSims = pairs(group3).map(([a, b]) => similarity(driverText(a.reading!), driverText(b.reading!)))
    crossSims.push(...driverSims)
    check(`${group} 跨牌面：actionPlan 两两相似度都低于 0.35`, actionSims.every((s) => s < 0.35),
      actionSims.map((s) => s.toFixed(2)).join(' / '))
    check(`${group} 跨牌面：decisionDriver 两两相似度都低于 0.35`, driverSims.every((s) => s < 0.35),
      driverSims.map((s) => s.toFixed(2)).join(' / '))
    const evidenceSets = group3.map((r) => new Set((r.reading!.actionPlan ?? []).flatMap((a) => (a.evidence ?? []).map((e) => e.cardId))))
    check(`${group} 跨牌面：每份的行动证据都只来自各自的牌`, group3.every((r, i) =>
      [...evidenceSets[i]!].every((id) => r.ctx.cards.some((c) => c.cardId === id))))
  }

  if (want('REL')) {
    section('A2. REL —— 与建议位方向一致')
    const r2 = byKey.get('REL-R2')?.reading
    const r3 = byKey.get('REL-R3')?.reading
    check('REL-R2（建议位权杖首牌正位）首条行动不是暂停 / 等对方', !!r2 && !firstActionIsTemplate(r2, TEMPLATES.REL),
      r2?.actionPlan?.[0]?.action ?? '')
    const openers = ok(['REL-R1', 'REL-R2', 'REL-R3']).map((r) => /^我?不(?:太)?建议你(?:现在|立刻)?(?:继续)?主动/.test(r.reading!.answerToQuestion))
    check('REL 三份回答的开头没有全部是「不建议你继续主动」', openers.length === 3 && openers.some((o) => !o), openers.join(','))
    void r3

    section('C. 同牌面稳定性 —— REL-R1 重复 3 次')
    const same = ok(['REL-R1', 'REL-R1#2', 'REL-R1#3'])
    same.slice(1).forEach(printReading)
    if (same.length === 3) {
      const sameDriver = pairs(same).map(([a, b]) => similarity(driverText(a.reading!), driverText(b.reading!)))
      const sameAction = pairs(same).map(([a, b]) => similarity(actionsText(a.reading!), actionsText(b.reading!)))
      check('同牌面 decisionDriver 平均相似度高于跨牌面平均', mean(sameDriver) > mean(crossSims),
        `同牌面 ${mean(sameDriver).toFixed(2)} · 跨牌面 ${mean(crossSims).toFixed(2)}`)
      const direction = same.map((r) => firstActionIsTemplate(r.reading!, TEMPLATES.REL))
      check('同牌面主要行动方向不随机反转（首条行动归类三次一致）', direction.every((d) => d === direction[0]),
        direction.join(','))
      console.log(`  ${D}同牌面 actionPlan 相似度：${sameAction.map((s) => s.toFixed(2)).join(' / ')}${X}`)
    } else {
      check('同牌面三次都生成成功', false)
    }
  }

  if (want('REALITY')) {
    section('D. 现实背景敏感 —— 同一副牌（REL-R1），问题里的现实细节不同')
    const [twice, declined] = [byKey.get('REALITY-twice'), byKey.get('REALITY-declined')]
    ;[twice, declined].forEach((r) => r && printReading(r))
    if (twice?.reading && declined?.reading) {
      check('「主动过两次」的解读用上了这个事实', /两次|简单回复/.test(twice.reading.answerToQuestion))
      check('「上周他约我、我拒绝了」的解读用上了这个事实', /拒绝|他(?:主动)?约(?:你|过你)|吃饭/.test(declined.reading.answerToQuestion))
      const s = similarity(actionsText(twice.reading), actionsText(declined.reading))
      check('现实背景不同，actionPlan 明显不同（相似度 < 0.35）', s < 0.35, s.toFixed(2))
      check('「是你拒绝在先」的处境里，首条行动不是「等对方主动」的模板', !firstActionIsTemplate(declined.reading, TEMPLATES.REL),
        declined.reading.actionPlan?.[0]?.action ?? '')
      check('「是你拒绝在先」的处境里，没有把拒绝读成「他投入少」', !/拒绝[^。]{0,30}(?:说明|显示)[^。]{0,12}(?:投入不对等|他(?:投入|给)得少)/.test(declined.reading.answerToQuestion))
    } else {
      check('两份都生成成功', false)
    }
  }

  if (want('AB')) {
    section('E1. A/B —— 是否讲出选择标准与两边的具体代价')
    const ab = byKey.get('AB')
    if (ab?.reading) {
      printReading(ab)
      const text = ab.reading.answerToQuestion
      check('A/B 给出了倾向', /更倾向|更支持|更值得/.test(text))
      check('A/B 讲出了选择标准（如果你更看重 / 取决于你看重）', /看重|在意|标准|优先考虑/.test(text))
      check('A/B 同时指名了 A 路径与 B 路径上的牌', ['wands-08', 'pentacles-10'].some((id) => text.includes(ab.ctx.cards.find((c) => c.cardId === id)!.cardNameZh))
        && ['cups-05', 'pentacles-04'].some((id) => text.includes(ab.ctx.cards.find((c) => c.cardId === id)!.cardNameZh)))
    } else {
      check('A/B 生成成功', false, ab?.error ?? '')
    }
  }

  if (want('EN')) {
    section('E2. English')
    const en = byKey.get('EN')
    if (en?.reading) {
      printReading(en)
      check('英文输出没有任何汉字', !/[㐀-鿿]/.test(JSON.stringify(en.reading)))
      check('英文解读用上了「twice」这个现实细节', /twice|two times|two messages/i.test(en.reading.answerToQuestion))
    } else {
      check('英文生成成功', false, en?.error ?? '')
    }
  }

  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../qa/reading-specificity')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    resolve(outDir, 'results.json'),
    JSON.stringify(
      runs.map((r) => ({
        key: r.key,
        question: r.ctx.question,
        cards: r.ctx.cards.map((c) => ({ position: c.position.name, card: c.cardNameZh, orientation: c.orientation })),
        ms: r.ms,
        error: r.error ?? null,
        readingTheme: r.reading?.readingTheme,
        decisionDriver: r.reading?.decisionDriver,
        answerToQuestion: r.reading?.answerToQuestion,
        actionPlan: r.reading?.actionPlan,
        watchFor: r.reading?.watchFor,
        reflectionQuestions: r.reading?.reflectionQuestions,
      })),
      null,
      2,
    ),
  )

  console.log('\n' + '─'.repeat(64))
  console.log(fail === 0 ? `${G}全部通过${X}  ${pass} 项断言` : `${R}${fail} 项失败${X} / 共 ${pass + fail} 项`)
  console.log(`${D}原文已写入 qa/reading-specificity/results.json${X}`)
  console.log('─'.repeat(64))
  process.exit(fail === 0 ? 0 : 1)
}

void main()
