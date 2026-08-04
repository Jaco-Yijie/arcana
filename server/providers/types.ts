/**
 * ReadingProvider —— 解读的来源抽象。
 *
 * 有两个实现：`MockReadingProvider`（规则式，不烧 token）与 `DeepSeekReadingProvider`。
 * 由 `READING_PROVIDER` 环境变量选择。保留 Mock 的意义不只是「没 Key 也能跑」，
 * 更是让整条契约链路（重建上下文 → 校验 → 投影 → 错误码）可以在零成本下被反复测试。
 */

import type { ReadingContext, ReadingError, StructuredReading } from '../../src/types/reading.ts'

export type ProviderResult =
  | { ok: true; reading: StructuredReading }
  | {
      ok: false
      error: ReadingError
      /**
       * 模型其实出了一份结构完整的解读，只是措辞没通过语气红线。
       * 这种情况不该让用户白等一场空 —— 由上层换成本地示例解读（并如实标注），
       * 而不是把违规文本送出去，也不是什么都不给。
       */
      degradeToMock?: true
    }

export interface ReadingProvider {
  readonly id: 'mock' | 'deepseek'
  readonly model: string | null
  generate(context: ReadingContext): Promise<ProviderResult>
}
