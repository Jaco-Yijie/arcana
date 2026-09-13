/**
 * 灵感提示：不让用户面对完全空白的输入框。
 *
 * 【为什么这里只剩 id】
 * 文案（标签与例句）已经搬进 i18n 资源（`question.inspiration.<id>`）。
 * 这个文件只保留**顺序与集合** —— 那是产品决定，不是文案决定：
 * 五个方向、这个排序，是按用户真实提问的分布定的，不随语言变化。
 */

export const INSPIRATION_IDS = [
  'relationship',
  'career',
  'decision',
  'self',
  'future',
] as const

export type InspirationId = (typeof INSPIRATION_IDS)[number]
