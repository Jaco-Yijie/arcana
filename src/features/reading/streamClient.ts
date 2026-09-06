/**
 * 流式解读客户端。
 *
 * 用 `fetch` + `ReadableStream` 而不是 `EventSource` —— EventSource 只支持 GET，
 * 而我们要 POST 一个完整的 ReadingRequest。
 *
 * 【已展示的片段不是结果】
 * `delta` 只是让用户尽早看到东西。牌面一致性、结构、语气全部在服务端流结束后校验，
 * 校验不过会收到 `failed` —— 那时**必须把已展示的内容撤掉**，
 * 不能留半截在屏幕上让用户以为那就是解读。
 */

import type { ReadingError, ReadingRequest, StructuredReading } from '@/types/reading'

export type StreamPhase = 'thinking' | 'writing'

export interface StreamHandlers {
  onPhase?: (phase: StreamPhase) => void
  /** 服务端在重试 —— 必须清掉已展示的片段，否则两轮内容会拼在一起 */
  onRestart?: () => void
  /** 已累积的正文原文（是 JSON 片段，不能直接展示，需上层做宽松提取） */
  onDelta?: (accumulated: string) => void
}

export interface StreamOutcome {
  reading: StructuredReading
}

export class StreamReadingError extends Error {
  code: ReadingError['code']
  retryable: boolean
  constructor(error: ReadingError) {
    super(error.message)
    this.code = error.code
    this.retryable = error.retryable
  }
}

export async function streamReading(
  request: ReadingRequest,
  handlers: StreamHandlers = {},
  signal?: AbortSignal,
): Promise<StreamOutcome> {
  const res = await fetch('/api/tarot/reading/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })

  if (!res.ok || !res.body) {
    throw new StreamReadingError({
      code: 'network-error',
      message: '没有连上解读服务。这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。',
      retryable: true,
      canFallbackToMock: false,
    })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''
  let result: StructuredReading | null = null
  let failure: ReadingError | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE 以空行分隔事件
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      let event = 'message'
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue

      let payload: Record<string, unknown>
      try {
        payload = JSON.parse(data)
      } catch {
        continue
      }

      if (event === 'phase') {
        handlers.onPhase?.(payload.phase as StreamPhase)
      } else if (event === 'delta') {
        accumulated += String(payload.text ?? '')
        handlers.onDelta?.(accumulated)
      } else if (event === 'restart') {
        accumulated = ''
        handlers.onRestart?.()
      } else if (event === 'done') {
        result = payload.reading as StructuredReading
      } else if (event === 'failed') {
        failure = payload.error as ReadingError
      }
    }
  }

  if (failure) throw new StreamReadingError(failure)
  if (!result) {
    throw new StreamReadingError({
      code: 'empty-response',
      message: '这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。',
      retryable: true,
      canFallbackToMock: false,
    })
  }
  return { reading: result }
}

/**
 * 从**未完成**的 JSON 文本里宽松提取已经写好的字符串字段。
 *
 * 模型按字段顺序输出，所以 `readingTheme` / `overallEnergy` 往往早早就完整了。
 * 提前把它们上屏，用户就不用盯着骨架屏干等。
 * 只取**已闭合**的字符串（后面跟着 `"` 且不是转义），没写完的字段不显示半句。
 */
export function extractPartial(raw: string, field: string): string | null {
  const key = `"${field}"`
  const at = raw.indexOf(key)
  if (at === -1) return null
  const colon = raw.indexOf(':', at + key.length)
  if (colon === -1) return null
  const start = raw.indexOf('"', colon + 1)
  if (start === -1) return null

  let out = ''
  for (let i = start + 1; i < raw.length; i += 1) {
    const ch = raw[i]!
    if (ch === '\\') {
      const next = raw[i + 1]
      if (next === undefined) return null
      out += next === 'n' ? '\n' : next
      i += 1
      continue
    }
    if (ch === '"') return out.trim() || null
    out += ch
  }
  // 字符串还没闭合 —— 说明这个字段正在写，不展示半句
  return null
}

/**
 * 从流里抽出**已经写完**的每张牌解释。
 *
 * 【为什么需要它 —— 实测出来的】
 * 原来只有 `readingTheme` 与 `overallEnergy` 会提前上屏。实测（390×844，标准模式）：
 * 4.6 秒时屏上文本停在 211 个字符，然后**一直冻结到 27.3 秒**，
 * 中间 22.7 秒里骨架屏一直在跳，用户看不到任何新东西。
 * 模型其实一直在吐字（1000+ 个 delta），只是没有一个字被显示出来。
 *
 * `cards[]` 紧跟在 overallEnergy 之后输出，每张牌写完就可以上屏。
 * 这样等待期从「两段话 + 22 秒空白」变成「一张一张出现」。
 *
 * 【只取写完的，不显示半句】
 * 与 extractPartial 同一条原则：`interpretation` 的字符串必须已经闭合。
 * 半截 JSON、写到一半的句子、转义符残片，一律不上屏 ——
 * 首屏要的是 First Meaningful Text，不是 First Raw Token。
 */
export interface PartialCard {
  cardName: string
  position: string
  interpretation: string
}

export function extractPartialCards(raw: string): PartialCard[] {
  const at = raw.indexOf('"cards"')
  if (at === -1) return []
  const out: PartialCard[] = []
  /* 逐个对象扫。这里刻意不做 JSON.parse —— 流是不完整的，parse 一定失败；
     而按字段名取值只依赖模型按 schema 顺序输出，这一点由输出契约保证。 */
  const re = /"cardName"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?"position"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?"interpretation"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,/g
  const tail = raw.slice(at)
  for (;;) {
    const m = re.exec(tail)
    if (!m) break
    const unesc = (x: string) => x.replace(/\\n/g, '\n').replace(/\\(.)/g, '$1').trim()
    const interpretation = unesc(m[3] ?? '')
    if (!interpretation) continue
    out.push({ cardName: unesc(m[1] ?? ''), position: unesc(m[2] ?? ''), interpretation })
  }
  return out
}
