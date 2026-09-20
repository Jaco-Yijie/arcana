/**
 * 解读前背景提问 —— 客户端
 *
 * ══════════════════════════════════════════════════════════════
 * 【这一步永远不能挡住占卜】
 * 这里返回的 Promise **从不 reject**。无 Key、网络错误、超时、上游错误、
 * 校验后一题不剩、Streamlit 形态（没有 Node 服务可调）—— 一律得到 []，
 * 调用方拿到 [] 就直接进入原本的牌阵选择，不提示、不打扰。
 *
 * 【为什么在提交问题时就开始请求】
 * 用户提交问题后有一段 1.6 秒的「问题落定」动画。请求在那一刻并行发出，
 * 实测 deepseek-v4-flash 出题约 1.6–1.8 秒 —— 大多数时候动画结束时题目已经到了，
 * 用户不需要看到任何加载状态。
 * ══════════════════════════════════════════════════════════════
 */

import type { ContextIntakeQuestion, ContextIntakeResponse } from '@/types/reading'
import type { LanguageCode } from '@/i18n/types'

/** 服务端硬超时 8 秒，客户端再留一点网络余量。超过它就当作没有题目 */
export const CONTEXT_INTAKE_CLIENT_TIMEOUT_MS = 10_000

const prepared = new Map<string, Promise<ContextIntakeQuestion[]>>()

const keyOf = (sessionId: string, language: LanguageCode) => `${sessionId}|${language}`

/** Streamlit 部署没有 Node 服务，Python 侧也只转发解读 Prompt —— 这个功能在那里不出现 */
function isStreamlit(): boolean {
  return (import.meta as { env?: Record<string, string> }).env?.VITE_DEPLOY_TARGET === 'streamlit'
}

async function fetchQuestions(
  question: string,
  language: LanguageCode,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<ContextIntakeQuestion[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetcher('/api/tarot/context-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, language }),
      signal: controller.signal,
    })
    if (!(res.headers.get('content-type') ?? '').includes('application/json')) return []
    const body = (await res.json()) as ContextIntakeResponse
    return body.ok && Array.isArray(body.questions) ? body.questions : []
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 开始（或复用）为这次会话准备背景选择题。
 * 同一会话、同一语言只请求一次；换了新会话会清掉旧的，避免把上一次的题目带过来。
 */
export function prepareContextQuestions(
  sessionId: string,
  question: string,
  language: LanguageCode,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<ContextIntakeQuestion[]> {
  const key = keyOf(sessionId, language)
  const existing = prepared.get(key)
  if (existing) return existing

  for (const k of prepared.keys()) if (!k.startsWith(`${sessionId}|`)) prepared.delete(k)

  const job =
    isStreamlit() || !question.trim()
      ? Promise.resolve([])
      : fetchQuestions(question.trim(), language, options.fetcher ?? fetch, options.timeoutMs ?? CONTEXT_INTAKE_CLIENT_TIMEOUT_MS)
  prepared.set(key, job)
  return job
}

