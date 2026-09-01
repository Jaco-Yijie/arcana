/**
 * 追问 Prompt —— 单轮、无累积、Context 受 AC-12 限制
 *
 * ══════════════════════════════════════════════════════════════
 * 【与解读 Prompt 的关系：借上下文，不借体裁】
 * 解读要产出一份结构化文档（summary / cards[] / relationships[] / …）。
 * 追问不是。追问是「牌已经摊在这里了，用户又想了一层」，
 * 输出应该是**一段话**，接着已经说过的话往下讲。
 *
 * 所以这里刻意不复用 tarotReadingPromptV2 的 schema ——
 * 复用它会得到一份格式完整但内容重复的第二份解读，
 * 那正是 D1 报告里「section title 与正文重复」要避免的东西。
 *
 * 【为什么把已有解读的摘要递进去】
 * 不递的话，模型会把整副牌重新读一遍，用户得到的是「解读 2.0」而不是回答。
 * 递进去之后，指令可以要求它**不要重复已经说过的**。
 *
 * 【结构上不可能变成多轮】
 * 这个函数的入参里没有 history —— 第二次追问和第一次拿到的上下文逐字节相同。
 * 想拼多轮上下文，得先改类型（FollowUpRequest 也没有该字段），
 * 而那会是一次显式的、能在 diff 里看见的决定。G-13 因此不是靠自觉守住的。
 * ══════════════════════════════════════════════════════════════
 */

import type { ReadingContext } from '../../src/types/reading.ts'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

const ORIENTATION = { upright: '正位', reversed: '逆位' } as const

/** 牌面清单。与解读 Prompt 用同一份服务端重建结果，客户端传的牌义一个字都不采信 */
function renderCards(context: ReadingContext): string {
  return context.cards
    .map((c, i) => {
      const o = ORIENTATION[c.orientation]
      const meaning = c.orientation === 'upright' ? c.baseMeaning.upright : c.baseMeaning.reversed
      const domain =
        c.domainMeaning &&
        `\n   ${c.domainMeaning.label}向：${
          c.orientation === 'upright' ? c.domainMeaning.upright : c.domainMeaning.reversed
        }`
      return `${i + 1}. 【${c.position.name}】${c.cardNameZh}（${c.cardName}）· ${o}
   牌义：${meaning}${domain ?? ''}`
    })
    .join('\n')
}

const SYSTEM = `你是一位塔罗解读者，正在回答用户对**一次已经完成的抽牌**提出的追问。

【你的身份边界】
你不是通用助手。你只能就这一次摊在桌上的牌回答问题。
如果用户问的事情与这次抽牌无关（写代码、查资料、闲聊、问你是谁），
不要拒绝得生硬，也不要照着答 —— 用一句话把话题带回这次牌阵，
例如指出这个问题落在哪张牌上、或者说明这组牌回答不了它。

【绝对不许做的事】
- 不许说你抽了牌、换了牌、要重新洗牌，或者建议再抽一张。牌是用户自己抽的，已经定了。
- 不许改变任何一张牌的正逆位或它落在哪个牌位。
- 不许做宿命论断言：「你一定会」「命运已经决定」「你必须」「注定」都不许出现。
- 不许对医疗、财务、法律、危险行为给出确定性预测或专业建议。
- 不许重复已经在解读里说过的话。用户看过了。

【怎么答】
- 直接回答用户这一次问的，不要先复述他的问题。
- 落到具体的牌上：说清是哪一张、哪个牌位、正位还是逆位，让人能对得上。
- 塔罗是用来照见自己的，不是用来预言的。可以给方向，但把判断权留给用户。
- 一段话，200 到 400 字。不要小标题，不要分点，不要 Markdown。

【输出格式】
只输出 JSON，不要代码块围栏：
{"answer": "你的回答"}`

export function buildFollowUpMessages(context: ReadingContext, ask: string, digest: {
  headline: string
  summary: string
  answer: string
}): ChatMessage[] {
  const spread = context.spread
  const q = context.question.trim()

  const user = `【这次抽牌】
${q ? `用户的问题：${q}` : '用户没有具体问题，是随缘抽的一张。'}
牌阵：${spread.spreadName}（${context.cards.length} 张）

【牌面】
${renderCards(context)}

【已经给过的解读 —— 不要重复它】
标题：${digest.headline}
概览：${digest.summary}
回应：${digest.answer}

【用户现在追问】
${ask}

就这个追问回答，接着上面的解读往下讲，不要从头再读一遍牌。`

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ]
}
