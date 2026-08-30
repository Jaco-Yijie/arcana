/**
 * Layer 2 · 程序化牌面的**牌组视觉档案**（Phase C0）
 *
 * ══════════════════════════════════════════════════════════════
 * 【这是过渡方案，不是最终牌面】
 *
 * temporary procedural artwork —— 五套 artwork 牌组的 78×5 张真实原画
 * 属于 Phase C1，本文件与它们**没有任何关系**，也永远不会被它们使用
 * （resolveCardArtwork 的 procedural 分支只对 legacy manifest 可达）。
 *
 * 本文件只做一件事：让五套 legacy 牌组在**等真实原画的这段时间里**
 * 真的长得不一样。它不是最终产品方案，Phase 3 与 legacy 牌组一并退役。
 * ══════════════════════════════════════════════════════════════
 *
 * 【为什么需要它】
 * V2.4 的失败模式是：五套牌名字不同、文案不同、氛围不同，**牌面一模一样**。
 * 实测确认过 —— 月光的「深蓝夜空」、古典的「象牙纸面与暗金压边」、
 * 森语的「深绿苔藓与木纹」，画出来全是同一片深蓝夜空。
 *
 * 根因是 `LEGACY_CARD_ART` 只有 `cardId` 一个维度。而修法不是补素材，
 * 是让 deckId 真的参与渲染 —— 这份档案就是 deckId 进入管线之后要查的东西。
 *
 * 【差异押在哪几条通道上】
 * 边框颜色、字体、hue 这类是**次级**识别信息：在牌组库 60px 宽的缩略图上
 * 它们全部读作「深色长方形」。真正在缩略图尺寸下还成立的只有三条：
 *
 *   1. groundValue —— 卡面明度。一张浅牌和一张深牌并排，24px 就能分辨
 *   2. stroke      —— 线条性格。无硬边 / 均匀刻线 / 发丝 / 有机曲线 / 硬边高反差
 *   3. lighting    —— 光源方向。「光从斜上方来」和「光没有来源」一眼可分
 *
 * 所以这三条是主轴，texture 与 palette 是辅助。
 */

import type { DeckId } from '../ids'

/* ══════════════════════════════════════════════════════════════
 * 档案定义
 * ══════════════════════════════════════════════════════════ */

/**
 * 卡面明度极性。
 *
 * `dark` = 夜空底 + 浅色线（八套里的常态）
 * `light` = 纸面底 + 深色线（古典那套「象牙纸张」的解法）
 *
 * 【为什么这是结构差异而不是滤镜】
 * 极性一翻转，天地、线条、光源三者的角色**全部互换**：
 * 深色牌里 `lumen` 是发光体、`ink` 是银色发丝线；
 * 浅色牌里 `lumen` 是暖金晕染、`ink` 是深棕刻线，地面反而比天空浅。
 * 这不是同一张图调个滤镜就能得到的。
 */
export type ArtPolarity = 'dark' | 'light'

/**
 * 线条性格。直接决定 stroke-width / stroke-opacity / 是否有硬边。
 *
 * dissolving  没有闭合硬边，全靠明度差成立（月光）
 * engraving   均匀线宽的刻印线，像铜版画（古典）
 * organic     粗细有变化的有机曲线（森语）
 * hairline    极细发丝线，几乎不占面积（星图）
 * harsh       高反差硬边，明暗直接切开（幽影）
 */
export type StrokePersonality = 'dissolving' | 'engraving' | 'organic' | 'hairline' | 'harsh'

/**
 * 材质。以极轻的叠层实现，绝不做成噪点贴图。
 *
 * none        没有材质，材质就是空气本身
 * paper       纸纤维
 * wood        木纹
 * mist        雾面
 * grain       极细颗粒
 */
export type TextureProfile = 'none' | 'paper' | 'wood' | 'mist' | 'grain'

/**
 * 光源。这是缩略图尺寸下第二强的识别锚点。
 *
 * diffuse      漫射，没有明确来源
 * top-left     左上单点
 * oblique      高处斜射，阴影很长
 * scattered    四散，没有主光源
 * single-hard  单侧硬光，影子边界清晰
 */
export type LightingProfile = 'diffuse' | 'top-left' | 'oblique' | 'scattered' | 'single-hard'

export interface DeckArtProfile {
  /** 档案 id，进 identity 与断言 */
  profileId: string
  polarity: ArtPolarity
  /**
   * 卡面基准明度（OKLCH L）。**五套两两不同，由 deck:check 断言。**
   * 这是全套差异化里最强的一条通道。
   */
  groundValue: number
  /** 主色相基准（OKLCH H） */
  baseHue: number
  /** 每张牌在基准色相上下浮动的幅度（度）。窄 = 78 张更像同一副牌 */
  hueSpread: number
  /** 表面层饱和度。受 G-18 约束，一律 ≤ 0.06 */
  chroma: number
  stroke: StrokePersonality
  texture: TextureProfile
  lighting: LightingProfile
  /** 线条基准不透明度。配合 stroke 决定线的存在感 */
  strokeOpacity: number
  /** 线条基准宽度倍率，作用于所有母题的 strokeWidth */
  strokeScale: number
  /** 暗角强度 0–1 */
  vignette: number
}

/* ══════════════════════════════════════════════════════════════
 * 五套 legacy 牌组的档案
 *
 * 每一套的取值都直接来自 registry.ts 里那套牌自己的 description ——
 * 文案已经把房间描述清楚了，这里只是把它翻译成可渲染的参数。
 * 「文案说象牙纸面、画出来却是深蓝夜空」这种事不该再发生。
 * ══════════════════════════════════════════════════════════ */

const PROFILES: Record<string, DeckArtProfile> = {
  /* 古典 —— 「象牙纸张、暗金压边、深酒红的印记，纸面带着旧书的黄」
     全场唯一的浅色牌。它一张就把明度阶梯的上端撑起来了。 */
  'legacy-classic': {
    profileId: 'ivory-engraving',
    polarity: 'light',
    groundValue: 0.86,
    baseHue: 82,
    hueSpread: 10,
    chroma: 0.028,
    stroke: 'engraving',
    texture: 'paper',
    lighting: 'top-left',
    strokeOpacity: 0.55,
    strokeScale: 1.15,
    vignette: 0.22,
  },

  /* 月光 —— 「深蓝夜空、银线与月相。薄雾贴着地平线，光是柔的，不刺眼」
     没有一根硬边线，形体全靠明度差成立。 */
  'legacy-moonlight': {
    profileId: 'mist-lunar',
    polarity: 'dark',
    groundValue: 0.34,
    baseHue: 246,
    hueSpread: 14,
    chroma: 0.042,
    stroke: 'dissolving',
    texture: 'mist',
    lighting: 'diffuse',
    strokeOpacity: 0.2,
    strokeScale: 0.7,
    vignette: 0.14,
  },

  /* 森语 —— 「深绿、苔藓与木纹，叶隙落下几束琥珀色的光」
     唯一一套有机曲线 + 木纹材质。 */
  'legacy-forest': {
    profileId: 'moss-organic',
    polarity: 'dark',
    groundValue: 0.24,
    baseHue: 148,
    hueSpread: 16,
    chroma: 0.05,
    stroke: 'organic',
    texture: 'wood',
    lighting: 'oblique',
    strokeOpacity: 0.4,
    strokeScale: 1.3,
    vignette: 0.3,
  },

  /* 星图 —— 「午夜蓝紫、星云与星座连线，金色星点小到需要凑近看」
     线细到几乎不占面积，光四散没有主光源。 */
  'legacy-celestial': {
    profileId: 'midnight-hairline',
    polarity: 'dark',
    groundValue: 0.17,
    baseHue: 288,
    hueSpread: 20,
    chroma: 0.055,
    stroke: 'hairline',
    texture: 'none',
    lighting: 'scattered',
    strokeOpacity: 0.34,
    strokeScale: 0.55,
    vignette: 0.26,
  },

  /* 幽影 —— 「黑、灰银与一点暗紫，几乎没有颜色，只有明暗」
     明度阶梯的下端。单侧硬光，明暗直接切开。 */
  'legacy-shadow': {
    profileId: 'obsidian-harsh',
    polarity: 'dark',
    groundValue: 0.1,
    baseHue: 300,
    hueSpread: 8,
    chroma: 0.016,
    stroke: 'harsh',
    texture: 'grain',
    lighting: 'single-hard',
    strokeOpacity: 0.62,
    strokeScale: 1.5,
    vignette: 0.46,
  },
}

/** 兜底档案。持久化里可能存着任何 deckId，绝不能因此白屏 */
const FALLBACK: DeckArtProfile = PROFILES['legacy-moonlight']!

/**
 * 取某副牌的程序化视觉档案。
 *
 * **这是 deckId 真正进入牌面渲染的地方。**
 * 在此之前 `LEGACY_CARD_ART[cardId]` 是唯一入口，deckId 在那条路上被丢弃，
 * 五套牌因此逐像素相同。deck:check 的 G 组会断言这个函数确实被渲染层调用。
 */
export function getArtProfile(deckId: DeckId | string): DeckArtProfile {
  return PROFILES[deckId] ?? FALLBACK
}

/** 供断言与调试使用 */
export const ART_PROFILE_IDS = Object.keys(PROFILES)
export const ART_PROFILES = PROFILES
