/**
 * 错误目录。
 *
 * 【一条硬规则贯穿全部错误】
 * 没有任何一种错误可以导致重新抽牌。用户抽出的牌保存在浏览器的 session 里，
 * 服务端从头到尾不碰它 —— 服务端唯一能做的就是「这次解读没成功」。
 * 所以每条文案都在向用户重申：牌还在。
 */

import type { ReadingError, ReadingErrorCode } from '../src/types/reading.ts'

/** 统一的失败提示。用户需要立刻确认的第一件事就是「我的牌没丢」。 */
export const CARDS_KEPT_NOTICE =
  '这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。'

interface ErrorSpec {
  status: number
  message: string
  retryable: boolean
  canFallbackToMock: boolean
}

const CATALOG: Record<ReadingErrorCode, ErrorSpec> = {
  'missing-api-key': {
    status: 503,
    message: `解读服务还没有配置好（缺少 API Key）。${CARDS_KEPT_NOTICE}`,
    retryable: false,
    canFallbackToMock: true,
  },
  unauthorized: {
    status: 502,
    message: `解读服务的密钥无效或已过期。${CARDS_KEPT_NOTICE}`,
    retryable: false,
    canFallbackToMock: true,
  },
  forbidden: {
    status: 502,
    message: `解读服务拒绝了这次请求。${CARDS_KEPT_NOTICE}`,
    retryable: false,
    canFallbackToMock: true,
  },
  'rate-limited': {
    status: 429,
    message: `请求有点频繁，稍等一下再试。${CARDS_KEPT_NOTICE}`,
    retryable: true,
    canFallbackToMock: true,
  },
  'upstream-error': {
    status: 502,
    message: CARDS_KEPT_NOTICE,
    retryable: true,
    canFallbackToMock: true,
  },
  'network-error': {
    status: 502,
    message: `没有连上解读服务。${CARDS_KEPT_NOTICE}`,
    retryable: true,
    canFallbackToMock: true,
  },
  timeout: {
    status: 504,
    message: `这次解读花的时间太长了。${CARDS_KEPT_NOTICE}`,
    retryable: true,
    canFallbackToMock: true,
  },
  'invalid-json': {
    status: 502,
    message: CARDS_KEPT_NOTICE,
    retryable: true,
    canFallbackToMock: true,
  },
  'empty-response': {
    status: 502,
    message: CARDS_KEPT_NOTICE,
    retryable: true,
    canFallbackToMock: true,
  },
  'schema-invalid': {
    status: 502,
    message: CARDS_KEPT_NOTICE,
    retryable: true,
    canFallbackToMock: true,
  },
  'bad-request': {
    status: 400,
    message: `这次解读的请求不完整。${CARDS_KEPT_NOTICE}`,
    retryable: false,
    canFallbackToMock: false,
  },
  unknown: {
    status: 500,
    message: CARDS_KEPT_NOTICE,
    retryable: true,
    canFallbackToMock: true,
  },
}

export function readingError(code: ReadingErrorCode, detail?: string): ReadingError {
  const spec = CATALOG[code]
  return {
    code,
    message: spec.message,
    retryable: spec.retryable,
    canFallbackToMock: spec.canFallbackToMock,
    ...(detail ? { detail } : {}),
  }
}

export function statusFor(code: ReadingErrorCode): number {
  return CATALOG[code].status
}

/** 上游 HTTP 状态 → 我们的错误码 */
export function mapUpstreamStatus(status: number): ReadingErrorCode {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 429) return 'rate-limited'
  if (status >= 500) return 'upstream-error'
  return 'upstream-error'
}
