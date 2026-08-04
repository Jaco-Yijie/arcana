/**
 * Provider 选择。`READING_PROVIDER` 是唯一决策点。
 * 没配 Key 时自动回落 Mock —— 「克隆下来直接能跑」比「明确报错」更重要，
 * 因为无 Key 环境下用户仍然要能走通完整的抽牌流程（AC-V2-07）。
 */

import type { ReadingProvider } from './types.ts'
import { config } from '../env.ts'
import { MockReadingProvider } from './mock.ts'
import { DeepSeekReadingProvider } from './deepseek.ts'

let cached: ReadingProvider | null = null

export function getProvider(): ReadingProvider {
  if (cached) return cached
  // 注意这里用的是 `config.provider` 而不是 `config.ready`：
  // 运维**显式**设了 READING_PROVIDER=deepseek 却没给 Key 时，必须让请求以
  // `missing-api-key` 明确失败，而不是悄悄返回 Mock 解读 ——
  // 否则 Key 配错会被掩盖成「解读出来了」，而用户看到的其实是假数据。
  // 只有「什么都没配」时才默认回落 Mock，那是为了让克隆下来就能跑。
  cached = config.provider === 'deepseek' ? new DeepSeekReadingProvider() : new MockReadingProvider()
  return cached
}

export type { ReadingProvider }
