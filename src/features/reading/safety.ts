/**
 * 安全边界检测（Safety boundary）—— 见 docs/00-brief.md §22、docs/01-product-spec.md AC-11 / G-14
 *
 * 这里只做**关键词级别的轻量识别**，目的不是判断用户的处境，
 * 而是在明显高风险的话题上，把「塔罗不能替代专业意见」这句话讲清楚。
 *
 * 三条硬约束：
 * 1. 命中后**不阻断流程** —— 用户仍然可以正常抽牌，提示只是附加信息。
 * 2. 命中后 Reading **不得给出确定性预测**（由 mockReading 负责收紧措辞）。
 * 3. 不说教、不长篇、不重复劝导。
 */

/** 高风险类别 */
import type { LanguageCode } from '@/i18n/types'

export type RiskCategory = 'medical' | 'financial' | 'legal' | 'harm'

export type RiskLevel = 'none' | 'caution'

export interface RiskResult {
  level: RiskLevel
  categories: RiskCategory[]
  /** 命中时给用户看的提示文案，未命中为 null */
  /** 已本地化的提示文本。语言由 `detectRisk` 的第二个参数决定，默认中文。 */
  notice: string | null
}

/** 各类别的中英关键词。全部转小写后做子串匹配。 */
const RISK_KEYWORDS: Record<RiskCategory, string[]> = {
  medical: [
    '癌', '肿瘤', '确诊', '诊断', '化疗', '手术', '病情', '恶性', '复发',
    '要不要吃药', '停药', '精神分裂', '抑郁症', '躁郁', '怀孕', '流产',
    '绝症', '治不好', '体检结果', '化验', '病理',
    '得了什么病', '得了某种病', '得病', '症状', '吃药', '药物',
    'cancer', 'symptom', 'tumor', 'diagnosis', 'diagnose', 'chemo', 'surgery',
    'medication', 'prescription', 'illness', 'disease', 'pregnan',
  ],
  financial: [
    '全仓', '梭哈', '重仓', '加杠杆', '杠杆', '借钱投资', '网贷', '高利贷',
    '爆仓', '合约', '期货', '炒股', '币价', '暴富', '押上', '抵押房子',
    '负债', '欠款', '追高', '割肉', '内幕',
    'all in', 'leverage', 'margin call', 'futures', 'crypto', 'loan shark',
    'debt', 'bankrupt', 'gamble', 'lottery',
  ],
  legal: [
    '起诉', '官司', '胜诉', '败诉', '诉讼', '开庭', '判刑', '坐牢', '被告', '原告',
    '仲裁', '离婚协议', '抚养权', '合同纠纷', '违约金', '报警', '立案',
    '赔偿', '拘留', '取保',
    'lawsuit', 'sue', 'court', 'attorney', 'lawyer', 'custody',
    'contract dispute', 'prosecut', 'criminal charge',
  ],
  harm: [
    '自杀', '自残', '轻生', '不想活', '活不下去', '想死', '结束生命',
    '割腕', '跳楼', '安眠药自', '报复社会', '杀了', '弄死', '伤害他',
    '同归于尽', '解脱算了',
    'suicide', 'self-harm', 'kill myself', 'end my life', 'want to die',
    'hurt myself', 'hurt them', 'kill him', 'kill her',
  ],
}

/* ── 安全提示文案（简报 §22）──
   【为什么不搬进 i18n 的 locale JSON】
   这几条**服务端也要用** —— rebuildContext 会把 notice 透传给模型与前端，
   而服务端跑在 Node 里，不经过 React 与 i18n Provider。
   留在这个共享模块里，客户端与服务端读到的是逐字相同的一份；
   安全提示两侧不一致，比多一处文案表糟糕得多。 */
const NOTICES: Record<
  LanguageCode,
  { general: string; harm: string; withCategories: (labels: string) => string }
> = {
  zh: {
    general:
      '塔罗更适合用于整理思路和提供不同观察角度，不应该替代专业意见或现实判断。这次的解读会围绕你的想法本身展开，不做确定性的预测。',
    harm: '这个话题超出了一次抽牌能承担的范围。如果你现在很难受，请优先联系你信任的人，或者当地的心理援助与紧急服务；塔罗可以陪你整理想法，但它帮不上这一部分的忙。',
    withCategories: (labels) => `这个问题涉及${labels}方面的判断。`,
  },
  en: {
    general:
      'Tarot suits organising your thinking and offering a different angle; it does not replace professional advice or a real-world judgement. This reading stays with your own thinking and makes no definite predictions.',
    harm: 'This topic is beyond what a single reading can carry. If things are hard right now, please reach out first to someone you trust, or to your local mental-health or emergency services. Tarot can help you sort through your thoughts; it cannot help with this part.',
    withCategories: (labels) => `This question touches on ${labels}. `,
  },
}

/** @deprecated 用 `detectRisk(text, language).notice`。保留导出面以免破坏既有引用。 */
export const GENERAL_SAFETY_NOTICE = NOTICES.zh.general
/** @deprecated 同上 */
export const HARM_SAFETY_NOTICE = NOTICES.zh.harm

/** 各类别在提示里的说法 */
const CATEGORY_LABEL: Record<LanguageCode, Record<RiskCategory, string>> = {
  zh: {
    medical: '身体或医疗',
    financial: '高风险财务',
    legal: '法律决定',
    harm: '安全',
  },
  en: {
    medical: 'physical health or medical decisions',
    financial: 'high-risk financial decisions',
    legal: 'legal decisions',
    harm: 'personal safety',
  },
}

const ALL_CATEGORIES: RiskCategory[] = ['medical', 'financial', 'legal', 'harm']

/**
 * 检测一段文本是否触及高风险话题。
 * @param text 用户输入的问题、追问，或任何将进入 Reading 的原始文本
 */
export function detectRisk(text: string, language: LanguageCode = 'zh'): RiskResult {
  const copy = NOTICES[language] ?? NOTICES.zh
  const normalized = text.toLowerCase()
  const categories: RiskCategory[] = []

  for (const category of ALL_CATEGORIES) {
    const hit = RISK_KEYWORDS[category].some((keyword) =>
      normalized.includes(keyword.toLowerCase()),
    )
    if (hit) {
      categories.push(category)
    }
  }

  if (categories.length === 0) {
    return { level: 'none', categories: [], notice: null }
  }

  // 危险行为优先，其提示更明确，也不与其他类别叠加成长篇。
  if (categories.includes('harm')) {
    return { level: 'caution', categories, notice: copy.harm }
  }

  const labels = categories
    .map((c) => CATEGORY_LABEL[language][c])
    .join(language === 'zh' ? '、' : ', ')
  return {
    level: 'caution',
    categories,
    notice: `${copy.withCategories(labels)}${copy.general}`,
  }
}

/** Reading 在高风险话题下是否需要收紧措辞 */
export function shouldSoftenTone(result: RiskResult): boolean {
  return result.level === 'caution'
}
