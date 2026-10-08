import { applyQaReview } from '../scripts/visual-review-qa.ts'
/**
 * Tarot Visual Semantic Layer V1 的离线测试 —— 不调用任何模型、零 token。
 *
 * 【这一层最危险的失败不是「缺数据」，是「数据看起来有但其实是编的」】
 * 缺一条记录，那张牌退回 V2.5，用户察觉不到。
 * 而一条编造的视觉证据会让模型言之凿凿地描述一幅不存在的画，
 * 并且因为它带着「证据」的身份，比模型自己空泛发挥更难被发现。
 * 所以下面 D / E 两组（canonical 不变性、跨牌组差异性）比 coverage 更重要。
 *
 * 真实图片与描述是否对得上，程序判断不了 —— 见 `npm run visual:qa` 的人工抽查报告。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ReadingRequest } from '../src/types/reading.ts'
import { VISUAL_SEMANTICS_VERSION, freshnessOf, toRuntimeRecord } from '../src/types/visualSemantics.ts'
import { VISION_PROMPT_VERSION, visionPromptHash } from '../server/prompts/deckVisualAnalysisPrompt.ts'

const CURRENT_PROMPT_HASH = visionPromptHash()
import {
  EVIDENCE_LIMITS,
  allVisualSemantics,
  getDeckVisualSemantics,
  projectVisualEvidence,
} from '../src/data/deckVisualSemantics/index.ts'
import { getGeneratedVisualSemantics } from '../src/data/deckVisualSemantics/index.ts'
import { loadAllFullVisualSemantics } from '../server/visual/fullVisualSemantics.ts'

/** 完整记录 —— QA 与漂移检查用。它不进前端包（见 full.ts 的说明） */
const FULL = loadAllFullVisualSemantics()
const allFull = () => Object.values(FULL).flatMap((cards) => Object.values(cards))
import { rebuildContext } from '../server/context/rebuild.ts'
import { buildMessages, buildSystemPrompt, buildUserPrompt } from '../server/prompts/tarotReadingPromptV2.ts'
import { validateVisualSemantics } from '../server/validation/visualSemanticsSchema.ts'

const lock = JSON.parse(readFileSync(new URL('../artwork.lock.json', import.meta.url), 'utf8')) as {
  files: Record<string, { sha256: string }>
}

/** 有独立原画、因此必须有视觉语义的牌 —— 从 artwork.lock.json 推导，不硬编码 390 */
const eligible = Object.keys(lock.files)
  .map((k) => /^([^/]+)\/cards\/([^/]+)\.webp$/.exec(k))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ deckId: m[1]!, cardId: m[2]!, key: `${m[1]}/cards/${m[2]}.webp` }))

const baseRequest = (extra: Partial<ReadingRequest> = {}): ReadingRequest => ({
  sessionId: 'visual_test',
  question: '我还应该继续主动联系他吗？',
  mode: 'question',
  theme: null,
  spreadId: 'situation-obstacle-advice',
  readingMode: 'standard',
  cards: [
    { positionId: 'situation', cardId: 'cups-08', orientation: 'upright' },
    { positionId: 'obstacle', cardId: 'cups-02', orientation: 'reversed' },
    { positionId: 'advice', cardId: 'major-09', orientation: 'upright' },
  ],
  ...extra,
})

/* ── A. Coverage ─────────────────────────────────────────────── */

test('A · 每一张有独立原画的牌都有视觉语义', () => {
  const missing = eligible.filter((c) => getDeckVisualSemantics(c.deckId, c.cardId) === null)
  assert.deepEqual(
    missing.map((m) => `${m.deckId}/${m.cardId}`),
    [],
    `缺少视觉语义的牌（跑 npm run visual:semantics -- --all 补）`,
  )
  assert.equal(allVisualSemantics().length, eligible.length)
})

test('A · 没有原画的牌组查不到任何东西（不能凭空出现）', () => {
  for (const deckId of ['ethereal', 'elysian', 'opaline', 'wonderland', 'classic', '不存在的牌组']) {
    assert.equal(getDeckVisualSemantics(deckId, 'major-00'), null, `${deckId} 不该有视觉语义`)
  }
  assert.equal(getDeckVisualSemantics(null, 'major-00'), null)
  assert.equal(getDeckVisualSemantics('legacy-moonlight', '不存在的牌'), null)
})

/* ── B. Source freshness ─────────────────────────────────────── */

test('B · 每条记录的 assetHash 与当前 artwork.lock.json 一致（换图即 stale）', () => {
  const stale: string[] = []
  for (const c of eligible) {
    const entry = getDeckVisualSemantics(c.deckId, c.cardId)
    if (!entry) continue
    if (entry.assetHash !== lock.files[c.key]!.sha256) stale.push(`${c.deckId}/${c.cardId}`)
  }
  assert.deepEqual(stale, [], '这些牌的原画已经换过，视觉语义过期了 —— 重跑 visual:semantics')
})

test('B · 全库同一 Vision Prompt 版本与指纹（387 旧 + 3 新那种混装不能再出现）', () => {
  const hashes = new Set(allFull().map((e) => e.generator?.promptHash))
  const versions = new Set(allFull().map((e) => e.generator?.promptVersion))
  const models = new Set(allFull().map((e) => e.meta.model))
  assert.equal(hashes.size, 1, `全库出现了 ${hashes.size} 个不同的 promptHash`)
  assert.equal([...hashes][0], CURRENT_PROMPT_HASH, 'promptHash 不是当前 Prompt 的指纹 —— 跑 visual:semantics -- --all')
  assert.equal(versions.size, 1, `全库出现了 ${versions.size} 个 promptVersion`)
  assert.equal([...versions][0], VISION_PROMPT_VERSION)
  assert.equal(models.size, 1, `全库混用了 ${models.size} 个视觉模型：${[...models].join(', ')}`)
})

test('B · 三项齐验的 freshness：图 / Prompt / schema 任意一项不同都算 stale', () => {
  /* 真实数据全部新鲜 */
  const stale: string[] = []
  for (const c of eligible) {
    const state = freshnessOf(FULL[c.deckId]?.[c.cardId], {
      assetHash: lock.files[c.key]!.sha256,
      promptHash: CURRENT_PROMPT_HASH,
    })
    if (state !== 'fresh') stale.push(`${c.deckId}/${c.cardId}=${state}`)
  }
  assert.deepEqual(stale, [], '这些条目已过期 —— 跑 npm run visual:semantics -- --all')

  /* 三条路径各自都要真的能判出 stale，否则上面那条是空断言 */
  const one = FULL['legacy-shadow']!['cups-08']!
  const now = { assetHash: one.source.assetHash, promptHash: CURRENT_PROMPT_HASH }
  assert.equal(freshnessOf(one, now), 'fresh')
  assert.equal(freshnessOf(one, { ...now, assetHash: 'z'.repeat(64) }), 'stale-asset')
  assert.equal(freshnessOf(one, { ...now, promptHash: 'z'.repeat(64) }), 'stale-prompt')
  assert.equal(freshnessOf({ ...one, version: 999 as never }, now), 'stale-schema')
  assert.equal(
    freshnessOf({ ...one, generator: { ...one.generator, schemaVersion: 999 } }, now),
    'stale-schema',
  )
  /* 版本追踪上线之前的记录：没有 generator 块，不许被当成当前版本 */
  const { generator: _dropped, ...untracked } = one
  assert.equal(freshnessOf(untracked as never, now), 'stale-untracked')
  assert.equal(freshnessOf(undefined, now), 'missing')
})

test('B · Vision Prompt 指纹是确定性的，且真的随 Prompt 内容变化', () => {
  assert.equal(visionPromptHash(), visionPromptHash(), 'hash 必须可复现')
  assert.match(visionPromptHash(), /^[0-9a-f]{64}$/, 'sha256 十六进制')
})

test('B · 完整记录的 assetPath 指向自己那副牌组自己那张牌', () => {
  for (const e of allFull()) {
    assert.equal(e.source.assetPath, `public/assets/decks/${e.deckId}/cards/${e.cardId}.webp`)
    assert.equal(e.version, VISUAL_SEMANTICS_VERSION)
    assert.equal(e.generator.schemaVersion, VISUAL_SEMANTICS_VERSION)
  }
})

test('B · runtime/ 投影与完整记录严格一致（派生产物不会悄悄过期）', () => {
  /* runtime/ 才是进前端包的那份。改了投影规则却忘了重导，
     表现是「视觉证据悄悄少了几条」—— 没有这条断言就看不出来。 */
  const drifted: string[] = []
  for (const [deckId, cards] of Object.entries(FULL)) {
    for (const [cardId, full] of Object.entries(cards)) {
      /* 比的是**未合并的**生成记录 —— 人工修正让合并结果不同是正常且必须的，
         拿合并结果来比会把 override 误报成产物过期 */
      const rt = getGeneratedVisualSemantics(deckId, cardId)
      if (!rt) {
        drifted.push(`${deckId}/${cardId} 缺 runtime 记录`)
        continue
      }
      const expected = toRuntimeRecord(full)
      if (JSON.stringify(rt) !== JSON.stringify(expected)) drifted.push(`${deckId}/${cardId} 内容不一致`)
    }
  }
  assert.deepEqual(drifted, [], '重跑 npm run visual:semantics -- --all 重新导出 runtime/')
  assert.equal(allVisualSemantics().length, allFull().length)
})

/* ── C. Card identity ────────────────────────────────────────── */

test('C · 记录的 deckId / cardId 与它在数据集中的位置一致', () => {
  for (const c of eligible) {
    const full = FULL[c.deckId]?.[c.cardId]
    if (!full) continue
    assert.equal(full.deckId, c.deckId)
    assert.equal(full.cardId, c.cardId)
    assert.equal(getDeckVisualSemantics(c.deckId, c.cardId)?.cardId, c.cardId)
  }
})

test('C · runtime 投影里没有任何不该进前端包的字段', () => {
  const forbidden = ['palette', 'lighting', 'composition', 'figures', 'foreground', 'background', 'emotionalTone', 'confidence', 'meta', 'softenedAspects', 'assetPath', 'model', 'generator', 'promptHash', 'promptVersion']
  const sample = JSON.stringify(getDeckVisualSemantics('legacy-shadow', 'cups-08'))
  for (const f of forbidden) assert.ok(!sample.includes(`"${f}"`), `runtime 投影里泄漏了 ${f}`)
})

/* ── D. Canonical invariance —— 本轮最核心的架构不变量 ─────────── */

test('D · 同一张牌跨全部牌组：canonical 牌义逐字节不变，只有视觉证据不同', () => {
  const decks = ['legacy-moonlight', 'legacy-classic', 'legacy-forest', 'legacy-celestial', 'legacy-shadow']
  const contexts = decks.map((deckId) => rebuildContext(baseRequest({ deckId })))
  const ref = contexts[0]!

  for (const ctx of contexts.slice(1)) {
    for (const [i, card] of ctx.cards.entries()) {
      const r = ref.cards[i]!
      /* Meaning invariant */
      assert.equal(card.cardId, r.cardId, 'cardId 变了')
      assert.equal(card.cardName, r.cardName, '牌名变了')
      assert.equal(card.displayName, r.displayName)
      assert.equal(card.orientation, r.orientation, '朝向变了')
      assert.equal(card.position.id, r.position.id, '牌位变了')
      assert.deepEqual(card.baseMeaning, r.baseMeaning, 'baseMeaning 变了')
      assert.deepEqual(card.domainMeaning, r.domainMeaning, 'domainMeaning 变了')
      assert.deepEqual(card.keywords, r.keywords)
      assert.deepEqual(card.symbols, r.symbols)
      assert.equal(card.arcana, r.arcana)
      assert.equal(card.element, r.element)
    }
    /* 统计也不能因为牌组变化 */
    assert.deepEqual(ctx.stats, ref.stats)
  }

  /* Visual variant：至少有一张牌的视觉证据在牌组之间确实不同 */
  const scenes = contexts.map((c) => c.cards[0]!.deckVisualEvidence?.scene)
  assert.equal(new Set(scenes).size, decks.length, '五副牌的同一张牌 scene 应该各不相同')
})

test('D · 去掉 deckId 之后，Prompt 与改造前逐字一致（视觉层是纯增量）', () => {
  const withoutDeck = buildUserPrompt(rebuildContext(baseRequest()))
  assert.ok(!withoutDeck.includes('这副牌组把这张牌画成'), '没有牌组时不该出现视觉段落')
  assert.ok(!/暂无视觉|没有视觉|no visual/i.test(withoutDeck), '不该输出「没有视觉信息」这种占位')

  /* 没有原画的牌组同样不出现视觉段落 —— 而且与完全不传 deckId 的结果逐字相同 */
  const emptyDeck = buildUserPrompt(rebuildContext(baseRequest({ deckId: 'elysian' })))
  assert.equal(emptyDeck, withoutDeck)
})

/* ── E. Visual distinctiveness ───────────────────────────────── */

test('E · 同一张牌在不同牌组下的可见证据不能雷同（否则说明模型在背 Rider-Waite）', () => {
  const decks = ['legacy-moonlight', 'legacy-classic', 'legacy-forest', 'legacy-celestial', 'legacy-shadow']
  const sampleCards = ['major-00', 'major-09', 'major-15', 'major-18', 'cups-08']
  for (const cardId of sampleCards) {
    const entries = decks
      .map((d) => FULL[d]?.[cardId])
      .filter((e): e is NonNullable<typeof e> => e !== undefined)
    if (entries.length < 2) continue
    const scenes = new Set(entries.map((e) => e.scene.toLowerCase()))
    assert.equal(scenes.size, entries.length, `${cardId} 的 scene 在牌组之间出现了重复`)
    /* keyObjects 完全相同也是背诵的信号 */
    const objectSets = new Set(entries.map((e) => [...e.keyObjects].sort().join('|').toLowerCase()))
    assert.equal(objectSets.size, entries.length, `${cardId} 的 keyObjects 在牌组之间完全一致`)
  }
})

test('E · 全数据集：scene 整体重复率极低', () => {
  const all = allFull()
  const scenes = new Set(all.map((e) => e.scene.trim().toLowerCase()))
  /* 完全允许偶发撞车（同一副牌里两张构图相近），但成规模重复 = 背诵 */
  const dupRate = 1 - scenes.size / all.length
  assert.ok(dupRate < 0.02, `scene 重复率 ${(dupRate * 100).toFixed(1)}% 过高，疑似模型在复述模板`)
})

/* ── F. 校验器本身 ───────────────────────────────────────────── */

const identity = {
  deckId: 'legacy-shadow' as const,
  cardId: 'cups-08',
  assetPath: 'public/assets/decks/legacy-shadow/cards/cups-08.webp',
  assetHash: 'x'.repeat(64),
  promptVersion: VISION_PROMPT_VERSION,
  promptHash: CURRENT_PROMPT_HASH,
  model: 'test',
  latencyMs: 1,
}

const goodPayload = {
  scene: 'A figure walks away from a cabinet of cups toward a stairway.',
  figures: [{ role: 'departing figure', position: 'centre', posture: 'walking, back turned' }],
  keyObjects: ['wooden cabinet', 'eight goblets', 'stone steps'],
  spatialRelations: ['the stairway rises behind the figure'],
  foreground: ['cobblestones'],
  background: ['rock walls'],
  lighting: 'dim with a pale glow at the far end',
  palette: ['near-black', 'charcoal'],
  composition: { focalPoint: "the figure's back", direction: 'lower left to upper right', openness: 'tunnelled', balance: 'asymmetric' },
  visualTensions: ['hand still on the door while the body moves away'],
  deckSpecificMotifs: ['goblets stored in a cabinet'],
  emotionalTone: ['sombre'],
  semanticBridge: {
    emphasizedAspects: ['a considered departure'],
    softenedAspects: ['the emotional cost'],
    tensionWithCanonical: ['the cups are indoors rather than on an open shore'],
  },
  confidence: { overall: 'high', uncertainDetails: ['whether the figure is barefoot'] },
}

test('F · 合法记录通过；tensionWithCanonical 为空时字段整个缺席', () => {
  const ok = validateVisualSemantics(goodPayload, identity)
  assert.equal(ok.ok, true, ok.problems.join('; '))
  assert.equal(ok.entry!.semanticBridge.tensionWithCanonical?.length, 1)

  const noTension = validateVisualSemantics(
    { ...goodPayload, semanticBridge: { ...goodPayload.semanticBridge, tensionWithCanonical: [] } },
    identity,
  )
  assert.equal('tensionWithCanonical' in noTension.entry!.semanticBridge, false)
})

test('F · 在写牌义 / 做预测 / 断言吉凶的记录被拒绝', () => {
  const rewritesMeaning = validateVisualSemantics(
    { ...goodPayload, scene: 'This card represents danger and loss.' },
    identity,
  )
  assert.equal(rewritesMeaning.ok, false)
  assert.equal(rewritesMeaning.entry, null)

  /* 明暗 → 结论的推理，任何字段都不许 */
  assert.equal(
    validateVisualSemantics({ ...goodPayload, scene: 'The dark colours therefore mean a bad outcome.' }, identity).ok,
    false,
  )
  /* 吉凶断言，任何字段都不许（含只留在数据集里的 emotionalTone） */
  assert.equal(validateVisualSemantics({ ...goodPayload, emotionalTone: ['doomed'] }, identity).ok, false)
  assert.equal(validateVisualSemantics({ ...goodPayload, visualTensions: ['an unlucky sky'] }, identity).ok, false)

  const advises = validateVisualSemantics(
    {
      ...goodPayload,
      semanticBridge: { ...goodPayload.semanticBridge, emphasizedAspects: ['you should walk away now'] },
    },
    identity,
  )
  assert.equal(advises.ok, false)
})

test('F · 预兆词按「这个字段会不会进 Prompt」区别对待', () => {
  /* emotionalTone 只活在数据集里，projectVisualEvidence 不会送它进 Prompt，
     所以它可以用 "ominous" 形容画面气氛（实测 legacy-shadow 高塔就是这样）。 */
  const inTone = validateVisualSemantics({ ...goodPayload, emotionalTone: ['ominous'] }, identity)
  assert.equal(inTone.ok, true, inTone.problems.join('; '))
  const projected = projectVisualEvidence(toRuntimeRecord(inTone.entry!))
  assert.equal(JSON.stringify(projected).includes('ominous'), false, '预兆词不该进 Prompt 投影')

  /* 但会进 Prompt 的字段不行 —— 那等于把「暗=不好」直接递给解读模型 */
  for (const bad of [
    { ...goodPayload, scene: 'An ominous stairway rises into the dark.' },
    { ...goodPayload, visualTensions: ['the foreboding gap between figure and cups'] },
    { ...goodPayload, deckSpecificMotifs: ['ominous cabinetry'] },
    {
      ...goodPayload,
      semanticBridge: { ...goodPayload.semanticBridge, softenedAspects: ['the ominous tone of the departure'] },
    },
  ]) {
    assert.equal(validateVisualSemantics(bad, identity).ok, false, `应该被拒：${JSON.stringify(bad).slice(0, 80)}`)
  }
})

test('F · 没有可见证据 / 没有语义桥的记录被拒绝，不会生成空壳', () => {
  assert.equal(validateVisualSemantics({ ...goodPayload, keyObjects: [], figures: [] }, identity).ok, false)
  assert.equal(
    validateVisualSemantics({ ...goodPayload, semanticBridge: { emphasizedAspects: [], softenedAspects: [] } }, identity).ok,
    false,
  )
  for (const bad of [null, 'x', 42, {}, { scene: '' }]) {
    assert.equal(validateVisualSemantics(bad, identity).ok, false)
  }
})

/* ── G. Runtime fallback ─────────────────────────────────────── */

test('G · 视觉语义缺席时解读链路照常完成，只是没有视觉段落', () => {
  /* 模拟「这张牌的数据没生成出来」：用一个没有原画的牌组 */
  const ctx = rebuildContext(baseRequest({ deckId: 'wonderland' }))
  assert.equal(ctx.cards.every((c) => c.deckVisualEvidence === undefined), true)
  const prompt = buildUserPrompt(ctx)
  assert.ok(prompt.includes('## 二、牌阵'), 'Prompt 仍然完整')
  assert.ok(!prompt.includes('这副牌组把这张牌画成'))

  /* 部分缺席也不能整段崩掉：手工构造一张有、两张没有 */
  const partial = rebuildContext(baseRequest({ deckId: 'legacy-shadow' }))
  delete partial.cards[1]!.deckVisualEvidence
  delete partial.cards[2]!.deckVisualEvidence
  const partialPrompt = buildUserPrompt(partial)
  assert.equal((partialPrompt.match(/这副牌组把这张牌画成/g) ?? []).length, 1)
})

test('G · projectVisualEvidence 对 null 与空记录返回 null', () => {
  assert.equal(projectVisualEvidence(null), null)
  const empty = toRuntimeRecord(validateVisualSemantics(goodPayload, identity).entry!)
  assert.equal(projectVisualEvidence({ ...empty, scene: '', keyObjects: [] }), null)
})

/* ── H. Prompt size ──────────────────────────────────────────── */

test('H · standard 比 deep 更省；视觉段落的增量在预算内', () => {
  /* 【量的是整份 Prompt，不是只量 User Prompt】
     System Prompt 约 18.4K 字符且恒定，是 token 成本与注意力的主体。
     只看 User Prompt 会把一个 +11% 的真实增量放大成 +75%，
     据此去砍视觉证据，砍掉的是信息而不是开销。 */
  const total = (r: ReadingRequest) =>
    buildMessages(rebuildContext(r)).reduce((n, m) => n + m.content.length, 0)
  const off = total(baseRequest())
  const std = total(baseRequest({ deckId: 'legacy-shadow' }))
  const deep = total(baseRequest({ deckId: 'legacy-shadow', readingMode: 'deep' }))

  assert.ok(std > off, '视觉段落应该确实出现了')
  assert.ok(deep >= std, 'deep 的视觉信息不应该少于 standard')

  const growthStd = (std - off) / off
  const growthDeep = (deep - off) / off
  assert.ok(growthStd < 0.2, `standard 整份 Prompt 增量 ${(growthStd * 100).toFixed(1)}% 过大`)
  assert.ok(growthDeep < 0.3, `deep 整份 Prompt 增量 ${(growthDeep * 100).toFixed(1)}% 过大`)

  /* 单张牌的视觉段落也要有上限 —— 它是补充材料，不是主体 */
  const oneCard = buildUserPrompt(rebuildContext(baseRequest({ deckId: 'legacy-shadow' })))
    .split('### 第 1 /')[1]!
    .split('### 第 2 /')[0]!
  const visualBlock = oneCard.slice(oneCard.indexOf('这副牌组把这张牌画成'))
  assert.ok(visualBlock.length < 900, `单张牌视觉段落 ${visualBlock.length} 字过长`)

  /* 条数上限确实生效 */
  const card = rebuildContext(baseRequest({ deckId: 'legacy-shadow' })).cards[0]!
  const v = card.deckVisualEvidence!
  assert.ok(v.keyObjects.length <= EVIDENCE_LIMITS.standard.keyObjects)
  assert.ok(v.spatialRelations.length <= EVIDENCE_LIMITS.standard.spatialRelations)
  assert.ok(v.visualTensions.length <= EVIDENCE_LIMITS.standard.visualTensions)
  assert.ok(v.emphasizedAspects.length <= EVIDENCE_LIMITS.standard.emphasizedAspects)
  assert.ok(v.deckSpecificMotifs.length <= EVIDENCE_LIMITS.standard.deckSpecificMotifs)
})

test('H · Prompt 里不出现 assetHash / model / 置信度这类 QA 字段', () => {
  const prompt = buildUserPrompt(rebuildContext(baseRequest({ deckId: 'legacy-shadow' })))
  for (const leak of ['assetHash', 'assetPath', 'deepseek-flash', 'uncertainDetails', 'latencyMs', 'confidence']) {
    assert.ok(!prompt.includes(leak), `Prompt 里泄漏了 ${leak}`)
  }
  /* deckId 本身仍然不进 Prompt —— 它只是查表键 */
  assert.ok(!prompt.includes('legacy-shadow'), 'deckId 不该出现在 Prompt 里')
})

/* ── I. System Prompt 的使用规则 ─────────────────────────────── */

test('I · Vision Prompt 写明了先验泄漏的三类硬规则', async () => {
  const { VISUAL_ANALYSIS_SYSTEM_PROMPT } = await import('../server/prompts/deckVisualAnalysisPrompt.ts')
  for (const needle of [
    'Card rank is not an object count',
    'High-prior elements',
    'blindfold',
    'the count of cups / wands / swords / pentacles',
    'Never a fourth outcome',
    'do not hedge a count you',
    'from the shape you can see',
  ]) {
    assert.ok(VISUAL_ANALYSIS_SYSTEM_PROMPT.includes(needle), `Vision Prompt 缺少：${needle}`)
  }
})

test('I · System Prompt 写明了视觉证据的边界', () => {
  const prompt = buildSystemPrompt('standard', 'zh')
  for (const needle of [
    '## 这副牌组的画面证据（有时才会出现）',
    'canonical 牌义**完全相同**',
    '覆盖或替换 canonical 牌义',
    '单独作为对现实的预测',
    '暗≠危险，亮≠希望',
    '编造材料里没有的画面细节',
    '不要写「我看到这张图上……」',
    '不要因为多了画面证据就把解读写长',
  ]) {
    assert.ok(prompt.includes(needle), `缺少：${needle}`)
  }
})

/* ══════════════════════════════════════════════════════════════
 * J. 人工复核与 Override 层
 *
 * 这一层修的是一类**重跑修不好**的错误：模型稳定地把牌名里的数字
 * 当成画面里的物件数量（legacy-celestial/wands-06 连跑 4 次 3 次写 five，
 * 实际只有 4 支）。所以它必须同时成立两件看似矛盾的事：
 *   1. 运行时拿到的是修正后的值；
 *   2. 生成数据一个字节都没被改 —— provenance 还在。
 * ══════════════════════════════════════════════════════════ */

const { allVisualReviews, getVisualReviewStatus } = await import(
  '../src/data/deckVisualSemantics/index.ts'
)
const { applyVisualReview } = await import('../src/types/visualSemantics.ts')

test('J-A · override 覆盖生成值：replace / patch / uncertainFields 各自生效', () => {
  const base = getGeneratedVisualSemantics('legacy-shadow', 'cups-08')!

  /* replace：逐字替换，作用于 scene 与全部列表条目 */
  const replaced = applyVisualReview(base, {
    reviewStatus: 'corrected',
    replace: [{ find: 'eight', with: 'seven' }],
  })
  assert.ok(!/\beight\b/.test(JSON.stringify(replaced)), 'replace 没有覆盖到全部字段')

  /* patch：整字段覆盖，其余字段不动 */
  const patched = applyVisualReview(base, {
    reviewStatus: 'corrected',
    patch: { keyObjects: ['four upright wands'] },
  })
  assert.deepEqual(patched.keyObjects, ['four upright wands'])
  assert.equal(patched.scene, base.scene, 'patch 不该影响没列出的字段')
  assert.deepEqual(patched.spatialRelations, base.spatialRelations)

  /* uncertainFields：整字段清空 */
  const cleared = applyVisualReview(base, {
    reviewStatus: 'uncertain',
    uncertainFields: ['visualTensions'],
  })
  assert.deepEqual(cleared.visualTensions, [])
  assert.deepEqual(cleared.keyObjects, base.keyObjects)

  /* 同一字段既 patch 又标 uncertain 时，以「不可靠」为准 */
  const both = applyVisualReview(base, {
    reviewStatus: 'uncertain',
    patch: { keyObjects: ['a', 'b'] },
    uncertainFields: ['keyObjects'],
  })
  assert.deepEqual(both.keyObjects, [], '标了 uncertain 的字段不该因为有 patch 就重新出现')

  /* 手写 JSON 不可信：类型不对、超长都要被清掉 */
  const dirty = applyVisualReview(base, {
    reviewStatus: 'corrected',
    patch: { keyObjects: [42 as never, '  ok  ', 'x'.repeat(400)] },
  })
  assert.equal(dirty.keyObjects.length, 2)
  assert.equal(dirty.keyObjects[0], 'ok')
  assert.ok(dirty.keyObjects[1]!.length <= 240)
})

test('J-B · 没有 override 的牌完全不受影响', () => {
  const reviews = allVisualReviews()
  let checked = 0
  for (const c of eligible) {
    if (reviews[`${c.deckId}/${c.cardId}`]) continue
    const generated = getGeneratedVisualSemantics(c.deckId, c.cardId)
    const merged = getDeckVisualSemantics(c.deckId, c.cardId)
    assert.equal(JSON.stringify(merged), JSON.stringify(generated), `${c.deckId}/${c.cardId} 被无端改动了`)
    checked += 1
  }
  assert.equal(checked, eligible.filter((c) => !reviews[`${c.deckId}/${c.cardId}`]).length, '必须覆盖全部未复核牌')
  assert.ok(checked > 0, '必须保留未复核样本')
  assert.equal(applyVisualReview(getGeneratedVisualSemantics('legacy-forest', 'major-00')!, undefined).scene.length > 0, true)
})

test('J-C · 生成数据集本身没有被人工修改（provenance 完好）', () => {
  /* 完整记录里仍然是模型原话 —— 修正只活在 review 层 */
  const full = FULL['legacy-celestial']!['wands-06']!
  assert.ok(/five upright wands/.test(JSON.stringify(full)), '生成的完整记录被手改过了')
  /* runtime 投影是 toRuntimeRecord 的纯产物，同样不含人工修正 */
  const generated = getGeneratedVisualSemantics('legacy-celestial', 'wands-06')!
  assert.ok(/five upright wands/.test(JSON.stringify(generated)))
  assert.equal(JSON.stringify(generated), JSON.stringify(toRuntimeRecord(full)))
})

test('J-D · legacy-celestial/wands-06 运行时是 four，不是 five', () => {
  const merged = getDeckVisualSemantics('legacy-celestial', 'wands-06')!
  const text = JSON.stringify(merged)
  assert.ok(!/\bfive\b/i.test(text), `合并后仍然出现 five：${text.slice(0, 200)}`)
  assert.ok(/\bfour upright wands\b/i.test(text), '没有出现修正后的 four upright wands')

  /* 真正要紧的是**进 Reading Prompt 的那一份** */
  const evidence = projectVisualEvidence(merged, 'deep')
  const ev = JSON.stringify(evidence)
  assert.ok(!/\bfive\b/i.test(ev), `Reading 证据里仍然出现 five：${ev}`)
  assert.ok(/\bfour\b/i.test(ev))
  assert.equal(getVisualReviewStatus('legacy-celestial', 'wands-06'), 'corrected')
})

test('J-E/F · reviewStatus / reason / reviewer 一个都不进 Reading Prompt', () => {
  const ctx = rebuildContext(baseRequest({ deckId: 'legacy-celestial' }))
  const prompt = buildUserPrompt(ctx)
  /* 只查复核层特有的 token。
     不能查 'reason' —— 那是 V2.5 自己 JSON 输出里的字段名，出现在 Prompt 里是正当的。 */
  for (const leak of ['reviewStatus', 'reviewedAt', 'reviewer', 'uncertainFields', 'unreviewed']) {
    assert.ok(!prompt.includes(leak), `Prompt 里泄漏了 ${leak}`)
  }
  /* 连 review 文件里那段中文理由的原文也不许出现 */
  for (const entry of Object.values(allVisualReviews())) {
    if (!entry.reason) continue
    assert.ok(!prompt.includes(entry.reason.slice(0, 20)), 'Prompt 里泄漏了人工复核的理由原文')
  }
  /* 投影层同样干净 —— 即使这张牌有 override */
  const ev = JSON.stringify(projectVisualEvidence(getDeckVisualSemantics('legacy-celestial', 'wands-06')))
  for (const leak of ['reviewStatus', 'reviewer', 'reviewedAt', 'reason', 'assetHash', 'cardId']) {
    assert.ok(!ev.includes(leak), `投影里泄漏了 ${leak}`)
  }
})

test('J-G · 不可靠的视觉字段可以被排除，而且是 field 级不是整条丢弃', () => {
  const base = getGeneratedVisualSemantics('legacy-shadow', 'cups-08')!
  const partial = applyVisualReview(base, {
    reviewStatus: 'uncertain',
    uncertainFields: ['keyObjects', 'visualTensions'],
  })
  const ev = projectVisualEvidence(partial)
  assert.ok(ev !== null, 'scene 还在，就不该整条丢掉')
  assert.deepEqual(ev!.keyObjects, [])
  assert.deepEqual(ev!.visualTensions, [])
  assert.ok(ev!.spatialRelations.length > 0, '没被标记的字段必须原样保留')
  assert.ok(ev!.scene.length > 0)

  /* scene 与 keyObjects 同时被判不可靠时，这条记录不值得占 Prompt 位置 */
  const gutted = applyVisualReview(base, {
    reviewStatus: 'uncertain',
    uncertainFields: ['scene', 'keyObjects'],
  })
  assert.equal(projectVisualEvidence(gutted), null)
})

test('J-G · 模型自陈数不清的计数条目在生成侧就被滤掉（medium 不等于整条排除）', () => {
  const project = toRuntimeRecord
  /* 模型说数不清、却写了数字 → 丢掉那一条 */
  const flagged = project({
    ...FULL['legacy-shadow']!['cups-08']!,
    keyObjects: ['seven golden goblets on a shelf', 'a wooden door'],
    spatialRelations: [],
    visualTensions: [],
    deckSpecificMotifs: [],
    confidence: { overall: 'medium', uncertainDetails: ['exact number of goblets on the shelf'] },
  })
  assert.deepEqual(flagged.keyObjects, ['a wooden door'], '自陈数不清的计数条目没有被滤掉')

  /* 同一个名词出现在多条里时无从判断指哪一条 —— 一条都不删 */
  const ambiguous = project({
    ...FULL['legacy-shadow']!['cups-08']!,
    keyObjects: ['seven golden goblets on a shelf', 'two goblets on the floor'],
    spatialRelations: [], visualTensions: [], deckSpecificMotifs: [],
    confidence: { overall: 'medium', uncertainDetails: ['exact number of goblets on the shelf'] },
  })
  assert.equal(ambiguous.keyObjects.length, 2, '拿不准指哪一条时不该删')

  /* 模型自己已经给出数字（「count of X is nine but…」）＝ 数出来了，只是有点糊 */
  const resolved = project({
    ...FULL['legacy-shadow']!['cups-08']!,
    keyObjects: ['nine swords on the wall'],
    spatialRelations: [], visualTensions: [], deckSpecificMotifs: [],
    confidence: { overall: 'medium', uncertainDetails: ['exact count of swords is nine but the lowest blades are obscured'] },
  })
  assert.deepEqual(resolved.keyObjects, ['nine swords on the wall'])

  /* medium 本身绝不等于「没有视觉证据」 */
  const mediums = allFull().filter((e) => e.confidence.overall === 'medium')
  const withEvidence = mediums.filter((e) => projectVisualEvidence(getDeckVisualSemantics(e.deckId, e.cardId)) !== null)
  assert.equal(withEvidence.length, mediums.length, 'medium 的牌不该因为置信度就失去视觉证据')
})

test('J-H · 人工修正不改变 canonical meaning', () => {
  const decks = ['legacy-moonlight', 'legacy-classic', 'legacy-forest', 'legacy-celestial', 'legacy-shadow']
  const contexts = decks.map((deckId) => rebuildContext(baseRequest({ deckId })))
  const ref = contexts[0]!
  for (const ctx of contexts.slice(1)) {
    for (const [i, card] of ctx.cards.entries()) {
      const r = ref.cards[i]!
      assert.equal(card.cardId, r.cardId)
      assert.deepEqual(card.baseMeaning, r.baseMeaning)
      assert.deepEqual(card.domainMeaning, r.domainMeaning)
      assert.deepEqual(card.keywords, r.keywords)
      assert.deepEqual(card.symbols, r.symbols)
      assert.equal(card.orientation, r.orientation)
      assert.equal(card.position.id, r.position.id)
    }
  }
})

test('J · review 文件里的每条 override 都仍然命中（失效规则不许静默存在）', () => {
  const dead: string[] = []
  for (const [k, entry] of Object.entries(allVisualReviews())) {
    const [deckId, cardId] = k.split('/') as [string, string]
    const generated = getGeneratedVisualSemantics(deckId, cardId)
    assert.ok(generated, `review 指向了不存在的牌：${k}`)
    const raw = JSON.stringify(generated)
    for (const r of entry.replace ?? []) if (!raw.includes(r.find)) dead.push(`${k}「${r.find}」`)
    const full = FULL[deckId]![cardId]!
    const qaChanged = JSON.stringify(applyQaReview(full, entry)) !== JSON.stringify(full)
    if (entry.reviewStatus !== 'pass' && !qaChanged) {
      assert.notEqual(JSON.stringify(getDeckVisualSemantics(deckId, cardId)), raw, `${k} 标了 ${entry.reviewStatus} 却什么都没改变`)
    }
  }
  assert.deepEqual(dead, [], '这些 replace 规则已经匹配不上生成数据了')
})

test('Multi-agent QA · 全部复核牌经合并、投影和 ReadingContext 保持修正与过滤', () => {
  const reviews = allVisualReviews()
  let affected = 0
  for (const [key, review] of Object.entries(reviews)) {
    if (!review.replace?.length && !review.patch && !review.uncertainFields?.length) continue
    const [deckId, cardId] = key.split('/') as [ReadingRequest['deckId'], string]
    const generated = getGeneratedVisualSemantics(deckId, cardId)!
    const merged = getDeckVisualSemantics(deckId, cardId)!
    assert.deepEqual(merged, applyVisualReview(generated, review), `${key}: runtime 合并不一致`)
    for (const field of review.uncertainFields ?? []) {
      assert.deepEqual(merged[field], field === 'scene' ? '' : [], `${key}/${field}: 未过滤`)
    }
    const evidence = projectVisualEvidence(merged, 'deep')
    const fillers = ['major-00', 'major-01', 'major-02'].filter((id) => id !== cardId).slice(0, 2)
    const request = baseRequest({ readingMode: 'deep', cards: [
      { positionId: 'situation', cardId, orientation: 'upright' },
      { positionId: 'obstacle', cardId: fillers[0]!, orientation: 'upright' },
      { positionId: 'advice', cardId: fillers[1]!, orientation: 'upright' },
    ] })
    const ctx = rebuildContext({ ...request, deckId })
    const canonical = rebuildContext(request)
    assert.deepEqual(ctx.cards[0]!.deckVisualEvidence ?? null, evidence, `${key}: ReadingContext 投影不一致`)
    const { deckVisualEvidence: ignored, ...meaning } = ctx.cards[0]!
    void ignored
    assert.deepEqual(meaning, canonical.cards[0], `${key}: canonical meaning 改变`)
    const prompt = buildUserPrompt(ctx)
    for (const metadata of ['reviewMethod', 'provenance', 'reviewer', 'independentFinding', 'uncertainFields', 'reviewStatus', 'reviewedAt']) {
      assert.ok(!JSON.stringify(evidence).includes(metadata), `${key}: 投影泄漏 ${metadata}`)
      assert.ok(!prompt.includes(metadata), `${key}: Prompt 泄漏 ${metadata}`)
    }
    if (review.reason) assert.ok(!prompt.includes(review.reason), `${key}: reason 泄漏`)
    affected++
  }
  assert.ok(affected > 50, '应覆盖本轮全部实际影响牌')
  const mixed = getDeckVisualSemantics('legacy-shadow', 'swords-02')!
  assert.equal(mixed.scene, '', '混合 items + fields 必须同时过滤 scene')
  assert.ok(!mixed.keyObjects.includes('large gibbous moon'))
  assert.ok(mixed.keyObjects.length > 0, '不得删除整卡')
  const geometry = getDeckVisualSemantics('legacy-celestial', 'wands-05')!
  assert.ok(geometry.keyObjects.some((x) => x.includes('separate from the glowing staff tips')))
  assert.ok(!geometry.emphasizedAspects.includes('several forces converging at once on one point'))
})

test('Human final · 七条人工裁决进入现有 review layer，错误事实不进入对应 Prompt', () => {
  const final = JSON.parse(readFileSync(new URL('../qa/visual-semantics/multi-agent-review/human-final-decisions.json', import.meta.url), 'utf8')) as {
    reviewId: string; deckId: ReadingRequest['deckId']; cardId: string; qaOverrides: Record<string, string>
  }[]
  assert.equal(final.length, 7)
  const forbidden: Record<string, RegExp> = {
    'review-001': /hooded|head covering/,
    'review-003': /\btable\b|\bstone\b/,
    'review-004': /loose ring|encircled|encircling enclosure|tight ring/,
    'review-005': /appears to be six/,
    'review-009': /four slender poles|four poles|two at left and two at right/,
    'review-010': /two seated, hooded passengers/,
    'review-207': /two kneeling, veiled figures/,
  }
  for (const h of final) {
    const key = `${h.deckId}/${h.cardId}`
    const review = allVisualReviews()[key] as NonNullable<ReturnType<typeof allVisualReviews>[string]> & { reviewMethod: string; qaOverrides: Record<string, string> }
    assert.equal(review.reviewStatus, 'corrected', key)
    assert.equal(review.reviewMethod, 'human-final', key)
    assert.deepEqual(review.qaOverrides, h.qaOverrides)
    const runtime = getDeckVisualSemantics(h.deckId, h.cardId)!
    for (const mode of ['standard', 'deep'] as const) {
      const evidence = projectVisualEvidence(runtime, mode)!
      assert.ok(!forbidden[h.reviewId]!.test(JSON.stringify(evidence)), `${key}: 旧事实进入 ${mode} 投影`)
      const fillers = ['major-00', 'major-01', 'major-02'].filter((id) => id !== h.cardId).slice(0, 2)
      const ctx = rebuildContext(baseRequest({ deckId: h.deckId, readingMode: mode, cards: [
        { positionId: 'situation', cardId: h.cardId, orientation: 'upright' },
        { positionId: 'obstacle', cardId: fillers[0]!, orientation: 'upright' },
        { positionId: 'advice', cardId: fillers[1]!, orientation: 'upright' },
      ] }))
      assert.deepEqual(ctx.cards[0]!.deckVisualEvidence, evidence)
      const prompt = buildUserPrompt(ctx)
      for (const metadata of ['human-final', 'qaOverrides', 'qaUncertainFields', 'humanFinalSource']) assert.ok(!prompt.includes(metadata), `${key}: metadata leak ${metadata}`)
      assert.ok(!prompt.includes(review.reason!), `${key}: human reason leaked`)
    }
  }
  assert.ok(getDeckVisualSemantics('legacy-shadow', 'cups-01')!.scene.includes('faceless'), '不删除无关 faceless')
  const cups = getDeckVisualSemantics('legacy-moonlight', 'cups-10')!
  assert.ok(cups.scene.includes('cloth spread on the grass'))
  assert.ok(cups.keyObjects.length > 0 && cups.spatialRelations.length > 0, '不因底部支撑不确定删除可靠事实')
  const countOnly = getDeckVisualSemantics('legacy-moonlight', 'swords-06')!
  assert.deepEqual(countOnly, getGeneratedVisualSemantics('legacy-moonlight', 'swords-06'), 'QA-only 不应新增 Runtime 文案')
  const five = final.find((h) => h.reviewId === 'review-005')!
  const qaFive = applyQaReview(FULL['legacy-moonlight']!['swords-06']!, allVisualReviews()['legacy-moonlight/swords-06']!)
  assert.match(qaFive.confidence.uncertainDetails[0]!, /five swords/)
  assert.doesNotMatch(qaFive.confidence.uncertainDetails[0]!, /six/)
  assert.match(five.qaOverrides['confidence.uncertainDetails.0']!, /five swords/)
  assert.doesNotMatch(five.qaOverrides['confidence.uncertainDetails.0']!, /six/)
  assert.match(FULL['legacy-moonlight']!['swords-06']!.confidence.uncertainDetails[0]!, /appears to be six/, '原生成记录保持不变')
  const relation = getDeckVisualSemantics('legacy-classic', 'swords-08')!.spatialRelations.join(' ')
  assert.match(relation, /five swords.*left.*four.*right/)
})
