/**
 * Layer 1 · 牌义的语言层（Card text localization）
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么是覆盖层，而不是把 TarotCard 改成 { zh, en }】
 *
 * 需求原文希望的是：
 *     { id: 'fool', name: { zh: '愚者', en: 'The Fool' } }
 *
 * 但 `TarotCard` 不是一个普通的数据结构，它被三样东西钉住：
 *
 *   1. **牌义指纹**（src/data/deck/fingerprint.ts）
 *      78 张牌的 20 个语义字段被 FNV-1a 哈希成一个归档常量，
 *      deck:check D 组逐次比对。把 `name: string` 换成 `name: {zh,en}`
 *      会让指纹整体作废 —— 而那条断言存在的全部意义，就是让「牌义被改动」
 *      这件事无法悄悄发生。为了加英文而把它清零，等于拆掉报警器来装修。
 *
 *   2. **六个消费方**：server/context/rebuild.ts、mockReading、followUp、
 *      decks/art/buildBrief、scripts/artwork-check、scripts/fool-spec。
 *      它们全部按 `card.meaningUpright` 这种扁平形状读，
 *      而其中两个（artwork-check / deck-check）本身就是防回归的断言脚本。
 *
 *   3. **artwork 生产管线**已经用扁平字段签发过 390 张原画的 brief seed。
 *
 * 所以这里换一种做法：**语义层保持原样（它就是中文母版），
 * 英文作为一份按 cardId 索引的覆盖层，通过 `localizeCard()` 统一取用。**
 * 对调用方而言效果完全一致 —— 拿到的就是当前语言的牌名与牌义；
 * 对不变量而言零风险 —— 指纹、断言、生产管线一个字节都没动。
 *
 * 【英文覆盖层是按需加载的】
 * 它有 78 条完整牌义（约 90KB 源码），中文用户一个字都用不到。
 * 所以它不被静态 import，而是由 `src/i18n/boot.ts` 在切到英文时
 * 与 en-US.json 一起动态取回，再调用 `registerCardText()` 注册进来。
 * ══════════════════════════════════════════════════════════════
 */

import type { Locale } from '@/i18n/types'
import type { Orientation, TarotCard } from '@/types/tarot'

export interface OrientedText {
  upright: string
  reversed: string
}

export interface SymbolGloss {
  title: string
  meaning: string
}

/** 一张牌在某一门语言下的全部可读文本。字段与 TarotCard 的语义字段一一对应。 */
export interface CardText {
  name: string
  keywordsUpright: readonly string[]
  keywordsReversed: readonly string[]
  meaningUpright: string
  meaningReversed: string
  love: OrientedText
  career: OrientedText
  study: OrientedText
  finance: OrientedText
  advice: OrientedText
  personalGrowth?: OrientedText
  symbols: readonly string[]
  symbolism?: readonly SymbolGloss[]
}

export type CardTextMap = Readonly<Record<string, CardText>>

/* 已注册的非默认语言覆盖层。zh-CN 不在这里 —— 它直接从 TarotCard 读。 */
const overlays = new Map<Locale, CardTextMap>()

export function registerCardText(locale: Locale, map: CardTextMap): void {
  overlays.set(locale, map)
}

export function hasCardText(locale: Locale): boolean {
  return locale === 'zh-CN' || overlays.has(locale)
}

/** 中文母版：直接从语义层投影，不复制一份文案（复制就会有两份真相） */
function zhText(card: TarotCard): CardText {
  return {
    name: card.nameZh,
    keywordsUpright: card.keywordsUpright,
    keywordsReversed: card.keywordsReversed,
    meaningUpright: card.meaningUpright,
    meaningReversed: card.meaningReversed,
    love: card.love,
    career: card.career,
    study: card.study,
    finance: card.finance,
    advice: card.advice,
    personalGrowth: card.personalGrowth,
    symbols: card.symbols,
    symbolism: card.symbolism,
  }
}

/**
 * 取这张牌在当前语言下的文本。
 *
 * 覆盖层缺这张牌时**回落到英文牌名 + 中文牌义**是不可接受的
 * （屏幕上会中英混排，正是本轮明确要避免的）。所以回落是整张回落：
 * 要么整张英文，要么整张中文。i18n:check 保证 78 张一张不缺。
 */
export function localizeCard(card: TarotCard, locale: Locale): CardText {
  if (locale === 'zh-CN') return zhText(card)
  const overlay = overlays.get(locale)
  const hit = overlay?.[card.id]
  return hit ?? zhText(card)
}

/** 只要牌名时的快捷方式 —— 这是全站用得最多的一个字段 */
export function localizeCardName(card: TarotCard, locale: Locale): string {
  if (locale === 'zh-CN') return card.nameZh
  return overlays.get(locale)?.[card.id]?.name ?? card.name
}

/** 按正逆位取一段定向文本 */
export function orient(text: OrientedText, orientation: Orientation): string {
  return orientation === 'reversed' ? text.reversed : text.upright
}
