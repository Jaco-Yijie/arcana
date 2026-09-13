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
import { IS_STREAMLIT } from './streamlitTransport'
import { translate } from '@/i18n/store'

export interface ReadingOutcome {
  reading: StructuredReading
  /** 本地兜底产出的解读，UI 需要如实标注 */
  localFallback: boolean
}

/**
 * 错误码 → 给用户看的话。
 *
 * 【为什么由前端翻，而不是用服务端返回的 message】
 * 服务端那份 message 是**中文写死**的（server/errors.ts），而且它在
 * 请求解析出 language 之前就可能被构造出来（限流、请求体坏掉）——
 * 服务端根本还不知道该用哪门语言。
 *
 * 错误码才是两侧真正的契约：`code` 稳定、可枚举、与语言无关。
 * 所以文本一律由前端按当前界面语言渲染，服务端的 message 只作为
 * 兜底（新增了码但还没配文案时）与日志线索。
 */
function localizeError(error: ReadingError): string {
  const key = `reading.errorCode.${error.code}`
  const text = translate(key)
  return text === key ? error.message : text
}

export class ReadingRequestError extends Error {
  code: ReadingErrorCode
  retryable: boolean
  canFallbackToMock: boolean

  constructor(error: ReadingError) {
    super(localizeError(error))
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
    super(translate('reading.notice.unreachable'))
    this.request = request
  }
}

/** 供 hook 使用：把「连不上后端」转成本地兜底结果，其余错误原样抛出 */
export async function requestReadingWithFallback(
  request: ReadingRequest,
  signal?: AbortSignal,
): Promise<ReadingOutcome> {
  // Streamlit 形态下没有 /api 路由，走组件通信协议由 Python 代发
  if (IS_STREAMLIT) {
    /* ── 为什么是动态 import ──
       `streamlitReading` 把整条服务端流水线（rebuildContext + Prompt 组装 +
       schema 校验 + 语气红线）拉进浏览器包 —— 那是 Streamlit 形态**独有**的需要，
       独立部署形态下这些逻辑跑在服务端。静态 import 会让所有用户
       为一个他们永远走不到的分支付流量（i18n 之后还多带一份 en-US.json）。
       IS_STREAMLIT 是编译期常量之外的运行期判断，所以只能靠动态 import 切开。 */
    const { StreamlitReadingError, generateViaStreamlit } = await import('./streamlitReading')
    try {
      return { reading: await generateViaStreamlit(request), localFallback: false }
    } catch (err) {
      if (err instanceof StreamlitReadingError) {
        throw new ReadingRequestError({
          code: err.retryable ? 'upstream-error' : 'unauthorized',
          message: err.message,
          retryable: err.retryable,
          canFallbackToMock: true,
        })
      }
      throw new ReadingRequestError({
        code: 'schema-invalid',
        message: translate('reading.error.generic'),
        retryable: true,
        canFallbackToMock: true,
      })
    }
  }

  try {
    return await requestReading(request, signal)
  } catch (err) {
    if (err instanceof BackendUnreachable && ALLOW_LOCAL_FALLBACK) {
      return { reading: localMockReading(request), localFallback: true }
    }
    if (err instanceof BackendUnreachable) {
      throw new ReadingRequestError({
        code: 'network-error',
        message: translate('reading.error.network'),
        retryable: true,
        canFallbackToMock: false,
      })
    }
    throw err
  }
}
