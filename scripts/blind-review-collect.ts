/**
 * Multi-Agent Visual QA —— 第 4 步：一致性指标、汇总、人工队列。
 *
 *     npx tsx scripts/blind-review-collect.ts
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么一致性指标比 PASS 数更重要】
 * "95 张全 PASS" 这个结果本身说明不了任何事 —— 它既可能意味着数据很干净，
 * 也可能意味着 Reviewer 根本没认真看。真正有信息量的是**两个独立的人
 * 在同一张图上是否得出同一个数字**。举例（示意，非实测值）：
 *
 *   figureCount 一致率 95%  → 人物数这个字段可信
 *   moonPhase   一致率 52%  → 这个字段本身就不可靠，Runtime 应该少用它
 *
 * 【但指标本身必须先可信】这里的每个比较函数都被一条真实的误报修过：
 * 措辞不同被当成分歧、同类目多条被硬配、词袋重合度被包装成一致率。
 * 一个比较函数的 bug 会直接变成一条数据策略 —— 见下面各处的说明。
 *
 * 所以这里算的不是「对不对」（没人知道绝对真值），而是「这一类视觉事实
 * 在独立观察下稳不稳定」。不稳定的字段应该整类降权，而不是逐张纠结。
 * ══════════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const RUN = argValue('--run') ?? 'pilot'
const ALL = process.argv.includes('--all')
const BASE_DIR = resolve(ROOT, 'qa/visual-semantics/multi-agent-review')
const RUNS = ALL ? ['pilot', 'wave-1', 'wave-2', 'wave-3', 'wave-4', 'wave-5'] : [RUN]
const OUT_DIR = ALL ? BASE_DIR : resolve(BASE_DIR, RUN)
const sampleKeys = new Set([...readFileSync(resolve(ROOT, 'qa/visual-semantics/spot-check.md'), 'utf8').matchAll(/^## \d+\. ([\w-]+) \/ ([\w-]+)/gm)].map((m) => `${m[1]}/${m[2]}`))
const sampleIds = new Set<string>()

/* ── 输入 ─────────────────────────────────────────────────── */

interface ManifestRow {
  reviewId: string
  deckId: string
  cardId: string
  blindImage: string
  sourcePng: string
  modelConfidence: string
  uncertainDetails: string[]
  figureCount: number
  highRisk: boolean
  riskReasons: string[]
  isControl: boolean
}

interface ObjObs { type: string; count: number | null; countConfidence?: string; where?: string }
interface FigObs { position?: string; posture?: string; gaze?: string; heldObjects?: string[] }
interface Observation {
  reviewId: string
  reviewer?: string
  visibleFacts: {
    figureCount?: number | null
    figures?: FigObs[]
    objects?: ObjObs[]
    environment?: string[]
    lightSources?: string[]
    moonPhase?: string | null
    spatialRelations?: string[]
    foreground?: string[]
    background?: string[]
  }
  uncertainObservations?: string[]
  reviewConfidence?: string
}

interface Issue {
  field: string
  existing: string
  observed: string
  evidence: string
  confidence: string
}
interface Comparison {
  reviewId: string
  reviewer?: string
  verdict: 'pass' | 'corrected' | 'uncertain' | 'conflict'
  issues?: Issue[]
  suggestedPatch?: { replace?: { find: string; with: string }[] }
}

interface JudgeDecision {
  reviewId: string
  decision: 'AUTO_PASS' | 'AUTO_CORRECT' | 'HUMAN_REVIEW' | 'MARK_UNCERTAIN' | 'CORRECTED'
  confidence: string
  reason: string
  disputedFacts?: string[]
  askHumanToVerifyOnly?: string
  patch?: { replace?: { find: string; with: string }[] }
  overturnedReviewer?: boolean
}

function loadDir<T>(sub: string): T[] {
  const out: T[] = []
  for (const run of RUNS) {
  const dir = resolve(BASE_DIR, run, sub)
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const raw = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as T | T[]
    if (Array.isArray(raw)) out.push(...raw)
    else out.push(raw)
  }
  }
  return ALL ? out.filter((x) => sampleIds.has((x as { reviewId: string }).reviewId)) : out
}

const manifests = RUNS.map((run) => JSON.parse(readFileSync(resolve(BASE_DIR, run, 'manifest.json'), 'utf8')) as { mode: string; rows: ManifestRow[] })
const manifest = { mode: ALL ? 'all-95' : manifests[0]!.mode, rows: manifests.flatMap((m) => m.rows).filter((r) => !ALL || sampleKeys.has(`${r.deckId}/${r.cardId}`)) }
manifest.rows.forEach((r) => sampleIds.add(r.reviewId))
if (ALL && (manifest.rows.length !== 95 || sampleIds.size !== 95)) throw new Error('spot-check manifest coverage is not exactly 95')
const observations = loadDir<Observation>('blind-observations')
const comparisons = loadDir<Comparison>('comparisons')
const originalJudgements = loadDir<JudgeDecision>('judge')
const humanPath = resolve(BASE_DIR, 'human-final-decisions.json')
const humanFinal = existsSync(humanPath) ? JSON.parse(readFileSync(humanPath, 'utf8')) as JudgeDecision[] : []
const humanById = new Map(humanFinal.map((j) => [j.reviewId, j]))
const judgements = originalJudgements.map((j) => humanById.get(j.reviewId) ?? j)

const byId = new Map(manifest.rows.map((r) => [r.reviewId, r]))

/* ── 一致性（§30）───────────────────────────────────────────
 *
 * 只在**两个人都对同一项表过态**时才计入分母。
 * 一个人写了数、另一个人说数不清 —— 那不是分歧，那是一方弃权，
 * 计成「不一致」会把 null（正确的谨慎行为）惩罚成错误。
 */

function obsOf(reviewId: string): Observation[] {
  return observations.filter((o) => o.reviewId === reviewId)
}

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/** 物件类目归一：cup/chalice/goblet 是同一样东西 */
const SYNONYM: Record<string, string> = {
  chalice: 'cup', goblet: 'cup', cups: 'cup', chalices: 'cup',
  blade: 'sword', swords: 'sword', blades: 'sword',
  staff: 'wand', stave: 'wand', wands: 'wand', staves: 'wand', staffs: 'wand',
  coin: 'pentacle', disc: 'pentacle', disk: 'pentacle', pentacles: 'pentacle', coins: 'pentacle',
}
/**
 * 类目归一。
 *
 * 【为什么不能取末词】第一版取最后一个词，于是
 *   "garlanded vertical pole of an arbour" → arbour
 *   "tall garlanded pole / pillar"         → pillar
 * 同一样东西落进两个 key，两人明明都数了却根本没被比较 —— 指标静默漏项。
 * 改成在整串里找已知基础名词，找不到才退回末词。
 */
const BASE_NOUNS = [
  'cup', 'sword', 'wand', 'pentacle', 'pole', 'lantern', 'moon', 'sun', 'horse', 'boat',
  'tower', 'throne', 'door', 'crown', 'bird', 'tree', 'niche', 'star', 'building', 'staircase',
]
function canon(t: string): string {
  const k = norm(t).replace(/[^a-z ]/g, '')
  const words = k.split(' ')
  for (const w of words) {
    const s = SYNONYM[w] ?? w
    if (BASE_NOUNS.includes(s)) return s
  }
  const last = words[words.length - 1] ?? k
  return SYNONYM[last] ?? SYNONYM[k] ?? last
}

interface AgreementBucket { agree: number; total: number; details: string[] }
const mk = (): AgreementBucket => ({ agree: 0, total: 0, details: [] })

const figureAgree = mk()
const objectAgree = mk()
const moonAgree = mk()
const spatialOverlaps: number[] = []
const exactAgree = mk()
const heldAgree = mk()
const postureAgree = mk()
const gazeAgree = mk()
const ambiguousPairings: string[] = []

for (const row of manifest.rows) {
  const os = obsOf(row.reviewId)
  if (os.length < 2) continue
  const [a, b] = os as [Observation, Observation]

  // Structured labels only: a conservative reproducible proxy, not full semantic agreement.
  const af = a.visibleFacts.figures ?? []
  const bf = b.visibleFacts.figures ?? []
  const pair = af.length === 1 && bf.length === 1 ? [[af[0]!, bf[0]!]] : af.flatMap((f) => {
    const matches = bf.filter((g) => norm(f.position) && norm(f.position) === norm(g.position))
    return matches.length === 1 && af.filter((g) => norm(g.position) === norm(f.position)).length === 1 ? [[f, matches[0]!]] : []
  })
  const label = (text: string | undefined, patterns: [string, RegExp][]) => {
    const hits = patterns.filter(([, re]) => re.test(norm(text))).map(([name]) => name)
    return hits.length === 1 ? hits[0] : null
  }
  for (const [fa, fb] of pair) {
    const ha = (fa!.heldObjects ?? []).map(canon).filter((x) => BASE_NOUNS.includes(x)).sort().join('|')
    const hb = (fb!.heldObjects ?? []).map(canon).filter((x) => BASE_NOUNS.includes(x)).sort().join('|')
    if (ha && hb) { heldAgree.total++; if (ha === hb) heldAgree.agree++ }
    const pa = label(fa!.posture, [['seated', /seated|sitting/], ['standing', /stand/], ['walking', /walk|strid|stepp/], ['lying', /lying|reclining|prone/]])
    const pb = label(fb!.posture, [['seated', /seated|sitting/], ['standing', /stand/], ['walking', /walk|strid|stepp/], ['lying', /lying|reclining|prone/]])
    if (pa && pb) { postureAgree.total++; if (pa === pb) postureAgree.agree++ }
    const ga = label(fa!.gaze, [['left', /left/], ['right', /right/], ['down', /down|lower/], ['up', /up|sky/], ['away', /away|horizon/]])
    const gb = label(fb!.gaze, [['left', /left/], ['right', /right/], ['down', /down|lower/], ['up', /up|sky/], ['away', /away|horizon/]])
    if (ga && gb) { gazeAgree.total++; if (ga === gb) gazeAgree.agree++ }
  }

  /* 人物数 */
  const fa = a.visibleFacts.figureCount
  const fb = b.visibleFacts.figureCount
  if (typeof fa === 'number' && typeof fb === 'number') {
    figureAgree.total += 1
    if (fa === fb) figureAgree.agree += 1
    else figureAgree.details.push(`${row.reviewId} figureCount ${fa} vs ${fb}`)
  }

  /* 物件数：只比两人都给了数字的同一类目。
   *
   * 【为什么一个类目出现多条就整条跳过】
   * 第一版把同类目压成一个数，于是 shadow/cups-06 变成 "cup 1 vs 5" 的假分歧 ——
   * 实际上两人都写了「手持 1 杯」**和**「壁龛 5 杯」两条，只是归一化把它们
   * 压成了同一个 key，再各取其一去比。两人完全一致，指标却报了不一致。
   *
   * 同类目多条时，哪条对哪条**无从判断**（"cup held" 与 "cup in niche" 的配对
   * 要靠语义，而语义正是这层不该猜的东西）。所以计入 ambiguous 桶、退出比较，
   * 而不是硬配。宁可少统计一项，也不要制造一个不存在的分歧。 */
  const mapOf = (o: Observation) => {
    const m = new Map<string, (number | null)[]>()
    for (const x of o.visibleFacts.objects ?? []) {
      const k = canon(x.type)
      m.set(k, [...(m.get(k) ?? []), x.count ?? null])
    }
    return m
  }
  const ma = mapOf(a)
  const mb = mapOf(b)
  for (const [t, la] of ma) {
    const lb = mb.get(t)
    if (!lb) continue
    if (la.length !== 1 || lb.length !== 1) {
      ambiguousPairings.push(`${row.reviewId} ${t} (${la.length} vs ${lb.length} 条，配对不确定)`)
      continue
    }
    const [ca] = la
    const [cb] = lb
    if (typeof ca !== 'number' || typeof cb !== 'number') continue
    objectAgree.total += 1
    if (ca === cb) objectAgree.agree += 1
    else objectAgree.details.push(`${row.reviewId} ${t} ${ca} vs ${cb}`)
  }

  /* 月相：比**相位类目**，不比措辞。
   *
   * 【第一版在这里给出了一个危险的假结论】
   * 原本按字符串包含判一致，于是
   *   "crescent (thin), horns oriented toward the lower left"
   *   "crescent — a thin bright crescent whose opening faces down and to the left"
   * 被判为**不一致** —— 两个人明明看到同一个朝向的同一弯月。
   * 算出来 moonPhase 一致率 0%，而 0% 的政策含义是「这个字段不可靠，
   * Runtime 应该过滤掉月相」。一个措辞比对的 bug，差点变成一条数据策略。
   *
   * 所以只抽相位词比。带对冲语气（cannot be confirmed / not determinable）的
   * 算**弃权**，不算表态 —— 一个人说「是圆的但我不确定相位」时，
   * 他给的不是一个相位判断。 */
  const HEDGE = /uncertain|unknown|cannot be (confirmed|determined)|not (determin|resolv|establish)|indetermin|n\/a/i
  const phaseOf = (s: string): string | null => {
    if (s === '' || HEDGE.test(s)) return null
    if (/\bno (moon|sun)|not applicable|none\b/.test(s)) return 'none'
    if (/crescent/.test(s)) return 'crescent'
    if (/gibbous/.test(s)) return 'gibbous'
    if (/half|quarter/.test(s)) return 'half'
    if (/\bnew moon\b/.test(s)) return 'new'
    if (/full|round|complete disc|whole disc/.test(s)) return 'full'
    return null
  }
  const ka = phaseOf(norm(a.visibleFacts.moonPhase))
  const kb = phaseOf(norm(b.visibleFacts.moonPhase))
  if (ka && kb) {
    moonAgree.total += 1
    if (ka === kb) moonAgree.agree += 1
    else moonAgree.details.push(`${row.reviewId} moonPhase ${ka} vs ${kb}`)
  }

  /* 空间关系：词袋重合度。
   *
   * 【这个数字只说明趋势，不构成判断 —— 刻意不做成一个「一致率」】
   * 两个人用完全不同的词描述同一个空间关系是常态
   * （"A 在 B 左边" / "B 位于 A 右侧"），词袋重合度天生偏低。
   * 把它包装成「45% 的空间关系不一致」是在拿一个文本相似度冒充语义一致性。
   * 这里只记录每张的重合度，报告里给中位数，并明确标注它是什么。 */
  const bag = (xs: string[] | undefined) =>
    new Set((xs ?? []).join(' ').toLowerCase().match(/[a-z]{4,}/g) ?? [])
  const sa = bag(a.visibleFacts.spatialRelations)
  const sb = bag(b.visibleFacts.spatialRelations)
  if (sa.size > 0 && sb.size > 0) {
    const inter = [...sa].filter((w) => sb.has(w)).length
    spatialOverlaps.push(inter / Math.min(sa.size, sb.size))
  }

  /* 逐项完全一致（人物数 + 全部共同物件数 + 月相） */
  const objMismatch = [...ma].some(([t, la]) => {
    const lb = mb.get(t)
    if (!lb || la.length !== 1 || lb.length !== 1) return false
    const [ca] = la
    const [cb] = lb
    return typeof ca === 'number' && typeof cb === 'number' && ca !== cb
  })
  exactAgree.total += 1
  const figOk = !(typeof fa === 'number' && typeof fb === 'number' && fa !== fb)
  const moonOk = !(ka && kb && ka !== kb)
  if (figOk && !objMismatch && moonOk) exactAgree.agree += 1
}

const pct = (b: AgreementBucket) => (b.total === 0 ? null : Math.round((b.agree / b.total) * 1000) / 10)

/* ── 结论汇总 ─────────────────────────────────────────────── */

const decisionOf = new Map(judgements.map((j) => [j.reviewId, j]))
const tally = { AUTO_PASS: 0, AUTO_CORRECT: 0, MARK_UNCERTAIN: 0, HUMAN_REVIEW: 0, CORRECTED: 0, UNJUDGED: 0 }
for (const row of manifest.rows) {
  const d = decisionOf.get(row.reviewId)
  if (!d) tally.UNJUDGED += 1
  else tally[d.decision] += 1
}

const byDeck: Record<string, Record<string, number>> = {}
for (const row of manifest.rows) {
  const d = decisionOf.get(row.reviewId)?.decision ?? 'UNJUDGED'
  byDeck[row.deckId] ??= {}
  byDeck[row.deckId][d] = (byDeck[row.deckId][d] ?? 0) + 1
}

/* Reviewer 层面的 verdict 分布 */
const verdictTally: Record<string, number> = {}
for (const c of comparisons) verdictTally[c.verdict] = (verdictTally[c.verdict] ?? 0) + 1

/* Judge 推翻率：Judge 的结论与 Reviewer 的多数 verdict 不同 */
let overturn = 0
let judged = 0
for (const j of originalJudgements) {
  const cs = comparisons.filter((c) => c.reviewId === j.reviewId)
  if (cs.length === 0) continue
  const reviewerSaysProblem = cs.filter((c) => c.verdict !== 'pass').length > cs.length / 2
  if (cs.filter((c) => c.verdict !== 'pass').length === cs.length / 2) continue
  judged += 1
  const judgeSaysProblem = j.decision !== 'AUTO_PASS'
  if (reviewerSaysProblem !== judgeSaysProblem) overturn += 1
}

const summary = {
  version: 1,
  mode: manifest.mode,
  generatedAt: new Date().toISOString(),
  total: manifest.rows.length,
  decisions: tally,
  finalDistribution: { PASS: tally.AUTO_PASS, AUTO_CORRECT: tally.AUTO_CORRECT, CORRECTED: tally.CORRECTED, MARK_UNCERTAIN: tally.MARK_UNCERTAIN, HUMAN_REVIEW: tally.HUMAN_REVIEW },
  humanFinalApplied: judgements.filter((j) => j.decision === 'CORRECTED').map((j) => j.reviewId),
  finalRecords: manifest.rows.map((r) => ({ reviewId: r.reviewId, card: `${r.deckId}/${r.cardId}`, finalStatus: decisionOf.get(r.reviewId)?.decision === 'AUTO_PASS' ? 'PASS' : decisionOf.get(r.reviewId)?.decision ?? 'UNJUDGED' })),
  unresolvedTasks: manifest.rows.filter((r) => !decisionOf.has(r.reviewId)).map((r) => r.reviewId),
  reviewerVerdicts: verdictTally,
  reviewerVerdictAgreement: (() => {
    const pairs = manifest.rows.map((r) => comparisons.filter((c) => c.reviewId === r.reviewId).slice(0, 2)).filter((cs) => cs.length === 2)
    const agree = pairs.filter((cs) => cs[0]!.verdict === cs[1]!.verdict).length
    return { agree, total: pairs.length, rate: Math.round(agree / pairs.length * 1000) / 10 }
  })(),
  runtimeRisks: [
    ...(heldAgree.total > 0 && (pct(heldAgree) ?? 100) < 80 ? ['Held-object label agreement below 80%; limited lexical proxy, investigate matching/wording before any global runtime policy change.'] : []),
    'Spatial relation word overlap is not semantic agreement; semantic agreement rate is unavailable without additional independent comparison.',
    'First two reviewers only; null abstentions and ambiguous object pairings excluded. Third reviewers inform Judges, not primary-pair rates.',
  ],
  byDeck,
  agreement: {
    note: '分母只计「两人都对该项表过态」的情况。一方写 null 是弃权，不算分歧。',
    dualReviewedImages: exactAgree.total,
    exactAgreementRate: pct(exactAgree),
    denominators: { figureCount: figureAgree, objectCount: objectAgree, moonPhase: moonAgree, exact: exactAgree },
    heldObjectRate: pct(heldAgree),
    heldObjectCounts: heldAgree,
    postureRate: pct(postureAgree),
    postureCounts: postureAgree,
    gazeRate: pct(gazeAgree),
    gazeCounts: gazeAgree,
    structuredLabelNote: 'held object / posture / gaze 只在单人图或唯一位置匹配人物间比明确归一标签；不同措辞、身份和遮挡无法自动完整语义对齐，不能解释成全部视觉事实准确率。',
    figureCountRate: pct(figureAgree),
    objectCountRate: pct(objectAgree),
    moonPhaseRate: pct(moonAgree),
    spatialRelationWordOverlapMedian:
      spatialOverlaps.length === 0
        ? null
        : Math.round([...spatialOverlaps].sort((x, y) => x - y)[Math.floor(spatialOverlaps.length / 2)]! * 1000) / 10,
    spatialRelationNote:
      '这是两人空间关系描述的词袋重合度中位数，不是语义一致率。同一个关系用不同措辞表达是常态，该值天生偏低，只看趋势。',
    disagreements: {
      figureCount: figureAgree.details,
      objectCount: objectAgree.details,
      moonPhase: moonAgree.details,
    },
    ambiguousPairings,
  },
  /* 两个不同的「推翻」，不要混为一谈：
     · verdictDivergenceRate —— Judge 的「有没有问题」结论与 Reviewer 多数相反
     · selfDeclaredOverturns —— Judge 自己声明推翻了某位 Reviewer 的具体观察
     第一个可能是 0，而第二个同时是 4：Judge 同意「这里有问题」，
     但对**问题是什么**给出了不同答案。只报前者会严重低估 Judge 的实际作用。 */
  judgeVerdictDivergenceCounts: { divergent: overturn, compared: judged },
  judgeVerdictDivergenceRate: judged === 0 ? null : Math.round((overturn / judged) * 1000) / 10,
  judgeSelfDeclaredOverturns: originalJudgements.filter((j) => j.overturnedReviewer === true).map((j) => j.reviewId),
  uncertainRate: Math.round(tally.MARK_UNCERTAIN / manifest.rows.length * 1000) / 10,
  humanReviewRate: Math.round(tally.HUMAN_REVIEW / manifest.rows.length * 1000) / 10,
  correctionRate:
    manifest.rows.length === 0
      ? null
      : Math.round(((tally.AUTO_CORRECT + tally.CORRECTED) / manifest.rows.length) * 1000) / 10,
  control: (() => {
    const c = manifest.rows.find((r) => r.isControl)
    if (!c) return null
    const d = decisionOf.get(c.reviewId)
    const cs = comparisons.filter((x) => x.reviewId === c.reviewId)
    return {
      reviewId: c.reviewId,
      card: `${c.deckId}/${c.cardId}`,
      groundTruth: '画面右侧 4 支竖立权杖 + 骑手手持 1 支；现有生成值写的是 five upright wands',
      reviewerVerdicts: cs.map((x) => ({ reviewer: x.reviewer, verdict: x.verdict })),
      judgeDecision: d?.decision ?? null,
      caught:
        cs.some((x) =>
          (x.issues ?? []).some((i) => /five/i.test(i.existing) && /four/i.test(i.observed)),
        ) || /four/i.test(JSON.stringify(d?.patch ?? {})),
    }
  })(),
}

writeFileSync(resolve(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

/* ── 人工队列（§17）─────────────────────────────────────────
 *
 * 【这份文件的设计目标是「让人少看」】
 * 每一条必须自带争议点和「只需要你确认这一件事」那句话。
 * 让人重读整份 JSON 等于没做这轮 QA。
 */
const queue = judgements.filter((j) => j.decision === 'HUMAN_REVIEW')
const lines: string[] = [
  '# 人工复核队列 —— Multi-Agent Visual QA',
  '',
  `生成时间：${new Date().toISOString()}`,
  `范围：${manifest.rows.length} 张 · 需要你看 **${queue.length}** 张`,
  '',
  `> 其余 ${manifest.rows.length - queue.length} 张已由 Reviewer + Judge / 人工最终裁决处理完毕：`,
  `> AUTO_PASS ${tally.AUTO_PASS} · AUTO_CORRECT ${tally.AUTO_CORRECT} · MARK_UNCERTAIN ${tally.MARK_UNCERTAIN} · CORRECTED ${tally.CORRECTED}`,
  '> 不需要重读它们。',
  '',
]

if (queue.length === 0) {
  lines.push('No unresolved human-review items. 七条最终人工裁决保存在 human-final-decisions.json；原 Reviewer/Judge 记录保留。', '')
} else {
  const focusPath = resolve(BASE_DIR, 'human-focus.json')
  const focus = existsSync(focusPath) ? JSON.parse(readFileSync(focusPath, 'utf8')) as Record<string, { field: string; current: string; reviewers: Record<string, string>; judge: string; question: string }> : {}
  queue.forEach((j) => {
    const row = byId.get(j.reviewId)!
    const f = focus[j.reviewId]
    if (!f) throw new Error(`Missing concise human-review focus: ${j.reviewId}`)
    lines.push(`## ${j.reviewId}`, '',
      `**Card**: ${row.deckId}/${row.cardId}`,
      `**Image Path**: [打开图片](${resolve(ROOT, row.sourcePng)})`,
      `**Conflict Field**: ${f.field}`,
      `**Current Semantic**: ${f.current}`, '',
      ...Object.entries(f.reviewers).map(([reviewer, finding], index) => `**Reviewer ${String.fromCharCode(65 + index)} (${reviewer})**: ${finding}`),
      `**Judge**: ${f.judge}`, '', `**只需确认**：${f.question}`, '', '---', '')
  })
}

writeFileSync(resolve(OUT_DIR, 'human-review-queue.md'), `${lines.join('\n')}\n`, 'utf8')

/* ── 控制台 ───────────────────────────────────────────────── */
const G = '\x1b[32m'; const Y = '\x1b[33m'; const R = '\x1b[31m'; const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
console.log(`\n${B}Multi-Agent Visual QA 汇总${X}  ${D}mode=${manifest.mode}${X}`)
console.log(`  TOTAL ${manifest.rows.length}`)
console.log(`  ${G}AUTO_PASS ${tally.AUTO_PASS}${X} · ${Y}AUTO_CORRECT ${tally.AUTO_CORRECT}${X} · ${D}MARK_UNCERTAIN ${tally.MARK_UNCERTAIN}${X} · ${G}CORRECTED ${tally.CORRECTED}${X} · ${R}HUMAN_REVIEW ${tally.HUMAN_REVIEW}${X}${tally.UNJUDGED ? ` · 未裁决 ${tally.UNJUDGED}` : ''}`)
console.log(`\n${B}一致性${X}  ${D}（分母 = 两人都表过态的项）${X}`)
console.log(`  双审图片            ${exactAgree.total}`)
console.log(`  逐项完全一致        ${pct(exactAgree) ?? '—'}%`)
console.log(`  figureCount         ${pct(figureAgree) ?? '—'}%   ${D}${figureAgree.agree}/${figureAgree.total}${X}`)
console.log(`  objectCount         ${pct(objectAgree) ?? '—'}%   ${D}${objectAgree.agree}/${objectAgree.total}${X}`)
console.log(`  moonPhase           ${pct(moonAgree) ?? '—'}%   ${D}${moonAgree.agree}/${moonAgree.total}${X}`)
const medOverlap = spatialOverlaps.length === 0 ? null : [...spatialOverlaps].sort((x, y) => x - y)[Math.floor(spatialOverlaps.length / 2)]!
console.log(`  spatialRelation     ${D}词袋重合中位数 ${medOverlap === null ? '—' : (medOverlap * 100).toFixed(0)}% —— 非一致率，仅趋势${X}`)
if (ambiguousPairings.length > 0) console.log(`  ${D}配对不确定、未计入 ${ambiguousPairings.length} 项${X}`)
console.log(`\n  Judge 结论分歧率    ${summary.judgeVerdictDivergenceRate ?? '—'}%   ${D}（与 Reviewer 多数在「有无问题」上相反）${X}`)
console.log(`  Judge 推翻具体观察  ${summary.judgeSelfDeclaredOverturns.length} 张   ${D}${summary.judgeSelfDeclaredOverturns.join(' ')}${X}`)
console.log(`  修正率              ${summary.correctionRate ?? '—'}%`)
if (summary.control) {
  console.log(`\n${B}控制案例${X} ${summary.control.card}  ${summary.control.caught ? `${G}✔ 独立发现了 five→four${X}` : `${R}✘ 未发现${X}`}`)
}
if (objectAgree.details.length > 0) {
  console.log(`\n${B}物件数分歧${X}`)
  for (const d of objectAgree.details) console.log(`  ${Y}${d}${X}`)
}
if (figureAgree.details.length > 0) {
  console.log(`\n${B}人物数分歧${X}`)
  for (const d of figureAgree.details) console.log(`  ${Y}${d}${X}`)
}
console.log(`\n  → ${resolve(OUT_DIR, 'summary.json')}`)
console.log(`  → ${resolve(OUT_DIR, 'human-review-queue.md')}\n`)
