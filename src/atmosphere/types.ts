/**
 * Layer 3 · 氛围层类型（Atmosphere Layer）
 *
 * 【这一层管什么】
 * 页面背景、光效、粒子、整体色温。一句话：**你待在什么样的房间里。**
 *
 * 【为什么要把它从牌组里拆出来】
 * 氛围是「整页」的，牌面是「卡上」的，两者验收标准完全不同：
 * 氛围要过对比度与功耗，牌面要过美术一致性。
 * 拆开之后 deck:check 能分别断言两组不变量，而且「古典牌那套
 * 纸在卡上、暗在页上」的解法变成结构性的 ——
 * 卡面亮度归 Layer 2 管，页面底色归 Layer 3 管，两边不可能互相污染。
 *
 * 【拆层不等于可组合】
 * deck → atmosphere 是 **1:1 固定映射**，不开放用户自由搭配。
 * 开放组合会把 QA 面从 10 种炸成 100 种（对比度、卡面与底色串味、
 * bg-void 亮度断言全部要按组合跑），而且用户搭出来的大概率比设计定的难看。
 * 拆层的目的是「分别可断言」，不是「可组合」—— 这条要一直记着。
 */

/** 十套氛围：五套服务 artwork 牌组，五套服务 legacy 牌组 */
export type AtmosphereId =
  /* ── artwork 牌组 ── */
  | 'veil-light'
  | 'obsidian'
  | 'iridescent'
  | 'thicket'
  | 'oldroom'
  /* ── legacy 牌组（V2.4 遗留，Phase 3 后退役） ── */
  | 'starfield'
  | 'parchment'
  | 'canopy'
  | 'nebula'
  | 'depth'

/**
 * 要覆盖的 CSS 变量。键名对应 styles/theme.css 里 `@theme` 定义的 token。
 *
 * 【十套的键必须完全一致】少一个键，换到那套时那条变量就会保留上一套的值，
 * 出现「森语的绿配着幽影的紫」这种串味，而且极难排查。deck:check 断言它。
 */
export interface ThemeVars {
  '--color-bg-void': string
  '--color-bg-deep': string
  '--color-bg-raised': string
  '--color-surface-1': string
  '--color-surface-2': string
  '--color-surface-3': string
  '--color-text-hi': string
  '--color-text-mid': string
  '--color-text-low': string
  '--color-text-faint': string
  /** 主强调：选中、焦点、可交互边 */
  '--color-silver': string
  '--color-silver-dim': string
  /** 次强调：仪式性瞬间（翻牌、完成）。用量 <5% */
  '--color-gold': string
  '--color-gold-dim': string
  /** 卡牌本体底色。**注意它是卡上的，不是页面的** —— 古典/空灵靠它做浅色卡面 */
  '--color-card-sky-a': string
  '--color-card-sky-b': string
  '--color-line-hairline': string
  '--color-line-soft': string
  '--color-line-strong': string
}

/** 明暗结构：三层 CSS 渐变 */
export interface AtmosphereLayers {
  /** 整体明暗塑形 */
  shape: string
  /** 缓慢漂移的雾 */
  drift: string
  /** 呼吸的那一小团 */
  breath: string
  /** 雾整体强度，0 表示这套氛围不要雾 */
  driftOpacity: number
}

/**
 * 页面光源模型。**它影响整页环境，不是 SVG 装饰。**
 *
 * 【为什么必须显式声明】
 * 旧版光源方向藏在 `layers.shape` 那串 CSS 渐变的坐标里
 * （比如 obsidian 写的是 `at 82% 8%`）—— 能看出来的只有读过那串字符串的人，
 * 断言看不见，改的人也不知道自己在改什么。
 * 更要紧的是：它没有被当成一条**可比较的维度**，
 * 于是十套氛围的差异全部退回到色相，而色相在 chroma ≤ 0.05 时几乎不可见。
 *
 * 【为什么光源比色相有效】
 * 「光从斜上方来」和「光没有来源」是一眼可分的；
 * 色相 118 和色相 232 在 chroma 0.02 下，人眼分不出来。
 */
export type AtmosphereLighting =
  /** 漫射，没有来源。整片空间均匀发亮 */
  | 'diffuse-mist'
  /** 月光：高处冷白，柔边，影子很淡 */
  | 'moonlight'
  /** 硬斜射：明确方向，长影，明暗界线清楚 */
  | 'hard-oblique'
  /** 叶隙碎光：多个小光斑，方向一致但被打散 */
  | 'dappled'
  /** 水下焦散：光从下方反射上来，边缘会游动 */
  | 'caustics'
  /** 暖局部光：一盏灯，光衰减很快，外圈迅速吃进暗处 */
  | 'warm-lamp'
  /** 顶光：从正上方压下来，水平面亮、垂直面暗 */
  | 'top-light'
  /** 边缘光：主体背光，只有轮廓亮，中间是暗的 */
  | 'edge-light'
  /** 四散：没有主光源，光点自己发光 */
  | 'scattered'
  /** 来源不明：位置说不通，亮度也不合理 */
  | 'uncanny-glow'

/**
 * 页面空间结构。
 *
 * 验收标准很直接：**只看背景、不看牌，也应该能大致判断这是哪一套。**
 * 所以这一维必须十套两两不同。
 */
export type AtmosphereStructure =
  | 'fog-bands'
  | 'light-shafts'
  | 'tide-lines'
  | 'arch-and-vines'
  | 'lamp-and-table'
  | 'open-starfield'
  | 'paper-fibre'
  | 'canopy-gaps'
  | 'nebula-band'
  | 'concentric-depth'

export interface AtmosphereSpec {
  atmosphereId: AtmosphereId

  /**
   * 页面底色明度（OKLCH L），必须与 `themeVars['--color-bg-void']` 的 L 一致
   * （deck:check 断言两者不许漂）。
   *
   * 【为什么把它单独提出来】
   * 它原本只存在于那串 `oklch(0.145 0.022 265)` 里，没有任何东西能比较它。
   * 结果十套全部挤在 0.105–0.168，最亮与最暗只差 1.60 倍 ——
   * 换牌组时用户看到的页面几乎是同一片黑。
   * 提成字段之后，「十套明度必须拉开」才可能变成断言。
   *
   * 上限 0.22 是既有纪律（G-18）：卡面与文字都是按深色底设计的，不放宽。
   * 差异化要在这个上限**之内**做足，而不是靠突破它。
   */
  groundValue: number

  /**
   * 页面底色与面板底色之间的明度差（surface-1.L − bg-void.L）。
   *
   * 这是本轮新增的第二条明度轴，作用比 groundValue 更微妙也更有效：
   * 差值小 = 面板几乎浮不出来，整片空间是糊的（空灵的雾）；
   * 差值大 = 面板像悬在虚空里，边界锋利（幽影的黑）。
   * 两套牌即使平均明度接近，只要这个差值不同，看起来就不是同一个空间。
   */
  tonalRange: number

  lighting: AtmosphereLighting
  structure: AtmosphereStructure

  themeVars: ThemeVars
  layers: AtmosphereLayers
  /**
   * 粒子严格受限：不做 canvas 逐帧（移动端功耗），
   * 点位用固定种子在模块加载时算一次，静止不闪烁。
   */
  particles: 'none' | 'static-dust' | 'static-stars' | 'static-motes'
}
