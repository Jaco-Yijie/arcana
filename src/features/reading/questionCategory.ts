/**
 * 问题分类。
 *
 * 只用来告诉模型「这个问题落在哪个生活面向」，**不用于任何预测**，
 * 也不用于替用户挑牌阵（那是 `recommendSpreads` 的事，且决定权在用户）。
 * 分不出来就是 `general` —— 分错的代价远大于分不出来。
 */

import type { QuestionCategory } from '@/types/reading'
import type { RandomThemeId, SessionMode } from '@/types/session'

/**
 * 判定顺序即优先级：decision 放在最前，因为「A 还是 B」这种句式
 * 往往同时含有事业/感情词，但它的解读重心是「怎么选」而不是「事业怎么样」。
 */
const RULES: { category: QuestionCategory; patterns: RegExp[] }[] = [
  {
    category: 'decision',
    patterns: [
      /(还是|要不要|该不该|应不应该|值不值得|选哪|二选一|两个选择|去留)/u,
      /\b(or|should i)\b/iu,
    ],
  },
  {
    category: 'relationship',
    patterns: [
      /(感情|爱情|恋爱|喜欢|暗恋|暧昧|对象|伴侣|男友|女友|老公|老婆|前任|复合|分手|表白|相亲|婚姻|吵架)/u,
      /(他|她)(会|是不是|对我|喜不喜欢)/u,
      /\b(relationship|love|dating|partner|ex)\b/iu,
    ],
  },
  {
    category: 'career',
    patterns: [
      /(工作|事业|职业|职场|公司|老板|同事|上司|跳槽|换岗|离职|面试|升职|加薪|项目|创业|副业)/u,
      /\b(career|job|work|boss|startup|promotion)\b/iu,
    ],
  },
  {
    category: 'study',
    patterns: [
      /(学业|学习|考试|考研|升学|论文|课程|成绩|读书|毕业|留学|专业)/u,
      /\b(study|exam|thesis|school|university|major)\b/iu,
    ],
  },
  {
    category: 'finance',
    patterns: [
      /(钱|财务|收入|存款|理财|投资|负债|花销|预算|房贷|工资)/u,
      /\b(money|finance|invest|budget|salary|debt)\b/iu,
    ],
  },
  {
    category: 'self',
    patterns: [
      /(我自己|自我|状态|情绪|焦虑|迷茫|方向|成长|意义|内心|心态|人生)/u,
      /\b(myself|anxiety|purpose|growth|direction)\b/iu,
    ],
  },
]

/** 随缘模式的轻主题直接映射，不用猜 */
const THEME_CATEGORY: Record<RandomThemeId, QuestionCategory> = {
  free: 'general',
  today: 'general',
  'recent-state': 'self',
  'watch-out': 'general',
  advice: 'general',
}

export function classifyQuestion(
  question: string,
  mode: SessionMode,
  theme: RandomThemeId | null,
): QuestionCategory {
  if (mode === 'random') return theme ? THEME_CATEGORY[theme] : 'general'
  const text = question.trim()
  if (text.length === 0) return 'general'
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category
  }
  return 'general'
}

/** 给 Prompt 用的中文标签 */
export const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  relationship: '感情关系',
  career: '工作事业',
  study: '学业',
  finance: '财务',
  decision: '在两个选项之间做决定',
  self: '自我状态与方向',
  general: '未明确归类',
}
