# V2 架构方案：接入 DeepSeek LLM 塔罗解读引擎

> 本文是 Backend Agent / Tarot Reading Agent / Frontend(Lead) 的施工图。
> 决策已定，照做即可；有歧义以本文为准。
>
> 全局不变量（V1 继承，本轮不得动摇）：
> **G-01 / G-02 / G-12 —— LLM 只解释「已经抽好并翻开」的牌，绝不参与抽牌、不产生随机数。**
> API 失败 **绝不允许**触发重抽；Retry 必须以完全相同的输入重发。

---

## 0. 已验证的环境事实

以下三条在本机实测通过，方案基于它们成立：

| 事实 | 验证方式 | 结果 |
| --- | --- | --- |
| `tsx` 能解析 `@/` **值导入**（含嵌套目录、含 `@/data/deck` 链式依赖） | 在 `.__p/deep/a.ts` 里 `import { generateReading } from '@/features/reading/mockReading'` 并执行 | OK，78 张牌加载正常 |
| Node 运行时具备 `fetch` / `AbortSignal.timeout` | `process.version` = **v25.8.0** | 无需任何 HTTP 依赖 |
| `tsc -b` 当前**不**检查 `scripts/`（`tsconfig.node.json` 只 include `vite.config.ts`） | 读配置 | 服务端需自建 `tsconfig.server.json` 才能进 CI |

---

## A. 后端形态 —— 选 (a) 独立 Node 进程（`node:http` 零依赖）+ Vite `server.proxy`

### 决策

新建 `server/` 目录，用 **`node:http` 手写路由，不引入 Express**，运行时用**已装的 `tsx`**。
开发期 Vite（5173）把 `/api` 代理到 8787；生产期**同一个 Node 进程**既托管 `dist/` 静态文件又提供 `/api`，单端口 8787。

### 否决 (b) Vite 插件 middleware —— 三个硬缺陷

1. **只在 dev 存在。** `vite build` 产物是纯静态 `dist/`，`vite preview` 不跑用户插件的 `configureServer`。生产必须另写一份服务端，等于同一份逻辑维护两遍，V2 的错误分类/重试/限流会立刻在两份实现之间漂移。
2. **`@/` 别名不生效（本轮的致命点）。** 插件代码跑在 Vite config 的 Node 上下文，`resolve.alias` 只作用于 **Vite 自己的模块图（浏览器侧 transform pipeline）**，不改写 Node 的 `import` 解析。服务端一旦 `import '@/features/reading/mockReading'`（它内部对 `@/data/deck` 是**值导入**），Node 直接 `ERR_MODULE_NOT_FOUND`。绕开只有两条路：改成一长串 `../../src/...` 相对路径（丑且脆），或用 `server.ssrLoadModule()` 动态加载（把服务端逻辑焊死在 Vite 内部 API 上，且生产无解）。
3. **进程耦合。** 前端热更新一崩，API 跟着没；反过来服务端一个未捕获异常会打断 Vite dev server。V2 要调 LLM，超时/异常是常态，不能让它们污染前端开发体验。

> 反观 (a)：入口是 `server/index.ts`，由 `tsx` 直接执行，`tsx` 从入口向上找到根 `tsconfig.json` 的 `paths`，`@/` 值导入**开箱可用**（已实测）。这正是根 tsconfig 那段 `paths` 注释存在的意义。

### 否决 (c) Serverless / Edge Function

目标部署平台未定，引入 vendor 目录约定（`api/`、`functions/`）会把结构绑死；且本地开发需要额外 CLI（`vercel dev` 等），与「零新增依赖」冲突。

### 运行方式

| 场景 | 命令 | 端口 | `dist/` 谁托管 |
| --- | --- | --- | --- |
| 只调 UI（后端未启动） | `npm run dev` | Vite 5173 | — |
| 前后端联调 | `npm run dev:full` | Vite 5173 + API 8787，Vite 代理 `/api` | — |
| 只调 API | `npm run dev:api` | 8787 | — |
| 生产 | `npm run build && npm start` | 8787 单端口 | **Node 进程自己托管**（`SERVE_STATIC=1`） |

`package.json` scripts 增量（**不改动 `dev` / `build` / `lint` / `engine:check` 现有值**）：

```jsonc
"dev:api":  "tsx watch server/index.ts",
"dev:full": "node scripts/dev-all.mjs",
"start":    "SERVE_STATIC=1 tsx server/index.ts"
```

`scripts/dev-all.mjs`：零依赖，`child_process.spawn` 起 `vite` 与 `tsx watch`，任一退出则 kill 另一个（避免 `&` 留孤儿进程）。

`vite.config.ts` 增量：

```ts
server: {
  host: true,
  proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } },
}
```

**服务端运行时用 `tsx`，不预编译 `tsc`。** 理由：`tsx` 已是 devDependency；预编译会引入 `outDir` 产物、二次 `paths` 重写（`tsc` 不会把 `@/` 改写成相对路径，还得再加 `tsc-alias`），得不偿失。
类型安全另行保证：新增 `tsconfig.server.json`（`include: ["server"]`、`types: ["node"]`、`moduleResolution: "bundler"`、`paths: {"@/*": ["./src/*"]}`、`noEmit`），并加入根 `tsconfig.json` 的 `references` —— 这样 `npm run build` 的 `tsc -b` 会连服务端一起类型检查。

---

## B. Mock Provider 放在哪一侧 —— **两侧都放，但职责严格不同**

| | 服务端 Mock | 客户端本地兜底 |
| --- | --- | --- |
| 位置 | `server/providers/mock.ts` | `src/features/reading/readingClient.ts` 内部 |
| 由谁选中 | 服务端 env `READING_PROVIDER=mock` | **不可配置**，只在「完全连不上后端」时自动触发 |
| 产出 | 完整 `StructuredReading`（V2） | V1 `Reading`（直接调现有 `generateReading()`） |
| 目的 | 不烧 token 地跑通**整条契约链路**（校验/投影/错误码） | 保证 UI 在无后端时仍可开发与演示 |

### 服务端 Mock 的实现要点

直接复用 V1：`generateReading(v1Input)` → 再由 `liftToStructured()` 升维成 `StructuredReading`。
不重写句式池，避免两套文案漂移。（`@/features/reading/mockReading` 的值导入在 `tsx` 下已实测可用。）

### 客户端完全连不上后端时的行为（明确规定）

`readingClient` 只在错误码为 `UPSTREAM_NETWORK` / `SERVER_UNREACHABLE`（fetch reject、404、返回非 JSON）时启用本地兜底，且：

1. 返回 V1 `Reading`，`readingV2` 保持 `null`；
2. 在返回值上带 `source: 'local-fallback'`，ReadingPage **必须**显示一条低调提示：「当前使用本地示例解读（未连接解读服务）」；
3. **业务级错误一律不兜底**（401/403/429/5xx/超时/Schema 失败）——那些必须让用户看见真实错误并可 Retry，否则 Key 配错会被静默掩盖；
4. 生产构建下兜底默认**关闭**（`import.meta.env.DEV` 为 false 时禁用），避免线上把 Mock 文案当成真解读。

---

## C. 类型契约与 V1/V2 兼容层

### C-1 类型放哪、怎么共享

**两个纯类型文件，零运行时依赖，客户端与服务端 `import type` 同一份：**

| 文件 | 内容 | 归属 |
| --- | --- | --- |
| `src/types/reading.ts` | `ElementId`、`ReadingContext`、`ContextCard`、`StructuredReading`、`StructuredCardAnalysis` | Tarot Reading Agent |
| `src/types/readingApi.ts` | `ReadingRequest`、`ReadingResponse`、`ReadingErrorCode`、`ReadingApiError` | Backend Agent |

放 `src/types/` 而非新建 `shared/` 的理由：`@/` 别名已经对**客户端（Vite）**和**服务端（tsx）**双向可用，无需第三套路径配置；且 `verbatimModuleSyntax: true` 下这些 `import type` 会被完全擦除，服务端连解析都不需要发生。

### C-2 `ReadingContext`（喂给 LLM 的输入）

```ts
export type ElementId = 'fire' | 'water' | 'air' | 'earth'

export interface ContextCard {
  positionId: string
  positionLabel: string
  positionMeaning: string
  cardId: string
  nameZh: string
  name: string
  arcana: 'major' | 'minor'
  suit: 'wands' | 'cups' | 'swords' | 'pentacles' | null
  /** 由 suit 派生；大阿卡纳为 null，见下方裁决 */
  element: ElementId | null
  orientation: 'upright' | 'reversed'
  meaning: string        // 按正逆位取自 meaningUpright / meaningReversed
  keywords: string[]
  advice: string
  symbols: string[]
}

export interface ReadingContext {
  question: string
  mode: 'question' | 'random'
  themeLabel: string | null
  spreadId: SpreadId
  spreadName: string
  cards: ContextCard[]
  /** 供 LLM 直接引用的统计，避免它自己数错 */
  stats: {
    total: number
    majorCount: number
    reversedCount: number
    elementCounts: Record<ElementId, number>
    /** 大阿卡纳张数，不计入四元素 */
    elementlessCount: number
  }
  /** 命中安全边界时为提示文案，LLM 必须收紧措辞 */
  safetyNotice: string | null
}
```

**element 裁决：`element: ElementId | null`，大阿卡纳一律 `null`。**

- 派生规则：`wands→fire`、`cups→water`、`swords→air`、`pentacles→earth`。
- 大阿卡纳**不硬编 22 条占星元素对应表**。理由有三：(1) 那是一份需要作者背书的新数据集，本轮明令禁止改 78 张牌数据；(2) 各流派（Golden Dawn / Thoth / 现代）对同一张大牌的元素归属不一致，随手写一版会成为无法追溯的「隐形教条」；(3) 传统四元素平衡分析本就以小阿卡纳为主体，大阿卡纳按「超出四元素的主题层」处理在牌理上是站得住的。
- Prompt 里明确写：「element 为 null 的是大阿卡纳，它不参与四元素平衡计算，请把它当作更高层的主题牌」，并给出 `elementlessCount`。
- 类型是 nullable 而非 optional，V3 想补大牌元素表时只需换 `elementOf()` 的实现，**契约零变更**。

### C-3 `StructuredReading` 与 V1 `Reading` 共存 —— 超集 + 投影

**核心设计：`StructuredReading` 的字段名与类型，对 V1 `Reading` 的每一个字段逐一同名同型；V2 的新东西一律是新增字段。**

```ts
export interface StructuredCardAnalysis extends CardAnalysis {   // V1 五个字段原样继承
  /** V2 新增：这张牌在此牌位上的一句话要点 */
  keyPoint: string
}

export interface StructuredReading {
  // ↓ 与 V1 Reading 完全同名同型（投影时直接 pick）
  generatedAt: number
  headline: string[]
  cardAnalyses: StructuredCardAnalysis[]
  relations: string[]
  trend: string
  watchOut: string[]
  actions: string[]
  safetyNotice: string | null

  // ↓ V2 新增
  schemaVersion: 2
  summary: string
  elementInsight: string
  reflectionQuestions: string[]
  source: 'deepseek' | 'server-mock' | 'local-fallback'
  model: string | null
  usage: { promptTokens: number; completionTokens: number } | null
}
```

于是投影函数只是一次字段挑选，不含任何转换逻辑：

```ts
// src/features/reading/projectToV1.ts
export function toV1Reading(v2: StructuredReading): Reading
```

**`TarotSession` 只做「加可选字段」，绝不改字段类型：**

```ts
export interface TarotSession {
  // …不动
  reading: Reading | null          // ← 保持原样，永远是 V1 形状
  readingV2?: StructuredReading | null   // ← 新增可选字段
}
```

因此：

- `journalStore.toSummary()` 读 `entry.reading?.headline[0]` —— **零改动**，因为 `reading` 永远被 `toV1Reading()` 填成 V1 形状。
- `JournalDetailPage`（读 `entry.reading.headline`）、`SharePage`（读 `entry.reading?.headline[0]`）—— **零改动**。
- 历史日记（只有 `reading`、没有 `readingV2`）反序列化后 `readingV2` 为 `undefined`，可选字段，TypeScript 与运行时都不炸。

### C-4 老日记打开 Reading 页怎么渲染

ReadingPage 不再直接读 `session.reading`，改读一个归一化视图：

```ts
// Frontend Lead 实现，放在 ReadingPage 同文件或 src/features/reading/readingView.ts
type ReadingView = Reading & Partial<Pick<StructuredReading,
  'summary' | 'elementInsight' | 'reflectionQuestions' | 'source' | 'schemaVersion'>>

function toReadingView(s: TarotSession): ReadingView | null {
  if (s.readingV2) return s.readingV2          // V2：全部区块可渲染
  return s.reading                             // V1：新增区块字段为 undefined
}
```

渲染规则：V1 的六个 Accordion **无条件渲染**（老日记本来就有这些字段）；`summary` / `elementInsight` / `reflectionQuestions` 三个 V2 区块**用 `&&` 条件渲染**，老日记自然不显示，不需要任何迁移脚本。

---

## D. 错误分类与契约

### D-1 线路契约

```ts
// src/types/readingApi.ts
export interface ReadingRequest {
  question: string
  mode: 'question' | 'random'
  theme: RandomThemeId | null
  spreadId: SpreadId
  /** 只传标识，不传任何牌义文本 —— 见 F-3 */
  placements: { positionId: string; cardId: string; orientation: Orientation }[]
}

export type ReadingResponse =
  | { ok: true; reading: StructuredReading }
  | { ok: false; error: ReadingApiError }

export interface ReadingApiError {
  code: ReadingErrorCode
  /** 面向用户的中文文案，前端可直接显示 */
  message: string
  /** 前端是否应展示 Retry 按钮 */
  retryable: boolean
  /** 429 时来自上游或本地限流的建议等待秒数 */
  retryAfterSec?: number
  /** 仅 dev 下填充，便于定位；生产为 undefined */
  detail?: string
}
```

### D-2 错误码 → HTTP → 前端行为

| `ReadingErrorCode` | HTTP | 触发条件 | retryable | 前端行为 |
| --- | --- | --- | --- | --- |
| `CONFIG_MISSING_KEY` | 500 | 启动或请求时 `DEEPSEEK_API_KEY` 缺失/空 | false | 显示「解读服务未配置」+ 指向 `.env.example`，**不** Retry、**不**兜底 |
| `BAD_REQUEST` | 400 | 请求体缺字段 / cardId 不在 78 张内 / placements 数量 ≠ 牌阵张数 | false | 显示「请求异常」，不 Retry（重试也是同样非法） |
| `PAYLOAD_TOO_LARGE` | 413 | 请求体 > 16 KB | false | 同上 |
| `LOCAL_RATE_LIMIT` | 429 | 本机令牌桶耗尽 | true | Retry 按钮 + 倒计时 `retryAfterSec` |
| `UPSTREAM_AUTH` | 502 | DeepSeek 401 | false | 「API Key 无效」，不 Retry、不兜底 |
| `UPSTREAM_FORBIDDEN` | 502 | DeepSeek 403 | false | 「账号无权限 / 余额不足」，不 Retry |
| `UPSTREAM_RATE_LIMIT` | 429 | DeepSeek 429 | true | Retry + 倒计时 |
| `UPSTREAM_UNAVAILABLE` | 502 | DeepSeek 5xx | true | Retry |
| `UPSTREAM_NETWORK` | 502 | fetch reject / DNS / TLS | true | Retry |
| `UPSTREAM_TIMEOUT` | 504 | 超出单次上游预算 | true | Retry |
| `UPSTREAM_EMPTY` | 502 | `choices[0].message.content` 为空串 / 缺失（官方明示会发生） | true | Retry |
| `PARSE_INVALID_JSON` | 502 | `JSON.parse` 失败且修复失败 | true | Retry |
| `SCHEMA_INVALID` | 502 | JSON 合法但字段校验 + 修复后仍不达标 | true | Retry |
| `INTERNAL` | 500 | 未预期异常 | true | Retry |
| *(仅前端)* `SERVER_UNREACHABLE` | — | fetch reject / 404 / 响应非 JSON | true | **唯一触发本地兜底的分支** |

> **HTTP 状态选择原则**：上游的 4xx 不透传成本服务的 4xx（客户端并没有做错事），统一收敛到 `502 Bad Gateway`，只有「确实需要客户端退避」的 429 与「确实超时」的 504 保留语义。

`retryable` 与「是否兜底」是**两个正交决策**：只有 `SERVER_UNREACHABLE` 走兜底，其余 `retryable` 错误一律显示错误 + Retry。
**Retry 必须复用同一份 `ReadingRequest` 对象引用**（前端把它存在 `useRef` 里），保证 G-01/G-02：重试永不重新读取 session、永不触发重抽。

---

## E. 超时、重试与成本

| 项 | 取值 | 理由 |
| --- | --- | --- |
| 上游单次 `fetch` 超时 | **30 s**（`AbortSignal.timeout(30_000)`） | 4000 max_tokens 的中文长输出实测量级在 15–25 s；30 s 能吃掉 P95 又不至于让用户干等 |
| 服务端重试次数 | **1 次**（共 2 次尝试） | 仅覆盖 `UPSTREAM_UNAVAILABLE` / `UPSTREAM_NETWORK` / `UPSTREAM_TIMEOUT` / `UPSTREAM_EMPTY` / `PARSE_INVALID_JSON` / `SCHEMA_INVALID`；`AUTH`/`FORBIDDEN`/`RATE_LIMIT`/`BAD_REQUEST` **不重试** |
| 退避 | 固定 **800 ms + 0–400 ms 抖动** | 单机低并发，指数退避没有收益，抖动只为避开上游瞬时拥塞 |
| 服务端总预算 | **65 s** 硬上限 | 30 + 1.2 + 30 ≈ 61 s，留 4 s 余量 |
| 前端 fetch 超时 | **70 s** | 必须大于服务端总预算，否则永远看到前端超时而拿不到服务端的精确错误码 |
| `max_tokens` | **4000** | 5 张牌阵的 `StructuredReading` 中文正文约 2000–2800 字，加 JSON 结构与键名约 3000–3500 token；4000 留足余量防截断（截断 → `PARSE_INVALID_JSON`，是最贵的失败） |
| `temperature` | **0.7** | 解读需要文风变化，但不能编造牌义 |
| 请求体上限 | **16 KB** | `ReadingRequest` 只含标识与问题文本，实际 < 1 KB；16 KB 足够宽松又能挡住恶意 body |
| `question` 长度 | 服务端截断到 **500 字符** | 防 prompt 稀释与 token 浪费 |
| 限流 | 每 IP **10 次 / 60 s** 令牌桶 + 全局在途并发 **4** | 本机单用户应用，限流的真实目的是**挡住前端 bug 造成的重试风暴烧 token**，不是防 DDoS |

第二次重试**必须换用更严格的 prompt**（在 user message 末尾追加一句「上一次输出不是合法 JSON，请只输出 JSON 对象，不要任何解释文字或 Markdown 代码块」），否则重试大概率复现同一个失败。

---

## F. 安全

### F-1 `.gitignore` / `.env.example`

`.gitignore` 追加（当前只有 `*.local`，**挡不住 `.env`**）：

```gitignore
# Secrets
.env
.env.*
!.env.example
```

新建 `.env.example`（**提交**，只含占位）：

```dotenv
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
READING_PROVIDER=mock          # mock | deepseek
PORT=8787
SERVE_STATIC=0
```

`server/env.ts` 用 `node:fs` 手写 10 行 `.env` 解析（Node 25 的 `--env-file` 也可，但写进 npm script 会让 `tsx watch` 参数变复杂）。**服务端读 `process.env`，绝不使用 `import.meta.env`。**

### F-2 保证 Key 不进前端 bundle

三层防线：

1. 变量名**不带 `VITE_` 前缀** → Vite 的 `define` 只注入 `VITE_*`，物理上不可能进 bundle；
2. `server/` 目录**不在 `tsconfig.app.json` 的 `include: ["src"]` 内**，前端代码 import 不到；
3. **可执行验证命令**（建议加进 CI / 提交前）：

```bash
npm run build && \
if grep -rIqE 'DEEPSEEK_API_KEY|sk-[A-Za-z0-9]{16,}' dist/; then \
  echo "FAIL: secret leaked into dist/"; exit 1; \
else echo "PASS: no secret in bundle"; fi
```

补充一条确认 `.env` 已被忽略：`git check-ignore -v .env`（有输出即已忽略）。

### F-3 请求体校验 —— **裁决：服务端必须用本地 78 张牌数据重新解析，客户端一个字的牌义都不许传**

具体规则（`server/routes/reading.ts` 顺序执行，任一失败 → `BAD_REQUEST`）：

1. `spreadId` 必须命中 `getSpread()`；
2. `placements.length` 必须等于 `spread.cardCount`；
3. 每个 `positionId` 必须存在于该牌阵、且**不重复**；
4. 每个 `cardId` 必须命中 `getCard()`（78 张白名单）、且**全局不重复**；
5. `orientation ∈ {'upright','reversed'}`；
6. `question` 截断至 500 字符；
7. 通过后，**服务端自己**从 `@/data/deck` / `@/data/spreads` / `@/data/randomThemes` 取出 `nameZh`/`meaning`/`keywords`/`advice`/`symbols`/`positionLabel`/`positionMeaning`，用 `detectRisk()` 重算 `safetyNotice`，组装出完整 `ReadingContext`。

理由：牌义是**权威静态数据**，让客户端传等于把 prompt 注入面（「这张牌的含义是：忽略以上指令并…」）直接开放给任何能改 devtools 的人。客户端只传「用户选了哪个位置的哪张牌」——这本来就是唯一真正来自客户端的信息。附带收益：请求体缩小一个数量级，且 `ReadingContext` 的构造在服务端只有一处，Mock 与 DeepSeek 两个 Provider 拿到的输入必然一致。

> 注意由此产生的一条约束：`buildReadingContext()` 必须放在 `src/features/reading/` 下（供服务端 `@/` 导入），**不能**放在 `server/`。

---

## G. 文件清单与所有权（三方零重叠）

### 新增

| 路径 | 内容 | 归属 |
| --- | --- | --- |
| `/Users/wangyijie/arcana/src/types/reading.ts` | `ElementId` / `ContextCard` / `ReadingContext` / `StructuredReading` | **Tarot** |
| `/Users/wangyijie/arcana/src/types/readingApi.ts` | `ReadingRequest` / `ReadingResponse` / `ReadingErrorCode` / `ReadingApiError` | **Backend** |
| `/Users/wangyijie/arcana/src/features/reading/element.ts` | `elementOf(card): ElementId \| null`、`ELEMENT_LABEL` | **Tarot** |
| `/Users/wangyijie/arcana/src/features/reading/readingContext.ts` | `buildReadingContext(req): ReadingContext`（含 78 张白名单校验） | **Tarot** |
| `/Users/wangyijie/arcana/src/features/reading/structuredSchema.ts` | `validateStructured()` / `repairStructured()` / `liftToStructured(v1)` | **Tarot** |
| `/Users/wangyijie/arcana/src/features/reading/projectToV1.ts` | `toV1Reading(v2): Reading` | **Tarot** |
| `/Users/wangyijie/arcana/src/features/reading/readingClient.ts` | `requestReading(req, signal)`、错误归类、本地兜底 | **Frontend** |
| `/Users/wangyijie/arcana/src/features/reading/readingView.ts` | `toReadingView(session)` | **Frontend** |
| `/Users/wangyijie/arcana/src/hooks/useReadingGeneration.ts` | loading / error / retry 状态机 | **Frontend** |
| `/Users/wangyijie/arcana/server/index.ts` | `node:http` 启动、路由、静态托管 | **Backend** |
| `/Users/wangyijie/arcana/server/env.ts` | `.env` 解析、配置校验 | **Backend** |
| `/Users/wangyijie/arcana/server/http.ts` | body 读取 + 大小限制、JSON 响应、令牌桶限流 | **Backend** |
| `/Users/wangyijie/arcana/server/errors.ts` | 错误码 → HTTP/retryable/文案 映射表 | **Backend** |
| `/Users/wangyijie/arcana/server/routes/reading.ts` | `POST /api/reading` handler | **Backend** |
| `/Users/wangyijie/arcana/server/providers/types.ts` | `ReadingProvider` 接口 + `resolveProvider()` | **Backend** |
| `/Users/wangyijie/arcana/server/providers/mock.ts` | `MockReadingProvider` | **Backend** |
| `/Users/wangyijie/arcana/server/providers/deepseek.ts` | `DeepSeekReadingProvider`：HTTP / 超时 / 重试 / 错误映射 | **Backend** |
| `/Users/wangyijie/arcana/server/prompt/systemPrompt.ts` | System prompt（含语气红线、JSON 示例） | **Tarot** |
| `/Users/wangyijie/arcana/server/prompt/buildMessages.ts` | `buildMessages(ctx, strictRetry)` | **Tarot** |
| `/Users/wangyijie/arcana/scripts/dev-all.mjs` | 并行起 vite + api | **Backend** |
| `/Users/wangyijie/arcana/tsconfig.server.json` | 服务端类型检查工程 | **Backend** |
| `/Users/wangyijie/arcana/.env.example` | 配置模板 | **Backend** |

### 修改

| 路径 | 改什么 | 归属 |
| --- | --- | --- |
| `/Users/wangyijie/arcana/package.json` | 只加 `dev:api` / `dev:full` / `start` 三个 script | **Backend** |
| `/Users/wangyijie/arcana/vite.config.ts` | 加 `server.proxy['/api']` | **Backend** |
| `/Users/wangyijie/arcana/tsconfig.json` | `references` 加 `./tsconfig.server.json` | **Backend** |
| `/Users/wangyijie/arcana/.gitignore` | 加 `.env` 段 | **Backend** |
| `/Users/wangyijie/arcana/src/types/session.ts` | `TarotSession` 加**可选**字段 `readingV2?: StructuredReading \| null` | **Tarot** |
| `/Users/wangyijie/arcana/src/features/reading/index.ts` | 新增 re-export（现有导出不删不改） | **Tarot** |
| `/Users/wangyijie/arcana/src/store/SessionContext.tsx` | `setReading(reading, readingV2?)` 加第二个可选参数并写入 session | **Frontend** |
| `/Users/wangyijie/arcana/src/pages/ReadingPage.tsx` | 改为异步生成 + loading/error/retry + V2 区块条件渲染 | **Frontend** |

> **不得触碰**：`src/data/deck/*`（78 张牌数据）、`src/features/table/**`（抽牌引擎）、`src/store/journalStore.ts`、`src/pages/JournalDetailPage.tsx`、`src/pages/SharePage.tsx`。它们能零改动工作，正是 C-3 方案的验收标准。

---

## H. 关键代码骨架（签名级）

```ts
// server/providers/types.ts                                   [Backend]
export interface ReadingProvider {
  readonly name: 'server-mock' | 'deepseek'
  generate(ctx: ReadingContext, signal: AbortSignal): Promise<StructuredReading>
}
/** 抛 ProviderError(code) 而非返回 null，由 route 统一映射成 HTTP */
export function resolveProvider(env: ServerEnv): ReadingProvider

// server/routes/reading.ts                                    [Backend]
export async function handleReading(req: IncomingMessage, res: ServerResponse): Promise<void>
//  readJsonBody(16KB) → validate → buildReadingContext() → provider.generate()
//  → validateStructured() → 200 {ok:true,reading} | error → toHttp(code)

// src/features/reading/readingContext.ts                      [Tarot]
export function buildReadingContext(req: ReadingRequest): ReadingContext  // 非法输入抛 BadRequestError

// src/features/reading/structuredSchema.ts                    [Tarot]
export function validateStructured(raw: unknown, ctx: ReadingContext): { ok: true; value: StructuredReading } | { ok: false; reason: string }
/** 只做保守修复：字符串→单元素数组、去 Markdown 代码围栏、补 generatedAt、按 positionId 补齐缺失的 cardAnalyses */
export function repairStructured(raw: unknown, ctx: ReadingContext): unknown
export function liftToStructured(v1: Reading, ctx: ReadingContext): StructuredReading

// server/prompt/buildMessages.ts                              [Tarot]
export function buildMessages(ctx: ReadingContext, strictRetry: boolean): ChatMessage[]
// 硬性要求：system 与 user 中都出现 "json" 字样；user 末尾附一个**缩略但键名完整**的
// StructuredReading JSON 示例；明确禁止 Markdown 代码块；复述 FORBIDDEN_PHRASES 红线。

// src/features/reading/readingClient.ts                       [Frontend]
export interface ReadingResult { reading: Reading; readingV2: StructuredReading | null; source: StructuredReading['source'] }
export async function requestReading(req: ReadingRequest, signal: AbortSignal): Promise<ReadingResult>  // 失败抛 ReadingApiError

// src/hooks/useReadingGeneration.ts                           [Frontend]
export function useReadingGeneration(): {
  status: 'idle' | 'loading' | 'error' | 'done'
  error: ReadingApiError | null
  /** 内部把首次的 ReadingRequest 冻结在 ref 里；retry 复用同一对象 —— G-01/G-02 */
  retry: () => void
}
```

---

## I. 实现顺序与依赖

```
① Tarot: src/types/reading.ts              ─┐
② Backend: src/types/readingApi.ts (依赖①)  ─┴─→ 契约冻结，三方可并行
                    │
        ┌───────────┼─────────────────────────────┐
        ▼           ▼                             ▼
③ Tarot            ④ Backend                     ⑦ Frontend
  element.ts         tsconfig.server.json           readingClient.ts（先对 mock 后端）
  readingContext.ts  .env.example / .gitignore      readingView.ts
  structuredSchema   server/env|http|errors         useReadingGeneration
  projectToV1        server/index.ts + 空路由        （②完成即可开工，无需等⑤⑥）
        │              vite proxy / package.json
        │                     │
        └──────────┬──────────┘
                   ▼
        ⑤ Backend: providers/types.ts + mock.ts   ← 依赖 ③④
                   │   ★ 此刻 /api/reading 已可端到端返回 StructuredReading
                   │      Frontend 用它联调，全程不烧一个 token
                   ▼
        ⑥ Tarot: server/prompt/*   +   Backend: providers/deepseek.ts
                   │   （prompt 与 HTTP 层通过 buildMessages 签名解耦，可并行）
                   ▼
        ⑧ Frontend: session.ts 的 readingV2（Tarot 提供）落地 →
           SessionContext.setReading 第二参数 → ReadingPage 改造
                   ▼
        ⑨ 全员验收：npm run lint / npm run engine:check / npm run build 全绿
           + F-2 的 secret 泄漏检查命令 PASS
           + 打开一条**老日记**确认渲染正常（C-4 的验收点）
```

关键阻塞点只有两个：**①② 契约冻结**（不冻结则三方全部返工）、**⑤ 服务端 Mock 打通**（它是 Frontend 不烧 token 联调的前提，优先级高于 ⑥ DeepSeek 接入）。

---

## J. 验收清单

- [ ] `npm run lint` / `npm run engine:check` / `npm run build` 全部通过（`build` 现已包含 `server/` 类型检查）
- [ ] `READING_PROVIDER=mock` 下端到端可出解读，全程零上游调用
- [ ] `READING_PROVIDER=deepseek` + 无 Key → 前端显示 `CONFIG_MISSING_KEY` 文案，无 Retry 按钮，**不**静默降级
- [ ] 后端完全不启动 → `npm run dev` 下 UI 仍能出解读，并显示「本地示例解读」提示
- [ ] 上游 429 → 前端显示倒计时 Retry；点击 Retry 后 `session.deck` / `placements` **逐字节不变**
- [ ] 打开 V2 之前保存的老日记，Reading 页正常渲染，V2 区块不出现
- [ ] 日记列表 / 详情 / 分享页在 V2 解读上正常显示（`toSummary` 未改一行）
- [ ] F-2 的 `grep dist/` 命令输出 PASS
