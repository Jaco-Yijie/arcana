/**
 * Streamlit 形态下的解读流程。
 *
 * 直接复用 `server/` 下那四个纯逻辑模块（它们零 Node 依赖，浏览器里能跑）：
 *   rebuild.ts            用本地 78 张牌重建可信上下文
 *   tarotReadingPrompt.ts 组装 Prompt
 *   readingSchema.ts      结构校验 + 牌面逐张比对
 *   toneGuard.ts          语气红线
 *
 * 所以「模型改了牌就整份作废」「语气不过关就降级」这些约束在这个形态下**同样成立**，
 * 唯一的区别是 DeepSeek 的 HTTP 调用由 Python 代发。
 */

import type { ReadingRequest, StructuredReading } from '@/types/reading'
import { rebuildContext } from '../../../server/context/rebuild'
import { buildMessages } from '../../../server/prompts/tarotReadingPrompt'
import {
  assembleReading,
  extractJsonObject,
  validateReading,
} from '../../../server/validation/readingSchema'
import { checkTone } from '../../../server/validation/toneGuard'
import { requestViaStreamlit } from './streamlitTransport'
import { localMockReading } from './mockProvider'

export class StreamlitReadingError extends Error {
  retryable: boolean
  constructor(message: string, retryable = true) {
    super(message)
    this.retryable = retryable
  }
}

const FAIL_NOTICE = '这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。'

export async function generateViaStreamlit(request: ReadingRequest): Promise<StructuredReading> {
  const startedAt = Date.now()
  const context = rebuildContext(request)
  const messages = buildMessages(context)

  let response
  try {
    response = await requestViaStreamlit(messages, request)
  } catch {
    throw new StreamlitReadingError(`这次解读花的时间太长了。${FAIL_NOTICE}`)
  }

  if (!response.ok || !response.content) {
    const code = response.error?.code ?? 'unknown'
    // Key 没配 / 无效，重试没有意义
    const fatal = code === 'missing-api-key' || code === 'unauthorized' || code === 'forbidden'
    throw new StreamlitReadingError(
      `${response.error?.message ?? ''}${response.error?.message ? '' : FAIL_NOTICE}`,
      !fatal,
    )
  }

  // 以下与服务端形态完全一致：解析 → 校验牌面 → 语气检查
  const parsed = extractJsonObject(response.content)
  const outcome = validateReading(parsed, context)
  const reading = assembleReading(outcome, context, {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    generatedAt: Date.now(),
    latencyMs: Date.now() - startedAt,
    toneAdjusted: false,
  })

  const violations = checkTone(reading)
  if (violations.length > 0) {
    // 与服务端一致：不把违规文本送出去，降级为本地示例解读并如实标注。
    // 这里不做「带着违规词再问一次」的重试 —— Streamlit 一次往返成本太高，
    // 让用户等两轮 2 分钟不如直接给一份干净的。
    const fallback = localMockReading(request)
    return {
      ...fallback,
      meta: { ...fallback.meta, fallbackReason: 'tone-guard', toneAdjusted: true },
    }
  }

  return reading
}
