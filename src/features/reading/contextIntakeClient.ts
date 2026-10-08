/**
 * 解读前背景提问 —— 客户端
 *
 * ══════════════════════════════════════════════════════════════
 * 【这一步永远不能挡住占卜】
 * 这里返回的 Promise **从不 reject**。无 Key、网络错误、超时、上游错误、
 * 校验后一题不剩 —— 一律得到 []，
 * 调用方拿到 [] 就直接进入原本的牌阵选择，不提示、不打扰。
 *
 * 【两种部署形态】
 * Node      → POST /api/tarot/context-questions
 * Streamlit → 组件 bridge → Python 代发 DeepSeek → 回到浏览器做同一套校验
 * 两条路的 Prompt 与校验是同一份代码（server/intake/contextIntakePipeline.ts），
 * 对调用方而言行为完全一致：拿到题目就显示，拿到 [] 就直接进牌阵。
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

/**
 * 是否 Streamlit 形态。
 *
 * 刻意不从 `streamlitTransport` 引 `IS_STREAMLIT` —— 那个模块直接读
 * `import.meta.env`，在 Node 测试里会炸；这里用可选链自己判断，保持这个文件
 * 在浏览器与 node:test 下都能加载。
 */
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

  const text = question.trim()
  let job: Promise<ContextIntakeQuestion[]>
  if (!text) {
    job = Promise.resolve([])
  } else if (isStreamlit()) {
    /* ── 为什么是动态 import ──
       `streamlitContextIntake` 会把出题 Prompt 与校验器拉进浏览器包 ——
       那是 Streamlit 形态**独有**的需要，Node 形态下这些跑在服务端。
       静态 import 会让所有用户为一个他们永远走不到的分支付流量。
       与 readingClient 对 `streamlitReading` 的处理方式一致。 */
    job = import('./streamlitContextIntake')
      .then((m) => m.generateContextQuestionsViaStreamlit(sessionId, text, language, options.timeoutMs))
      .catch(() => [])
  } else {
    job = fetchQuestions(
      text,
      language,
      options.fetcher ?? fetch,
      options.timeoutMs ?? CONTEXT_INTAKE_CLIENT_TIMEOUT_MS,
    )
  }
  prepared.set(key, job)
  return job
}

