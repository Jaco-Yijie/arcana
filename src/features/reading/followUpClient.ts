/**
 * 追问客户端 —— 真实模型优先，规则式兜底
 *
 * ══════════════════════════════════════════════════════════════
 * 【两条路径，一条契约】
 *   有 Key   → POST /api/tarot/followup → 真实 DeepSeek
 *   无 Key   → 服务端如实返回 missing-api-key → 本地 `answerFollowUp`
 *   连不上   → 同上，本地兜底
 *
 * 「克隆下来直接能跑」这条承诺因此不依赖服务端有没有 Key（GV2-09）。
 * 返回值里带 `provider`，UI 据此决定要不要标注「本地示例回答」——
 * 不标注就是在假装有模型参与，那比没有模型更糟。
 *
 * 【为什么失败不抛错】
 * 追问失败不该让用户什么都拿不到 —— 牌和解读都还在，
 * 规则式回答虽然浅，但它至少是**关于这次抽牌**的。
 * 只有本地兜底也失败（理论上不会）才返回 null。
 * ══════════════════════════════════════════════════════════════
 */

import type { FollowUpRequest, FollowUpResponse, ReadingProviderId } from '@/types/reading'
import type { FollowUpContext } from './followUp'
import { answerFollowUp } from './followUp'

export interface FollowUpResult {
  answer: string
  provider: ReadingProviderId
  /** 真实模型这一次没成功时的原因，如实展示给用户，不静默 */
  degradedReason?: string
}

/** 把 FollowUpContext 投影成传输载荷。**没有 history 字段**，结构上无法多轮 */
export function buildFollowUpRequest(
  sessionId: string,
  context: FollowUpContext,
  ask: string,
): FollowUpRequest {
  const r = context.reading
  return {
    sessionId,
    question: context.question,
    spreadId: context.spreadId,
    cards: context.cards.map((c) => ({
      positionId: c.positionId,
      cardId: c.cardId,
      orientation: c.orientation,
    })),
    ask,
    readingDigest: {
      headline: r.headline?.join(' ') ?? '',
      summary: r.trend ?? '',
      answer: r.watchOut?.join(' ') ?? '',
    },
  }
}

export async function requestFollowUp(
  sessionId: string,
  context: FollowUpContext,
  ask: string,
  digest?: { headline: string; summary: string; answer: string },
): Promise<FollowUpResult> {
  const payload = buildFollowUpRequest(sessionId, context, ask)
  if (digest) payload.readingDigest = digest

  const local = (): string => answerFollowUp(ask, context)

  let res: Response
  try {
    res = await fetch('/api/tarot/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { answer: local(), provider: 'mock' }
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { answer: local(), provider: 'mock' }
  }

  let body: FollowUpResponse
  try {
    body = (await res.json()) as FollowUpResponse
  } catch {
    return { answer: local(), provider: 'mock' }
  }

  if (body.ok) return { answer: body.answer, provider: body.provider }

  /* 缺 Key 是「本来就没配」，不是故障 —— 静默走本地，不打扰用户。
     其余错误码是真的出了问题，如实说一句。 */
  return {
    answer: local(),
    provider: 'mock',
    degradedReason: body.error.code === 'missing-api-key' ? undefined : body.error.message,
  }
}
