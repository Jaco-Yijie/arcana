/**
 * Layer 3 · 十套氛围定义
 *
 * 【色域纪律 G-18，十套一视同仁】
 * 并排必须一眼可分，但都属于同一个「安静的深夜天文馆」气质家族：
 * - 表面层（bg-* / surface-*）chroma 一律 ≤ 0.05，只靠**色相**区分，不靠饱和度
 * - 唯一允许高一点 chroma 的是 gold（仪式性瞬间，用量 < 5%）与卡面底色
 * - 没有任何一套出现荧光渐变、稀有度光爆、彩虹色
 * - bg-void 亮度一律 ≤ 0.22：卡面与文字都是按深色底设计的
 *
 * 【浅色诉求怎么办】
 * 空灵与经典都想要「浅」。解法不是把应用变白，而是
 * **深色页面 + 浅色卡面** —— 浅只出现在 card-sky-a/b 上，
 * 于是整叠牌的侧边与卡面呈现纸/雾的浅，而页面依旧是暗的占卜室。
 */

import type { AtmosphereId, AtmosphereSpec, ThemeVars } from './types'

/* ══════════════════════════════════════════════════════════════
 * A. Artwork 牌组的五套氛围
 * ══════════════════════════════════════════════════════════ */

/* 空灵 —— 雾还没散，光已经在了。近乎无色的灰蓝与白，留白比东西多。 */
const veilLightTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.215 0.012 232)',
  '--color-bg-deep': 'oklch(0.252 0.014 232)',
  '--color-bg-raised': 'oklch(0.282 0.015 234)',
  '--color-surface-1': 'oklch(0.315 0.015 234)',
  '--color-surface-2': 'oklch(0.368 0.014 236)',
  '--color-surface-3': 'oklch(0.428 0.013 238)',
  '--color-text-hi': 'oklch(0.968 0.006 230)',
  '--color-text-mid': 'oklch(0.820 0.010 232)',
  '--color-text-low': 'oklch(0.668 0.012 234)',
  '--color-text-faint': 'oklch(0.528 0.013 236)',
  '--color-silver': 'oklch(0.910 0.016 228)',
  '--color-silver-dim': 'oklch(0.735 0.018 230)',
  '--color-gold': 'oklch(0.880 0.042 96)',
  '--color-gold-dim': 'oklch(0.728 0.038 94)',
  /* 浅：雾面卡，不是夜空卡 */
  '--color-card-sky-a': 'oklch(0.868 0.014 228)',
  '--color-card-sky-b': 'oklch(0.788 0.020 234)',
  '--color-line-hairline': 'oklch(0.910 0.016 228 / 0.11)',
  '--color-line-soft': 'oklch(0.910 0.016 228 / 0.19)',
  '--color-line-strong': 'oklch(0.910 0.016 228 / 0.33)',
}

/* Elysian Shadows —— 树荫底下，光是暖的。橄榄绿、旧金与深棕，阴影很长但不冷。 */
const obsidianTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.096 0.016 118)',
  '--color-bg-deep': 'oklch(0.150 0.021 116)',
  '--color-bg-raised': 'oklch(0.240 0.025 114)',
  '--color-surface-1': 'oklch(0.272 0.026 112)',
  '--color-surface-2': 'oklch(0.322 0.027 110)',
  '--color-surface-3': 'oklch(0.382 0.026 108)',
  '--color-text-hi': 'oklch(0.952 0.012 104)',
  '--color-text-mid': 'oklch(0.798 0.016 106)',
  '--color-text-low': 'oklch(0.636 0.019 108)',
  '--color-text-faint': 'oklch(0.496 0.020 110)',
  '--color-silver': 'oklch(0.845 0.034 102)',
  '--color-silver-dim': 'oklch(0.678 0.032 104)',
  '--color-gold': 'oklch(0.808 0.098 84)',
  '--color-gold-dim': 'oklch(0.658 0.084 80)',
  '--color-card-sky-a': 'oklch(0.238 0.042 112)',
  '--color-card-sky-b': 'oklch(0.352 0.050 100)',
  '--color-line-hairline': 'oklch(0.845 0.034 102 / 0.11)',
  '--color-line-soft': 'oklch(0.845 0.034 102 / 0.19)',
  '--color-line-strong': 'oklch(0.845 0.034 102 / 0.33)',
}

/* 蛋白石潮汐 —— 潮水退下去之后留的颜色。极淡的青粉紫在同一面上互相换位。
   这是十套里 G-18 风险最高的一套：虹彩极易滑向廉价玄学。
   纪律：表面层 chroma ≤ 0.05，虹彩**只允许出现在卡面**，不许上背景。 */
const iridescentTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.178 0.020 206)',
  '--color-bg-deep': 'oklch(0.220 0.026 208)',
  '--color-bg-raised': 'oklch(0.262 0.030 210)',
  '--color-surface-1': 'oklch(0.294 0.030 212)',
  '--color-surface-2': 'oklch(0.344 0.030 214)',
  '--color-surface-3': 'oklch(0.404 0.028 216)',
  '--color-text-hi': 'oklch(0.960 0.010 204)',
  '--color-text-mid': 'oklch(0.806 0.014 206)',
  '--color-text-low': 'oklch(0.646 0.018 208)',
  '--color-text-faint': 'oklch(0.506 0.020 210)',
  '--color-silver': 'oklch(0.892 0.026 200)',
  '--color-silver-dim': 'oklch(0.716 0.028 202)',
  '--color-gold': 'oklch(0.858 0.056 328)',
  '--color-gold-dim': 'oklch(0.706 0.050 326)',
  /* 唯一允许虹彩的地方：卡面 */
  '--color-card-sky-a': 'oklch(0.824 0.048 196)',
  '--color-card-sky-b': 'oklch(0.760 0.062 318)',
  '--color-line-hairline': 'oklch(0.892 0.026 200 / 0.11)',
  '--color-line-soft': 'oklch(0.892 0.026 200 / 0.19)',
  '--color-line-strong': 'oklch(0.892 0.026 200 / 0.33)',
}

/* 仙境阴影 —— 再往里走一点就不一样了。深紫与墨绿的藤蔓、镜子和拱门，
   比例被轻轻拧过：门比人矮，月亮比屋顶低。不是恐怖，是说不上哪里不对。 */
const thicketTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.104 0.026 322)',
  '--color-bg-deep': 'oklch(0.158 0.034 320)',
  '--color-bg-raised': 'oklch(0.246 0.038 318)',
  '--color-surface-1': 'oklch(0.278 0.038 316)',
  '--color-surface-2': 'oklch(0.328 0.038 314)',
  '--color-surface-3': 'oklch(0.388 0.036 312)',
  '--color-text-hi': 'oklch(0.956 0.012 318)',
  '--color-text-mid': 'oklch(0.802 0.016 318)',
  '--color-text-low': 'oklch(0.642 0.020 318)',
  '--color-text-faint': 'oklch(0.502 0.024 318)',
  '--color-silver': 'oklch(0.874 0.028 310)',
  '--color-silver-dim': 'oklch(0.700 0.030 312)',
  '--color-gold': 'oklch(0.822 0.064 148)',
  '--color-gold-dim': 'oklch(0.670 0.056 146)',
  '--color-card-sky-a': 'oklch(0.222 0.050 320)',
  '--color-card-sky-b': 'oklch(0.336 0.058 158)',
  '--color-line-hairline': 'oklch(0.874 0.028 310 / 0.11)',
  '--color-line-soft': 'oklch(0.874 0.028 310 / 0.19)',
  '--color-line-strong': 'oklch(0.874 0.028 310 / 0.33)',
}

/* 经典塔罗 —— 一副被翻了很多年的牌。象牙纸张、暗金压边、旧书的黄。
   与 legacy-classic 的 parchment 刻意不同：那套是「纸帘纹」，
   这套是「点着灯的老屋」，光源明确来自左上方的一盏灯。 */
const oldroomTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.150 0.016 56)',
  '--color-bg-deep': 'oklch(0.190 0.020 54)',
  '--color-bg-raised': 'oklch(0.238 0.023 52)',
  '--color-surface-1': 'oklch(0.270 0.024 52)',
  '--color-surface-2': 'oklch(0.320 0.026 50)',
  '--color-surface-3': 'oklch(0.380 0.028 48)',
  '--color-text-hi': 'oklch(0.950 0.016 84)',
  '--color-text-mid': 'oklch(0.796 0.020 82)',
  '--color-text-low': 'oklch(0.634 0.022 78)',
  '--color-text-faint': 'oklch(0.494 0.022 72)',
  '--color-silver': 'oklch(0.812 0.048 84)',
  '--color-silver-dim': 'oklch(0.648 0.042 82)',
  '--color-gold': 'oklch(0.772 0.110 74)',
  '--color-gold-dim': 'oklch(0.628 0.094 70)',
  /* 象牙纸卡面 */
  '--color-card-sky-a': 'oklch(0.916 0.026 86)',
  '--color-card-sky-b': 'oklch(0.852 0.034 78)',
  '--color-line-hairline': 'oklch(0.812 0.048 84 / 0.12)',
  '--color-line-soft': 'oklch(0.812 0.048 84 / 0.20)',
  '--color-line-strong': 'oklch(0.812 0.048 84 / 0.34)',
}

/* ══════════════════════════════════════════════════════════════
 * B. Legacy 牌组的五套氛围（V2.4 原样保留）
 * ══════════════════════════════════════════════════════════ */

const starfieldTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.132 0.022 265)',
  '--color-bg-deep': 'oklch(0.182 0.028 265)',
  '--color-bg-raised': 'oklch(0.255 0.030 266)',
  '--color-surface-1': 'oklch(0.285 0.028 266)',
  '--color-surface-2': 'oklch(0.335 0.028 267)',
  '--color-surface-3': 'oklch(0.395 0.026 268)',
  '--color-text-hi': 'oklch(0.955 0.008 260)',
  '--color-text-mid': 'oklch(0.800 0.014 262)',
  '--color-text-low': 'oklch(0.640 0.018 264)',
  '--color-text-faint': 'oklch(0.500 0.020 266)',
  '--color-silver': 'oklch(0.870 0.022 248)',
  '--color-silver-dim': 'oklch(0.700 0.026 250)',
  '--color-gold': 'oklch(0.845 0.058 88)',
  '--color-gold-dim': 'oklch(0.700 0.052 86)',
  '--color-card-sky-a': 'oklch(0.240 0.045 258)',
  '--color-card-sky-b': 'oklch(0.360 0.055 262)',
  '--color-line-hairline': 'oklch(0.870 0.022 248 / 0.10)',
  '--color-line-soft': 'oklch(0.870 0.022 248 / 0.18)',
  '--color-line-strong': 'oklch(0.870 0.022 248 / 0.32)',
}

const parchmentTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.162 0.014 48)',
  '--color-bg-deep': 'oklch(0.198 0.018 50)',
  '--color-bg-raised': 'oklch(0.248 0.021 52)',
  '--color-surface-1': 'oklch(0.278 0.022 54)',
  '--color-surface-2': 'oklch(0.328 0.024 56)',
  '--color-surface-3': 'oklch(0.388 0.026 58)',
  '--color-text-hi': 'oklch(0.952 0.014 82)',
  '--color-text-mid': 'oklch(0.800 0.018 80)',
  '--color-text-low': 'oklch(0.640 0.020 76)',
  '--color-text-faint': 'oklch(0.500 0.020 70)',
  '--color-silver': 'oklch(0.800 0.045 82)',
  '--color-silver-dim': 'oklch(0.640 0.040 80)',
  '--color-gold': 'oklch(0.760 0.105 72)',
  '--color-gold-dim': 'oklch(0.620 0.090 68)',
  '--color-card-sky-a': 'oklch(0.905 0.024 84)',
  '--color-card-sky-b': 'oklch(0.845 0.032 76)',
  '--color-line-hairline': 'oklch(0.800 0.045 82 / 0.12)',
  '--color-line-soft': 'oklch(0.800 0.045 82 / 0.20)',
  '--color-line-strong': 'oklch(0.800 0.045 82 / 0.34)',
}

const canopyTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.121 0.020 158)',
  '--color-bg-deep': 'oklch(0.172 0.026 156)',
  '--color-bg-raised': 'oklch(0.252 0.030 154)',
  '--color-surface-1': 'oklch(0.284 0.030 154)',
  '--color-surface-2': 'oklch(0.334 0.030 152)',
  '--color-surface-3': 'oklch(0.392 0.028 150)',
  '--color-text-hi': 'oklch(0.955 0.010 150)',
  '--color-text-mid': 'oklch(0.800 0.016 152)',
  '--color-text-low': 'oklch(0.640 0.020 154)',
  '--color-text-faint': 'oklch(0.500 0.022 156)',
  '--color-silver': 'oklch(0.860 0.030 148)',
  '--color-silver-dim': 'oklch(0.690 0.034 150)',
  '--color-gold': 'oklch(0.830 0.070 84)',
  '--color-gold-dim': 'oklch(0.680 0.062 82)',
  '--color-card-sky-a': 'oklch(0.230 0.045 160)',
  '--color-card-sky-b': 'oklch(0.350 0.055 152)',
  '--color-line-hairline': 'oklch(0.860 0.030 148 / 0.10)',
  '--color-line-soft': 'oklch(0.860 0.030 148 / 0.18)',
  '--color-line-strong': 'oklch(0.860 0.030 148 / 0.32)',
}

const nebulaTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.112 0.032 288)',
  '--color-bg-deep': 'oklch(0.166 0.042 288)',
  '--color-bg-raised': 'oklch(0.250 0.048 290)',
  '--color-surface-1': 'oklch(0.282 0.048 291)',
  '--color-surface-2': 'oklch(0.332 0.050 292)',
  '--color-surface-3': 'oklch(0.392 0.048 294)',
  '--color-text-hi': 'oklch(0.955 0.012 292)',
  '--color-text-mid': 'oklch(0.800 0.018 292)',
  '--color-text-low': 'oklch(0.640 0.024 292)',
  '--color-text-faint': 'oklch(0.500 0.028 292)',
  '--color-silver': 'oklch(0.880 0.030 285)',
  '--color-silver-dim': 'oklch(0.705 0.036 287)',
  '--color-gold': 'oklch(0.860 0.070 90)',
  '--color-gold-dim': 'oklch(0.710 0.062 88)',
  '--color-card-sky-a': 'oklch(0.215 0.060 292)',
  '--color-card-sky-b': 'oklch(0.345 0.078 296)',
  '--color-line-hairline': 'oklch(0.880 0.030 285 / 0.10)',
  '--color-line-soft': 'oklch(0.880 0.030 285 / 0.19)',
  '--color-line-strong': 'oklch(0.880 0.030 285 / 0.33)',
}

const depthTheme: ThemeVars = {
  '--color-bg-void': 'oklch(0.088 0.008 300)',
  '--color-bg-deep': 'oklch(0.140 0.010 300)',
  '--color-bg-raised': 'oklch(0.208 0.012 300)',
  '--color-surface-1': 'oklch(0.238 0.013 300)',
  '--color-surface-2': 'oklch(0.290 0.014 300)',
  '--color-surface-3': 'oklch(0.352 0.015 300)',
  '--color-text-hi': 'oklch(0.965 0.004 300)',
  '--color-text-mid': 'oklch(0.808 0.006 300)',
  '--color-text-low': 'oklch(0.645 0.008 300)',
  '--color-text-faint': 'oklch(0.495 0.010 300)',
  '--color-silver': 'oklch(0.885 0.008 296)',
  '--color-silver-dim': 'oklch(0.700 0.010 298)',
  '--color-gold': 'oklch(0.760 0.050 305)',
  '--color-gold-dim': 'oklch(0.610 0.044 305)',
  '--color-card-sky-a': 'oklch(0.165 0.016 302)',
  '--color-card-sky-b': 'oklch(0.270 0.028 306)',
  '--color-line-hairline': 'oklch(0.885 0.008 296 / 0.10)',
  '--color-line-soft': 'oklch(0.885 0.008 296 / 0.20)',
  '--color-line-strong': 'oklch(0.885 0.008 296 / 0.36)',
}

/* ══════════════════════════════════════════════════════════════
 * C. 组装
 * ══════════════════════════════════════════════════════════ */

export const atmospheres: AtmosphereSpec[] = [
  {
    atmosphereId: 'veil-light',
    groundValue: 0.215,
    tonalRange: 0.100,
    lighting: 'diffuse-mist',
    structure: 'fog-bands',
    themeVars: veilLightTheme,
    particles: 'static-motes',
    /* 雾从下往上抬，中段最亮 —— 光已经在了，只是还没穿透 */
    layers: {
      shape:
        'radial-gradient(112% 68% at 50% 62%, oklch(0.40 0.016 232 / 0.42) 0%, transparent 66%),' +
        'radial-gradient(96% 58% at 50% -8%, oklch(0.20 0.012 234 / 0.70) 0%, transparent 72%)',
      drift:
        'radial-gradient(64% 30% at 28% 52%, oklch(0.52 0.014 230 / 0.15) 0%, transparent 74%),' +
        'radial-gradient(58% 26% at 76% 38%, oklch(0.48 0.016 236 / 0.12) 0%, transparent 76%)',
      breath: 'radial-gradient(44% 24% at 54% 70%, oklch(0.58 0.012 228 / 0.10) 0%, transparent 78%)',
      driftOpacity: 1,
    },
  },
  {
    atmosphereId: 'obsidian',
    groundValue: 0.096,
    tonalRange: 0.176,
    lighting: 'hard-oblique',
    structure: 'light-shafts',
    themeVars: obsidianTheme,
    particles: 'static-dust',
    /* 光从右上方斜着进来，落在墙与叶上；阴影很长 */
    layers: {
      shape:
        'radial-gradient(72% 46% at 82% 8%, oklch(0.42 0.048 96 / 0.40) 0%, transparent 64%),' +
        'radial-gradient(132% 92% at 40% 114%, oklch(0.14 0.018 116 / 0.80) 0%, transparent 68%)',
      drift: 'radial-gradient(58% 32% at 66% 24%, oklch(0.46 0.044 100 / 0.13) 0%, transparent 74%)',
      breath: 'radial-gradient(38% 22% at 78% 16%, oklch(0.54 0.052 88 / 0.09) 0%, transparent 76%)',
      driftOpacity: 0.85,
    },
  },
  {
    atmosphereId: 'iridescent',
    groundValue: 0.178,
    tonalRange: 0.116,
    lighting: 'caustics',
    structure: 'tide-lines',
    themeVars: iridescentTheme,
    particles: 'none',
    /* 两个色相在同一片表面上互相换位，但亮度压得很低 —— 靠色相移动，不靠饱和度 */
    layers: {
      shape:
        'radial-gradient(104% 62% at 26% 92%, oklch(0.34 0.044 196 / 0.44) 0%, transparent 66%),' +
        'radial-gradient(98% 60% at 76% 4%, oklch(0.28 0.040 316 / 0.52) 0%, transparent 70%)',
      drift:
        'radial-gradient(56% 30% at 20% 42%, oklch(0.44 0.050 188 / 0.14) 0%, transparent 72%),' +
        'radial-gradient(52% 28% at 80% 66%, oklch(0.42 0.048 322 / 0.12) 0%, transparent 74%)',
      breath: 'radial-gradient(40% 24% at 52% 30%, oklch(0.50 0.042 268 / 0.09) 0%, transparent 78%)',
      driftOpacity: 1,
    },
  },
  {
    atmosphereId: 'thicket',
    groundValue: 0.104,
    tonalRange: 0.174,
    lighting: 'uncanny-glow',
    structure: 'arch-and-vines',
    themeVars: thicketTheme,
    particles: 'static-motes',
    /* 顶部被藤蔓压低，光只从一个拱门大小的缺口透进来 */
    layers: {
      shape:
        'radial-gradient(46% 30% at 52% 26%, oklch(0.44 0.046 150 / 0.30) 0%, transparent 62%),' +
        'radial-gradient(138% 96% at 50% 112%, oklch(0.13 0.028 322 / 0.82) 0%, transparent 66%)',
      drift:
        'radial-gradient(50% 30% at 24% 36%, oklch(0.40 0.048 320 / 0.14) 0%, transparent 74%),' +
        'radial-gradient(46% 26% at 78% 60%, oklch(0.38 0.042 156 / 0.11) 0%, transparent 76%)',
      breath: 'radial-gradient(32% 20% at 52% 24%, oklch(0.50 0.050 148 / 0.10) 0%, transparent 78%)',
      driftOpacity: 0.9,
    },
  },
  {
    atmosphereId: 'oldroom',
    groundValue: 0.150,
    tonalRange: 0.120,
    lighting: 'warm-lamp',
    structure: 'lamp-and-table',
    themeVars: oldroomTheme,
    particles: 'static-dust',
    /* 一盏灯在左上，桌面在下方；四周沉进屋子的暗里 */
    layers: {
      shape:
        'radial-gradient(58% 40% at 18% 12%, oklch(0.44 0.056 76 / 0.46) 0%, transparent 62%),' +
        'radial-gradient(126% 88% at 50% 110%, oklch(0.14 0.020 52 / 0.80) 0%, transparent 68%)',
      drift: 'radial-gradient(54% 32% at 30% 30%, oklch(0.42 0.048 72 / 0.11) 0%, transparent 74%)',
      breath: 'radial-gradient(36% 22% at 22% 18%, oklch(0.50 0.060 78 / 0.08) 0%, transparent 76%)',
      driftOpacity: 0.75,
    },
  },

  /* ── legacy ── */
  {
    atmosphereId: 'starfield',
    groundValue: 0.132,
    tonalRange: 0.153,
    lighting: 'moonlight',
    structure: 'open-starfield',
    themeVars: starfieldTheme,
    particles: 'static-stars',
    layers: {
      shape:
        'radial-gradient(120% 78% at 50% 108%, oklch(0.30 0.038 262 / 0.55) 0%, transparent 62%),' +
        'radial-gradient(90% 60% at 50% -10%, oklch(0.20 0.030 268 / 0.7) 0%, transparent 70%)',
      drift:
        'radial-gradient(46% 30% at 24% 30%, oklch(0.42 0.042 258 / 0.16) 0%, transparent 70%),' +
        'radial-gradient(52% 26% at 78% 66%, oklch(0.38 0.048 250 / 0.13) 0%, transparent 72%)',
      breath: 'radial-gradient(38% 22% at 60% 14%, oklch(0.48 0.030 254 / 0.10) 0%, transparent 74%)',
      driftOpacity: 1,
    },
  },
  {
    atmosphereId: 'parchment',
    groundValue: 0.162,
    tonalRange: 0.116,
    lighting: 'top-light',
    structure: 'paper-fibre',
    themeVars: parchmentTheme,
    particles: 'static-dust',
    layers: {
      shape:
        'radial-gradient(78% 52% at 50% 38%, oklch(0.34 0.030 62 / 0.42) 0%, transparent 68%),' +
        'radial-gradient(120% 90% at 50% 112%, oklch(0.17 0.020 44 / 0.75) 0%, transparent 70%)',
      drift: 'radial-gradient(60% 34% at 34% 44%, oklch(0.40 0.034 66 / 0.10) 0%, transparent 74%)',
      breath: 'radial-gradient(40% 24% at 62% 26%, oklch(0.46 0.040 70 / 0.07) 0%, transparent 76%)',
      driftOpacity: 0.7,
    },
  },
  {
    atmosphereId: 'canopy',
    groundValue: 0.121,
    tonalRange: 0.163,
    lighting: 'dappled',
    structure: 'canopy-gaps',
    themeVars: canopyTheme,
    particles: 'static-motes',
    layers: {
      shape:
        'radial-gradient(70% 44% at 46% 6%, oklch(0.40 0.038 152 / 0.34) 0%, transparent 66%),' +
        'radial-gradient(130% 86% at 50% 110%, oklch(0.16 0.022 160 / 0.72) 0%, transparent 68%)',
      drift:
        'radial-gradient(40% 26% at 28% 30%, oklch(0.44 0.042 150 / 0.13) 0%, transparent 72%),' +
        'radial-gradient(46% 24% at 74% 58%, oklch(0.40 0.038 162 / 0.10) 0%, transparent 74%)',
      breath: 'radial-gradient(34% 20% at 56% 18%, oklch(0.52 0.046 148 / 0.09) 0%, transparent 76%)',
      driftOpacity: 1,
    },
  },
  {
    atmosphereId: 'nebula',
    groundValue: 0.112,
    tonalRange: 0.170,
    lighting: 'scattered',
    structure: 'nebula-band',
    themeVars: nebulaTheme,
    particles: 'static-stars',
    layers: {
      shape:
        'radial-gradient(110% 72% at 50% 106%, oklch(0.30 0.060 292 / 0.52) 0%, transparent 64%),' +
        'radial-gradient(94% 62% at 50% -12%, oklch(0.19 0.048 286 / 0.72) 0%, transparent 70%)',
      drift:
        'radial-gradient(54% 34% at 22% 26%, oklch(0.42 0.075 296 / 0.17) 0%, transparent 70%),' +
        'radial-gradient(58% 30% at 80% 62%, oklch(0.40 0.068 268 / 0.14) 0%, transparent 72%)',
      breath: 'radial-gradient(44% 26% at 58% 12%, oklch(0.50 0.060 302 / 0.11) 0%, transparent 74%)',
      driftOpacity: 1,
    },
  },
  {
    atmosphereId: 'depth',
    groundValue: 0.088,
    tonalRange: 0.150,
    lighting: 'edge-light',
    structure: 'concentric-depth',
    themeVars: depthTheme,
    particles: 'none',
    layers: {
      shape:
        'radial-gradient(96% 64% at 50% 46%, oklch(0.22 0.012 300 / 0.34) 0%, transparent 72%),' +
        'radial-gradient(140% 100% at 50% 116%, oklch(0.09 0.008 300 / 0.86) 0%, transparent 66%)',
      drift: 'radial-gradient(50% 30% at 36% 52%, oklch(0.30 0.014 302 / 0.09) 0%, transparent 76%)',
      breath: 'radial-gradient(36% 22% at 64% 40%, oklch(0.34 0.016 298 / 0.06) 0%, transparent 78%)',
      driftOpacity: 0.55,
    },
  },
]

export const atmosphereById: Record<AtmosphereId, AtmosphereSpec> = Object.fromEntries(
  atmospheres.map((a) => [a.atmosphereId, a]),
) as Record<AtmosphereId, AtmosphereSpec>

export function getAtmosphere(id: AtmosphereId): AtmosphereSpec {
  return atmosphereById[id] ?? atmosphereById['starfield']
}
