/**
 * 解读前背景提问的**纯逻辑**部分 —— 零 Node 依赖，浏览器里能直接跑。
 *
 * 【为什么要把它从 contextIntake.ts 里切出来】
 * 背景提问现在有两条通路：
 *   Node 部署      → server/intake/contextIntake.ts  （直接调 DeepSeek）
 *   Streamlit 部署 → src/features/reading/streamlitContextIntake.ts（Python 代发）
 * 两条路唯一的区别就是「HTTP 请求由谁发出」。Prompt 组装、风险判定、JSON 修复、
 * 题目校验、knownFacts 收口这些规则**必须只有一份** —— 复制一份必然漂移，
 * 而漂移的那天不会有人发现：背景提问失败是静默的。
 *
 * 所以这个文件只做两件事：
 *   1. buildIntakeRequest()            问题 → 要发给模型的 messages（或「不该问」的理由）
 *   2. processContextIntakeResponse()  模型原文 → 可用的题目
 * 中间那一步（怎么把 messages 送出去）留给各自的运行时。
 *
 * 它不 import server/env.ts、不 import provider —— 那两个文件带 node:fs 与 API Key，
 * 一旦被引入就会把整条链路拖进前端包。
 */

import type { ContextIntakeQuestion, QuestionCategory } from '../../src/types/reading.ts'
import type { LanguageCode } from '../../src/i18n/types.ts'
import { classifyQuestion } from '../../src/features/reading/questionCategory.ts'
import { detectRisk } from '../../src/features/reading/safety.ts'
import { buildContextIntakeMessages } from '../prompts/contextIntakePrompt.ts'
import { parseWithRepair } from '../validation/jsonRepair.ts'
import { validateContextQuestions } from '../validation/contextIntakeSchema.ts'

export const INTAKE_MAX_QUESTION_CHARS = 200
/* 3–4 道题的 JSON 实测 800–1400 字符；1200 token 留足余量，又不至于让坏输出拖很久 */
export const INTAKE_MAX_TOKENS = 1200
/** 模型列出的已知事实达到这个数，视为「非常详细的问题」，最多补 1 题 */
export const DETAILED_QUESTION_FACTS = 5

export interface IntakeMessage {
  role: 'system' | 'user'
  content: string
}

export type IntakeSkipReason = 'empty-question' | 'harm-topic'

export type IntakeRequestPlan =
  | { ok: true; question: string; messages: IntakeMessage[]; riskCategories: string[] }
  | { ok: false; reason: IntakeSkipReason }

/**
 * 出题前的全部准备：清洗问题 → 风险判定 → 归类 → 组装 Prompt。
 *
 * 涉及人身安全时直接返回 `harm-topic` 且**不组装 messages** ——
 * 这一页的「补充一点背景」在那种语境下不合适，也不该为此调用模型。
 */
export function buildIntakeRequest(question: string, language: LanguageCode): IntakeRequestPlan {
  const text = question.trim()
  if (!text) return { ok: false, reason: 'empty-question' }

  const risk = detectRisk(text, language)
  if (risk.categories.includes('harm')) return { ok: false, reason: 'harm-topic' }

  const category = classifyQuestion(text, 'question', null) as QuestionCategory
  return {
    ok: true,
    question: text,
    riskCategories: risk.categories,
    messages: buildContextIntakeMessages({
      question: text,
      category,
      language,
      riskCategories: risk.categories,
    }),
  }
}

export interface IntakeProcessResult {
  questions: ContextIntakeQuestion[]
  /** 模型认为原问题已经给出的事实 —— 只用于排查与评测，不返回前端 */
  knownFacts: string[]
  dropped: string[]
  /** 失败原因；成功时为 null */
  reason: 'invalid-json' | null
}

/**
 * 模型原文 → 可用的题目。Node 与 Streamlit 共用这一份后处理。
 *
 * @param content  模型返回的原始 content
 * @param plan     buildIntakeRequest 的成功结果（带原问题与风险类别，校验兜底要用）
 */
export function processContextIntakeResponse(
  content: string,
  plan: { question: string; riskCategories: string[] },
  language: LanguageCode,
): IntakeProcessResult {
  const parsed = parseWithRepair(content)
  if (!parsed) return { questions: [], knownFacts: [], dropped: [], reason: 'invalid-json' }

  const value = parsed.value as { knownFacts?: unknown }
  const knownFacts = Array.isArray(value.knownFacts)
    ? value.knownFacts.filter((f): f is string => typeof f === 'string')
    : []
  const { questions, dropped } = validateContextQuestions(
    parsed.value,
    language,
    plan.question,
    plan.riskCategories,
  )

  /* 原问题已经非常具体时最多补 1 题。
     Prompt 里写了这一条，但实测模型在列出 7 条已知事实之后仍然会出 3 题 ——
     「多问」对它来说总是显得更周到。这里用它自己列出的 knownFacts 数量做一次确定性的收口。 */
  if (knownFacts.length >= DETAILED_QUESTION_FACTS && questions.length > 1) {
    dropped.push(`原问题已给出 ${knownFacts.length} 条事实，只保留 1 题`)
    questions.length = 1
  }

  return { questions, knownFacts, dropped, reason: null }
}
