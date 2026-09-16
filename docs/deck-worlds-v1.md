# Deck Worlds V1：Reading 融合与牌组视觉签名

## 审计与修复

原 Reading 的 `.reading-book` 将语义色重新映射为固定象牙白纸面和深色文字，覆盖 Deck 色彩。大面积不透明浅色、明显边框和阴影令卡牌区与正文像两个产品。

现在每个 Deck 有独立深色纸面、抬升层、正文、次级文字和强调色。纸面仍为实色，以保证长文对比稳定；低透明纹理、细边框和克制阴影提供卷册感。章节、核心主题、折叠分析、引用与正文使用同一套局部 token。保持原内容、阅读宽度和行距。

原 Deck atmosphere 已有不同色彩及部分图层，但 Hero 后加的通用月轮、轨道、光球覆盖了差异。现在 SignatureArt 为十个 Deck 分别绘制 SVG 结构，RitualScene 按签名渲染，仅部分母题使用光球。首页共用的山雾、月轮装饰隐藏，保留基础纹理、光照与暗角。Hero 装饰层增加柔化遮罩，避免矩形硬边。

## 视觉签名

Base atmosphere 继续使用已有 registry 的 themeVars；以下纸面色仅用于 Reading，避免更改 Deck 逻辑。

| Deck | 纸面 | 独立母题 / 轮廓 | 纹理 | 桌面运动 |
| --- | --- | --- | --- | --- |
| Ethereal | #29343c | 轻纱曲线、云气、柔光环 | 纸粒 | 缓慢漂移 |
| Elysian Shadows | #252d24 | 菱形纹章、对称立柱 | 古典纹样 | 庄重转动 |
| Opal Tide | #24343a | 贝壳肋线、水平潮汐 | 水波 | 透视起伏 |
| Wonderland Shadows | #302b38 | 歪斜拱门、花枝 | 植物 | 梦境摆动 |
| Classic | #322c25 | 展开古书、雕刻书角 | 书页线 | 静态 |
| 月光 | #252d3b | 新月、同心月晕 | 纸粒 | 漂移 |
| 古典 | #302b24 | 雕版太阳、对称放射线 | 古典纹样 | 转动 |
| 森语 | #233129 | 层叠枝叶、树干 | 植物 | 漂移 |
| 星图 | #292b3d | 折线星图、方位标记 | 纸粒 | 转动 |
| 幽影 | #29272e | 蚀月、垂直帷幕 | 纵向线 | 静态 |

前五个 artwork Deck 当前缺少可发布牌面资产。此次定义并通过测试夹具预览其背景，不改变可选状态；正常用户仍使用已有五个 legacy Deck。

## 页面覆盖与 3D

- Home、Cover：独立 SVG 母题、局部主题及不同运动；保留现有 CSS 3D 卡牌、指针视差与入场。
- Spread、Shuffle、Cut、Draw、Reveal：沿用统一 DeckAtmosphere，加入当前 Deck 的母题。洗牌桌面 RitualScene 使用相同签名。
- Reading：页面背景、卡牌附近装饰、标题与正文纸面绑定本次 session 的 Deck。完成后更换当前 Deck，不会改变这份解读的世界。
- Deck Library：每个牌组预览显示自己的静态母题。
- Share 页面沿用全局 atmosphere；导出分享图模板未改。Journal、分享记录的独立历史主题处理未扩展。

没有增加 Three.js、Canvas、WebGL、视频、图片、字体或依赖。SVG 只负责装饰，`pointer-events: none`，不挡按钮。

## 本轮修改文件

- 新增：src/atmosphere/signatures.ts、SignatureArt.tsx、visualScope.ts；src/styles/deck-worlds.css。
- 修改：src/atmosphere/DeckAtmosphere.tsx；src/components/immersive/RitualScene.tsx；src/App.tsx；src/main.tsx。
- 修改：src/pages/HomePage.tsx、IntroCover.tsx、DeckLibraryPage.tsx、ReadingPage.tsx。
- 修改：src/styles/design-system.css；tests/design-system.test.ts。
- 文档：docs/deck-worlds-v1.md。

工作区还有此前 User System、Admin、Design System 与 3D 阶段的改动，不属于本轮新增范围，未回滚。

## Mobile 与性能

767px 以下或粗指针设备关闭签名 SVG 持续运动，降低纹理强度；保留静态深度及现有必要卡牌交互。`prefers-reduced-motion` 和慢刷新设备关闭新增循环动画。正文、牌库及全局背景的签名默认静态，持续运动仅用于 RitualScene。

动画使用 transform；纹理复用已有 SVG。未增加 AI 请求或修改流式管道。初始 HTML 关联 JS/CSS 原始体积较本轮前约增加 11 KB（约 1.4%），不是传输耗时或 FPS 指标。

## 验证结果

- `npm run build` 通过：前后端 TypeScript、i18n、Deck、布局、资产、设计检查及 Vite 产物。
- 设计测试 7 项通过，包括十个 Deck 完整覆盖、不同母题，以及主文、次级文字、强调色在纸面与抬升层上对比均至少 4.5:1。
- 引擎回归 64 项断言通过；性能保护检查 30 项通过。
- 修改组件定向 oxlint 与 `git diff --check` 通过。
- Playwright 实际渲染十个 Home 签名；检查牌库预览截图。
- 完整交互：森语 → 洗牌 → 切牌 → 抽牌 → 翻牌 → 本地示例解读成功。未调用真实 AI 服务。
- Home 在 375 / 390 / 430 / 1440 宽度无横向溢出；Reading 在 375 / 390 / 430 无横向溢出。
- reduced-motion 下新签名 SVG 的计算 animation 为 none。
- 完成森语解读后，将当前牌组改为幽影并刷新 Reading，仍呈现森语背景与 #233129 纸面。
- 截图：output/playwright/deck-worlds/，包含 home-final-390.png、home-final-1440.png、library-final.png、reading-desktop.png 等。

## 限制与下一步

尚未测低端 Android / iOS Safari 真机、持续 GPU 功耗、真实 AI 延迟或生产网络加载。正常动态模式的额外桌面/移动对照补测被自动审批服务连接错误中断；移动端关闭动画规则已实现，但该补测未完成。已有游客 auth/me 401 为预期响应，字体 preload 警告未在本轮处理。

建议下一步先做真机动态验收，再补齐未发布 Deck 的正式牌面资产。本轮未推送 GitHub 或部署 Streamlit。

| BEFORE | AFTER |
| --- | --- |
| Reading 固定大块米白纸板 | Deck-aware 深色纸面、细边与低对比纹理 |
| 背景共用月轮与轨道，主要换色 | 十个独立母题、轮廓及纹理组合 |
| 卡牌与正文氛围断层 | 阅读 session 贯穿背景、标题与正文 |
| 动态物件通用 | 按母题配置漂移、转动、潮汐或静态 |
| 原资源与流式策略 | 保留原策略，无新增重型运行时，少量 SVG/CSS 体积增长 |
