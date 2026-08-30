/**
 * Layer 2 · 牌组标识与 Legacy 迁移
 *
 * 【两类牌组，边界必须清楚】
 * - Artwork Deck（5 套）：拥有 78 张真实插画的目标牌组。
 *   在 78 张全部就绪之前**不得用于正式抽牌**。
 * - Legacy Deck（5 套）：V2.4 遗留的程序化牌组。它们没有独立插画，
 *   五套共用同一批 SVG 构图 —— 这正是本次改造要终结的状态。
 *   保留它们只有一个理由：**现有用户的抽牌流程与历史日记不能断**。
 *
 * Legacy 牌组会在 Phase 3（五套 78 张全部就绪）之后退役。
 */

/** 五套目标牌组。它们才是「真正的多牌组」。 */
export type ArtworkDeckId = 'ethereal' | 'elysian' | 'opaline' | 'wonderland' | 'classic'

/**
 * V2.4 遗留牌组。id 全部加 `legacy-` 前缀。
 *
 * 【为什么必须加前缀】旧牌组里有一个叫 `classic`，新牌组里也有一个叫 `classic`，
 * 但它们是完全不同的两副牌。不加前缀会让老用户的历史日记被解析成一副
 * 尚未完成、根本不能抽的新牌 —— 这是一次静默的数据损坏。
 */
export type LegacyDeckId =
  | 'legacy-moonlight'
  | 'legacy-classic'
  | 'legacy-forest'
  | 'legacy-celestial'
  | 'legacy-shadow'

export type DeckId = ArtworkDeckId | LegacyDeckId

export const ARTWORK_DECK_IDS: readonly ArtworkDeckId[] = [
  'ethereal',
  'elysian',
  'opaline',
  'wonderland',
  'classic',
]

export const LEGACY_DECK_IDS: readonly LegacyDeckId[] = [
  'legacy-moonlight',
  'legacy-classic',
  'legacy-forest',
  'legacy-celestial',
  'legacy-shadow',
]

export const ALL_DECK_IDS: readonly DeckId[] = [...ARTWORK_DECK_IDS, ...LEGACY_DECK_IDS]

/**
 * 默认牌组 = Legacy Moonlight。
 *
 * 【为什么默认不是 ethereal】ethereal 现在是 0/78，不能抽牌。
 * 把一个抽不了牌的牌组设成默认，等于让新用户一进来就撞墙。
 * Phase 3 完成后，默认值改为 'ethereal'。
 */
export const DEFAULT_DECK_ID: DeckId = 'legacy-moonlight'

/**
 * 旧 deckId → 新 deckId。只用于迁移 schema v1 的持久化数据。
 *
 * 【这里有两代历史，不是一代】
 * - V1：全站只有一套牌，`dreamlikeDeck`，session 里存的是 `'dreamlike'`
 * - V2.4：五套皮肤，`moonlight` / `classic` / `forest` / `celestial` / `shadow`
 *
 * `dreamlike` 最初被漏掉了 —— 它靠 resolveDeckId 的兜底回落到默认牌组，
 * 结果碰巧正确（V1 的外观就是月光）。但那是运气，不是设计：
 * 一旦将来默认牌组改成 ethereal（Phase 3 的计划），
 * 所有 V1 日记会突然指向一副没画完的牌。所以在这里写死。
 */
export const LEGACY_DECK_ALIASES: Readonly<Record<string, DeckId>> = {
  /* V1：唯一牌组。它的视觉就是后来的 moonlight */
  dreamlike: 'legacy-moonlight',
  /* V2.4：五套皮肤 */
  moonlight: 'legacy-moonlight',
  classic: 'legacy-classic',
  forest: 'legacy-forest',
  celestial: 'legacy-celestial',
  shadow: 'legacy-shadow',
}

/**
 * 当前牌组数据的 schema 版本。
 *
 * v1 = V2.4，deckId 取值是 moonlight/classic/forest/celestial/shadow
 * v2 = 本次，deckId 取值是上面的 10 个
 *
 * 持久化记录（session / journal entry）会带上它。没带的一律按 v1 处理。
 */
export const DECK_SCHEMA_VERSION = 2

function isDeckId(value: unknown): value is DeckId {
  return typeof value === 'string' && (ALL_DECK_IDS as readonly string[]).includes(value)
}

/**
 * 把任意来源的 deckId 解析成一个**一定合法**的 DeckId。
 *
 * 【为什么不抛错】持久化里可能存着任何东西：旧版本的值、用户手改的值、
 * 半个字符串。「换过皮肤的老用户打不开 App」是不可接受的代价 ——
 * 所以这里永远返回一个能用的牌组，绝不抛错、绝不返回 null。
 *
 * @param raw        持久化里读到的原始值
 * @param schema     该记录的 schema 版本；undefined 或 < 2 一律走别名表
 */
export function resolveDeckId(raw: unknown, schema?: number): DeckId {
  if (schema === undefined || schema < DECK_SCHEMA_VERSION) {
    if (typeof raw === 'string' && raw in LEGACY_DECK_ALIASES) {
      return LEGACY_DECK_ALIASES[raw]!
    }
  }
  return isDeckId(raw) ? raw : DEFAULT_DECK_ID
}

export function isArtworkDeck(id: DeckId): id is ArtworkDeckId {
  return (ARTWORK_DECK_IDS as readonly string[]).includes(id)
}

export function isLegacyDeck(id: DeckId): id is LegacyDeckId {
  return (LEGACY_DECK_IDS as readonly string[]).includes(id)
}
