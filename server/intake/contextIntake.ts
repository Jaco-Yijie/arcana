/**
 * 生成解读前背景选择题 —— 路由与评测脚本共用同一份实现。
 *
 * 【失败永远不是错误】
 * 任何失败（无 Key、超时、上游错误、JSON 坏、校验后一题不剩）都返回 questions: []。
 * 背景提问完全可选，它失败时正确的产品行为是「像它不存在一样继续」。
 *
 * 【延迟预算】
 * 实测 deepseek-v4-flash 关闭推理生成 3 题约 1.6–1.8 秒，v4-pro 约 4–5.5 秒。
 * 默认用 flash；服务端硬超时 8 秒 —— 超过这个时间，用户已经在问题落定动画之后多等了很久，
 * 与其继续等，不如直接进入原流程。
 */

import type { ContextIntakeQuestion, QuestionCategory } from '../../src/types/reading.ts'
import type { LanguageCode } from '../../src/i18n/types.ts'
import { classifyQuestion } from '../../src/features/reading/questionCategory.ts'
import { detectRisk } from '../../src/features/reading/safety.ts'
import { config } from '../env.ts'
import { callDeepSeek, UpstreamFailure } from '../providers/deepseek.ts'
import { buildContextIntakeMessages } from '../prompts/contextIntakePrompt.ts'
import { parseWithRepair } from '../validation/jsonRepair.ts'
import { validateContextQuestions } from '../validation/contextIntakeSchema.ts'

export const INTAKE_MAX_QUESTION_CHARS = 200
const INTAKE_TIMEOUT_MS = Number(process.env.DEEPSEEK_INTAKE_TIMEOUT_MS ?? 8_000)
/* 3–4 道题的 JSON 实测 800–1400 字符；1200 token 留足余量，又不至于让坏输出拖很久 */
const INTAKE_MAX_TOKENS = 1200
/** 模型列出的已知事实达到这个数，视为「非常详细的问题」，最多补 1 题 */
export const DETAILED_QUESTION_FACTS = 5
export const INTAKE_MODEL = (process.env.DEEPSEEK_INTAKE_MODEL ?? '').trim() || 'deepseek-v4-flash'

export interface IntakeOutcome {
  questions: ContextIntakeQuestion[]
  /** 失败或跳过的原因；成功时为 null。只进日志与评测，不给用户看 */
  reason: string | null
  latencyMs: number
  /** 模型认为原问题已经给出的事实 —— 只用于评测重复询问，不返回前端 */
  knownFacts: string[]
  dropped: string[]
}

export async function generateContextQuestions(
  question: string,
  language: LanguageCode,
): Promise<IntakeOutcome> {
  const t0 = Date.now()
  const done = (partial: Partial<IntakeOutcome>): IntakeOutcome => ({
    questions: [],
    reason: null,
    knownFacts: [],
    dropped: [],
    ...partial,
    latencyMs: Date.now() - t0,
  })

  const text = question.trim()
  if (!text) return done({ reason: 'empty-question' })
  if (!config.ready) return done({ reason: 'missing-api-key' })

  const risk = detectRisk(text, language)
  /* 涉及人身安全时不出任何题：这一页的「补充一点背景」在这种语境下不合适 */
  if (risk.categories.includes('harm')) return done({ reason: 'harm-topic' })

  const category = classifyQuestion(text, 'question', null) as QuestionCategory
  const messages = buildContextIntakeMessages({
    question: text,
    category,
    language,
    riskCategories: risk.categories,
  })

  let content: string
  try {
    content = await callDeepSeek(messages, { thinking: { type: 'disabled' } }, {
      model: INTAKE_MODEL,
      maxTokens: INTAKE_MAX_TOKENS,
      timeoutMs: INTAKE_TIMEOUT_MS,
    })
  } catch (err) {
    return done({ reason: err instanceof UpstreamFailure ? err.code : 'upstream-error' })
  }

  const parsed = parseWithRepair(content)
  if (!parsed) return done({ reason: 'invalid-json' })

  const value = parsed.value as { knownFacts?: unknown }
  const knownFacts = Array.isArray(value.knownFacts)
    ? value.knownFacts.filter((f): f is string => typeof f === 'string')
    : []
  const { questions, dropped } = validateContextQuestions(parsed.value, language, text, risk.categories)

  /* 原问题已经非常具体时最多补 1 题。
     Prompt 里写了这一条，但实测模型在列出 7 条已知事实之后仍然会出 3 题 ——
     「多问」对它来说总是显得更周到。这里用它自己列出的 knownFacts 数量做一次确定性的收口。 */
  if (knownFacts.length >= DETAILED_QUESTION_FACTS && questions.length > 1) {
    dropped.push(`原问题已给出 ${knownFacts.length} 条事实，只保留 1 题`)
    questions.length = 1
  }
  return done({ questions, knownFacts, dropped })
}
