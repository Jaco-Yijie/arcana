/**
 * 问题灵感。
 *
 * 【它是灵感，不是问卷】
 * 点一下只是把句子**填进输入框**，用户可以照常改写、删掉、重写。
 * 所以这里给的是开放式的、可被塔罗整理的问法，而不是选项式的封闭问题。
 */

export interface InspirationChip {
  id: string
  /** 分类标签，展示用 */
  label: string
  question: string
}

export const INSPIRATIONS: InspirationChip[] = [
  {
    id: 'relationship',
    label: '感情',
    question: '这段关系现在真正的问题是什么？',
  },
  {
    id: 'career',
    label: '事业',
    question: '我现在最需要看清的阻碍是什么？',
  },
  {
    id: 'decision',
    label: '选择',
    question: '面对这两个方向，我应该重点考虑什么？',
  },
  {
    id: 'self',
    label: '自我',
    question: '我现在忽略了自己哪一部分？',
  },
  {
    id: 'future',
    label: '未来',
    question: '接下来这段时间最值得注意的主题是什么？',
  },
]

/**
 * 「我暂时没有具体问题」时用的通用问题。
 *
 * 塔罗不一定必须有很具体的问题 —— 不填也应该能往下走。
 * 这句会作为 question 存进 Session，让解读有个落点，
 * 而不是拿一个空字符串去问模型。
 */
export const GENERAL_READING_QUESTION = '看看最近最值得我关注的主题。'
