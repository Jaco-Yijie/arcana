/**
 * 解读状态机。
 *
 * 【它绝不碰牌】
 * 本 hook 只读 session 里已经冻结的牌来组装请求。失败、重试、降级三条路径
 * 都不会写 `deck` / `placements` / `revealed` —— 用户的牌在整个过程中原样不动。
 *
 * 【Retry 为什么能「逐字节相同」】
 * 请求体由 `buildReadingRequest(session, spread)` 纯函数生成，零随机、零时间戳。
 * 重试就是把同一个对象再发一次。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Spread } from '@/types/spread'
import type { TarotSession } from '@/types/session'
import type { ReadingMode, ReadingRequest, StructuredReading } from '@/types/reading'
import { buildReadingRequest, isReadyForReading } from '@/features/reading/buildReadingRequest'
import { ReadingRequestError, requestReadingWithFallback } from '@/features/reading/readingClient'
import { IS_STREAMLIT } from '@/features/reading/streamlitTransport'
import {
  StreamReadingError,
  extractPartial,
  streamReading,
} from '@/features/reading/streamClient'
import type { StreamPhase } from '@/features/reading/streamClient'
import { toLegacyReading } from '@/features/reading/legacyProjection'
import { useSession } from './useSession'

/**
 * 加载阶段文案。
 * **这只是加载态 UI，不是模型真实的思维链** —— 我们无法也没有去窥探模型内部过程，
 * 所以文案写的是「我们这一侧在等什么」，而不是假装在直播模型思考。
 */
export const READING_PHASES = [
  '正在观察整体牌面',
  '正在分析牌与牌之间的关系',
  '正在结合你的问题',
  '正在整理解读',
] as const

/** deep 模式的等待文案 —— 如实说明为什么更久，不假装在直播模型思考 */
export const DEEP_THINKING_HINT = '正在进行更深入的牌面分析，这可能需要一些时间。'

/**
 * 阶段推进间隔。
 * 实测一次真实解读要 60–130s，所以不能每 3 秒跳一格 —— 那样 13 秒就会走完四格，
 * 然后停在最后一句上再干等一分多钟，反而显得卡死了。
 */
const PHASE_INTERVAL_MS = 14_000

/** 超过这个时长就如实告诉用户「这次会久一点」，不要让他以为页面挂了 */
const SLOW_HINT_AFTER_MS = 20_000

export type ReadingStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseReadingResult {
  status: ReadingStatus
  /** 当前加载阶段下标 */
  phase: number
  /** 已经等了多久（秒），用于「这次会久一点」的提示 */
  elapsedSec: number
  slow: boolean
  structured: StructuredReading | null
  error: { message: string; retryable: boolean } | null
  /** 本地兜底产出的解读（未连接解读服务），UI 必须如实标注 */
  localFallback: boolean
  /** 流式：已经写好且可以提前上屏的片段。校验失败时会被清空。 */
  partial: { theme: string | null; energy: string | null }
  /** 流式阶段。deep 模式在推理期间为 thinking。 */
  streamPhase: StreamPhase | null
  retry: () => void
}

export function useReading(
  session: TarotSession | null,
  spread: Spread | null,
  readingMode: ReadingMode = 'standard',
): UseReadingResult {
  const { setReading } = useSession()
  const [status, setStatus] = useState<ReadingStatus>('idle')
  const [phase, setPhase] = useState(0)
  const [error, setError] = useState<UseReadingResult['error']>(null)
  const [localFallback, setLocalFallback] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [partial, setPartial] = useState<{ theme: string | null; energy: string | null }>({
    theme: null,
    energy: null,
  })
  const [streamPhase, setStreamPhase] = useState<StreamPhase | null>(null)

  // 已有解读就不再请求（AC-V2-11：刷新 / 返回都不重新生成）
  const existing = session?.structuredReading ?? null
  const abortRef = useRef<AbortController | null>(null)

  const canRequest =
    session !== null && spread !== null && !existing && isReadyForReading(session, spread)

  /** 请求体只依赖已冻结的 session，且是纯函数产物 —— 重试时逐字节相同 */
  const requestRef = useRef<ReadingRequest | null>(null)
  if (session && spread && !requestRef.current) {
    requestRef.current = buildReadingRequest(session, spread, readingMode)
  }

  useEffect(() => {
    if (!canRequest || !session || !spread) return

    // 刻意不加「只跑一次」的 ref 守卫：
    // React StrictMode 在开发期会 mount → effect → cleanup(abort) → effect 再跑一次，
    // 有守卫的话第二次会被直接 return 掉，而第一次的请求已经被 abort —— 结果就是永远停在加载中。
    // 这里靠 `canRequest`（已有解读就不再请求）与 cleanup 的 abort 来保证不会重复提交。
    // 重试时用同一份 request（含同一个 readingMode），保证 payload 逐字节相同
    const request = requestRef.current ?? buildReadingRequest(session, spread, readingMode)
    requestRef.current = request

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError(null)
    setPhase(0)

    setElapsedSec(0)
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setPhase((p) => Math.min(p + 1, READING_PHASES.length - 1))
    }, PHASE_INTERVAL_MS)
    const ticker = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    void (async () => {
      try {
        // Streamlit 组件形态是一次性往返，不支持流式，走原路径
        const useStream = !IS_STREAMLIT
        let outcome: { reading: StructuredReading; localFallback: boolean }

        if (useStream) {
          setPartial({ theme: null, energy: null })
          const streamed = await streamReading(
            request,
            {
              onPhase: setStreamPhase,
              onRestart: () => setPartial({ theme: null, energy: null }),
              onDelta: (acc) => {
                // 只把**已经闭合**的字段上屏，不显示写到一半的句子
                setPartial({
                  theme: extractPartial(acc, 'readingTheme'),
                  energy: extractPartial(acc, 'overallEnergy'),
                })
              },
            },
            controller.signal,
          )
          outcome = { reading: streamed.reading, localFallback: false }
        } else {
          outcome = await requestReadingWithFallback(request, controller.signal)
        }

        if (controller.signal.aborted) return
        setLocalFallback(outcome.localFallback)
        // 两份都写：V2 供本页渲染，V1 投影供日记摘要 / 详情 / 分享页
        setReading(toLegacyReading(outcome.reading, request, spread), outcome.reading)
        setStatus('success')
      } catch (err) {
        if (controller.signal.aborted) return
        // 校验失败时必须撤回已展示的片段 —— 不能留半截让用户以为那是解读
        setPartial({ theme: null, energy: null })
        const known = err instanceof ReadingRequestError || err instanceof StreamReadingError
        const message = known
          ? (err as Error).message
          : '这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。'
        const retryable = known ? (err as { retryable: boolean }).retryable : true
        setError({ message, retryable })
        setStatus('error')
      } finally {
        window.clearInterval(timer)
        window.clearInterval(ticker)
      }
    })()

    return () => {
      window.clearInterval(timer)
      window.clearInterval(ticker)
      controller.abort()
    }
    // attempt 变化即触发重试
  }, [canRequest, attempt, session, spread, setReading, readingMode])

  const retry = useCallback(() => {
    abortRef.current?.abort()
    setAttempt((n) => n + 1)
  }, [])

  return {
    status: existing ? 'success' : status,
    phase,
    elapsedSec,
    slow: elapsedSec * 1000 >= SLOW_HINT_AFTER_MS,
    structured: existing,
    error,
    localFallback,
    partial,
    streamPhase,
    retry,
  }
}
