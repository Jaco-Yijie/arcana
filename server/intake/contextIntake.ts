/**
 * 生成解读前背景选择题 —— Node 部署形态（路由与评测脚本共用同一份实现）。
 *
 * 【这个文件只负责「怎么把请求发出去」】
 * Prompt 组装、风险判定、JSON 修复、题目校验、knownFacts 收口全部在
 * `contextIntakePipeline.ts` 里 —— Streamlit 形态复用的正是那一份。
 * 这里剩下的只有：读配置、调 DeepSeek、把失败翻译成 reason。
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

import type { ContextIntakeQuestion } from '../../src/types/reading.ts'
import type { LanguageCode } from '../../src/i18n/types.ts'
import { config } from '../env.ts'
import { callDeepSeek, UpstreamFailure } from '../providers/deepseek.ts'
import {
  INTAKE_MAX_TOKENS,
  buildIntakeRequest,
  processContextIntakeResponse,
} from './contextIntakePipeline.ts'

export { DETAILED_QUESTION_FACTS, INTAKE_MAX_QUESTION_CHARS } from './contextIntakePipeline.ts'

const INTAKE_TIMEOUT_MS = Number(process.env.DEEPSEEK_INTAKE_TIMEOUT_MS ?? 8_000)
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

  if (!question.trim()) return done({ reason: 'empty-question' })
  if (!config.ready) return done({ reason: 'missing-api-key' })

  const plan = buildIntakeRequest(question, language)
  if (!plan.ok) return done({ reason: plan.reason })

  let content: string
  try {
    content = await callDeepSeek(plan.messages, { thinking: { type: 'disabled' } }, {
      model: INTAKE_MODEL,
      maxTokens: INTAKE_MAX_TOKENS,
      timeoutMs: INTAKE_TIMEOUT_MS,
    })
  } catch (err) {
    return done({ reason: err instanceof UpstreamFailure ? err.code : 'upstream-error' })
  }

  const processed = processContextIntakeResponse(content, plan, language)
  return done(processed)
}
