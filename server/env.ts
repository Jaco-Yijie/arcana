/**
 * 服务端环境变量。
 *
 * 【安全边界就在这一个文件里】
 * `DEEPSEEK_API_KEY` 只在这里被读取，只在 Node 进程内存在。
 * 整个 `src/`（会被打进前端 bundle）里不存在任何 Key 相关变量，
 * 也不存在任何 `VITE_` 前缀的密钥配置 —— 加了 `VITE_` 就等于公开发布。
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReadingProviderId } from '../src/types/reading.ts'

/** 极简 .env 解析。不引 dotenv —— 只需要 KEY=VALUE。 */
function loadDotEnv(): void {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        // 已存在的真实环境变量优先，不被文件覆盖
        if (process.env[key] !== undefined) continue
        let value = trimmed.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    } catch {
      // 文件不存在很正常（例如只用 Mock 跑 UI）
    }
  }
}

loadDotEnv()

const DEFAULT_MODEL = 'deepseek-v4-pro'
/** 官方当前提供的两个模型。写死是为了在启动时就拦住拼错的模型名，而不是等到 400。 */
const KNOWN_MODELS = ['deepseek-v4-pro', 'deepseek-v4-flash']

function readProvider(hasKey: boolean): ReadingProviderId {
  const raw = (process.env.READING_PROVIDER ?? '').trim().toLowerCase()
  if (raw === 'mock') return 'mock'
  if (raw === 'deepseek') return 'deepseek'
  // 没显式指定：有 Key 就用真的，没 Key 就用 Mock —— 让「克隆下来直接能跑」成立
  return hasKey ? 'deepseek' : 'mock'
}

export interface ServerConfig {
  port: number
  apiKey: string | null
  model: string
  provider: ReadingProviderId
  baseUrl: string
  /** provider=deepseek 且有 Key 才算真正可用 */
  ready: boolean
  requestTimeoutMs: number
  maxTokens: number
  temperature: number
  /** 推理强度。不设则用模型默认（v4-pro 默认开启推理） */
  reasoningEffort: string | null
}

function build(): ServerConfig {
  const apiKey = (process.env.DEEPSEEK_API_KEY ?? '').trim() || null
  const provider = readProvider(apiKey !== null)
  const model = (process.env.DEEPSEEK_MODEL ?? '').trim() || DEFAULT_MODEL

  if (!KNOWN_MODELS.includes(model)) {
    console.warn(
      `[arcana] DEEPSEEK_MODEL="${model}" 不在已知列表 ${KNOWN_MODELS.join(' / ')} 中，仍将按原样发送。`,
    )
  }

  return {
    port: Number(process.env.PORT ?? 8787),
    apiKey,
    model,
    provider,
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, ''),
    ready: provider === 'deepseek' && apiKey !== null,
    // 【实测值】v4-pro 出一份三张牌的完整解读，实测 60–130s，且波动主要来自上游排队，
    // 降低 reasoning_effort 并不会变快（effort=low 实测 127s，比默认的 91s 还慢）。
    // 所以这里必须给足 180s，否则正常请求会被我们自己的超时误杀。
    requestTimeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 180_000),
    // 【实测值，不要调小】v4-pro / v4-flash 都是推理模型，max_tokens 把 reasoning_tokens 一起算，
    // 而推理开销波动极大：同一个 prompt 实测过 1792 / 2134 / 5072 / 7528 token。
    // 三张牌一次完整解读实测总消耗 7532（推理 5878 + 正文 1654）。
    // 8000 会在推理吃满后把 JSON 截断在一半，表现为「上游响应不是合法 JSON」。
    // 16000 是留了一倍余量的安全值；五张牌牌阵更需要它。
    maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS ?? 16000),
    temperature: Number(process.env.DEEPSEEK_TEMPERATURE ?? 0.7),
    // 想更快更省可设 low；关闭推理用 minimal（质量会下降，解读会变浅）
    reasoningEffort: (process.env.DEEPSEEK_REASONING_EFFORT ?? '').trim() || null,
  }
}

export const config: ServerConfig = build()

/** 启动日志。**永远不打印 Key 本身**，只打印有没有。 */
export function describeConfig(): string {
  return [
    `provider=${config.provider}`,
    `model=${config.provider === 'deepseek' ? config.model : '-'}`,
    `apiKey=${config.apiKey ? '已配置' : '未配置'}`,
    `ready=${config.ready}`,
  ].join(' · ')
}
