/**
 * 前端 → 自家后端。浏览器**永远不直接访问 api.deepseek.com**，
 * 也不持有任何密钥相关配置 —— 这里只有一个相对路径 `/api/tarot/reading`。
 *
 * 【本地兜底的边界】
 * 只有在「完全连不上后端」（fetch 抛错 / 404 / 返回的不是 JSON）时才退回本地 Mock，
 * 目的是让 `npm run dev` 不启动后端也能开发 UI。
 *
 * **业务级错误一律不兜底**（401 / 403 / 429 / 5xx / 超时 / Schema 失败）——
 * 那些必须让用户看见真实错误并可以重试。否则 Key 配错会被静默掩盖成
 * 「解读出来了」，而用户看到的其实是本地假数据，这比报错糟糕得多。
 *
 * 生产构建下本地兜底默认关闭，避免线上把 Mock 文案当成真解读。
 */

import type {
  ReadingConfigResponse,
  ReadingError,
  ReadingErrorCode,
  ReadingRequest,
  ReadingResponse,
  StructuredReading,
} from '@/types/reading'
import { localMockReading } from './mockProvider'

export interface ReadingOutcome {
  reading: StructuredReading
  /** 本地兜底产出的解读，UI 需要如实标注 */
  localFallback: boolean
}

export class ReadingRequestError extends Error {
  code: ReadingErrorCode
  retryable: boolean
  canFallbackToMock: boolean

  constructor(error: ReadingError) {
    super(error.message)
    this.code = error.code
    this.retryable = error.retryable
    this.canFallbackToMock = error.canFallbackToMock
  }
}

/** fetch 本身失败 / 后端不存在 —— 与「后端明确返回了错误」区分开 */
class BackendUnreachable extends Error {}

const ALLOW_LOCAL_FALLBACK = import.meta.env.DEV

export async function fetchReadingConfig(): Promise<ReadingConfigResponse | null> {
  try {
    const res = await fetch('/api/tarot/config', { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return (await res.json()) as ReadingConfigResponse
  } catch {
    return null
  }
}

export async function requestReading(
  request: ReadingRequest,
  signal?: AbortSignal,
): Promise<ReadingOutcome> {
  let res: Response
  try {
    res = await fetch('/api/tarot/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) throw err
    throw new BackendUnreachableWithFallback(request)
  }

  // 后端根本没挂上（例如只跑了 vite）：404 或返回 HTML
  const contentType = res.headers.get('content-type') ?? ''
  if (res.status === 404 || !contentType.includes('application/json')) {
    throw new BackendUnreachableWithFallback(request)
  }

  let payload: ReadingResponse
  try {
    payload = (await res.json()) as ReadingResponse
  } catch {
    throw new BackendUnreachableWithFallback(request)
  }

  if (!payload.ok) throw new ReadingRequestError(payload.error)
  return { reading: payload.reading, localFallback: false }
}

/**
 * 「连不上后端」这一种情况在开发期直接就地降级，不抛给调用方。
 * 用一个自定义 Error 承载，是为了让降级逻辑集中在这个文件里。
 */
class BackendUnreachableWithFallback extends BackendUnreachable {
  request: ReadingRequest
  constructor(request: ReadingRequest) {
    super('未连接解读服务')
    this.request = request
  }
}

/** 供 hook 使用：把「连不上后端」转成本地兜底结果，其余错误原样抛出 */
export async function requestReadingWithFallback(
  request: ReadingRequest,
  signal?: AbortSignal,
): Promise<ReadingOutcome> {
  try {
    return await requestReading(request, signal)
  } catch (err) {
    if (err instanceof BackendUnreachable && ALLOW_LOCAL_FALLBACK) {
      return { reading: localMockReading(request), localFallback: true }
    }
    if (err instanceof BackendUnreachable) {
      throw new ReadingRequestError({
        code: 'network-error',
        message: '没有连上解读服务。这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。',
        retryable: true,
        canFallbackToMock: false,
      })
    }
    throw err
  }
}
