/**
 * Streamlit 自定义组件传输层。
 *
 * 【为什么需要它】
 * Streamlit Cloud 只跑 Python，没有地方放我们的 Node 服务，也无法暴露
 * `/api/tarot/reading` 这个路由。所以在 Streamlit 部署形态下，
 * 浏览器与「服务端」之间唯一的通道就是 Streamlit 的组件通信协议（postMessage）。
 *
 * 【职责边界 —— 这一点没有妥协】
 * Python 那一侧**只做一件事：拿着 API Key 转发请求**。
 * 牌义重建、Prompt 组装、结构校验、语气红线全部仍然在 TypeScript 里，
 * 复用 `server/` 下那几个纯逻辑模块，一行都没有重写 ——
 * 两套实现必然漂移，而漂移的那一天没人会发现。
 *
 * 【安全上的退让，如实记录】
 * Prompt 在浏览器侧组装，意味着理论上有人可以改造页面、拿你的 Key 当通用 LLM 用。
 * Python 侧对此做了三道限制：校验 system prompt 指纹、限制 max_tokens、限制频率。
 * 这比不上「Key 完全不可及」的服务端形态，但对「发给朋友试用」这个场景够用。
 * 正式部署仍然应该用 `server/` 那套（见 docs/v2/13-deploy.md）。
 */

import type { ReadingRequest, StructuredReading } from '@/types/reading'

/* ── Streamlit 组件协议（手写，不引 streamlit-component-lib）────────── */

interface StreamlitOutbound {
  isStreamlitMessage: true
  type: string
  [key: string]: unknown
}

function post(message: StreamlitOutbound): void {
  window.parent.postMessage(message, '*')
}

/** 告诉 Streamlit「组件已就绪」，否则它永远不会给我们发 render 事件 */
export function notifyReady(): void {
  post({ isStreamlitMessage: true, type: 'streamlit:componentReady', apiVersion: 1 })
}

/** iframe 高度由组件自己声明。Streamlit 不会自适应内容。 */
export function setFrameHeight(height: number): void {
  post({ isStreamlitMessage: true, type: 'streamlit:setFrameHeight', height })
}

function setComponentValue(value: unknown): void {
  post({
    isStreamlitMessage: true,
    type: 'streamlit:setComponentValue',
    value,
    dataType: 'json',
  })
}

/* ── 请求 / 应答配对 ──────────────────────────────────────────────── */

export interface StreamlitReadingResponse {
  requestId: string
  ok: boolean
  content?: string
  error?: { code: string; message: string }
}

type Pending = {
  resolve: (r: StreamlitReadingResponse) => void
  reject: (e: Error) => void
}

const pending = new Map<string, Pending>()
let listening = false

/**
 * Streamlit 每次 rerun 都会向组件重发 render 事件，args 里带着 Python 的返回。
 * 我们用 requestId 配对，避免把上一次的结果错认成这一次的。
 */
function ensureListener(): void {
  if (listening) return
  listening = true
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; args?: Record<string, unknown> } | null
    if (!data || data.type !== 'streamlit:render') return
    const response = data.args?.response as StreamlitReadingResponse | undefined
    if (!response?.requestId) return
    const waiter = pending.get(response.requestId)
    if (!waiter) return
    pending.delete(response.requestId)
    waiter.resolve(response)
  })
}

/** 判断当前是否跑在 Streamlit 组件里（构建时注入） */
export const IS_STREAMLIT = import.meta.env.VITE_DEPLOY_TARGET === 'streamlit'

/**
 * 把一次解读请求交给 Python 侧转发。
 *
 * 注意超时给到 240s：真实解读实测 60–130s，而 Streamlit 还要多一轮
 * 「组件值 → Python rerun → 回传 args」的往返，比直接 fetch 更慢。
 */
export function requestViaStreamlit(
  messages: { role: string; content: string }[],
  request: ReadingRequest,
  timeoutMs = 240_000,
): Promise<StreamlitReadingResponse> {
  ensureListener()
  const requestId = `${request.sessionId}_${Date.now()}`

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject })
    setComponentValue({ kind: 'reading-request', requestId, messages })

    window.setTimeout(() => {
      if (!pending.has(requestId)) return
      pending.delete(requestId)
      reject(new Error('timeout'))
    }, timeoutMs)
  })
}

export type { StructuredReading }
