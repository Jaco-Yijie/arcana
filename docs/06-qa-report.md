# Arcana — QA / Product Review 报告（Agent 7 输出）

> 审查对象：`/Users/wangyijie/arcana` · 审查依据：`00-brief.md` / `01-product-spec.md`（AC-01~15、G-01~24）/ `02-ux-spec.md` / `04-interaction-spec.md`
> 审查者身份：独立 QA，不改任何源码。本文件是本次审查唯一产出。
> 所有结论均可追到 `文件:行号`。自动化输出为真实运行结果，未做任何修饰。

---

## 1. 结论摘要

**可以交付，但需先修 1 个 P0。**

核心产品价值（「这是我自己抽出来的牌」）在代码层是**成立**的，而且成立得很扎实：牌序在 `startSession` 一次性冻结，抽牌是纯查表，用户手势真实进入 PRNG seed，全站没有任何一处「偷偷替用户抽牌」的痕迹。引擎自检 64 项断言全过，类型与构建均通过。G-01~G-22 全部通过。

最严重的 3 个问题：

1. **P0 — 日记不是自动保存，是手动点按钮保存**（AC-09 / G-23 直接违反）。用户翻完牌、看完解读，只要不点「存入日记」就走人，`/journal` 里什么都没有。G-23 原文即「日记需要用户手动点『保存』才写入」= 打回重做。
2. **P1 — 摊牌区惯性滚动期间会误抽牌**。用户甩一下扇形，想按住停下来 —— 这一按就把牌抽走了。UX Spec §6.3 明文要求「fling 惯性滚动期间禁用抽牌，需先 tap 停下」，未实现。这是最容易在真机上让用户炸毛的交互。
3. **P1 — 追问对「第二张牌」这类序号指代不是答不出，是自信地答错**。实测四种问法全部落到兜底分支，且兜底文案会断言「最能回应你这个追问的可能是『过去』上的正位圣杯皇后」—— 永远答第 1 张。

另有 1 个我判定为**真问题**的视觉缺陷（小阿卡纳 56 张只有 11 种可分辨牌面，见 P2-5），以及 7 项 P2。

---

## 2. 自动化验证结果（真实输出）

| 命令 | 结果 | 摘要 |
|---|---|---|
| `npm run engine:check` | **全部通过** | 64 项断言，0 失败。覆盖洗牌合法排列/手势顺序敏感/12 次洗牌后 75/78 张换位、切牌 AC-03 原文用例（P=20 vs P=50）、cutIndex 随 ratio 单调、`cardAt` 7800 次调用恒定、entropy digest 逐次变化、扇形布局最小露出 28.0px、端到端会话恢复牌序不变 |
| `npx tsc -b --noEmit` | **通过** | 退出码 0，零错误 |
| `npm run build` | **通过** | `dist/assets/index-DHnyp84U.js 570.30 kB (gzip 189.31 kB)`、CSS 38.88 kB。⚠️ Vite 警告单 chunk >500 kB |
| `npx oxlint` | 4 条 warning | 全部为 `react(only-export-components)`（Fast Refresh 提示），非功能性 |

**QA 自建探针**（临时脚本，运行后已删除）：
- 扫描 78 张牌义数据 + 5 个牌阵数据 + **900 份生成的 Reading**（5 牌阵 × 30 seed × 6 类问题，含高风险问法）+ 7 类 Follow-up 回答 → `FORBIDDEN_PHRASES` 17 个禁语**零命中**。
- `answerFollowUp` 序号指代实测 → 4/4 答错（详见 P1-3）。
- 数据完整性：`allCards.length === 78`，唯一 id 78；`spreads.length === 5`（1/3/3/5/5 张）。

---

## 3. Product QA — G-01 ~ G-24 逐条

| 编号 | 结论 | 证据 | 备注 |
|---|---|---|---|
| G-01 点击后才 random | ✅ 通过 | 全站 `Math.random` 仅 3 处：`engine/rng.ts:113`（createSeed 降级）、`utils/audio.ts:33`（噪声波形）、`utils/id.ts:6`（id 降级）。无一在牌面决定链上。`engine/deck.ts:64-70` `cardAt` 纯查表 | `scripts/engine-selfcheck.ts:358-372` 内建静态断言 |
| G-02 Hidden Deck 中途重生成 | ✅ 通过 | `buildHiddenDeck` **唯一**调用点 `store/SessionContext.tsx:138`，位于 `startSession` 内；`shuffle.ts` / `cut.ts` 只做置换 | `createSeed` 唯一调用点 `SessionContext.tsx:120`，同样只在 startSession |
| G-03 洗牌是一个按钮 | ✅ 通过 | `pages/ShufflePage.tsx` 无任何跳过/一键入口；`ShuffleStack.tsx:50-82` 唯一改变牌序的入口是 pointer 手势；`shuffle.ts:185-195` 无效手势原样返回 `applied:false` | 「洗好了」在 `shuffleCount>0` 才渲染（ShufflePage:61） |
| G-04 自动/随机/默认切点 | ✅ 通过 | `cut.ts:48` `ratio` 必填无默认值；`CutPage.tsx:23` `ratio` 初始 `null`，`:48-69` 未选前 CTA 不渲染；`CutStack.tsx:58` 指示线停中点但 opacity 0.5 且显式标注「还没有选择切点」 | |
| G-05 摊牌泄露牌面 | ✅ 通过 | `FanSpread.tsx:238-240` 只渲染 `<CardBack simplified/>`；`key={l.index}`；`CardBack.tsx` 不接受任何与牌面相关的入参（仅 `simplified`/`className`） | 见 AC-07 详述 |
| G-06 自动飞入/点击即落位 | ✅ 通过 | `DrawTable.tsx:177` `if (!prev.started) return`，`started` 需 pointermove 累计 ≥ `DRAG_THRESHOLD` 6px；吸附只做 `scale 1.06` + 描边（:217、:245-249），卡牌本身不位移 | |
| G-07 全部翻开/倒计时 | ✅ 通过 | 全站检索无「全部翻开」；`RevealPage.tsx` 无定时翻牌，`:38` 的 timeout 只控制 CTA 出现 | |
| G-08 爆炸粒子/强震 | ✅ 通过 | `FlipCard.tsx:99-107` 动画只有 `rotateY` + `scale 1.08`；`hooks/useFeedback.ts:7-12` haptic 最大 12ms / `[8,30,10]` | |
| G-09 已翻开可替换 | ✅ 通过 | 三处拦截：`SessionContext.tsx:231`（placeCard）、`:250`（liftCard）、`DrawTable.tsx:103-106`（snapshotZones 过滤已翻开牌位） | |
| G-10 换牌弹 Confirm | ✅ 通过 | 全站 `confirm(` / `alert(` 零命中；`DrawTable.tsx:180-183` 拖出牌位直接 onLift | |
| G-11 AI 自动弹解读 | ✅ 通过 | `RevealPage.tsx:33-40` 全部翻开后 600ms 才出现 CTA，无跳转；`:105` 条件渲染 | |
| G-12 AI 参与抽牌 | ✅ 通过 | `data/spreads.ts:225 recommendSpreads` 只读 question 关键词 + mode，不接触 deck；`mockReading.ts:188 generateReading` 只接收已翻开结果 | |
| G-13 Follow-up 变通用 Chatbot | ✅ 通过 | `followUp.ts:22-34` `FollowUpContext` 类型上只有 question/spreadId/cards/reading 四字段；`buildReadingInput.ts:42-50` 是唯一组装点；reading 模块从未 import `journalStore` | `OFF_TOPIC_PATTERNS`（:58-65）把越界追问拉回语境 |
| G-14 宿命论/确定性预测 | ✅ 通过 | 实测 900 份 Reading + 静态数据 + Follow-up 全部零命中禁语；`safety.ts:79` 四类关键词 → `mockReading.ts:217,280,480,524` soften 分支 | |
| G-15 首页 Dashboard / 沉浸区留导航 | ✅ 通过 | `HomePage.tsx:75-93` 仅两个主入口 + `:96-103` 三个页脚弱链接；`ImmersiveShell.tsx` 只渲染「退出 + 四点进度 + 计数」 | |
| G-16 新增牌阵/牌组 | ✅ 通过 | 实测 `spreads.length === 5`、`allCards.length === 78`、`deckId: 'dreamlike'` 单套（SessionContext:133） | |
| G-17 真 API/云/登录/付费 | ✅ 通过 | 依赖仅 react / react-dom / react-router-dom / framer-motion；全站 `fetch(` `axios` `XMLHttpRequest` 零命中 | |
| G-18 廉价玄学/抽卡 UI | ✅ 倾向通过 | `Button.tsx:44-49` primary 是描边式而非高饱和实心块；色板全部 oklch 低 chroma（≤0.058）；`CardBack.tsx` 纯 SVG 星轨 | 最终判定属 Gate 4，需人眼确认 |
| G-19 逻辑塞进 App.tsx / 分层 | ✅ 通过 | `App.tsx` 52 行纯路由装配；九层目录齐全；Tarot Table 独立成 `features/table/{engine,components}` | 详见 §6 |
| G-20 依赖 hover | ✅ 通过 | 全部交互走 Pointer Events；`hover:` 类仅出现在 Button / AppShell 的亮度与描边变化，无功能依赖 | |
| G-21 entropy 只存不用 | ✅ 通过 | `shuffle.ts:208-219` 把 `nextEntropy.digest` 直接混入 PRNG seed；`cut.ts:66` digest 参与 drift。自检 §6 九项，含「仅 entropy 历史相差 1px → 得到不同牌序」 | |
| G-22 恢复后牌序改变 | ✅ 通过 | 自检 §8 五项：恢复后牌序、已抽牌、digest 全部不变；`SessionContext.tsx:107-117` 每次变更同步 persist | |
| G-23 日记需手动保存 | ❌ **不通过** | `upsertEntry` 唯一调用点 `SessionContext.tsx:299`（completeSession 内）；`completeSession` 唯一调用点 `ReadingPage.tsx:84`，由 `:101` 「存入日记」和 `:199` 「完成并存入日记」两个按钮触发 | **见 P0-1** |
| G-24 分享默认暴露隐私 | ✅ 通过 | `SharePage.tsx:21` `showQuestion` 默认 `false`；`:42-51` 拼装文案不含 note/mood/outcome；`:90` 原问题条件渲染；仅用 `navigator.clipboard`，无社交 SDK | |

**23/24 通过，1 条红线不通过（G-23）。**

---

## 4. Functional QA — AC-01 ~ AC-15 逐条

| 编号 | 结论 | 证据 / 说明 |
|---|---|---|
| AC-01 不得点击后现场抽牌 | ✅ 通过 | 自检 §5 五项（同 index 重复 100 次恒定、78×100=7800 次全恒定、任意点选顺序结果不变）+ `deck.ts:64` `cardAt` 纯查表 + `FanSpread` 只回调 `deckIndex`（:26 注释明确「不是一张牌」） |
| AC-02 洗牌必须用户操作 | ✅ 通过 | `MIN_SHUFFLE_DISTANCE = 24`（shuffle.ts:32）；未达阈值 `applied:false` 原样返回；`shuffle.ts:250-253` 兜底保证洗过一定变；无跳过入口 |
| AC-03 切牌位置由用户决定 | ✅ 通过 | 自检 §4 八项，含 AC-03 原文用例 P=20 → cutIndex 19、P=50 → cutIndex 49，牌序不同；101 个 ratio 覆盖出 71 个可分辨切点 |
| AC-04 摆牌必须拖动 | ✅ 通过 | `DrawTable.tsx:140-141` 需累计位移 ≥6px 才 `started`；`:177` 未 started 直接 return。仅点击永远无法落位 |
| AC-05 翻牌必须用户触发 | ✅ 通过 | `FlipCard.tsx:67-77` 仅 tap（<8px & <400ms）或上滑 ≥32px；`RevealPage.tsx:48-53` 翻转期 520ms 锁其余牌；无「全部翻开」/倒计时 |
| AC-06 未翻可换、翻开锁定 | ✅ 通过 | `SessionContext.tsx:245-258 liftCard` 判 `revealed` 直接 return；`:226-243 placeCard` 判目标位 revealed；全程零弹窗 |
| AC-07 抽牌前不泄露牌面 | ✅ 通过 | `FanSpread` / `DrawTable` 未翻开态**只**渲染 `CardBack`；`CardBack.tsx` 结构上不接受牌面入参；全站 `data-*` 零命中，`aria-label` 仅「牌背」「翻开这张牌」「收起」；`FlipCard.tsx:12` `SWAP_MS=260 < FLIP_MS=520`，翻到一半才换面，无动画残影泄露 |
| AC-08 Session 可恢复 | ✅ 通过 | `HomePage.tsx:44-65` 提示 + 继续/重新开始，且写明问题·牌阵·进度；`STAGE_ROUTE` 精确回到中断步骤；自检 §8 验证牌序与已抽牌不变；「重新开始」→ `discardSession` → 下次 `startSession` 生成全新 deck |
| AC-09 日记自动保存 | ❌ **不通过** | 见 P0-1。用户不点按钮则 `/journal` 无记录。（日记的**详情/补充**部分实现正确：`JournalDetailPage.tsx:14,36` 失焦即存，无保存按钮） |
| AC-10 AI 不抢先发言 | ✅ 通过 | `RevealPage.tsx:33-40` 全部翻开后 600ms 才渲染 CTA，不跳转；`ReadingPage.tsx:133-179` 仅 headline 常驻，其余五块全是 `Accordion` 默认 `open=false` |
| AC-11 理性分析型语气 | ✅ 通过 | 实测 900 份 Reading + 78 张牌义 + 5 个牌阵 + 7 类 Follow-up，17 个禁语零命中；高风险自动 soften |
| AC-12 Follow-up Context 受限 | ✅ 通过 | 类型级封闭（followUp.ts:22-34），越界问题走 `:101-103` 拉回本次抽牌。序号指代答错属质量缺陷（P1-3），不构成 AC-12 失败 |
| AC-13 引导第二次弱化 | ⚠️ **部分通过** | 洗/切/翻三步经 `StepHint` 完整实现两档（600ms vs 3500ms、呼吸、字号与透明度差异）；**抽/摆两句未走 StepHint**，只换措辞不换呈现（见 P2-8）。Settings 可重开 ✓（`SettingsPage.tsx:59 resetGuidance`） |
| AC-14 分享默认隐私 | ✅ 通过 | 同 G-24 |
| AC-15 移动端可用 | ⚠️ **需人工验证** | 代码层未发现阻断：无横向溢出、无 hover-only、`100dvh`、safe-area 全覆盖；自检 §7 在 375×667 下验证扇形数学。但扇形专属可点带仅 28px（P1-4），真实手指命中率必须真机确认 |

**12 通过 / 1 不通过 / 2 部分或需人工。**

---

## 5. UX QA

### 5.1 操作死路 — 未发现

每条路由都有回退边：`AppShell` 次要页统一带 `back`；沉浸区由 `ImmersiveShell` 的「退出」保底（Session 已持久化，退出不丢数据）；`/table/cut:111` 有「重新洗牌」、`/table/draw:106` 有「重新切牌」、`/reading:96` 有「看牌阵」回 `/table/reveal`；所有页面守卫失败统一 `<Navigate to="/" replace/>`；`App.tsx:46` 有 `*` 兜底路由。

一处**刻意的单向门**：`/table/draw` 一旦拿起或摆下第一张牌，「重新切牌」即消失（`DrawPage.tsx:102-103`），此后只能退出。判定为**符合产品调性的设计决策**（结果不可逆性），非缺陷。

### 5.2 沉浸区按钮数量 — 全部符合 §7 硬约束

| 页面 | 上限 | 实际 | 判定 |
|---|---|---|---|
| `/focus` | 3 | 返回/退出专注 + 直接开始/我准备好了 + 专注一下 = 3 | ✅ |
| `/table/shuffle` | 2 | 退出 +（洗过才有）洗好了 = 1~2 | ✅ |
| `/table/cut` | 3 | 退出 + 阶段 CTA + 重新洗牌（split/done 阶段隐藏）= 2~3 | ✅ |
| `/table/draw` | 2 | 退出 +（去翻牌 ⊕ 重新切牌）= 2 | ✅ |
| `/table/reveal` | 2 | 退出 + 开始完整解读 = 1~2 | ✅ |

### 5.3 主 CTA「条件未满足时不渲染」— 符合

`ShufflePage:61`（shuffleCount>0）、`CutPage:48-69`（phase 驱动，unset 时为 null）、`DrawPage:83`（boardFull）、`RevealPage:105`（allRevealed && ctaReady）—— 全部是**条件渲染**，不是 disabled 灰按钮。

两处 `disabled` 例外，均可接受：
- `ShufflePage.tsx:71 disabled={cooldown}` —— 200ms 手势后冷却，UX Spec §6.3 明文要求。
- `QuestionPage.tsx:102 disabled={!canContinue}` —— **不在沉浸区**（§7 规则 1 的约束范围是 `/focus` + `/table/*`）。规则上合规，但从一致性看建议同样改为条件渲染。

### 5.4 手势冲突四道防线 — 全部落地

| 防线 | 状态 | 证据 |
|---|---|---|
| 1 消灭页面滚动 | ✅ | `ImmersiveShell.tsx:47-48` `fixed inset-0` + `height:100dvh` + `overflow-hidden` + `overscrollBehavior:'none'` |
| 2 空间分离 | ✅ | `DrawTable.tsx:194` Board 288 / `:260` Hand 96 / `:280` Fan flex-1，三区不重叠 |
| 3 轴锁定 + 12px 死区 | ✅ | `FanSpread.tsx:12 DEAD_ZONE=12`、`:163-168` 与规范伪码逐行一致，含「向下滑一律判 scroll」，intent 锁定至 pointerup |
| 4 Pointer capture | ✅ | `components/pointer.ts` 统一封装，且做了 `try/catch` 静默降级（防 NotFoundError 导致「按下去没反应」） |

`touch-action`：Fan 区用 `touch-action:none`（FanSpread:215）而非规范写的 `pan-x` —— **更严格且合理**（两轴均自行处理）。Hand 区 `touch-none`（DrawTable:268）。Board 区拖拽包裹层本身未写 touch-action，但其子元素 `CardFrame` 携带 `.table-surface`（`theme.css:314-321` 含 `touch-action:none`），实际生效 —— **当前无缺陷，但属隐式依赖**，若日后移除 CardFrame 会静默失效，建议显式补上。

### 5.5 触控目标 ≥44×44

达标：`Button` md=44 / lg=52（Button.tsx:38-41）、`ImmersiveShell` 退出 44×44（:61）、`CutStack` 拖柄 44×44（:123）、`AppShell` back 44×44、Drop Zone 64×110。

不达标 3 处：
- **扇形牌专属命中带 28px**（见 P1-4）—— 唯一有实质影响的一处。
- `RevealPage.tsx:85` 用裸 `<div onClick>` 打开牌义 Sheet，无 `role`/键盘可达（尺寸 88×150 足够，属可访问性而非触控问题）。
- `SharePage.tsx:103` 原生 checkbox 20×20 —— 外层是 `<label>`（:98），实际热区达标。

### 5.6 新手引导两档

`StepHint.tsx` 实现**完整且正确**：`:28` 600ms vs 3500ms 延迟差、`:48` 呼吸用 framer 的 `opacity:[1,0.68,1]` keyframe（Guided）/ 固定 0.55（Faded）、`:56-59` 独立条 vs 纯文字、`:36` 首次有效操作后 `markGuidanceSeen` 落 localStorage。

缺口只在 `/table/draw` 的两句（P2-8）。

---

## 6. 代码质量

**良好项：**
- `App.tsx` 52 行纯装配，业务逻辑零残留（G-19 ✅）。
- 目录九层齐全：`components / features / pages / data / types / hooks / utils / store / styles`；Tarot Table 独立成 `features/table/{engine,components}`，engine 层零 React / 零 DOM / 零 localStorage 依赖，可被脚本直接测试 —— 这是本项目最值得肯定的架构决策。
- **全站零 `any`、零 `console.*`**（实测检索）。
- 逻辑文件全部 <400 行：`SessionContext.tsx` 360、`DrawTable.tsx` 309、`shuffle.ts` 256、`FanSpread.tsx` 248。超 400 行的 4 个文件中 3 个是**数据/自检脚本**（`minorArcana.ts` 1109、`majorArcana.ts` 783、`engine-selfcheck.ts` 546），合理。
- 注释质量高：几乎每个关键决策都写明了「为什么」而非「是什么」，且多处直接引用 AC/G 编号，对后续维护极有价值。

**问题项：**
- `CardArt.tsx` 554 行 —— 唯一一个超 400 行的**逻辑**文件，12 个 motif 渲染函数塞在一个 `MOTIFS` map 里。建议拆为 `card/motifs/*.tsx`。
- **死代码**：`SessionContext.tsx:217-224 returnCard`（定义并挂进 Context，无任何页面调用）、`journalStore.ts:45-50 deleteEntry`（零引用）。
- **注释与实现不符**：`CardArt.tsx:10,20` 声称「hue 只在 240°–272° 的窄色带内」，但数据层 hue 实为 32–288 的四花色分区，只是被 `makePalette` 压回窄带。会误导维护者（见 P2-5）。
- `FanSpread.tsx:218` 在 78 次循环内做 `takenIndexes.includes()`，O(n·m)。规模小无实害，改成 `Set` 更稳妥。
- 构建单 chunk 570 kB（gzip 189 kB），移动优先产品的首屏成本偏高。
- oxlint 4 条 `only-export-components` warning（Context 与常量和组件同文件），仅影响 HMR。

---

## 7. 问题清单

### P0 — 阻断

**P0-1 日记不是自动保存（AC-09 + G-23）**

- **现象**：用户翻完全部牌 → 进入 `/reading` → Reading 已生成 → 直接后退或关页面 → `/journal` 里没有这次记录。
- **根因**：`upsertEntry` 唯一调用点是 `store/SessionContext.tsx:299`，位于 `completeSession()` 内；`completeSession()` 唯一调用点是 `pages/ReadingPage.tsx:84`，只由 `:101` 「存入日记」与 `:199` 「完成并存入日记」两个按钮触发。这两个按钮**就是**「手动保存」按钮。
- **影响**：违反 AC-09 第一条 Given/When/Then，且正中 G-23（打回重做级红线）。同时也影响简报 §28 的最终交付标准末句「退出后能在塔罗日记看到记录」。
- **缓解**：数据没丢 —— active session 仍在 `arcana:active-session`，用户可从首页「继续」回到 `/reading` 再保存。所以是流程缺陷而非数据丢失。
- **建议改动**：在 `ReadingPage.tsx:46-51` 的生成 effect 里，`setReading(...)` 之后立刻 `upsertEntry`；更干净的做法是在 `SessionContext.tsx:273-276 setReading` 与 `:278-288 addFollowUp` 里各追加一次 `upsertEntry(next)`（幂等，按 id 覆盖）。「完成并存入日记」按钮保留，语义改为「结束这次抽牌」，只负责 `persist(null)` + 跳转。

### P1 — 应修

**P1-2 惯性滚动期间可误抽牌（UX Spec §6.3 未实现）**

- **现象**：在扇形上快速甩动产生惯性滚动，用户按住想让它停下 —— 这一按会把牌抽走。
- **根因**：`FanSpread.tsx:140` 的 `handlePointerDown` 调用了 `stopMomentum()`，但没有记录「这次 pointerdown 是用来停惯性的」。随后 `:191-201` 的 pointerup 只看 `dist<8 && duration<400` 就判 tap → `onPick`。
- **影响**：直接侵蚀「我选的就是这张」——用户抽到的是他没打算选的位置。§6.3 原文：「fling 惯性滚动期间**禁用抽牌，需先 tap 停下**」。
- **建议改动**：`FanSpread.tsx:139` 处记 `const wasMomentum = momentumRef.current !== null`，存进 `gesture.current`；`:194` 的判定加 `&& !g.wasMomentum`。约 3 行。

**P1-3 追问的序号指代会自信答错**

- **现象**（实测输出，牌阵为 过去=圣杯皇后/正、现在=权杖侍从/正、未来=宝剑三/逆）：
  - 「第二张和第三张牌是什么关系」→ 答「…可能是『**过去**』上的正位的圣杯皇后」
  - 「第二张牌是什么意思」/「中间那张牌呢」/「最后一张牌怎么解」→ **同样全部答第 1 张**
- **根因**：`followUp.ts:106` 的 `mentioned` 只按 `raw.includes(牌名)` 或 `raw.includes(牌位名)` 匹配，完全不认序号；四种问法全部落到 `:143` 的兜底分支，而兜底文案写死了 `entries[0]`。
- **影响**：「第二张牌是什么意思」是追问里最自然的问法之一。答不出来可以接受，**答错并且语气笃定**会直接摧毁解读的可信度。严重度高于一般 Mock 缺陷。
- **建议改动**：`followUp.ts:106` 之前加一段序号解析 —— `/第\s*([一二三四五12345])\s*张/g` 全局匹配 + 「最后一张」→ `entries.length-1`、「中间那张」→ `Math.floor(len/2)`、「第一张」→ 0，把命中的下标并入 `mentioned`。同时把 `:143` 兜底文案里的「最能回应你这个追问的可能是『X』上的…」改成不指名具体牌的措辞，避免解析失败时仍然笃定。

**P1-4 扇形牌专属可点宽度 28px，低于规范的 44px**

- **现象**：相邻牌的独占命中带只有 28px 宽，手指偏一点就选中隔壁那张。
- **根因**：`engine/fan.ts:18 MIN_EXPOSURE = 28`、`:103` `step` 下限即 28；命中靠 `hitTestFan`（:167）取 zIndex 最高者，因此每张牌的**独占**区就是 step。UX Spec §6.4 要求「hit area 用一个 **44**×130 的透明层」，实现没有独立 hit 层。
- **影响**：`scripts/engine-selfcheck.ts` 的断言写的也是「≥28px」，即**自检基线本身就低于规范**，这条不会被现有自动化发现。而「点到的是不是我想要的那张」正是本产品的核心体验。
- **建议改动**：最省事是把 `MIN_EXPOSURE` 提到 44（代价：扇形总宽从 2280px 涨到 ~3500px，需多滚几下，可接受）；或按规范在每张牌上叠一个 44×130 的透明 hit 层并让 hitTest 用它。同时把自检断言同步改为 ≥44。

### P2 — 可延后

**P2-5 小阿卡纳 Placeholder 牌面几乎无差别 —— 我判定为真问题，不是「符合 §21」**

- **量化根因**：`CardArt.tsx:44-45` `const norm = hue/360; const h = 240 + norm*32`。数据层本来有 4 个分得很开的花色色带（权杖 32–45 / 宝剑 205–214 / 圣杯 246–254 / 星币 281–288），全部被压进 240–272。压缩后**同一花色内 14 张牌的最终色相跨度**：权杖 **1.16°**、宝剑 0.80°、圣杯 0.71°、星币 0.80° —— 在 chroma 0.038–0.050 下完全不可见。
- **更关键的一层**：`MOTIFS` 的渲染函数只吃 `{ p, sig, uid }`（`CardArt.tsx:473-477、533`），**根本不吃 hue**；唯一用到 hue 派生随机的 `SignatureLayer`（:91、:530）只在 `tier === 'signature'` 时渲染，而 **56 张小阿卡纳全部是 `placeholder`**。
- **净结果**：**56 张小阿卡纳只有 11 种可分辨的牌面**（motif 分布：seed 8、path 7、gate 7、flame 6、tide 5、threshold 5、orbit 5、mirror 5、veil 4、sun 3、moon 1）。三张牌阵抽中两张同 motif 的概率不低，用户会直接判断「这两张牌一模一样，是不是坏了」。
- **我的判断**：简报 §21 要的是「统一风格的 Placeholder」——统一的是**视觉语言**（夜空/地平线/银发丝线/单光源），不是**同一张画面**。当前状态越过了这条线。
- **最小改动建议**（不需要画 78 张插画）：① 把 `hue` 加进 `MotifCtx`；② 每个 motif 用 `hue` 派生 1–2 个**结构**参数（元素个数 / 倾角 / 光源 x 位置），而不只是颜色；③ 让 placeholder 也画一层弱化的 `SignatureLayer`（透明度减半）。这样同 motif 的牌在构图上就能分辨，设计语言的统一性完全不受影响。改动集中在 `CardArt.tsx` 的 ctx 类型 + 各 motif 内一两个常量。顺手修掉 `:10,20` 的错误注释。

**P2-6 可同时「手持两张牌」的状态漏洞**
`DrawTable.tsx:226-228` 从 Board 拖起已摆的牌时只判 `!placed.revealed`，不判 `handIndex`。持牌时把已摆的牌拖出并落空 → `SessionContext.tsx:254` 把它 push 进 `drawn`，`drawn` 变 2 条，而 `DrawPage.tsx:28` 只渲染最后一张，先前那张暂时「消失」。放下当前这张后会重新出现，**不会永久丢牌**，但与 `SessionContext.tsx:33` 注释「MVP 同时只允许 1 张」矛盾。建议：`beginDrag` 的 zone 分支加 `handIndex === null` 前置条件。

**P2-7 覆盖式换牌无任何反馈**
把手牌拖到已被占用（未翻开）的牌位时，`SessionContext.tsx:232-235` 把原来那张从 `placements` 剔除且**不放回 `drawn`** —— 它静默回到牌堆、重新出现在扇形里。行为本身符合「换牌」语义，但零提示，用户会以为牌被吞了。建议加一次 `feedback.tap()` + 被替换的牌回到扇形时短暂高亮。

**P2-8 `/table/draw` 两句引导未走 StepHint 两档**（AC-13 部分缺口）
`DrawPage.tsx:38-46` 用纯三元切换措辞（「慢慢浏览，选择你想拿起的牌。」↔「从牌堆里选一张」），缺少 §5.2 规定的 600ms vs 3.5s 延迟、呼吸、透明度 0.55 / 字号 13 的**呈现**差异。洗/切/翻三句都正确走了 `StepHint`。建议 Hand 区文案改用 `StepHint`。

**P2-9 摆满后取回会丢失扇形滚动位置**
`DrawTable.tsx:281` 在 `boardFull` 时整个卸载 `FanSpread`；取回一张后重新挂载，`FanSpread.tsx:89-92` 的 effect 把 `scrollOffset` 重置到中点。换牌时用户要重新滚回原处。建议改为 `visibility` 隐藏而非卸载。

**P2-10 死代码**：`SessionContext.tsx:217-224 returnCard`（零调用）、`journalStore.ts:45-50 deleteEntry`（零引用）。

**P2-11 单 chunk 570 kB（gzip 189 kB）**，超 Vite 500 kB 警告线。建议对 `/journal` `/journal/:id` `/share/:id` `/settings` `/deck` 做 `React.lazy` 路由分包 —— 这几页都不在核心六步上。

**P2-12 `CardArt.tsx` 554 行**，12 个 motif 渲染函数同文件。建议拆 `card/motifs/*`。

---

## 8. Lead 已知问题复核结论

| # | 问题 | 复核结论 |
|---|---|---|
| 1 | StepHint 因 CSS animation 覆盖 inline opacity 而淡不掉 | **已修，确认。** `StepHint.tsx:48` 呼吸改用 framer 的 `animate={{opacity: guided ? [1,0.68,1] : 0.55}}`，`:49` 有独立 `exit`。`theme.css` 的 `@keyframes` 只剩 `drift-slow` / `breathe`，且仅 `StarfieldBackground.tsx:81` 使用，与 Hint 无交集 |
| 2 | 拖拽时源卡牌被卸载导致 pointerup 丢失 | **已修，两处都改了。** Board 分支 `DrawTable.tsx:225-235`（`style={{opacity: draggingThis ? 0 : 1}}`，:222-224 有说明注释）；Hand 分支 `:263-274`（`style={{opacity: drag?.started && drag.source.kind==='hand' ? 0 : 1}}`，:262 有注释） |
| 3 | `AnimatePresence mode="wait"` 卡住 exit | **已修，确认。** 全 `src/` 检索 `mode="wait"` 零命中，`CutPage.tsx:94-95` 还留了「为什么不做交叉淡出」的注释。补充：`DrawPage.tsx:82` 与 `ShufflePage.tsx:60` 仍保留 `<AnimatePresence>`（默认 sync 模式且子元素无 `exit`），实际不产生 exit 动画，无风险，可顺手删除以减少困惑 |
| 4 | 小阿卡纳 placeholder 辨识度低 | **确认是真问题，不是「符合 §21」。** 已量化为「56 张只有 11 种可分辨牌面」，见 **P2-5**，附最小改动建议 |
| 5 | followUp 序号指代解析不准 | **确认，且比预期严重。** 不是「答成别的牌」这么中性 —— 是**永远答第 1 张，且语气笃定**。四种问法 4/4 错。见 **P1-3** |

---

## 9. 尚未实现 / 已知限制

1. **Free Table Mode** —— 按 Product Spec §2.2 只保留入口与说明，符合预期（`SettingsPage.tsx:93` 该选项为 `disabled`）。
2. **78 张原创插画** —— 22 张大阿卡纳中 10 张为 `signature` 层级，其余 68 张为 `placeholder`（Product Spec 允许），但可分辨度不足（P2-5）。
3. **`arcana:active-session` 在 localStorage 中明文包含完整 deck（含未翻开牌的 cardId 与 orientation）。** 这是 G-22 会话恢复的必要代价，且 AC-07 的 Then 分句限定在「界面上」，判定为**通过**并列为已知限制。若未来要收紧，需要在 storage 层做混淆并在恢复时还原 —— 但那只防好奇用户，不防真心想看的人，投入产出比低，建议不做。
4. **无自动化 UI 测试**（无 Vitest / Playwright）。当前保障来自 `engine-selfcheck.ts` 的 64 项断言，覆盖率集中在纯逻辑层；所有 React 组件与交互层**零自动化覆盖**。若后续要加，优先补 `DrawTable` 的拖拽状态机与 `FanSpread` 的手势判定。
5. **无 i18n**（简报 §26 明确不做）。
6. **`FanSpread` 视口外剪裁**（`:220`）会让极快速滚动时边缘牌有一帧空档，低端机上可能可见。

---

## 10. 必须由人工在真机验证的项

自动化与静态审查**无法覆盖**以下项，请 Lead 在真机（iOS Safari + Android Chrome，375×667 起）逐条确认：

1. **洗牌手感** —— 拖动时 3 个子堆的跟手比例（1.0/0.55/0.25）是否像「一叠牌」而不是「一堆滑块」；松手后 spring（stiffness 190 / damping 22）的重量感。
2. **「我参与了洗牌」是否成立** —— 洗完一次，用户能否**看出**牌堆确实变了（`layerSeed` 驱动的重新错落是否足够可感）。
3. **切牌分裂的可信度** —— `splitGap 64px` 的上下两叠是否让人相信「牌真的被切开了」。
4. **扇形横滑 vs 上滑抽牌的实际误判率** —— 12px 死区在真手指下够不够；配合 P1-4 的 28px 命中带，实测「我想选第 40 张，点到的是第几张」。
5. **P1-2 惯性期误抽** —— 甩一下扇形再按住停下，看是否被抽走牌（这条在修之前一定会复现）。
6. **拖拽摆牌的吸附半径 56px 手感** —— 是否出现「明明拖到位却弹回来」或「离得老远就被吸走」。
7. **40px 手指偏移** —— 卡牌与目标牌位是否真的都没被手指挡住。
8. **翻牌的仪式感与重量感** —— 520ms + `[0.32,0.72,0,1]` 曲线，是否「有分量但不拖沓」；`scale 1.08` 的抬起是否显得廉价。
9. **音效与触觉** —— `utils/audio.ts` 是 WebAudio 程序化合成，真机上「纸牌摩擦声」是否像纸牌而不是白噪音；haptic 在 iOS Safari 上大概率**无效**（`navigator.vibrate` 不支持），需确认降级无报错。
10. **iOS 底部 Home Indicator 34px 区域** —— UX Spec §6.1 要求该区域内不放可拖拽元素、Fan 区底边留 25px 净空。当前 `DrawTable` 的 Fan 用 `flex-1` 撑满，**未见显式净空预留**，请在真机确认上滑手势是否被系统吞掉。
11. **`100dvh` 在 iOS 地址栏收缩时的抖动** —— 沉浸区四页是否出现内容跳动。
12. **`backdrop-blur` 在低端 Android 上的帧率** —— `Button` primary 与 `ReadingPage:209` 都用了，78 张牌同屏时可能掉帧。
13. **整体视觉调性（Gate 4）** —— 是否真的落在「Dreamlike / Celestial / Quiet / Premium」，而没有滑向廉价玄学网站。这条只能人眼判。
14. **P2-5 的牌面辨识度** —— 连抽几次三张牌阵，看用户是否会说出「这两张牌怎么长得一样」。

---

*报告结束。判断均以 `文件:行号` 为据，自动化结果为真实运行输出。*
