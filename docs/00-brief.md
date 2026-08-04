# Arcana — 沉浸式线上塔罗抽牌 Web MVP · 需求简报（唯一事实来源）

> 本文件是所有 Agent 的共同输入。任何设计/实现决策与本文件冲突时，以本文件为准。

## 0. 最高优先原则

> **“这个交互是在帮助用户自己抽牌，还是系统又在替用户抽牌？”**

用户在整个核心流程中必须持续拥有：**操作权、选择权、摆牌权、最终翻牌权**。
该原则高于视觉炫酷度、开发便利性、AI 能力和功能数量。

冲突解决优先级：**核心产品价值 > 用户体验 > 技术便利 > 视觉效果**

## 1. 产品一句话定义

一个让用户在线上像线下一样，亲手完成整个塔罗抽牌过程（洗牌 → 切牌 → 摊牌 → 选牌 → 摆牌 → 翻牌）的沉浸式数字塔罗产品。工作名 **Arcana**（Placeholder，不做品牌设计）。

AI 不决定抽到哪张牌，AI 只在用户抽完之后提供辅助解读。

MVP 验证目标：
- P0：用户明显感受到「这是我自己抽出来的牌」
- P1：提问 → 选牌阵 → 洗牌 → 切牌 → 摊牌 → 选牌 → 摆牌 → 翻牌 → 解读 全流程顺畅
- P2：用户愿意回来再抽 / 记录塔罗日记

## 2. 目标用户

- 新手：不懂牌阵/正逆位/牌义，需要引导
- 轻度用户：懂一点，想要更大自主权
→ **默认提供引导，熟悉后可快速操作。第一次明显教程，第二次以后自动弱化提示。**

## 3. 平台

**Mobile First**。桌面端可用即可，不做桌面专属布局。

## 4. 核心流程（带着问题来）

选择牌组（只有一套，默认选中） → 输入问题 → AI 辅助优化问题（Mock，可接受/可保留原问题，不强制改写） → 推荐 2–3 个牌阵 + 查看全部 → 用户选牌阵 → 抽牌前准备（直接开始 / 专注一下） → 洗牌 → 切牌 → 摊牌 → 抽牌 → 摆牌 → 翻牌 → 牌义 → AI 综合解读 → 后续追问 → 自动存入日记

## 5. 随缘抽一张

- 直接随缘：不输入任何内容，直接单张牌流程
- 选择轻主题：今日提醒 / 最近状态 / 我需要注意什么 / 给我一个建议 → 单张牌流程

## 6. 首页

极简。两个主入口：**带着问题来** / **随缘抽一张**。
次级弱化入口：塔罗日记、牌组、设置。**不要做成 Dashboard**。进入抽牌流程后尽量隐藏普通导航。
若有未完成 Session，提示「你有一次未完成的抽牌」+ 继续 / 重新开始。

## 7. 牌阵（5 个）

| 牌阵 | 牌数 | 牌位 |
|---|---|---|
| 单张牌 | 1 | 指引 |
| 过去 / 现在 / 未来 | 3 | 过去、现在、未来 |
| 现状 / 阻碍 / 建议 | 3 | 现状、阻碍、建议 |
| 二选一 | 5 | 现状、A 方向发展、A 结果、B 方向发展、B 结果 |
| 关系 | 5 | 你、对方、你们之间、阻碍、走向（3–5 张均可） |

系统 Mock 推荐 2–3 个，用户自己决定；提供「查看全部牌阵」。

## 8. 随机机制（关键技术逻辑）

**禁止**在用户点击某张牌之后才 `randomCard()` 然后告诉用户「You got The Moon」。

正确逻辑：
1. 进入 Tarot Session 时立即生成**隐藏牌组状态**（78 张的完整顺序 + 每张的隐藏正逆位）
2. 初始牌序由 **System Random**（seed）产生
3. 用户的 **Drag Direction / Drag Distance / Shuffle Count / Interaction Timing / Cut Position** 进一步扰动牌序与方向
4. 代码上必须体现 `systemRandom + userInteractionEntropy`
5. 用户最终选择的是**已经存在于隐藏牌组中的某一个位置**（index → card）

用户抽牌前不能知道卡牌身份与正逆位；只有翻牌后才可见。

## 9. 各阶段交互要求

**洗牌**：不能只是一个按钮。必须真正操作牌堆：拖动、左右滑动、可连续多次；卡牌错位并重新组合；操作后有明显视觉反馈。不追求真实 3D 物理。目标是「我参与了洗牌」。

**切牌**：用户自己选择切牌位置，看到牌堆分成两部分再重新组合。**系统不得自动切牌**。

**摊牌**：默认横向 / 扇形展开，全部背面朝上，可左右滑动浏览。即使没有 78 张原创插画，也要有足够数量的牌背实例让用户感觉是完整一副牌。用户可从任意位置选择。Free Table Mode 只保留入口/说明，第一版不实现完整物理桌面。

**选牌**：用户必须从牌背中主动选择某一张。

**摆牌**：多牌阵时用户自己把牌拖到对应牌位。**不要自动飞过去**。靠近有效 Drop Zone 时可轻微发光/放大/吸附反馈，但要克制。

**换牌**：放到牌阵后、未翻开前允许拿回和更换。一旦翻开不可替换。不要频繁弹 Confirm Dialog，用状态逻辑自然表达。

**翻牌**：用户主动触发（点击 / Tap / 轻微上滑）。流畅、有重量感、有轻微仪式感、可有极轻微 Glow。**禁止**爆炸粒子、SSR 抽卡动画、大量闪光、强烈震动。

## 10. 抽牌前准备

「直接开始」或「专注一下」。专注模式仅轻量：背景变暗、显示用户问题、提示「在心里再想一次你的问题」。不强制倒计时，不做成 Meditation App。

## 11. 牌义展示

翻开后不要马上整屏文字。
- 第一层：牌名 + 正/逆位 + 3–5 个关键词（例：`The Hermit — 逆位｜内省 · 独处 · 寻找方向`）
- 「查看详细牌义」展开：基础牌义、当前牌位含义、感情、事业、学业、财务、建议、象征元素

## 12. AI 综合解读

全部翻完后**不自动弹出**。先让用户看到完整牌阵，再显示「开始完整解读」按钮 → Reading Page。
结构**先短后长**：顶部 1–2 段核心结论；下方可展开：每张牌分析、牌位含义、卡牌之间的关系、综合趋势、值得注意的问题、可以考虑的行动方向。

风格必须**理性分析型**。禁止「你一定会…」「命运已经决定…」「你必须…」。应使用「这组牌可能反映…」「目前值得关注的是…」「如果按照当前状态继续发展…」「可以把这张牌理解为一种提醒…」。塔罗用于**整理问题、获得新观察角度，不替用户做决定**。

## 13. 后续追问

允许「关于这次抽牌继续问」。Mock Answer。Session Context 严格限制为：当前问题、牌阵、卡牌、正逆位、当前 AI Reading。**不得变成无限制通用 Chatbot**。

## 14. 塔罗日记

每次完整占卜自动保存至 localStorage。
列表：日期、问题、牌阵、卡牌缩略图、核心结论。
详情：原问题、优化问题、牌阵、卡牌、正逆位、详细牌义、AI Reading、后续追问。
用户可补充：当时的心情、我的笔记、后来发生了什么。历史只供用户自己回顾，新 Reading 不自动读取过去日记。

## 15. 未完成 Session

抽牌过程中持续保存状态（问题、牌阵、洗牌、已抽部分牌）。下次打开首页提示可继续或重新开始。localStorage 实现。

## 16. 分享

只做分享 Preview，不接真实社交网络。默认分享：卡牌、正逆位、牌阵、核心结论。默认隐藏：原始问题、私人笔记、心情、后续记录。用户可自行选择是否显示原问题。

## 17. 设置

新手引导 开/关；轻微音效 开/关；轻微震动 开/关（浏览器支持时）；摊牌模式（默认扇形，预留自由桌面）。

## 18. 声音与触觉

仅轻量反馈：纸牌摩擦声、放牌声、翻牌声、必要的轻微 Haptic。**暂不做背景音乐**。

## 19. 新手引导文案（第一次流程）

- 洗牌：「滑动牌堆进行洗牌。」
- 切牌：「选择一个你想切开的位置。」
- 选牌：「慢慢浏览，选择你想拿起的牌。」
- 摆牌：「把它放到对应牌位。」
- 翻牌：「准备好后，翻开它。」

第一次之后自动弱化。

## 20. 视觉方向（已确定）

**Dreamlike / Surreal / Celestial / Quiet / Premium**
关键词：星空、月亮、梦境、漂浮空间、星轨、微光、雾、深蓝、深紫、银色、少量冷金色。

**必须避免**：廉价紫色玄学网站、游戏抽卡 UI、Crypto Dashboard、电商网站、ChatGPT Clone、大量发光特效、到处都是水晶球和星座符号。

设计系统需覆盖：Background / Surface / Typography / Spacing / Border Radius / Card Style / Button Style / Input Style / Motion Style / Tarot Card Back Style / Tarot Table Style。整站属于同一设计系统。

## 21. 牌组

第一版只做一套主牌组：**梦幻超现实塔罗牌组**（深夜、星空、月亮、雾、微光、星轨、超现实空间）。底层仍是标准 78 张体系。
Prototype 不需要 78 张原创高清插画：先做 6–10 张代表性 Mock Card（The Fool / The Magician / The High Priestess / The Lovers / The Hermit / Death / The Star / The Moon / The Sun / The World），其余用统一风格 Placeholder。**牌背必须统一，抽牌前不得泄露牌面。**

## 22. 安全边界

普通生活问题正常使用。出现明显医疗诊断 / 高风险财务 / 法律决策 / 危险行为时，提示：「塔罗更适合用于整理思路和提供不同观察角度，不应该替代专业意见或现实判断。」明显高风险内容不得做确定性预测式回答。

## 23. 技术栈

React + TypeScript + Vite + Tailwind CSS；动画 Framer Motion；拖拽用 Pointer Events / Framer Motion Drag。避免为简单交互引入过多第三方库。
状态：React State + Context / 轻量 Store + localStorage。
**不接**：云数据库、真实账号系统、付费、真实 AI API。

代码要求：可读、模块化、Component 化、类型明确、不重复、避免大文件、避免大量 Hardcoded UI。禁止把绝大部分逻辑塞进 `App.tsx`。
目录至少区分：`components / features / pages / data / types / hooks / utils / store / styles`。Tarot Table 相关交互单独成 Feature Module。

## 24. 路由建议

`/` 首页 · `/deck` 牌组 · `/question` 问题 · `/spread` 选牌阵 · `/focus` 专注 · `/table/shuffle` · `/table/cut` · `/table/draw`（摊牌+抽牌+摆牌） · `/table/reveal` · `/reading` · `/journal` · `/journal/:id` · `/share/:id` · `/settings`

## 25. 核心数据结构

```
TarotCard: id, name, number, arcana, suit, orientation, keywordsUpright,
  keywordsReversed, meaningUpright, meaningReversed, love, career, study,
  finance, advice, symbols, image

TarotSession: id, createdAt, updatedAt, status, mode, question, optimizedQuestion,
  theme, deckId, spreadId, shuffleSeed, interactionEntropy, cards, positions,
  revealedCards, reading, followUpMessages, mood, note, outcome
```
用 TypeScript 类型系统进一步规范。

## 26. MVP 明确不做（提出即拒绝，进 Future Backlog）

付费、订阅、商城、社区、排行榜、好友、Google Login、云同步、Push Notification、完整后台、多语言、多套完整牌组、几十种牌阵、长期 AI 用户画像、AI 自动读取过去占卜、塔罗师 Marketplace、NFT、Live Streaming。

## 27. 开发优先顺序

1 Product Definition → 2 UX Flow → 3 Design System → 4 Tarot Table Prototype → 5 Shuffle → 6 Cut → 7 Fan Spread → 8 Card Selection → 9 Drag to Position → 10 Reveal → 11 完整主流程 → 12 Reading → 13 Journal → 14 Session Restore → 15 Share → 16 QA

**Shuffle → Cut → Draw → Reveal 应得到最多设计与测试时间。**

## 28. 最终交付标准（必须真实可运行）

打开网页 → 点「带着问题来」→ 输入问题 → 选推荐牌阵 → 进入抽牌 → 自己洗牌 → 自己切牌 → 自己浏览摊开的牌 → 自己选牌 → 自己拖到牌位 → 自己翻牌 → 看到牌义 → 查看 Mock AI 解读 → 退出后能在塔罗日记看到记录。

## 29. Review Gates

- Gate 1 Product：Scope 是否清楚
- Gate 2 UX：完整流程是否存在死路
- Gate 3 Interaction：抽牌是否真的由用户完成
- Gate 4 Visual：是否统一且没变成廉价玄学网站
- Gate 5 Functional：完整流程能否跑通
- Gate 6 QA：移动端是否真的可用
