/**
 * 「随缘抽一张」的轻主题（Random themes）—— 见 docs/00-brief.md §5
 *
 * 轻主题只提供一个语境，不改变任何抽牌逻辑：
 * 无论选哪个主题，用户都要完整走完洗牌 → 切牌 → 摊牌 → 选牌 → 摆牌 → 翻牌。
 */

import type { RandomThemeId } from '@/types/session'

export interface RandomTheme {
  id: RandomThemeId
  /** 按钮上的文字 */
  label: string
  /** 一句话说明这个主题适合什么状态 */
  description: string
  /**
   * 供 Reading 使用的语境提示词。
   * 它会被拼进解读的开场，用来替代「用户问题」，而不是拿去问任何真实 LLM。
   */
  prompt: string
}

export const randomThemes: RandomTheme[] = [
  {
    id: 'free',
    label: '直接随缘',
    description: '什么都不预设，只想看看今天会遇到哪一张。',
    prompt: '此刻没有指定的问题，只是想让这张牌提供一个观察此刻的角度。',
  },
  {
    id: 'today',
    label: '今日提醒',
    description: '给今天一个可以放在心上的提示。',
    prompt: '今天这一天里，有什么是值得我提前留意的？',
  },
  {
    id: 'recent-state',
    label: '最近状态',
    description: '说不清最近怎么了，想有个描述它的方式。',
    prompt: '我最近整体的状态是什么样的，其中有哪些是我自己没注意到的？',
  },
  {
    id: 'watch-out',
    label: '我需要注意什么',
    description: '感觉有事情正在酝酿，但还没看清。',
    prompt: '当前这个阶段，有什么是我容易忽略、但值得多看一眼的？',
  },
  {
    id: 'advice',
    label: '给我一个建议',
    description: '不问结果，只想要一个可以试试看的方向。',
    prompt: '如果只能给我一个可以马上试试看的方向，那会是什么？',
  },
]

export const randomThemeById: Record<RandomThemeId, RandomTheme> = Object.fromEntries(
  randomThemes.map((t) => [t.id, t]),
) as Record<RandomThemeId, RandomTheme>

export function getRandomTheme(id: RandomThemeId): RandomTheme {
  return randomThemeById[id]
}

/** 供 UI 展示的四个轻主题（不含「直接随缘」这一入口选项） */
export const lightThemes: RandomTheme[] = randomThemes.filter((t) => t.id !== 'free')
