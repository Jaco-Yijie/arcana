/** HTTP 小工具。不引框架 —— 只需要一个 POST、一个 GET 和静态托管。 */

import type { IncomingMessage, ServerResponse } from 'node:http'

/** 5 张牌的请求体约 1 KB，256 KB 上限纯粹是防呆 */
const MAX_BODY_BYTES = 256 * 1024

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buf = chunk as Buffer
    size += buf.length
    if (size > MAX_BODY_BYTES) throw new Error('请求体过大')
    chunks.push(buf)
  }

  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim().length === 0) throw new Error('请求体为空')
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('请求体不是合法 JSON')
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

/**
 * 极简内存限流：每 IP 每分钟 10 次。
 * 目的不是防攻击，是防用户在失败时连点「重新解读」把 token 烧掉。
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 10
const hits = new Map<string, number[]>()

export function tooManyRequests(req: IncomingMessage): boolean {
  const ip = req.socket.remoteAddress ?? 'unknown'
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)

  // 顺手清理，避免长期运行时 Map 无限增长
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key)
    }
  }
  return recent.length > MAX_PER_WINDOW
}
