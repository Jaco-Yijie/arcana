/**
 * Legacy 牌组的程序化牌面数据（Layer 2 · 视觉层）
 *
 * 【为什么这 78 条从牌义数据里搬到了这里】
 * motif / hue / tier 描述的是「这张牌画成什么样」，属于视觉，不属于牌义。
 * 它原本长在 TarotCard.art 上，导致一张牌**结构上只能有一套美术** ——
 * 这正是 V2.4「五套牌组共用同一张牌面」的根因。
 *
 * 搬到视觉层之后：
 * - 牌义层（src/data/deck）不再有任何视觉字段，换牌组不可能碰到牌义
 * - 每套牌组各自持有自己的美术资产，legacy 用的就是这张表
 *
 * 【本表只服务 legacy 牌组】
 * 五套 artwork 牌组用的是 public/assets/decks/<deckId>/ 下的真实插画，
 * 绝不回退到这张表 —— 那会让「程序化占位图冒充最终牌面」重新发生。
 */

/**
 * 牌面构图母题。仅 legacy 牌组使用。
 *
 * 【为什么从 12 个扩到 26 个 —— Phase C0】
 * 12 个母题分给 78 张牌，`gate` / `seed` / `path` / `flame` 各被 9 张牌复用。
 * 后果实测过：一次五张牌的抽牌里三张是同一张「门」，
 * 蒙特卡洛算下来 5 张牌阵有 **63.4%** 的概率出现画面重复的牌。
 * 那会直接摧毁「每张牌都不一样」这件事 —— 用户看到的是同一张画出现了三次。
 *
 * 扩到 26 个之后单母题最大复用降到 4 张，5 张牌阵撞脸率降到 27.6%。
 *
 * 【母题不是随机分配的】
 * cardId → motif 是一张**静态确定性表**（见下方 LEGACY_CARD_ART）：
 * 隐士永远是提灯，高塔永远是风暴，宝剑首牌永远是剑。
 * 同一张牌今天是提灯、刷新一下变成门，会让人觉得牌面是随机生成的装饰，
 * 而不是这张牌本来的样子。
 */
export type ArtMotif =
  /* 几何 */
  | 'gate' | 'pillar' | 'circle' | 'split' | 'horizon' | 'stair' | 'tower' | 'threshold'
  /* 自然 */
  | 'flame' | 'seed' | 'branch' | 'wave' | 'moon' | 'sun' | 'mountain' | 'storm' | 'tide'
  /* 象征物 */
  | 'sword' | 'cup' | 'crown' | 'lantern' | 'star' | 'mirror' | 'orbit' | 'veil' | 'path'

export interface LegacyArtSpec {
  motif: ArtMotif
  /** 0–360，映射到 240°–272° 的窄色带 */
  hue: number
  /** signature 比 placeholder 多一层细节 */
  tier: 'signature' | 'placeholder'
}

/** cardId → legacy 牌面美术。78 张齐全，由 deck:check 断言。 */
export const LEGACY_CARD_ART: Record<string, LegacyArtSpec> = {
  'major-00': { motif: 'threshold', hue: 210, tier: 'signature' },
  'major-01': { motif: 'flame', hue: 275, tier: 'signature' },
  'major-02': { motif: 'pillar', hue: 250, tier: 'signature' },
  'major-03': { motif: 'seed', hue: 292, tier: 'placeholder' },
  'major-04': { motif: 'tower', hue: 224, tier: 'placeholder' },
  'major-05': { motif: 'gate', hue: 262, tier: 'placeholder' },
  'major-06': { motif: 'split', hue: 300, tier: 'signature' },
  'major-07': { motif: 'path', hue: 218, tier: 'placeholder' },
  'major-08': { motif: 'flame', hue: 42, tier: 'placeholder' },
  'major-09': { motif: 'lantern', hue: 232, tier: 'signature' },
  'major-10': { motif: 'circle', hue: 268, tier: 'placeholder' },
  'major-11': { motif: 'mirror', hue: 206, tier: 'placeholder' },
  'major-12': { motif: 'veil', hue: 244, tier: 'placeholder' },
  'major-13': { motif: 'tide', hue: 256, tier: 'signature' },
  'major-14': { motif: 'horizon', hue: 200, tier: 'placeholder' },
  'major-15': { motif: 'veil', hue: 286, tier: 'placeholder' },
  'major-16': { motif: 'storm', hue: 36, tier: 'placeholder' },
  'major-17': { motif: 'star', hue: 212, tier: 'signature' },
  'major-18': { motif: 'moon', hue: 248, tier: 'signature' },
  'major-19': { motif: 'sun', hue: 46, tier: 'signature' },
  'major-20': { motif: 'crown', hue: 238, tier: 'placeholder' },
  'major-21': { motif: 'orbit', hue: 282, tier: 'signature' },
  'wands-01': { motif: 'flame', hue: 38, tier: 'placeholder' },
  'wands-02': { motif: 'path', hue: 36, tier: 'placeholder' },
  'wands-03': { motif: 'mountain', hue: 34, tier: 'placeholder' },
  'wands-04': { motif: 'gate', hue: 40, tier: 'placeholder' },
  'wands-05': { motif: 'storm', hue: 33, tier: 'placeholder' },
  'wands-06': { motif: 'crown', hue: 44, tier: 'placeholder' },
  'wands-07': { motif: 'mountain', hue: 35, tier: 'placeholder' },
  'wands-08': { motif: 'stair', hue: 39, tier: 'placeholder' },
  'wands-09': { motif: 'tower', hue: 32, tier: 'placeholder' },
  'wands-10': { motif: 'stair', hue: 37, tier: 'placeholder' },
  'wands-11': { motif: 'branch', hue: 41, tier: 'placeholder' },
  'wands-12': { motif: 'branch', hue: 34, tier: 'placeholder' },
  'wands-13': { motif: 'sun', hue: 43, tier: 'placeholder' },
  'wands-14': { motif: 'flame', hue: 45, tier: 'placeholder' },
  'cups-01': { motif: 'cup', hue: 250, tier: 'placeholder' },
  'cups-02': { motif: 'mirror', hue: 252, tier: 'placeholder' },
  'cups-03': { motif: 'circle', hue: 254, tier: 'placeholder' },
  'cups-04': { motif: 'veil', hue: 247, tier: 'placeholder' },
  'cups-05': { motif: 'wave', hue: 246, tier: 'placeholder' },
  'cups-06': { motif: 'seed', hue: 249, tier: 'placeholder' },
  'cups-07': { motif: 'veil', hue: 253, tier: 'placeholder' },
  'cups-08': { motif: 'path', hue: 248, tier: 'placeholder' },
  'cups-09': { motif: 'crown', hue: 251, tier: 'placeholder' },
  'cups-10': { motif: 'sun', hue: 250, tier: 'placeholder' },
  'cups-11': { motif: 'cup', hue: 254, tier: 'placeholder' },
  'cups-12': { motif: 'wave', hue: 247, tier: 'placeholder' },
  'cups-13': { motif: 'moon', hue: 249, tier: 'placeholder' },
  'cups-14': { motif: 'tide', hue: 252, tier: 'placeholder' },
  'swords-01': { motif: 'sword', hue: 210, tier: 'placeholder' },
  'swords-02': { motif: 'split', hue: 208, tier: 'placeholder' },
  'swords-03': { motif: 'storm', hue: 206, tier: 'placeholder' },
  'swords-04': { motif: 'horizon', hue: 212, tier: 'placeholder' },
  'swords-05': { motif: 'storm', hue: 205, tier: 'placeholder' },
  'swords-06': { motif: 'tide', hue: 214, tier: 'placeholder' },
  'swords-07': { motif: 'path', hue: 209, tier: 'placeholder' },
  'swords-08': { motif: 'pillar', hue: 207, tier: 'placeholder' },
  'swords-09': { motif: 'moon', hue: 211, tier: 'placeholder' },
  'swords-10': { motif: 'sword', hue: 205, tier: 'placeholder' },
  'swords-11': { motif: 'stair', hue: 213, tier: 'placeholder' },
  'swords-12': { motif: 'split', hue: 208, tier: 'placeholder' },
  'swords-13': { motif: 'mirror', hue: 210, tier: 'placeholder' },
  'swords-14': { motif: 'sword', hue: 212, tier: 'placeholder' },
  'pentacles-01': { motif: 'seed', hue: 285, tier: 'placeholder' },
  'pentacles-02': { motif: 'wave', hue: 283, tier: 'placeholder' },
  'pentacles-03': { motif: 'gate', hue: 288, tier: 'placeholder' },
  'pentacles-04': { motif: 'tower', hue: 281, tier: 'placeholder' },
  'pentacles-05': { motif: 'threshold', hue: 282, tier: 'placeholder' },
  'pentacles-06': { motif: 'mirror', hue: 287, tier: 'placeholder' },
  'pentacles-07': { motif: 'branch', hue: 289, tier: 'placeholder' },
  'pentacles-08': { motif: 'stair', hue: 284, tier: 'placeholder' },
  'pentacles-09': { motif: 'sun', hue: 286, tier: 'placeholder' },
  'pentacles-10': { motif: 'gate', hue: 290, tier: 'placeholder' },
  'pentacles-11': { motif: 'seed', hue: 283, tier: 'placeholder' },
  'pentacles-12': { motif: 'horizon', hue: 288, tier: 'placeholder' },
  'pentacles-13': { motif: 'circle', hue: 287, tier: 'placeholder' },
  'pentacles-14': { motif: 'crown', hue: 285, tier: 'placeholder' },
}


/* ══════════════════════════════════════════════════════════════
 * 构图签名
 *
 * 【它解决什么】
 * 「26 个母题」这个数字本身并不保证画面不像。实测过两组真正会撞脸的：
 *   gate  vs threshold —— 都是「暗色实块上开一个透光的口 + 下面有地」
 *   wave  vs tide      —— 都是「四条横向水带」，只差一枚小月亮
 * 母题名不同、断言全绿，缩略图上却是同一张牌。
 *
 * 所以把每个母题的构图拆成三条**结构性**的轴，用它们组成签名：
 *   axis    主轴方向：竖 / 横 / 放射 / 无
 *   mass    主体质感：实块 / 只有线 / 发光体 / 层带 / 无主体
 *   ground  有没有地面（有地=站在世界里，无地=悬空）
 *
 * 两个母题只要三条全同，就一定会画得像 —— 这时必须改构图，不能靠改名。
 * deck:check 断言签名两两不同。
 * ══════════════════════════════════════════════════════════ */

export interface MotifSignature {
  /** 主轴方向 */
  axis: 'vertical' | 'horizontal' | 'radial'
  /** 主体质感 */
  mass: 'solid' | 'line' | 'luminous' | 'bands'
  /** 有没有地面。有地=站在世界里，无地=悬空 */
  ground: boolean
  /** 主体自身的形态比例 */
  form: 'tall' | 'wide' | 'compact' | 'diffuse'
}

export const MOTIF_SIGNATURE: Record<ArtMotif, MotifSignature> = {
  /* ── 几何 ── */
  gate:      { axis: 'vertical',   mass: 'line',     ground: false, form: 'tall' },
  pillar:    { axis: 'vertical',   mass: 'solid',    ground: true,  form: 'tall' },
  circle:    { axis: 'radial',     mass: 'line',     ground: true,  form: 'compact' },
  split:     { axis: 'vertical',   mass: 'solid',    ground: true,  form: 'diffuse' },
  horizon:   { axis: 'horizontal', mass: 'line',     ground: true,  form: 'wide' },
  stair:     { axis: 'vertical',   mass: 'bands',    ground: true,  form: 'tall' },
  tower:     { axis: 'vertical',   mass: 'solid',    ground: true,  form: 'compact' },
  threshold: { axis: 'horizontal', mass: 'solid',    ground: true,  form: 'wide' },
  /* ── 自然 ── */
  flame:     { axis: 'vertical',   mass: 'luminous', ground: true,  form: 'tall' },
  seed:      { axis: 'vertical',   mass: 'luminous', ground: true,  form: 'diffuse' },
  branch:    { axis: 'vertical',   mass: 'line',     ground: true,  form: 'tall' },
  wave:      { axis: 'vertical',   mass: 'solid',    ground: false, form: 'tall' },
  moon:      { axis: 'radial',     mass: 'luminous', ground: true,  form: 'compact' },
  sun:       { axis: 'radial',     mass: 'luminous', ground: true,  form: 'wide' },
  mountain:  { axis: 'horizontal', mass: 'solid',    ground: true,  form: 'wide' },
  storm:     { axis: 'radial',     mass: 'line',     ground: true,  form: 'diffuse' },
  tide:      { axis: 'horizontal', mass: 'bands',    ground: false, form: 'wide' },
  /* ── 象征物 ── */
  sword:     { axis: 'vertical',   mass: 'luminous', ground: true,  form: 'compact' },
  cup:       { axis: 'vertical',   mass: 'solid',    ground: true,  form: 'wide' },
  crown:     { axis: 'horizontal', mass: 'solid',    ground: true,  form: 'compact' },
  lantern:   { axis: 'vertical',   mass: 'luminous', ground: true,  form: 'wide' },
  star:      { axis: 'radial',     mass: 'luminous', ground: true,  form: 'diffuse' },
  mirror:    { axis: 'horizontal', mass: 'solid',    ground: false, form: 'tall' },
  orbit:     { axis: 'radial',     mass: 'luminous', ground: true,  form: 'wide' },
  veil:      { axis: 'horizontal', mass: 'bands',    ground: true,  form: 'diffuse' },
  path:      { axis: 'radial',     mass: 'bands',    ground: true,  form: 'tall' },
}

/**
 * 经人工比对确认「画出来确实会像」、并已在本轮重画拉开的几对。
 * deck:check 断言它们的签名互不相同 —— 防止有人日后把其中一个改回去。
 */
export const CONFUSABLE_PAIRS: ReadonlyArray<readonly [ArtMotif, ArtMotif]> = [
  ['gate', 'threshold'],
  ['wave', 'tide'],
  ['flame', 'lantern'],
  ['circle', 'orbit'],
  ['mountain', 'crown'],
]

export const LEGACY_ART_COUNT = Object.keys(LEGACY_CARD_ART).length
