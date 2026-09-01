# Phase D3 — Release Polish & Production Readiness Report

> 目标：把 Arcana 从「完整可用的产品」推进到「可以部署给真实用户」。
> 本轮是 Release Engineering + Micro Polish，**产品结构冻结**：
> 首页、抽牌流程、语义层、随机算法、Reading Prompt、五套 Art Bible、牌阵、Artwork 一律未动。
>
> 全部实测：真实 Chrome（系统 Chrome 152）· 真实 390 张 Artwork · 真实 DeepSeek · 生产构建 + 生产服务器。
> 网络数字一律用 `PerformanceResourceTiming.transferSize` 口径 —— **缓存命中记 0**，不把缓存重复算成过网字节。

---

## 1. Release Architecture

```
                         ┌──────────────────────────────┐
  浏览器                  │  同源，只跟自家后端说话        │
   │                     └──────────────────────────────┘
   ├── GET  /                        → index.html（no-cache）
   ├── GET  /assets/*.js|css         → 内容哈希文件名（immutable 1y）
   ├── GET  <assetBase>/<deck>/…     → 牌面（immutable 1y，靠 ?r=<rev> 失效）
   └── POST /api/tarot/reading           ┐
       POST /api/tarot/reading/stream    │  Node 进程
       POST /api/tarot/followup          ├─→ DEEPSEEK_API_KEY 只存在于这里
       GET  /api/tarot/config            ┘        │
                                                  └─→ https://api.deepseek.com
```

| 层 | 实现 | 生产形态 |
|---|---|---|
| Frontend | Vite 8 静态产物（React 19 + framer-motion + react-router） | `dist/`，由同一个 Node 进程托管，或交给任意静态托管 |
| Reading | `server/` 自建反向代理（无框架，`node:http`） | `npm start` 单进程，默认 8787 |
| Artwork | `public/assets/decks`（默认）或 `VITE_DECK_ASSET_BASE_URL`（CDN） | 二选一，**构建期决定** |
| AI | DeepSeek `deepseek-v4-pro` / `deepseek-v4-flash` | 只在服务端调用 |

### Development 与 Production 两条路径

| | Development | Production |
|---|---|---|
| 启动 | `npm run dev` | `npm run build` → `npm start` |
| 前端 | Vite 5173（HMR，模块未打包，首屏 90 个 JS 请求） | 单进程 8787 托管 `dist/`，**5 个 JS + 1 CSS** |
| API | Vite `/api` 代理 → 8787 | 同进程直接处理，无代理 |
| 牌面 | Vite 直接从 `public/` 提供，`Cache-Control: no-cache` | `immutable, max-age=31536000`，gzip 只压文本类 |
| Key | `.env` → `server/env.ts` | 真实环境变量优先于 `.env`（`server/env.ts` 里 `process.env` 已存在就不被文件覆盖） |
| Provider | 无 Key 自动落 Mock，克隆下来直接能跑 | 有 Key 走 DeepSeek；`READING_PROVIDER=deepseek` 却无 Key 会**明确报错**，不静默降级 |

**开发态与生产态的数字差得很远，所以本轮所有结论都以生产态为准。**
例：Home 首屏在 dev 是 93 个请求 / 8474.9 KB，在生产是 **7 个请求 / 220.0 KB**。

---

## 2. Asset Delivery Strategy

### 三个方案的比较与结论

| | A. 跟随应用部署 | B. Git LFS | C. CDN / 对象存储 |
|---|---|---|---|
| 部署体积 | dist **138.1 MB** | 同 A（LFS 只解决仓库） | dist **0.7 MB** |
| 仓库 | 137 MB 永久进历史 | 指针进历史，需 LFS 配额 | 不进仓库 |
| 返修一张画 | 重新构建 + 重新部署整包 | 同 A | 只传一个文件，rev+1 |
| 冷启动 / 镜像 | 每次 CI 拉 137MB | 同上 | 镜像小，构建快 |
| 边缘分发 | 无 | 无 | 有 |
| 当前是否可用 | ✅ 已经在用 | ❌ **git-lfs 未安装** | ✅ 改一个环境变量 |

# 建议优先：C. CDN / 对象存储

**理由不是「CDN 更快」，而是「牌面会返修」。**
390 张手绘素材必然返修，而 A 方案下返修一张画要重新构建、重新部署 138MB。
C 方案下是上传一个文件、`rev+1`。这条差异会伴随产品整个生命周期。

**A 仍然是完全可用的兜底**，且是零配置默认值 —— 单机部署、Docker、HF Spaces 都能直接跑。

### 已经就绪的厂商中立机制

`VITE_DECK_ASSET_BASE_URL` 是**唯一**的资产根出口（`src/decks/artwork/paths.ts` 是全站所有资产 URL 的唯一来源）。

```
不配置        → /assets/decks                              （走 public/，零配置）
配置          → https://assets.example.com/arcana/decks    （原样上传目录即可）

<base>/<deckId>/cards/<cardId>.webp?r=<rev>     full   1080×1800
<base>/<deckId>/thumbs/<cardId>.webp?r=<rev>    thumb   240×400
<base>/<deckId>/deck/back.webp?r=<rev>          卡背（当前未交付，走程序化 SVG）
<base>/<deckId>/deck/cover.webp?r=<rev>         封面（当前未交付，回退到卡背）
```

**不绑定任何厂商**：任何能按路径提供静态文件的对象存储都可以，把 `public/assets/decks` 整个目录原样上传即可。本轮**没有创建任何云资源、没有上传任何资产、没有产生任何费用**。

### 实测验证（REL-06 端到端）

```bash
VITE_DECK_ASSET_BASE_URL="https://assets.example.com/arcana/decks" npx vite build
```

| 检查 | 结果 |
|---|---|
| 产物里出现远端根 | ✅ `https://assets.example.com/arcana/decks` |
| 本地默认根是否残留 | ✅ **0 处** —— 完全切换，不是「两条路径都在」 |
| 路径结构是否改变 | ✅ 只有前缀不同，`/<deckId>/cards/<cardId>.webp?r=3` 逐字节相同 |

> ⚠️ **一条必须写进部署手册的事实**：`import.meta.env` 由 Vite 在**构建期**静态替换。
> 所以 `VITE_DECK_ASSET_BASE_URL` 必须在 `npm run build` 时就设好，
> **在 `npm start` 时才设是无效的**。这不是缺陷，是 Vite 的机制，但它极易踩空。

---

## 3. Local vs CDN Behavior

| 场景 | 资产根 | 是否需要额外配置 | 实测 |
|---|---|---|---|
| `npm run dev` | `/assets/decks` | 无 | ✅ 390 张全部可解析（REL-01） |
| `npm run build` 不设变量 | `/assets/decks` | 无 | ✅ dist 内含 137.4 MB 静态资产 |
| `npm run build` 设了变量 | 远端绝对 URL | 需在**构建期**设置 | ✅ 产物已切换，本地根 0 残留 |

**没有配置 CDN 时，development 与 local build 一律正常使用本地 public 资产** —— 这条是 REL-05 锁住的。

---

## 4. Image Loading Strategy

### 4.1 本轮唯一的产品代码性能改动

**发现（实测）**：`sizeForWidth()` 把 88–143px 全归进 `md` 档，而 `md` 取 full。
于是 390×844 上翻牌页的牌宽 112 CSS px，却下载了 **1080×1800、约 250KB** 的原图 ——

```
112 CSS px × dpr2 = 224 设备像素          需要
1080 像素                                 实际下载
                                          → 过采样 4.8×
```

一次五张牌的解读因此过网 **1215.6 KB**，而这些像素**一个都没有被显示出来**。

**改动**：档位不再看粗档，改看**真实设备像素**。

```ts
needed = displayWidth × FRAME_INFLATION(1.08) × devicePixelRatio
variant = needed ≤ THUMB_SPEC.card.width(240) ? 'thumb' : 'full'
```

判据是**「够不够」而不是「省不省」**：只有当 thumb 的真实像素 ≥ 这张牌需要的设备像素时才降档 ——
**按构造不可能变糊**，省下来的全是本来就看不见的像素。

**`FRAME_INFLATION` 是被实测抓出来的，不是估的。**
1440×900 上布局宽写的是 `114.71px`，而 `<img>` 的实际绘制宽度是 `121.72px`（+6.1%，CardFrame 的边框）。
不修正就会在 1440 这一档选错档、**只在那一个视口糊一点** —— 这正是最难被发现的一类错，
第一版实测确实踩中了（`源/需 = 0.98`），修正后为 `4.43`。

### 4.2 七档全视口验证（生产构建实测）

| 视口 | DPR | 牌宽 CSS | 需要设备px | 取到档位 | 源像素 | 源/需 | 判定 |
|---|---:|---:|---:|---|---:|---:|---|
| 360×800 | 2 | 103 | 206 | **thumb** | 240 | 1.17 | ✅ 不会糊 |
| 390×844 | 2 | 112 | 224 | **thumb** | 240 | 1.07 | ✅ 不会糊 |
| 390×844 | **3** | 112 | 336 | **full** | 1080 | 3.21 | ✅ 不会糊 |
| 768×1024 | 2 | 142 | 284 | **full** | 1080 | 3.80 | ✅ 不会糊 |
| 1024×768 | 2 | 100 | 200 | **thumb** | 240 | 1.20 | ✅ 不会糊 |
| 1440×900 | 2 | 122 | 244 | **full** | 1080 | 4.43 | ✅ 不会糊 |
| 1920×1080 | 2 | 152 | 304 | **full** | 1080 | 3.55 | ✅ 不会糊 |

**DPR3 的真实手机照常取 full** —— 降档只发生在 thumb 确实够用的地方，
「省流量」没有以「牌面变糊」为代价。这一条专门验证过，因为只验对自己有利的那一半等于没验。

### 4.3 效果（m390 · DPR2 · 生产构建 · transferSize 口径）

| | Before | After | 变化 |
|---|---:|---:|---|
| Reveal 五张全翻开 · Artwork 过网 | **1687.1 KB** | **461.2 KB** | **−1225.9 KB（−72.7%）** |
| 其中 full 档过网请求数 | 5 | **0** | — |
| 整条流程累计过网 | **1925.6 KB** | **700.0 KB** | **−1225.6 KB（−63.6%）** |
| 过采样倍率 | 4.8× | **1.07×** | — |

### 4.4 `<img>` 加载策略审计（§5）

| 项 | 状态 | 说明 |
|---|---|---|
| `decoding="async"` | ✅ 有 | 解码不阻塞主线程（REL-11d） |
| `width` / `height` | ✅ 有（原图像素） | 浏览器据此预留空间，**消除 CLS**（REL-11c） |
| `object-fit` | ✅ `object-cover` | |
| fallback | ✅ 程序化牌面 | 见 §12 |
| `loading="lazy"` | ❌ **刻意没有，且加了也无效** | 见下 |

> **为什么不加 `loading="lazy"`**：这里的懒加载不在 `<img>` 上，而在**挂载时机**上。
> `useCardArtwork` 挂载即发请求，`<img>` 只在资产 ready 之后才渲染 ——
> 也就是说请求早就由 JS 发出去了，`loading="lazy"` 无从生效。
> 真正的门控是 `FlipCard` 的 `showFace`：**未翻开的牌根本不挂载牌面组件**。
> 这同时是 G-05 的防线（见 §5），比 `loading="lazy"` 强得多。
>
> 首个 Reveal Artwork 也因此不需要 `loading="eager"` —— 它本来就是用户点击后立即请求的。

---

## 5. FanSpread Asset Audit（最危险的地方）

**结论：FanSpread 摊开 78 张牌，新增 artwork 请求 = 0 个，新增字节 = 0 KB。**

| 阶段 | 累计 Artwork 请求 | 累计 Artwork 过网 |
|---|---:|---:|
| 进入 Deck Library | 25 | 416.2 KB |
| **摊开 78 张牌** | **25（+0）** | **416.2 KB（+0）** |
| 进入 Reveal（未翻牌） | **25（+0）** | **416.2 KB（+0）** |

两个原因叠加，任何一个单独成立都够：

1. **FanSpread 只渲染卡背，从不渲染正面**（`FanSpread.tsx:309` → `<CardBack simplified />`）。
   五套牌组的卡背与封面**当前没有栅格素材**，全部由 `DeckCardBack` 的程序化 SVG 绘制 ——
   SVG 不走网络，78 张牌的卡背成本是 **0 字节**。
2. **未翻开的牌不请求正面**。`FlipCard` 的 `showFace` 门控使牌面组件根本不挂载。
   这不只是性能约束，更是产品红线 **G-05**：提前请求正面 = 在 DevTools 的 Network 面板里**剧透下一张牌是什么**。

所以「78 张 1080×1800 同时加载」这件事**在当前实现里结构性地不可能发生**，
本轮**无需修复**，只需把它钉住 —— REL-08 / REL-10 / REL-10c / REL-10d 四条断言正是干这个的。

---

## 6. Deck Library Asset Audit

| 指标 | 实测 |
|---|---|
| Artwork 请求数 | **25 个**（5 套 × 5 张预览） |
| 全部档位 | **thumb**，full 请求 **0 个** |
| 过网字节 | **416.2 KB** |
| 加载失败 | **0** |
| 滚到页面底部后新增请求 | **0**（25 张一次性加载完，页面共 2.5–2.8 屏） |
| 封面 | 回退到程序化卡背，**0 字节** |

**不存在「五套 × 78」**：Deck Library 每套只展示 5 张预览牌，且一律走 thumb（REL-09 / REL-09b）。

---

## 7. Prefetch Strategy

# 本轮结论：不实现 prefetch。

§10 建议「用户完成抽牌后 prefetch selected cards only」。**这条与既有产品红线 G-05 直接冲突，必须说清楚而不是默默照做。**

抽牌完成时牌已经确定，此刻预取正面 = 在用户翻牌之前，
**DevTools 的 Network 面板里就能读出这五张牌是什么**。
G-05 的整条设计（`showFace` 门控、`DeckCardBack` 签名里没有 cardId、
`prefetchDeck` 签名里也没有 cardId）都是为了让请求序列**零信息量**。
为了省一次点击后的等待而把它拆掉，代价与收益完全不成比例。

而且降档之后收益也不成立了：单张牌现在是 **10–12 KB 的 thumb**（m390），
点击到显示之间本来就没有可感知的等待。

**整副牌预取（`prefetchDeck`）当前没有任何调用方**，且对 hybrid manifest 直接 return ——
也就是说整副预取实际从未发生。REL-10c / REL-10d 锁住的是「哪天有人接上它时，它只能取 thumb，且只能在牌桌之外调用」。

---

## 8. Cache Strategy

### 生产服务器实测（`curl -I`）

| 资源 | 实测 Cache-Control |
|---|---|
| `/assets/decks/…/major-00.webp?r=1` | `public, max-age=31536000, immutable` ✅ |
| `/assets/index-*.js`（内容哈希） | `public, max-age=31536000, immutable` ✅ |
| `/`（index.html） | `no-cache` ✅ |

### `immutable` 的前提在本项目里是怎么成立的

牌面文件名**按设计恒定**（= cardId，永不改）。这与 `immutable` 撞在一起本来会得到
「牌面在架构上不可更新」—— 返修一版画，老用户一年都看不到。

`?r=<rev>` 就是为此存在的：rev 改变 → URL 改变 → `immutable` 自然失效。
`rev` 是 **query 而不是路径段**，因为磁盘布局保持扁平（美术友好、`deck:check` 可双向校验），
静态服务器与 Vite 都不需要任何重写规则。REL-06d 专门锁住这一点 —— 上一次路径契约断裂正是写成路径段导致的。

### 交给部署层的推荐配置（不硬编码进 Vite）

```nginx
# 牌面与内容哈希产物
location ~* ^/assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
# SPA 入口：绝不能长缓存，否则发版后用户拿不到新 index.html
location = /index.html {
  add_header Cache-Control "no-cache";
}
```

对象存储（CDN 方案）上传牌面时设同一组头即可：
`Cache-Control: public, max-age=31536000, immutable`。

---

## 9. Service Worker

# 本轮不引入。

项目中原本也不存在。理由与 §12 的判断一致：390 张资产的缓存管理会迅速变得复杂
（失效、配额、版本漂移），而 **browser cache + `immutable` + CDN 已经覆盖了绝大部分收益**。
`environment-audit.json` 里如实记录 `serviceWorker.present = false`。

---

## 10. DeepSeek Security Audit

| 检查 | 结果 | 依据 |
|---|---|---|
| Key 不进 client bundle | ✅ | 用 `.env` 里的**真实 Key** 全量 grep `dist/`：**0 命中** |
| Key 形状不进产物 | ✅ | `sk-[A-Za-z0-9]{16,}` 扫 12 个产物：0 命中（REL-03b） |
| 不存在 `VITE_` 前缀的密钥 | ✅ | 扫 114 个 `src/` 文件：0 命中（REL-03） |
| `src/` 不读取 Key | ✅ | `DEEPSEEK_API_KEY` 在 `src/` 里 0 命中 |
| 不进 localStorage | ✅ | `src/` 无任何 Key 相关写入 |
| 不输出 console | ✅ | `describeConfig()` 只打印「已配置 / 未配置」，从不打印 Key 本身 |
| 不提交 repo | ✅ | `.gitignore` 含 `.env` / `.env.*` / `!.env.example`（REL-13d） |
| 浏览器不直连 `api.deepseek.com` | ✅ | `src/` 与 `dist/` 均 0 命中（REL-04 / REL-04b） |
| 浏览器只请求同源 | ✅ | 全部 `fetch` 均为 `/api/tarot/*` 相对路径（REL-04c） |
| `.env.example` 不含真 Key | ✅ | `DEEPSEEK_API_KEY=` 为空（REL-13b） |

**`GET /api/tarot/config` 实测返回**：`{"provider":"deepseek","model":"deepseek-v4-pro","ready":true}`
—— 只有前端确实需要的三个字段，**没有 Key、没有 baseUrl、没有任何可反推密钥的信息**。

安全边界收敛在一个文件：`server/env.ts`。Key 只在那里被读取，只存在于 Node 进程内存中。

---

## 11. Error / Rate Limit / Timeout

### 错误目录（`server/errors.ts`）

一条硬规则贯穿全部错误：**没有任何一种错误可以导致重新抽牌。**
所以每条文案都在重申「牌还在」（`CARDS_KEPT_NOTICE`）。

| 上游 | 映射 | 用户看到的文案 | 可重试 |
|---|---|---|---|
| 401 | `unauthorized` | 解读服务的密钥无效或已过期。**你抽出的牌仍然保留** | 否 |
| 403 | `forbidden` | 解读服务拒绝了这次请求。**你抽出的牌仍然保留** | 否 |
| **429** | `rate-limited` | **请求有点频繁，稍等一下再试。你抽出的牌仍然保留** | ✅ 是 |
| 5xx | `upstream-error` | 你抽出的牌仍然保留，可以重新尝试解读 | ✅ 是 |
| 超时 | `timeout` | 这次解读花的时间太长了。你抽出的牌仍然保留 | ✅ 是 |
| 无 Key | `missing-api-key` | 解读服务还没有配置好 | 否 |

**用户永远看不到 `HTTP 429` 这样的字样** —— 状态码只存在于 `statusFor()` 的映射表里，
前端渲染的是 `error.message`。实测 `POST /api/tarot/followup {}` 返回：

```json
{"ok":false,"error":{"code":"bad-request",
 "message":"这次解读的请求不完整。这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。",
 "retryable":false,"detail":"追问内容为空"}}
```

**Retry 只重试 AI**：question / cards / orientations / spread / session 全部保存在浏览器 session 里，
服务端从头到尾不碰它们（D2 已实测：错误注入后牌保留、可重试、`session.id` 不变）。

### Timeout Matrix

| 环节 | 超时 | 说明 |
|---|---:|---|
| server → DeepSeek | **180 s** | `DEEPSEEK_TIMEOUT_MS`。v4-pro 实测 60–130s，180s 是留了余量的值 |
| browser → server | **不自设** | 由服务端 180s 封顶 |
| streamlit transport | **240 s** | 外层 |
| 上游失败重试 | **不重试超时** | 单次就是 180s，自动重试意味着用户干等 6 分钟 |

**排序正确：`server 180s < streamlit 240s`。** 外层必须比内层长，否则外层会误杀正常请求。

**实测佐证**：深度解读单次跑了 **141.3s** 并正常返回 —— 这正是 §15 担心的区间。
浏览器侧没有自设超时，所以它安静地等到了结果；如果这里按常见的「前端 10s / 30s 超时」写，
这一次完全正常的深度解读会被我们自己杀掉。
浏览器侧刻意不自设超时 —— §15 担心的「DeepSeek 跑 20–30 秒，浏览器 10 秒自己断掉」在这里不会发生；
同时也不会无限等待，因为服务端 180s 一定会返回。**本轮无需修改。**

---

## 12. Artwork Failure Recovery

**注入：390 张资产全部 `route.abort('failed')`，走完整流程。**

| 页面 | 结果 |
|---|---|
| Home | ✅ 0.1s 可交互 |
| Deck Library | ✅ 5 套全部渲染，img=0 / 加载失败=0，走程序化 SVG；页面高度 2339px 与正常态一致；**无横向溢出** |
| Draw · 摊开 78 张 | ✅ 正常到达 |
| Reveal · 5 张全翻开 | ✅ 12.8s 完成，`svg=6`（程序化兜底），**布局不崩、无横向溢出、CTA 可点** |
| 正逆位 | ✅ 保留：「A 方向发展 · 逆位」「B 结果」 |
| console error | 只有注入的 `net::ERR_FAILED`，**无产品异常** |

分支是刻意区分的（REL-11 / REL-11b）：

- **已登记但这次没拿到** → 程序化牌面兜底。用户正在读自己的占卜结果，「加载失败」对他不可操作，牌阵的完整性才是全部意义。
- **从未交付** → 如实显示缺失态并写出期望路径。缺素材是待办事项，用漂亮占位图冒充成品更糟。

---

## 13. Home Initial Load

**生产构建 · m390 · transferSize 口径：**

| 项 | 数值 |
|---|---:|
| 总请求数 | **7** |
| 总过网 | **220.0 KB** |
| JS | 5 个 · 204.0 KB（解码 636.4 KB） |
| CSS | 1 个 · 14.2 KB（解码 75.7 KB） |
| **Artwork 请求** | **0 个** |
| **Artwork 字节** | **0.0 KB** |
| Web Font | **0 个 · 0 字节** |
| index.html | 510 B（gzip） |

# Home 完全不因为存在 390 张 Artwork 而变慢 —— 首屏 Artwork 请求为 0。

REL-07 锁住这一点：`HomePage.tsx` 不得挂载任何会请求牌面的组件。

**Slow 3G（400kbps / RTT 400ms）实测**：首页 **5.4s 可交互**（220KB / 400kbps ≈ 4.5s + RTT，符合预期）。

---

## 14. Bundle Size

| | Before D3 | After D3 | 变化 |
|---|---:|---:|---|
| 入口 chunk `index-*.js` | 292.0 KB | **297.5 KB** | +5.5 KB |
| JS 合计（未压缩） | 673.9 KB | **674.4 KB** | +0.5 KB |
| JS 合计（gzip） | — | **216.9 KB** | — |
| CSS（未压缩 / gzip） | 75.7 KB | **75.9 KB / 13.9 KB** | +0.2 KB |
| chunk 数 | 11 | **11** | — |
| dist 总计 | 148 MB | **138.1 MB** | — |
| 其中牌面 | — | **137.4 MB / 807 文件** | — |

- **JS 保持同量级**（+0.5 KB，来自 `pickVariant` 与键盘处理），远在 760 KB 预算内（REL-12c）。
- **390 张 Artwork 没有进任何 JS chunk**：产物中内联的 `data:image/webp|png|jpeg` = **0 个**（REL-12）。
- 牌面以**原路径静态存在**于 `dist/assets/decks`，未被打包器改名（REL-12b）—— 这正是它们能整体挪到 CDN 的前提。

---

## 15. Mobile Performance

360×800 与 390×844，生产构建：

| 项 | 360×800 | 390×844 |
|---|---|---|
| 牌面档位 | thumb（240 ≥ 206） | thumb（240 ≥ 224） |
| Reveal artwork 过网 | — | **461.2 KB**（原 1687.1 KB） |
| 横向溢出 | 否 | 否 |
| Deck Library 高度 | — | 2339px |
| console error | — | **0** |

**Artwork decode 不再造成页面卡顿**：每张牌的解码对象从 1080×1800（约 250 KB、约 190 万像素）
降到 240×400（约 11 KB、约 10 万像素）—— **解码工作量降到 1/19**。
这一条在低端安卓上的意义比省下的流量更大。

**Slow 3G 全流程**：Deck Library 首个牌组名 **0.8s** 可见（文字先于图片渲染），
25 张 thumb 全部加载成功、0 失败、无横向溢出、**0 console error**。
加载中不用整屏 spinner，牌面位置显示本牌组的卡面底色作为中性占位。

---

## 16. Desktop Performance

1024×768 / 1440×900 / 1920×1080，生产构建：

| 视口 | 牌宽 | 档位 | 源/需 | 图片质量 | 布局 | 横向溢出 |
|---|---:|---|---:|---|---|---|
| 1024×768 | 100px | thumb | 1.20 | ✅ 不模糊 | 稳定 | 否 |
| 1440×900 | 122px | **full** | 4.43 | ✅ 不模糊 | 稳定 | 否 |
| 1920×1080 | 152px | **full** | 3.55 | ✅ 不模糊 | 稳定 | 否 |

- **不加载过大的多余资源**：1024 上牌只有 100px，取 thumb（11 KB）而不是 250 KB 的原图。
- **不模糊**：1440 / 1920 上牌更大，需要的设备像素超过 thumb 的 240px，照常取 full。
- Right Panel（`CardMeaningSheet`）是文字面板，**不渲染任何牌面图**，不产生额外资产请求。

---

## 17. Accessibility

### 本轮修复的 Release 级缺陷

**翻牌无法用键盘完成。**

`FlipCard` 声明了 `role="button"` + `aria-label="翻开这张牌"`，但**只挂了 `onPointerUp`，也没有 `tabIndex`**。
后果：辅助技术把它读成一个按钮，用户按 Enter 却什么都不会发生，而且键盘**根本聚焦不到它**。
翻牌是这个产品的核心动作 —— D2-05 已经给「摆牌」补过同一条路径，**翻牌当时没有覆盖到**。

修复：`tabIndex={canReveal ? 0 : undefined}` + `onKeyDown`（Enter / Space，Space 需 `preventDefault` 否则页面会同时滚动）+ `focus-visible` 焦点环。
已翻开的牌退出 Tab 序列 —— 它不再是可操作控件。

**生产构建实测**：

```
[键盘] Tab 1 次后聚焦到: 翻开这张牌
[键盘] 按 Enter 后: ✅ 牌被翻开
```

（修复前同一脚本：`Tab 25 次后聚焦到: (无)` → `❌ Tab 无法聚焦到牌`）

### 其余项

| 项 | 状态 |
|---|---|
| 摆牌键盘路径 | ✅ D2-05 已修（空牌位是真 `<button>`，可 Tab / Enter） |
| Sheet Escape 关闭 | ✅ 捕获阶段监听，先于任何页面级快捷键 |
| Sheet 遮罩 / 点击外部 / 关闭按钮 | ✅ 四条关闭路径都有 |
| Dialog 语义 | ✅ `role="dialog"`，打开时 `panelRef.focus()` |
| Button names / aria-label | ✅ |
| Focus ring | ✅ `focus-visible:outline` / `focus-visible:ring` |
| reduced-motion | ✅ 全站 14 处 `useReducedMotion` |
| touch target <44px | ❌ 未做（首页「牌组 / 设置」27px）—— D1 SHOULD POLISH #11，不阻塞 Release |

---

## 18. Environment Variables

`.env.example` 已重写：**列出全部 10 个变量，每个都有说明，且没有任何真实 Key。**

| 变量 | 侧 | 默认 | 说明 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | 服务端 | 空 | **绝不能加 `VITE_` 前缀**。不填 = 走 Mock，克隆下来直接能跑 |
| `DEEPSEEK_MODEL` | 服务端 | `deepseek-v4-flash` | flash 约 55–60s；pro 质量更高但 90–180s |
| `READING_PROVIDER` | 服务端 | 自动 | 有 Key → deepseek；无 Key → mock；显式 deepseek 但无 Key → 明确报错 |
| `PORT` | 服务端 | 8787 | 生产下同一进程托管 `dist/` 与 `/api` |
| `DEEPSEEK_TIMEOUT_MS` | 服务端 | 180000 | 见 §11 |
| `DEEPSEEK_MAX_TOKENS` | 服务端 | 16000 | 推理 token 算在内，给小了 JSON 会被截断 |
| `DEEPSEEK_BASE_URL` | 服务端 | `https://api.deepseek.com` | |
| `DEEPSEEK_TEMPERATURE` | 服务端 | 0.7 | |
| `DEEPSEEK_REASONING_EFFORT` | 服务端 | 模型默认 | |
| **`VITE_DECK_ASSET_BASE_URL`** | **前端** | `/assets/decks` | **构建期生效**。设成绝对 URL 即切到 CDN |

> `.env.example` 里明确写了 `VITE_` 前缀的含义：它会进前端产物，**所以那里只能放公开信息**。

---

## 19. Startup / Production Commands

### 本轮修复的文档缺陷

README 教用户跑 **`npm run dev:all`**，而 `package.json` 里**根本没有这个脚本**：

```
$ npm run dev:all
npm error Missing script: "dev:all"
```

「按 README 敲一遍命令跑不起来」是最廉价也最常见的交付事故，而它对新人是 100% 命中的。
已改为真实存在的命令，并补上单独启动的两个：

```bash
npm run dev            # 前端 + 解读服务，一条命令全起（Vite 5173 · 解读服务 8787）
npm run dev:web        # 只跑前端
npm run dev:reading    # 只跑解读服务
```

顺带修正：README 写「解读评测 106 项断言」，实际是 **118 项**。

**新增 REL-14**：README 里出现的每一个 `npm run <script>` 都必须真实存在于 `package.json`。
这类错误不该靠人再发现一次。

### 生产

```bash
npm run build          # tsc → tsc(server) → deck/layout/artwork check → vite build
npm start              # 单进程同时托管 dist/ 与 /api，默认 8787

# 切 CDN：变量必须在构建期给，npm start 时才给是无效的
VITE_DECK_ASSET_BASE_URL=https://assets.example.com/arcana/decks npm run build
```

---

## 20. Git / 139MB Asset Recommendation

### 当前真实状态

| 项 | 实测 |
|---|---|
| 已被 git 追踪的 `*.webp` | **20 个**（`ethereal` 的 DEV fixture，非正式素材） |
| **未追踪的 `*.webp`** | **780 个 · 137 MB**（390 full + 390 thumb） |
| `.gitattributes` | Hugging Face 默认模板，**没有 `*.webp` 规则** |
| `git lfs` | ❌ **未安装**（`git: 'lfs' is not a git command`） |
| `Arcana_Full_390/`（美术源素材） | **1.4 GB，未追踪，且当时不在 `.gitignore` 里** |

### ⚠️ 风险

**390 张正式素材此刻还没有被提交** —— 这是一个**尚未关闭的安全窗口**。
一旦用普通 git 提交，137 MB 会永久写进历史，之后只能靠改写历史才能拿掉。
更紧迫的是 `Arcana_Full_390/`：**1.4 GB、未追踪、未忽略**，一次 `git add .` 就会全部进库。

### 本轮做了什么（只做了零风险的那一件）

把 `Arcana_Full_390/` 与 Release QA 的 PNG / 逐条网络日志加入 `.gitignore`。
**没有改写任何历史，没有运行 `git lfs migrate`，没有 `git add` 任何资产。**

### 推荐（需要你决定，本轮不擅自执行）

**首选：牌面不进 git，随 CDN 交付。**
配合 §2 的 C 方案 —— `public/assets/decks` 加入 `.gitignore`，资产由对象存储管理并单独版本化（`rev`）。
仓库回到「只有代码」，clone / CI 都不再拖 137 MB。

**次选：Git LFS，但必须在第一次提交之前做。**
```bash
git lfs install                                  # 目前未安装
echo "*.webp filter=lfs diff=lfs merge=lfs -text" >> .gitattributes
git add .gitattributes && git commit -m "chore: webp 走 LFS"
# 之后再 git add public/assets/decks —— 此时进的是指针，不是 137MB
```
**现在做不需要改写历史**（资产还没提交）；一旦先提交了再补，就只能 `git lfs migrate --import`，那会改写历史。

**不推荐：普通 git 直接提交 137 MB。**

---

## 21. Remaining P1 / P2

| 项 | 严重度 | 本轮处理 |
|---|---|---|
| **翻牌无法用键盘完成** | **P1** | ✅ **已修复并实测**（§17） |
| **Reveal 过采样 4.8×，一次解读多下 1.2 MB** | **P1** | ✅ **已修复并实测**（§4） |
| **README 教的命令不存在** | **P1** | ✅ **已修复**，并加断言防复发（§19） |
| `.env.example` 缺 `VITE_DECK_ASSET_BASE_URL` | P2 | ✅ 已补全（§18） |
| `Arcana_Full_390/` 1.4GB 未忽略 | P1（仓库） | ✅ 已加入 `.gitignore`（§20） |
| `legacy-moonlight/major-17` style / saturation drift | P1（美术） | ❌ **POST-RELEASE ART MICRO-POLISH** — 见下 |
| D2-07 桌面牌阵构图 | P1→审美 | ❌ **DEFER** — 见下 |
| Reading 顶部牌条右侧裁切（360×800） | P2 | ❌ 未做。D2 恢复复验已确认非 regression |
| 桌面 CardMeaningSheet 面板 95% 空白 | P2 | ❌ 未做 |
| 翻牌后面板自动弹出、压缩牌桌 | P2 | ❌ 未做 |
| CardMeaningSheet 未使用牌位信息 | P2 | ❌ 未做 |
| Journal 无 Deck identity / 无绝对日期 | P2 | ❌ 未做 |
| 深度解读 131s 无进度反馈 | P2 | ❌ 未做 |
| Cut 页三段连续 CTA | P2 | ❌ 未做 |
| Settings「自由桌面（即将推出）」残留 | P2 | ❌ 未做 |
| touch target <44px（首页 27px） | P2 | ❌ 未做 |
| 错误态标题与正文语义重复 | P2 | ❌ 未做 |

### `major-17`

`production.generated.ts` 里已登记 `QA_SEVERITY['legacy-moonlight/major-17'] = 'P1'` 与
`NEEDS_VISUAL_REVIEW`。按 §21 的原则，**不因为 Release Engineering 顺手重新生成**。

标记：**POST-RELEASE ART MICRO-POLISH。不阻塞 Release。**
它是单张牌的风格/饱和度偏移，不影响可用性、不影响解读、不影响布局；
重新生成属于美术流程，应该和其他返修一起批量做（这正是 `rev` 机制存在的意义）。

### D2-07

本轮按 §21 只做最终检查，**没有重写 `spreadLayout`**。
1440 / 1920 实测：布局稳定、无横向溢出、图片不模糊、档位正确。
剩余差距仍是「宽屏上牌阵行列几何要不要改」这个**未决的产品选择**
（与「牌 + 解读分栏」互斥，D1 §29 开放问题 #5）。

# 依然是审美优化 → DEFER。

---

## 22. Tests

| Check | 结果 |
|---|---|
| `engine:check` | ✅ **64 / 64** |
| `deck:check` | ✅ **338 / 338** |
| `layout:check` | ✅ **119 / 119** |
| `artwork:check` | ✅ **89 / 89** |
| `reading:check` | ✅ **118 / 118** |
| **小计（D2 基线）** | ✅ **728 / 728** |
| **`release:check`（本轮新增）** | ✅ **45 / 45** |
| **合计** | ✅ **773 / 773，0 失败** |
| `tsc -b`（app） | ✅ 0 error |
| `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ **0 error**（6 条既有 `react/only-export-components` warning） |
| `npm run build` | ✅ 通过 |

**没有删除、跳过或放宽任何既有断言。** 728 与 D2 收尾时逐项一致。

---

## 23. Release Check（`npm run release:check`）

零网络、零 token，几秒跑完。**45 项断言，0 失败。**

| ID | 断言 | 结果 |
|---|---|---|
| REL-00 | 至少 5 套可用牌组（防止断言被架空成遍历 0 个） | ✅ 5 套 |
| REL-01 | 390 张 full 的**运行期 URL**都能解析到真实文件 | ✅ 390 张 |
| REL-02 | 390 张 thumb 同上 | ✅ 390 张 |
| REL-02b | 每张可用牌都有 thumb（否则小尺寸会退回 full） | ✅ 390 / 390 |
| REL-02c/d | 卡背 / 封面：登记进 manifest 的必须在磁盘上 | ✅ 未登记 = 程序化，零网络 |
| REL-03 / 03b | `src/` 不读 Key；`dist/` 不含 Key 字面量 | ✅ |
| REL-04 / 04b / 04c | 不直连 `api.deepseek.com`；只请求同源 `/api/` | ✅ |
| REL-05 | 未配置时回落本地 `/assets/decks` | ✅ |
| REL-06 ×4 | full / thumb / back / cover 四种 URL 形状 | ✅ |
| REL-06b/c/d | 远端根拼接结构不变；无双斜杠；rev 是 query 不是路径段 | ✅ |
| REL-07 | 首页不挂载任何会请求牌面的组件 | ✅ |
| REL-08 | **FanSpread 只渲染卡背，不渲染任何正面** | ✅ |
| REL-09 / 09b | Deck Library 走 thumb；sm 档恒为 thumb | ✅ |
| REL-09c/d/e | 按真实设备像素选档；牌桌透传真实牌宽；修正 CardFrame 放大 | ✅ |
| REL-10 / 10b | 牌面请求由 `showFace` 门控（未翻开不请求正面） | ✅ |
| REL-10c/d | 整副预取只走 thumb，且只能在牌桌之外 | ✅ 当前无调用方 |
| REL-11 ×4 | 加载失败 → 程序化兜底；未交付 → 如实缺失；CLS；async decode | ✅ |
| REL-12 ×4 | 无内联 data URI；牌面原路径静态存在；JS / CSS 预算 | ✅ 674.4KB / 760KB |
| REL-13 ×4 | `.env.example` 存在、Key 为空、含资产根变量、`.env` 已忽略 | ✅ |
| REL-14 ×3 | **README 里的每个 npm 脚本都真实存在**；有 `start`；有 `release:check` | ✅ |

> **两次断言被架空的事故都发生在本轮，都被抓住了**：
> REL-01 第一版遍历 `ARTWORK_DECK_IDS`（五套*未开工*的牌组）→ 遍历出 0 张牌却全绿；
> REL-10c 第一版找的函数名是 `prewarm`（真名 `prefetchDeck`）→ 切片落空，断言恒真。
> 两处都补上了「找不到目标就失败」的下限保护。**一个恒真的断言比一个失败的断言更危险。**

---

## 24. DeepSeek E2E（生产构建 · 真实 Key）

真实链路，一步未跳，跑在 `npm start` 的生产服务器上：

```
Question → Deck → Spread → Focus → Shuffle → Cut → Draw → Place
        → Reveal → Reading → Follow-up 1 → Follow-up 2
```

| 项 | 结果 |
|---|---|
| Provider | `deepseek` · `deepseek-v4-pro` · 真实 Key |
| **标准解读** | ✅ **54.1s / 614 字** |
| **深度解读** | ✅ **141.3s / 603 字** —— 这一条同时验证了 §11 的 timeout matrix：141.3s 落在服务端 180s 之内，**浏览器没有自己先断掉** |
| 追问 1 | ✅ 有输出 · `followUps` 0→2 · 正文 **972 字** |
| 追问 2 | ✅ 有输出 · `followUps` 2→4 · 正文 **1378 字** |
| 追问是否真打模型 | ✅ `/api/tarot/followup` **2 次** |
| 是否重抽 / 重解读 | ✅ `/api/tarot/reading` **0 次** |
| session 不变量 | ✅ **指纹逐字节不变** |
| **Asset 档位变化是否影响 AI** | ✅ **完全无关**：资产与解读没有任何共享路径 —— `artwork:check` 的 FULL-ART-13 断言「Reading prompt 不引用任何 artwork 路径/资产模块」 |

---

## 25. Release QA 产物（`qa/release/`）

| 文件 | 内容 |
|---|---|
| `network-{home,deck-library,draw,reveal-*,reading,journal}.txt` | 逐页逐条网络请求记录 |
| `asset-request-summary.json` | 各页 artwork 请求数 / 字节，before-after，七档档位验证表 |
| `bundle-summary.json` | 每个 chunk 的 raw / gzip、预算、牌面体积、内联 data URI 计数 |
| `environment-audit.json` | 密钥边界、环境变量、资产根、缓存头、timeout matrix、字体、SW |
| `release-check.json` | 45 项断言逐条结果 |
| `transfer-audit.json` | transferSize 口径的过网字节与显示尺寸/源像素对照 |
| `resilience-{fail,slow}-*.png` | 资产全挂 / Slow 3G 的四页截图 |
| `desktop-variant-*.png` | 六档视口的翻牌页截图 |
| 驱动脚本 | `_network-audit / _audit-run / _transfer-audit / _desktop-variant / _dpr-probe / _resilience` |

**不含任何 API Key**（`environment-audit.json` 只记录「有没有泄漏」的布尔值，不记录 Key 本身）。

---

## 26. Remaining Deployment Decisions

**本轮没有创建任何云资源、没有上传任何资产、没有绑定域名、没有产生任何费用。**
只做到 **deployment ready**。以下需要你决定：

1. **牌面放哪**（§2）：跟随应用（零配置，dist 138 MB）还是 CDN / 对象存储（dist 0.7 MB，返修成本低）。
   **建议 CDN**，因为返修必然发生。选定后只需在构建期设一个环境变量。
2. **137 MB 素材与 git 的关系**（§20）：不进 git（配合 CDN）/ Git LFS（须在首次提交前）/ 普通提交（不推荐）。
   **这是一个正在关闭的窗口** —— 一旦提交，代价从「改一行配置」变成「改写历史」。
3. **模型档位**：`deepseek-v4-pro`（质量高，60–130s）还是 `deepseek-v4-flash`（55–60s）。
   `.env.example` 当前默认 flash，本轮 E2E 用的是 pro。
4. **限流策略**：当前 `tooManyRequests` 是进程内内存限流。多实例部署需要共享存储，或交给网关。
5. **`major-17` 返修**（§21）：与后续美术返修一起批量做，走 `rev+1`。
6. **D2-07 宽屏牌阵几何**（§21）：牌阵放大 vs「牌 + 解读」分栏，两条路互斥。

---

# READY FOR FINAL ACCEPTANCE?

# YES

逐条对照准入条件：

| 条件 | 结果 |
|---|---|
| **P0 = 0** | ✅ 无 P0。本轮发现的 3 项 P1（键盘翻牌 / 过采样 / README 命令）**全部已修复并实测验证** |
| **Build PASS** | ✅ `npm run build` 通过；tsc 0 error（app + server）；lint 0 error |
| **DeepSeek 真实 E2E PASS** | ✅ 生产构建 + 真实 Key：标准解读 54.1s/614 字，追问 ×2 均有新输出，`reading` 请求 0 次，session 指纹逐字节不变 |
| **390 Artwork 正常** | ✅ REL-01/02 逐张验证 390 full + 390 thumb 的**运行期 URL** 都能解析到真实文件 |
| **Asset loading 无明显灾难** | ✅ Home **0 张**；FanSpread 78 张 **+0 请求 +0 字节**；Deck Library 只用 thumb；整条流程过网 1925.6 → **700.0 KB（−63.6%）** |
| **Key 安全** | ✅ 真实 Key 全量 grep `dist/` **0 命中**；`src/` 不读 Key；浏览器只请求同源 `/api/`；`config` 接口只暴露 provider/model/ready |
| **Error / Retry 正常** | ✅ 401/403/429/5xx/timeout 全部映射到产品文案，**不暴露 HTTP 码**；每条都重申「牌还在」；Retry 只重试 AI |
| **Release Check 全部通过** | ✅ **45 / 45** |

**测试合计 773 / 773，0 失败，未删改任何既有断言。**

需要你知情的两件事：

1. **§20 的 git 窗口正在关闭。** 137 MB 素材尚未提交，现在决定 LFS 或不入库都还是「改一行配置」；
   提交之后就只能改写历史。`Arcana_Full_390/`（1.4 GB）本轮已加入 `.gitignore`，
   这是本轮唯一一处仓库策略改动，如果与你的意图不符，删掉那一行即可。
2. **§2 的 CDN 变量是构建期生效的**（Vite 静态替换 `import.meta.env`）。
   在 `npm start` 时才设置 `VITE_DECK_ASSET_BASE_URL` **不会有任何效果** —— 这一点极易踩空。
