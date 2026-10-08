/**
 * 视觉语义层的真实 Reading A/B。
 *
 *     npm run visual:ab -- --mode onoff     同一副牌，Visual OFF vs ON
 *     npm run visual:ab -- --mode crossdeck 同一张牌、同一牌位，五副牌组分别解读
 *     npm run visual:ab                     两组都跑
 *
 * 【它验证的不是「生成了很多 JSON」】
 * 验证的是这一层到底有没有改变解读：
 *   OFF/ON     —— 同一副牌，加了画面证据之后是不是更具体了，还是只是变长了
 *   CrossDeck  —— 换牌组时 archetype 必须稳定，改变的只能是观察重点
 *
 * 会真的调用 DeepSeek，需要 DEEPSEEK_API_KEY。
 */

import type { ReadingContext, ReadingRequest, StructuredReading } from '../src/types/reading.ts'
import { rebuildContext } from '../server/context/rebuild.ts'
import { buildMessages } from '../server/prompts/tarotReadingPromptV2.ts'
import { callDeepSeek } from '../server/providers/deepseek.ts'
import { assembleReading, extractJsonObject, validateReading } from '../server/validation/readingSchema.ts'
import { config } from '../server/env.ts'

const G = '\x1b[32m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const args = process.argv.slice(2)
const argOf = (n: string) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const mode = argOf('--mode') ?? 'both'

const QUESTION = '我还应该继续主动联系他吗？'

/** 三张牌，固定不变 —— A/B 的前提是除了视觉层其它一切相同 */
const CARDS: ReadingRequest['cards'] = [
  { positionId: 'situation', cardId: 'cups-08', orientation: 'upright' },
  { positionId: 'obstacle', cardId: 'cups-02', orientation: 'reversed' },
  { positionId: 'advice', cardId: 'major-09', orientation: 'upright' },
]

function request(deckId: string | null): ReadingRequest {
  return {
    sessionId: 'visual_ab',
    question: QUESTION,
    mode: 'question',
    theme: null,
    spreadId: 'situation-obstacle-advice',
    readingMode: 'standard',
    cards: CARDS,
    ...(deckId ? { deckId } : {}),
  } as ReadingRequest
}

/** 把视觉证据摘掉，其余逐字节保持不变 —— 这是 OFF 组唯一的差异 */
function stripVisual(ctx: ReadingContext): ReadingContext {
  return { ...ctx, cards: ctx.cards.map(({ deckVisualEvidence: _drop, ...rest }) => rest) }
}

async function runReading(ctx: ReadingContext): Promise<{ reading: StructuredReading; ms: number; promptChars: number }> {
  const messages = buildMessages(ctx)
  const promptChars = messages.reduce((n, m) => n + m.content.length, 0)
  const t0 = Date.now()
  const content = await callDeepSeek(messages, { thinking: { type: 'disabled' } })
  const parsed = extractJsonObject(content)
  const outcome = validateReading(parsed, ctx)
  const reading = assembleReading(outcome, ctx, {
    provider: 'deepseek',
    model: config.model,
    generatedAt: Date.now(),
    latencyMs: Date.now() - t0,
    toneAdjusted: false,
  })
  return { reading, ms: Date.now() - t0, promptChars }
}

/** 空泛用词密度 —— 越低越具体。这是 specificity 的粗测，不是唯一标准 */
const GENERIC = /多沟通|少沟通|观察一下|冷静一下|给自己时间|关注自己的感受|建立边界|保持开放|相信自己|听从直觉|提升自己|调整状态|做好准备|重新思考|降低期待|顺其自然|主动一点|不要太主动|先等等|慢慢来/g

function summarize(r: StructuredReading): { chars: number; generic: number } {
  const text = JSON.stringify(r)
  return { chars: text.length, generic: (text.match(GENERIC) ?? []).length }
}

function show(label: string, r: StructuredReading, ms: number, promptChars: number): void {
  const s = summarize(r)
  console.log(`\n${B}${label}${X}  ${D}${ms}ms · prompt ${promptChars} 字 · 输出 ${s.chars} 字 · 空泛词 ${s.generic}${X}`)
  console.log(`  ${Y}核心${X}：${r.readingTheme}`)
  console.log(`  ${D}整体${X}：${r.overallEnergy}`)
  for (const c of r.cards) {
    console.log(`  ${D}· ${c.position}｜${c.cardName}${X}：${c.interpretation.slice(0, 200)}${c.interpretation.length > 200 ? '…' : ''}`)
  }
  console.log(`  ${Y}回答${X}：${r.answerToQuestion}`)
}

async function runOnOff(): Promise<void> {
  console.log(`\n${B}════ A/B ①  Visual OFF vs ON（同一副牌、同一问题、同一朝向）════${X}`)
  const ctxOn = rebuildContext(request('legacy-shadow'))
  const ctxOff = stripVisual(ctxOn)
  const withEvidence = ctxOn.cards.filter((c) => c.deckVisualEvidence).length
  console.log(`${D}牌组 legacy-shadow · ${withEvidence}/${ctxOn.cards.length} 张带画面证据${X}`)

  const off = await runReading(ctxOff)
  show('OFF（改造前的形态）', off.reading, off.ms, off.promptChars)
  const on = await runReading(ctxOn)
  show('ON （带画面证据）', on.reading, on.ms, on.promptChars)

  const so = summarize(off.reading)
  const sn = summarize(on.reading)
  console.log(`\n${B}对比${X}`)
  console.log(`  Prompt   ${off.promptChars} → ${on.promptChars} 字（+${(((on.promptChars - off.promptChars) / off.promptChars) * 100).toFixed(1)}%）`)
  console.log(`  输出长度 ${so.chars} → ${sn.chars} 字（${sn.chars >= so.chars ? '+' : ''}${(((sn.chars - so.chars) / so.chars) * 100).toFixed(1)}%）`)
  console.log(`  空泛词   ${so.generic} → ${sn.generic}`)
  console.log(`  延迟     ${off.ms}ms → ${on.ms}ms`)
  console.log(`  ${D}牌面身份是否一致：${off.reading.cards.map((c) => c.cardId).join(',') === on.reading.cards.map((c) => c.cardId).join(',') ? G + '是' + X : '否'}${X}`)
}

async function runCrossDeck(): Promise<void> {
  console.log(`\n${B}════ A/B ②  Cross-Deck（同一张牌、同一牌位、同一朝向，只换牌组）════${X}`)
  const decks = ['legacy-moonlight', 'legacy-classic', 'legacy-forest', 'legacy-celestial', 'legacy-shadow']
  const results: { deckId: string; reading: StructuredReading; ms: number }[] = []
  for (const deckId of decks) {
    const ctx = rebuildContext(request(deckId))
    const r = await runReading(ctx)
    results.push({ deckId, reading: r.reading, ms: r.ms })
    console.log(`\n${B}${deckId}${X} ${D}${r.ms}ms${X}`)
    console.log(`  ${Y}核心${X}：${r.reading.readingTheme}`)
    for (const c of r.reading.cards) {
      console.log(`  ${D}${c.position} · ${c.cardName}${X}：${c.interpretation.slice(0, 230)}…`)
    }
  }

  console.log(`\n${B}不变量检查${X}`)
  const ref = results[0]!.reading
  let identityOk = true
  for (const { deckId, reading } of results) {
    for (const [i, c] of reading.cards.entries()) {
      const r = ref.cards[i]!
      if (c.cardId !== r.cardId || c.orientation !== r.orientation || c.position !== r.position) {
        identityOk = false
        console.log(`  ✘ ${deckId} 的第 ${i + 1} 张牌身份/朝向/牌位不一致`)
      }
    }
  }
  if (identityOk) console.log(`  ${G}✔ 五副牌组的 cardId / orientation / positionId 完全一致${X}`)

  const themes = new Set(results.map((r) => r.reading.readingTheme))
  console.log(`  ${themes.size === results.length ? G + '✔' : Y + '⚠'} 五份解读的核心句 ${themes.size}/${results.length} 条不同${X}`)
}

if (!config.ready) {
  console.log('没有 DEEPSEEK_API_KEY，无法跑真实 A/B')
  process.exit(1)
}
if (mode === 'onoff' || mode === 'both') await runOnOff()
if (mode === 'crossdeck' || mode === 'both') await runCrossDeck()
console.log()
