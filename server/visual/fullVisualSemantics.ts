/**
 * 完整视觉语义记录的读取 —— **只给 QA / 测试 / 重新生成用，运行时用不到**。
 *
 * 【为什么它在 server/ 而不是数据文件旁边】
 * 数据文件在 `src/data/deckVisualSemantics/`，而 `src/` 下的一切都会被
 * tsconfig.app 当成浏览器代码（也确实会被打进前端包）。
 * 这个模块用 node:fs 读盘 —— 放在 src/ 下不但类型不过，
 * 更重要的是会诱导别人从前端 import 完整记录，
 * 而完整记录里有一多半字段（palette / composition / confidence / meta）
 * **在设计上就不允许进入 Reading Prompt**，打进包等于让解读 chunk 白白翻一倍。
 *
 * 放在 server/ 下，「这不是浏览器代码」这件事由位置本身说清楚。
 */

import { readFileSync } from 'node:fs'
import type {
  DeckCardVisualSemantics,
  DeckVisualSemanticsFile,
} from '../../src/types/visualSemantics.ts'

const DATA_DIR = new URL('../../src/data/deckVisualSemantics/', import.meta.url)

const DECK_FILES = [
  'legacy-moonlight',
  'legacy-classic',
  'legacy-forest',
  'legacy-celestial',
  'legacy-shadow',
] as const

/** 一副牌组的完整记录。文件不存在时返回空对象 —— 缺数据不是异常 */
export function loadFullVisualSemantics(deckId: string): Record<string, DeckCardVisualSemantics> {
  try {
    const raw = readFileSync(new URL(`${deckId}.json`, DATA_DIR), 'utf8')
    return (JSON.parse(raw) as DeckVisualSemanticsFile).cards
  } catch {
    return {}
  }
}

/** 全部完整记录，按 deckId 索引 */
export function loadAllFullVisualSemantics(): Record<string, Record<string, DeckCardVisualSemantics>> {
  return Object.fromEntries(DECK_FILES.map((d) => [d, loadFullVisualSemantics(d)]))
}
