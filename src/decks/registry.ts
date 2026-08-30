/**
 * Layer 2 · 十套牌组定义
 *
 * 五套 artwork（目标牌组）+ 五套 legacy（V2.4 遗留，Phase 3 后退役）。
 *
 * 【文案纪律：只描述房间，不描述效果】
 * tagline 与 description 只能写光线、材质、温度、时刻、空间；
 * 不能写「准」「清楚」「指引」「适合」「帮你」这类效果词。
 *
 * 原因很实在：Deck Library 是全站唯一一次让用户**在我们的东西之间做选择**。
 * 人面对一组并列的同类物品时，默认心理动作是排序，而在塔罗语境里
 * 「更好」没有别的翻译方向，只会被读成「更灵」。
 * 所以这一页必须结构性地拿掉所有可比维度，只留一个不可比的维度：
 * **你想待在哪个房间里。** 房间没有好坏。
 *
 * 顺带说明：V2.4 的旧文案自己也不合格 —— 月光那句
 * 「它不催你做决定，只是把问题照亮一点点」里，「把问题照亮」就是效果描述。
 * 这条纪律不是空话，是真的会咬人的。deck:check D 组按禁用词表断言它。
 */

import type { DeckDefinition, DeckVisualSpec } from './types'
import type { DeckId } from './ids'
import { ALL_DECK_IDS, DEFAULT_DECK_ID } from './ids'

/* ══════════════════════════════════════════════════════════════
 * 装帧规格
 *
 * 边框 / 字体 / 编号 / 装饰是 Layer 2 的正当职责，且**不依赖位图素材** ——
 * 所以它们在 Phase 1 就能真正落地，是五套牌当前最实在的差异来源。
 * 注意：这里用的是系统字体栈。定制字体属于 Phase 2 的素材需求，
 * 在字体文件到位之前，不假装已经有了。
 * ══════════════════════════════════════════════════════════ */

const etherealVisual: DeckVisualSpec = {
  frame: {
    borderColor: 'var(--color-silver)',
    borderWidth: 0.5,
    inlay: 'none',
    vignette: 0.1,
  },
  typography: {
    nameFont: '"Optima", "Palatino Linotype", "Songti SC", serif',
    nameWeight: 300,
    nameTracking: '0.14em',
    nameCase: 'as-is',
  },
  numbering: { style: 'none', position: 'bottom', font: 'inherit' },
  cardBack: { kind: 'raster' },
}

const elysianVisual: DeckVisualSpec = {
  frame: {
    borderColor: 'var(--color-gold)',
    borderWidth: 1.5,
    inlay: 'double',
    vignette: 0.42,
  },
  typography: {
    nameFont: '"Baskerville", "Georgia", "Songti SC", serif',
    nameWeight: 500,
    nameTracking: '0.06em',
    nameCase: 'upper',
  },
  numbering: { style: 'roman', position: 'top', font: '"Baskerville", Georgia, serif' },
  cardBack: { kind: 'raster' },
}

const opalineVisual: DeckVisualSpec = {
  frame: {
    borderColor: 'var(--color-silver)',
    borderWidth: 1,
    inlay: 'hairline',
    vignette: 0.18,
  },
  typography: {
    nameFont: '"Futura", "Avenir Next", "PingFang SC", sans-serif',
    nameWeight: 400,
    nameTracking: '0.2em',
    nameCase: 'upper',
  },
  numbering: { style: 'arabic', position: 'corner', font: '"Avenir Next", sans-serif' },
  cardBack: { kind: 'raster' },
}

const wonderlandVisual: DeckVisualSpec = {
  frame: {
    borderColor: 'var(--color-gold)',
    borderWidth: 1.2,
    inlay: 'hairline',
    vignette: 0.5,
  },
  typography: {
    nameFont: '"Didot", "Bodoni 72", "Songti SC", serif',
    nameWeight: 400,
    nameTracking: '0.1em',
    nameCase: 'as-is',
  },
  numbering: { style: 'roman', position: 'bottom', font: '"Didot", "Bodoni 72", serif' },
  cardBack: { kind: 'raster' },
}

const classicVisual: DeckVisualSpec = {
  frame: {
    borderColor: 'var(--color-gold-dim)',
    borderWidth: 2,
    inlay: 'double',
    vignette: 0.3,
  },
  typography: {
    nameFont: '"Hoefler Text", "Times New Roman", "Songti SC", serif',
    nameWeight: 600,
    nameTracking: '0.04em',
    nameCase: 'upper',
  },
  numbering: { style: 'roman', position: 'top', font: '"Hoefler Text", "Times New Roman", serif' },
  cardBack: { kind: 'raster' },
}

/** legacy 牌组共用 V2.4 的装帧：统一 serif、无编号、程序化卡背 */
function legacyVisual(composition: DeckVisualSpec['cardBack']['composition']): DeckVisualSpec {
  return {
    frame: {
      borderColor: 'var(--color-silver)',
      borderWidth: 1,
      inlay: 'hairline',
      vignette: 0.2,
    },
    typography: {
      nameFont: 'var(--font-serif, serif)',
      nameWeight: 400,
      nameTracking: '0.02em',
      nameCase: 'as-is',
    },
    numbering: { style: 'none', position: 'bottom', font: 'inherit' },
    cardBack: { kind: 'procedural', composition },
  }
}

/* ══════════════════════════════════════════════════════════════
 * 牌组
 * ══════════════════════════════════════════════════════════ */

export const decks: DeckDefinition[] = [
  /* ── 五套 artwork 牌组 ── */
  {
    deckId: 'ethereal',
    kind: 'artwork',
    name: '空灵',
    tagline: '雾还没散，光已经在了',
    description:
      '近乎无色的灰蓝与白，边缘都是化开的。画面里留白比东西多，物体像浮在半空又没落地。它不急着说什么，只是把周围安静下来。',
    visual: etherealVisual,
    atmosphereId: 'veil-light',
  },
  {
    deckId: 'elysian',
    kind: 'artwork',
    name: '极乐之影',
    tagline: '树荫底下，光是暖的',
    description:
      '橄榄绿、旧金与深棕，光从高处斜着下来，落在石头和叶子上。阴影很长，但不冷。像午后走进一片有围墙的园子，外面的事都还在，只是暂时听不见了。',
    visual: elysianVisual,
    atmosphereId: 'obsidian',
  },
  {
    deckId: 'opaline',
    kind: 'artwork',
    name: '蛋白潮汐',
    tagline: '潮水退下去之后留的颜色',
    description:
      '极淡的青、粉与紫在同一片表面上互相换位，像蛋白石，也像退潮后湿沙上的那层反光。颜色一直在动，形状却很稳，看久了整片画面像在轻轻呼吸。',
    visual: opalineVisual,
    atmosphereId: 'iridescent',
  },
  {
    deckId: 'wonderland',
    kind: 'artwork',
    name: '仙境之影',
    tagline: '再往里走一点就不一样了',
    description:
      /* 这里原本写的是「门比人矮，月亮比屋顶低」。
         「月亮」正好是 major-18 的牌名，被 deck:check 的「牌组不含牌名」拦下了。
         那条断言的本意是防止某套牌给牌改名（把「死神」叫成「转化」），
         这里属于误伤 —— 但改一句文案，比放宽一条守着产品哲学的断言划算。 */
      '深紫与墨绿的藤蔓、镜子和拱门，比例被轻轻拧过一点：门比人矮，镜子里的房间比外面大。不是恐怖，是那种明明认得、又说不上哪里不对的地方。',
    visual: wonderlandVisual,
    atmosphereId: 'thicket',
  },
  {
    deckId: 'classic',
    kind: 'artwork',
    name: '经典',
    tagline: '一副被翻了很多年的牌',
    description:
      '象牙纸张、暗金压边、深酒红的印记，纸面带着旧书的黄。像在一间点着灯的老屋里，从抽屉深处拿出一副保存很久的牌 —— 纹样是刻上去的，不是印上去的。',
    visual: classicVisual,
    atmosphereId: 'oldroom',
  },

  /* ── 五套 legacy 牌组 ──
     它们保证现有用户的抽牌流程与历史日记不断。
     Phase 3（五套 artwork 全部 78/78）之后退役。 */
  {
    deckId: 'legacy-moonlight',
    kind: 'legacy',
    name: '月光',
    tagline: '夜里最安静的那一段',
    description: '深蓝夜空、银线与月相。薄雾贴着地平线，光是柔的，不刺眼。',
    visual: legacyVisual('lunar'),
    atmosphereId: 'starfield',
  },
  {
    deckId: 'legacy-classic',
    kind: 'legacy',
    name: '古典',
    tagline: '象牙纸面与暗金压边',
    description: '象牙纸张、暗金压边、深酒红的印记，纸面带着一点旧书的黄。',
    visual: legacyVisual('orbit'),
    atmosphereId: 'parchment',
  },
  {
    deckId: 'legacy-forest',
    kind: 'legacy',
    name: '森语',
    tagline: '林子里的光会自己找路',
    description: '深绿、苔藓与木纹，叶隙落下几束琥珀色的光。这一套把节奏放得更慢。',
    visual: legacyVisual('botanic'),
    atmosphereId: 'canopy',
  },
  {
    deckId: 'legacy-celestial',
    kind: 'legacy',
    name: '星图',
    tagline: '你在一张很大的图上',
    description: '午夜蓝紫、星云与星座连线，金色星点小到需要凑近看。',
    visual: legacyVisual('constellation'),
    atmosphereId: 'nebula',
  },
  {
    deckId: 'legacy-shadow',
    kind: 'legacy',
    name: '幽影',
    tagline: '往回看的那一面',
    description: '黑、灰银与一点暗紫，几乎没有颜色，只有明暗。这一套是向内的。',
    visual: legacyVisual('veil'),
    atmosphereId: 'depth',
  },
]

export const deckById: Record<DeckId, DeckDefinition> = Object.fromEntries(
  decks.map((deck) => [deck.deckId, deck]),
) as Record<DeckId, DeckDefinition>

/**
 * 按 id 取牌组。
 *
 * 【为什么不抛错】持久化里可能存着旧值或被手改过的值。
 * 「换过皮肤的老用户打不开 App」是不可接受的代价 ——
 * 这里静默回落到默认牌组。调用方若需要严格校验，用 resolveDeckId。
 */
export function getDeck(id: DeckId): DeckDefinition {
  return deckById[id] ?? deckById[DEFAULT_DECK_ID]
}

export const artworkDecks = decks.filter((d) => d.kind === 'artwork')
export const legacyDecks = decks.filter((d) => d.kind === 'legacy')

export { ALL_DECK_IDS, DEFAULT_DECK_ID }
