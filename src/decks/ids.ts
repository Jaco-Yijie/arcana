/**
 * Layer 2 · 牌组标识
 *
 * ══════════════════════════════════════════════════════════════
 * 【先读这一段：类型名与产品状态已经脱钩了】
 * 下面两个类型名是历史产物，**不要按字面理解**：
 *
 *   LegacyDeckId  这五套现在是**唯一对用户开放的正式牌组**。
 *                 78/78 真实原画、78/78 视觉语义、AI 解读能用上各自画面。
 *   ArtworkDeckId 这五套是**尚未完成的未来牌组**（0–3/78），当前对用户隐藏。
 *
 * 名字反了，但 id 不能改：它已经写进用户的 localStorage、历史 session、
 * 日记条目、artwork.lock.json，以及 390 条视觉语义的主键。
 * 为了名字好看去重命名，等于让所有老用户的历史记录指向一副不存在的牌。
 *
 * 所以「哪几套对用户开放」这个问题**不要问 kind，也不要问类型名** ——
 * 问 PRODUCTION_DECK_IDS（见本文件下半部分）。
 * taxonomy 的整理留到未来牌组真正上线时一起做，现在优先稳定。
 * ══════════════════════════════════════════════════════════
 */

/** 未来牌组。**当前 0–3/78，对用户隐藏** —— 名字里的 "Artwork" 是历史遗留 */
export type ArtworkDeckId = 'ethereal' | 'elysian' | 'opaline' | 'wonderland' | 'classic'

/**
 * **当前正式对外的五套牌组**（见 PRODUCTION_DECK_IDS）。前缀是历史遗留，不是产品状态。
 *
 * 【为什么前缀当初必须加，现在也不能去掉】
 * 未来牌组里有一个叫 `classic`，这里也有一个叫 `classic`，
 * 但它们是完全不同的两副牌。不加前缀，老用户的历史日记会被解析成
 * 另一副还没画完的牌 —— 那是一次静默的数据损坏。这条理由今天依然成立。
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
 * 默认牌组 —— 用户看到的名字是「月光 / Moonlight」。
 *
 * 它必须永远是 PRODUCTION_DECK_IDS 里的一个：默认牌组是
 * resolveProductionDeckId 的兜底落点，指向一副不能抽的牌等于让新用户一进来就撞墙。
 * deck:check 对此有断言。
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

/* ══════════════════════════════════════════════════════════════
 * 正式对外开放的牌组
 * ══════════════════════════════════════════════════════════ */

/**
 * 当前产品**唯一**对用户开放的五套牌组。
 *
 * 【为什么 id 还带着 legacy- 前缀】
 * 它们在产品意义上早已不是「遗留」——78/78 原画、78/78 视觉语义、
 * AI 解读能用上各自真实画面的，就是这五套。但 id 不能改：
 * 它已经写进了用户的 localStorage、历史 session、日记条目、
 * artwork.lock.json 与 390 条视觉语义的主键。为了一个更好看的名字
 * 去重命名，等于让所有老用户的历史记录指向一副不存在的牌。
 * **内部 id 是数据，用户看到的是 registry 里的名字，两者不必相同。**
 * 界面上「legacy」这个词一次都不会出现。
 *
 * 【为什么是显式清单，而不是 `kind === 'legacy'` 或 isDeckPlayable】
 * kind 是技术分类，早就和产品状态脱钩了；isDeckPlayable 只看资产，
 * 看不到「视觉语义齐了没有、QA 过了没有」。
 * 「哪几套对用户开放」是一个产品决定，应该有一个能被指着看的地方。
 *
 * 【那它会不会忘记更新】
 * 不会。deck:check 有一条双向断言：清单里的每一套都必须真的齐备
 * （registry + 78 张原画 + 78 条视觉语义 + 可抽牌），
 * 而任何一套已经齐备却不在清单里的牌组**会让断言失败**并提示把它加进来。
 * 所以将来 ethereal 画完 78 张、跑完视觉语义之后，
 * 这条断言就是那个「记得回来改这一行」的提醒。
 */
export const PRODUCTION_DECK_IDS: readonly DeckId[] = [
  'legacy-moonlight',
  'legacy-classic',
  'legacy-forest',
  'legacy-celestial',
  'legacy-shadow',
]

export function isProductionDeck(id: DeckId): boolean {
  return (PRODUCTION_DECK_IDS as readonly string[]).includes(id)
}

/**
 * 解析成一个**可以用来开始新解读**的牌组。
 *
 * 【它与 resolveDeckId 的分工，这条线不能模糊】
 * resolveDeckId  —— 读历史数据用。它只保证「是个合法 DeckId」，
 *                   历史 session / 日记里存着 ethereal 也照样返回 ethereal，
 *                   那条记录才打得开、卡图才找得到、也不会被偷偷改写。
 * 这一个         —— 决定「现在这次抽牌用哪副」。不在正式清单里的一律回落默认。
 *
 * 把生产过滤加在 resolveDeckId 上会同时改掉历史解析 —— 那是静默的数据篡改。
 */
export function resolveProductionDeckId(raw: unknown, schema?: number): DeckId {
  const resolved = resolveDeckId(raw, schema)
  return isProductionDeck(resolved) ? resolved : DEFAULT_DECK_ID
}

export function isArtworkDeck(id: DeckId): id is ArtworkDeckId {
  return (ARTWORK_DECK_IDS as readonly string[]).includes(id)
}

export function isLegacyDeck(id: DeckId): id is LegacyDeckId {
  return (LEGACY_DECK_IDS as readonly string[]).includes(id)
}
