/**
 * 背景选择题的校验与清洗。
 *
 * 【原则：宁可少一道题，也不要一道坏题】
 * 这一页完全可选，少出一道题用户几乎察觉不到；而一道语言不对、选项残缺、
 * 或者在「给建议 / 暗示结果」的题会直接破坏体验。所以这里对单题是**剔除**而不是修复，
 * 整份结构不对时返回空数组 —— 客户端对空数组的处理就是直接进入原流程。
 */

import type { ContextIntakeQuestion } from '../../src/types/reading.ts'
import type { LanguageCode } from '../../src/i18n/types.ts'
import { blockingViolations, checkText } from './toneGuard.ts'

export const INTAKE_LIMITS = {
  maxQuestions: 4,
  minOptions: 2,
  maxOptions: 6,
  maxQuestionChars: 80,
  maxLabelChars: 40,
} as const

const CJK = /[㐀-鿿]/

/** 题干或选项里出现这些，说明模型在做解读、给建议或提牌 —— 这道题不要 */
const OFF_TASK_ZH = /塔罗|牌面|牌阵|抽到|能量|运势|你应该|建议你/
const OFF_TASK_EN = /\b(?:tarot|cards?|spread|energy|you should|we recommend|i recommend)\b/i

function cleanId(value: unknown, fallback: string): string {
  const id = typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') : ''
  return (id || fallback).slice(0, 40)
}

function languageOk(text: string, language: LanguageCode): boolean {
  return language === 'en' ? !CJK.test(text) : CJK.test(text)
}

/* ── 重复询问的服务端兜底 ─────────────────────────────────────
 * 「不重复问用户已经说过的事」主要靠 Prompt（先写 knownFacts 再出题）。
 * 这里只兜住最常见、也最能用规则判断的一类：原问题已经给出了时间，
 * 题目却在问「多久 / 什么时候 / 还有多长时间」。其余类型交给 Prompt 与 live 评测。 */
const TIME_GIVEN_ZH = /[0-9一二两三四五六七八九十半几]+\s*(?:个)?(?:天|周|星期|月|年|小时)|明天|后天|下周|下个月|今年|去年|上个月|上周/
const TIME_GIVEN_EN = /\b(?:\d+|one|two|three|four|five|six|a|an)\s+(?:days?|weeks?|months?|years?)\b|\btomorrow\b|\bnext (?:week|month)\b|\blast (?:week|month|year)\b/i
const ASKS_TIME_ZH = /多久|多长时间|多少天|几个月|什么时候|还有几/
const ASKS_TIME_EN = /\bhow long\b|\bwhen (?:is|did|will)\b|\bhow many (?:days|weeks|months)\b/i

function asksForGivenTime(original: string, question: string): boolean {
  return (TIME_GIVEN_ZH.test(original) && ASKS_TIME_ZH.test(question)) ||
    (TIME_GIVEN_EN.test(original) && ASKS_TIME_EN.test(question))
}

/* ── 医疗 / 法律边界的服务端兜底 ─────────────────────────────
 * Prompt 已经写明不问用药、症状细节、检查数值，不问证据与案情。
 * 实测 flash 偶尔仍会给出「自己休息或吃点药」这样的选项 —— 它在用户眼里只是一个选项，
 * 进入解读后却是一条用药信息。这里按风险类别整题剔除，不试图只删掉那一个选项。 */
const MEDICAL_DETAIL = /药|剂量|症状(?:是|有哪些|细节)|严重程度|疼痛程度|持续(?:了)?多久|多久了|发作|检查(?:结果|数值|指标)|化验|体温|血压|血糖|\b(?:medication|dosage|symptoms?|test results?|blood pressure)\b/i
const LEGAL_DETAIL = /证据|案情|胜算|赔偿金额|合同条款|\b(?:evidence|chances of winning|settlement amount)\b/i

export interface IntakeValidation {
  questions: ContextIntakeQuestion[]
  /** 被剔除的题与原因，只进日志 */
  dropped: string[]
}

export function validateContextQuestions(
  payload: unknown,
  language: LanguageCode,
  /** 用户原问题，用于重复询问兜底 */
  originalQuestion = '',
  /** 服务端关键词判定的高风险类别，用于边界兜底 */
  riskCategories: readonly string[] = [],
): IntakeValidation {
  const dropped: string[] = []
  if (typeof payload !== 'object' || payload === null || !Array.isArray((payload as { questions?: unknown }).questions)) {
    return { questions: [], dropped: ['questions 不是数组'] }
  }

  const out: ContextIntakeQuestion[] = []
  const seenQuestionIds = new Set<string>()

  for (const [qi, item] of ((payload as { questions: unknown[] }).questions).entries()) {
    if (out.length >= INTAKE_LIMITS.maxQuestions) {
      dropped.push(`超过 ${INTAKE_LIMITS.maxQuestions} 题`)
      break
    }
    if (typeof item !== 'object' || item === null) {
      dropped.push(`第 ${qi + 1} 题不是对象`)
      continue
    }
    const q = item as Record<string, unknown>
    const question = typeof q.question === 'string' ? q.question.trim() : ''
    if (!question || question.length > INTAKE_LIMITS.maxQuestionChars) {
      dropped.push(`第 ${qi + 1} 题题干为空或过长`)
      continue
    }
    if (!languageOk(question, language)) {
      dropped.push(`第 ${qi + 1} 题语言不符`)
      continue
    }
    if ((language === 'en' ? OFF_TASK_EN : OFF_TASK_ZH).test(question)) {
      dropped.push(`第 ${qi + 1} 题越界：${question}`)
      continue
    }
    const boundary = [
      ...(riskCategories.includes('medical') ? [MEDICAL_DETAIL] : []),
      ...(riskCategories.includes('legal') ? [LEGAL_DETAIL] : []),
    ]
    const rawLabels = Array.isArray(q.options)
      ? q.options.map((o) => (typeof o === 'object' && o !== null && typeof (o as { label?: unknown }).label === 'string' ? (o as { label: string }).label : ''))
      : []
    if (boundary.some((re) => re.test(question) || rawLabels.some((label) => re.test(label)))) {
      dropped.push(`第 ${qi + 1} 题触及医疗 / 法律边界：${question}`)
      continue
    }
    if (asksForGivenTime(originalQuestion, question)) {
      dropped.push(`第 ${qi + 1} 题重复询问原问题已给出的时间：${question}`)
      continue
    }

    const options: ContextIntakeQuestion['options'] = []
    const seenOptionIds = new Set<string>()
    const seenLabels = new Set<string>()
    let badOption = false
    if (Array.isArray(q.options)) {
      for (const [oi, raw] of q.options.entries()) {
        if (typeof raw !== 'object' || raw === null) continue
        const o = raw as Record<string, unknown>
        const label = typeof o.label === 'string' ? o.label.trim() : ''
        if (!label || label.length > INTAKE_LIMITS.maxLabelChars || seenLabels.has(label)) continue
        if (!languageOk(label, language) && !/^[A-Za-z0-9 /+-]+$/.test(label)) {
          badOption = true
          break
        }
        if ((language === 'en' ? OFF_TASK_EN : OFF_TASK_ZH).test(label)) {
          badOption = true
          break
        }
        let id = cleanId(o.id, `option_${oi + 1}`)
        while (seenOptionIds.has(id)) id = `${id}_${oi + 1}`
        seenOptionIds.add(id)
        seenLabels.add(label)
        options.push({ id, label })
      }
    }
    if (badOption || options.length < INTAKE_LIMITS.minOptions) {
      dropped.push(`第 ${qi + 1} 题选项不合格`)
      continue
    }
    if (options.length > INTAKE_LIMITS.maxOptions) options.length = INTAKE_LIMITS.maxOptions

    /* 与解读共用同一套语气红线：题目里也不允许宿命论与空洞玄学 */
    const texts = [question, ...options.map((o) => o.label)]
    if (texts.some((t) => blockingViolations(checkText('intake', t)).length > 0)) {
      dropped.push(`第 ${qi + 1} 题命中语气红线`)
      continue
    }

    let id = cleanId(q.id, `question_${qi + 1}`)
    while (seenQuestionIds.has(id)) id = `${id}_${qi + 1}`
    seenQuestionIds.add(id)
    out.push({ id, question, options })
  }

  return { questions: out, dropped }
}
