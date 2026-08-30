/**
 * 问题类型 → 领域牌义的选取。
 *
 * ══════════════════════════════════════════════════════════════
 * 【它修的是什么】
 * 78 张牌每张都写了五个领域的牌义（love / career / study / finance / advice，
 * 各含正逆位），但在此之前**只有 Mock provider 读得到它们** ——
 * `rebuildContext` 只把 `meaningUpright / meaningReversed` 放进 `baseMeaning`，
 * 领域牌义根本没进真实 Prompt。
 *
 * 后果是：模型知道「这是一个事业问题」（questionCategory 一直在 context 里），
 * 却只拿到了通用牌义。它必须自己从「新的开始、对未知的开放」现推到职业语境，
 * 而我们手上明明已经有一句专门为职业写好的「适合提出新点子并立刻做一个最小版本」。
 * 这是白白丢掉的一层精度。
 * ══════════════════════════════════════════════════════════════
 *
 * 【为什么是选一个领域，而不是把五个都塞进去】
 * 五个领域全给，等于没给 —— 模型会挑，而挑的依据还是它自己对问题的理解，
 * 我们既没省下它的判断，又让 Prompt 长了五倍。
 * 选取本身是我们该负的责任：分类已经做了，就该把结论用掉。
 *
 * 【它不改变牌义，只是选取】
 * 这一层**不生成任何文本**，只从牌义数据里挑一段既有的。
 * 所以它不会让同一张牌在不同问题下"含义不同"——
 * 含义一直都在那里，只是这次把最相关的那一段递到了模型面前。
 */

import type { QuestionCategory } from '@/types/reading'
import type { TarotCard } from '@/types/tarot'

/** 领域牌义在 TarotCard 上的字段名 */
export type MeaningDomain = 'love' | 'career' | 'study' | 'finance' | 'personalGrowth' | 'advice'

/**
 * 问题类型 → 该读哪个领域。
 *
 * `general` 刻意映射为 null：问题没有明确领域时，硬塞一个领域牌义
 * 会把解读往那个方向拽 —— 那是我们替用户做了判断。
 */
export const CATEGORY_TO_DOMAIN: Record<QuestionCategory, MeaningDomain | null> = {
  relationship: 'love',
  career: 'career',
  study: 'study',
  finance: 'finance',
  /* 「在两个选项之间做决定」——advice 是牌义里专门写「该怎么做」的那一段 */
  decision: 'advice',
  /* 「自我状态与方向」——personalGrowth 正是为这类问题写的 */
  self: 'personalGrowth',
  general: null,
}

/** 给模型看的领域名，与 CATEGORY_LABEL 同源语气 */
export const DOMAIN_LABEL: Record<MeaningDomain, string> = {
  love: '感情关系',
  career: '工作事业',
  study: '学业',
  finance: '财务',
  personalGrowth: '自我成长',
  advice: '行动建议',
}

export interface DomainMeaning {
  domain: MeaningDomain
  label: string
  upright: string
  reversed: string
}

/**
 * 取这张牌在该问题类型下最相关的一段牌义。
 *
 * 返回 null 的两种情况，都要如实返回而不是找个替代：
 *   1. 问题没有明确领域（general）
 *   2. 这张牌还没写这个领域（例如 personalGrowth 目前只有 5 张代表牌有）
 * 找替代会让「这段话是专门为这个领域写的」这个前提失效。
 */
export function selectDomainMeaning(
  card: TarotCard,
  category: QuestionCategory,
): DomainMeaning | null {
  const domain = CATEGORY_TO_DOMAIN[category]
  if (!domain) return null

  const text = card[domain]
  if (!text || !text.upright?.trim() || !text.reversed?.trim()) return null

  return {
    domain,
    label: DOMAIN_LABEL[domain],
    upright: text.upright,
    reversed: text.reversed,
  }
}
