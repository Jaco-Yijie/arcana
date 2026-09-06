# Phase E1 — Deployment Decision & Packaging Report

> 本阶段不开发产品。目标是把「本地已经验收通过的产品」整理成
> **任何部署人员都知道该部署什么、不要部署什么、变量是什么、怎么验证、怎么回滚**的生产包。
>
> 未创建任何云资源、未购买域名、未绑定 CDN、未上传任何文件、未改写 Git 历史、未执行 commit / push。

---

## 1. Current Architecture

### 工作区实测

| 目录 | 大小 | 是否需要部署 |
|---|---:|---|
| `Arcana_Full_390/` | **1.4 GB** | ❌ 美术源素材 |
| `.git/` | 1.4 GB | ❌ |
| `qa/` | 349 MB | ❌ QA 截图 |
| `node_modules/` | 167 MB | ❌ 部署时重装 |
| `streamlit_build/` | 151 MB | ❌ 另一种部署形态 |
| `dist/` | 146 MB | 部分（去掉牌面后 743 KB） |
| `public/assets/decks/` | **139 MB** | ✅ 牌面（走 CDN） |
| `src/` + `server/` + `scripts/` | 1.6 MB | ✅ 服务端需要其中一部分 |
| **工作区合计** | **3.7 GB** | **实际需部署 151 MB** |

`Arcana_Full_390/` 内部：`masters` 1.1GB · `web` 132MB · `qa` 123MB · `review` 17MB ·
`thumbs` 7MB · `prompts` 4.6MB · `logs` 2.5MB · `manifests` 272KB。**运行期一张都不需要。**

### 当前运行方式

| | Development | Production（当前） |
|---|---|---|
| 前端 | Vite 5173（HMR） | 单进程 8787 托管 `dist/` |
| API | Vite `/api` 代理 → 8787 | 同进程直接处理 |
| 牌面 | `public/assets/decks`，`no-cache` | `dist/assets/decks`，`immutable` |
| 密钥 | `.env` → `server/env.ts` | 真实环境变量优先 |
| 启动 | `npm run dev` | `npm run build` → `npm start` |

### 服务端的真实依赖边界（本轮算出来的）

`server/` **值导入**了 `src/` 的 6 个模块来重建可信牌义上下文：
`cardById` · `spreadById` · `classifyQuestion` · `selectDomainMeaning` · `detectRisk` · `generateReading`。

运行期闭包 = **32 个 TS 文件 / 378 KB**。
**部署时只拷 `server/` 会直接起不来** —— 这条以前只存在于 Dockerfile 的一句注释里，现在由 DEP-09e 断言锁住。

---

## 2. Recommended Production Architecture

```
                      ┌──────────────────────────┐
   浏览器 ──────────►  │  Arcana Frontend         │  静态托管 · 743 KB
                      │  SPA fallback → index.html│
                      └────────┬─────────────────┘
                               │ 同源 /api/tarot/*   ← 不需要 CORS
                               ▼
                      ┌──────────────────────────┐
                      │  Reading API Server      │  常驻 Node
                      │  DEEPSEEK_API_KEY 只在这里│  SSE · 超时 ≥180s
                      └────────┬─────────────────┘
                               ▼  HTTPS
                        api.deepseek.com

   浏览器 ──── HTTPS ──►  Artwork CDN / 对象存储   780 文件 · 137.2 MB
                        <ASSET_BASE>/<deckId>/{cards,thumbs}/<cardId>.webp?r=<rev>
```

# Recommended v1 Architecture

**前端与 Reading Server 同源单进程 + 牌面走对象存储。**

| 层 | 推荐 | 为什么 |
|---|---|---|
| **Frontend** | 与 Server 同进程托管（`npm start`），或静态托管 + `/api` 反代 | 同源 = **不需要 CORS、不需要预检、不需要跨域 Cookie 策略**。v1 拆域名只会换来复杂度 |
| **Reading Server** | **常驻 Node 进程**（VPS / 容器 / Render / Fly / Railway） | 深度解读实测 **141.3s** 且是 SSE 流式。Serverless 默认超时普遍 10–30s，**先确认这两个数字再选平台** |
| **Artwork** | **Cloudflare R2**（或任意对象存储 + CDN） | 137MB 每次发版不该重传；返修一张画只需传一个文件 + `rev+1`。R2 免出网费 |
| **Secrets** | 平台 Secret 管理，只给 Server | `release:check` REL-03 静态禁止 `src/` 出现任何 Key |
| **Git** | 牌面**长期不进主仓库**（当前已进，见 §12） | 代码仓库应该只有代码 |
| **Cache** | 牌面与哈希产物 `immutable`；`index.html` `no-cache`；`/api` `no-store` | 靠 `?r=<rev>` 与内容哈希失效 |

**成本敏感原则**：不引入 Kubernetes、微服务、消息队列、多数据库、复杂 Observability。
Arcana 是无状态的：没有数据库、没有账号、日记只在浏览器 localStorage。
v1 只需要**一个 Node 进程 + 一个对象存储桶**。

---

## 3. Frontend Deployment Unit

`deployment/frontend/` —— **15 个文件 / 742.9 KB**（JS 677.0 KB · CSS 75.9 KB）

**刻意不含 `assets/decks/`**：从 146 MB 降到 743 KB，发版不再重传 139 MB 静态图。
若选择牌面跟随前端部署，把 `deployment/artwork/` 原样放进 `frontend/assets/decks/` 即可 —— 目录结构逐段相同。

| 要求 | 说明 |
|---|---|
| **SPA fallback** | **必须** —— 否则刷新 `/reading` 会 404。13 条路由已由 DEP-14b 登记 |
| HTTPS | 必须 |
| 构建期变量 | `VITE_DECK_ASSET_BASE_URL` |
| 候选 | Cloudflare Pages / Vercel / Netlify / 任意带 SPA fallback 的静态服务器 |

---

## 4. Reading Server Deployment Unit

**没有独立目录 —— 从仓库直接部署。** 复制一份出来只会多一个会漂移的副本。

```
部署内容 = server/ + src/{data,features/reading,types} + package.json + package-lock.json
```

| 项 | 值 |
|---|---|
| Runtime | Node 22+ |
| 入口 | `server/index.ts`（`tsx` 直接跑 TS） |
| 启动 | `npm ci && npm start` |
| 端口 | `PORT`，默认 8787 |
| **健康探针** | **`GET /health`（本轮新增）** |
| 内存 | 512 MB 足够（无缓存、无数据库） |

### Streaming / Timeout Requirements —— 这一节决定平台选型

| 要求 | 数值 | 依据 |
|---|---|---|
| **SSE 流式** | 必须 | `/api/tarot/reading/stream` 是 `text/event-stream` |
| **请求超时** | **≥ 180s** | 服务端对上游超时 180s；深度解读**实测 141.3s** |
| 出站 HTTPS | 必须 | 调 DeepSeek |
| 冷启动 | 越短越好 | 叠加在本就 40–140s 的解读上 |

| 类别 | 适配性 |
|---|---|
| **常驻 Node 进程** | ✅ **推荐** |
| Serverless Function | ⚠️ 仅当可配 ≥180s **且**支持流式 |
| Edge Function | ⚠️ 需逐项确认 SSE 与 CPU 时长 |
| 纯静态托管 | ❌ 不可能 |

**不要因为平台流行就默认它合适** —— 先确认超时与流式这两条。

---

## 5. Artwork Deployment Unit

`deployment/artwork/` —— **780 文件 / 137.2 MB**

| | 数量 | 大小 |
|---|---:|---:|
| full（1080×1800） | **390** | 131.0 MB |
| thumb（240×400） | **390** | 6.3 MB |

五套：`legacy-moonlight`(r1) `legacy-classic`(r2) `legacy-forest`(r2) `legacy-celestial`(r1) `legacy-shadow`(r2)

**不含** DEV fixture 牌组、未开工牌组、masters、prompts、review、QA、logs（DEP-04f/04g 断言）。

### 三层资产边界

| 层 | 内容 | 去向 |
|---|---|---|
| **SOURCE** | `Arcana_Full_390/`：masters 1.1GB · qa 123MB · review · prompts · logs | ❌ 永不部署，建议独立归档 |
| **RUNTIME** | 390 full + 390 thumb | ✅ CDN / 对象存储 |
| **APP BUNDLE** | JS / CSS / HTML | ✅ 静态托管 |

### 完整性

`deployment/manifests/artwork-manifest.json` 记录每个文件的
`deckId · cardId · variant · path · rev · bytes · sha256`。

DEP-04c/04d/04e **逐文件**校验存在性、大小、sha256：**780/780 通过，0 missing，0 corrupted**。

> sha256 的用途不是防篡改，是**发布后能验证 CDN 上那份和这里这份是同一份**。
> 上传出错、传了一半、传成旧版 —— 这三件事只有逐文件哈希能查出来。

---

## 6. 137MB Artwork Decision

### 现状

牌面在上一轮已经**进了 git**（用户在 D4 后明确选择），且进了两份：

| 位置 | 文件数 |
|---|---:|
| `public/assets/decks/` | 790 |
| `streamlit_build/assets/decks/` | 790 |
| 已追踪 webp 合计 | **1580** |

### 生产推荐

# 牌面走对象存储，长期不进主应用仓库

理由不是「CDN 更快」，而是 **390 张手绘素材必然返修**：

| | 跟随应用部署 | 对象存储 |
|---|---|---|
| 返修一张画 | 重新构建 + 重新部署 138MB | 传一个文件 + `rev+1` |
| 每次发版 | 重传 139MB | 只传 743KB |
| CI / clone | 每次拉 137MB | 不拉 |

### 但本轮不动已有历史

- **禁止 `git lfs migrate`**（本轮遵守）· **禁止改写历史**（本轮遵守）
- `git-lfs` 当前仍**未安装**
- **未删除任何现有 Artwork 文件**

### 给 E2 的三条路

1. **推荐**：把牌面 sync 到对象存储 → 前端构建期指向 CDN → 之后新增/返修的牌面不再入库
   （历史里那份留着，不动它 —— 清理历史的收益不值得改写风险）
2. 若坚持牌面留在仓库：至少在**下一次新增素材前**装 `git-lfs` 并加 `*.webp filter=lfs`，避免继续膨胀
3. 维持现状：可行，但每次 clone / CI 都要拉 137MB+

---

## 7. CDN / Object Storage Contract

上传时把 `deployment/artwork/` **整个目录原样 sync** 到 `<ASSET_BASE>`。

```
<ASSET_BASE>/<deckId>/cards/<cardId>.webp?r=<rev>
<ASSET_BASE>/<deckId>/thumbs/<cardId>.webp?r=<rev>
```

| 要求 | 值 |
|---|---|
| Content-Type | `image/webp` |
| Cache-Control | `public, max-age=31536000, immutable` |
| 目录列举 | 关闭 |
| CORS | 同源则不需要；跨域时允许前端 origin 的 `GET` |

`immutable` 安全的前提是 URL 带 `?r=<rev>`。牌面文件名按设计恒定（= cardId），
没有 rev 的话资产在架构上不可更新。

**Vendor-neutral**：任何能按路径提供静态文件的对象存储都可以。

| 候选（**本轮不创建**） | 出网费 | 备注 |
|---|---|---|
| **Cloudflare R2** | **免** | 137MB 存储成本可忽略，v1 首选 |
| AWS S3 + CloudFront | 有 | 生态成熟 |
| Supabase Storage | 有额度 | 已在用 Supabase 时顺手 |

---

## 8. VITE_DECK_ASSET_BASE_URL

本轮把归一化逻辑从 `assetBaseUrl()` 里提成**可测纯函数** `normalizeAssetBase()`。

> **为什么必须提出来**：`assetBaseUrl()` 直接读 `import.meta.env`，Node 里没有这个对象，
> 于是它**在测试里只有「未配置」一条分支可走** —— 远端根、末尾斜杠、空白串这三种
> 真实会出事的输入一条都测不到。提出来之后，DEPLOY 组能拿任意输入直接喂给**产品代码本身**，
> 而不是喂给一份抄在测试里的规则副本。

### 契约

| 输入 | 输出 |
|---|---|
| 未配置 / `''` / `'   '` / `null` | `/assets/decks` |
| `https://assets.example.com/arcana/decks` | 原样 |
| `  <url>  ` | 去空白 |
| `<url>/` `<url>//` `<url>///` | 去掉**所有**末尾斜杠 |

### DEPLOY 组实测（13 项全通过）

| ID | 断言 | 结果 |
|---|---|---|
| DEPLOY-01 | 未配置回落 `/assets/decks`（四种空值） | ✅ |
| DEPLOY-02 | 远端绝对 URL 原样保留 / 空白清理 | ✅ |
| DEPLOY-03 | 末尾斜杠（含多重）全部去掉 | ✅ |
| DEPLOY-03b | 拼接结果不含多余 `//` | ✅ |
| DEPLOY-04 | full / thumb 路径形状 | ✅ |
| DEPLOY-04c | full 与 thumb 只差目录段 | ✅ |
| DEPLOY-04d | rev 是 query 而非路径段 | ✅ |
| DEPLOY-04e | 换远端根后路径结构逐段不变 | ✅ |
| DEPLOY-04f | thumb 规格与生成器共用同一常量 | ✅ |

**一个多余的斜杠就是 780 个 404**，而本地开发完全无感 —— 这就是这组断言存在的理由。

### ⚠️ 构建期生效

```bash
VITE_DECK_ASSET_BASE_URL=https://... npm run build   # ✅
VITE_DECK_ASSET_BASE_URL=https://... npm start       # ❌ 无效
```

---

## 9. Environment Variables

`.env.example` 已列全 **10 个变量**，每个都注明侧、是否必需、生效时机、示例。

| 变量 | 侧 | 必需 | 生效 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | **Server** | 生产必需 | 运行期 |
| `DEEPSEEK_MODEL` | Server | 否 | 运行期 |
| `READING_PROVIDER` | Server | 否 | 运行期 |
| `PORT` | Server | 否 | 运行期 |
| `DEEPSEEK_TIMEOUT_MS` / `MAX_TOKENS` / `BASE_URL` / `TEMPERATURE` / `REASONING_EFFORT` | Server | 否 | 运行期 |
| **`VITE_DECK_ASSET_BASE_URL`** | **Frontend** | 否 | **构建期** |

**DEP-11d 反向校验**：`server/env.ts` 里 `process.env.X` 读到的每一个变量，
都必须在 `.env.example` 里出现 —— 防止「代码读了但没人知道要配」。实测 9 个变量全部文档化。

---

## 10. Secret Audit

`deployment/secret-audit.json`（**只记录「有没有」，不记录任何密钥内容**）

| 检查 | 结果 |
|---|---|
| 前端包含 API Key | **false** |
| `dist/` 含 API Key | **false** |
| `src/` 含 API Key | **false** |
| 客户端含上游地址字面量 | **false** |
| `.env.example` 的 Key 为空 | **true** |
| `.env` 被 git 忽略 | **true** |
| findings | **0** |

扫描范围：`deployment/frontend` · `dist` · `src` · `server`。
另由 DEP-02d 断言**审计报告本身不含密钥形状字符串** ——
一份把密钥写进去的审计报告比不做审计更危险。

---

## 11. Git File Classification

| 类 | 内容 | 处置 |
|---|---|---|
| **A — MUST COMMIT** | `src/` `server/` `scripts/` `package.json` `vite.config.*` `tsconfig*` `.env.example` `README.md` `docs/` | ✅ 已入库 |
| **B — SHOULD COMMIT** | `deployment/README.md` · `deployment/production-checklist.md` · `qa/` 的脚本与 JSON 结论（352KB） | ✅ 已入库 |
| **C — DO NOT COMMIT** | `.env` · `node_modules/` · `dist/` · `.claude/` · `bench-out/` `ab-out/` `deep-stability-out/` · `qa/**/*.png`(151MB) · `deployment/{frontend,artwork,manifests}` 与 `secret-audit.json` | ✅ 全部已 ignore |
| **D — SOURCE ART ARCHIVE** | `Arcana_Full_390/`（1.4GB：masters / prompts / review / qa / logs） | ✅ 已 ignore。**建议独立归档，不与主应用仓库长期绑定** |
| **E — LARGE RUNTIME ARTWORK** | 390 full + 390 thumb | ⚠️ **当前已在库**（见 §6）。生产推荐走对象存储 |

### 恢复能力（§18 要求）

新开发者 clone 后如何得到 Artwork —— 本轮建立了机制而非口头约定：

```bash
npm run assets:check              # 780 个文件逐一核对：缺哪些、有没有空文件
npm run assets:sync -- --dry-run  # 打印恢复计划，不下载
```

实测：`本地 780 个 · 缺失 0 · 空文件 0 → 完整`。
配置 `ARCANA_ASSET_SOURCE` 后 `--dry-run` 会打印逐条 `<CDN URL> → <本地路径>` 的取回计划
（末尾斜杠同样被归一）。**真实下载留到 E2 确定 CDN 之后**，契约不用改。

---

## 12. .gitignore Changes（本轮）

```gitignore
# Deployment Package 的生成物 —— 四样都能一条命令重建
deployment/*
!deployment/README.md
!deployment/production-checklist.md
```

**没有** ignore `public/assets/decks` —— 本地开发目前仍依赖它，
在恢复机制（对象存储）真正就位之前 ignore 它会让新开发者拿不到牌面。这条留给 E2。

---

## 13. Deployment Package

```
deployment/
  frontend/                 15 文件 · 742.9 KB    → 静态托管
  artwork/                  780 文件 · 137.2 MB   → CDN / 对象存储
  manifests/
    artwork-manifest.json   780 条：path/rev/bytes/sha256
    frontend-manifest.json  15 条：path/bytes/sha256
  secret-audit.json
  README.md                 419 行（入库）
  production-checklist.md   入库
```

**工作区 3.7 GB → 实际需要部署 151 MB。**

生成 `npm run deployment:build` · 验证 `npm run deployment:check`。

---

## 14. Cache Policy

| 资源 | Cache-Control |
|---|---|
| `index.html` | `no-cache` |
| `assets/*.js` `*.css`（内容哈希） | `public, max-age=31536000, immutable` |
| 牌面 webp（带 `?r=`） | `public, max-age=31536000, immutable` |
| `/api/*` | `no-store` |
| `/health` | `no-store` |

单进程托管时前三条已由 `server/index.ts` 发出。

---

## 15. Security Headers

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: <ASSET_ORIGIN>;
  connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self';
  frame-ancestors 'none'; base-uri 'self'; object-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

**本轮只给推荐，不写进代码。** 两条必须知道的：

- `style-src` 需要 `'unsafe-inline'` —— 布局引擎把算出的像素写成内联 `style`，去掉会白屏
- 上线前先跑 **Report-Only** 再切强制 —— 过严的 CSP 在本地开发时完全看不出来

---

## 16. Privacy / Data Flow

```
用户问题
  └─► 浏览器（React）
        ├─► localStorage：session / 日记 / 设置   ← 只存这台设备，永不上传
        └─► POST /api/tarot/reading/stream
              └─► Reading Server（内存处理，不落盘）
                    └─► api.deepseek.com
```

| 事实 | 状态 |
|---|---|
| 日记存哪 | **浏览器 localStorage**。无账号、无云同步、无服务端存储 |
| 服务端落盘问题 | **否** —— 无数据库、无文件写入 |
| 服务端日志含问题 / Prompt | **否** —— 只打印启动信息、语气校验命中的短语、未捕获异常 |
| 错误日志 dump request body | **否** |
| 客户端 console 输出问题 | **否** —— 唯一的 `console.warn` 是 DEV 门控的资产加载失败提示 |

**本轮未增加账号、未增加云同步。**
将来接 APM 时禁止记录：API Key、完整 Prompt、完整用户问题、`Authorization` 头。
可以记：request id、耗时、状态码、provider 就绪状态。

---

## 17. Rollback

| 单元 | 机制 |
|---|---|
| **Frontend** | 保留上一版 `deployment/frontend/`，静态托管切回。产物带内容哈希，新旧可共存 |
| **Artwork** | 按 `rev` 回滚。当前：`moonlight=r1` `classic=r2` `forest=r2` `celestial=r1` `shadow=r2`。**旧 rev 文件不要删** |
| **Reading Server** | 重新部署上一个 commit。无状态、无数据库、无数据迁移 |
| **紧急降级** | `READING_PROVIDER=mock` 重启 —— 抽牌与 390 张原画完全可用，只有解读换成本地示例 |

### Artwork Revision 模型

`rev` 是**每套牌一个整数**，登记在 `src/decks/artwork/manifests.ts`，单张可用 `entry.rev` 覆盖。

- **绝不用随机数或时间戳** —— 那会让每次构建都失效全部缓存，且无法回滚
- 返修 → `rev + 1` → 传新文件（旧的保留）→ 重新构建前端
- 出问题 → `rev` 改回去 → 重新构建前端

---

## 18. Tests

| Check | 结果 |
|---|---|
| `engine:check` | ✅ 64 / 64 |
| `deck:check` | ✅ 338 / 338 |
| `layout:check` | ✅ 119 / 119 |
| `artwork:check` | ✅ 89 / 89 |
| `reading:check` | ✅ 118 / 118 |
| `release:check` | ✅ 45 / 45 |
| **`deployment:check`（本轮新增）** | ✅ **53 / 53** |
| **合计** | ✅ **826 / 826，0 失败** |
| `assets:check` | ✅ 780 / 780，缺失 0，空文件 0 |
| `tsc -b`（app） | ✅ 0 error |
| `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ 0 error |
| `npm run build` | ✅ PASS |

**未删除、跳过或放宽任何既有断言。** 773 → 826（+53 全部为新增）。

---

## 19. Deployment Check（53 项）

| 组 | 覆盖 |
|---|---|
| **DEP-01…03** | 生产构建存在 · 前端包结构 · **包内无 Key / 无上游地址** · 不含 390 张牌面 |
| **DEP-04…06** | manifest 可解析 · 覆盖 5 套 · **full=390 / thumb=390** · 逐文件 **存在 + 大小 + sha256** · 只有合法路径 · 无 DEV fixture · 记录 rev |
| **DEPLOY-01…04** | 本地根回落 · 远端根 · **末尾斜杠** · 拼接无 `//` · full/thumb 一致 · rev 是 query · 换根结构不变 |
| **DEP-09…10、15** | 启动命令 · 入口 · tsx · PORT · **`/health` 且不泄露** · API 路径齐备 · 未知 `/api/` 返 404 · **服务端值依赖 `src/`** |
| **DEP-11** | `.env.example` 完整 · Key 为空 · **`env.ts` 读的每个变量都被文档化** · `.env` 已忽略 · 两份文档存在 · **文档里的 npm 命令都真实存在** |
| **DEP-12…14** | **不含 masters / prompts / review / .env / node_modules** · **不含 QA 截图** · SPA fallback 落点 · 13 条路由已登记 |
| **DEP-02c…02f** | secret-audit.json 存在 · **报告本身不含密钥** · 结论全部为期望值 |

---

## 20. 本轮的产品代码改动（仅两处，均为部署所需）

| 改动 | 理由 |
|---|---|
| `server/index.ts` 新增 `GET /health` | 部署平台需要探针。`/api/tarot/config` 也能反映就绪，但它在 `/api/` 命名空间下，哪天业务接口加了鉴权或限流，探针会跟着挂。只返回 `status` / `readingProviderConfigured` / `provider`，**不返回 Key、baseUrl 或任何环境变量原文** |
| `src/decks/artwork/paths.ts` 提出 `normalizeAssetBase()` | 见 §8 —— 不提出来，远端根与末尾斜杠这两种真实会出事的输入**一条都测不到** |

两处都不改变既有行为：`assetBaseUrl()` 的返回值逐字节不变，826 项断言全绿。

---

## 21. Remaining Decisions（留给 E2）

1. **对象存储选型**：R2 / S3+CloudFront / Supabase / 其他。**建议 R2**（免出网费）
2. **Reading Server 托管**：VPS / 容器 / Render / Fly / Railway。**必须先确认超时 ≥180s 且支持 SSE**
3. **前端与 Server 是否同源**：**建议同源**（单进程或反代），避免 CORS
4. **域名**：`APP_ORIGIN` / `ASSET_ORIGIN`
5. **牌面是否停止入库**：见 §6 的三条路。**建议路线 1**
6. **模型档位**：`deepseek-v4-flash`(55–60s) vs `deepseek-v4-pro`(40–140s)
7. **限流**：当前是进程内内存限流，多实例需共享存储或交给网关
8. **CSP 强制时机**：先 Report-Only 跑一轮

---

# READY FOR PHASE E2 REAL DEPLOYMENT?

# YES

| 准入条件 | 结果 |
|---|---|
| Production package 完成 | ✅ `deployment/`：前端 743KB + 牌面 137.2MB + manifest + 审计 + 两份文档 |
| Secret audit PASS | ✅ findings 0；前端包 / dist / src 均无 Key；报告本身也不含密钥 |
| Git boundary 明确 | ✅ A–E 五类全部分类，`.gitignore` 已按结论收口 |
| Artwork strategy 明确 | ✅ 三层边界清晰；生产推荐对象存储；恢复机制 `assets:check` / `assets:sync` 已建立 |
| Frontend package PASS | ✅ 15 文件；无 Key、无源素材、无 QA 截图、无牌面；SPA 路由已登记 |
| Server startup contract PASS | ✅ 入口 / 命令 / 端口 / `/health` / 依赖边界（32 文件 378KB）全部锁进断言 |
| `deployment:check` PASS | ✅ **53 / 53** |
| `build` PASS | ✅ |

**本轮到 PACKAGE READY 为止。** 未登录任何云平台、未创建 Bucket、未上传 Artwork、
未创建 Production project、未绑定域名、未写真实 Secret、未改写 Git 历史、未 commit、未 push。

一处需要你知情：`deployment/` 里的生成物已被 `.gitignore` 收口，
但 **`deployment/README.md` 与 `production-checklist.md` 是显式放行的** ——
它们是部署人员唯一的说明书，必须入库。
