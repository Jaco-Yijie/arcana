# Arcana Design System V1

本轮只调整视觉呈现。品牌关键词：Mystic、Elegant、Editorial、Ancient、Luxury、Introspective、Artistic。目标是具有收藏感的数字塔罗空间。

## 设计审计

| 范围 | 原有问题 | 保留 | 本轮升级 |
| --- | --- | --- | --- |
| Cover / Home | 品牌、徽记和月轮争夺注意力；卡牌偏小 | Card First、真实牌面、现有文案 | 大字号品牌、三牌视觉中心、双栏留白 |
| Typography | 已有字体，但角色和间距分散 | 本地字体与语言加载机制 | Oracle / Ritual / Editorial / UI 四角色 |
| Reading | 深色窄列接近普通文章 | 内容、章节顺序、流式追加、折叠 | 象牙纸页、墨色正文、核心主题、章节分隔、首字与引句 |
| Background | 固定夜蓝压过 Deck 主题；背景层重复 | 已有 SVG 艺术素材 | 底色、纹理、艺术、动态四层组合 |
| Buttons | 字号、圆角和动作层级不统一 | 原按钮语义与事件 | Primary / Secondary / Ghost；兼容 Quiet |
| Deck / Cards | 卡牌资产与比例已经成熟 | 牌组逻辑、牌义、选择与翻牌机制 | 统一牌组标题、边框、展示尺度与动态令牌 |

参考 MotionSites 的视觉中心和留白，以及需求中 Stargazer Oracle 的克制与仪式感描述；没有复制页面或引入其资产。

## 文件与职责

- `src/styles/theme.css`：颜色、字体、宽度、间距、动态基础令牌。
- `src/styles/design-system.css`：背景、品牌排版、按钮、首页与纸张阅读样式。
- `src/design/motion.ts`：将 CSS 时长与曲线交给 Framer Motion，避免翻牌参数另写一份。
- `src/atmosphere/registry.ts`：沿用现有 Deck 调色板，不改变 Deck 注册逻辑。
- `tests/design-system.test.ts`：纸张文字对比度、翻牌时长、动态与资产预算。

## Color tokens

| 角色 | 令牌 | 使用规则 |
| --- | --- | --- |
| Base | `--color-bg-void/deep/raised` | 应用背景，接受现有 Deck 覆盖 |
| Accent | `--color-gold`、`--color-silver` | 暗金与月光强调 |
| Text | `--color-text-hi/mid/low/faint` | 主、次、辅助和禁用文本 |
| Paper | `--color-paper` #eee7d9 | Reading 主纸页 |
| Raised / Inset paper | `--color-paper-raised` #f6f0e5、`--color-paper-inset` #e4dac8 | 纸页内部控件 |
| Primary ink | `--color-ink-primary` #292c29 | 核心主题与章节 |
| Secondary ink | `--color-ink-secondary` #494b43 | 长正文 |
| Muted ink | `--color-ink-muted` #5e5c51 | 说明文字 |
| Accent ink | `--color-ink-accent` #705732 | 纸页按钮、编号和强调 |
| Paper line | `--color-ink-line` #c9bfab | 章节分隔 |

Reading 只在 `.reading-book` 内将语义色映射到纸张与墨色；外部卡牌和 Deck 氛围不被改色。上述四种墨色在三种纸张底色上的静态对比度均达到 4.5:1。装饰线不作为文字使用。

Deck 继续通过既有主题同步器覆盖语义色：Elysian Shadows 为墨绿暗金，Ethereal 为冷雾月光，Opaline 为蓝绿珠光。新增背景从这些令牌派生，不把所有牌组强制成同一种蓝色。牌组是否开放仍由原有注册与资产状态决定。

## Typography tokens

| 角色 | 字体令牌 | 用途与尺度 |
| --- | --- | --- |
| Oracle Display | `--font-oracle` / `--font-oracle-dynamic` | Cinzel + 中文楷体回退；品牌、牌组、核心主题；动态内容不依赖固定文案子集 |
| Ritual Heading | `--font-ritual` | Cormorant Garamond + 中文楷/宋；章节与按钮 |
| Editorial Body | `--font-editorial` | Iowan / Palatino / 宋体 / Georgia；不使用装饰字体排长文 |
| UI | `--font-sans`、按钮复用 Ritual | 标签与输入清晰，按钮字距 `--tracking-ui` |

品牌字号：`--text-brand`，手机 48px，1440px 桌面约 104px；Cover 最大 120px。正文使用 `--text-editorial`（16–18px）、`--leading-editorial`（1.95）、`--measure-editorial`，段间距 1.15em。阅读外框 `--measure-reading` 最大 58rem，正文另有限宽；Hero 使用 `--measure-home` 最大 76rem。

复用 3 个既有 WOFF2 文件，共 121,780 bytes；保留字体 swap 与中文子集按语言加载，不新增字体服务。

## Background system

1. Base：Deck 语义底色。
2. Texture：已有 `paper-grain.svg`，由 `--art-grain-opacity` 控制。
3. Art：已有月轮、山雾、植物和纹样 SVG；蒙版取色来自当前 Deck，光晕与暗角仅为辅助层。
4. Atmosphere：月轮 32 秒低幅度位移与透明度呼吸；其他路由沿用轻量 Deck 氛围。

首页与 Cover 自带 ArtBackdrop，路由不再叠加第二套 DeckAtmosphere。Reading 的纸张纹理静态显示，不使用整页玻璃面板。背景不接收点击。

## Motion system

| 角色 | 时长 / 令牌 | 用途 |
| --- | --- | --- |
| Quick | 160ms / `--duration-quick` | 悬停、颜色反馈 |
| Fade Reveal | 720ms / `--duration-reveal` | Hero、核心主题进入 |
| Card Reveal | 520ms / `--duration-flip` | 翻转；正常动态下 260ms 换面 |
| Card Idle | 6s / `--duration-card-idle` | 可翻卡牌轻微明暗呼吸 |
| Ambient | 32s / `--art-motion-duration` | 月轮氛围 |

曲线统一来自 `--ease-enter/settle/veil`。取消翻牌弹性缩放与待翻牌上下漂移；没有 WebGL、粒子循环或新计算任务。`prefers-reduced-motion` 时 Hero 和艺术层静止、翻牌即时显示。

## Components

本轮修改：HomePage、DeckLibraryPage、ReadingPage、ReadingBody、ReadingCompletionActions、FlipCard、Button、App 路由背景、main 样式入口。Cover、ArtBackdrop、导航与其他现有控件通过共享样式获得统一外观。

Primary 用于开始/继续；Secondary 用于保存；Ghost 用于轻操作，Quiet 保持旧调用兼容。按钮保留至少 44px 点击高度。玻璃效果限于控制区域，正文为纸张。

没有修改 Tarot 决策、牌义、Deck 注册、AI 接口、流式内容排序、Journal/Share 行为或 i18n 架构。工作区还包含上一轮 User System / Admin 的未提交改动，不属于本次视觉变更。

## Before → After

- Home：小牌与多处装饰分散视线 → 大牌左侧、品牌右侧；手机上下布局；艺术蒙版、纹理和月轮形成背景。
- Reading：深色文章列 → 具有核心标题、首字、章节细线、边注式回答和引句的象牙色数字书页。保持原内容与顺序，避免破坏流式追加。

截图在 `output/design-system-v1/`：`cover-after-desktop.png`、`home-final-zh-desktop.png`、`home-final-zh-390.png`、`reading-after-1440.png`、`reading-after-375.png`、`reading-native-en-375.png`。原 Reading 对照保留在 `output/playwright/admin-v1-reading-regression.png`。

## Performance 与验证

首屏 HTML 关联 JS/CSS 的原始体积：800,177 bytes → 808,056 bytes，增加 7,879 bytes（约 0.98%）。详细清单见 `output/design-system-v1/before-assets.json` 与 `after-assets.json`。这不是网络耗时或 LCP 测量。

没有新增依赖、字体或图片；仍用原三张缩略图。没有调整 AI 请求或流式管道。没有测量线上首屏时间、低端真机帧率或真实模型延迟，不能据此宣称零性能影响。

已验证：
- 完整 `npm run build`：前后端类型、i18n、Deck、布局、资产、设计规则及 Vite 构建。
- `npm run design:check`：4 项通过。
- 抽牌引擎自检：64 项断言通过。
- 首页与 Reading：375 / 390 / 430 / 1440，无横向溢出；实际查看截图。
- 真实洗牌、切牌、抽牌、点击翻牌到中文本地示例解读完成。
- 章节折叠/展开、语言控件、原生英文示例长文、减少动态效果。
- 牌组库实际从 Moonlight 切到 Forest，背景令牌随之变为墨绿，无横向溢出。
- Lint 无错误；仓库仍有既有 Fast Refresh 和 QA unused 警告。

限制：测试环境未配置翻译服务，中文历史解读转英文返回明确失败提示；原生英文示例可以正常生成与排版。没有改动该服务，也未用示例冒充真实 AI 验证。数据库与后台本轮未重新做集成测试。

## 本地运行

沿用项目 README 的环境配置与数据库步骤。安装已有依赖后：

```sh
npm run dev
npm run design:check
npm run build
```

本轮没有新增环境变量或迁移。未配置 AI 服务时只能验证已有本地示例路径；真实解读与翻译需要项目原有服务配置。

## 发布范围

本次 GitHub / Streamlit 发布从原 main 隔离合入视觉系统，不包含本地尚未发布的 User System 与 Admin Dashboard。标准及 Streamlit 专用构建均通过；Streamlit 仍使用原有 Python 转发与浏览器本地记录。上述截图和日志保留在开发工作区，没有上传测试记录。
