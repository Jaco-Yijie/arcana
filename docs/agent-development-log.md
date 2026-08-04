# Arcana — Multi-Agent 开发记录

> 只记录**决策、结果、问题、修改**，不记录内部推理过程。
> 每个 Agent 的产出文件与所有权在此登记，避免并行开发时互相覆盖。

## Lead Agent / Orchestrator

### 阶段编排

| Phase | 内容 | 负责 Agent | 状态 |
|---|---|---|---|
| 0 | 工程骨架、类型契约、存储/设置/反馈基础层 | Lead | ✅ |
| 1 | Product Definition | Agent 1 Product | ✅ |
| 2 | UX Architecture | Agent 2 UX | ✅ |
| 3 | Visual System | Agent 3 Visual | ✅ |
| 4 | Tarot Interaction Prototype（引擎 + 交互方案） | Agent 4 Interaction | ✅ |
| 5 | Frontend Integration | Agent 5 Frontend + Lead | ✅ |
| 6 | Content Integration | Agent 6 Content | ✅ |
| 7 | QA Review | Agent 7 QA | ✅ |
| 8 | Final Integration | Lead | ✅ |

### 文件所有权（并行开发防冲突）

| Agent | 拥有的文件 |
|---|---|
| Lead | `src/types/*`、`src/utils/*`、`src/store/*`、`src/hooks/*`、`src/App.tsx`、`src/main.tsx`、工程配置 |
| Product | `docs/01-product-spec.md` |
| UX | `docs/02-ux-spec.md` |
| Visual | `docs/03-design-system.md`、`src/styles/theme.css`、`src/components/card/*`、`src/components/atoms/*` |
| Interaction | `docs/04-interaction-spec.md`、`src/features/table/engine/*`、`scripts/engine-selfcheck.ts` |
| Content | `docs/05-content-spec.md`、`src/data/*`、`src/features/reading/*` |
| Frontend | `src/pages/*`、`src/features/table/components/*`、`src/features/journal/*`、`src/components/layout/*` |
| QA | `docs/06-qa-report.md` |

### Lead 裁决记录

| # | 议题 | 裁决 | 依据 |
|---|---|---|---|
| L-01 | 关系牌阵张数（简报写「3–5 张均可」，导致 Drop Zone 与 AC 无法验证） | **固定 5 张** | 牌数不确定则 AC-04/AC-06 无法客观验证 |
| L-02 | 78 张 vs 6–10 张 Mock Card 的矛盾 | **数据层 78 张齐全，图像层复用程序化 Placeholder** | 否则摊牌变成「只有 10 张牌可抽」，违反 §17 |
| L-03 | `TarotCard.orientation` 字段位置 | 静态牌义**不带** orientation；正逆位挂在 `DeckEntry` / `Placement` 上 | 同一张牌在不同 Session 朝向不同，牌义数据只应有一份 |
| L-04 | 牌面美术 | 不用位图，全部 SVG 程序化生成（`ArtMotif` + `hue` + `tier`） | Prototype 阶段无美术资源，且保证 78 张同属一个设计系统 |
| L-05 | 音效资源 | 不加载音频文件，用 WebAudio 现场合成 | 保持包体积与「安静」调性 |
| L-06 | Share 优先级 | 降为 P2 | 不在 §28 交付标准内 |

---

## Agent 1 — Product Lead

**确认的产品决策**
- 核心价值定为「用户在**发现**牌，而非**触发**牌被生成」，并给出可执行的否决规则：任何减少用户操作权/选择权/摆牌权/翻牌权的功能一律砍，即使更好看更省事。
- **两条主路径的核心六步完全一致** —— 随缘抽一张不得简化或跳过洗/切/摊/选/摆/翻任何一步。这是最重要的一条裁决。
- 产出 30 条功能（P0×19 / P1×7 / P2×4）、15 条 Given-When-Then 验收标准、**24 条 Guardrails**（G-01~G-24）。

**发现的简报内部矛盾**（已由 Lead 裁决）
- §8 要 78 张隐藏牌序，§21 只做 6–10 张 Mock Card，§9 又要「感觉是完整一副牌」→ 数据层 78 张齐全、图像层复用 Placeholder（L-02）
- §7 关系牌阵「3–5 张均可」导致 AC-04/AC-06 无法客观验证 → 固定 5 张（L-01）
- `interactionEntropy` 是最容易被偷工减料的地方（做成常量或只存不用）→ 单列为 G-21

## Agent 2 — UX Designer

**确认的流程**：14 个路由，沉浸区 = `/focus` + `/table/*` 共 5 页，只保留 44px 沉浸条。

**两个决定成败的设计**
1. **主 CTA 在条件未满足时不渲染，而不是 disabled 灰按钮。** 洗牌 0 次时「洗好了」根本不存在 —— 灰按钮会让用户盯着它想怎么点亮，而「不存在」从物理上杜绝了「可以跳过洗牌」的观感。
2. **`/table/draw` 的三段空间结构 Board(上) / Hand(中) / Fan(下)。** 这个「目标—手—牌堆」隐喻让拖拽方向天然由下往上，与真人摆牌一致；Fan 落在拇指舒适区，Board 只需看得见。

**手势冲突四道防线**：① 沉浸区 `fixed + 100dvh + overflow:hidden` 消灭页面滚动 ② 空间分离（横滑只在 Fan、拖拽只从 Hand/Board 发起）③ 12px 死区 + 轴锁定（向下滑一律判为滚动）④ Pointer Events + capture。
**大部分手势冲突不是靠算法解决的，是靠布局避免的。**

## Agent 3 — Visual Designer

设计系统见 `docs/03-design-system.md`，token 唯一来源 `src/styles/theme.css`。
色域锁死 hue 248–268，冷金用量 < 5%；卡牌选中态**不加 glow**（发光是抽卡 UI 的语言）。
牌背纯 SVG，78 张完全一致；牌面程序化生成，12 种母题。

**已知代价**：`hue` 被压到 240°–272° 窄色带以保证「像同一副牌」，代价是同 motif 的牌视觉上几乎不可区分。

## Agent 4 — Interaction Specialist

**洗牌**：不是按钮。riffle（交切洗，纵向拖）/ strip（切叠洗，横滑）由手势方向判定；手势的方向/距离/时长/起止位置既进入 entropy digest 又直接决定切割点与交错粒度。
**刻意不用一次性 Fisher-Yates** —— 那样「洗第二次」在数学上毫无意义，手势幅度也无从体现，entropy 就退化成装饰（正中 G-21）。

**切牌**：`applyCut(deck, ratio, entropy)` 的 `ratio` 是**必填、无默认值**的参数 —— 调用方必须拿到用户真实触点才能调用它。entropy 只提供与 ratio 无关的常量级偏移，保证「不同切点必然不同牌序」严格成立。

**摊牌**：`computeFanLayout` 弧线锚定在**可视区中心**而不是扇形中心，用户滚到哪里，哪里的牌就是抬起来的；`hitTestFan` 在重叠区取 zIndex 最高者 —— 否则用户点到的会是被压在下面、他根本看不见的牌。

**引擎自检**：`npm run engine:check` → **64 项断言全部通过**，覆盖 AC-01/02/03 与 G-01/02/21/22。
含端到端验证：同 seed 仅切点差 0.01 → 抽到的牌不同；同 seed 仅最后一次手势差 1px → 抽到的牌不同。

## Agent 5 — Frontend（由 Lead 承担）

Frontend Agent 未能启动（额度中断），由 Lead 直接实现 Phase 5 整合，以保证代码一致性。
产出：14 个页面、2 种外壳（常规区 / 沉浸区）、牌桌 Feature Module（ShuffleStack / CutStack / FanSpread / DrawTable / FlipCard / CardMeaningSheet）。

**浏览器实测中发现并修复的 7 个真实 bug**
| # | 现象 | 根因 | 修法 |
|---|---|---|---|
| B-01 | 引导文案淡不掉，卡在 opacity 0.07 | CSS `animation` 优先级高于 inline style，盖掉了 framer-motion 的 exit | 呼吸改由 framer 驱动 |
| B-02 | 洗牌牌堆贴在屏幕下缘 | 子元素全绝对定位，容器高度塌陷成 0 | 显式给容器高度 |
| B-03 | 切牌指示线看不见 | 牌堆切片 z-index 到 39，指示线 z-index auto 被压在下面 | 指示线显式 z-index 50 |
| B-04 | **拖拽永久卡住，pointerup 收不到** | 拖拽开始时源卡牌被卸载，持有 pointer capture 的元素随之消失 | 拖拽中只隐藏不卸载 |
| B-05 | 拖到位却弹回 | `endDrag` 读到的是上一帧的 `hoverZone` state | 命中结果同时写入 ref |
| B-06 | 扇形 78 张全部不可见 | 入场动画未跑完，卡在 `opacity: 0` | 改 `initial={false}`，宁可没入场动画也不能出现空牌堆 |
| B-07 | 存入日记后被弹回首页 | `completeSession()` 清空 session，页面守卫的 `<Navigate to="/">` 抢先生效 | 「已完成」有自己的出口且优先级高于守卫 |

## Agent 6 — Content Designer

78 张完整牌义（0 空字段）、5 个牌阵、Mock Reading / 问题优化 / 追问 / 安全边界。详见 `docs/05-content-spec.md`。
`FollowUpContext` 在**类型上**就只允许四样东西，历史日记没有入口能进来（AC-12）。

## Agent 7 — QA Reviewer

独立审查报告见 `docs/06-qa-report.md`。结论：可交付，但先修 1 个 P0。
G-01~G-22、G-24 全部通过；核心价值在代码层立得住 —— `buildHiddenDeck` 与 `createSeed` 的唯一调用点都在 `startSession`，抽牌是纯查表，全站零 `any` 零 `console`。

**QA 发现、Lead 已修复：**

| 级别 | 问题 | 根因 | 修法 |
|---|---|---|---|
| **P0** | **日记不是自动保存**（AC-09 / G-23） | `upsertEntry` 唯一调用点在「存入日记」按钮上。用户看完解读直接关页面，`/journal` 就是空的 | Reading 生成即把 status 置为 completed，`commit` 每次变更都同步写日记；按钮只负责结束会话 |
| P1 | 惯性滚动期误抽牌 | 停了 momentum 却没记住「这次按下是为了停下」，仍判为 tap | 新增 `stoppedFling` 标记 |
| P1 | 追问序号指代**自信答错** | 「第二张」无法解析 → 落到兜底，而兜底笃定地指认第 1 张 | 新增 `resolveOrdinals`（含「中间/最后一张」，负向断言排除「第一次」）；兜底改为不指认任何一张牌 |
| P1 | 小阿卡纳牌面互相无法区分 | placeholder 牌**根本没有星座层**，而 hue 被压在 240°–272° 窄带 | placeholder 也渲染星座（`PlaceholderMark`），78 张有 56 个唯一 hue → 星点位置各不相同 |
| P2 | 「退出专注」在 44px 固定宽按钮里折行 | 固定 `w-11` | 改 `min-w-11` + `whitespace-nowrap` |

**Lead 复核后未采纳的一条**：QA 报告 P1-4 指出扇形命中带 28px 低于 44px 规范。
但 UX Spec §6.4 对「同类连续元素」本就写了例外，且中心焦点牌的命中宽度是完整 76px；
把露出宽度提到 44px 会让扇形总宽涨到 3400px 以上，浏览整副牌的成本反而更高。**维持 28px。**

**验证结果**：`engine:check` 64 项断言全过 · `tsc -b --noEmit` 干净 · `npm run build` 成功 · `oxlint` 仅 4 条 Fast-Refresh 建议（非缺陷）。

---

# V2 — DeepSeek LLM Tarot Reading Engine

## Lead Agent

### 本轮 Agent 编排与实际执行

| Agent | 交付物 | 状态 |
|---|---|---|
| Product | `docs/v2/10-product-scope.md`（295 行，22 功能 / 16 AC-V2 / 16 GV2） | ✅ 完成 |
| Architecture | `docs/v2/11-architecture.md`（514 行） | ✅ 文档完成（汇报环节被额度中断，文件已落盘） |
| Tarot Reading | `server/prompts/tarotReadingPrompt.ts`、`server/validation/toneGuard.ts` | ✅ 完成 |
| Backend | `server/**` 其余全部 | ⚠️ **由 Lead 承担**（避免再次中断） |
| Frontend | `src/features/reading/*`、`src/hooks/useReading.ts`、`ReadingPage` 改造 | ⚠️ **由 Lead 承担** |
| QA | `docs/v2/12-qa-report.md` + `scripts/reading-eval.ts` | ⚠️ **由 Lead 承担** |

**为什么后三个由 Lead 承担**：本轮与上一轮共有 3 个 Agent 因 session 额度中断。
Backend / Frontend / QA 三者与已完成部分耦合最紧，再派冷启动 Agent 的中断风险高于收益。
如实记录，不粉饰成「多 Agent 协作完成」。

### Lead 核实的外部事实（改变了架构）

1. **`deepseek-v4-pro` / `deepseek-v4-flash` 确为当前模型** —— 我的记忆是过时的（记的是 `deepseek-chat`/`deepseek-reasoner`），去查了官方文档才确认用户说法正确。
2. **DeepSeek 只支持 `response_format: { type: 'json_object' }`，不支持 JSON Schema** ——
   所以 API 只保证「是个合法 JSON」，**字段对不对得我们自己扛**。这直接催生了 `readingSchema.ts`。
3. **官方明确提示可能返回空 content** —— 所以 `empty-response` 是一等错误码而不是意外分支。

### Lead 裁决

| # | 议题 | 裁决 | 依据 |
|---|---|---|---|
| LV2-01 | 后端形态 | 独立 Node 进程（`node:http` 零依赖）+ Vite dev proxy；生产同进程托管 dist | Vite 插件方案在 config 上下文里解析不了 `@/` 值导入，且生产还得再写一份 |
| LV2-02 | 客户端发多少数据 | **一个字的牌义都不传**，只传 positionId/cardId/orientation；服务端用本地 78 张牌重建 | 模型永远拿不到臆造牌义；服务端手里有唯一真值，AC-V2-10 才有基准 |
| LV2-03 | V1/V2 兼容 | `TarotSession` **加可选字段**而非改字段类型；每次生成同时写 V2 + V1 投影 | `journalStore`/`JournalDetailPage`/`SharePage` 一行不改，历史日记原样可读 |
| LV2-04 | 语气校验 | **不复用 V1 `FORBIDDEN_PHRASES`**，另建能识别否定的 V2 规则集 | V1 是裸子串，会把「不一定」「说不定」误判 —— 而那恰恰是我们要求模型用的表达 |
| LV2-05 | 无 Key 时的行为 | 「什么都没配」→ Mock；「显式要 deepseek 却没 Key」→ **明确失败** | 静默降级会让 Key 配错被掩盖成「解读出来了」 |
| LV2-06 | 类型文件拆分 | 不采纳架构文档的拆两份建议，保持单文件 | 单份契约更难漂移 |

## Agent 1 — Product

Scope 收敛为三件事：Provider 抽象 / 服务端解读端点 / 结构化契约 + 关系分析 + 叙事 + 回答问题。
拒绝的 Scope Creep：流式输出、多轮对话式塔罗师、追问接 LLM、用户自定义 Prompt、解读评分、多语言、
LLM 推荐牌阵、LLM 判定高风险、历史日记进 Prompt、服务端缓存、Token 成本面板。

**最有价值的发现**：V1 的 `FORBIDDEN_PHRASES` 含 `'一定'`/`'必须'`/`'绝对'` 裸子串。
V1 时代文案手写可穷举审计所以没问题；V2 文本来自模型，同一套规则会把
「不一定」「说不定」判成违规。→ 直接催生 LV2-04。

**裁决请求**：V1 的 G-17 中「真实 AI API」一项本轮解除，其余三项（云数据库/真实登录/付费）继续有效。
**Lead 批准** —— 这是用户本轮的明确要求。

## Agent 2 — Architecture

后端形态、Mock 双侧职责、V1/V2 超集+投影、错误码→HTTP→前端行为矩阵、超时重试成本、
安全验证命令、三方零重叠文件清单。

**两条被 Lead 直接采纳并证明有价值的判断**：
- 「业务级错误一律不兜底」—— 401/403/429/5xx/超时/Schema 失败必须让用户看见真实错误，
  否则 Key 配错会被静默掩盖。（后来 V2-B01 正是这类问题的另一种形态）
- 「生产构建下本地兜底默认关闭」—— 避免线上把 Mock 文案当成真解读。

## Agent 3 — Tarot Reading

**防「牌义字典式罗列」三招**：给 4 条反例（含「换成别的牌也同样成立」）；强制五步链路
（牌义→牌位含义→两者差别→用户问题语境→与其他牌的互动）；明确「keywords 是给你理解用的原料，
不许搬进输出」，改要求每张牌抓 1–2 个 `symbols` 具体意象说话。

关系分析给了 13 个 `kind` 的成立条件，写死「stats 已算好，不要自己数」「没有就不写，宁少勿凑」
「单张牌阵必须 `[]`」。牌阵顺序含义做成 `SPREAD_STRUCTURE_HINT` 表逐阵下发。

**toneGuard 的否定识别**：两层 —— Tier A 紧邻否定（命中词前 4 字内）、Tier B 近距否定（前 6 字窗口，
只对确定性规则开放）。**刻意不含「无」和裸「非」**，否则「毫无疑问一定会」会因为「无」被放行。
另用负向前瞻放行 `一定(?!程度|范围)`、`命运(?!之轮)`（命运之轮是真实牌名）、`肯定(?=会|能|是)`。
自测 26/26 通过。

## Agent 6/7 — Backend / Frontend / QA（Lead 承担）

产出见 `docs/v2/12-qa-report.md`。开发中发现并修复 5 个真实缺陷，其中两个值得记录：

- **V2-B01 Key 配错被静默掩盖**：显式 `READING_PROVIDER=deepseek` 但无 Key 时返回 Mock 解读。
  这比报错糟糕得多 —— 运维会以为 DeepSeek 在工作。
- **V2-B02 解读永远停在加载中**：React StrictMode 会 mount→effect→cleanup(abort)→effect 再跑，
  而我的 `startedRef` 守卫让第二次直接 return，第一次的请求已被 abort。
  **这类 bug 只有真的把页面跑起来才会暴露。**

**回归结果**：抽牌引擎 64 项断言 0 失败（V1 核心零回归）、解读评测 106 项断言 0 失败、
构建通过、`dist/` 密钥扫描零命中。
