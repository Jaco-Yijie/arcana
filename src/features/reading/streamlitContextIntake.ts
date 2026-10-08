/**
 * Streamlit 形态下的解读前背景提问。
 *
 * 【与 Node 形态的唯一区别是「谁发的 HTTP」】
 * Prompt 组装、风险判定、JSON 修复、题目校验、knownFacts 收口全部复用
 * `server/intake/contextIntakePipeline.ts` —— 与 `/api/tarot/context-questions`
 * 走的是**同一份**代码。Python 那边一个塔罗规则都没有，它只把 messages 转给 DeepSeek。
 * （这与 `streamlitReading.ts` 对解读的处理方式完全一致。）
 *
 * 【永远不抛错】
 * 这个函数和它在 Node 那侧的对应物一样：bridge 超时、Python 报错、DeepSeek 失败、
 * JSON 坏、校验后一题不剩 —— 一律返回 []。调用方拿到 [] 就直接进牌阵，
 * 不提示、不阻断。背景提问失败不能变成占卜失败。
 */

import type { ContextIntakeQuestion } from '@/types/reading'
import type { LanguageCode } from '@/i18n/types'
import {
  buildIntakeRequest,
  processContextIntakeResponse,
} from '../../../server/intake/contextIntakePipeline'
import { requestContextIntakeViaStreamlit } from './streamlitTransport'

export async function generateContextQuestionsViaStreamlit(
  sessionId: string,
  question: string,
  language: LanguageCode,
  timeoutMs?: number,
): Promise<ContextIntakeQuestion[]> {
  const plan = buildIntakeRequest(question, language)
  /* 空问题 / 人身安全话题：和服务端一样，连模型都不调用 */
  if (!plan.ok) return []

  let response
  try {
    response = await requestContextIntakeViaStreamlit(plan.messages, sessionId, timeoutMs)
  } catch {
    /* bridge 超时。用户已经等过一次动画了，直接当作没有题目 */
    return []
  }

  if (!response.ok || !response.content) return []

  return processContextIntakeResponse(response.content, plan, language).questions
}
