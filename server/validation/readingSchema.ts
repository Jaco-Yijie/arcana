/**
 * 结构化解读的校验与修复。
 *
 * 【为什么必须有这个文件】
 * DeepSeek 只支持 `response_format: { type: 'json_object' }`，**不支持 JSON Schema**。
 * 也就是说 API 只保证「是一个合法 JSON」，不保证字段对不对。
 * 所以结构约束只能由我们自己在这里兜住。
 *
 * 【两类问题，两种处理】
 * - **可修复**（模型多写了一条引用不存在卡牌的关系、reflectionQuestions 少一条、字段有多余空白）
 *   → 就地修掉，标 `repaired = true`，让 QA 看得见，但不打断用户。
 * - **不可修复 —— 牌面对不上**（数量不符 / cardId 不在请求里 / 正逆位被改 / 牌位被改）
 *   → 直接判失败。这是 AC-V2-10：模型一旦动了牌，这次解读就整份作废，
 *     宁可让用户重试，也不能把「被模型改过的牌」当成他自己抽的牌展示出去。
 */

import type {
  AlternativeInterpretation,
  ReadingContext,
  ReadingRelationship,
  RelationshipKind,
  StructuredReading,
  StructuredReadingCard,
} from '../../src/types/reading.ts'
import type { Orientation } from '../../src/types/tarot.ts'

import { parseWithRepair } from './jsonRepair.ts'

export class SchemaError extends Error {}

const RELATIONSHIP_KINDS: RelationshipKind[] = [
  'major-density',
  'minor-density',
  'suit-repetition',
  'element-repetition',
  'element-conflict',
  'number-pattern',
  'orientation-balance',
  'neighbouring',
  'arc',
  'supporting',
  'conflicting',
  'turning-point',
  'dominant-theme',
]

export interface ValidationOutcome {
  cards: StructuredReadingCard[]
  relationships: ReadingRelationship[]
  readingTheme: string
  overallEnergy: string
  narrative: string
  answerToQuestion: string
  reflectionQuestions: string[]
  alternativeInterpretations: AlternativeInterpretation[]
  repaired: boolean
}

function asString(value: unknown, field: string, { min = 1 }: { min?: number } = {}): string {
  if (typeof value !== 'string') throw new SchemaError(`${field} 不是字符串`)
  const text = value.trim()
  if (text.length < min) throw new SchemaError(`${field} 为空`)
  return text
}

/**
 * 把模型写的朝向归一成 'upright' / 'reversed'。
 *
 * 20 次真实采样里出现过 `"up right"` —— 意思毫无歧义，
 * 却被当成「模型改了正逆位」把整份解读作废了。这是误杀，不是红线。
 * 归一化只抹平写法差异（空格、连字符、大小写、中文），
 * **不会**让「明确写成相反方向」蒙混过关。
 *
 * @returns 认不出来时返回 null（交由调用方判断，不猜）
 */
function normalizeOrientation(value: unknown): Orientation | null {
  if (typeof value !== 'string') return null
  const t = value.toLowerCase().replace(/[\s\-_]/g, '')
  if (t === 'upright' || t === 'up' || t === '正位' || t === '正') return 'upright'
  if (t === 'reversed' || t === 'reverse' || t === '逆位' || t === '逆') return 'reversed'
  return null
}

const opposite = (o: Orientation): Orientation => (o === 'upright' ? 'reversed' : 'upright')

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export interface ExtractOutcome {
  value: unknown
  /** 是否动用了 jsonRepair */
  repaired: boolean
  /** 具体修了什么，进 meta 与 QA 日志 */
  fixes: string[]
}

/**
 * 模型偶尔会把整份结果包一层、用 ```json 围栏，或者漏一个逗号。
 * 这里依次尝试：直接解析 → 剥围栏 → 截首尾大括号 → 结构修复（见 jsonRepair.ts）。
 *
 * 【为什么值得修而不是直接判失败】
 * V2.4 的真实采样里，唯一一次 JSON 失败是 4942 字符的完整解读**漏了一个逗号**。
 * 为此丢掉整份内容、让用户重等 90 秒，代价远大于收益。
 * 修复只动结构位置，正文一个字符不碰；牌面一致性仍由 validateReading 兜底。
 */
export function extractJsonObjectDetailed(raw: string): ExtractOutcome {
  const text = raw.trim()
  if (text.length === 0) throw new SchemaError('模型返回了空内容')

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? text

  try {
    return { value: JSON.parse(candidate), repaired: false, fixes: [] }
  } catch {
    /* 继续往下试 */
  }

  // 前后有噪声（「好的，结果如下：」之类）：先截到第一个 { 与最后一个 }
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  const sliced = start !== -1 && end > start ? candidate.slice(start, end + 1) : candidate

  if (sliced !== candidate) {
    try {
      return { value: JSON.parse(sliced), repaired: true, fixes: ['去掉了 JSON 前后的多余文字'] }
    } catch {
      /* 继续 */
    }
  }

  const repaired = parseWithRepair(sliced)
  if (repaired) {
    return { value: repaired.value, repaired: true, fixes: repaired.fixes }
  }

  throw new SchemaError('模型返回的不是合法 JSON')
}

/** 只要结果、不关心是否修过时用这个。 */
export function extractJsonObject(raw: string): unknown {
  return extractJsonObjectDetailed(raw).value
}

/**
 * 校验模型输出，并与请求上下文逐张比对牌面。
 * @throws SchemaError 结构缺失或牌面对不上
 */
export function validateReading(payload: unknown, context: ReadingContext): ValidationOutcome {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new SchemaError('模型返回的不是一个 JSON 对象')
  }
  const raw = payload as Record<string, unknown>
  let repaired = false

  const readingTheme = asString(raw.readingTheme, 'readingTheme')
  const overallEnergy = asString(raw.overallEnergy, 'overallEnergy')
  const narrative = asString(raw.narrative, 'narrative')
  const answerToQuestion = asString(raw.answerToQuestion, 'answerToQuestion')

  /* ── 牌面一致性：不可修复 ─────────────────────────────── */
  if (!Array.isArray(raw.cards)) throw new SchemaError('cards 不是数组')
  if (raw.cards.length !== context.cards.length) {
    throw new SchemaError(
      `模型返回了 ${raw.cards.length} 张牌，但用户抽的是 ${context.cards.length} 张`,
    )
  }

  const expected = new Map(context.cards.map((c) => [c.cardId, c]))
  const cards: StructuredReadingCard[] = context.cards.map((want) => {
    const got = (raw.cards as unknown[]).find(
      (c): c is Record<string, unknown> =>
        typeof c === 'object' && c !== null && (c as Record<string, unknown>).cardId === want.cardId,
    )
    if (!got) throw new SchemaError(`模型的输出里缺少这张牌：${want.cardId}`)

    /* 模型擅自把牌翻过来 —— 直接作废。
     * 但只有**明确写成相反方向**才算改牌：`up right`、`UPRIGHT`、「正位」
     * 都是同一个意思的不同写法，判成改牌是误杀。
     * 最终 orientation 本来就以我们的数据为准，模型这个值只用来检测它有没有跑偏。 */
    const said = normalizeOrientation(got.orientation)
    if (said === opposite(want.orientation)) {
      throw new SchemaError(
        `模型改变了 ${want.cardId} 的正逆位（应为 ${want.orientation}，返回 ${String(got.orientation)}`,
      )
    }
    if (said === null && got.orientation !== undefined) repaired = true

    /* connectionToQuestion 偶尔会整个漏掉。牌面是对的，只是少了一段文字 ——
     * 这属于可修复：留空并标记，让前端跳过这一段，
     * 而不是为了一段说明把 5000 字的解读整份作废。绝不编造内容填进去。 */
    const connection =
      typeof got.connectionToQuestion === 'string' ? got.connectionToQuestion.trim() : ''
    if (connection.length === 0) repaired = true

    return {
      cardId: want.cardId,
      // 牌名与牌位一律以我们的数据为准，不用模型回填的
      cardName: want.cardNameZh,
      position: want.position.name,
      orientation: want.orientation,
      interpretation: asString(got.interpretation, `cards[${want.cardId}].interpretation`),
      connectionToQuestion: connection,
    }
  })

  // 模型返回了请求里根本没有的牌
  for (const c of raw.cards as unknown[]) {
    const id = typeof c === 'object' && c !== null ? (c as Record<string, unknown>).cardId : null
    if (typeof id === 'string' && !expected.has(id)) {
      throw new SchemaError(`模型返回了用户没有抽到的牌：${id}`)
    }
  }

  /* ── 关系：可修复 ─────────────────────────────────────── */
  const relationships: ReadingRelationship[] = []
  if (Array.isArray(raw.relationships)) {
    for (const item of raw.relationships) {
      if (typeof item !== 'object' || item === null) {
        repaired = true
        continue
      }
      const rel = item as Record<string, unknown>
      const interpretation = typeof rel.interpretation === 'string' ? rel.interpretation.trim() : ''
      if (interpretation.length === 0) {
        repaired = true
        continue
      }
      // 引用了不存在的牌：剔掉那几个 id 而不是整条丢弃
      const ids = asStringArray(rel.cards).filter((id) => expected.has(id))
      if (ids.length !== asStringArray(rel.cards).length) repaired = true
      if (ids.length === 0) {
        repaired = true
        continue
      }
      const kind = RELATIONSHIP_KINDS.includes(rel.kind as RelationshipKind)
        ? (rel.kind as RelationshipKind)
        : 'dominant-theme'
      if (kind !== rel.kind) repaired = true

      relationships.push({ cards: ids, kind, interpretation })
    }
  } else {
    repaired = true
  }

  // V2.3：**不再强制关系数量**。
  // 原来这里要求「多张牌阵必须至少一条关系」，本意是防止模型偷懒，
  // 实际效果却是逼它在没有真实关系时硬凑一条 —— 那比没有更糟。
  // 现在由模型自己判断 0..N，Prompt 里也明确写了「没有就不写」。

  /* ── 另一种读法（可选，不强制存在）─────────────────────── */
  const alternatives: AlternativeInterpretation[] = []
  if (Array.isArray(raw.alternativeInterpretations)) {
    for (const item of raw.alternativeInterpretations) {
      if (typeof item !== 'object' || item === null) {
        repaired = true
        continue
      }
      const alt = item as Record<string, unknown>
      const interpretation =
        typeof alt.interpretation === 'string' ? alt.interpretation.trim() : ''
      const reason = typeof alt.reason === 'string' ? alt.reason.trim() : ''
      if (interpretation.length === 0) {
        repaired = true
        continue
      }
      alternatives.push({ interpretation, reason })
    }
  }

  /* ── 反思问题：可修复 ─────────────────────────────────── */
  let reflectionQuestions = asStringArray(raw.reflectionQuestions)
  if (reflectionQuestions.length === 0) {
    throw new SchemaError('reflectionQuestions 为空')
  }
  if (reflectionQuestions.length > 5) {
    reflectionQuestions = reflectionQuestions.slice(0, 5)
    repaired = true
  }

  return {
    cards,
    relationships,
    readingTheme,
    overallEnergy,
    narrative,
    answerToQuestion,
    reflectionQuestions,
    alternativeInterpretations: alternatives,
    repaired,
  }
}

/** 把校验结果组装成最终的 StructuredReading */
export function assembleReading(
  outcome: ValidationOutcome,
  context: ReadingContext,
  meta: Omit<StructuredReading['meta'], 'repaired'> & { repaired?: boolean },
): StructuredReading {
  return {
    version: 2,
    readingTheme: outcome.readingTheme,
    overallEnergy: outcome.overallEnergy,
    cards: outcome.cards,
    relationships: outcome.relationships,
    narrative: outcome.narrative,
    answerToQuestion: outcome.answerToQuestion,
    reflectionQuestions: outcome.reflectionQuestions,
    ...(outcome.alternativeInterpretations.length > 0
      ? { alternativeInterpretations: outcome.alternativeInterpretations }
      : {}),
    // 安全提示由服务端透传，模型无权改写
    safetyNotice: context.safetyNotice,
    meta: { ...meta, repaired: meta.repaired || outcome.repaired },
  }
}
