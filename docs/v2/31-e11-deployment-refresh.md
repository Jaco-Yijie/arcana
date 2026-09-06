# Phase E1.1 — Post-D5 Deployment Package Refresh Report

> 只做一件事：让 `deployment/` 与 D5 之后的源码重新同步。
> 未重做 E1、未继续修改产品、未重做性能优化、未部署任何云服务、未 commit / push。

---

## 1. D5 Source State

# D5 SOURCE STATE = CURRENT

逐项对着源码核验，不是照抄 D5 报告：

| # | D5 改动 | 位置 | 状态 |
|---|---|---|---|
| 1 | selected artwork prefetch | `src/features/table/useSelectedArtworkPrefetch.ts`（111 行） | ✅ |
| | · 摆满即触发 | `DrawPage.tsx` `placedCards.length === spreadForPrefetch.cardCount` | ✅ |
| | · Reveal 挂载兜底（覆盖 Resume 路径） | `RevealPage.tsx` | ✅ |
| | · 先 thumb 后 full | `if (plan.hasThumb) void plan.load('thumb')` | ✅ |
| | · 提前 `decode()` | `img.decode?.()` | ✅ |
| 2 | Reveal thumb → full fallback | `CardArtworkLayer.tsx` `fallbackThumb` | ✅ |
| 3 | Standard 篇幅预算 | `tarotReadingPromptV2.ts` 预算表 + 紧凑示例 | ✅ |
| 4 | Standard / Deep 区分 | 示例按模式分流 · 等待文案按模式分开 · 逐张牌流式上屏 | ✅ |
| 5 | D5 performance assertions | `scripts/performance-check.ts` 已注册进 package.json | ✅ |

---

## 2. Deployment Package Rebuild

先 `rm -rf dist && npm run build`（保证 dist 是 D5 后的产物），再 `npm run deployment:build`。

**旧包已被替换 —— 用入口 chunk 的哈希证明，不是靠时间戳：**

| | 旧包（E1，D5 之前） | 新包（E1.1） |
|---|---|---|
| 生成时间 | 2026-09-01T15:35:32Z | 2026-09-02T03:0x |
| 入口 chunk | `index-C6FV0Ryv.js` | `index-BMKzg7uw.js` → 最终 `index-CqVI3R7Z.js` |
| sha256 前 16 位 | `9c3f72bf6312a740` | `965b3476a2247eb9` |
| 字节 | 300 305 | 301 440 |

**新产物里能找到 D5 的代码痕迹：**

| 检查 | 结果 |
|---|---|
| `thumbs` 档位字面量 | ✅ 存在 |
| `hasThumb` 档位判定 | ✅ 存在 |
| 「深度解读比较完整」（按模式分开的新文案） | ✅ 存在 |
| 「这次解读比较完整，通常需要 1–2 分钟」（旧的无条件文案） | ✅ **已消失** |

> 静态 grep 只能证明代码被打进去了，不能证明行为。行为验证见 §9。

---

## 3. Frontend Package

| 项 | 数值 |
|---|---:|
| 文件数 | **15** |
| 总大小 | **741.4 KB** |
| JS | **679.1 KB**（11 个 chunk） |
| CSS | **47.1 KB** |

包内不该有的东西，逐项确认：

| | |
|---|---|
| `.env` | ✅ 无 |
| masters / prompts / review | ✅ 无 |
| `node_modules` | ✅ 无 |
| QA 截图（PNG） | ✅ 无 |
| 牌面 webp（应在独立包） | ✅ 无 |

### ⚠️ 顺带查清了一个 CSS 体积漂移问题

新包的 CSS 是 47.1 KB，而 E1 那份是 **75.9 KB**。差了 28 KB，值得查清而不是当作正常波动。

**根因**：Tailwind v4 默认扫描整个项目（除 `.gitignore` 掉的路径）。
`streamlit_build/` 是一份**已提交**的应用产物副本（Streamlit Cloud 不跑 npm build，必须提交），
于是它也被当成源码扫了，凭空多生成 CSS。

实测：

| 条件 | CSS |
|---|---:|
| `streamlit_build/` 在场（含当前产物） | 51 853 B |
| 把 `streamlit_build/` 暂时移走 | **48 250 B** |
| E1 打包时（`streamlit_build/` 里是 **D2 之前的旧产物**） | 77 761 B |

也就是说 —— **发出去的 CSS 体积取决于仓库里有没有一份陈旧的产物副本，而不是取决于源码。**
那不该是一个可部署产物应有的性质：同一份源码，换台机器、换个构建顺序就可能产出不同的 CSS，
而多出来的那部分是为一份过期 bundle 生成的死样式。

**处理**：在 `src/styles/theme.css` 加一行 `@source not "../../streamlit_build";`
（Tailwind 4.3.3 支持）。`dist/` 与 `deployment/` 本来就被 `.gitignore` 排除，扫不到；
`streamlit_build/` 因为必须提交而躲不掉，所以显式排除。

**修正后：连续两次构建 CSS 均为 48 250 B，产出可复现。**

> 这是本轮唯一一处源码改动，属于构建配置层，不改变任何运行期行为 ——
> 850 项断言全绿，产物里少掉的只是给旧 bundle 生成的死样式。

---

## 4. Artwork Package

| 项 | 数值 |
|---|---:|
| full（1080×1800） | **390** |
| thumb（240×400） | **390** |
| 合计 | **780 个文件 · 137.2 MB** |
| sha256 覆盖 | **780 / 780** |
| missing | **0** |
| corrupted | **0** |

revisions（回滚依据）：`legacy-moonlight=r1` `legacy-classic=r2` `legacy-forest=r2`
`legacy-celestial=r1` `legacy-shadow=r2`

`deployment:check` 的 DEP-04c/04d/04e **逐文件**校验存在性、大小、sha256 —— 全部通过。

**未重新编码任何图片，未重新生成任何 Artwork。**

---

## 5. Secret Audit

用 `.env` 里的**真实 Key** 重新扫描新产物：

| 检查 | 结果 |
|---|---|
| 新 `deployment/frontend/` 含真实 Key | ✅ 无 |
| 新 `dist/` 含真实 Key | ✅ 无 |
| `sk-` 形状字面量（两处） | ✅ 无 |
| `DEEPSEEK_API_KEY` 标识符 | ✅ 无 |
| `api.deepseek.com`（浏览器不得直连） | ✅ 无 |
| `.env` 内容片段混入包 | ✅ 无 |

`deployment/secret-audit.json` 全部 check 为期望值，**findings = 0**。
报告本身不含任何密钥（DEP-02d 断言）。

**运行期佐证**（§9 的包上实测）：整个流程中浏览器发出的 API 调用只有
`POST /api/tarot/reading/stream` —— **没有任何到 `api.deepseek.com` 的请求**。

---

## 6. Performance Check

```
npm run performance:check → 全部通过  24 项断言，0 失败
```

**未因为 Deployment 重建删除或放宽任何 PERF 断言。**
PERF-01/01b/01c（预取时机与 decode）、PERF-02/02b（只取选中的牌 · G-05 未松动）、
PERF-03/03b/03c（thumb 兜底 · 同一 img 换 src · 无长 blur）、PERF-04（防 CLS）、
PERF-05…07（standard/deep 配置分流）、PERF-08…08g（流式上屏 · 无人为延迟）、
PERF-09/10 全部保持。

## 7. Deployment Check

```
npm run deployment:check → 全部通过  53 项断言，0 失败
```

覆盖：Frontend package · Artwork package · Secrets · Environment contract ·
Local asset URL · Remote asset URL · `/health` · Server start contract。

---

## 8. Full Regression

| Check | 结果 |
|---|---|
| `engine:check` | ✅ **64 / 64** |
| `deck:check` | ✅ **338 / 338** |
| `layout:check` | ✅ **119 / 119** |
| `artwork:check` | ✅ **89 / 89** |
| `reading:check` | ✅ **118 / 118** |
| `release:check` | ✅ **45 / 45** |
| `performance:check` | ✅ **24 / 24** |
| `deployment:check` | ✅ **53 / 53** |
| **合计** | ✅ **850 / 850，0 失败** |
| `assets:check` | ✅ 780 / 780，缺失 0，空文件 0 |
| `tsc -b`（app） | ✅ 0 error |
| `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ 0 error |
| `npm run build` | ✅ PASS |

**未删除、跳过或放宽任何断言。**

---

## 9. Production Build Runtime Verification

§7 要求「必须确认 D5 的改动在 Production Package 中同样有效」。
静态 grep 不够 —— D5 的结论是行为结论，就得在包上重新跑一遍行为。

**做法**：起一个只托管 `deployment/frontend` 的静态服务器（含 SPA fallback），
牌面从 `deployment/artwork` 提供，`/api` 反代到 `npm start` 的 Reading Server ——
与生产的同源部署形态一致。用 CDP 限速到 **Slow 4G**、冷缓存。

| # | §7 要求 | 实测结果 |
|---|---|---|
| 1 | selected cards 已确定 | ✅ 键盘路径选牌 + 落位成功 |
| 2 | full artwork preparation 被触发 | ✅ **落位完成 3.5s 内：full 1 个 · thumb 1 个** |
| 3 | Reveal 不等到点击才第一次请求 full | ✅ **点击 → 牌面可见 315 ms（full）· 空白采样帧 2/17** |
| | 预取范围 | ✅ **总数 2** —— 只有这一张牌的两档，**不是整副 78 张** |
| 4 | Standard 使用优化后的配置 | ✅ 单张牌 **首段 4587 ms · 完成 13 158 ms ·「1–2 分钟」未出现** |
| 5 | Deep 没被 Standard 优化误伤 | ✅ 见下 |

包上的 Standard 完成时间 13.2 s，与 D5 在源码上测的单张牌 13.3 s 一致 ——
**包与源码行为相同。**

### Deep 回归

| | D5 baseline | D5 after | E1.1 复测 |
|---|---:|---:|---:|
| 输出 | 3471 字符 | 3735 字符 | **3761 字符** |
| 首 delta | 86 707 ms | 79 722 ms | 102 468 ms |
| 总完成 | 101 116 ms | 101 839 ms | 128 631 ms |

**输出长度稳定（3471 → 3735 → 3761），Deep 没有被削弱。**
总时长的波动全部落在 thinking 阶段（首 delta 79.7 s → 102.5 s），
那是上游推理排队的波动，与本轮改动无关 —— 本轮没有碰任何 deep 配置。
PERF-05/06/07 从结构上锁住了 standard 与 deep 的配置分流。

---

## 10. Modified Deployment Files

### 重新生成（已 `.gitignore`，不入库）

```
deployment/frontend/                 15 文件 · 741.4 KB
deployment/artwork/                  780 文件 · 137.2 MB
deployment/manifests/artwork-manifest.json    780 条 · 全部带 sha256
deployment/manifests/frontend-manifest.json   15 条 · 全部带 sha256
deployment/secret-audit.json         findings 0
```

### 手写文档（入库）

`deployment/README.md` —— 只加了 6 行，不写成开发日志：

- Frontend 体积更新为实测值（741.4 KB / JS 679.1 / CSS 47.1）
- 一条部署相关提醒：**牌面预取会同时准备 thumb 与 full，
  所以 CDN 上两个档位都必须齐全 —— 少传 thumb 会让弱网下重新出现空白卡面**
- 一条时长说明：Standard 约 19 秒、Deep 约 100 秒；**服务端超时要求不变，仍是 ≥180s**

### 源码（一处，构建配置层）

`src/styles/theme.css` 加 `@source not "../../streamlit_build";` —— 见 §3。

---

## 11. Remaining E2 Decisions

E1 已定的架构继续有效，**本轮未重新讨论**：
Frontend + Reading Server 同源 · Artwork → 对象存储 · 服务端超时 ≥180s ·
`VITE_DECK_ASSET_BASE_URL` · vendor-neutral。

留给 E2：

1. **对象存储选型**（建议 Cloudflare R2，免出网费）
2. **Reading Server 托管**（必须先确认 **超时 ≥180s 且支持 SSE**）
3. **137 MB 牌面与 Git 的关系** —— 未执行 `git add` / `commit` / `push` / `git lfs migrate`，决策留给 E2
4. 域名：`APP_ORIGIN` / `ASSET_ORIGIN`
5. 模型档位：`deepseek-v4-flash` vs `deepseek-v4-pro`
6. 限流：当前是进程内内存限流，多实例需共享存储或交给网关
7. CSP 强制时机：先 Report-Only 跑一轮

---

# DEPLOYMENT PACKAGE CURRENT WITH D5?

# YES

- 入口 chunk 哈希已变（`9c3f72bf…` → `965b3476…`），旧包确实被替换
- 新产物含 D5 代码痕迹，旧的无条件「1–2 分钟」文案已消失
- **在包上实测**：预取触发（full 1 + thumb 1）、只取 2 个档位、点击到可见 315 ms、
  Standard 13.2 s 且「1–2 分钟」不再出现 —— 与源码上的 D5 结论一致

# READY FOR PHASE E2 REAL DEPLOYMENT?

# YES

| 准入条件 | 结果 |
|---|---|
| deployment package 已重新生成 | ✅ frontend 741.4 KB · artwork 780 文件 137.2 MB · manifest 全带 sha256 |
| `performance:check` PASS | ✅ 24 / 24 |
| `deployment:check` PASS | ✅ 53 / 53 |
| `build` PASS | ✅ 且**连续两次构建产出一致** |
| secret audit PASS | ✅ findings 0；运行期只请求同源 `/api/tarot/*` |

**850 / 850 断言通过**，0 typecheck error，0 lint error。
**未 commit、未 push、未创建任何云资源。**

一处需要你知情：本轮修掉了一个 CSS 体积随构建环境漂移的问题（§3）——
在此之前，同一份源码在不同机器上可能产出不同大小的 CSS，多出来的是给一份过期
bundle 生成的死样式。现在 CSS 只由源码决定。
