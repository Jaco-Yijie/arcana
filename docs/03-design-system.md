# Arcana — Design System 设计系统（Agent 3 Visual 产出，Lead 补全文档）

> 唯一 token 来源：`src/styles/theme.css`（Tailwind v4 `@theme static`）。
> 业务组件**不得**写死颜色 / 圆角 / 时长字面量，一律用 Tailwind 原子类或 `var(--token)`。
> 心智模型：**一座安静的深夜天文馆，不是一个算命 App。克制 > 华丽，留白 > 装饰。**

## 1. 视觉方向

Dreamlike / Surreal / Celestial / Quiet / Premium（梦幻 / 超现实 / 星象 / 安静 / 高级）。

**判定「跑偏」的四个信号**（对应 Guardrail G-18）：
- 出现饱和紫 + 荧光渐变 → 廉价玄学网站
- 出现稀有度、光爆、金色粒子 → 游戏抽卡 UI
- 出现数字大屏、涨跌色、卡片网格 → Crypto Dashboard
- 出现气泡对话流 + 头像 → ChatGPT Clone

**防跑偏的三条硬规则：**
1. 色域锁死在 hue 248–268 的冷蓝夜空，唯一暖色是冷金（`--color-gold`），全站用量 < 5%，且只用于仪式性瞬间。
2. 深色主题下阴影必须「吃光」而不是「发光」。只有 `--shadow-ritual` 带极轻微冷金辉光，仅用于翻牌落定。
3. 卡牌**选中态不加 glow** —— 发光是抽卡 UI 的语言，这里只用描边加强 + 1px 抬起。

## 2. Color 颜色

| 层 | Token | 用途 |
|---|---|---|
| Background | `--color-bg-void` / `bg-deep` / `bg-raised` | 最深底 / 应用底色 / 牌桌台面 |
| Surface | `--color-surface-1/2/3` | 面板 / 输入框内壁 / 抬起·拖拽中·弹层 |
| Text | `--color-text-hi/mid/low/faint` | 标题牌名 / 正文 / 次要说明 / 占位禁用 |
| Accent | `--color-silver` `silver-dim` | 主强调：选中、焦点、可交互边 |
| Accent 2 | `--color-gold` `gold-dim` | 次强调：翻牌、逆位角标、完成 |
| Semantic | `--color-affirm` `--color-caution` | 已保存 / 安全边界提示 |
| Line | `--color-line-hairline/soft/strong` | 半透明描边，叠在任意底色上都成立 |

## 3. Typography 排版

系统字体栈，零网络请求。**Sans 用于 UI，Serif 只用于牌名与大标题**（提供「典籍感」而非玄学感）。

阶梯：`caption 13 / note 14 / body 15 / read 16 / title 18 / heading 22 / display 28 / hero 34`。
`read 16px` 用于长文阅读（牌义、AI Reading），同时防 iOS 输入聚焦缩放。

## 4. Spacing / Radius

- 语义间距：`gutter 20 / block 24 / section 40 / breath 64 / tap 44`
- 圆角：`hair 2 / xs 6 / sm 10 / md 14 / lg 18 / xl 24 / pill`
- 圆角随卡牌尺寸缩放，保证「看起来是同一个圆角」而不是等比放大的塑料感

## 5. Motion 动效

禁止强弹跳 spring，全部是「有重量的减速」。

| Token | 值 | 用在哪 |
|---|---|---|
| `--ease-drift` | 慢起慢收 | 漂浮、位移 |
| `--ease-settle` | 前快末极慢 | 落定、洗牌重组、切牌 |
| `--ease-enter` / `--ease-exit` | expo | 页面转场 |
| `--duration-tap` 90ms | | 按压 |
| `--duration-base` 260ms | | 展开收起 |
| `--duration-flip` 520ms | | **翻牌，全站唯一超过 500ms 的交互动画** |
| `--duration-settle` 620ms | | 摆牌落位 |

必须支持 `prefers-reduced-motion: reduce`：所有动效退化为「立即到位」，**功能不得丢失**。

### 实现层的一条硬教训

**不要用 CSS `animation` 去动一个 framer-motion 也在动的属性。**
CSS 动画优先级高于 inline style，会把 framer 的 `exit` 值盖掉 —— 表现是元素永远淡不掉。
引导 Hint 的呼吸效果一开始用 CSS keyframes 做，导致文案卡在 opacity 0.07 无法移除，改由 framer 驱动后才正常（`src/components/layout/StepHint.tsx`）。

## 6. Card 卡牌

- 比例固定 **1 : 1.667**（`--card-ratio`），用 CSS `aspect-ratio`
- 三档宽度：`sm 64`（扇形 / 缩略）`md 112`（牌位）`lg 176`（聚焦 / 洗牌堆）
- 四种物理状态：`resting` / `lifted` / `locked`，各对应一档阴影
- 空牌位：虚线发丝边 + 透明底

### Card Back 牌背
纯 SVG，**所有 78 张完全一致**（任何差异都会泄露信息）。构图：深蓝底 + 24 等分极细银刻度环 + 同心星轨 + 中心月相 + 四折对称星点。
四折对称是刻意的 —— 「随机撒点」在重复出现 78 次时会显得廉价。

### Card Art 牌面
程序化 SVG，`{ motif, hue, tier }` 三参数驱动。12 种母题（moon/star/sun/gate/path/mirror/orbit/veil/seed/tide/flame/threshold）。
`hue` 被映射到 **240°–272° 的窄色带** —— 这是为了「像同一副牌」而做的刻意压缩。
**已知代价**：同 motif 的两张牌视觉上几乎不可区分（见 `docs/06-qa-report.md`）。

## 7. Tarot Table 牌桌

- `.table-surface`：`user-select: none` + `touch-action: none` + `overscroll-behavior: contain`，交互全部交给 Pointer Events
- 沉浸区根容器 `position: fixed; height: 100dvh; overflow: hidden`（用 `dvh` 规避 iOS 地址栏抖动）
- 牌堆厚度用 18 个牌背实例表现，而不是 78 个 DOM

## 8. 自定义 Utility（上限 8 个，其余一律 Tailwind 原子类）

`surface-veil`（全站唯一的实体感来源）· `text-glow-soft`（只用于牌名与首页主标题）· `edge-hairline` · `mask-fade-x` · `table-surface` · `scrollbar-none` · `drift-slow` · `ring-quiet`
