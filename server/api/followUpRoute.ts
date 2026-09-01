/**
 * POST /api/tarot/followup —— 对一次已完成抽牌的追问
 *
 * ══════════════════════════════════════════════════════════════
 * 【这条路由为什么存在】
 * V2 把「追问接 LLM」收进 Backlog，重启条件是：
 * 单次解读的语气红线与 Schema 校验在真实流量下稳定，
 * 且追问被设计为「单轮、无累积、Context 仍受 AC-12 限制」。
 * D2 满足这三条后开启，AC-V2-15 已同步改写。
 *
 * 【无 Key 时刻意不在服务端兜底】
 * 规则式的 `answerFollowUp` 住在客户端（`src/features/reading/followUp.ts`）。
 * 把它搬进服务端要么跨层 import 客户端模块，要么复制一份 —— 两条都不好。
 * 所以这里如实返回 `missing-api-key`，由客户端回落到本地规则式回答。
 * 「克隆下来直接能跑」因此不依赖服务端有没有 Key（GV2-09）。
 *
 * 【与解读共用的部分，一行都不重写】
 * 上下文重建走 `rebuildContext`（同一份 78 张牌，客户端牌义一律不采信）；
 * 上游调用走 `callDeepSeek`（同一套超时/中断/截断/空响应处理）；
 * 出站文本过 `checkText`（同一套语气红线）。
 * ══════════════════════════════════════════════════════════════
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type {
  FollowUpRequest,
  FollowUpResponse,
  ReadingRequest,
} from '../../src/types/reading.ts'
import { config } from '../env.ts'
import { callDeepSeek, UpstreamFailure } from '../providers/deepseek.ts'
import { buildFollowUpMessages } from '../prompts/followUpPrompt.ts'
import { ContextError, rebuildContext } from '../context/rebuild.ts'
import { readingError, statusFor } from '../errors.ts'
import { readJsonBody, sendJson, tooManyRequests } from '../http.ts'
import { blockingViolations, checkText, summarizeViolations } from '../validation/toneGuard.ts'
import { parseWithRepair } from '../validation/jsonRepair.ts'

/** 追问长度上限。不是为了省 token —— 是不让这个入口变成通用输入框 */
const MAX_ASK = 300

function bad(res: ServerResponse, detail: string): void {
  sendJson(res, statusFor('bad-request'), {
    ok: false,
    error: readingError('bad-request', detail),
  } satisfies FollowUpResponse)
}

export async function handleFollowUp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (tooManyRequests(req)) {
    sendJson(res, statusFor('rate-limited'), {
      ok: false,
      error: readingError('rate-limited'),
    } satisfies FollowUpResponse)
    return
  }

  let raw: unknown
  try {
    raw = await readJsonBody(req)
  } catch (err) {
    bad(res, err instanceof Error ? err.message : '请求体无法解析')
    return
  }

  const body = raw as FollowUpRequest
  const ask = typeof body?.ask === 'string' ? body.ask.trim() : ''
  if (!ask) {
    bad(res, '追问内容为空')
    return
  }
  if (ask.length > MAX_ASK) {
    bad(res, `追问过长（${ask.length} > ${MAX_ASK}）`)
    return
  }

  /* 服务端用自己那份牌重建上下文。
     追问没有 mode / theme / readingMode 的概念，这里给固定值 ——
     它们只影响解读的体裁，对追问无意义。 */
  let context
  try {
    context = rebuildContext({
      sessionId: body.sessionId,
      question: body.question ?? '',
      mode: 'question',
      theme: null,
      spreadId: body.spreadId,
      cards: body.cards,
      readingMode: 'standard',
    } as ReadingRequest)
  } catch (err) {
    bad(res, err instanceof ContextError ? err.message : '请求内容非法')
    return
  }

  if (!config.ready) {
    // 如实说缺 Key，客户端据此回落到本地规则式回答
    sendJson(res, statusFor('missing-api-key'), {
      ok: false,
      error: readingError('missing-api-key'),
    } satisfies FollowUpResponse)
    return
  }

  const digest = body.readingDigest ?? { headline: '', summary: '', answer: '' }
  const messages = buildFollowUpMessages(context, ask, digest)

  let content: string
  try {
    // thinking 传 {}：追问是一段话，不需要推理模式，也不该让用户等两分钟
    content = await callDeepSeek(messages, {})
  } catch (err) {
    if (err instanceof UpstreamFailure) {
      sendJson(res, statusFor(err.code), {
        ok: false,
        error: readingError(err.code, err.detail),
      } satisfies FollowUpResponse)
      return
    }
    sendJson(res, statusFor('upstream-error'), {
      ok: false,
      error: readingError('upstream-error'),
    } satisfies FollowUpResponse)
    return
  }

  /* 走与解读同一套 JSON 修复：模型偶尔会带代码块围栏或尾逗号，
     为这一种情况单独写一个 parser 只会两份行为不一致 */
  const parsed = parseWithRepair(content)
  const answer =
    parsed && typeof (parsed.value as { answer?: unknown })?.answer === 'string'
      ? ((parsed.value as { answer: string }).answer).trim()
      : ''
  if (!answer) {
    sendJson(res, statusFor('invalid-json'), {
      ok: false,
      error: readingError('invalid-json', '追问回答不是预期结构'),
    } satisfies FollowUpResponse)
    return
  }

  /* 语气红线。解读违规时可以降级到本地示例解读，追问不行 ——
     追问没有「另一份等价内容」可换，所以违规就是失败，绝不把违规文本送出去（GV2-12）。 */
  const violations = blockingViolations(checkText('followUp.answer', answer))
  if (violations.length > 0) {
    sendJson(res, statusFor('schema-invalid'), {
      ok: false,
      error: readingError('schema-invalid', `语气红线：${summarizeViolations(violations)}`),
    } satisfies FollowUpResponse)
    return
  }

  sendJson(res, 200, { ok: true, answer, provider: 'deepseek' } satisfies FollowUpResponse)
}
