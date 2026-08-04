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
