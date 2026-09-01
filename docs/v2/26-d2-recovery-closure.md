# Phase D2 — Recovery & Closure Report

> 背景：D2 实施完成后终端会话被中断/重启。本轮**不重跑 D2**，只按磁盘上的真实代码恢复状态、
> 复验唯一的 PARTIAL、重跑测试与真实 E2E。
> 全部实测：真实 Chrome（系统 Chrome 152）· 真实 Artwork · 真实 DeepSeek（`deepseek-v4-pro`）· 无 mock。

---

## 1. D2 Recovery Matrix

以 `docs/v2/24-d1-product-polish-audit.md` §24 的原始 8 项为准，逐项对磁盘代码取证。

| D2 ID | Current disk state | 结论 | Evidence |
|---|---|---|---|
| **D2-01** 追问无输出 | `FollowUpSection` 在 `ReadingPage.tsx:251`（结构化路径）与 `:321`（legacy 路径）两处挂载；底部 sticky 条已无残留；`followUpClient.ts` / `followUpRoute.ts` / `followUpPrompt.ts` / `FollowUpSection.tsx` 四个新文件均在盘上 | ✅ **DONE** | 真实 E2E 两次追问均有输出（§4）；`grep -n "sticky\|fixed bottom" ReadingPage.tsx` → 0 命中 |
| **D2-02** Deck Library 首屏开发态 | `decks.filter(isDeckPlayable)`（`DeckLibraryPage.tsx:243`）；未开工牌组移到 `/dev/decks`（`App.tsx:111`，`import.meta.env.DEV` 门控） | ✅ **DONE** | 实拍 `/decks`：旧开发态文案命中 **0**（§6） |
| **D2-03** 「插画还在制作中」反事实文案 | 分组与文案已删除，页面只剩 5 套 | ✅ **DONE** | 实拍文本：月光/古典/森语/星图/幽影，无「现行牌组」分隔（§6） |
| **D2-04** 封面全是「封面未提供」 | `DeckCover.tsx:80` `if (!showPath) return <DeckCardBack simplified/>` | ✅ **DONE** | 实拍 25 张可见图片、**0 张加载失败**、0 次「封面未提供」（§6） |
| **D2-05** 摆牌无点击/键盘路径 | `DrawTable.tsx:290` 空牌位在手上有牌时是真 `<button type="button">`，带 `aria-label` 与 `focus-visible:ring` | ✅ **DONE** | 代码在盘；本轮 E2E 全流程 5/5 落位成功 |
| **D2-06** 问题优化硬截断 | 8 处 `slice` → `clipPhrase`（`questionOptimizer.ts:51`） | ✅ **DONE** | 直调实测：「…但又怕现在这份的稳定…」→「**我最近在考虑要不要换一份工作**」，3 组样例均按句界截断（§8） |
| **D2-07** Desktop 手机布局居中 | `spreadLayout.ts` 连续求解未动；`theme.css` 三个 token 已改 clamp；`RevealPage` 底部带 112→80px | ⚠️ **PARTIAL → DEFER TO D3** | 全视口实测复现 D2 报告 After 列（§3）；几何根因已量化证明（§3.2） |
| **D2-08** Artwork 不是第一视觉层 | `TarotCardFace.tsx:195` `showName && !bakedText`；`theme.css` clamp | ✅ **DONE** | Reading 牌条 62→110px 连续（§3.1）；1920 实拍原画题字与罗马数字清晰可读（§7） |

**7 DONE 全部仍在盘上，一项未丢失。** 未对已完成的 D2 改动做任何重做或覆盖。

---

## 2. 磁盘取证基线

```
git 状态：22 个已修改文件 + 4 个新增追问文件（全部未提交，与 D2 报告 §10 一致）
产品代码 diff：src/ + server/ 共 19 文件 · +577 / −138
新增文件 mtime：09-01 13:09–13:11（D2 实施时间窗）
d2 截图：43 张（D2 原有 28 张 + 本轮恢复复验新增 15 张）
```

---

## 3. D2-07 复验（唯一 PARTIAL）

### 3.1 六档视口实测

**Reveal 牌阵**（二选一 · 5 张 · 3 行），单位 px：

| 视口 | 牌宽 | 牌高 | 行数 | 牌阵占宽 | 左/右空 | 横向未用 | 横向溢出 |
|---|---:|---:|---:|---:|---:|---:|---|
| 360×800 | 103 | 174 | 3 | 334 | 13 / 13 | 26 | 否 |
| 390×844 | 112 | 188 | 3 | 362 | 14 / 14 | 28 | 否 |
| 768×1024 | 142 | 239 | 3 | 634 | 67 / 67 | 134 | 否 |
| 1024×768 | 100 | 167 | 3 | 589 | 218 / 218 | 436 | 否 |
| 1440×900 | 122 | 204 | 3 | 717 | 361 / 361 | 722 | 否 |
| 1920×1080 | 152 | 255 | 3 | 892 | 514 / 514 | 1028 | 否 |

**Reading 顶部牌条**：

| 视口 | 牌宽 | vs 旧 62px 恒定值 |
|---|---:|---|
| 360×800 | 62 | +0%（下限守住，手机无 regression） |
| 390×844 | 62 | +0% |
| 768×1024 | 74 | **+19%** |
| 1024×768 | 82 | **+32%** |
| 1440×900 | 95 | **+53%** |
| 1920×1080 | 110 | **+77%** |

**两组数字与 D2 报告 §5 的 After 列逐值吻合** —— D2-07/08 的改动确实在盘上生效。

### 3.2 逐条回答复验要求

| 检查项 | 结论 | 证据 |
|---|---|---|
| Reveal Artwork 是否第一视觉层 | ✅ **是** | 1920 实拍：原画烘焙题字 `Nine of Pentacles` / `TEMPERANCE` / `JUDGEMENT` 与顶部罗马数字 `IX` `XIV` `XX` 全部清晰可读，牌面无任何 UI 遮罩；牌名/正逆位/牌位全部在牌外 |
| Desktop 是否真正利用空间 | ⚠️ **部分** | 牌阵铺开到 availW 的 **58%（1920）/ 62%（1440）/ 72%（1024）**。求解器已把富余宽度按设计上限 2.2× 分给列间距，但**牌本身无法变大** |
| 1024 是否仍反常偏小 | ⚠️ **仍小 3px，但几何自洽** | d1024=100px < m360=103px。根因：**1024×768 的视口高度 768 < 360×800 的 800**，而牌阵 3 行由高度约束定尺寸 —— 矮视口拿到小牌是正确结果，不是「桌面被当成手机」 |
| 多牌布局是否自然 | ✅ **是** | 6 档视口行数恒为 3，无重叠、无错位、无横向溢出 |
| 卡牌是否被 Right Panel 压缩 | ✅ **否** | 面板收起后牌桌拿回全部高度；面板展开时压缩牌桌属 D1 SHOULD POLISH #1/#3，不在 8 项 MUST FIX 内 |
| Mobile 是否 regression | ✅ **无** | Reveal 103/112 ≥ before 100/107；Reading 牌条 62px 下限恒等于旧值；6 档 overflowX 全为 false |
| 是否仍需代码修改 | ❌ **不需要** | 见下 |

### 3.3 求解器是否已正确连续求解 —— 直接调用 `computeSpreadLayout` 验证

对 `two-choices`（`grid: {cols:3, rows:3}`）逐视口反解两条约束：

| 视口 | 宽度约束允许的 cardW | 高度约束允许的 cardW | 谁占优 | boardW / availW |
|---|---:|---:|---|---:|
| 360×800 | 94 | 96 | **宽度** | **100%** |
| 1024×768 | 279 | 91 | 高度 | 72% |
| 1440×900 | 395 | 111 | 高度 | 62% |
| 1920×1080 | **531** | **139** | 高度 | 58% |

结论明确：**求解器没有问题。**

- 手机上宽度约束占优，牌阵铺满 100% 可用宽度 —— 这正是「连续求解」应有的行为。
- 桌面上高度约束以 **3.8 倍的差距**碾压宽度约束（1920：531 vs 139）。
  把牌放大到宽度允许的尺寸会直接突破高度约束，底部整行被容器裁掉。
- 求解器已有的 `slackRatio`（列间距最多拉开 2.2×，上限是为了不让牌阵「散开到读不出是一个牌阵」）
  已经把横向富余用到接近上限，但**间距变宽不等于牌变大**。

**唯一的杠杆是在宽屏改变牌阵的行列几何**（3 行 → 1~2 行）。那是重新设计牌阵布局，
不是调 token、不是修 bug，而且 D1 §29 开放问题 #5 明确把它列为**需要产品决策的互斥选择**：
「桌面横向空间给谁 —— 牌阵放大，还是『牌 + 解读』分栏？两条路互斥。」

### 3.4 结论

# D2-07 → DEFER TO D3

**理由**：
1. 现有 `spreadLayout` 已经是正确的连续求解，且已用尽横向富余（到设计上限）。
   为把 PARTIAL 改成 DONE 而重构它，是无意义重构 —— 本轮不做。
2. 剩余差距不是缺陷，是**几何约束 + 一个未决的产品选择**：牌阵在宽屏上要不要换行列布局。
   这个选择与「牌 + 解读分栏」互斥，必须先有产品决策再动代码。
3. 1024 的 −3px 有确定的几何解释（768 < 800 的视口高度），不构成需要修复的 UI 缺陷。

**唯一需要更正的是文档**：D2 报告原写「反常已消除，不再小于手机」，与实测不符
（d1024=100 仍 < m360=103）。已在 `25-d2-product-polish-implementation.md` §1 / §5 更正 ——
D1 刚把「文案与事实相反」判为 MUST FIX，报告本身不能犯同类错误。

---

## 4. Follow-up P0 复验（真实 E2E，未重构）

完整链路，一步未跳，真实 DeepSeek：

```
Question → Deck → Spread → Focus → Shuffle(8 次手势) → Cut → Draw(5/5 拖拽落位)
        → Reveal(5/5 翻开) → Reading → Follow-up 1 → Follow-up 2
```

| 项 | 结果 |
|---|---|
| 解读 | ✅ **48.1s / 536 字**，真实 DeepSeek |
| 追问 1 | ✅ **有输出** · `followUps` 0→2 · 正文 536 → **934 字** |
| 追问 2 | ✅ **有输出** · `followUps` 2→4 · 正文 934 → **1316 字** |
| 两次都真实请求 DeepSeek | ✅ 网络取证：`/api/tarot/followup` **2 次** |
| 是否重新抽牌 / 重新解读 | ✅ **否** —— `/api/tarot/reading` 请求 **0 次** |
| cards 不变 | ✅ `placements` 5 个 `deckIndex`（38/40/41/43/37）逐字节不变 |
| orientation 不变 | ✅ session 指纹逐字节相同；回答中逐张点名正逆位 |
| Reading Session 不变 | ✅ `id` = `ses_mticz5ji_af8e83e98528` 全程不变；`deckId`/`spreadId`/`question` 不变 |
| 是当前 Reading 的延伸 | ✅ 见下 |

**session 指纹比对**（追问前 vs 追问后）：`✅ 逐字节不变`

**回答内容取证**（追问 2：「如果我先不做决定，只是再观察一个月呢？」）：

> 可以先观察，而且**现状**的**宝剑国王正位**本身就支持你用理性暂时按住选择……
> 而**权杖四逆位**在 **A 结果**格已经暗示，如果只是观望而不做任何调整……
> 与此同时，**节制正位**在 **B 结果**格给了一个更实际的用法：把这一个月当成主动的配比实验……

回答逐张点名了**牌名 + 正逆位 + 牌位**，且与本次抽到的 5 张完全对应 ——
这不是通用回答，是这一副牌的延伸。UI 文案也如实承诺：「牌不会变，也不会重抽。」

**结论：通过。保持现有实现，不做任何重构。**

---

## 5. Deck Library 状态

实拍 `/decks`（m390 与 d1440 各一次，全页截图）：

| 检查项 | m390 | d1440 |
|---|---|---|
| `DEV FIXTURE` | **0** | **0** |
| `NOT REAL ARTWORK` | **0** | **0** |
| 「素材未提供」 | **0** | **0** |
| 「封面未提供」 | **0** | **0** |
| 「素材备齐后开放」 | **0** | **0** |
| 「插画还在制作中」/「现行牌组」 | **0** | **0** |
| `0/78` | **0** | **0** |
| 牌组数 | **5**（月光·古典·森语·星图·幽影） | **5** |
| 可见图片 / 加载失败 | 25 / **0** | 25 / **0** |
| 页面高度 | 2339px（2.8 屏） | 2263px（2.5 屏） |
| console error | 无 | 无 |

图片路径样本证明用的是**真实 Artwork**，不是程序化兜底：

```
/assets/decks/legacy-moonlight/thumbs/major-00.webp
/assets/decks/legacy-classic/thumbs/major-01.webp
```

截图：`qa/product-polish/d2/recover-decks-{m390,d1440}.png`

---

## 6. Reveal / Reading Artwork Sizing

- **Reading 桌面牌条不再固定 62px**：实测 62 / 62 / 74 / 82 / 95 / **110** px 连续。
  报告所称「1920 上约 110px」**真实存在**（实测 110px，与报告一致）。
- **Reveal Artwork 是第一视觉层**：1920 实拍原画题字带与罗马数字完整可读，牌面无 UI 遮罩。
- **Label 不压原画标题**：`TarotCardFace.tsx:195` 的 `showName && !bakedText` 使五套烘焙文字的
  牌组不再绘制中文名遮罩层；渐变遮罩随之消失。
- **正逆位与牌位在 UI context layer**：`RevealPage.tsx:173` caption 渲染 `${pos.label} · 逆位`，
  实拍可见「A 结果 · 逆位」「B 方向发展」「现状」，全部在牌外。

---

## 7. Card Labels

| 检查项 | 状态 | 证据 |
|---|---|---|
| 原画英文 title 不再被第二层英文重复覆盖 | ✅ | 1920 实拍 `Nine of Pentacles` / `Nine of Cups` / `Three of Pentacles` / `TEMPERANCE` / `JUDGEMENT` 清晰可读，牌上无任何 UI 文字 |
| 中文名仍可见 | ✅ | `CardMeaningSheet.tsx:52` `<h3>{card.nameZh}</h3>`，翻牌后面板第一层就是中文名 |
| orientation 可见 | ✅ | 三处：牌缘色带 + 倒置箭头（`TarotCardFace.tsx:164`）、牌外 caption「… · 逆位」、面板「正位/逆位」（`CardMeaningSheet.tsx:55`） |
| position 可见 | ✅ | 牌下 caption（`RevealPage.tsx:173`），实拍「现状」「A 方向发展」「A 结果」「B 方向发展」「B 结果」 |
| 判定不是 deckId 前缀猜测 | ✅ | `artworkHasBakedText()` 查 `DECKS_WITH_BAKED_TEXT`（`production.generated.ts:26`），未来无烘焙文字的第六套仍会正常画中文名 |

---

## 8. Follow-up 实现状态

- ✅ **不再使用 legacy 无输出 branch**：`FollowUpSection` 在结构化路径（`:251`）与 legacy 路径（`:321`）
  两处都挂载，`session.structuredReading` 存在与否都能渲染。
- ✅ **当前 structured reading 路径正常**：本轮 E2E 走的正是结构化路径，两次追问都渲染出来了。
- ✅ **单轮 / 无累积在类型层落死**：`FollowUpRequest`（`src/types/reading.ts:390`）**没有 history 字段**，
  `buildFollowUpMessages` 入参也没有 —— 结构上拼不出多轮上下文。
- ✅ **AC-V2-15 与 Scope 表已同步改写**（`docs/v2/10-product-scope.md:48` / `:215`），文档与代码一致。

---

## 9. Tests（本轮重跑，真实数字）

| Check | 结果 |
|---|---|
| `engine:check` | ✅ **64 / 64** |
| `deck:check` | ✅ **338 / 338** |
| `layout:check` | ✅ **119 / 119** |
| `artwork:check` | ✅ **89 / 89** |
| `reading:check` | ✅ **118 / 118** |
| **合计** | ✅ **728 / 728，0 失败** |
| `tsc -b`（app） | ✅ 0 error |
| `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ **0 error**（6 条 `react/only-export-components` warning 为既有，非本轮引入） |
| `npm run build` | ✅ 通过（dist 产出完整） |

**没有删除、跳过或放宽任何断言。** 728 与 D2 收尾时完全一致。

---

## 10. Git Diff Summary

未提交改动全部保留，与 D2 报告 §10 一致：

```
产品代码（src/ + server/）    19 文件   +577 / −138
docs/v2/10-product-scope.md    1 文件   +21 / −5  （AC-V2-15 改写）
scripts/（artwork/deck check） 2 文件   +349 / −16（C4.1 遗留，非本轮）
新增未跟踪：
  server/api/followUpRoute.ts            157 行
  server/prompts/followUpPrompt.ts       105 行
  src/features/reading/followUpClient.ts 100 行
  src/features/reading/FollowUpSection.tsx 115 行
  docs/v2/24-d1-...md / 25-d2-...md / 26-d2-recovery-closure.md（本文件）
```

**本轮唯一的代码写入是 QA 驱动脚本（dev-only，不进 build、不被产品代码 import）：**

| 文件 | 改动 | 原因 |
|---|---|---|
| `qa/product-polish/walkthrough.mjs` | playwright-core 路径由硬编码改为候选探测 + `PW_CORE` 覆盖 | 见 §11 |
| `qa/product-polish/_journey.mjs` | 追问段增加 session 指纹与网络取证输出 | 为 §4 提供证据，未改动流程 |
| `qa/product-polish/_d2verify_decks.mjs` | 新增 | §5 取证 |
| `qa/product-polish/_d2verify_sizing.mjs` | 新增 | §3 取证 |

**产品代码本轮零改动。**

---

## 11. Environment Issue（非产品 Bug）

### `command not found: compdef`

**根因已定位，与 Arcana 无关：**

`~/.zshrc` 第 5 行 `source /Users/wangyijie/.openclaw/completions/openclaw.zsh`，
而该文件第 3869 行调用 `compdef _openclaw_root_completion openclaw`。
`~/.zshrc` 里**没有 `autoload -Uz compinit && compinit`** ——
`compdef` 是 compinit 注册的函数，没跑 compinit 它就不存在。

**影响面：零。** 实测全部可用：

```
node v25.8.0 · npm 11.11.0 · npx · vite 8.2.0
npm run dev / build / lint / 5 个 check 套件 / playwright 驱动系统 Chrome —— 全部正常
```

Arcana 仓库内 **0 处**引用 `compdef`（已 grep 全仓）。

**标记为 ENVIRONMENT ISSUE，未修改任何 Arcana 代码去迁就它。**
如需消除，是在 `~/.zshrc` 的 source 之前加一行 `autoload -Uz compinit && compinit` ——
那是用户 shell 配置，本轮未擅自改动。

### 附带修复：QA 脚本的 playwright 路径

`walkthrough.mjs` 原本硬编码上一会话 scratchpad 里的 playwright-core 路径。
scratchpad 随会话销毁，会话重启后该路径失效，所有 QA 脚本直接 `ERR_MODULE_NOT_FOUND`。
已改为按候选顺序探测并支持 `PW_CORE` 覆盖 —— 这是 QA 基础设施修复，不是产品改动。

---

## 12. Remaining D3 Items

### 从 D2-07 继承的明确议题（需产品决策）

1. **宽屏牌阵几何**：3 行网格在 1920 上只用掉 58% 宽度、牌宽被高度约束压在 152px。
   要显著变大必须改行列布局。**与「牌 + 解读分栏」互斥**，两条路必须选一条（D1 §29 开放问题 #5）。

### D1 SHOULD POLISH 未做项（13 项中 10 项仍在）

| 项 | 备注 |
|---|---|
| 桌面 CardMeaningSheet 面板 95% 空白 | |
| 翻牌后面板自动弹出、压缩牌桌 | |
| CardMeaningSheet 未使用牌位信息 | |
| **Reading 顶部牌条右侧裁切** | **本轮已复验**：360×800 出现，390×844 干净。牌宽 62px 与 before 相同 → **不是 D2 regression**，是 D1 SHOULD POLISH #6 的既有问题 |
| Journal 无 Deck identity / 无绝对日期 | |
| 深度解读 131s 无进度反馈 | |
| Cut 页三段连续 CTA | |
| Settings「自由桌面（即将推出）」残留 | |
| touch target <44px（首页 牌组/设置 27px） | |
| 错误态标题与正文语义重复 | |
| `major-17` style-drift 返修 | DEFER TO ARTWORK MICRO-POLISH |

### D2 报告 §15 遗留、本轮已消解的

- ~~「Reading 第 5 张牌裁切未复验」~~ → **已复验**，见上，非 regression。
- 仍未验：日记详情页是否渲染追问；追问的 rate limit 压测。

---

## READY FOR PHASE D3 RELEASE POLISH?

# YES

- **8 项 MUST FIX 全部在盘上**，7 项 DONE 逐条取证确认，**一项未丢失、未被覆盖**
- **P0 = 0**：追问真实 E2E 通过 —— 两次真实 DeepSeek 请求、两次都有新输出、
  `/api/tarot/reading` 请求 0 次、session 指纹逐字节不变、回答逐张点名牌与正逆位
- **唯一 PARTIAL（D2-07）判定为合理 defer**：求解器已正确连续求解并用尽横向富余，
  剩余差距是几何约束加一个未决的产品选择，重构它属于无意义重构 —— **DEFER TO D3**
- **728/728 断言通过**，未删改任何断言；0 typecheck error、0 lint error、build 通过
- **产品代码本轮零改动**，只修了 QA 驱动脚本的失效路径并补了取证输出

一处需要你知情：D2 报告原写「1024 反常已消除，不再小于手机」与实测不符
（d1024=100px 仍 < m360=103px），**已更正**。差距有确定的几何解释（768 < 800 的视口高度），
不构成需要修复的缺陷，但报告不该那样写。
