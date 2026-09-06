# Phase E2 — Real Deployment Report

> Arcana 第一次真正部署到公网。
> 全部数据来自真实云资源与真实公网 URL，非本地模拟。

---

## 1. Preflight

十项全部 PASS，但**拦下了两个会让部署失败或产生 138MB 死重量的问题**：

| 问题 | 处理 | 验证 |
|---|---|---|
| vite 把 `public/` 整个复制进 dist，牌面走 CDN 时 dist 仍是 **151MB** | `vite.config.ts` 新增 `dropLocalArtworkWhenRemote` 插件：**只有**配了远端资产根才移除 `dist/assets/decks` | 本地模式 151MB（兜底保留）· 远端模式 **772KB** |
| `REL-12b` 无条件要求牌面存在于 dist，与远端模式**直接冲突**，每次为 CDN 做的生产构建都会红 | 改为按资产模式分支判定 | 两种模式各自 PASS |

> 第二条值得单独说：一个在生产构建下必然失败的 gate，最后一定会被当成噪音忽略掉。

部署前全套回归：**851/851**，tsc 0、lint 0、build PASS。

---

## 2. Git Deployment Commit

```
commit 93b3e44  chore: prepare Arcana production deployment
推送     d620cef..93b3e44  main -> main
内容     49 文件 / 724 KB
```

提交前 Secret Audit（§14）：R2 Secret Access Key / Access Key ID / API Token / DeepSeek Key / `sk-` 形状字面量，
在仓库内**全部 0 命中**；`.env` 已被 `.gitignore` 忽略且不在暂存区。

未 force push，未改写历史，未执行 `git lfs migrate`。

---

## 3. Cloudflare R2

| 项 | 值 |
|---|---|
| Bucket | `arcana-artwork` |
| Location | Western North America (WNAM) |
| 上传源 | `deployment/artwork/` |
| 文件数 | **780**（full 390 + thumb 390） |
| 大小 | 137.2 MB |
| 耗时 | **53.4 秒**（12 路并发） |
| 失败 | **0** |
| Content-Type | `image/webp` |
| Cache-Control | `public, max-age=31536000, immutable` |

### 完整性核验（§5）—— 不只看「上传成功」

| 检查 | 结果 |
|---|---|
| 上传时 ETag 与本地 MD5 逐文件比对 | **780 / 780 一致** |
| `ListObjectsV2` 远端实际对象数 | **780**（full 390 · thumb 390） |
| 路径契约违规（非 `<deckId>/{cards,thumbs}/<cardId>.webp`） | **0** |
| 抽样：每套 2 full + 2 thumb，共 **20 个**，走**真实公开 HTTP GET** | 全部 **200** |
| 抽样 Content-Type | 全部 `image/webp` |
| 抽样 WebP 魔数（RIFF…WEBP） | 全部通过 —— 证明是可解码的图，不是错误页 |
| 抽样字节的 **sha256 与 `artwork-manifest.json` 比对** | **20 / 20 一致** |

**missing = 0 · corrupted = 0。**

> 平台侧不直接提供远端 sha256，所以这里是把字节**取回来自己算**，
> 而不是只记录 HTTP 200 就宣布通过。

只上传了 Runtime Artwork Package。`Arcana_Full_390/`（masters / prompts / review / qa / logs，1.4GB）
一个字节都没有上传。

---

## 4. Asset Root

```
https://pub-17c0bf59be5e46f2a771ac7d2f068072.r2.dev
```

# STAGING ONLY

Cloudflare 自己在该页面标注：*"This URL is rate-limited and not recommended for production.
Cloudflare features like Access and Caching are unavailable."*

层级已按真实对象路径反推确认：真实对象是
`<root>/legacy-classic/cards/major-00.webp`，因此 `VITE_DECK_ASSET_BASE_URL` 必须是根，
**不能**带 `/legacy-classic` 或 `/cards`。实测直接 GET 该对象返回 200 / 651156 B / `image/webp`。

正式版本应绑定 custom domain + Cloudflare Cache —— 留到 **E2.1**。

---

## 5. Render Service

| 项 | 值 |
|---|---|
| 名称 / 类型 | `arcana` · Web Service |
| Runtime | **Node**（不是 Docker —— 仓库里那个 Dockerfile 是给 HF Spaces 的，端口 7860，不适用） |
| Region | Oregon (US West) |
| Repo / Branch | `Jaco-Yijie/arcana` · `main` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/health` |
| Plan | **Free（$0/月，0.1 CPU，512MB RAM）** |
| Auto-Deploy | On Commit |
| Port | `process.env.PORT`（Render 注入 **10000**） |

### 环境变量

| 变量 | 作用域 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | **Server runtime** | 未加 `VITE_` 前缀；值不出现在任何产物、日志或本报告中 |
| `VITE_DECK_ASSET_BASE_URL` | **构建期** | R2 根。非 secret，允许进 client bundle |

### 构建结果

```
Deploy succeeded · 1m08s · source 93b3e44

artwork:check 全部通过 89 项断言，0 失败
vite build ✓ 532 modules
  index-CzDTRivC.js  301.51 kB (gzip 96.47 kB)
  index-yOBctJYE.css  48.25 kB (gzip  9.39 kB)
[arcana] 资产根指向 https://pub-...r2.dev —— 已从产物中移除本地牌面副本（dist/assets/decks）
[arcana] 解读服务已启动 http://localhost:10000
[arcana] provider=deepseek · model=deepseek-v4-pro · apiKey=已配置 · ready=true
==> Your service is live
```

构建日志里那行「已从产物中移除本地牌面副本」，就是 §13 体积 Gate 在生产构建里真实生效的证据。

---

## 6. Public App URL

```
https://arcana-e190.onrender.com
```

（Render 分配的实际域名带随机后缀，不是 `arcana.onrender.com`。未在代码中硬编码。）

---

## 7. Health

```
GET https://arcana-e190.onrender.com/health → 200
{"status":"ok","readingProviderConfigured":true,"provider":"deepseek"}
```

只返回三项。实测**不含** Key、baseUrl、任何环境变量原文。

SPA fallback：`/` 200 · `/reading` 200 · `/table/draw` 200。

---

## 8. Production Build

| | |
|---|---:|
| JS 入口 chunk | 301.51 kB（gzip 96.47 kB） |
| CSS | 48.25 kB（gzip 9.39 kB） |
| 牌面是否进入产物 | **否** |

**§13 体积 Gate：通过。** 应用产物远小于 1MB，而不是 138MB。

---

## 9. Artwork Remote Verification（§27）

在**真实公网 URL** 上跑完整流程（Slow 4G 限速、冷缓存）：

| 检查 | 结果 |
|---|---|
| Deck Library 牌面请求 | **25 个，全部来自 R2**，来自本站 **0** |
| 加载失败 | **0** |
| 预取（摆牌阶段） | **full 5 · thumb 5，全部来自 R2** |
| 翻牌 → 牌面可见 | **314 ms** · 空白帧 2/17 · thumb 兜底生效 |
| 翻牌牌面 src | `https://pub-…r2.dev/legacy-moonlight/thumbs/wands-01.webp?r=1` |
| **是否有任何牌面来自 Render** | **否** |

**Render 上直接请求 `/assets/decks/legacy-moonlight/cards/major-00.webp`**
返回 `text/html`（SPA fallback），而不是 webp —— **390 张牌面确实没有被打包部署到 Render。**

**D5 的性能优化在公网 + R2 组合下完好**：预取仍在摆牌完成时触发，翻牌 314ms 与本地 315–323ms 同量级。

---

## 10. Standard Reading Online（§29）

3 牌 × 3 次，直连公网 `/api/tarot/reading/stream`：

| Run | HTTP | 首字 | 首段可上屏 | 完成 | 输出 | delta | 最大事件间隔 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 200 | 1740 ms | 2076 ms | 19 865 ms | 1944 字符 | 1013 | 1016 ms |
| 2 | 200 | 2408 ms | 2693 ms | 24 098 ms | 2259 字符 | 1141 | 1654 ms |
| 3 | 200 | 1857 ms | 2308 ms | 23 429 ms | 2319 字符 | 1173 | 1129 ms |

| | min | median | max |
|---|---:|---:|---:|
| 首字 | 1740 | **1857** | 2408 ms |
| 首段可上屏 | 2076 | **2308** | 2693 ms |
| 总完成 | 19 865 | **23 429** | 24 098 ms |

**对比 D5 本地 median 19.2s → 线上 23.4s（+22%）。远未达到「> 2×」的调查阈值，无巨大 regression。**
差额是公网 RTT 与 Free 实例 0.1 CPU 的合理代价。**未因此修改 Prompt。**

浏览器端实测：Reading 首段 4080 ms · 完成 29 803 ms（含 React 渲染与 UI 轮询开销）。

---

## 11. Deep Reading Online（§30）—— **E2 核心 Gate**

```
HTTP 200 · 首字 86 401ms · 首段 86 602ms · 完成 103 927ms
输出 3785 字符 · delta 2091
最大事件间隔 84 888ms
```

# SSE 连接持续保持 103.9 秒，通过

最关键的一项：**中间有整整 84.9 秒完全没有任何 SSE 事件**（模型 thinking 阶段），
Render **没有**在 30s / 60s / 100s 任何一处切断连接。

这正是最危险的场景 —— 一个只按「有没有数据流动」判超时的平台会在这里断掉。**Render Free 扛住了。**

输出 3785 字符与 D5 本地的 3735 / 3761 同量级，**Deep 未被削弱**。

---

## 12. Follow-up Online（§31）

| | HTTP | 耗时 | provider | 输出 |
|---|---|---:|---|---:|
| 追问 1 | 200 | 14 422 ms | `deepseek` | 334 字符 |
| 追问 2 | 200 | 18 077 ms | `deepseek` | 307 字符 |

回答逐张点名牌与正逆位：

> 「**权杖首牌逆位**还在**现在**这个位置，说明那股想动的火苗没有熄灭，只是缺一个具体出口。」
> 「**教皇正位**还在**过去**的位置撑着……**现在**的权杖首牌逆位和**未来**的圣杯四正位……」

| 不变量 | 结果 |
|---|---|
| 有输出 | ✅ 两次均有 |
| 不重新抽牌 | ✅ 全程只调用 `/api/tarot/followup`，无 reading 请求 |
| cards 不变 | ✅ 逐字节相同 |
| orientations 不变 | ✅ 逐字节相同 |

---

## 13. Card Reveal Performance Online（§32）

| 场景 | 点击 → 牌面可见 | 空白帧 | 档位 | 来源 |
|---|---:|---|---|---|
| 公网 + R2 · Slow 4G 冷缓存 | **314 ms** | 2/17 | thumb（full 后台继续下） | R2 |

- 摆牌完成即触发预取（full 5 + thumb 5）
- 翻牌无明显空白（剩下 2 帧是翻牌动画固有，非等待）
- thumb 兜底正常，full 到达后替换
- 无 CLS（`<img>` 保留原图 width/height）

与 D5 本地 315–323 ms **同量级**，公网化没有让它退化。

---

## 14. Mobile Online（§33）

390×844 · dpr3 · 真实公网 URL，走完 Home → Deck Library → Spread → Draw → Reveal → Reading：

| 步骤 | 横向溢出 | 图加载失败 |
|---|---|---|
| home / deck-library / spread / draw / reveal / reading | **全部无** | **全部 0** |

Reading 首段 4080 ms · 完成 29 803 ms。

---

## 15. Console / Network（§34）

完整移动端 Journey 全程：

| 检查 | 结果 |
|---|---|
| console error | **0** |
| 失败请求（4xx / 5xx） | **0** |
| 意外 404 | **0** |
| **浏览器直连 `api.deepseek.com`** | **0 次** |
| mixed content（http:// 资源） | **0** |
| CORS 错误 | **0**（前端与 API 同源；牌面走 `<img>`，不需要 CORS） |
| broken SSE | **0** |

---

## 16. Error / Retry（§35）

用 route 拦截制造故障，**未删除任何真实 Secret**：

```
错误面板：这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。
控件：  看牌阵 | 存入日记 | 重新尝试解读 | 先回去看牌阵
```

| 检查 | 结果 |
|---|---|
| 暴露 HTTP 码 | ✅ **否** |
| 明说牌保留 | ✅ 是 |
| cards 保留 | ✅ `["pentacles-13","pentacles-01","major-03","wands-13","wands-03"]` |
| orientations 保留 | ✅ `["upright","reversed","reversed","reversed","reversed"]` |
| question / spread / session 保留 | ✅ **逐字节不变** |

---

## 17. Secret Security

| 检查 | 结果 |
|---|---|
| `DEEPSEEK_API_KEY` 进入 client bundle | ❌ 否 |
| 浏览器直连上游 | ❌ 否（0 次） |
| `/health` 返回密钥或环境变量 | ❌ 否 |
| `/api/tarot/config` 暴露内容 | 只有 `provider` / `model` / `ready` |
| 仓库内含任何凭证 | ❌ 否（提交前逐项 grep 验证） |
| **QA 产物含凭证** | ❌ 否（12 个 JSON 逐个扫描确认） |
| R2 凭证存放位置 | 仅在 `/private/tmp` 的 scratchpad（600 权限，仓库外），**未写入任何仓库文件** |

> ⚠️ **需要你处理**：R2 的 `arcana-e2-upload` token（Object Read & Write，
> 仅限 `arcana-artwork` 一个桶）值经过了本次对话。上传已完成，它不再需要 ——
> 建议去 Cloudflare → R2 → Manage R2 API Tokens 吊销。
> 吊销**不会**影响已上传的文件或公开访问。

---

## 18. Rollback

| 层 | 机制 | 当前可用性 |
|---|---|---|
| **Frontend + Server** | Render Deploys 页面选上一个 deploy → Rollback | ✅ 可用（当前只有 1 个 deploy，回滚要等下一次部署后才有意义） |
| **Artwork** | 按 `rev` 回滚。当前：`moonlight=r1` `classic=r2` `forest=r2` `celestial=r1` `shadow=r2`。旧 rev 文件不覆盖、不删除 | ✅ 机制就位；本轮是首次上传，尚无旧版本 |
| **紧急降级** | Render 环境变量加 `READING_PROVIDER=mock` 重启 —— 抽牌与 390 张原画完全可用，只有解读换成本地示例 | ✅ 可用 |
| **代码** | 重新部署上一个 commit（服务端无状态、无数据库、无数据迁移） | ✅ 可用 |

**不要靠改 main 分支去救线上。**

---

## 19. Cost / Plan Status

| 资源 | 计划 | 当前费用 |
|---|---|---|
| Render Web Service | **Free** · 0.1 CPU · 512MB | **$0** |
| Cloudflare R2 | 免费额度内（137MB / 10GB） | **$0**（Billable usage 显示 $0.00） |
| 域名 | 未购买 | **$0** |

**本轮未升级任何收费套餐、未购买域名、未创建其他云资源。**

### Render Free 的真实限制（实测，不是理论）

Render 明确提示：*"Your free instance will spin down with inactivity, which can delay requests by 50 seconds or more."*

- **不影响 E2 验收**：所有测量都在实例已唤醒后进行，冷启动没有被误记成 Arcana 的性能
- **影响真实用户**：闲置后第一个访问者要等 50 秒以上才看到首页

---

## 20. Remaining Production Decisions

1. **Render 计划**：Free 只适合测试。要给真实用户用，需升级到 **$7/月 Starter** 以消除休眠 —— 见下方判断
2. **R2 自定义域名**：绑定 custom domain + Cloudflare Cache，替换 rate-limited 的 `.r2.dev` staging URL（**E2.1**）
3. **吊销 `arcana-e2-upload` token**（§17）
4. **仓库瘦身**：仓库仍追踪 1580 个 webp（约 276MB）。牌面已在 R2，主仓库不再需要它们 ——
   但 `public/assets/decks` 目前仍是本地开发的兜底，移除前需要先接上 `assets:sync`
5. **模型档位**：当前线上是 `deepseek-v4-pro`。`deepseek-v4-flash` 会更快
6. **限流**：当前是进程内内存限流，多实例部署需共享存储或交给网关
7. **Security headers / CSP**：先 Report-Only 跑一轮再切强制

---

# REAL DEPLOYMENT SUCCESSFUL?

# YES

一个真实公网用户现在可以：打开 `https://arcana-e190.onrender.com` →
看到从 **Cloudflare R2** 加载的真实牌面 → 洗牌、切牌、摊牌、亲手选牌、摆牌、翻牌 →
拿到**真实 DeepSeek** 解读 → 连续追问两次 → 存入日记。

**全过程不依赖开发机。**

| Gate | 结果 |
|---|---|
| R2 780/780 上传 + sha256 抽样核验 | ✅ |
| 牌面确实不在 Render 上 | ✅ |
| Health / SPA fallback | ✅ |
| Standard 线上 ×3 | ✅ median 23.4s |
| **Deep SSE 撑过 100 秒** | ✅ **103.9s，含 84.9s 无事件间隔** |
| Follow-up ×2，牌不变 | ✅ |
| 移动端公网 | ✅ |
| console error / 失败请求 / 直连上游 | ✅ 全部 0 |
| 错误恢复，牌全部保留 | ✅ |
| Secret 安全 | ✅ |

# READY FOR PUBLIC BETA?

# NO —— 还差两件事，都不是产品问题

产品本身已经可以给真实用户用。挡住 Public Beta 的是**两处基础设施的 staging 属性**：

1. **Render Free 实例会休眠。** 闲置后第一个访问者要等 **50 秒以上**才看到首页 ——
   对第一次来的人，这就是「这网站坏了」。升级到 $7/月 Starter 即可解决。
2. **R2 用的是 `.r2.dev` 开发 URL。** Cloudflare 自己标注它 rate-limited、
   且**无法使用 Cache**。390 张牌面走一个不带缓存的限速 URL，
   在有并发访问时会成为第一个瓶颈。需要绑 custom domain（E2.1）。

这两件都不需要改一行产品代码。做完即可开放。

**当前状态适合**：给自己用、发给朋友试、演示。
**不适合**：公开发布、上社交媒体、任何会带来突发流量的场合。
