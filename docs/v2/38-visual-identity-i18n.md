# Visual Identity V3 与完整语言切换交付

## 审计结论

- 原有 ARCANA 品牌字体、卡面资产、左卡右文 Hero 已有识别度；保留布局及牌组系统。
- Reading 正文、章节、CTA 原先层级不足；旧方案同时展示中英文，未形成产品语言状态。
- Cover/Home 原先以深色渐变和几何符号为主，艺术肌理不足。
- 入口为 React App/Router；Cover、Home、Deck、Question/Spread、沉浸式牌桌、Reading、Journal、Share、Settings 分页。Streamlit 加载独立构建目录。
- 文案分布在页面、按钮、牌桌组件、牌组/牌阵数据、错误提示、AI prompt、mock 和兼容投影层；只替换页面文字无法完成切换。
- 中文牌义是既有引擎数据；通过 cardId 加载翻译层可保持随机引擎、牌序和保存格式兼容。

## 最终实现

### Typography

四个角色：Oracle Display（品牌、核心主题）、Ritual Heading（章节、引导、重点句）、Editorial Body（正文、用户问题、Journal）、UI/Button（按钮铭文与清晰表单）。Cinzel、Cormorant、中文文楷静态子集自托管。动态中文主题用完整系统楷体/宋体回退链，避免子集缺字；长正文保留可读字体，通过行高、段距和阅读宽度增强编辑排版。核心主题、章节编号与装饰线、关键引文、CTA 留白共同建立层次。

### 背景

保持左卡右文 Hero；渐变底色、纸张颗粒、水墨山岚/云气/月轮/植物纹样、几何符号分层。六份 SVG 总计 4,852 bytes，不引入 WebGL/canvas 或背景请求库。Cover 集中完整，Home 降低装饰强度；背景不承担信息，移动端减少植物层，保留 reduced-motion。

### i18n

`src/i18n/locales/zh-CN.json` 与 `en-US.json` 统一消息树；Provider 提供当前语言和稳定 translator。中文默认资源，英文 UI 与 78 张牌文本按需加载。Cover/Home/Deck/Spread/Reading/Journal/Share/Settings/牌桌、提示及错误使用同一语言。页面不并排显示翻译；语言选择器的“中文 / English”是查找目标语言所需的自称。

Desktop 右上角选择器；Mobile 使用菜单，Settings 内保留完整选择器。`arcana:language` 保存 `zh-CN` / `en-US`；恢复时同步 document.lang。语言包失败明确报错，可再次点击重载恢复。

### AI 与历史内容

Reading request 传入 `language: zh | en`，服务端重建 context、prompt、mock、结构校验、兼容投影和 Streamlit 路径一致使用该参数；meta 记录生成语言。切换语言会取消旧流，避免旧语言 delta 混入新页面，牌序不变。

历史解读、问题、Journal 展示内容通过独立忠实翻译路径切换，不再次占卜。`/api/tarot/translate` 校验长度、数量与结果结构，复用速率限制；Streamlit 复用现有消息桥。翻译缓存在内存中且有上限，失败提供重试。原始记录不被覆盖；编辑框保留原文并明确标记。Share 只处理分享内容和用户选择公开的问题。

牌数据通过稳定 cardId 的本地化 overlay 覆盖 78 张牌的名称、关键词、正逆位意义、领域解释、建议及象征；牌组/牌阵/牌位翻译统一由 domain helpers 读取。

## 验证

- typecheck：前端与 Node 服务端通过（普通 build 内执行）。
- i18n：18 项静态检查通过；额外 runtime 检查双语言 context/prompt/mock、card identity、翻译输入/输出验证通过。
- deck 367、layout 147、artwork 89、engine 64、reading 118、performance 30 项检查通过。
- lint：0 error；存在 Fast Refresh 与既有 QA unused-import warnings。
- 普通生产 build 与 Streamlit build 通过。Streamlit 主包仍有 >500 kB 提示。
- 真实 DeepSeek 英文流完成，卡名 The Fool、牌位 Guidance，输出文本未夹杂汉字；真实翻译接口返回英文。
- Chrome 实测 Home/Reading 375、390、430、1440px；抽牌/翻牌详情 375、390、430px：无横向溢出。
- 实测英文页面、语言包失败重试、刷新恢复、Reading 章节键盘展开、切换语言取消旧流；Deck 和原始会话内容保持不变。
- 历史内容页面的广覆盖浏览器测试使用确定性翻译响应；真实模型翻译另行验证，不把 fixture 当成真实 AI 结果。

## 资源与性能

字体共约 119 KiB，英文首次启动不请求中文字体。英文 UI gzip 约 6.9 kB，英文牌义 gzip 约 35.76 kB，按需加载。普通主入口 gzip 98.96 kB；Streamlit 主入口 gzip 196.65 kB。未新增 npm 产品依赖。背景 SVG 共约 4.74 KiB。字体地址遵守 Vite BASE_URL，Streamlit 构建资源同步生成。

## 已知限制

历史文本翻译需要可用 AI 服务与网络；不会伪造离线翻译。用户输入编辑保留原文，卡面图片中原本烘焙的题字属于画作，未改画或遮盖。中文动态艺术标题依赖系统字体回退，尚未实测所有 Windows/Android 真机。已验证浏览器响应式布局，未宣称完成线上真实用户 LCP 测量。Streamlit 仓库产物可同步，线上重部署状态需平台实例验证。

## BEFORE → AFTER

| 维度 | Before | After |
|---|---|---|
| Home visual impact | 深色渐变与符号 | 山岚、月轮、纸纹与聚焦卡面 |
| Reading experience | 普通标题与长文 | 核心主题、仪式章节、重点引文与留白 |
| Typography | 主要强调品牌 | 四种字体角色，正文保持易读 |
| Background | 单一底层 | 低成本静态艺术分层 |
| Language system | 中英并排、默认中文 AI | 全局单语言切换、AI 参数与历史翻译 |
| Mobile | 页面局部适配 | 菜单语言入口与三档实测 |

## 修改文件清单

以下为相对仓库根目录的完整源码/文档改动清单；包括被移除的旧双语组件和检查脚本。`streamlit_build/` 为对应生成产物，哈希文件随构建替换。

- `index.html`
- `package.json`
- `public/assets/identity/botanical.svg`
- `public/assets/identity/cloud-qi.svg`
- `public/assets/identity/damask.svg`
- `public/assets/identity/moon-halo.svg`
- `public/assets/identity/paper-grain.svg`
- `public/fonts/README.md`
- `public/fonts/lxgw-wenkai-light-subset.woff2`
- `public/fonts/subset-charset.txt`
- `scripts/deck-check.ts`
- `scripts/i18n-check.ts`
- `scripts/i18n-runtime-check.ts`
- `scripts/identity-check.ts`
- `scripts/layout-check.ts`
- `scripts/performance-check.ts`
- `scripts/subset-display-font.py`
- `server/api/followUpRoute.ts`
- `server/api/translationRoute.ts`
- `server/context/rebuild.ts`
- `server/i18n.ts`
- `server/index.ts`
- `server/prompts/followUpPrompt.ts`
- `server/prompts/tarotReadingPromptV2.ts`
- `server/providers/mock.ts`
- `server/validation/readingSchema.ts`
- `server/validation/toneGuard.ts`
- `src/App.tsx`
- `src/components/atoms/Button.tsx`
- `src/components/card/CardArtworkLayer.tsx`
- `src/components/card/DeckCardBack.tsx`
- `src/components/card/TarotCardFace.tsx`
- `src/components/deck/DeckCover.tsx`
- `src/components/identity/ArtBackdrop.tsx`
- `src/components/identity/Bilingual.tsx`
- `src/components/identity/LanguageSwitcher.tsx`
- `src/components/identity/copy.ts`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/ImmersiveShell.tsx`
- `src/data/deck/i18n/en-US.ts`
- `src/data/deck/i18n/en/cups.ts`
- `src/data/deck/i18n/en/major.ts`
- `src/data/deck/i18n/en/pentacles.ts`
- `src/data/deck/i18n/en/swords.ts`
- `src/data/deck/i18n/en/wands.ts`
- `src/data/deck/localized.ts`
- `src/features/question/QuestionField.tsx`
- `src/features/question/QuestionFocusMoment.tsx`
- `src/features/question/questionInspiration.ts`
- `src/features/reading/FollowUpSection.tsx`
- `src/features/reading/ReadingBody.tsx`
- `src/features/reading/ReadingModePicker.tsx`
- `src/features/reading/ShareCard.tsx`
- `src/features/reading/buildReadingRequest.ts`
- `src/features/reading/domainMeaning.ts`
- `src/features/reading/followUp.ts`
- `src/features/reading/followUpClient.ts`
- `src/features/reading/legacyProjection.ts`
- `src/features/reading/mockProvider.ts`
- `src/features/reading/mockReadingEn.ts`
- `src/features/reading/questionOptimizer.ts`
- `src/features/reading/readingClient.ts`
- `src/features/reading/safety.ts`
- `src/features/reading/streamClient.ts`
- `src/features/reading/streamlitReading.ts`
- `src/features/reading/streamlitTransport.ts`
- `src/features/table/components/CardMeaningSheet.tsx`
- `src/features/table/components/CutStack.tsx`
- `src/features/table/components/DrawTable.tsx`
- `src/features/table/components/FanSpread.tsx`
- `src/features/table/components/FlipCard.tsx`
- `src/features/table/components/ShuffleStack.tsx`
- `src/hooks/useCardText.ts`
- `src/hooks/useReading.ts`
- `src/i18n/I18nProvider.tsx`
- `src/i18n/boot.ts`
- `src/i18n/display-keys.json`
- `src/i18n/domain.ts`
- `src/i18n/index.ts`
- `src/i18n/locales/en-US.json`
- `src/i18n/locales/zh-CN.json`
- `src/i18n/store.ts`
- `src/i18n/translation.ts`
- `src/i18n/types.ts`
- `src/i18n/useI18n.ts`
- `src/i18n/useLocalizedContent.tsx`
- `src/main.tsx`
- `src/pages/CutPage.tsx`
- `src/pages/DeckLibraryPage.tsx`
- `src/pages/DrawPage.tsx`
- `src/pages/FocusPage.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/IntroCover.tsx`
- `src/pages/JournalDetailPage.tsx`
- `src/pages/JournalPage.tsx`
- `src/pages/QuestionPage.tsx`
- `src/pages/ReadingPage.tsx`
- `src/pages/RevealPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/SharePage.tsx`
- `src/pages/ShufflePage.tsx`
- `src/pages/SpreadPage.tsx`
- `src/styles/theme.css`
- `src/types/reading.ts`
- `src/utils/format.ts`
- `tsconfig.app.json`
- `tsconfig.server.json`
