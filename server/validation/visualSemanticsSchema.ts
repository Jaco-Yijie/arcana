/**
 * 视觉语义的结构校验与越界剔除。
 *
 * 【原则：宁可少一条记录，也不要一条编造的记录】
 * 视觉语义是 enhancement，不是 hard dependency —— 缺一张牌，那张牌的解读
 * 退回 V2.5 原样，用户察觉不到。但一条编造的视觉证据会让模型
 * **言之凿凿地描述一幅并不存在的画**，而且因为它带着「证据」的身份，
 * 比模型自己空泛发挥更难被发现。所以这里对可疑记录是拒绝，不是修补。
 *
 * 【三类检查】
 *   1. 结构：字段在不在、类型对不对、条数超没超
 *   2. 越界：有没有在写牌义 / 做预测 / 把颜色翻译成吉凶
 *   3. 内容为空：全是空数组的记录等于没有信息，不如不要
 *
 * Rider-Waite 先验泄漏**不在这里拦**：一张牌里出现 "cups" 完全可能是真的。
 * 它只能靠跨牌组对比与人工抽查发现，见 scripts 的 QA 报告与 tests。
 */

import type {
  DeckCardVisualSemantics,
  VisualComposition,
  VisualFigure,
} from '../../src/types/visualSemantics.ts'
import { VISUAL_SEMANTICS_VERSION } from '../../src/types/visualSemantics.ts'
import { VISUAL_FIELD_LIMITS } from '../prompts/deckVisualAnalysisPrompt.ts'

/** 在写牌义 / 做预测，而不是在描述画面 */
const VERDICT_PHRASES =
  /\b(?:represents?|symboli[sz]es?|signifies?|means that|indicates? that|suggests? that you|you (?:should|will|must|need to)|predicts?|foretells?|this card (?:is|means)|the querent|advises?)\b/i

/**
 * 把明暗直接推成结论 —— 明确禁止的推理，任何字段都不许出现。
 * 例："dark colours therefore mean…"
 */
const BRIGHTNESS_INFERENCE =
  /\b(?:dark(?:ness)?|black|shadow|dim|bright|light|golden|warm)\s+(?:colou?rs?\s+)?(?:therefore|implies|means|indicates?|signals?|suggests?)\b/i

/** 对现实结果的断言。这是命运判断，不是画面描述 —— 任何字段都不许出现 */
const FATE_WORDS = /\b(?:auspicious|lucky|unlucky|fortunate|doomed|ill-fated|blessed)\b/i

/**
 * 介于「画面气氛」与「不祥预兆」之间的词。
 *
 * 【为什么要分这一档，而不是一律拉黑】
 * "ominous" 在英文里既能形容天色（an ominous sky = 画面气氛），
 * 也能形容命运（an ominous sign = 预言）。一律拉黑会误伤真实的画面描述：
 * 实测 legacy-shadow 的高塔，模型连续 8 次把 emotionalTone 写成 "ominous" ——
 * 那确实是那幅画的气氛，不是对用户的预测。
 *
 * 所以按**这个字段会不会进 Reading Prompt** 来分：
 *   会进的字段（scene / keyObjects / spatialRelations / visualTensions /
 *   deckSpecificMotifs / composition / semanticBridge）→ 禁止，
 *   因为它一旦进了 Prompt 就是递给模型的「暗=不好」的暗示；
 *   只留在数据集里的 emotionalTone / palette / lighting → 允许，
 *   它们被 projectVisualEvidence 挡在 Prompt 之外，结构上到不了解读模型。
 * 为一个到不了模型的词废掉整条记录，代价与收益不成比例。
 */
const MOOD_AS_OMEN = /\b(?:ominous|foreboding|portentous)\b/i

export interface VisualValidationResult {
  ok: boolean
  /** 校验失败的原因，逐条 */
  problems: string[]
  /** 被截断/清洗掉的内容，只进日志 */
  trimmed: string[]
}

function cleanString(v: unknown, max = 400): string {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

function cleanStringArray(v: unknown, limit: number, trimmed: string[], field: string): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of v) {
    const s = cleanString(item, 240)
    if (!s || seen.has(s.toLowerCase())) continue
    seen.add(s.toLowerCase())
    out.push(s)
  }
  if (out.length > limit) {
    trimmed.push(`${field} 从 ${out.length} 条截到 ${limit} 条`)
    out.length = limit
  }
  return out
}

function cleanFigures(v: unknown, trimmed: string[]): VisualFigure[] {
  if (!Array.isArray(v)) return []
  const out: VisualFigure[] = []
  for (const raw of v) {
    if (typeof raw !== 'object' || raw === null) continue
    const f = raw as Record<string, unknown>
    const role = cleanString(f.role, 160)
    if (!role) continue
    const figure: VisualFigure = {
      role,
      position: cleanString(f.position, 120),
      posture: cleanString(f.posture, 160),
    }
    const gaze = cleanString(f.gaze, 120)
    const movement = cleanString(f.movement, 120)
    /* 模型有时用 "unknown" / "not visible" 填这两个可选字段。
       那不是观察，是占位 —— 省略比写进去好，省略本身就是「看不清」。 */
    if (gaze && !/^(?:unknown|not (?:visible|determinable)|n\/a|none)$/i.test(gaze)) figure.gaze = gaze
    if (movement && !/^(?:unknown|not (?:visible|determinable)|n\/a|none|static|still)$/i.test(movement)) {
      figure.movement = movement
    }
    out.push(figure)
  }
  if (out.length > VISUAL_FIELD_LIMITS.figures) {
    trimmed.push(`figures 从 ${out.length} 条截到 ${VISUAL_FIELD_LIMITS.figures} 条`)
    out.length = VISUAL_FIELD_LIMITS.figures
  }
  return out
}

function cleanComposition(v: unknown): VisualComposition {
  const c = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>
  return {
    focalPoint: cleanString(c.focalPoint, 160),
    direction: cleanString(c.direction, 120),
    openness: cleanString(c.openness, 120),
    balance: cleanString(c.balance, 120),
  }
}

/**
 * 把模型返回的对象清洗成一条合法记录。
 *
 * @returns `entry` 为 null 时表示这条不可用，原因在 `problems` 里
 */
export function validateVisualSemantics(
  payload: unknown,
  identity: {
    deckId: DeckCardVisualSemantics['deckId']
    cardId: string
    assetPath: string
    assetHash: string
    /** 这一版 Vision Prompt 的人读版本号与确定性指纹 —— 决定这条记录以后何时过期 */
    promptVersion: string
    promptHash: string
    model: string
    latencyMs: number
  },
): VisualValidationResult & { entry: DeckCardVisualSemantics | null } {
  const problems: string[] = []
  const trimmed: string[] = []

  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, problems: ['返回的不是对象'], trimmed, entry: null }
  }
  const p = payload as Record<string, unknown>

  const scene = cleanString(p.scene, 400)
  if (!scene) problems.push('scene 为空')

  const bridgeRaw = (typeof p.semanticBridge === 'object' && p.semanticBridge !== null
    ? p.semanticBridge
    : {}) as Record<string, unknown>

  const entry: DeckCardVisualSemantics = {
    version: VISUAL_SEMANTICS_VERSION,
    deckId: identity.deckId,
    cardId: identity.cardId,
    source: { assetPath: identity.assetPath, assetHash: identity.assetHash },
    generator: {
      promptVersion: identity.promptVersion,
      promptHash: identity.promptHash,
      schemaVersion: VISUAL_SEMANTICS_VERSION,
    },
    scene,
    figures: cleanFigures(p.figures, trimmed),
    keyObjects: cleanStringArray(p.keyObjects, VISUAL_FIELD_LIMITS.keyObjects, trimmed, 'keyObjects'),
    spatialRelations: cleanStringArray(p.spatialRelations, VISUAL_FIELD_LIMITS.spatialRelations, trimmed, 'spatialRelations'),
    foreground: cleanStringArray(p.foreground, VISUAL_FIELD_LIMITS.foreground, trimmed, 'foreground'),
    background: cleanStringArray(p.background, VISUAL_FIELD_LIMITS.background, trimmed, 'background'),
    lighting: cleanString(p.lighting, 200),
    palette: cleanStringArray(p.palette, VISUAL_FIELD_LIMITS.palette, trimmed, 'palette'),
    composition: cleanComposition(p.composition),
    visualTensions: cleanStringArray(p.visualTensions, VISUAL_FIELD_LIMITS.visualTensions, trimmed, 'visualTensions'),
    deckSpecificMotifs: cleanStringArray(p.deckSpecificMotifs, VISUAL_FIELD_LIMITS.deckSpecificMotifs, trimmed, 'deckSpecificMotifs'),
    emotionalTone: cleanStringArray(p.emotionalTone, VISUAL_FIELD_LIMITS.emotionalTone, trimmed, 'emotionalTone'),
    semanticBridge: {
      emphasizedAspects: cleanStringArray(bridgeRaw.emphasizedAspects, VISUAL_FIELD_LIMITS.emphasizedAspects, trimmed, 'emphasizedAspects'),
      softenedAspects: cleanStringArray(bridgeRaw.softenedAspects, VISUAL_FIELD_LIMITS.softenedAspects, trimmed, 'softenedAspects'),
    },
    confidence: {
      overall: (['high', 'medium', 'low'] as const).includes(
        cleanString((p.confidence as Record<string, unknown> | undefined)?.overall, 10) as 'high',
      )
        ? (cleanString((p.confidence as Record<string, unknown>).overall, 10) as 'high' | 'medium' | 'low')
        : 'medium',
      uncertainDetails: cleanStringArray(
        (p.confidence as Record<string, unknown> | undefined)?.uncertainDetails,
        VISUAL_FIELD_LIMITS.uncertainDetails,
        trimmed,
        'uncertainDetails',
      ),
    },
    meta: {
      model: identity.model,
      generatedAt: new Date().toISOString(),
      latencyMs: identity.latencyMs,
    },
  }

  const tension = cleanStringArray(bridgeRaw.tensionWithCanonical, VISUAL_FIELD_LIMITS.tensionWithCanonical, trimmed, 'tensionWithCanonical')
  /* 没有张力就不要这个字段 —— 空数组会让下游误以为「检查过，确实没有」，
     而实际上这两件事在数据里应该长得不一样 */
  if (tension.length > 0) entry.semanticBridge.tensionWithCanonical = tension

  /* ── 内容量：全空的记录等于没有信息 ── */
  if (entry.keyObjects.length === 0 && entry.figures.length === 0) {
    problems.push('既没有 figures 也没有 keyObjects —— 这条记录没有任何可见证据')
  }
  if (entry.semanticBridge.emphasizedAspects.length === 0) {
    problems.push('emphasizedAspects 为空 —— 没有语义桥，这条对解读没有用处')
  }

  /* ── 越界：在写牌义或做预测 ── */
  const observationFields: [string, string[]][] = [
    ['scene', [entry.scene]],
    ['keyObjects', entry.keyObjects],
    ['spatialRelations', entry.spatialRelations],
    ['foreground', entry.foreground],
    ['background', entry.background],
    ['visualTensions', entry.visualTensions],
    ['deckSpecificMotifs', entry.deckSpecificMotifs],
    ['emotionalTone', entry.emotionalTone],
    ['composition', Object.values(entry.composition)],
  ]
  for (const [field, texts] of observationFields) {
    /* emotionalTone 只活在数据集里，projectVisualEvidence 不会把它送进 Prompt。
       所以它可以用「不祥」这类气氛词描述画面，但依然不许下命运断言。 */
    const promptFacing = field !== 'emotionalTone'
    for (const t of texts) {
      if (VERDICT_PHRASES.test(t)) problems.push(`${field} 在写牌义或做预测：「${t}」`)
      if (BRIGHTNESS_INFERENCE.test(t)) problems.push(`${field} 把明暗推成了结论：「${t}」`)
      if (FATE_WORDS.test(t)) problems.push(`${field} 在断言吉凶：「${t}」`)
      if (promptFacing && MOOD_AS_OMEN.test(t)) {
        problems.push(`${field} 会进 Prompt，不能带预兆词：「${t}」`)
      }
    }
  }
  /* semanticBridge 允许引用 canonical meaning，但同样不许下判断句 */
  for (const t of [...entry.semanticBridge.emphasizedAspects, ...entry.semanticBridge.softenedAspects, ...(entry.semanticBridge.tensionWithCanonical ?? [])]) {
    if (BRIGHTNESS_INFERENCE.test(t)) problems.push(`semanticBridge 把明暗推成了结论：「${t}」`)
    if (FATE_WORDS.test(t) || MOOD_AS_OMEN.test(t)) problems.push(`semanticBridge 在断言吉凶：「${t}」`)
    if (/\byou (?:should|will|must|need to)\b/i.test(t)) problems.push(`semanticBridge 在给建议：「${t}」`)
  }

  return { ok: problems.length === 0, problems, trimmed, entry: problems.length === 0 ? entry : null }
}
