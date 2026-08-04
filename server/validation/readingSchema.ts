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
  ReadingContext,
  ReadingRelationship,
  RelationshipKind,
  StructuredReading,
  StructuredReadingCard,
} from '../../src/types/reading.ts'

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
  repaired: boolean
}

function asString(value: unknown, field: string, { min = 1 }: { min?: number } = {}): string {
  if (typeof value !== 'string') throw new SchemaError(`${field} 不是字符串`)
  const text = value.trim()
  if (text.length < min) throw new SchemaError(`${field} 为空`)
  return text
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

/** 模型偶尔会把整份结果包一层，或者用 ```json 围栏。先剥掉再校验。 */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim()
  if (text.length === 0) throw new SchemaError('模型返回了空内容')

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1]?.trim() ?? text

  try {
    return JSON.parse(candidate)
  } catch {
    // 被截断或前后有噪声：退而求其次，截取第一个 { 到最后一个 }
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1))
      } catch {
        throw new SchemaError('模型返回的不是合法 JSON（可能被截断）')
      }
    }
    throw new SchemaError('模型返回的不是合法 JSON')
  }
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

    // 模型擅自改了朝向 —— 直接作废，绝不能把改过的牌当成用户抽的牌
    if (typeof got.orientation === 'string' && got.orientation !== want.orientation) {
      throw new SchemaError(
        `模型改变了 ${want.cardId} 的正逆位（应为 ${want.orientation}，返回 ${got.orientation}）`,
      )
    }

    return {
      cardId: want.cardId,
      // 牌名与牌位一律以我们的数据为准，不用模型回填的
      cardName: want.cardNameZh,
      position: want.position.positionName,
      orientation: want.orientation,
      interpretation: asString(got.interpretation, `cards[${want.cardId}].interpretation`),
      connectionToQuestion: asString(
        got.connectionToQuestion,
        `cards[${want.cardId}].connectionToQuestion`,
      ),
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

  // 多张牌阵却一条关系都没有 —— 这正是用户抱怨 V1 的那个毛病，不能放过
  if (context.cards.length >= 2 && relationships.length === 0) {
    throw new SchemaError('多张牌阵必须给出至少一条牌与牌之间的关系')
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
    // 安全提示由服务端透传，模型无权改写
    safetyNotice: context.safetyNotice,
    meta: { ...meta, repaired: meta.repaired || outcome.repaired },
  }
}
