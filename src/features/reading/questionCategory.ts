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
 * 【判定结构：主题优先，decision 兜底】
 *
 * 这里原本把 decision 放在最前，理由是「A 还是 B」的重心是怎么选而不是选什么。
 * 那个理由在只用来贴标签时成立，但分类结果现在还要用来**挑领域牌义**
 * （见 domainMeaning.ts），于是它变成了一个真实的缺陷：
 *
 *   「我该不该换一个实习方向」→ decision → 拿到通用的行动建议
 *   而这张牌明明写了一句专门针对事业的话。
 *
 * 实测四个典型问题，三个落在 decision / general，领域牌义几乎用不上。
 *
 * 所以改成：先判主题，主题命中就用主题；只有**完全没有主题**的
 * 纯选择句（「A 还是 B」「要不要」）才落到 decision。
 * 一个事业上的决定，本来就该读事业那一段。
 */
const TOPIC_RULES: { category: QuestionCategory; patterns: RegExp[] }[] = [
  {
    category: 'relationship',
    patterns: [
      /(感情|爱情|恋爱|喜欢|暗恋|暧昧|对象|伴侣|男友|女友|老公|老婆|前任|复合|分手|表白|相亲|婚姻|吵架)/u,
      /(关系|相处|联系|沟通|冷战|距离感)/u,
      /(他|她)(会|是不是|对我|喜不喜欢)/u,
      /\b(relationship|love|dating|partner|ex)\b/iu,
    ],
  },
  {
    category: 'career',
    patterns: [
      /(工作|事业|职业|职场|公司|老板|同事|上司|跳槽|换岗|离职|面试|升职|加薪|项目|创业|副业|实习|offer|岗位)/u,
      /\b(career|job|work|boss|startup|promotion|internship)\b/iu,
    ],
  },
  {
    category: 'study',
    patterns: [
      /(学业|学习|考试|考研|升学|论文|课程|成绩|读书|毕业|留学|专业|保研|申请)/u,
      /\b(study|exam|thesis|school|university|major)\b/iu,
    ],
  },
  {
    category: 'finance',
    patterns: [
      /(钱|财务|收入|存款|理财|投资|负债|花销|预算|房贷|工资|这笔)/u,
      /\b(money|finance|invest|budget|salary|debt)\b/iu,
    ],
  },
  {
    category: 'self',
    patterns: [
      /(我自己|自我|状态|情绪|焦虑|迷茫|方向|成长|意义|内心|心态|人生|重新认识)/u,
      /\b(myself|anxiety|purpose|growth|direction)\b/iu,
    ],
  },
]

/**
 * 纯选择句式。只有在没有任何主题命中时才生效。
 *
 * 【为什么不含裸的 `should i`】
 * 「What should I know right now?」是一个开放问题，不是在两个选项之间做决定，
 * 但它含 `should I`，曾因此被判成 decision，拿到「行动建议」那一段牌义 ——
 * 而它本该走 general（不硬塞任何领域）。
 * 真正的英文选择句式靠 `A or B` 的 `or` 来识别；
 * 而「Should I take this job?」这类有主题的，主题规则已经先命中了。
 */
const DECISION_PATTERNS: RegExp[] = [
  /(还是|要不要|该不该|应不应该|值不值得|选哪|二选一|两个选择|去留)/u,
  /\bor\b/iu,
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

  /* 主题优先 —— 一个事业上的决定，应该读事业那一段牌义 */
  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some((p) => p.test(text))) return rule.category
  }
  /* 没有主题的纯选择句才落 decision，它对应的是「行动建议」那一段 */
  if (DECISION_PATTERNS.some((p) => p.test(text))) return 'decision'
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
