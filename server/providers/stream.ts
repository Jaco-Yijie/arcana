/**
 * DeepSeek 流式调用。
 *
 * 【为什么要流式】
 * 性能调查（docs/v2/14-perf-investigation.md）测出：总时长里绝大部分是模型生成，
 * 输入处理不到 1 秒。所以真正能改善体验的不是「让它更快」，
 * 而是**让用户尽早看到已经生成的部分**。
 *
 * 【reasoning_content 永远不外传】
 * DeepSeek 的 delta 里 `reasoning_content` 与 `content` 是分开的字段。
 * 我们只累积和转发 `content` —— 模型的思考过程不展示给用户，
 * 也不拿它去伪造任何进度。
 *
 * 【校验时机没有放松】
 * 逐 chunk 只是**传输**，`extractJsonObject` → `validateReading` → `checkTone`
 * 仍然在流结束后一次性执行。JSON 没写完就无法比对牌面，
 * 而「模型改了牌就整份作废」这条不能为了体验让步。
 */

import type { ReadingContext, ReadingMode } from '../../src/types/reading.ts'
import { config } from '../env.ts'
import type { PromptMessage } from '../prompts/index.ts'

/** standard → 关闭推理；deep → 开启推理。这是模式的技术映射。 */
export function thinkingParamFor(mode: ReadingMode): Record<string, unknown> {
  return mode === 'deep'
    ? { thinking: { type: 'enabled' } }
    : { thinking: { type: 'disabled' } }
}

export interface StreamEvents {
  /** 只在收到**正文** chunk 时触发。reasoning 不会走到这里。 */
  onContent?: (delta: string, accumulated: string) => void
  /** 模型开始思考（deep 模式用来切换加载文案，不携带任何思考内容） */
  onReasoningStart?: () => void
}

export interface StreamResult {
  content: string
  finishReason: string | null
  status: number
  usage: {
    inputTokens: number | null
    outputTokens: number | null
    reasoningTokens: number | null
  }
  firstContentMs: number | null
  totalMs: number
}

export class StreamFailure extends Error {
  code: string
  status: number
  constructor(code: string, status = 0, message?: string) {
    super(message ?? code)
    this.code = code
    this.status = status
  }
}

export async function streamCompletion(
  context: ReadingContext,
  messages: PromptMessage[],
  events: StreamEvents = {},
  signal?: AbortSignal,
): Promise<StreamResult> {
  if (!config.apiKey) throw new StreamFailure('missing-api-key')

  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs)
  signal?.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    let res: Response
    try {
      res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
          ...thinkingParamFor(context.readingMode),
        }),
        signal: controller.signal,
      })
    } catch {
      throw new StreamFailure(controller.signal.aborted ? 'timeout' : 'network-error')
    }

    if (!res.ok || !res.body) {
      const code =
        res.status === 401
          ? 'unauthorized'
          : res.status === 403
            ? 'forbidden'
            : res.status === 429
              ? 'rate-limited'
              : 'upstream-error'
      throw new StreamFailure(code, res.status, `上游返回 ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let finishReason: string | null = null
    let firstContentMs: number | null = null
    let reasoningNotified = false
    const usage: StreamResult['usage'] = {
      inputTokens: null,
      outputTokens: null,
      reasoningTokens: null,
    }

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') continue

        let chunk: Record<string, unknown>
        try {
          chunk = JSON.parse(payload)
        } catch {
          continue
        }

        const u = chunk.usage as Record<string, unknown> | undefined
        if (u) {
          usage.inputTokens = (u.prompt_tokens as number) ?? null
          usage.outputTokens = (u.completion_tokens as number) ?? null
          const d = u.completion_tokens_details as Record<string, number> | undefined
          usage.reasoningTokens = d?.reasoning_tokens ?? null
        }

        const choice = (chunk.choices as Record<string, unknown>[] | undefined)?.[0]
        if (!choice) continue
        if (choice.finish_reason) finishReason = String(choice.finish_reason)

        const delta = choice.delta as Record<string, unknown> | undefined
        if (!delta) continue

        // 只通知「开始思考了」，绝不转发思考内容
        if (delta.reasoning_content && !reasoningNotified) {
          reasoningNotified = true
          events.onReasoningStart?.()
        }

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          if (firstContentMs === null) firstContentMs = Date.now() - started
          content += delta.content
          events.onContent?.(delta.content, content)
        }
      }
    }

    if (finishReason === 'length') {
      throw new StreamFailure('invalid-json', 0, `输出被 max_tokens=${config.maxTokens} 截断`)
    }
    if (content.trim().length === 0) {
      throw new StreamFailure('empty-response')
    }

    return {
      content,
      finishReason,
      status: res.status,
      usage,
      firstContentMs,
      totalMs: Date.now() - started,
    }
  } finally {
    clearTimeout(timer)
  }
}
