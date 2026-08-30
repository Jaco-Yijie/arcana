/**
 * 一次解读的完整生成流程 —— 路由和稳定性测试共用同一份。
 *
 * 【为什么要单独抽出来】
 * V2.4 要用 20 次真实调用来验收 Deep 的稳定性。
 * 如果测试脚本自己复制一份重试逻辑，测的就不是线上真正跑的东西了；
 * 以后改了路由忘了改脚本，测试还会一路绿。所以只留一份实现。
 *
 * 【重试策略：最多一次，且什么都不许换】
 * 重试复用同一个 `context` 对象 —— 问题、牌阵、每张牌的 cardId、正逆位、牌位、
 * readingMode 全部原样。这里没有任何随机数，也没有任何分支能：
 *   · 重新抽牌
 *   · 把 deep 换成 standard
 *   · 把 deep 换成 mock
 * 两次都失败就如实报失败，牌留在前端由用户决定下一步。
 */

import type { ReadingContext, StructuredReading } from '../../src/types/reading.ts'
import { config } from '../env.ts'
import { buildMessages, resolveVersion } from '../prompts/index.ts'
import { StreamFailure, streamCompletion } from '../providers/stream.ts'
import {
  SchemaError,
  assembleReading,
  extractJsonObjectDetailed,
  validateReading,
} from '../validation/readingSchema.ts'
import { blockingViolations, checkTone } from '../validation/toneGuard.ts'

export interface GenerateHooks {
  /** 模型开始思考（只是状态，不含任何思考内容） */
  onReasoningStart?: () => void
  /** 正文增量 */
  onContent?: (delta: string) => void
  /** 第一次失败、即将重试。前端收到后应清掉已展示的片段。 */
  onRestart?: (reason: string) => void
}

export interface AttemptRecord {
  ok: boolean
  /** 失败类型，成功时为 null */
  failure: string | null
  detail: string | null
  ms: number
  /** 是否动用了 JSON 修复 */
  repaired: boolean
  fixes: string[]
  chars: number
  usage: {
    inputTokens: number | null
    outputTokens: number | null
    reasoningTokens: number | null
  } | null
  firstContentMs: number | null
}

export interface GenerateOutcome {
  reading: StructuredReading | null
  /** 每一次尝试的明细，长度 1 或 2 */
  attempts: AttemptRecord[]
  /** 最终失败时的错误，成功时为 null */
  error: unknown
}

/** 值得再试一次的，都是模型侧偶发问题；配置错误、鉴权失败重试也没用。 */
export function isTransient(err: unknown): boolean {
  return (
    (err instanceof StreamFailure &&
      ['empty-response', 'invalid-json', 'timeout', 'upstream-error', 'network-error'].includes(
        err.code,
      )) ||
    err instanceof SchemaError
  )
}

function failureName(err: unknown): string {
  if (err instanceof StreamFailure) return err.code
  if (err instanceof SchemaError) {
    return err.message.includes('语气') ? 'tone-blocked' : 'schema-invalid'
  }
  return 'unknown'
}

async function attempt(
  context: ReadingContext,
  startedAt: number,
  hooks: GenerateHooks,
): Promise<{ reading: StructuredReading; record: AttemptRecord }> {
  const t0 = Date.now()
  let repaired = false
  let fixes: string[] = []
  let chars = 0
  let usage: AttemptRecord['usage'] = null
  let firstContentMs: number | null = null

  try {
    const result = await streamCompletion(context, buildMessages(context), {
      onReasoningStart: hooks.onReasoningStart,
      onContent: (delta) => hooks.onContent?.(delta),
    })
    chars = result.content.length
    usage = result.usage
    firstContentMs = result.firstContentMs

    const extracted = extractJsonObjectDetailed(result.content)
    repaired = extracted.repaired
    fixes = extracted.fixes

    const outcome = validateReading(extracted.value, context)
    const reading = assembleReading(
      { ...outcome, repaired: outcome.repaired || extracted.repaired },
      context,
      {
        provider: 'deepseek',
        model: config.model,
        generatedAt: Date.now(),
        latencyMs: Date.now() - startedAt,
        toneAdjusted: false,
        readingMode: context.readingMode,
        promptVersion: resolveVersion(),
      },
    )

    // 只有 block 级才作废；warn 级放行（分级理由见 toneGuard）
    const violations = blockingViolations(checkTone(reading))
    if (violations.length > 0) {
      throw new SchemaError(
        `解读措辞未能通过语气校验：${violations.map((v) => v.ruleId).join(', ')}`,
      )
    }

    return {
      reading,
      record: {
        ok: true,
        failure: null,
        detail: null,
        ms: Date.now() - t0,
        repaired,
        fixes,
        chars,
        usage,
        firstContentMs,
      },
    }
  } catch (err) {
    const record: AttemptRecord = {
      ok: false,
      failure: failureName(err),
      detail: err instanceof Error ? err.message : String(err),
      ms: Date.now() - t0,
      repaired,
      fixes,
      chars,
      usage,
      firstContentMs,
    }
    // 把明细挂在错误上，让上层不用再解析一遍
    ;(err as { attemptRecord?: AttemptRecord }).attemptRecord = record
    throw err
  }
}

/**
 * 生成一次解读，失败时自动重试**最多一次**。
 * 不抛异常 —— 结果全在 `GenerateOutcome` 里，方便测试统计。
 */
export async function generateStructuredReading(
  context: ReadingContext,
  hooks: GenerateHooks = {},
): Promise<GenerateOutcome> {
  const startedAt = Date.now()
  const attempts: AttemptRecord[] = []

  const recordOf = (err: unknown): AttemptRecord =>
    (err as { attemptRecord?: AttemptRecord }).attemptRecord ?? {
      ok: false,
      failure: failureName(err),
      detail: err instanceof Error ? err.message : String(err),
      ms: 0,
      repaired: false,
      fixes: [],
      chars: 0,
      usage: null,
      firstContentMs: null,
    }

  try {
    const first = await attempt(context, startedAt, hooks)
    attempts.push(first.record)
    return { reading: first.reading, attempts, error: null }
  } catch (firstErr) {
    attempts.push(recordOf(firstErr))
    if (!isTransient(firstErr)) {
      return { reading: null, attempts, error: firstErr }
    }

    hooks.onRestart?.(failureName(firstErr))

    try {
      const second = await attempt(context, startedAt, hooks)
      attempts.push(second.record)
      return { reading: second.reading, attempts, error: null }
    } catch (secondErr) {
      attempts.push(recordOf(secondErr))
      return { reading: null, attempts, error: secondErr }
    }
  }
}
