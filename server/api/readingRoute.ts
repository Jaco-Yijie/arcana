/**
 * POST /api/tarot/reading   —— 生成一次结构化解读
 * GET  /api/tarot/config    —— 告诉前端当前用的是哪个 Provider（不含任何密钥信息）
 *
 * 【这里不碰任何与抽牌有关的东西】
 * 请求进来时，牌已经是既成事实。本文件从头到尾没有随机数，
 * 也没有任何路径能改变用户的牌 —— 失败就是失败，牌原样留在浏览器里。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type {
  ReadingConfigResponse,
  ReadingRequest,
  ReadingResponse,
} from '../../src/types/reading.ts'
import { config } from '../env.ts'
import { getProvider } from '../providers/index.ts'
import { MockReadingProvider } from '../providers/mock.ts'
import { ContextError, rebuildContext } from '../context/rebuild.ts'
import { readingError, statusFor } from '../errors.ts'
import { readJsonBody, sendJson, tooManyRequests } from '../http.ts'
import { StreamFailure, streamCompletion } from '../providers/stream.ts'
import { buildMessages, resolveVersion } from '../prompts/index.ts'
import {
  SchemaError,
  assembleReading,
  extractJsonObject,
  validateReading,
} from '../validation/readingSchema.ts'
import { blockingViolations, checkTone } from '../validation/toneGuard.ts'
import { MockReadingProvider as _Mock } from '../providers/mock.ts'
void _Mock

export async function handleConfig(res: ServerResponse): Promise<void> {
  const body: ReadingConfigResponse = {
    provider: config.ready ? 'deepseek' : 'mock',
    model: config.ready ? config.model : null,
    ready: config.ready,
  }
  sendJson(res, 200, body)
}

export async function handleReading(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (tooManyRequests(req)) {
    const error = readingError('rate-limited')
    sendJson(res, statusFor('rate-limited'), { ok: false, error } satisfies ReadingResponse)
    return
  }

  let raw: unknown
  try {
    raw = await readJsonBody(req)
  } catch (err) {
    const detail = err instanceof Error ? err.message : '请求体无法解析'
    sendJson(res, statusFor('bad-request'), {
      ok: false,
      error: readingError('bad-request', detail),
    } satisfies ReadingResponse)
    return
  }

  // 服务端用自己那份 78 张牌重建上下文；客户端传来的牌义一个字都不采信
  let context
  try {
    context = rebuildContext(raw as ReadingRequest)
  } catch (err) {
    const detail = err instanceof ContextError ? err.message : '请求内容非法'
    sendJson(res, statusFor('bad-request'), {
      ok: false,
      error: readingError('bad-request', detail),
    } satisfies ReadingResponse)
    return
  }

  const provider = getProvider()
  const result = await provider.generate(context)

  if (!result.ok) {
    // 模型给了完整解读但措辞没过关：换本地示例解读，总好过让用户等一两分钟后一无所获。
    // meta.provider 会如实写成 mock，前端据此显示「当前使用本地示例解读」。
    if (result.degradeToMock) {
      const fallback = await new MockReadingProvider().generate(context)
      if (fallback.ok) {
        // 如实写明降级原因：Key 是好的，是模型措辞没过语气红线
        const reading = {
          ...fallback.reading,
          meta: { ...fallback.reading.meta, fallbackReason: 'tone-guard' as const, toneAdjusted: true },
        }
        sendJson(res, 200, { ok: true, reading } satisfies ReadingResponse)
        return
      }
    }
    sendJson(res, statusFor(result.error.code), {
      ok: false,
      error: result.error,
    } satisfies ReadingResponse)
    return
  }

  sendJson(res, 200, { ok: true, reading: result.reading } satisfies ReadingResponse)
}


/**
 * POST /api/tarot/reading/stream —— SSE 流式解读
 *
 * 事件：
 *   phase    { phase: 'thinking' | 'writing' }   仅状态，**不含任何模型思考内容**
 *   delta    { text }                            已生成的正文增量
 *   done     { reading }                         校验通过后的完整结构
 *   failed   { error }                           校验失败或上游错误
 *
 * 注意：`delta` 只是让用户尽早看到东西，**它不是最终结果**。
 * 牌面一致性、结构、语气全部在流结束后一次性校验；
 * 校验不过就发 `failed`，前端必须把已展示的片段撤掉。
 */
export async function handleReadingStream(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (tooManyRequests(req)) {
    sendJson(res, statusFor('rate-limited'), { ok: false, error: readingError('rate-limited') })
    return
  }

  let context
  try {
    const raw = await readJsonBody(req)
    context = rebuildContext(raw as ReadingRequest)
  } catch (err) {
    const detail = err instanceof ContextError ? err.message : '请求内容非法'
    sendJson(res, statusFor('bad-request'), { ok: false, error: readingError('bad-request', detail) })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const startedAt = Date.now()
  send('phase', { phase: context.readingMode === 'deep' ? 'thinking' : 'writing' })

  /**
   * 偶发失败重试一次。
   * A/B 实测 deep 模式 10 次里出现 1 次空响应、1 次结构错误的 JSON ——
   * 都是模型侧偶发，重试一次就能救回来。
   * 代价是用户多等一轮，但比让他看到失败再自己点重试要好。
   */
  const attempt = async () => {
    const result = await streamCompletion(context, buildMessages(context), {
      onReasoningStart: () => send('phase', { phase: 'thinking' }),
      onContent: (delta) => send('delta', { text: delta }),
    })
    return validateReading(extractJsonObject(result.content), context)
  }

  try {
    let outcome
    try {
      outcome = await attempt()
    } catch (first) {
      const transient =
        (first instanceof StreamFailure &&
          ['empty-response', 'invalid-json', 'upstream-error', 'network-error'].includes(first.code)) ||
        first instanceof SchemaError
      if (!transient) throw first
      // 重试前告诉前端把已展示的片段清掉，避免两轮内容拼在一起
      send('restart', {})
      outcome = await attempt()
    }
    const reading = assembleReading(outcome, context, {
      provider: 'deepseek',
      model: config.model,
      generatedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
      toneAdjusted: false,
      readingMode: context.readingMode,
      promptVersion: resolveVersion(),
    })

    // 只有 block 级才作废；warn 级放行（分级理由见 toneGuard）
    const violations = blockingViolations(checkTone(reading))
    if (violations.length > 0) {
      // 流式下不做「带违规词重问一次」——那要用户再等一整轮。
      // 直接判失败，前端撤回已展示片段并允许重试。
      send('failed', { error: readingError('schema-invalid', '解读措辞未能通过语气校验') })
    } else {
      send('done', { reading })
    }
  } catch (err) {
    const code =
      err instanceof StreamFailure
        ? (err.code as Parameters<typeof readingError>[0])
        : err instanceof SchemaError
          ? 'schema-invalid'
          : 'unknown'
    const detail = err instanceof Error ? err.message : undefined
    send('failed', { error: readingError(code, detail) })
  } finally {
    res.end()
  }
}
