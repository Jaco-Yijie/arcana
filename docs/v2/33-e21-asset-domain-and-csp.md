# Phase E2.1 — 资产域名切换准备 与 CSP

> 本轮**没有**买域名、**没有**改产品逻辑、**没有**动线上环境变量。
> 做的是两件事：把「换域名」从一次考古式改造变成一步操作；
> 把「浏览器只跟本站说话」这句设计承诺交给浏览器强制执行。

---

## 1. 为什么先做代码侧

E2 结论里挡住 Public Beta 的两件事之一是：

> R2 用的是 `.r2.dev` 开发 URL。Cloudflare 自己标注它 rate-limited、
> 且**无法使用 Cache**。

真换域名需要一个已接入 Cloudflare 的域名，当前没有。
但等域名到位再动手，会连带发现三处已经写死在代码里的阻碍 —— 那时才改，
等于把一次「改个环境变量」的操作变成一次改代码 + 重新验证的发布。
所以本轮把这三处先拆掉。

---

## 2. 产物自述资产根

### 问题

资产根是 **构建期** 被 vite 静态替换进 bundle 的。而在此之前，
所有需要知道「这份产物用的是哪个根」的地方都在**猜**：

| 位置 | 原做法 | 会怎么坏 |
|---|---|---|
| `release:check` REL-12b | 从 bundle 文本里正则捞第一个 `http` 字面量，判据里写死 `r2\.dev\|cloudflarestorage` | 换成 `assets.example.com` 后，这条正则**不再认识自己的资产根** |
| CSP `img-src`（本轮新增） | —— | 若按运行期 `process.env` 推断：构建时设了、启动时没设，390 张牌**被自己的 CSP 全部拦掉** |

### 做法

`vite.config.ts` 新增 `emitBuildManifest` 插件，构建期产出：

```json
// dist/arcana-build.json
{
  "assetBase": "https://pub-17c0bf59be5e46f2a771ac7d2f068072.r2.dev",
  "assetMode": "remote",
  "localArtworkInBundle": false,
  "builtAt": "2026-09-06T03:13:05.167Z"
}
```

归一规则复用产品代码自己的 `normalizeAssetBase()` —— 不在构建配置里抄第二份。
（为此 `tsconfig.node.json` 从 `moduleResolution: nodenext` 改为 `bundler`：
`vite.config.ts` 本来就由 esbuild 打包，`bundler` 才与真实构建行为一致。）

### 实测

| 构建 | assetBase | assetMode | dist 体积 |
|---|---|---|---:|
| 不设变量 | `/assets/decks` | `local` | 151 MB |
| 设成 R2 根（带末尾斜杠） | `https://pub-…r2.dev`（斜杠已归一掉） | `remote` | **776 KB** |

`release:check` 现在直接读它，并新增两条断言：

- `REL-12b0` 产物自带 `arcana-build.json`
- `REL-12b1` manifest 声明的模式与产物实际状态一致（声明 remote 就不许有牌面，反之亦然）

**厂商中立性恢复**：判据里不再出现任何供应商名字。

---

## 3. CSP 与安全响应头

### 为什么这对 Arcana 是有意义的，而不是仪式

Arcana 的整条安全边界只有一句话：**浏览器永远只跟本站说话**。
`DEEPSEEK_API_KEY` 待在 Node 进程里，前端拿不到 ——
所以泄漏路径不是「读到 Key」，而是「让浏览器替我们把请求发到别处」。

`connect-src 'self'` 锁的正是这一条：任何被注入的脚本都无法把 session、
问题文本或解读内容 POST 到第三方；`script-src 'self'` 之后也无法从外域加载那段脚本。
这是把那句设计承诺变成浏览器**强制执行**的东西。

### 策略

`server/security.ts` · 请求入口统一挂载（一处覆盖静态 / API / SSE 三条出口）。

| 指令 | 值 | 理由 |
|---|---|---|
| `default-src` | `'self'` | 兜底 |
| `script-src` | `'self'` | 无内联脚本、无 CDN 脚本 |
| `style-src` | `'self' 'unsafe-inline'` | **必须**。framer-motion 与 React 通过 `style` 属性做动画 |
| `img-src` | `'self'` + **产物声明的**牌面来源 | 远端模式下 390 张牌跨源 |
| `connect-src` | `'self'` | 上面那一条 |
| `frame-ancestors` / `object-src` | `'none'` | |
| `base-uri` / `form-action` | `'self'` | |
| `report-uri` | `/api/csp-report` | 见下 |

其余响应头：`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、
`X-Frame-Options: DENY`、`Permissions-Policy`（全关）。

**HSTS 只在 `x-forwarded-proto: https` 时发。**
对 localhost 误发一次 HSTS，整台开发机上所有跑在 localhost 的项目都会被强制升级到 https。

### 为什么默认 Report-Only

CSP 是少数「配错了不会报错、只会让产品悄悄坏掉」的东西 ——
拦掉的是资源，表现是牌面空白或动画失效，而服务端一切正常、日志全绿。
390 张牌面走的又是跨源对象存储，正是最容易被拦的那一类。

`CSP_MODE` 环境变量：`report-only`（默认）/ `enforce` / `off`。
**切强制不需要改代码。**

### `/api/csp-report`

没有它，违规只出现在每个访问者自己的浏览器控制台里 —— 也就是我们永远看不到，
那这一轮观察等于没做。

上报体上限 16KB；同一条违规（`指令 ← 来源`）只记一次，避免重复渲染淹掉日志；
只记来源不记路径与 query，不把用户访问过的具体 URL 写进日志；
脏数据直接丢弃（这个端点无鉴权，不能因为它崩掉）。

---

## 4. 真实浏览器验证

远端资产模式产物 + 本地服务器 + 真实 R2，走完整流程：

**Home → Deck Library → 随缘抽一张 → 洗（3 次）→ 切（第 52 张）→ 摊牌 → 选牌 → 摆牌 → 翻牌 → 标准解读（SSE 流式）**

| 检查 | 结果 |
|---|---|
| 全流程 CSP 违规 | **0** |
| `/api/csp-report` 收到的上报 | **0** |
| 跨源牌面请求（Deck Library） | **25 个，全部来自 R2，全部 200** |
| 翻牌牌面渲染 | 正常（星币九·逆位，R2 原画） |
| SSE 流式解读 | 正常上屏，`connect-src 'self'` 未拦 |
| 控制台错误 | 0 |

三种 `CSP_MODE` 各自实测：

| 模式 | 响应头 | 其余安全头 |
|---|---|---|
| `report-only`（默认） | `Content-Security-Policy-Report-Only` | 在 |
| `enforce` | `Content-Security-Policy` | 在 |
| `off` | 无 | **仍在** |

上报端点实测：重复上报去重（3 次相同只记 1 条）、`inline` 这类非 URL 关键字正常处理、
脏 body 不崩、`/health` 保持 200。

---

## 5. `assets:origin` —— 对任意资产根做真实核验

```bash
npm run assets:origin -- https://assets.example.com
npm run assets:origin -- https://assets.example.com --samples 4
npm run assets:origin -- https://assets.example.com --all      # 全部 780 个
```

`assets:check` 查磁盘、`deployment:check` 查包，**都是离线的**。
这一组问的是唯一一个它们查不到的问题：
「把 `VITE_DECK_ASSET_BASE_URL` 设成这个 URL 之后，牌面真的能取回来吗」。

| 断言 | 查什么 |
|---|---|
| ORG-01 | 全部请求最终完成（每个最多重试 2 次） |
| **ORG-01b** | **需要重试才成功的对象数（观察项）** |
| ORG-02 | 全部 200 |
| ORG-03 | Content-Type 为 `image/webp` |
| **ORG-04** | **取回的字节确实是可解码 WebP（RIFF…WEBP 魔数）** |
| ORG-05 | sha256 与 `artwork-manifest.json` 逐字节一致 |
| ORG-06 | 字节数一致 |
| ORG-07 | `Cache-Control` 带 `immutable` |
| ORG-08 | **产品代码**拼出的 URL == manifest 记录的对象位置 |
| ORG-09 | 不存在的对象返回 4xx，而不是 200 + HTML 兜底 |
| ORG-10/11 | `cf-cache-status` 是否存在、二次请求的缓存分布（观察项） |
| ORG-12 | 单对象取回耗时中位数 |

ORG-04 是这组存在的理由：**对象存储配错时最常见的表现不是 404，而是 200 + 错误文档**。
`<img>` 拿到它只会静静显示裂图，而任何只统计状态码的检查全绿。

结果落盘到 `qa/asset-origin/<host>.json`，换域名前后可逐项对比。

### `.r2.dev` 的 before 基线（实测）

```
9 项断言  9 PASS  0 FAIL

ORG-01b  需要重试才成功的对象   2 / 20 个（共重试 2 次）—— 资产根在掉连接
ORG-10   Cloudflare 缓存层     响应里没有 cf-cache-status —— 请求未经过 Cloudflare 缓存
ORG-11   二次请求缓存分布       （无该响应头）×20
ORG-12   取回耗时中位数         615 ms
```

**两条硬证据**，不是引用 Cloudflare 的说明文字：

1. **它真的在掉连接。** 20 个并发抽样里偶有 2 个 `terminated`，重跑一次又全过 ——
   这就是 rate-limited 的实际表现。首次跑到时它让 ORG-01 直接红了，
   于是改成「重试后仍失败才判 FAIL，重试次数单独记为观察项」：
   一个偶尔红一次的 gate 最后一定会被当成噪音忽略，而掉包率恰恰是要改善的那个指标。
2. **它真的没有缓存层。** 20 个二次请求，没有一个带 `cf-cache-status`。

绑定 custom domain 之后，这两个数都应当改变 —— **ORG-01b 归零，ORG-10 出现 HIT**。
那就是这次迁移唯一的、可验证的收益。

---

## 6. 域名到位后怎么切（Runbook）

> 前提：一个已把 nameserver 指向 Cloudflare 的域名。R2 custom domain 免费。

### 6.1 Cloudflare 控制台

1. **R2 → `arcana-artwork` → Settings → Public access → Custom Domains → Connect Domain**
   填 `assets.<你的域>`。Cloudflare 自动建 CNAME 并签证书，等状态变 **Active**（通常几分钟）。
2. **确认层级**：真实对象是 `<root>/legacy-classic/cards/major-00.webp`，
   所以资产根就是 `https://assets.<你的域>` —— **不带** `/legacy-classic`、**不带** `/cards`。
   E2 在这里踩过：多一段路径 = 780 个 404，而本地开发完全无感。
3. **Cache Rule**（Rules → Caching Rules）：
   - 匹配：`Hostname equals assets.<你的域>`
   - Cache eligibility：**Eligible for cache**
   - Edge TTL：**Use cache-control header from origin**
     （对象自带 `public, max-age=31536000, immutable`，不要在这里另设一个数 —— 两处 TTL 迟早不一致）
   - Browser TTL：同上，沿用源站
4. **不要开 Polish / Mirage / 自动 WebP 转换**。牌面已经是压好的 WebP，
   再转一道只会改变字节 —— 而 ORG-05 逐字节比对 sha256，改了就红，那是对的。

### 6.2 验证（改任何东西之前先验）

```bash
npm run assets:origin -- https://assets.<你的域>
npm run assets:origin -- https://assets.<你的域>    # 再跑一次，看 HIT
```

期望与 before 基线的差异：

| | `.r2.dev`（已测） | custom domain（期望） |
|---|---|---|
| ORG-01b 需重试对象 | 2 / 20 | **0** |
| ORG-10 `cf-cache-status` | 无 | **有** |
| ORG-11 二次请求 | 全部无该头 | 首轮多为 MISS，**再跑一次转 HIT** |
| ORG-05 sha256 | 20/20 一致 | 必须仍然 20/20 |

**只有这一步全绿，才动线上。**

### 6.3 切线上

Render → arcana → Environment：

```
VITE_DECK_ASSET_BASE_URL = https://assets.<你的域>
```

改完必须 **Clear build cache & deploy** —— 这是**构建期**变量，
只重启不重新构建，产物里还是旧的根。

部署日志里应当出现：

```
[arcana] 资产根指向 https://assets.<你的域> —— 已从产物中移除本地牌面副本（dist/assets/decks）
[arcana] CSP=report-only · 牌面来源=https://assets.<你的域>
```

**第二行是本轮新增的关键确认**：它证明 CSP 的 `img-src` 跟着新根走了。
如果它还显示旧根或 `'self'`，说明产物与预期不符 —— 此时不要继续，先查构建。

### 6.4 线上复验

```bash
curl -s https://arcana-e190.onrender.com/arcana-build.json     # 产物自述的根
curl -sI https://arcana-e190.onrender.com/ | grep -i content-security
```

然后浏览器走一遍 Deck Library + 一次完整抽牌，确认：
牌面全部来自新域名、`cf-cache-status` 出现 HIT、CSP 零违规。

### 6.5 回滚

把 `VITE_DECK_ASSET_BASE_URL` 改回 `.r2.dev` 根，重新构建部署。
**R2 里的 780 个对象一个都不用动** —— custom domain 与 `.r2.dev` 指向同一个桶。

---

## 7. CSP 切 enforce 的时机

Report-Only 在线上跑够一轮真实流量（建议至少覆盖一次完整用户 Journey ×
若干次，且包含移动端），确认 Render 日志里 **`[arcana] CSP 违规` 零条**之后：

```
Render → Environment → CSP_MODE = enforce → 重启
```

不需要重新构建，不需要改代码。发现问题就把它改回 `report-only`。

---

## 8. 需要你在控制台做的事

### 8.1 吊销 `arcana-e2-upload` token（建议尽快）

E2 上传已完成，这个 token 不再需要，而它的值经过了那次对话。

```
Cloudflare Dashboard
  → R2 Object Storage
  → 右上 {} API  /  Manage API tokens
  → 找到 arcana-e2-upload（Object Read & Write，仅限 arcana-artwork）
  → ⋯ → Revoke
```

吊销**不会**影响已上传的 780 个对象，也不影响公开访问。
将来要再上传牌面，重新建一个即可。

### 8.2 域名

买域名 → nameserver 指向 Cloudflare → 回到 §6。

---

## 9. 本轮改动清单

| 文件 | 改动 |
|---|---|
| `vite.config.ts` | 新增 `emitBuildManifest`；资产根归一收敛到 `resolveAssetContract` 一处；复用产品代码的 `normalizeAssetBase` |
| `tsconfig.node.json` | `moduleResolution` → `bundler`，加 `@/*` 别名（让构建配置能 import 产品代码） |
| `server/security.ts` | **新增**。CSP + 安全响应头 + `/api/csp-report` |
| `server/index.ts` | 入口挂载安全头；新增 `/api/csp-report` 路由；启动日志打印 CSP 模式与牌面来源 |
| `scripts/asset-origin-check.ts` | **新增**。ORG 组 12 项 |
| `scripts/release-check.ts` | REL-12b 改读产物 manifest（去掉正则考古与供应商硬编码）；新增 REL-12b0/12b1 与 SEC 组 13 项 |
| `.env.example` | 记录 `CSP_MODE` |
| `package.json` | 新增 `assets:origin` |

**产品逻辑零改动。** 抽牌、牌义、解读、Prompt、UI 一行未动。

---

## 10. 回归

| 检查 | 断言数 | 结果 |
|---|---:|---|
| `engine:check` | 64 | ✅ |
| `deck:check` | 338 | ✅ |
| `layout:check` | 119 | ✅ |
| `artwork:check` | 89 | ✅ |
| `reading:check` | 118 | ✅ |
| `performance:check` | 24 | ✅ |
| `deployment:check` | 54 | ✅ |
| `release:check` | **60**（原 45） | ✅ |
| `assets:origin`（`.r2.dev`） | 9 | ✅ |
| `assets:check` | 780 个文件齐备 | ✅ |
| `tsc -b` / `tsc -p tsconfig.server.json` / `oxlint` | — | ✅ 0 |

**合计 875 项断言，0 失败。**

---

## 11. 状态

| E2 遗留项 | 本轮 |
|---|---|
| R2 自定义域名（E2.1） | **代码侧全部就绪 + runbook + 前后对比工具**；等域名 |
| Security headers / CSP | ✅ **完成**，Report-Only 上线即生效，切 enforce 只改环境变量 |
| 吊销 `arcana-e2-upload` token | ⏳ 需你在 Cloudflare 控制台操作（§8.1） |
| Render 计划升级 | 未动（$7/月决策留给你） |
| 仓库瘦身 / 模型档位 / 限流 | 未动 |

**READY FOR PUBLIC BETA?** 仍然 **NO** —— 挡路的还是那两件基础设施：
Render Free 休眠、资产走 `.r2.dev`。
但第二件现在只差一个域名，切换本身已是一步操作，且有前后对比证据。
