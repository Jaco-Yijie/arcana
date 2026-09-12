import type { DeckId } from '@/decks/ids'
/** 中文是主要内容，英文始终使用同一辅助层级。动态解读不做隐式翻译。 */
export const identityCopy = {
  cover: ['每一次翻牌，都是一次自我照见。', 'Each card, a mirror within.'],
  home: ['在偶然之间，照见自己', 'A quiet ritual of self-discovery'],
  theme: ['这组牌在说', 'The heart of your reading'],
  cards: ['每张牌的分析', 'Card-by-Card Reading'],
  relationships: ['牌与牌之间的关系', 'Between the Cards'],
  pattern: ['整体走向', 'Overall Pattern'],
  answer: ['回到你的问题', 'Back to Your Question'],
  reflection: ['可以再想想的问题', 'Reflection'],
  insight: ['核心提示', 'A Thought to Carry'],
  question: ['你的问题', 'Your Question'],
  begin: ['开始一次解读', 'Begin Reading'],
  enter: ['开始占卜', 'Enter the Reading'],
  random: ['随缘抽一张', 'A Card for This Moment'],
} as const
export type IdentityKey = keyof typeof identityCopy

const positions: Record<string, string> = {
  '指引': 'Guidance', '过去': 'Past', '现在': 'Present', '未来': 'Future',
  '现状': 'Situation', '阻碍': 'Challenge', '建议': 'Reflection',
  'A 方向发展': 'Path A', 'A 结果': 'Outcome A', 'B 方向发展': 'Path B', 'B 结果': 'Outcome B',
  '你': 'You', '对方': 'The Other', '你们之间': 'Between You', '走向': 'Direction',
}
export function positionEnglish(label: string) { return positions[label] }

export const deckEnglish: Record<DeckId, string> = {
  ethereal: 'Ethereal', elysian: 'Elysian', opaline: 'Opaline', wonderland: 'Wonderland', classic: 'Classic',
  'legacy-moonlight': 'Moonlight', 'legacy-classic': 'Heritage', 'legacy-forest': 'Forest', 'legacy-celestial': 'Celestial', 'legacy-shadow': 'Shadow',
}
