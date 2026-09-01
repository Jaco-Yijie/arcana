/**
 * Phase C1A · 艺术指导 Schema
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么设计规则要进类型系统，而不是只写在 Markdown 里】
 *
 * 这个项目已经吃过一次亏：19 号文写了 96KB 的视觉方向，20 号文写了 28KB 的
 * 素材 brief，对应的产出是 3 张占位图。文档写得再好，只要它不进代码，
 * 就没有任何机制保证「五套牌真的不一样」——V2.4 的失败正是这么来的。
 *
 * 所以这里的规则同时是：
 *   human readable —— 每个字段都是给美术看的、可执行的句子
 *   machine readable —— artwork:check 能断言「五套的 medium 两两不同」
 *
 * 【它管什么，不管什么】
 * 只描述**怎么画**。牌义、正逆位、symbols 全部来自 Layer 1 的 78 张语义层，
 * Bible 与 Brief 都不得改写它们（ART-03 / ART-08 断言这一点）。
 * ══════════════════════════════════════════════════════════════
 */

import type { DeckId } from '../ids'

/* ══════════════════════════════════════════════════════════════
 * 一、DeckArtBible —— 一套牌的完整视觉世界观
 * ══════════════════════════════════════════════════════════ */

export interface DeckIdentity {
  /** 中文名，与 registry 的 name 一致（artwork:check 断言） */
  name: string
  /** 一句话视觉论点。美术看完这句应该知道这套牌"是什么" */
  visualThesis: string
  /** 3–5 个核心情绪词 */
  coreMood: string[]
  /** 用户看到这套牌时应该产生的感受 */
  emotionalKeywords: string[]
}

export interface DeckMedium {
  /** 主媒介。五套两两不同 —— 这是"不同艺术指导"最基本的证据 */
  primary: string
  secondary: string[]
  /** 纸面 / 表面材质 */
  surfaceTexture: string
  /** 印刷特征。实体收藏感的主要来源 */
  printCharacter: string
}

export interface DeckPalette {
  dominant: string[]
  accent: string[]
  /** 明令禁止的颜色。防止五套逐渐漂成同一个"黑金玄学"模板 */
  forbidden: string[]
  /** 明度性格。与 atmosphere 的 groundValue 呼应但独立 —— 这是卡面，不是页面 */
  luminanceProfile: string
}

export interface DeckLineLanguage {
  weight: string
  behavior: string
  /** 边缘性格：化开 / 刻印 / 有机抖动 / 发丝 / 硬切 */
  edgeCharacter: string
}

export interface DeckComposition {
  subjectScale: string
  depth: string
  symmetry: string
  negativeSpace: string
  perspective: string
}

export interface DeckLighting {
  source: string
  direction: string
  contrast: string
  behavior: string
}

/** 同一类对象在这套牌里长什么样。缺了它，五套的人物会画成同一个人 */
export interface DeckSubjectLanguage {
  humans: string
  animals: string
  architecture: string
  nature: string
  objects: string
}

export interface DeckFrameSpec {
  structure: string
  ornament: string
  titlePlacement: string
  numberPlacement: string
}

export interface DeckTypographySpec {
  personality: string
  caseStyle: string
  numberingStyle: string
}

export interface DeckCardBackSpec {
  composition: string
  symmetry: string
  motifs: string[]
}

export interface DeckArtBible {
  deckId: DeckId
  identity: DeckIdentity
  medium: DeckMedium
  palette: DeckPalette
  lineLanguage: DeckLineLanguage
  composition: DeckComposition
  lighting: DeckLighting
  subjectLanguage: DeckSubjectLanguage
  frame: DeckFrameSpec
  typography: DeckTypographySpec
  cardBack: DeckCardBackSpec
  /** 整套牌的禁令。比 palette.forbidden 更宽，含题材与手法 */
  forbidden: string[]
}

/* ══════════════════════════════════════════════════════════════
 * 二、CardArtBrief —— 单张牌的生产规格
 * ══════════════════════════════════════════════════════════ */

/**
 * 牌义部分。**全部从 Layer 1 读取，不手写。**
 *
 * 手写就意味着可以被改写，而"为了画面漂亮改牌义"正是 §8 明令禁止的。
 * 这个结构由 `buildCardArtBrief` 从 `allCards` 填充，Brief 表里没有它的位置。
 */
export interface BriefTarot {
  cardId: string
  name: string
  nameZh: string
  arcana: string
  suit?: string
  number: number
  /** = keywordsUpright，语义层原样 */
  semanticCore: readonly string[]
  /** = symbols，语义层原样。八套共用同一份 */
  symbolism: readonly string[]
  /**
   * = TarotCard.symbolism（可选的 title/meaning 详解），语义层原样。
   *
   * 【为什么两个字段都要】
   * 扁平的 `symbols` 已经进了 Reading 的 Prompt，是对外契约，不能动。
   * 但美术只拿到「悬崖边缘」四个字是不够的 ——
   * A-09 要求「每一条象征都能在画面里找到对应（可换物件，不可缺功能）」，
   * 而"功能"写在 meaning 里。Brief 少读这一层，美术就只能靠猜。
   * 语义层原本就有，之前只是没被接上来。
   */
  symbolMeanings: readonly { title: string; meaning: string }[]
  meaningUpright: string
  meaningReversed: string
}

/** 画面内容。这是 Brief 里唯一手写的部分，必须具体到可直接出图 */
export interface BriefVisual {
  /** 画面主体。必须是人 / 动物 / 具体物，不能是几何形 */
  heroSubject: string
  /** 叙事瞬间：主体正在做什么、处在故事的哪一刻 */
  narrativeMoment: string
  /** 视角与取景 */
  camera: string
  foreground: string
  midground: string
  background: string
  /** 象征元素落在画面的什么位置 */
  symbolPlacement: string[]
}

/** 由 DeckArtBible 投影而来，保证 Brief 与 Bible 不会漂 */
export interface BriefDeckTranslation {
  medium: string
  palette: readonly string[]
  lineLanguage: string
  lighting: string
  environment: string
  frame: string
  typography: string
}

export interface CardArtBrief {
  cardId: string
  deckId: DeckId
  tarot: BriefTarot
  visual: BriefVisual
  deckTranslation: BriefDeckTranslation
  /** 必须出现在画面里的东西。少一条即退回 */
  mustInclude: string[]
  optional: string[]
  forbidden: string[]
  /**
   * 图像生产阶段必须逐字下发的硬约束。
   *
   * 与 mustInclude 不同：这里放的是可机械核验、不能用近似表达替代的条件，
   * 例如数字牌的精确数量与关键 Major 的主体姿态。
   */
  visualProductionConstraints: readonly string[]
  /** 缩到 60px 宽时，仍然必须认得出的那一个东西（A-05） */
  thumbnailAnchor: string
}

/** 手写部分。`buildCardArtBrief` 把它与语义层、Bible 合成完整 Brief */
export interface CardBriefSeed {
  visual: BriefVisual
  mustInclude: string[]
  optional?: string[]
  /** 这一张特有的禁令，会与 Bible 的整套禁令合并 */
  forbidden?: string[]
  thumbnailAnchor: string
}

/* ══════════════════════════════════════════════════════════════
 * 三、Artwork 状态
 * ══════════════════════════════════════════════════════════ */

/**
 * 一张原画在生产管线里的位置。
 *
 * placeholder 还没画，当前由 ProceduralCardArt 顶着
 * benchmark   本轮 25 张试产，用于验证 Style Bible 是否成立 —— **不是正式交付**
 * approved    通过 Quality Gate，可以进正式牌组
 * final       已定稿并交付，返修需要升 rev
 *
 * 【为什么必须有这个字段】
 * 上一次 `devFixture: true` 这个布尔量已经证明不够用 ——
 * 它只能表达"这是假的"，表达不了"这是试产，等验收"。
 * 而"哪些只是测试、哪些已经批准"是 390 张生产期间每天都要回答的问题。
 */
export type ArtworkStatus = 'placeholder' | 'benchmark' | 'approved' | 'final'

export const ARTWORK_STATUSES: readonly ArtworkStatus[] = [
  'placeholder',
  'benchmark',
  'approved',
  'final',
]

/** 只有这两档算"真正可以给用户看的正式原画" */
export function isDeliveredStatus(s: ArtworkStatus): boolean {
  return s === 'approved' || s === 'final'
}
