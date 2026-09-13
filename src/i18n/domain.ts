/**
 * i18n · 领域数据取词
 *
 * 牌阵、牌位、牌组这三类数据的**结构**留在原来的数据文件里
 * （id、网格坐标、匹配关键词、视觉规格 —— 这些与语言无关），
 * 只有**给人看的那几个字段**搬进 locale JSON。
 *
 * 这样做的好处是：`spreads.ts` 与 `registry.ts` 仍然是各自领域的唯一结构来源，
 * deck:check 的那些断言（牌组名不得含牌名、tagline 禁用词表…）也仍然按
 * 中文母版跑得通 —— 它们检查的是 registry 里的值，而那份值一个字没动。
 */

import type { DeckId } from '@/decks/ids'
import type { Spread, SpreadId, SpreadPosition } from '@/types/spread'
import type { RandomThemeId } from '@/types/session'
import type { I18nContextValue } from './I18nProvider'

type T = I18nContextValue['t']

/* ── 牌阵 ── */

export function spreadName(t: T, id: SpreadId): string {
  return t(`spread.name.${id}`)
}

export function spreadDescription(t: T, id: SpreadId): string {
  return t(`spread.description.${id}`)
}

export function positionLabel(t: T, spreadId: SpreadId, positionId: string): string {
  return t(`spread.position.${spreadId}.${positionId}.label`)
}

export function positionMeaning(t: T, spreadId: SpreadId, positionId: string): string {
  return t(`spread.position.${spreadId}.${positionId}.meaning`)
}

/** 一个牌阵里所有牌位的本地化标签，按 positionId 索引 */
export function positionLabels(t: T, spread: Spread): Record<string, string> {
  return Object.fromEntries(
    spread.positions.map((p: SpreadPosition) => [p.id, positionLabel(t, spread.id, p.id)]),
  )
}

/* ── 牌组 ── */

export function deckName(t: T, id: DeckId): string {
  return t(`decks.name.${id}`)
}

export function deckTagline(t: T, id: DeckId): string {
  return t(`decks.tagline.${id}`)
}

export function deckDescription(t: T, id: DeckId): string {
  return t(`decks.description.${id}`)
}

/* ── 随缘主题 ── */

export function themeLabel(t: T, id: RandomThemeId): string {
  return t(`question.theme.${id}.label`)
}

export function themeDescription(t: T, id: RandomThemeId): string {
  return t(`question.theme.${id}.description`)
}
