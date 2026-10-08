/**
 * POST /api/tarot/context-questions —— 解读前的可选背景选择题
 *
 * 无论成功失败都返回 JSON。客户端对「ok=false」与「questions=[]」的处理完全相同：
 * 直接进入原本的抽牌流程，不提示、不阻断（见 server/intake/contextIntake.ts）。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ContextIntakeRequest, ContextIntakeResponse } from '../../src/types/reading.ts'
import { normalizeLanguage } from '../i18n.ts'
import { readJsonBody, sendJson, tooManyRequests } from '../http.ts'
import { INTAKE_MAX_QUESTION_CHARS, generateContextQuestions } from '../intake/contextIntake.ts'

export async function handleContextQuestions(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (tooManyRequests(req)) {
    sendJson(res, 429, { ok: false, reason: 'rate-limited', latencyMs: 0 } satisfies ContextIntakeResponse)
    return
  }

  let body: ContextIntakeRequest
  try {
    body = (await readJsonBody(req)) as ContextIntakeRequest
  } catch {
    sendJson(res, 400, { ok: false, reason: 'bad-request', latencyMs: 0 } satisfies ContextIntakeResponse)
    return
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : ''
  if (!question || question.length > INTAKE_MAX_QUESTION_CHARS) {
    sendJson(res, 400, { ok: false, reason: 'bad-request', latencyMs: 0 } satisfies ContextIntakeResponse)
    return
  }

  const outcome = await generateContextQuestions(question, normalizeLanguage(body.language))
  if (outcome.reason) {
    /* 静默记录，不带问题原文 —— 日志里不留用户的私人问题 */
    console.warn(`[arcana] context intake skipped: ${outcome.reason} (${outcome.latencyMs}ms)`)
    sendJson(res, 200, { ok: false, reason: outcome.reason, latencyMs: outcome.latencyMs } satisfies ContextIntakeResponse)
    return
  }
  if (outcome.dropped.length > 0) {
    console.warn(`[arcana] context intake dropped ${outcome.dropped.length} question(s)`)
  }
  sendJson(res, 200, { ok: true, questions: outcome.questions, latencyMs: outcome.latencyMs } satisfies ContextIntakeResponse)
}
