# Arcana Deployment Package

> 这份包解决的是一个具体问题：仓库是 **3.7GB**（1.4GB 美术源素材 + 1.4GB git 历史 + 349MB QA + 167MB node_modules），
> 而真正需要部署出去的只有 **768KB 前端** 和 **137MB 牌面**。
> 把工作区整个交给部署人员，等于让他们自己猜哪些不能上传。这份文档回答的就是那些问题。

生成：`npm run deployment:build` · 验证：`npm run deployment:check`

---

## Architecture

```
                      ┌──────────────────────────┐
   浏览器 ──────────►  │  Arcana Frontend         │  静态托管
                      │  Vite 静态产物 768KB      │  SPA fallback → index.html
                      └────────┬─────────────────┘
                               │ 同源 /api/tarot/*
                               ▼
                      ┌──────────────────────────┐
                      │  Reading API Server      │  Node 常驻进程
                      │  DEEPSEEK_API_KEY 只在这里 │  SSE 流式 · 180s 超时
                      └────────┬─────────────────┘
                               │ HTTPS
                               ▼
                        api.deepseek.com

   浏览器 ──── HTTPS ──►  Artwork CDN / 对象存储        780 个 WebP · 137MB
                        <ASSET_BASE>/<deckId>/{cards,thumbs}/<cardId>.webp?r=<rev>
```

**三个部署单元互相独立**，可以分别发版、分别回滚。

| 单元 | 内容 | 大小 | 变更频率 |
|---|---|---:|---|
| Frontend | `deployment/frontend/` | 768 KB | 高 |
| Reading Server | 仓库的 `server/` + `src/` 子集 | 378 KB 源码 | 中 |
| Artwork | `deployment/artwork/` | 137.2 MB | 低（按 rev） |

---

## Frontend

### 内容

`deployment/frontend/` —— 15 个文件 / 741.4 KB（JS 679.1 KB · CSS 47.1 KB），来自 `dist/`。

> **含 Phase D5 的性能改动**（详见 `docs/v2/30-d5-performance.md`），部署时有两点与之相关：
> · **牌面预取**：用户摆好牌后前端会立即准备那 1/3/5 张的 thumb 与 full。
>   因此 CDN 上**两个档位都必须齐全** —— 少传 thumb 会让弱网下重新出现空白卡面。
> · **Standard 解读约 19 秒**（Deep 仍约 100 秒）。服务端超时要求不变，仍是 **≥180s**。

**刻意不含 `assets/decks/`**：牌面单独成包。前端因此从 146MB 降到 741.4 KB，
每次发版不再重传 139MB 静态图。

> 如果你选择「牌面跟随前端一起部署」（不用 CDN），把 `deployment/artwork/` 原样放进
> `frontend/assets/decks/` 即可 —— 两边目录结构逐段相同，不需要改任何代码。

### 托管要求

| 要求 | 说明 |
|---|---|
| 静态托管 | 纯静态文件即可，无需 Node |
| **SPA fallback** | **必须**：所有未知路径回 `index.html`，否则刷新 `/reading` 会 404 |
| HTTPS | 必须 |
| 构建期环境变量 | `VITE_DECK_ASSET_BASE_URL` 必须在 `npm run build` 时给 |
| 缓存头 | 见下方 Cache Policy |

需要 SPA fallback 的路由：

```
/  /decks  /question  /spread  /focus  /reading  /journal  /journal/:id  /share  /settings
/table/shuffle  /table/cut  /table/draw  /table/reveal
```

候选平台（**本轮不创建**）：Cloudflare Pages · Vercel · Netlify · 任意带 SPA fallback 的静态服务器。

### ⚠️ 一条极易踩空的事实

`VITE_DECK_ASSET_BASE_URL` 由 Vite 在**构建期**静态替换 `import.meta.env`。

```bash
# 正确
VITE_DECK_ASSET_BASE_URL=https://assets.example.com/arcana/decks npm run build

# 无效 —— 运行期设置不会有任何效果
VITE_DECK_ASSET_BASE_URL=... npm start
```

---

## Reading Server

### 为什么不能只拷 `server/`

服务端**值导入**了 `src/` 下的 6 个模块来重建可信的牌义上下文
（客户端传来的牌义一个字都不采信）：

```
src/data/deck/          cardById
src/data/spreads.ts     spreadById
src/features/reading/   classifyQuestion · selectDomainMeaning · detectRisk · mockReading
src/types/              reading · tarot · spread · session（类型，tsc 需要）
```

运行期闭包共 **32 个 TS 文件 / 378 KB**。部署时 `server/` 与这些 `src/` 子树必须同时在。

### 启动契约

| 项 | 值 |
|---|---|
| Runtime | Node 22+ |
| 入口 | `server/index.ts`（用 `tsx` 直接跑 TS，不预编译） |
| 启动命令 | `npm start` |
| 依赖安装 | `npm ci --omit=dev` **不够** —— `tsx` 在 `dependencies` 里，但服务端还需要 `src/`；直接 `npm ci` 最省心 |
| 端口 | `PORT`，默认 `8787` |
| 健康探针 | `GET /health` |
| 出站网络 | 需要访问 `api.deepseek.com` |
| 内存 | 小（无缓存、无数据库），512MB 足够 |

```bash
GET /health → 200
{"status":"ok","readingProviderConfigured":true,"provider":"deepseek"}
```

只返回这三项，**不返回 Key、baseUrl 或任何环境变量原文**。

### 托管要求 —— 这一节决定了平台选型

| 要求 | 数值 | 为什么 |
|---|---|---|
| **SSE 流式** | 必须支持 | `/api/tarot/reading/stream` 是 `text/event-stream` |
| **请求超时** | **≥ 180s** | 服务端对上游的超时就是 180s；深度解读实测 **141.3s** |
| 环境密钥 | 必须 | `DEEPSEEK_API_KEY` |
| 出站 HTTPS | 必须 | 调 DeepSeek |
| 冷启动 | 越短越好 | 冷启动叠加在本就 40–140s 的解读上 |

**因此不能用「响应超时 10–30s」的平台。** 这一条排除了相当一部分 Serverless 默认配置 ——
不要因为平台流行就默认它合适，先确认这两个数字。

| 类别 | 适配性 |
|---|---|
| **常驻 Node 进程**（VPS / 容器 / Render / Fly / Railway） | ✅ **推荐** —— 流式与长超时天然满足 |
| Serverless Function | ⚠️ 仅当可配置 ≥180s 超时**且**支持流式响应 |
| Edge Function | ⚠️ 需逐项确认 SSE 与 CPU 时长限制 |
| 纯静态托管 | ❌ 不可能 —— 需要服务端进程持有密钥 |

---

## Artwork

### 内容

`deployment/artwork/` —— **780 个文件 / 137.2 MB**

| | 数量 | 大小 |
|---|---:|---:|
| full（1080×1800） | 390 | 131.0 MB |
| thumb（240×400） | 390 | 6.3 MB |

五套牌组：`legacy-moonlight` `legacy-classic` `legacy-forest` `legacy-celestial` `legacy-shadow`

**不含**：DEV fixture 牌组、未开工牌组、masters、prompts、review、QA、logs。

### 卡背与封面

当前**没有栅格卡背/封面素材**，全部由程序化 SVG 绘制。
这不是缺失，而是「摊开 78 张牌产生 0 个网络请求」的原因 —— SVG 不走网络。
将来交付了栅格卡背，登记进 manifest 后放到 `<deckId>/deck/back.webp` 即可，
`deployment:check` 的 DEP-02c 会校验「登记了就必须在」。

---

## CDN Path Contract

上传时把 `deployment/artwork/` **整个目录原样 sync** 到 `<ASSET_BASE>` 下即可。

```
<ASSET_BASE>/
  legacy-moonlight/
    cards/major-00.webp … pentacles-14.webp     78 个
    thumbs/major-00.webp … pentacles-14.webp    78 个
  legacy-classic/    cards/ thumbs/
  legacy-forest/     cards/ thumbs/
  legacy-celestial/  cards/ thumbs/
  legacy-shadow/     cards/ thumbs/
```

运行期 URL 形状（由 `src/decks/artwork/paths.ts` 唯一产出）：

```
<ASSET_BASE>/<deckId>/cards/<cardId>.webp?r=<rev>
<ASSET_BASE>/<deckId>/thumbs/<cardId>.webp?r=<rev>
```

| 要求 | 值 |
|---|---|
| Content-Type | `image/webp` |
| Cache-Control | `public, max-age=31536000, immutable` |
| CORS | 若与前端不同源，需允许前端 origin 的 `GET`（`<img>` 加载本身不需要 CORS，但设了更稳妥） |
| 目录列举 | 应关闭 |

`immutable` 之所以安全，是因为 URL 带 `?r=<rev>`：返修一版画 → `rev+1` → 新 URL → 缓存自然失效。
牌面文件名按设计恒定（= cardId，永不改），没有 rev 的话资产在架构上不可更新。

### 供应商（**本轮不创建、不上传、不产生费用**）

| 候选 | 出网费 | 备注 |
|---|---|---|
| **Cloudflare R2** | **免出网费** | 137MB 存储成本可忽略；推荐 |
| AWS S3 + CloudFront | 有出网费 | 生态成熟 |
| Supabase Storage | 有额度 | 若已在用 Supabase 顺手 |
| 任意对象存储 + CDN | — | 契约是 vendor-neutral 的，换供应商只改一个环境变量 |

---

## Environment Variables

| 变量 | 侧 | 必需 | 何时生效 | 示例 |
|---|---|---|---|---|
| `DEEPSEEK_API_KEY` | **Server** | 生产必需 | 运行期 | `sk-…`（不填则走本地示例解读） |
| `DEEPSEEK_MODEL` | Server | 否 | 运行期 | `deepseek-v4-flash` / `deepseek-v4-pro` |
| `READING_PROVIDER` | Server | 否 | 运行期 | 不设=有 Key 走 deepseek；`mock` 强制示例 |
| `PORT` | Server | 否 | 运行期 | `8787` |
| `DEEPSEEK_TIMEOUT_MS` | Server | 否 | 运行期 | `180000` |
| `DEEPSEEK_MAX_TOKENS` | Server | 否 | 运行期 | `16000` |
| `DEEPSEEK_BASE_URL` | Server | 否 | 运行期 | `https://api.deepseek.com` |
| `DEEPSEEK_TEMPERATURE` | Server | 否 | 运行期 | `0.7` |
| `DEEPSEEK_REASONING_EFFORT` | Server | 否 | 运行期 | 留空 |
| **`VITE_DECK_ASSET_BASE_URL`** | **Frontend** | 否 | **构建期** | 不设=`/assets/decks`；CDN 填绝对 URL |

`VITE_` 前缀的变量**会被打进前端产物**，因此那里只能放公开信息。
`DEEPSEEK_API_KEY` **绝不能**加 `VITE_` 前缀 —— `release:check` 的 REL-03 会静态拦截。

---

## Production URL 配置

```
APP_ORIGIN     https://arcana.example.com
API_ORIGIN     （同源时可省略）
ASSET_ORIGIN   https://assets.example.com/arcana/decks
```

### CORS —— 推荐同源，不要拆

前端只请求相对路径 `/api/tarot/*`（`release:check` REL-04c 锁定）。
因此**只要前端与 Reading Server 同源，就完全不需要 CORS**。

两种同源做法：

1. **单进程托管**（最简单）：`npm start` 的服务器同时托管 `dist/` 与 `/api` —— 已经支持，零配置
2. **反向代理**：静态托管在前，`/api/*` 反代到 Reading Server

只有把前端和 API 拆到不同域名时才需要 CORS，那会连带引入预检、Cookie、CSP 的复杂度。
**v1 不建议拆。**

---

## Cache Policy

| 资源 | Cache-Control | 依据 |
|---|---|---|
| `index.html` | `no-cache` | 发版后必须立刻拿到新的 |
| `assets/*.js` `*.css` | `public, max-age=31536000, immutable` | 文件名带内容哈希 |
| 牌面 webp | `public, max-age=31536000, immutable` | URL 带 `?r=<rev>` |
| `/api/*` | `no-store` | 解读结果不可缓存 |
| `/health` | `no-store` | 探针必须反映当下 |

单进程托管时这些头已由 `server/index.ts` 发出（`index.html` → `no-cache`，`assets/` → `immutable`）。

---

## Security Headers（部署层配置，不写进代码）

```
Content-Security-Policy: default-src 'self';
  img-src 'self' data: <ASSET_ORIGIN>;
  connect-src 'self';
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  frame-ancestors 'none'; base-uri 'self'; object-src 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
```

> `style-src` 需要 `'unsafe-inline'`：应用有内联样式（布局引擎按算出的像素写 `style`）。
> 上线前先在 **Report-Only** 模式跑一轮再切强制 —— 一个过严的 CSP 会让页面白屏，
> 而这类问题在本地开发时完全看不到。

---

## Development

```bash
npm install
cp .env.example .env      # 填 DEEPSEEK_API_KEY；不填也能跑（本地示例解读）
npm run dev               # 前端 5173 · 解读服务 8787
```

不配置 `VITE_DECK_ASSET_BASE_URL` 时牌面走 `public/assets/decks`，**克隆下来直接能跑**。

---

## Production Build

```bash
npm ci
npm run build                                     # 本地资产模式
# 或
VITE_DECK_ASSET_BASE_URL=https://assets.example.com/arcana/decks npm run build

npm run deployment:build                          # 产出 deployment/
npm run deployment:check                          # 验证包
```

## Production Start

```bash
PORT=8787 DEEPSEEK_API_KEY=sk-... npm start
curl -s localhost:8787/health
```

---

## Smoke Test

```bash
npm run release:check       # 45 项：密钥边界、资产路径、加载时机、打包产物
npm run deployment:check    # 51 项：包内容、资产根契约、服务器契约、环境变量
npm run build               # 内含 deck/layout/artwork check
```

部署后手工确认：

1. `GET /health` 返回 `readingProviderConfigured: true`
2. 首页加载，**0 张牌面请求**
3. `/decks` 显示 5 套牌组、25 张缩略图
4. 完整走一次抽牌 → 翻牌 → 解读
5. 刷新 `/reading`（验证 SPA fallback）
6. 浏览器 Network 面板确认**没有**直连 `api.deepseek.com`

---

## Rollback

| 单元 | 机制 |
|---|---|
| **Frontend** | 保留上一版 `deployment/frontend/`，静态托管切回即可。产物带内容哈希，新旧可共存 |
| **Artwork** | 按 `rev` 回滚：`manifests/artwork-manifest.json` 里记录了每套牌当前的 rev（`legacy-moonlight=r1` `legacy-classic=r2` `legacy-forest=r2` `legacy-celestial=r1` `legacy-shadow=r2`）。**旧 rev 的文件不要删** —— 回滚就是把 manifest 的 rev 改回去并重新构建前端 |
| **Reading Server** | 重新部署上一个 commit。服务端无状态、无数据库，回滚没有数据迁移 |
| **紧急降级** | 设 `READING_PROVIDER=mock` 重启 —— 抽牌流程与 390 张原画完全可用，只有解读换成本地示例 |

### Artwork Revision 规则

`rev` 是**每套牌一个整数**，登记在 `src/decks/artwork/manifests.ts`，
单张牌可用 `entry.rev` 覆盖。

- **绝不用随机数或时间戳** —— 那样每次构建都会让全部缓存失效，且无法回滚
- 返修一批画 → 该套牌 `rev + 1` → 上传新文件（旧文件保留）→ 重新构建前端
- 出问题 → `rev` 改回去 → 重新构建前端

---

## What Must NOT Be Uploaded

| 不要上传 | 大小 | 原因 |
|---|---:|---|
| `Arcana_Full_390/` | **1.4 GB** | 美术源素材（masters 1.1GB / qa 123MB / web 132MB / review 17MB / prompts 4.6MB / logs 2.5MB）。运行期一张都不需要 |
| `qa/**/*.png` | 151 MB | QA 截图，可随时重跑复现 |
| `node_modules/` | 167 MB | 部署时 `npm ci` 重新装 |
| `.env` | — | **含真实密钥** |
| `dist/assets/decks/` | 139 MB | 与 `deployment/artwork/` 重复，走 CDN 时不需要 |
| `src/` `server/` | — | 只有 Reading Server 需要；**不要放进前端静态托管** |
| `streamlit_build/` | 151 MB | 只给 Streamlit 形态用，与本包无关 |

`deployment:check` 的 DEP-12 / DEP-13 会静态拦截前三类混进前端包的情况。

---

## Data Flow / Privacy

```
用户问题
  └─► 浏览器（React）
        ├─► localStorage：session / 日记 / 设置   ← 只存在这台设备，永不上传
        └─► POST /api/tarot/reading/stream
              └─► Reading Server（Node，内存中处理，不落盘）
                    └─► api.deepseek.com
```

| 事实 | 状态 |
|---|---|
| 日记存哪 | **浏览器 localStorage**，无账号、无云同步、无服务端存储 |
| 服务端是否落盘问题 | **否** —— 没有数据库、没有文件写入 |
| 服务端日志是否含问题/Prompt | **否** —— 只打印启动信息、语气校验命中的短语、未捕获异常 |
| 错误日志是否 dump request body | **否** |
| 客户端是否 console 输出问题 | **否** —— 唯一的 `console.warn` 是 DEV 门控的资产加载失败提示 |

> 若将来接入 APM / 日志聚合：**禁止**记录 API Key、完整 Prompt、完整用户问题、`Authorization` 头。
> 可以记：request id、耗时、状态码、provider 就绪状态。

---

## 目录

```
deployment/
  frontend/                  15 文件 · 768.2 KB   ← 上传到静态托管
  artwork/                   780 文件 · 137.2 MB  ← 上传到 CDN / 对象存储
  manifests/
    artwork-manifest.json    780 条：路径 / rev / 大小 / sha256
    frontend-manifest.json   15 条：路径 / 大小 / sha256
  secret-audit.json          只记录「有没有」，不含任何密钥
  README.md                  本文件
  production-checklist.md    上线勾选清单
```

`frontend/` `artwork/` `manifests/` `secret-audit.json` 是**生成物**（已 gitignore），
每次 `npm run deployment:build` 重建。`README.md` 与 `production-checklist.md` 是手写文档，入库。

**Reading Server 没有独立目录** —— 它从仓库直接部署（`server/` + `src/` 子集 + `package.json`），
复制一份出来只会多一个会漂移的副本。
