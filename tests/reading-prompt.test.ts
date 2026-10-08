/**
 * Reading Prompt V2.5（Evidence-Grounded Action Reading）的离线回归测试。
 * V2.4（Decision & Action Oriented）的断言保留在这里，确保 V2.5 没有回退它们。
 *
 * 不调用模型、零 token。它守住的是「Prompt 与 Schema 没有互相脱节」：
 *   · System Prompt 真的包含 V2.4 的任务定义与拆开后的现实边界
 *   · 两份示例本身就能通过线上同一套 validateReading + toneGuard
 *     （示例一旦过不了校验，模型越照着学越容易整份作废）
 *   · actionPlan / watchFor / 可选 reflectionQuestions 的校验、截断与修复
 *   · 医疗 / 法律问题会带上严格边界，普通生活问题不会
 *   · 流式提取器能提前放出已闭合的 actionPlan
 *   · V2.5：不可替换性原则、四层推导、现实锚点、反模板；decisionDriver 与 actionPlan[].evidence
 *
 * 真实模型输出的质量抽查见 `npm run reading:check -- --live` 与 `npm run reading:specificity`。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ReadingRequest, StructuredReading } from '../src/types/reading.ts'
import { rebuildContext } from '../server/context/rebuild.ts'
import {
  OUTPUT_EXAMPLE,
  OUTPUT_EXAMPLE_STANDARD,
  buildSystemPrompt,
  buildUserPrompt,
} from '../server/prompts/tarotReadingPromptV2.ts'
import { resolveVersion } from '../server/prompts/index.ts'
import { SchemaError, assembleReading, validateReading } from '../server/validation/readingSchema.ts'
import { checkTone } from '../server/validation/toneGuard.ts'
import { extractPartialActions } from '../src/features/reading/streamClient.ts'
import { toLegacyReading } from '../src/features/reading/legacyProjection.ts'
import { getSpread } from '../src/data/spreads.ts'
import { registerCardText } from '../src/data/deck/localized.ts'
import { cardTextEn } from '../src/data/deck/i18n/en-US.ts'

function request(
  question: string,
  spreadId: string,
  cards: [string, string, 'upright' | 'reversed'][],
  extra: Partial<ReadingRequest> = {},
): ReadingRequest {
  return {
    sessionId: 'test_v24',
    question,
    mode: 'question',
    theme: null,
    spreadId,
    readingMode: 'standard',
    cards: cards.map(([positionId, cardId, orientation]) => ({ positionId, cardId, orientation })),
    ...extra,
  }
}

/** Deep 示例（工作）与多数 Schema 用例用这副牌 */
const EXAMPLE_REQUEST = request(
  '我在这家公司做了三年，上个月领导口头答应给我调岗，到现在还没有落实。我是不是应该离开？',
  'past-present-future',
  [
    ['past', 'major-09', 'reversed'],
    ['present', 'swords-08', 'upright'],
    ['future', 'cups-06', 'reversed'],
  ],
)

/** Standard 示例（关系）用这副牌 */
const STANDARD_EXAMPLE_REQUEST = request(
  '我已经主动联系过他两次，这几天他都会回复，但从来没有主动找我。我还应该继续主动吗？',
  'situation-obstacle-advice',
  [
    ['situation', 'cups-02', 'reversed'],
    ['obstacle', 'swords-07', 'upright'],
    ['advice', 'swords-13', 'upright'],
  ],
)

function assembled(payload: unknown, mode: 'standard' | 'deep', base: ReadingRequest = EXAMPLE_REQUEST): StructuredReading {
  const ctx = rebuildContext({ ...base, readingMode: mode })
  const outcome = validateReading(payload, ctx)
  return assembleReading(outcome, ctx, {
    provider: 'deepseek',
    model: 'test',
    generatedAt: 0,
    latencyMs: 0,
    toneAdjusted: false,
  })
}

function minimalPayload(): Record<string, unknown> {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  return {
    readingTheme: 't',
    overallEnergy: 'e',
    cards: ctx.cards.map((c) => ({
      cardId: c.cardId,
      cardName: c.cardNameZh,
      position: c.position.name,
      orientation: c.orientation,
      interpretation: 'i',
      connectionToQuestion: 'c',
    })),
    relationships: [],
    narrative: 'n',
    answerToQuestion: 'a',
    decisionDriver: { coreIssue: '调岗承诺是否落实', whyItMatters: 'w', evidence: ['现在位宝剑八正位'] },
    actionPlan: [
      {
        action: '问清调岗时间。',
        reason: '宝剑八。',
        evidence: [{ cardId: 'swords-08', position: '现在', orientation: 'upright', signal: '未核实的前提' }],
        timeframe: '下一次沟通时',
      },
    ],
    watchFor: ['外部面试反馈'],
    reflectionQuestions: [],
  }
}

/* ── 一、版本与 Prompt 结构 ─────────────────────────────────── */

test('V2.5 仍然是 v2 这一版，PROMPT_VERSION 切换机制不变', () => {
  const source = readFileSync(new URL('../server/prompts/tarotReadingPromptV2.ts', import.meta.url), 'utf8')
  assert.match(source, /V2\.5（Evidence-Grounded Action Reading）/)
  const previous = process.env.PROMPT_VERSION
  delete process.env.PROMPT_VERSION
  assert.equal(resolveVersion(), 'v2')
  process.env.PROMPT_VERSION = 'v1'
  assert.equal(resolveVersion(), 'v1')
  if (previous === undefined) delete process.env.PROMPT_VERSION
  else process.env.PROMPT_VERSION = previous
})

for (const mode of ['standard', 'deep'] as const) {
  test(`${mode} System Prompt 包含决策与行动导向的任务定义`, () => {
    const prompt = buildSystemPrompt(mode, 'zh')
    for (const needle of [
      '你真正的工作',
      '→ 形成本次的判断 → 形成针对本次情况的行动建议 → 后续观察信号',
      '「有帮助」比「听起来神秘」更重要',
      '你应该有观点',
      '不要把「谨慎」误解成「模糊」',
      '不要强制积极结局',
      '信息不足不是终点',
      'actionPlan[].reason',
      'watchFor[]',
    ]) {
      assert.ok(prompt.includes(needle), `缺少：${needle}`)
    }
  })

  test(`${mode} System Prompt 包含 V2.5 的特异性约束`, () => {
    const prompt = buildSystemPrompt(mode, 'zh')
    for (const needle of [
      '# 不可替换性原则（最高优先级的质量标准）',
      '如果我把这张牌换成另一张完全不同的牌，这句话还成立吗？',
      '牌面证据（Card Evidence）→ 模式（Pattern）→ 现实后果（Practical Consequence）→ 行动（Action）',
      '现实锚点',
      '万能行动模板不算完整建议',
      '不要把问题类别映射成固定建议',
      '关系牌偏困难 → 少主动、等对方',
      '工作不顺 → 更新简历、投递、看市场反馈',
      'A / B 选择：说清你在用什么标准选',
      '不要发明具体数字来伪装「具体」',
      '找出最重要的那一个问题',
      'answerToQuestion 里至少要出现一个只属于本次问题的现实细节或牌面细节',
      'actionPlan：每条都要过替换测试',
      'watchFor：可观察的行为或现实信号',
      'decisionDriver.coreIssue',
      'actionPlan[].evidence[].signal',
    ]) {
      assert.ok(prompt.includes(needle), `缺少：${needle}`)
    }
    // 万能模板清单完整
    for (const phrase of ['多沟通', '少沟通', '观察一下', '冷静一下', '给自己时间', '关注自己的感受', '建立边界', '保持开放', '相信自己', '听从直觉', '提升自己', '调整状态', '做好准备', '重新思考', '降低期待', '顺其自然', '主动一点', '不要太主动', '先等等', '慢慢来']) {
      assert.ok(prompt.includes(phrase), `万能模板清单缺少：${phrase}`)
    }
    // Prompt 自己的示范句里不再出现凭空的天数 / 周数窗口
    const instructions = prompt.split('# 输出示例')[0]!
    assert.ok(!/未来一到两周|接下来两周/.test(instructions))
  })

  test(`${mode} System Prompt 拆开了现实决策边界：医疗 / 法律严格，其他放宽`, () => {
    const prompt = buildSystemPrompt(mode, 'zh')
    // 生理健康
    for (const needle of ['用塔罗诊断疾病', '判断药物该停、该加、该减还是该换', '判断怀孕结果或医学检查结果', '把牌面当成任何医学证据']) {
      assert.ok(prompt.includes(needle), `医疗边界缺少：${needle}`)
    }
    // 法律
    for (const needle of ['判断胜诉概率或案件结果', '用塔罗判断是否违法', '代替律师意见']) {
      assert.ok(prompt.includes(needle), `法律边界缺少：${needle}`)
    }
    // 普通生活决策明确放宽
    assert.ok(prompt.includes('其他生活问题：可以、也应该给出明确方向'))
    assert.ok(prompt.includes('如果只看目前牌面，我更倾向 A，而不是 B。'))
    // V2.3 那条把离职 / 分手 / 搬迁捆进严格限制的旧规则已经不在了
    assert.ok(!prompt.includes('分手 / 离职 / 搬迁这类'))
    assert.ok(!prompt.includes('说清差别，不替他勾选'))
  })

  test(`${mode} System Prompt 不再强制 3 条 reflectionQuestions`, () => {
    const prompt = buildSystemPrompt(mode, 'zh')
    assert.ok(!prompt.includes('3–4 条留给用户自己想的开放问句'))
    assert.ok(!/\| reflectionQuestions\[\] \| 3 条 \|/.test(prompt))
    assert.ok(prompt.includes(mode === 'deep' ? '| reflectionQuestions[] | 0–3 条' : '| reflectionQuestions[] | 0–1 条'))
  })
}

test('英文输出指令覆盖新增字段，JSON key 仍为英文', () => {
  const prompt = buildSystemPrompt('standard', 'en')
  assert.ok(prompt.startsWith('**OUTPUT LANGUAGE: ENGLISH.**'))
  assert.match(prompt, /actionPlan action \/ reason \/ evidence signal \/ timeframe/)
  assert.match(prompt, /watchFor item/)
  assert.match(prompt, /decisionDriver \(coreIssue \/ whyItMatters \/ evidence\)/)
  assert.match(prompt, /including in actionPlan evidence/)
  assert.ok(prompt.includes('json 的 key 一律使用下表里的英文名'))
})

test('英文请求（与 server/index.ts 同样注册覆盖层后）：User Prompt 里的牌名全是英文', () => {
  registerCardText('en-US', cardTextEn)
  const ctx = rebuildContext(
    request('Should I keep reaching out?', 'situation-obstacle-advice', [
      ['situation', 'cups-01', 'upright'],
      ['obstacle', 'major-15', 'upright'],
      ['advice', 'wands-01', 'upright'],
    ], { language: 'en' } as Partial<ReadingRequest>),
  )
  const prompt = buildUserPrompt(ctx)
  assert.ok(prompt.includes('cardName=`Ace of Cups`'))
  const cardLines = prompt.split('\n').filter((l) => l.includes('落在这一格的牌') || l.includes('cardName='))
  assert.ok(cardLines.length > 0 && cardLines.every((l) => !/(?:圣杯|恶魔|权杖)/.test(l)), cardLines.join('\n'))
})

/* ── 二、示例本身必须过得了线上校验 ───────────────────────────── */

test('Standard 示例：合法 JSON、通过校验与语气检查、数量落在标准预算内', () => {
  const payload = JSON.parse(OUTPUT_EXAMPLE_STANDARD) as Record<string, unknown>
  const reading = assembled(payload, 'standard', STANDARD_EXAMPLE_REQUEST)
  assert.equal(reading.meta.repaired, false, '示例不应触发任何修复')
  assert.equal(checkTone(reading).length, 0, JSON.stringify(checkTone(reading)))
  assert.ok(reading.actionPlan!.length >= 2 && reading.actionPlan!.length <= 3)
  assert.ok(reading.watchFor!.length >= 2 && reading.watchFor!.length <= 3)
  assert.ok(reading.reflectionQuestions.length <= 1)
  assert.ok(reading.decisionDriver)
  assert.equal('alternativeInterpretations' in payload, false)
})

test('Deep 示例：合法 JSON、通过校验与语气检查、数量落在深度预算内', () => {
  const payload = JSON.parse(OUTPUT_EXAMPLE) as Record<string, unknown>
  const reading = assembled(payload, 'deep')
  assert.equal(reading.meta.repaired, false, '示例不应触发任何修复')
  assert.equal(checkTone(reading).length, 0, JSON.stringify(checkTone(reading)))
  assert.ok(reading.actionPlan!.length >= 3 && reading.actionPlan!.length <= 5)
  assert.ok(reading.watchFor!.length >= 3 && reading.watchFor!.length <= 5)
  assert.ok(reading.reflectionQuestions.length <= 3)
  assert.ok(reading.decisionDriver)
  assert.equal(reading.alternativeInterpretations?.length, 1)
})

const EXAMPLES = [
  {
    name: 'Standard（关系）',
    raw: OUTPUT_EXAMPLE_STANDARD,
    request: STANDARD_EXAMPLE_REQUEST,
    anchors: ['两次', '回复', '主动'],
    cardNames: /圣杯二|宝剑七|宝剑皇后/,
    /** 该领域最常见的模板方向，示例的行动不应该是它 */
    template: /暂停主动|等(?:他|对方)先|先不(?:要)?主动|减少联系/,
  },
  {
    name: 'Deep（工作）',
    raw: OUTPUT_EXAMPLE,
    request: EXAMPLE_REQUEST,
    anchors: ['三年', '上个月', '调岗', '口头'],
    cardNames: /隐士|宝剑八|圣杯六/,
    template: /简历|投递/,
  },
] as const

for (const ex of EXAMPLES) {
  test(`${ex.name} 示例：用上了问题里的现实锚点，且没有补编问题里不存在的数字`, () => {
    const example = JSON.parse(ex.raw) as StructuredReading
    for (const anchor of ex.anchors) {
      assert.ok(example.answerToQuestion.includes(anchor), `answerToQuestion 没有用上「${anchor}」`)
    }
    const numbers = JSON.stringify(example).match(/[0-9一二两三四五六七八九十]+\s*(?:天|周|个月|星期|小时|份)/g) ?? []
    for (const n of numbers) {
      assert.ok(ex.request.question.includes(n), `示例出现了问题里没有的数字窗口：${n}`)
    }
  })

  test(`${ex.name} 示例：行动带牌面证据、事件型窗口，且避开了该领域的模板方向`, () => {
    const example = JSON.parse(ex.raw) as StructuredReading
    const ids = new Set(rebuildContext(ex.request).cards.map((c) => c.cardId))
    for (const item of example.actionPlan!) {
      assert.ok(item.evidence && item.evidence.length >= 1 && item.evidence.length <= 3, item.action)
      assert.ok(item.evidence.every((e) => ids.has(e.cardId) && e.signal.length > 0))
      if (item.timeframe) assert.ok(!/\d|[一二两三四五六七八九十]\s*(?:天|周|个月)/.test(item.timeframe), item.timeframe)
    }
    const firstAction = example.actionPlan![0]!.action
    assert.ok(!ex.template.test(firstAction), `首条行动落入了模板：${firstAction}`)
    assert.ok(example.decisionDriver!.evidence.every((line) => ex.cardNames.test(line)))
    for (const vague of ['听从内心', '答案在你心中', '最终还是需要你自己决定', '两边都有可能', '顺其自然']) {
      assert.ok(!ex.raw.includes(vague), `示例出现空泛表达：${vague}`)
    }
  })

  test(`${ex.name} 示例：watchFor 是可观察的信号，不是「观察态度 / 感受 / 变化」`, () => {
    const example = JSON.parse(ex.raw) as StructuredReading
    for (const signal of example.watchFor!) {
      assert.ok(!/^观察(?:对方的?态度|自己的感受|事情的发展|有没有变化)/.test(signal), signal)
    }
  })
}

test('两份示例是不同领域的问题，不再用同一个工作问题强化模板', () => {
  assert.notEqual(STANDARD_EXAMPLE_REQUEST.question, EXAMPLE_REQUEST.question)
  assert.notEqual(STANDARD_EXAMPLE_REQUEST.spreadId, EXAMPLE_REQUEST.spreadId)
})

/* ── 三、Schema：新增字段与可选 reflectionQuestions ─────────────── */

test('reflectionQuestions 为空数组或缺失时合法', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const empty = minimalPayload()
  assert.deepEqual(validateReading(empty, ctx).reflectionQuestions, [])
  const missing = minimalPayload()
  delete missing.reflectionQuestions
  assert.deepEqual(validateReading(missing, ctx).reflectionQuestions, [])
})

test('actionPlan / watchFor 被解析，timeframe 可选', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const payload = minimalPayload()
  const ev = [{ cardId: 'swords-08', position: '现在', orientation: 'upright', signal: '未核实的前提' }]
  payload.actionPlan = [
    { action: ' 问清调岗时间。 ', reason: '宝剑八。', evidence: ev, timeframe: '下一次沟通时' },
    { action: '写下期待。', reason: '隐士逆位。', evidence: ev, timeframe: '   ' },
  ]
  const out = validateReading(payload, ctx)
  assert.deepEqual(out.actionPlan, [
    { action: '问清调岗时间。', reason: '宝剑八。', evidence: ev, timeframe: '下一次沟通时' },
    { action: '写下期待。', reason: '隐士逆位。', evidence: ev },
  ])
  assert.deepEqual(out.watchFor, ['外部面试反馈'])
  assert.equal(out.repaired, false)
})

test('缺失 actionPlan / watchFor 标 repaired，而不是整份作废', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const payload = minimalPayload()
  delete payload.actionPlan
  delete payload.watchFor
  const out = validateReading(payload, ctx)
  assert.deepEqual(out.actionPlan, [])
  assert.deepEqual(out.watchFor, [])
  assert.equal(out.repaired, true)
})

test('字符串形式的 actionPlan 保留动作并标 repaired；空动作被丢弃', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const payload = minimalPayload()
  payload.actionPlan = ['更新简历。', { action: '', reason: 'x' }, 42]
  const out = validateReading(payload, ctx)
  assert.deepEqual(out.actionPlan, [{ action: '更新简历。', reason: '' }])
  assert.equal(out.repaired, true)
})

test('按模式截断超量列表：standard 3/3/1，deep 5/5/3', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => `第 ${i + 1} 条`)
  for (const [mode, limits] of [['standard', [3, 3, 1]], ['deep', [5, 5, 3]]] as const) {
    const ctx = rebuildContext({ ...EXAMPLE_REQUEST, readingMode: mode })
    const payload = minimalPayload()
    payload.actionPlan = many(7).map((action) => ({ action, reason: 'r' }))
    payload.watchFor = many(7)
    payload.reflectionQuestions = many(7).map((q) => `${q}？`)
    const out = validateReading(payload, ctx)
    assert.equal(out.actionPlan.length, limits[0])
    assert.equal(out.watchFor.length, limits[1])
    assert.equal(out.reflectionQuestions.length, limits[2])
    assert.equal(out.repaired, true)
  }
})

test('牌面红线不受新字段影响：改正逆位仍然整份作废', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const payload = minimalPayload()
  ;(payload.cards as Record<string, unknown>[])[0]!.orientation = 'upright'
  assert.throws(() => validateReading(payload, ctx), SchemaError)
})

test('语气红线同样扫描 actionPlan 与 watchFor', () => {
  const reading = assembled(
    { ...minimalPayload(), actionPlan: [{ action: '你必须马上离职。', reason: 'r' }], watchFor: ['宇宙正在告诉你答案'] },
    'standard',
  )
  const fields = checkTone(reading).map((v) => v.field)
  assert.ok(fields.includes('actionPlan[0].action'))
  assert.ok(fields.includes('watchFor[0]'))
})

/* ── 三点五、V2.5 Schema：decisionDriver 与 evidence ─────────────── */

test('decisionDriver 被解析；缺失时标 repaired 而不是作废', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const out = validateReading(minimalPayload(), ctx)
  assert.deepEqual(out.decisionDriver, { coreIssue: '调岗承诺是否落实', whyItMatters: 'w', evidence: ['现在位宝剑八正位'] })
  assert.equal(out.repaired, false)

  const missing = minimalPayload()
  delete missing.decisionDriver
  const repaired = validateReading(missing, ctx)
  assert.equal(repaired.decisionDriver, null)
  assert.equal(repaired.repaired, true)
})

test('evidence：position / orientation 以服务端数据为准，没抽到的牌被剔除并标 repaired', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const payload = minimalPayload()
  payload.actionPlan = [
    {
      action: 'a',
      reason: 'r',
      evidence: [
        { cardId: 'swords-08', position: '随便写的牌位', orientation: 'up right', signal: 's1' },
        { cardId: 'major-00', position: '现在', orientation: 'upright', signal: '没抽到的牌' },
        { cardId: 'cups-06', position: '未来', orientation: 'reversed', signal: '' },
      ],
    },
  ]
  const out = validateReading(payload, ctx)
  assert.deepEqual(out.actionPlan[0]!.evidence, [
    { cardId: 'swords-08', position: '现在', orientation: 'upright', signal: 's1' },
  ])
  assert.equal(out.repaired, true)
})

test('evidence 把朝向明确写反：与改牌同一条红线，整份作废', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const payload = minimalPayload()
  payload.actionPlan = [
    { action: 'a', reason: 'r', evidence: [{ cardId: 'major-09', position: '过去', orientation: 'upright', signal: 's' }] },
  ]
  assert.throws(() => validateReading(payload, ctx), SchemaError)
})

test('evidence 超过 3 条被截断；缺失 evidence 标 repaired', () => {
  const ctx = rebuildContext(EXAMPLE_REQUEST)
  const e = { cardId: 'swords-08', position: '现在', orientation: 'upright', signal: 's' }
  const payload = minimalPayload()
  payload.actionPlan = [{ action: 'a', reason: 'r', evidence: [e, e, e, e] }, { action: 'b', reason: 'r' }]
  const out = validateReading(payload, ctx)
  assert.equal(out.actionPlan[0]!.evidence!.length, 3)
  assert.deepEqual(out.actionPlan[1]!.evidence, [])
  assert.equal(out.repaired, true)
})

test('语气红线扫描 decisionDriver 与 evidence.signal', () => {
  const reading = assembled(
    {
      ...minimalPayload(),
      decisionDriver: { coreIssue: '这件事已成定局', whyItMatters: 'w', evidence: ['e'] },
      actionPlan: [
        { action: 'a', reason: 'r', evidence: [{ cardId: 'swords-08', position: '现在', orientation: 'upright', signal: '宇宙正在告诉你答案' }] },
      ],
    },
    'standard',
  )
  const fields = checkTone(reading).map((v) => v.field)
  assert.ok(fields.includes('decisionDriver.coreIssue'))
  assert.ok(fields.includes('actionPlan[0].evidence[0].signal'))
})

test('User Prompt 要求读问题原文里的现实锚点，并回填 evidence 的可用 cardId', () => {
  const prompt = buildUserPrompt(rebuildContext(STANDARD_EXAMPLE_REQUEST))
  assert.ok(prompt.includes('我已经主动联系过他两次'))
  assert.ok(prompt.includes('先从上面的原文里识别现实锚点'))
  assert.ok(prompt.includes('actionPlan[].evidence[].cardId 里只能出现这些 cardId'))
  assert.ok(prompt.includes('relationships → decisionDriver → narrative'))
})

test('User Prompt 在紧挨输出处放了特异性自检（换牌、锚点、数字、感受类信号、建议位方向）', () => {
  const prompt = buildUserPrompt(rebuildContext(STANDARD_EXAMPLE_REQUEST))
  for (const needle of ['① 把牌换成完全不同的牌', '② 问题原文里的现实锚点（以及用户主动补充的背景，如果有）有没有改变你的推理方向', '③ actionPlan / watchFor / answerToQuestion 里的每个时长', '④ watchFor 每一条是不是外部能看到的行为', '⑤ 建议类牌位上是一张推进']) {
    assert.ok(prompt.includes(needle), `缺少：${needle}`)
  }
  // 自检紧挨在「直接输出 json」之前
  assert.ok(prompt.indexOf('⑤ 建议类牌位') < prompt.indexOf('现在直接输出那一个 json 对象'))
})

test('A / B 牌阵的 User Prompt 要求说出选择标准；其他牌阵没有这句', () => {
  const ab = rebuildContext(
    request('我该选 A 还是 B？', 'two-choices', [
      ['current', 'swords-02', 'upright'],
      ['a-process', 'wands-08', 'upright'],
      ['a-result', 'pentacles-10', 'upright'],
      ['b-process', 'cups-05', 'upright'],
      ['b-result', 'pentacles-04', 'upright'],
    ]),
  )
  assert.ok(buildUserPrompt(ab).includes('本次是 A / B 牌阵：answerToQuestion 里要说出选择标准'))
  assert.ok(!buildUserPrompt(rebuildContext(EXAMPLE_REQUEST)).includes('本次是 A / B 牌阵'))
})

/* ── 四、现实边界在 User Prompt 里按类别生效 ───────────────────── */

test('医疗问题：命中 medical，User Prompt 带生理健康严格边界', () => {
  const ctx = rebuildContext(
    request('这张牌是不是说明我得了某种病？', 'single', [['guidance', 'major-16', 'upright']]),
  )
  assert.ok(ctx.riskCategories?.includes('medical'))
  assert.ok(ctx.safetyNotice)
  const prompt = buildUserPrompt(ctx)
  assert.ok(prompt.includes('涉及生理健康：严格遵守'))
  assert.ok(prompt.includes('不用塔罗做诊断'))
})

test('法律问题：命中 legal，User Prompt 带法律严格边界', () => {
  const ctx = rebuildContext(
    request('这场官司我会不会赢？', 'single', [['guidance', 'major-11', 'reversed']]),
  )
  assert.ok(ctx.riskCategories?.includes('legal'))
  assert.ok(buildUserPrompt(ctx).includes('涉及法律：严格遵守'))
})

test('普通感情 / 工作 / A-B 问题不会被推进安全边界', () => {
  for (const question of ['我还应该继续主动联系他吗？', '我应该继续留在现在的工作吗？', '我该选 A 城市的工作还是 B 城市的工作？']) {
    const ctx = rebuildContext(request(question, 'single', [['guidance', 'cups-02', 'reversed']]))
    assert.equal(ctx.safetyNotice, null, question)
    assert.ok(!buildUserPrompt(ctx).includes('安全边界'), question)
  }
})

test('高风险财务只收紧投机加码，不走医疗 / 法律那套严格边界', () => {
  const ctx = rebuildContext(request('我要不要加杠杆继续投？', 'single', [['guidance', 'wands-10', 'upright']]))
  assert.deepEqual(ctx.riskCategories, ['financial'])
  const prompt = buildUserPrompt(ctx)
  assert.ok(prompt.includes('涉及高风险财务'))
  assert.ok(!prompt.includes('严格遵守'))
})

test('User Prompt 回填清单里写明了新字段顺序', () => {
  const prompt = buildUserPrompt(rebuildContext(EXAMPLE_REQUEST))
  assert.ok(prompt.includes('answerToQuestion → actionPlan → watchFor → reflectionQuestions'))
})

/* ── 五、前端：流式提取与旧结构投影 ───────────────────────────── */

test('流式提取只放出已闭合的 actionPlan 条目，字符串里的括号不干扰', () => {
  const raw =
    '{"answerToQuestion":"x","actionPlan":[{"action":"先写下 {三个} 因素","reason":"隐士逆位 }",' +
    '"evidence":[{"cardId":"major-09","position":"过去","orientation":"reversed","signal":"推迟 ]"}]},' +
    '{"action":"更新简历","reason":"宝剑八","timeframe":"两周"},{"action":"还没写完'
  assert.deepEqual(extractPartialActions(raw), [
    { action: '先写下 {三个} 因素', reason: '隐士逆位 }' },
    { action: '更新简历', reason: '宝剑八', timeframe: '两周' },
  ])
  assert.deepEqual(extractPartialActions('{"answerToQuestion":"x"'), [])
})

test('V1 投影：actions 优先取行动建议，旧解读回落到反思问题', () => {
  const spread = getSpread('past-present-future')!
  const reading = assembled(JSON.parse(OUTPUT_EXAMPLE), 'deep')
  const legacy = toLegacyReading(reading, EXAMPLE_REQUEST, spread)
  assert.deepEqual(legacy.actions, reading.actionPlan!.map((a) => a.action))
  assert.ok(legacy.watchOut.includes(reading.watchFor![0]!))

  const old = { ...reading, actionPlan: undefined, watchFor: undefined, reflectionQuestions: ['旧的问题？'] }
  assert.deepEqual(toLegacyReading(old, EXAMPLE_REQUEST, spread).actions, ['旧的问题？'])
})
