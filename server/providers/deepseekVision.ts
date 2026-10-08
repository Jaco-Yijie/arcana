/**
 * DeepSeek 多模态适配器 —— **只给离线批处理用**。
 *
 * 【为什么不复用 providers/deepseek.ts】
 * 那个文件的 `callDeepSeek` 签名是 `messages: {role, content: string}[]`，
 * content 是字符串。多模态请求的 content 是 `{type:'text'|'image_url'}[]` 数组，
 * 类型上就进不去。更重要的是职责不同：它是**用户运行时**的关键路径，
 * 有重试策略、语气红线、降级逻辑，全部围绕「一次解读不能失败」设计。
 * Vision 是开发期批处理：可以失败、可以跳过、可以明天再跑。
 * 把两者塞进一个函数只会让 Reading 那条路变脆。
 *
 * 【模型】
 * 2026-09 实测 `GET /models`：只有 `deepseek-flash`（DeepSeek-V4.1-Flash）
 * 的 input_modalities 含 image；`deepseek-v4-pro` 是纯文本。
 * 所以默认 vision 模型写死 `deepseek-flash`，可用环境变量覆盖。
 * **Reading 与 Intake 的模型配置一个字都没有动。**
 *
 * 【图片怎么传】
 * 仓库里的 .webp 直接读成 base64 data URL，放进 user content。
 * 不放 system —— DeepSeek 的 system 只接受字符串，而且把图片放在指令里
 * 会让「先看图再说话」这条约束失去位置上的意义。
 */

import { readFile } from 'node:fs/promises'
import { config } from '../env.ts'

/** 只有这个模型支持图片输入（2026-09 核实）。Reading / Intake 的模型与它无关 */
export const VISION_MODEL = (process.env.DEEPSEEK_VISION_MODEL ?? '').trim() || 'deepseek-flash'
export const VISION_TIMEOUT_MS = Number(process.env.DEEPSEEK_VISION_TIMEOUT_MS ?? 90_000)
/** 并发。批处理没有必要打满上游，2 是实测稳定且不触发 429 的值 */
export const VISION_CONCURRENCY = Math.max(1, Number(process.env.DEEPSEEK_VISION_CONCURRENCY ?? 2))
/** 完整一条视觉语义约 700–1100 token，2400 留足余量又不至于让坏输出跑很久 */
export const VISION_MAX_TOKENS = Number(process.env.DEEPSEEK_VISION_MAX_TOKENS ?? 2400)

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

export class VisionFailure extends Error {
  code: string
  retryable: boolean
  constructor(code: string, message: string, retryable: boolean) {
    super(message)
    this.code = code
    this.retryable = retryable
  }
}

export interface VisionUsage {
  promptTokens: number
  completionTokens: number
}

export interface VisionResult {
  content: string
  usage: VisionUsage
  latencyMs: number
}

/** 图片 → data URL。批处理里一张图只读一次，不做缓存 —— 内存比省下的 IO 值钱 */
export async function imageToDataUrl(absPath: string): Promise<string> {
  const ext = absPath.slice(absPath.lastIndexOf('.')).toLowerCase()
  const mime = MIME_BY_EXT[ext]
  if (!mime) throw new VisionFailure('unsupported-image', `不支持的图片格式：${ext}`, false)
  const buf = await readFile(absPath)
  return `data:${mime};base64,${buf.toString('base64')}`
}

interface ChatCompletion {
  choices?: { finish_reason?: string; message?: { content?: unknown } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * 一次多模态调用。失败抛 VisionFailure，由调用方决定重试还是记为失败项。
 *
 * 这里刻意不做重试 —— 退避与次数上限属于批处理编排的职责，
 * 放在这一层会让「到底试了几次」变得不可见。
 */
export async function callDeepSeekVision(
  systemPrompt: string,
  userText: string,
  imageDataUrl: string,
  options: { model?: string; maxTokens?: number; timeoutMs?: number } = {},
): Promise<VisionResult> {
  if (!config.apiKey) throw new VisionFailure('missing-api-key', '没有配置 DEEPSEEK_API_KEY', false)

  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? VISION_TIMEOUT_MS)

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
          model: options.model ?? VISION_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userText },
                { type: 'image_url', image_url: { url: imageDataUrl } },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          /* 视觉记录要的是可复现的观察，不是文采。温度压到很低 */
          temperature: 0.2,
          max_tokens: options.maxTokens ?? VISION_MAX_TOKENS,
          /* 关闭推理：这是描述任务，推理只会推高延迟和 token */
          thinking: { type: 'disabled' },
          stream: false,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) throw new VisionFailure('timeout', '视觉分析超时', true)
      const name = err instanceof Error ? err.name : ''
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new VisionFailure('timeout', '视觉分析超时', true)
      }
      throw new VisionFailure('network-error', '没有连上上游', true)
    }

    if (!response.ok) {
      /* 429 与 5xx 值得退避重试；401/403/400 再试一百次也一样 */
      const retryable = response.status === 429 || response.status >= 500
      const code = response.status === 429 ? 'rate-limited' : `http-${response.status}`
      throw new VisionFailure(code, `上游返回 ${response.status}`, retryable)
    }

    let payload: ChatCompletion
    try {
      payload = (await response.json()) as ChatCompletion
    } catch {
      if (controller.signal.aborted) throw new VisionFailure('timeout', '视觉分析超时', true)
      throw new VisionFailure('invalid-json', '上游响应不是 JSON', true)
    }

    const choice = payload.choices?.[0]
    if (choice?.finish_reason === 'length') {
      throw new VisionFailure('truncated', `输出被 max_tokens 截断`, true)
    }
    const content = choice?.message?.content
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new VisionFailure('empty-response', '上游返回空内容', true)
    }

    return {
      content,
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
      },
      latencyMs: Date.now() - startedAt,
    }
  } finally {
    clearTimeout(timer)
  }
}
