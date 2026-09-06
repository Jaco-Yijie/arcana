# Phase D5 — Perceived Performance & Standard Reading Speed

> 处理真实使用中发现的两个 Release P1：
> **P1-A** Card Artwork 显示等待明显 · **P1-B** Standard Reading 总等待时间过长。
>
> 全部实测：生产构建 + 真实 DeepSeek + 真实 390 张 Artwork。
> 牌面用 CDP 限速在 Fast 4G / Slow 4G / Slow 3G 三档下测量。
> 未修改 UI 结构、语义层、随机抽牌、五套 Deck，也未削弱 Deep Reading。

---

## 1. Executive Summary

| | Before | After | 变化 |
|---|---:|---:|---|
| **翻牌 → 牌面可见（Fast 4G 冷启动）** | 835 ms | **323 ms** | **−61%** |
| **翻牌 → 牌面可见（Slow 4G 冷启动）** | 1878 ms | **320 ms** | **−83%** |
| **翻牌 → 牌面可见（Slow 3G 冷启动）** | **6482 ms** | **318 ms** | **−95%** |
| **空白卡面帧（Slow 3G）** | **61/62** | **2/17** | 见 §8 |
| **Standard 总耗时（3 牌 · 5 次中位）** | 26 532 ms | **19 197 ms** | **−27.6%** |
| **Standard 首段可上屏（3 牌）** | 2005 ms | **1283 ms** | **−36%** |
| **Standard 输出长度（3 牌）** | 2968 字符 | **2120 字符** | −28.6% |
| **屏幕冻结时长（浏览器实测）** | **22.7 s** | **10.1 s** | **−56%** |
| **「1–2 分钟」误导提示** | 20.2 s 时出现 | **不再出现** | — |
| Deep 总耗时（回归） | 101 116 ms | 101 839 ms | 未受影响 |

两个问题的根因**都不是**我最初怀疑的那些：不是上游排队、不是 prompt 太大、
不是服务端缓冲、也不是 Standard 误用了 Deep 的推理配置（`thinking: disabled` 一直是生效的）。

---

## 2. Card Reveal Root Cause

**牌在摆放完成的那一刻身份就已经确定，但 full artwork 直到用户点「翻开这张牌」才第一次被请求。**

实测（Fast 4G 冷启动，改动前）：

```
落位完成           → 3.5 秒内 full 请求 0 个      ← 完全没有预取
点击「翻开这张牌」   → +271ms 才发起 full 请求
                   → 下载 72ms
                   → 牌面首次可见 835ms
                   → 其间 7/17 个采样帧是空白卡面
```

也就是说：**翻牌动画放完了，画还没到。**

排除的其他可能：

| 怀疑 | 实测结论 |
|---|---|
| A 网络下载慢 | ❌ Fast 4G 下 259 KB 只要 72 ms |
| B 图片 decode 慢 | ❌ 不是主因 —— 预取后同一张图 316 ms 就可见 |
| C URL resolve 太迟 | ❌ resolve 是同步纯函数 |
| **D Reveal 时才开始请求** | ✅ **就是它** |
| E 动画人为延迟 | ❌ 无最低等待时间（PERF-08g 锁住） |
| F 浏览器缓存没命中 | ❌ 冷启动本来就该没有 |
| G full 请求得太早/太晚 | ✅ **太晚** —— 晚了整整一个「用户决定点开」的时长 |

---

## 3. Card Timeline Before

| 网络 | 点击 → 牌面可见 | 空白采样帧 | full 何时发起 | 下载耗时 |
|---|---:|---|---:|---:|
| Fast 4G 冷 | 835 ms | 7/17 | 点击后 271 ms | 72 ms |
| Slow 4G 冷 | 1878 ms | **17/18** | 点击后 268 ms | 162 ms |
| Slow 3G 冷 | **6482 ms** | **61/62** | 点击后 268 ms | 436 ms |

Slow 3G 下**6.5 秒的空白卡面** —— 这正是用户报告的症状。

---

## 4. Selected Artwork Prefetch Implementation

新增 `src/features/table/useSelectedArtworkPrefetch.ts`。

**触发时机**：`DrawPage` 摆满最后一张时立即开始；`RevealPage` 挂载时再挂一次
（覆盖「Resume 直接恢复到翻牌页」这条不经过 DrawPage 的路径）。
`loadAsset` 按 URL 缓存 Promise，重复挂载不产生第二次请求。

**范围严格受限**：只取 `session.placements` 里的 1 / 3 / 5 张。
绝不预取整副 78 张，绝不预取未选中的牌。

### 与 G-05 的关系 —— 这一条必须说清楚

G-05 禁止的是「在牌翻开之前，让 Network 面板剧透**下一张牌是什么**」。
那条约束针对的是**牌堆里还没被选中的牌**：

- `FanSpread` 至今不请求任何正面（PERF-02b 锁住）
- `prefetchDeck` 至今没有调用方（REL-10c / REL-10d 锁住）

而这里预取的是**用户自己已经选中并摆好的牌** —— 它们的身份在用户放下那一刻
就由他自己的动作决定了，牌背朝上只是还没揭晓给眼睛看。
请求这几张不泄露任何「用户尚未决定」的信息。

### 先 thumb 再 full

```ts
if (plan.hasThumb) void plan.load('thumb').catch(() => {})   // 12.9 KB，先拿下
plan.load('full').then(async (asset) => {
  await img.decode?.()                                        // 解码也提前做掉
  setReadiness(ready)
})
```

thumb 中位数 12.9 KB，full 294.9 KB —— **23 倍差距**。
Slow 3G（400 kbps）下 full 要 5 秒以上，thumb 半秒内就到。
先把便宜的那档拿下来，翻牌那一刻至少有**同一张画**可显示。

`decode()` 让浏览器在图片上屏前完成解码，翻牌那一刻只剩合成；
不支持的浏览器退回 `onload`，行为不变。

---

## 5. Thumb → Full Fallback

`CardArtworkLayer` 在 full 未就绪时改用 thumb，而不是原来的一层卡面底色（那就是那片空白）。

| 要求 | 实现 |
|---|---|
| 比例相同 | 同一张画的两档，`--card-ratio` 一致 |
| 布局不变 | 同一个 `<img>` 换 `src`，`width`/`height` 仍是原图像素 |
| 不出现空白卡 | thumb 几乎总是先到 |
| full 到达后自然替换 | 同一元素换 src |
| 不重播翻牌动画 | `<img>` 始终挂载，动画在外层 |
| **不做长时间 blur 过渡** | **没有任何 transition** —— 用户要立刻看见牌，不是看糊牌慢慢变清楚（PERF-03c 锁住） |

240 px 的图放在 112 CSS px 的盒子里本来就不糊；D3 的档位规则（`FRAME_INFLATION × dpr`）不变。

---

## 6. Artwork Size Distribution

390 张 full，合计 131 MB：

| min | p50 | p75 | p90 | p95 | max | 平均 |
|---:|---:|---:|---:|---:|---:|---:|
| 113.1 KB | **294.9 KB** | 464.8 KB | 564.8 KB | 585.0 KB | 635.9 KB | 343.9 KB |

thumb：p50 **12.9 KB** · max 31.2 KB · 合计 6.3 MB

| 牌组 | p50 | max | 合计 |
|---|---:|---:|---:|
| legacy-shadow | 177.8 KB | 274.0 KB | 13.7 MB |
| legacy-moonlight | 240.2 KB | 316.3 KB | 18.4 MB |
| legacy-celestial | 294.1 KB | 384.8 KB | 22.5 MB |
| legacy-forest | 446.7 KB | 542.6 KB | 33.8 MB |
| **legacy-classic** | **564.8 KB** | 635.9 KB | **42.6 MB** |

# ARTWORK_SIZE_OUTLIER：0 张

判据是「> 3 × 平均值（1031.6 KB）」。最大的一张是 `legacy-classic/major-00` 635.9 KB，
只有平均值的 **1.85 倍** —— 分布很紧，**没有值得单独重新编码的离群项**。

> 值得记录但不属于离群：`legacy-classic` 的 p50 是 `legacy-shadow` 的 **3.2 倍**（564.8 vs 177.8 KB）。
> 这是画风差异（象牙纸面 + 暗金压边的细节密度天然更高），不是编码事故。
> 若将来要压体积，从这一套下手收益最大 —— **本轮不动**（禁止批量重新生成）。

---

## 7. Cold / Warm Cache Result

| 场景 | 点击 → 牌面可见 | 空白采样帧 | 实际取到的档位 |
|---|---:|---|---|
| Fast 4G 冷 | 323 ms | 2/17 | full |
| Fast 4G 暖 | **316 ms** | 2/17 | full |
| Slow 4G 冷 | 320 ms | 2/17 | full |
| Slow 3G 冷 | 318 ms | 2/17 | **thumb**（full 仍在后台下，到达后替换） |

冷暖几乎没有差别（323 vs 316 ms），说明**瓶颈已经不在网络**：
预取把下载挪到了用户点击之前，剩下的 316 ms 是翻牌动画本身把牌面转到正面所需的时间。

> 剩下的 2/17 空白帧是**结构性的**：翻牌动画前 ~200 ms 牌面还背对用户，
> 牌面组件尚未挂载。那不是等待，是动画。

---

## 8. Card Reveal Before / After

| 网络 | Before | After | 空白帧 Before → After |
|---|---:|---:|---|
| Fast 4G 冷 | 835 ms | **323 ms** | 7/17 → **2/17** |
| Slow 4G 冷 | 1878 ms | **320 ms** | 17/18 → **2/17** |
| Slow 3G 冷 | **6482 ms** | **318 ms** | **61/62 → 2/17** |

**blank-frame occurrences（扣除动画固有的前 2 帧）= 0。**

> **一处测量方法的更正，必须写下来。**
> 第一版把「冷缓存」实现成了 `Network.setCacheDisabled: true`。
> 那个设置下 `<img>` 元素无法复用预取已经下好的字节，每次都重新走网络 ——
> **任何预取策略在那种条件下都不可能生效**，测出来必然是「预取无效」。
> 那是测量方式造成的结论，不是产品行为。
> 已改成 `Network.clearBrowserCache`（会话开始时缓存为空，但缓存可用），
> 这才是真实用户第一次打开的样子。上表 Before / After 用的是**同一套修正后的方法**，
> Before 是把四个改动文件回退到 `HEAD` 后重新构建实测的，不是沿用旧数字。

---

## 9. Standard Reading Root Cause

**总耗时与输出长度线性相关。** Baseline 实测：

| 牌数 | 输出 | 总耗时 | 生成速率 |
|---:|---:|---:|---:|
| 1 | 1549 字符 | 16 315 ms | ~95 字符/秒 |
| 3 | 2968 字符 | 26 532 ms | ~112 字符/秒 |
| 5 | 4404 字符 | 38 919 ms | ~113 字符/秒 |

速率恒定在 ~113 字符/秒，**总耗时 = 输出长度 ÷ 速率**。

逐条排除 §15 列出的六种可能：

| 怀疑 | 实测结论 |
|---|---|
| A DeepSeek first token 慢 | ❌ 首 delta **868 ms 中位** |
| B Prompt 太大 | ❌ system 8223 字符但对同一模式恒定，上游可缓存 |
| C Standard 用了和 Deep 相近的推理配置 | ❌ **早已区分**：standard `thinking: disabled`（首 delta 0.9 s）vs deep `enabled`（首 delta **86.7 s**） |
| **D Standard 输出本身过长** | ✅ **就是它** |
| E 服务端缓冲导致没及时 flush | ❌ 3 牌一次就有 **1648 个 delta**，逐块推送 |
| F 前端等完整 Section 才显示 | ⚠️ **部分成立** —— 见 §16 |

### 为什么输出会那么长 —— 两个原因，第二个才是主因

1. **Prompt 明确要求不要短。** 原 `MODE_STANDARD_SECTION` 写着：
   > 「**标准不等于短、浅、保守。** 该说的话要说完，该下的判断要下。」

2. **示例本身就是长度锚点。** `OUTPUT_EXAMPLE` 正文 2598 字符，
   而模型的标准输出是 2968 字符 —— **几乎与示例等长**。
   光在文字里写「要精炼」敌不过一份摆在眼前的长样例：
   只改文字预算、示例不动时，实测只降了 **16%**（2968 → 2502）。

---

## 10. Standard vs Deep Configuration

| Config | Standard（改动前） | Standard（改动后） | Deep |
|---|---|---|---|
| Model | `config.model` | 同左 | 同左 |
| **Thinking** | `disabled` | `disabled` | `enabled` |
| max_tokens | 16000 | 16000 | 16000 |
| temperature | 0.7 | 0.7 | 0.7 |
| System prompt | 8223 字符 | **7962 字符** | 8509 字符 |
| 输出示例 | 共用 2598 字符的完整示例 | **专用 1675 字符紧凑示例** | 2598 字符完整示例 |
| 篇幅预算 | 无（且明确说「不等于短」） | **逐字段预算表** | 无上限 |
| relationships | 无上下限 | **最多 2 条** | 无上限 |
| alternativeInterpretations | 可选（模型常写） | **不输出** | 输出 |
| 典型输出（3 牌） | 2968 字符 | **2120 字符** | 3735 字符 |
| 首 delta | ~1.3 s | **0.87 s** | **86.7 s** |
| 总耗时 | 26.5 s | **19.2 s** | 101.8 s |

**推理配置本来就是分开的** —— §22 担心的「Standard 背着 Deep 的推理预算」不成立。

---

## 11. Standard Prompt / Output Budget Changes

`MODE_STANDARD_SECTION` 重写为「精炼但真正有用」，给出逐字段预算：

| 字段 | 标准模式的量 |
|---|---|
| readingTheme | 一个短句 |
| overallEnergy | 2–3 句 |
| cards[].interpretation | 每张 2–3 句 |
| cards[].connectionToQuestion | 每张 1–2 句 |
| relationships[] | **最多 2 条** |
| narrative | 4–6 句 |
| answerToQuestion | 3–5 句 |
| reflectionQuestions[] | 3 条 |
| alternativeInterpretations[] | **不输出** |

并明确列出要砍掉的东西：同一张牌多维度反复解释、复述牌义词典、
塔罗百科式原型科普、narrative 里再复述一遍每张牌、answerToQuestion 重复 overallEnergy、铺垫句。

**新增 standard 专用的紧凑示例**（`OUTPUT_EXAMPLE_STANDARD`，1675 字符）——
这是本轮最有效的一处改动，因为示例是比任何措辞都强的篇幅锚点。

**没有做字符串截断。** 全部在 Prompt 层减少生成需求。

**Deep 明确解除这些限制**（`MODE_DEEP_SECTION` 加了一句：标准模式的预算与
「不输出 alternativeInterpretations」在深度模式全部解除），实测 Deep 输出反而略增（3471 → 3735）。

### 未牺牲的东西

8 条硬约束（不做宿命预测、不替用户决策、不捏造未抽到的牌、orientation / position 正确…）
与「你的解释空间」整节**一字未动**。`reading:check` 的 118 项断言全绿。

---

## 12. Reasoning / Model Changes

# NONE

未更换模型，未新增 `STANDARD_MODEL` / `DEEP_MODEL` 分离，未调整 `thinking` 参数 ——
实测显示 standard 早已 `thinking: disabled`，首 delta 0.87 s，**上游不是瓶颈**。
换模型属于「不盲目换模型」明确劝阻的动作，且当前 provider 下没有实测证据支持。

---

## 13. Streaming / Buffering Audit

| 检查 | 结论 |
|---|---|
| SSE 响应头 | `text/event-stream` · `Cache-Control: no-cache, no-transform` · **`X-Accel-Buffering: no`** |
| 服务端是否攒批 | ❌ 否 —— `onContent` 每个 delta 立即 `res.write` |
| provider 首 token vs 浏览器首 chunk | 3 牌一次 **1648 个 delta**，逐块到达 |
| Vite dev proxy | 生产不经过；本轮全部测量在 `npm start` 单进程上 |
| 压缩中间件 | 无（SSE 未走 gzip 分支） |

**服务端缓冲不是问题。** 问题在前端只把两个字段上屏 —— 见 §16。

---

## 14. Standard × 5 Results（3 牌，改动后）

| Run | 首 delta | 首段可上屏 | 总完成 | 输出 |
|---|---:|---:|---:|---:|
| 1 | 1201 ms | 1523 ms | 20 187 ms | 2213 字符 |
| 2 | 868 ms | 1283 ms | 19 197 ms | 2120 字符 |
| 3 | 1094 ms | 1467 ms | 16 668 ms | 1889 字符 |
| 4 | 704 ms | 1066 ms | 20 561 ms | 2270 字符 |
| 5 | 853 ms | 1369 ms | 20 320 ms | 2120 字符 |

| | min | median | p80 | max |
|---|---:|---:|---:|---:|
| 首 delta | 704 | **868** | 1201 | 1201 ms |
| **首段可上屏** | 1066 | **1283** | 1523 | 1523 ms |
| **总完成** | 16 668 | **19 197** | 20 561 | 20 561 ms |

其他牌数（改动后单次）：1 牌 **13 288 ms** · 5 牌 **22 667 ms**。

---

## 15. Standard Before / After

| 指标 | Before | After | 改善 |
|---|---:|---:|---|
| 总完成（3 牌） | 26 532 ms | **19 197 ms**（中位） | **−27.6%** |
| 总完成（1 牌） | 16 315 ms | **13 288 ms** | −18.6% |
| 总完成（5 牌） | 38 919 ms | **22 667 ms** | **−41.8%** |
| 输出（3 牌） | 2968 字符 | 2120 字符 | −28.6% |
| 输出（5 牌） | 4404 字符 | 2693 字符 | −38.8% |

对照 §26 的产品目标：

| 目标 | 结果 |
|---|---|
| 首段可读文本 3–8 秒 | ✅ **1.3 秒中位**，优于目标 |
| Standard 总耗时 15–25 秒 | ✅ **19.2 秒中位**（p80 20.6 s）落在区间内；5 牌 22.7 s 也在区间内 |

> **Before 的 TTFB / 首段数据来自本轮 STEP 0 的实测**，不是从 D3/D4 报告里拿的 ——
> 那两份报告没有分离过 TTFB 与首段可上屏时间。D4 记录的「首次出文 40.1 s」
> 是浏览器每 2 秒轮询 `innerText.length > 300` 的结果，口径与本轮不同，**不作为 Before**。

---

## 16. First Meaningful Text Before / After

### 真正的感知问题在这里

API 层首段 2.0 秒就可上屏，但浏览器实测（390×844）：

**Before**
```
 4580ms  len= 211  骨架屏=3
 6605ms  len= 211  骨架屏=3     ← 屏上一个字都不变
   …（22.7 秒）…
20729ms  len= 248  骨架屏=3  ⚠「通常需要 1–2 分钟」
27282ms  完成
```

**模型一直在吐字（1648 个 delta），但一个字都没被显示出来** ——
前端只上屏 `readingTheme` 与 `overallEnergy` 两个字段，其余全部等到最后。

**After**
```
  543ms  len=  61
 2561ms  len=  82
 4580ms  len= 256
 6598ms  len= 357
 8614ms  len= 449
10629ms  len= 540
12649ms  len= 641      ← 每张牌写完就出现一张
22769ms  完成          ←「1–2 分钟」提示未出现
```

| 指标 | Before | After |
|---|---:|---:|
| 首段可读内容 | 1555 ms | 2058 ms |
| **屏幕冻结时长** | **22.7 s** | **10.1 s** |
| 完成 | 27 282 ms | 22 769 ms |
| 「1–2 分钟」提示 | 20 225 ms 出现 | **不再出现** |

### 两处改动

1. **`extractPartialCards`**：每张牌的 `interpretation` 写完就上屏。
   只取**已闭合**的字符串 —— 半截 JSON、写到一半的句子一律不显示。
   目标是 First Meaningful Text，不是 First Raw Token（PERF-08c/08d 锁住）。

2. **等待文案按模式分开**。原常量是按 deep-pro 时代（60–130 s）校准的：

   | 常量 | 原值 | Standard | Deep |
   |---|---:|---:|---:|
   | `PHASE_INTERVAL_MS` | 14 000 | **5 000** | 14 000 |
   | `SLOW_HINT_AFTER_MS` | 20 000 | **25 000** | 20 000 |

   旧参数下，20.2 秒时会弹出「通常需要 1–2 分钟」——
   而解读 19 秒就写完了。一句本来用来安抚的文案，反而在最后一刻告诉用户「还早着呢」。

**没有加入任何人为延迟或假进度**（PERF-08g 锁住）。写完即显示。

---

## 17. Deep Regression

| | Baseline | After |
|---|---:|---:|
| 首 delta | 86 707 ms | 79 722 ms |
| 总完成 | 101 116 ms | **101 839 ms** |
| 输出 | 3471 字符 | **3735 字符** |
| thinking | enabled | enabled |

**Deep 未被拖累**：耗时基本持平，输出反而略增（因为 `MODE_DEEP_SECTION` 现在显式说明
标准模式的预算在深度模式全部解除）。schema 与 follow-up 路径未改动。

---

## 18. Follow-up Regression

追问走 `POST /api/tarot/followup`，与 Reading 是**两条独立路径**：
`buildFollowUpMessages` 不复用 Reading 的 system prompt，本轮的 prompt 改动碰不到它。

| 检查 | 结论 |
|---|---|
| 是否复用超长 Reading Prompt | ❌ 否 —— 独立 prompt，只传问题 / 牌阵 / 牌 + 正逆位 / 本次解读摘要 |
| 本轮是否改动 | ❌ 未改动 |
| 是否需要优化 | 当前不需要 —— 它本来就没有背 Reading 的 prompt |

`reading:check` 118 项全绿，其中包含追问路径的断言。**未扩大 Scope。**

---

## 19. Mobile Browser Result（390×844，生产构建）

| 项 | 结果 |
|---|---|
| 摆牌完成 | 5 张 |
| 翻牌 → 牌面可见 | **316 ms** |
| 空白采样帧 | 2/17（动画固有） |
| 翻牌时新增 full 请求 | **0 个**（预取已命中） |
| Reading 首段 | 2058 ms |
| Reading 完成 | 22 769 ms |
| 「1–2 分钟」提示 | **未出现** |
| 屏上文本 | 61 → 82 → 256 → 357 → 449 → 540 → 641，持续增长 |

## 20. Desktop Browser Result（1440×900，生产构建）

| 项 | 1440×900 | 对照 390×844 |
|---|---|---|
| 摆牌完成 | 5 张 | 5 张 |
| 翻牌 → 牌面可见 | **324 ms** | 316 ms |
| 空白采样帧 | 2/17 | 2/17 |
| 翻牌时新增 full 请求 | **0 个** | 0 个 |
| Reading 首段 | 2061 ms | 2058 ms |
| Reading 完成 | 22 784 ms | 22 769 ms |
| 「1–2 分钟」提示 | **未出现** | 未出现 |
| 屏上文本增长 | 61 → 95 → 308 → 422 → 529 → 635 → 753 | 61 → … → 641 |

两个视口逐项一致（同一份组件、同一条数据路径，差别只在布局宽度）。

> 桌面走查脚本改用了 **D4 补的键盘路径**（Tab 到牌堆按 Enter 洗牌、方向键切牌、
> roving tabindex 选牌）—— 原来的鼠标坐标是按 390 宽调的，在 1440 上会全部落空。
> 这同时顺带复验了 D4 的无障碍改动在桌面视口下同样可用。

---

## 21. Tests

| Check | 结果 |
|---|---|
| `engine:check` | ✅ 64 / 64 |
| `deck:check` | ✅ 338 / 338 |
| `layout:check` | ✅ 119 / 119 |
| `artwork:check` | ✅ 89 / 89 |
| `reading:check` | ✅ 118 / 118 |
| `release:check` | ✅ 45 / 45 |
| `deployment:check` | ✅ 53 / 53 |
| **`performance:check`（本轮新增）** | ✅ **24 / 24** |
| **合计** | ✅ **850 / 850，0 失败** |
| `tsc -b` / `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ 0 error |
| `npm run build` | ✅ PASS |

**未删除、跳过或放宽任何既有断言。** 826 → 850（+24 全部为新增）。

> 两处断言被修正（不是放宽）：`REL-10d` 与 `PERF-02` 原本匹配 `prefetchDeck` 的**任何出现**，
> 结果命中了新 hook 注释里那句「prefetchDeck 至今没有调用方」——
> 断言把一句说明自己没调用的注释当成了调用。改为匹配调用形式 `prefetchDeck(`。
> 要守的性质（牌桌上不预取整副牌）没有变，而且现在测的是真正决定这件事的东西。

### `performance:check` 覆盖

| ID | 断言 |
|---|---|
| PERF-01 / 01b / 01c | 摆满即触发准备 · Reveal 页兜底 · 提前 decode |
| PERF-02 / 02b | **只准备 placements 里的牌** · FanSpread 仍不请求正面（G-05） |
| PERF-03 / 03b / 03c | thumb 兜底 · 同一 `<img>` 换 src · **没有长 blur 过渡** |
| PERF-04 | `<img>` 保留 width/height 防 CLS |
| PERF-05 / 06 / 06b / 06c / 06d | standard 与 deep 配置确实不同 · standard prompt 更小 · 有预算表 · 不输出 alternativeInterpretations · **各用各的示例** |
| PERF-07 | standard `disabled` / deep `enabled` |
| PERF-08 … 08g | 收到 chunk 即上屏 · 每张牌写完即上屏 · **半截字段不上屏** · 等待文案按模式分开 · **无人为延迟** |
| PERF-09 / 10 | Reading prompt 不含 artwork URL · 重试不重新抽牌 |

---

## 22. Remaining Provider-side Latency

改动后 Standard 的耗时构成（3 牌，中位）：

```
0 ─── 868ms ──────────── 19 197ms
  │        │                   │
  │        └ 首 delta          └ 完成
  └ 请求发出

上游首 token          868 ms   （4.5%）
模型生成 2120 字符   ~18 300 ms（95.3%）
服务端 + 前端开销      <50 ms  （0.2%）
```

**95% 的时间是模型逐字生成，这一部分我们控制不了速率，只能控制长度。**
生成速率实测恒定在 ~113 字符/秒，与牌数、prompt 大小无关。

要进一步降低，只剩两条路，**都需要产品决策**：

1. 继续压缩 Standard 输出（2120 → 1500 字符可到约 14 秒）—— 代价是解读变薄
2. 换更快的模型 —— 需要先验证质量不下降，本轮明确不做

---

## 23. Remaining Performance Issues

| 项 | 严重度 | 说明 |
|---|---|---|
| Standard 尾段仍有约 10 秒屏幕冻结 | P2 | `relationships` / `narrative` / `answerToQuestion` 三个字段还没做流式上屏。它们靠后且较长，收益小于每张牌 |
| Deep 首 token 约 80 秒 | 按设计 | thinking 开启的固有代价，用户主动选择时已知情 |
| `legacy-classic` 体积是 `legacy-shadow` 的 3.2 倍 | P3 | 画风差异，非编码事故。要压体积从这套下手收益最大，本轮不动 |
| 翻牌动画前 ~200 ms 牌面未挂载 | 非缺陷 | 那是动画，不是等待 |

---

# CARD REVEAL PERFORMANCE ACCEPTABLE?

# YES

- 三档网络下点击到牌面可见全部落在 **316–323 ms**，冷暖缓存几乎无差别
- 空白卡面帧从 Slow 3G 的 **61/62** 降到 **2/17**，且剩下的 2 帧是翻牌动画固有
- Slow 3G 下 **6482 ms → 318 ms（−95%）**
- 预取严格限定在已选中的牌，G-05 的两条防线（FanSpread / prefetchDeck）均未松动

# STANDARD READING PERFORMANCE ACCEPTABLE?

# YES

- 总耗时 **26.5 s → 19.2 s 中位（−27.6%）**，5 牌 **38.9 s → 22.7 s（−41.8%）**，落在 15–25 秒目标区间
- 首段可上屏 **1.28 s 中位**，优于 3–8 秒目标
- 屏幕冻结 **22.7 s → 10.1 s**，误导性的「1–2 分钟」提示不再出现
- 解读质量未下降：8 条硬约束与「解释空间」整节一字未动，`reading:check` 118 项全绿
- Deep 未被拖累（101.1 s → 101.8 s，输出反而略增）

# READY TO RESUME PHASE E1?

# YES

850 / 850 断言通过，0 typecheck error，0 lint error，build PASS。

**但按第三十八节，本轮到此停止，不自动继续 E1。**
这两个是 Release Experience 问题 —— 请你先在真机上确认体验，再决定是否恢复 Deployment Packaging。

> 需要你知情：E1 的 `deployment/` 产物是在这些改动**之前**生成的，
> 恢复 E1 时需要重跑一次 `npm run deployment:build`（前端产物已变）。
