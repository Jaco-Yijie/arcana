/**
 * DeepSeekReadingProvider。
 *
 * 【它只解释，不抽牌】
 * 输入 `ReadingContext` 里的牌是用户自己抽的、已经冻结的事实。
 * 输出经过 `validateReading` 逐张比对 —— 模型只要改了牌数、牌、朝向，整份作废。
 *
 * 【为什么这里有这么多防御】
 * DeepSeek 只支持 `json_object`，不支持 JSON Schema；官方还明确提示过
 * 「可能偶尔返回空 content」。所以 API 只保证「是个合法 JSON」，
 * 剩下的一切正确性都得我们自己扛。
 */

import type { ReadingContext, StructuredReading } from '../../src/types/reading.ts'
import type { ProviderResult, ReadingProvider } from './types.ts'
import { config } from '../env.ts'
import { mapUpstreamStatus, readingError } from '../errors.ts'
import {
  SchemaError,
  assembleReading,
  extractJsonObject,
  validateReading,
} from '../validation/readingSchema.ts'
import { buildMessages, resolveVersion } from '../prompts/index.ts'
import { blockingViolations, checkTone, summarizeViolations } from '../validation/toneGuard.ts'
import { thinkingParamFor } from './stream.ts'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 只对「再试一次可能就好了」的错误重试。401/403 这种再试一百次也一样。
 *
 * **timeout 刻意不在其中**：单次超时就是 180s，自动重试意味着用户要干等 6 分钟
 * 才收到一个失败。超时了就如实告诉他，把「要不要再等一次」的决定权交回给他。
 */
const TRANSIENT = new Set(['upstream-error', 'network-error', 'empty-response'])

const RETRY_DELAY_MS = 800

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

type FailureCode = Parameters<typeof readingError>[0]

/** 不用构造函数参数属性 —— tsconfig 开了 `erasableSyntaxOnly`，那是不可擦除语法 */
class UpstreamFailure extends Error {
  code: FailureCode
  detail?: string
  constructor(code: FailureCode, detail?: string) {
    super(detail ?? code)
    this.code = code
    this.detail = detail
  }
}

interface ChatCompletion {
  choices?: {
    finish_reason?: string
    message?: { content?: unknown; reasoning_content?: unknown }
  }[]
  usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } }
}

async function callDeepSeek(
  messages: ChatMessage[],
  thinking: Record<string, unknown>,
): Promise<string> {
  if (!config.apiKey) throw new UpstreamFailure('missing-api-key')

  // 自己持有 controller，才能在 catch 里分辨「超时中断」与「响应本身有问题」。
  // 用 AbortSignal.timeout 的话，中断发生在读 body 阶段时，
  // response.json() 会抛一个普通错误，被误判成 invalid-json —— 真正的超时就被掩盖了。
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  try {
    let response: Response
    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          // DeepSeek 只有这一种结构化模式，没有 schema 可用
          response_format: { type: 'json_object' },
          temperature: config.temperature,
          // 【关键】v4-pro 是推理模型，max_tokens 把 reasoning_tokens 也算进去。
          // 实测一次三张牌的解读：推理 ~2100 + 正文 ~1700 = 3800+，
          // 给 4000 会正好在 JSON 写到一半时截断，表现为「上游响应不是合法 JSON」。
          max_tokens: config.maxTokens,
          // standard → 关闭推理（首个正文 1.1s）；deep → 开启（更充分但更慢）
          ...thinking,
          stream: false,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) throw new UpstreamFailure('timeout')
      const name = err instanceof Error ? err.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') throw new UpstreamFailure('timeout')
      throw new UpstreamFailure('network-error')
    }

    if (!response.ok) {
      // 刻意不把上游报文塞进 detail —— 它可能包含账号相关信息
      throw new UpstreamFailure(mapUpstreamStatus(response.status), `上游返回 ${response.status}`)
    }

    let payload: ChatCompletion
    try {
      payload = (await response.json()) as ChatCompletion
    } catch {
      // 读 body 期间被超时中断，也会走到这里 —— 必须还原成 timeout
      if (controller.signal.aborted) throw new UpstreamFailure('timeout')
      throw new UpstreamFailure('invalid-json', '上游响应不是 JSON')
    }

    const choice = payload.choices?.[0]
    const content = choice?.message?.content

    // 被 max_tokens 截断：JSON 一定不完整，直接按截断报，别让它去 JSON.parse 白撞一次
    if (choice?.finish_reason === 'length') {
      const reasoning = payload.usage?.completion_tokens_details?.reasoning_tokens ?? 0
      throw new UpstreamFailure(
        'invalid-json',
        `输出被 max_tokens=${config.maxTokens} 截断（其中推理占用 ${reasoning}）`,
      )
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      // 官方文档明确提到过这种情况，所以它是一等错误码而不是意外。
      // 注意：reasoning_content 有内容而 content 为空也算空响应 —— 我们要的是正文。
      throw new UpstreamFailure('empty-response')
    }
    return content
  } finally {
    clearTimeout(timer)
  }
}

export class DeepSeekReadingProvider implements ReadingProvider {
  readonly id = 'deepseek' as const
  readonly model = config.model

  async generate(context: ReadingContext): Promise<ProviderResult> {
    const startedAt = Date.now()
    // buildMessages 保证：重试时牌面部分逐字不变，纠正要求只作为追加约束附在末尾（AC-V2-06）
    const base: ChatMessage[] = buildMessages(context)
    const thinking = thinkingParamFor(context.readingMode)
    const promptVersion = resolveVersion()

    let attempt = 0
    let toneAdjusted = false
    let messages = base
    let lastCode: Parameters<typeof readingError>[0] = 'unknown'
    let lastDetail: string | undefined

    // 最多 2 轮：第 1 轮正常，第 2 轮是对可恢复问题（含语气违规）的纠正重试
    while (attempt < 2) {
      attempt += 1
      try {
        const content = await callDeepSeek(messages, thinking)
        const parsed = extractJsonObject(content)
        const outcome = validateReading(parsed, context)

        const reading: StructuredReading = assembleReading(outcome, context, {
          provider: 'deepseek',
          model: config.model,
          generatedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          toneAdjusted,
          readingMode: context.readingMode,
          promptVersion,
        })

        // 语气红线：命中就带着具体违规词再要求它改一次
        // 只有 block 级才作废；warn 级记录但放行（见 toneGuard 的分级说明）
        const violations = blockingViolations(checkTone(reading))
        if (violations.length > 0 && attempt < 2) {
          toneAdjusted = true
          messages = buildMessages(
            context,
            { extraInstruction: `注意：上一次输出里出现了不该用的确定性或空洞表达：${summarizeViolations(violations)}\n请保持牌面判断与结构不变，只把这些措辞改写成更克制、可保留余地的说法，重新输出完整的 json。` },
          )
          continue
        }

        if (violations.length > 0) {
          // 第二次仍然违规。不把违规文本送到前端，但也不能让用户等了一两分钟后一无所获 ——
          // 交给上层换成本地示例解读（会如实标注 provider=mock）。
          console.warn(
            '[arcana] 语气校验二次未通过，降级为本地示例解读。命中：',
            violations.map((v) => `${v.field}「${v.phrase}」…${v.excerpt}…`).join(' / '),
          )
          return {
            ok: false,
            error: readingError('schema-invalid', '解读措辞未能通过语气校验'),
            degradeToMock: true,
          }
        }

        return { ok: true, reading }
      } catch (err) {
        if (err instanceof UpstreamFailure) {
          lastCode = err.code
          lastDetail = err.detail
        } else if (err instanceof SchemaError) {
          lastCode = 'schema-invalid'
          lastDetail = err.message
        } else {
          lastCode = 'unknown'
          lastDetail = err instanceof Error ? err.message : undefined
        }

        const canRetry = TRANSIENT.has(lastCode) || lastCode === 'schema-invalid'
        if (!canRetry || attempt >= 2) break
        await sleep(RETRY_DELAY_MS)
        messages = base
      }
    }

    return { ok: false, error: readingError(lastCode, lastDetail) }
  }
}
