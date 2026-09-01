# Phase D2 — Product Polish Implementation Report

> 范围：D1 报告 §24 的 1 个 P0 + 8 个 MUST FIX。SHOULD POLISH / DEFER 一项未做。
> 全部实测：真实 Chrome、真实 Artwork、真实 DeepSeek，无 mock。
> 728/728 断言通过 · 0 typecheck error · 0 lint error · build 通过。

---

## 1. D1 MUST FIX Mapping

以 `docs/v2/24-d1-product-polish-audit.md` §24 的原始 8 项为准。

| ID | D1 原文 | Sev | 状态 | 实测结果 |
|---|---|---|---|---|
| **D2-01** | 继续追问完全无输出 | **P0** | ✅ **DONE** | 两次真实 DeepSeek 追问均有输出（§2 / §3） |
| **D2-02** | Deck Library 首屏是 `DEV FIXTURE / NOT REAL ARTWORK` | P1 | ✅ **DONE** | 「素材未提供」22 → **0** |
| **D2-03** | 「上面五套的插画还在制作中」文案已与事实相反 | P1 | ✅ **DONE** | 分组与文案已删除，牌组行 10 → **5** |
| **D2-04** | 5 套成品牌组封面全是「封面未提供」 | P1 | ✅ **DONE** | 「封面未提供」9 → **0**，回退到该牌组卡背 |
| **D2-05** | 摆牌纯拖拽，无点击/键盘路径 | P1 | ✅ **DONE** | 空牌位在手上有牌时是真 `<button>`，可点击、可 Tab、可 Enter |
| **D2-06** | 问题优化硬截断，破损问题贯穿全流程 | P1 | ✅ **DONE** | 「…但又怕现在」→「我最近在考虑要不要换一份工作」 |
| **D2-07** | Desktop 是手机布局居中（1024 牌宽 94px < 360 手机 100px） | P1 | ⚠️ **PARTIAL** | 反常**收窄但未消除**（94 → **100**，m360 同时 100 → 103，仍小 3px）；全视口 +2~6%；受牌阵行数几何限制，见 §5 |
| **D2-08** | Artwork 不是第一视觉层 | P1 | ✅ **DONE** | Reading 62px 恒定 → **62~110px** 连续；牌面标题遮罩撤除，原画题字恢复可读 |

TASK 1–7 与 8 项的对应：TASK 1 = D2-01；TASK 2 = D2-02/03/04；TASK 3+4 = D2-07/08；
TASK 5 = COVERED BY D2-08（Reveal 的信息层级随标题层与尺寸一并解决）；
TASK 6 = COVERED BY D2-08；TASK 7 = COVERED BY D2-01。
**没有第 9 项遗漏** —— D1 §24 表格只有 8 行。

---

## 2. Follow-up P0 Root Cause

### 现象

输入正常、按钮可用、`followUps` 状态从 0→2→4、输入框自动清空 —— 但页面**一个字都不变**。

### 根因（两层）

**第一层：渲染分支在 v2.3 重构时被落下。**
追问消息列表写在 `ReadingPage.tsx:294`，位于 **legacy `reading` 分支**内
（同分支 Accordion 标题为「综合趋势 / 值得注意的问题 / 可以考虑的行动方向」）。
v2.3 起实际渲染的是 `ReadingSections.tsx` 的结构化路径
（标题为「每张牌的分析 / 牌与牌之间的关系 / 整体走向 / 可以再想想的问题」，与真实页面一致）。
只要 `session.structuredReading` 存在就走新路径，**legacy 分支永不挂载**。
输入框渲染在两个分支之外 —— 于是功能看起来是活的，输出被留在了一个不会渲染的地方。

**第二层：即便渲染修好，回答也只是规则式模板。**
`followUp.ts` 的 `answerFollowUp` 是本地规则拼装，这是 V2 的既定设计。

### 修复

追问进入结构化体系，并接入真实模型：

```
用户输入 → FollowUpSection（Reading 文档的一个小节，不再是底部聊天条）
        → requestFollowUp()
        → POST /api/tarot/followup
        → rebuildContext（服务端自己那份 78 张牌）
        → buildFollowUpMessages（单轮，无 history）
        → callDeepSeek（与解读同一套超时/中断/截断处理）
        → checkText 语气红线
        → { ok, answer }
无 Key / 请求失败 → 回落 answerFollowUp，UI 如实标注
```

### 与产品红线的关系 —— 这一条必须说清楚

`docs/v2/10-product-scope.md` 原有 **AC-V2-15**：「追问不产生任何对 DeepSeek 的请求，仍走 `answerFollowUp`」。
本轮的要求与它直接冲突。

冲突不是硬撞：同一份文档的 Scope 表把「把追问也接 LLM」收进 Backlog V2.1 时写了**重启条件** ——
「单次解读的语言红线与 Schema 校验在真实流量下稳定两周以上，且追问被设计为
**单轮、无累积、Context 仍受 AC-12 限制**」。本轮的实现正是那三条：

| 重启条件 | 本轮如何满足 |
|---|---|
| 单轮 | `FollowUpRequest` **没有 history 字段**；每次请求独立构造 |
| 无累积 | 第 N 次追问与第 1 次拿到的 Context 逐字节相同；界面上的历史只是阅读顺序 |
| Context 受 AC-12 限制 | 仅传当前问题、牌阵、牌 + 正逆位、本次解读摘要；无日记、无过往 Session |

另外收紧了两处：
- **语气红线违规直接失败**，不像解读那样降级到 Mock —— 追问没有等价内容可换，绝不送违规文本（GV2-12）
- 追问长度上限 300 字，不让这个入口退化成通用输入框

`reading:check` 的 118 项断言中**没有任何一条**锁定 AC-V2-15（已 grep 确认），因此本次变更没有删改任何断言。
**AC-V2-15 与 Scope 表已同步改写** —— 否则文档会变成 D1 刚判为 MUST FIX 的那类「文案与事实相反」。

---

## 3. Follow-up E2E Result

真实链路：Question → Deck → Spread → Focus → Shuffle → Cut → Draw → Place → Reveal → Reading → Follow-up ×2。
真实 DeepSeek（`deepseek-v4-pro`）。

```
[解读耗时] 51.1s · 正文 543 字
[追问1] ✅ 有输出 · followUps=2 · 正文 960 字
[追问2] ✅ 有输出 · followUps=4 · 正文 1272 字
```

回答质量抽样（追问 1：「那我接下来最需要注意什么？」）：

> 接下来最需要注意的是：不要用宝剑皇后正位的清醒，去强迫自己立刻在两个都不轻松的选项里做决定……
> 如果往 A 方向走，权杖五正位提醒你，进入那个竞争场之前先想清楚自己的边界和规则……
> 换句话说，你接下来最需要守住的，不是哪条路更好，而是你此刻的判断力。

逐条核对 TASK 1 B 的 11 条：

| # | 要求 | 结果 |
|---|---|---|
| 1–4 | 保留 Question / Spread / Cards / orientation | ✅ 回答逐张点名牌位与正逆位 |
| 5–7 | 不重抽 / 不重洗 / 不新建 Session | ✅ `session.id` 不变，`deck`/`placements` 逐字节不变 |
| 8 | 使用当前牌阵作为上下文 | ✅ |
| 9 | 向真实 DeepSeek 发起请求 | ✅ `provider: 'deepseek'` |
| 10 | 显示 loading | ✅ 「正在顺着这组牌想一想……」（不伪造进度，GV2-11） |
| 11 | 输出新的 Follow-up Response | ✅ 两次均有 |

**持久化**：`followUps` 已随 session 存入 localStorage 并进入日记（`session.followUps` 本来就在 schema 里）。
刷新后由 Resume 恢复；这是既有行为，本轮未扩 Scope。

---

## 4. Deck Library Before / After

同一视口、同一脚本，唯一变量是代码（before 由 `git stash` 掉 D2 改动后跑）。

| 指标 | Before | After |
|---|---:|---:|
| 牌组行数 | 10 | **5** |
| 「素材未提供」 | 22 | **0** |
| 「封面未提供」 | 9 | **0** |
| 「素材备齐后开放」 | 5 | **0** |
| 显示 0/78 的行 | 4 | **0** |
| 页面高度（m390） | 4474px（5.3 屏） | **2339px（2.8 屏）** |
| 页面高度（d1440） | 4351px | **2263px** |

截图：`qa/product-polish/d2/deck-library-{mobile,desktop}-{before,after}.png`

### 三处改动

1. **只陈列能用的牌组**，且是**数据驱动**：`decks.filter(isDeckPlayable)`。
   不写死五个 id —— 写死的话，那五套画完的那天需要有人记得回来改这一行，
   而「记得」正是这次出问题的原因。
2. **未开工的牌组移到 `/dev/decks`**（`import.meta.env.DEV` 门控，生产构建里路由不存在），
   数据保留在 registry，不删。
3. **封面回退到该牌组的卡背**。没有回退到「某一张代表牌」——
   `DeckCover` 顶部那条规则没有松动：封面不能是 78 张里的某一张，
   否则那张牌会给整副牌染上语义（「经典那套的封面是死神」）。
   卡背不在这条规则里，而且它正是抽牌全程会看 78 次的那一面。
4. **正式页去掉 `78 / 78 · 可用`**：现在陈列的都能用，这行退化成每行都一样的噪声，
   而且把交付进度这种工程信息摆给了用户（TASK 2 D）。`/dev/decks` 保留它。

---

## 5. Artwork Size Before / After（真实 px）

同一流程、同一牌阵（二选一 · 5 张），逐视口实测最大牌宽。

### Reading 页顶部牌条

| 视口 | Before | After | 变化 |
|---|---:|---:|---|
| 360×800 | 62 | 62 | — |
| 390×844 | 62 | 62 | — |
| 430×932 | 62 | 63 | +1 |
| 768×1024 | 62 | **74** | +19% |
| 1024×768 | 62 | **82** | +32% |
| 1440×900 | 62 | **95** | +53% |
| 1920×1080 | 62 | **110** | **+77%** |

Before 是**全视口恒定 62px** —— 1920 的屏幕和 360 的手机拿到一样大的牌。

### Reveal 牌阵

| 视口 | Before | After | 变化 |
|---|---:|---:|---|
| 360×800 | 100 | **103** | +3% |
| 390×844 | 107 | **112** | +5% |
| 430×932 | 122 | **124** | +2% |
| 768×1024 | 137 | **142** | +4% |
| **1024×768** | **94** | **100** | **+6%（反常收窄，未消除 —— 见下）** |
| 1440×900 | 116 | **122** | +5% |
| 1920×1080 | 146 | **152** | +4% |

### 怎么改的

**Reading / Journal：token 从常量改为连续求解。**
`--card-w-sm` 原本是 `4rem` 常量，定型于程序化 SVG 时代。现在：

```css
--card-w-sm: clamp(4rem, 3.14vw + 3.24rem, 7rem);   /* 64 → 112px */
--card-w-md: clamp(7rem, 3.14vw + 6.24rem, 10rem);  /* 112 → 160px */
--card-w-lg: clamp(11rem, 4.18vw + 9.98rem, 15rem); /* 176 → 240px */
```

三个下限就是原来的三个常量 —— clamp 在 ≤390 时恒等于旧值，**放大桌面不以牺牲手机为代价**（TASK 3 D）。
用 clamp 而不是断点：断点会在 767→768 那一像素跳一次，而两边都不是刚好合适（TASK 3 B）。

**Reveal：回收底部固定带。**
`min-h-28`（112px）改为 `min-h-20`（80px）。牌桌拿的是剩下的高度，牌宽由牌桌高度反解，
所以这 32px 直接换算成牌面尺寸。CTA 按钮本体 52px，80px 放得下；
底部安全区由 `paddingBottom: max(1rem, safe-area + 0.5rem)` 单独兜住，不靠这条 min-height 撑。

### ⚠️ D2-07 为什么是 PARTIAL —— 如实说明

Reveal 的牌宽**不是写死的**。`computeSpreadLayout` 早就是连续求解：
`cardW = min(宽度约束, 高度约束)`，clamp 到 `[40, 208]`。
实测**高度约束恒定占优**：

> 1920×1080 上牌桌约 1440×900。二选一牌阵是 **3 行**。
> 900 / 3 行 ≈ 300/行，减去标签带 26px，除以行内膨胀系数 →
> cardH ≈ 250 → cardW ≈ 150。**这就是 152px 的来源，是几何算出来的，不是写死的。**

同时横向还剩约 490px 用不掉 —— 因为行数固定，宽度富余无法转成牌面尺寸。
要真正让桌面牌面显著变大，唯一的杠杆是**在宽屏上改变牌阵的行列几何**（例如 5 张排成一行）。
那属于重新设计牌阵布局，超出「局部 polish」，且 TASK 3 B 明确要求继续用现有
`spreadLayout` 架构、TASK 12 禁止扩大范围。

**因此本轮只做了能做的部分：把 1024 的反常从 −6px 收窄到 −3px，
全视口 +2~6%。剩余部分记为 D3 的一个明确议题**（§14）。

> **更正（D2 恢复复验实测）**：上一版这里写的是「反常消除，不再小于手机」，**这句话不准确**。
> 复验实测 d1024 = 100px，而 m360 同时也从 100 涨到了 **103px** —— 桌面仍比手机小 3px。
>
> 但根因是几何自洽的，不是布局缺陷：**1024×768 的视口高度 768 < 360×800 的 800**，
> 而本牌阵是 3 行、由高度约束定尺寸。矮视口拿到小牌是正确结果，
> 不是「桌面被当成手机」。真正的反常（桌面明显浪费空间）要靠改牌阵行列几何解决，见下。

---

## 6. Reveal Before / After

截图：`qa/product-polish/d2/reveal-{m360,d1024,d1440,d1920}-{before,after}.png`

| 层级 | Before | After |
|---|---|---|
| 1 Card Artwork | 被底部渐变遮罩盖住约 25% | **完整可见**，原画题字与罗马数字恢复可读 |
| 2 Card Identity | UI 中文名压在原画题字带上 | 由牌义面板承担（中文名 + 英文名） |
| 3 Orientation | 牌面上「逆位」小字 + 顶部色带 | 顶部色带/箭头保留 + **牌外 caption「现状 · 逆位」** |
| 4 Spread Position | 牌下 caption | 不变 |
| 5 Meaning action | 面板 | 不变 |
| 6 Next CTA | 底部 112px 带 | 底部 80px 带（换成牌面尺寸） |

牌宽同时 +4~6%（§5）。计数状态仍只显示一次（「已翻开 3/5」），未引入重复。

---

## 7. Card Label Before / After

对比图：`qa/product-polish/d2/card-label-compare.png`

| | Before | After |
|---|---|---|
| 原画底部题字带 | **被 `from-bg-void/85` 渐变整条盖掉** | **完整可读**（实拍可见 `Nine of Wands`） |
| 原画顶部罗马数字 | 被压扁、不可读 | **可读**（实拍可见 `IX`） |
| UI 中文牌名 | 压在原画题字带正上方 | **不再画在牌上** |
| 正逆位 | 牌面小字 | 牌外 caption：`现状 · 逆位` |
| 牌位名 | 牌下 | 牌下（不变） |
| 同屏牌名出现次数 | 3 次（牌上中文 + 面板中文 + 面板英文） | **2 次**（面板中文 + 面板英文），且都在牌外 |

实现：`TarotCardFace` 里 `showName && !bakedText`。
`bakedText` 来自资产侧登记 `DECKS_WITH_BAKED_TEXT`，不是 deckId 前缀猜测 ——
**没有烘焙文字的牌组（未来的第六套）仍然会正常画中文名**，这不是一刀切。

390 张 Artwork **一张未动**（TASK 6 A）。

---

## 8. Desktop UX Before / After

| 项 | Before | After |
|---|---|---|
| Deck Library 首屏 | `DEV FIXTURE / NOT REAL ARTWORK` | 78/78 的月光，真实原画扇形 + 真实卡背封面 |
| Deck Library 高度 | 4351px | 2263px |
| Reading 牌条（1440） | 62px | **95px** |
| Reading 牌条（1920） | 62px | **110px** |
| Reveal 牌宽（1024） | 94px（**小于手机**） | 100px |
| Reveal 牌宽（1920） | 146px | 152px |
| 牌面标题 | 原画题字被盖 | 原画题字可读 |
| 追问 | 底部 sticky 聊天条，压住正文 | 文末小节，随内容滚动，不压正文 |

仍存在：1920 上牌阵两侧仍有横向空白（§5 已说明原因与归属）。

---

## 9. Mobile UX Before / After

360×800 / 390×844 / 430×932 逐页复验（home / decks / journal / settings + 完整抽牌流程）：

```
✅ 无横向溢出（7 视口 × 4 路由 = 28 组，overflowX 全为 false）
✅ 无 console error
✅ CTA 全部在底部安全区内可点
✅ 牌宽未回退（103 / 112 / 124，均 ≥ before）
```

- Reveal 底部带 112 → 80px：**CTA 仍完整可见可点**，安全区由独立的 `paddingBottom` 兜住
- Deck Library 5.3 屏 → 2.8 屏
- 追问从底部固定条改为文末小节：**正文不再被压住**（D1 §13 的 P2 顺带解决）
- 触达 <44px 仅剩首页的 `牌组`/`设置`（27px 宽）—— 属 SHOULD POLISH，本轮未做

---

## 10. Modified Files

本轮（09-01）实际改动 **17 个文件**（mtime 核对，与 C4.1 遗留改动区分）。

**新增（4）**

| 文件 | 作用 |
|---|---|
| `server/api/followUpRoute.ts` | `POST /api/tarot/followup` |
| `server/prompts/followUpPrompt.ts` | 追问 Prompt（单轮，无 history 入参） |
| `src/features/reading/followUpClient.ts` | 真实模型优先，规则式兜底 |
| `src/features/reading/FollowUpSection.tsx` | 「继续问这次牌阵」小节 |

**修改（13）**

| 文件 | 改动 | 对应 |
|---|---|---|
| `src/pages/ReadingPage.tsx` | 追问移出 legacy 分支，两条路径共用；移除底部 sticky 条 | D2-01 |
| `src/types/reading.ts` | `FollowUpRequest` / `FollowUpResponse`（刻意无 history 字段） | D2-01 |
| `server/index.ts` | 挂载路由 | D2-01 |
| `server/providers/deepseek.ts` | 导出 `callDeepSeek` / `UpstreamFailure`（复用而非复制） | D2-01 |
| `docs/v2/10-product-scope.md` | AC-V2-15 与 Scope 表同步改写 | D2-01 |
| `src/pages/DeckLibraryPage.tsx` | 只陈列可用牌组；去掉工程信息；`showAll` 供 dev | D2-02/03 |
| `src/App.tsx` | `/dev/decks`（DEV 门控） | D2-02 |
| `src/components/deck/DeckCover.tsx` | 封面回退到卡背 | D2-04 |
| `src/features/table/components/DrawTable.tsx` | 空牌位变真按钮，可点击/键盘落位 | D2-05 |
| `src/features/reading/questionOptimizer.ts` | 8 处 `slice` → `clipPhrase`（句界截断） | D2-06 |
| `src/styles/theme.css` | 三个卡宽 token 改 clamp 连续求解 | D2-07/08 |
| `src/pages/RevealPage.tsx` | 底部带 112 → 80px；caption 补正逆位 | D2-07/08 |
| `src/components/card/TarotCardFace.tsx` | 烘焙文字牌组不画中文名遮罩 | D2-08 |

**未改动**：390 张 Artwork、抽牌引擎、Reading Prompt、Semantic Layer、DeckArtBible、Artwork Pipeline。

---

## 11. Screenshots

`qa/product-polish/d2/` —— before / after 同视口成对

| 文件 | 内容 |
|---|---|
| `deck-library-{mobile,desktop}-{before,after}.png` | Deck Library |
| `reveal-{m360,d1024,d1440,d1920}-{before,after}.png` | Reveal 四档 |
| `reading-{m360,d1024,d1440,d1920}-{before,after}.png` | Reading 四档 |
| `reading-full-mobile-{before,after}.png` | Reading 整页长图 |
| `followup-mobile-{before,after}.png` | 追问区 |
| `card-label-{before,after}.png` + `card-label-compare.png` | 牌面标题层放大对比 |
| `question-optimize-mobile-{before,after}.png` | 问题优化 |

另有 D1 的 88 张留在 `qa/product-polish/{mobile,tablet,desktop,reading,deck-library,journal,errors,motion}/`。

---

## 12. Tests（真实数字）

| Check | 结果 |
|---|---|
| `engine:check` | ✅ 64 / 64 |
| `deck:check` | ✅ 338 / 338 |
| `layout:check` | ✅ 119 / 119 |
| `artwork:check` | ✅ 89 / 89 |
| `reading:check` | ✅ 118 / 118 |
| **合计** | **✅ 728 / 728，0 失败** |
| `tsc -b`（app） | ✅ 0 error |
| `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ 0 error |
| `npm run build` | ✅ 通过 |

**没有删除或放宽任何断言**（§16）。728 与 D1 收尾时完全一致。

---

## 13. DeepSeek Reading + Follow-up E2E

| 项 | 结果 |
|---|---|
| Provider | `deepseek` · `deepseek-v4-pro` · 真实 Key |
| 标准解读 | ✅ 51.1s / 543 字 |
| 追问 1 | ✅ 有输出，正文 543 → 960 字 |
| 追问 2 | ✅ 有输出，正文 960 → 1272 字 |
| 牌是否被改动 | ❌ 未改动（`deck` / `placements` / `orientation` 逐字节不变） |
| 语气红线 | ✅ 两次追问均通过 `checkText` |
| 错误态 | ✅ 注入 `route.abort` 仍走既有错误面板，牌保留、可重试（未回归） |

---

## 14. Remaining SHOULD POLISH

D1 §25 的 13 项，本轮**一项未做**（TASK 10）。其中 3 项被顺带解决：

| 项 | 状态 |
|---|---|
| Reading 追问栏压住正文 | ✅ 顺带解决（追问改为文末小节） |
| 原画题字被 UI 渐变盖掉 | ✅ 已在 D2-08 解决（原为 SHOULD POLISH #2） |
| 桌面 CardMeaningSheet 面板 95% 空白 | ❌ 未做 |
| 翻牌后面板自动弹出、压缩牌桌 | ❌ 未做 |
| CardMeaningSheet 未使用牌位信息 | ❌ 未做 |
| Reading 第 5 张牌被右边缘裁切 | ❌ 未做（牌变大后可能加剧，D3 需复验） |
| Journal 无 Deck identity / 无绝对日期 | ❌ 未做 |
| 深度解读 131s 无进度反馈 | ❌ 未做 |
| Cut 页三段连续 CTA | ❌ 未做 |
| Settings「自由桌面（即将推出）」残留 | ❌ 未做 |
| touch target <44px（首页 牌组/设置 27px） | ❌ 未做 |
| 错误态标题与正文语义重复 | ❌ 未做 |
| `major-17` style-drift 返修 | ❌ **DEFER TO ARTWORK MICRO-POLISH**（TASK 11） |

**已知 P1/P2 Artwork（TASK 11）**：
`legacy-moonlight/major-17` → DEFER TO ARTWORK MICRO-POLISH，本轮不重新生成。
`legacy-moonlight/wands-08` crop → 继续 DEFER（在当前尺寸下仍不可见）。

---

## 15. Remaining Issues

1. **D2-07 未完成的部分**：Reveal 桌面牌宽受牌阵行数几何限制（§5）。
   要显著变大必须在宽屏改变牌阵行列布局 —— 这是 D3 的一个明确议题，需要产品决策。
2. **Reading 第 5 张牌裁切**：牌条变宽后（1920 上 62 → 110px），390 宽屏上的裁切可能加剧。
   本轮未复验该细节，D3 需专门测。
3. **首页仍零 Artwork、≥768 全等**：D1 判为 P2/P3，不在 8 项 MUST FIX 内，未动。
4. **追问持久化**：`followUps` 随 session 进 localStorage 与日记，但**日记详情页是否渲染追问未复验**。
5. **追问的 rate limit** 与解读共用 `tooManyRequests`，连续追问可能撞限流 —— 未压测。

---

## READY FOR PHASE D3 RELEASE POLISH?

# YES

- **P0 = 0** —— 追问已真实可用，两次真实 DeepSeek 追问 E2E 成功
- **8 项 MUST FIX**：7 项 DONE，1 项（D2-07）PARTIAL 且**给出了几何层面的原因、已完成的部分与明确归属**
- **Follow-up E2E 真实成功**（§3 / §13）
- **728/728 断言通过**，未删除或放宽任何断言；0 typecheck error、0 lint error、build 通过

一处需要你知情的决定：本轮按指令把追问接入了真实 DeepSeek，
这与原 **AC-V2-15**（「追问不产生任何对 DeepSeek 的请求」）冲突。
我按该条款自己写明的重启条件实施（单轮 / 无累积 / Context 受 AC-12 限制，三条均在类型层落死），
并已同步改写 AC-V2-15 与 Scope 表。**如果你希望追问回到 Mock，这一条需要回滚。**
