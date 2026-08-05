/**
 * Prompt 版本选择。
 *
 * V1 保留是为了 A/B 对比 —— 直接覆盖掉就没法回答「新版到底好在哪」。
 * `PROMPT_VERSION` 环境变量可切换，默认 v2。
 */

import type { ReadingContext } from '../../src/types/reading.ts'
import * as v1 from './tarotReadingPrompt.ts'
import * as v2 from './tarotReadingPromptV2.ts'

export type PromptVersion = 'v1' | 'v2'

export interface PromptMessage {
  role: 'system' | 'user'
  content: string
}

export function resolveVersion(explicit?: PromptVersion): PromptVersion {
  if (explicit) return explicit
  return (process.env.PROMPT_VERSION as PromptVersion) === 'v1' ? 'v1' : 'v2'
}

/**
 * 组装消息。
 * V1 的 `buildSystemPrompt()` 不接受 mode（它没有模式概念），V2 接受。
 */
export function buildMessages(
  context: ReadingContext,
  options: { version?: PromptVersion; extraInstruction?: string } = {},
): PromptMessage[] {
  const version = resolveVersion(options.version)
  if (version === 'v1') {
    return v1.buildMessages(context, options.extraInstruction)
  }
  return v2.buildMessages(context, options.extraInstruction)
}
