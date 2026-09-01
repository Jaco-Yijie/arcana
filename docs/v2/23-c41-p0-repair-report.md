# Phase C4.1 — P0 Artwork Repair Final Report

> 结论：7 / 7 张 P0 artwork 已实际重新生成、替换、派生并进入 Runtime。  
> **P0：7 → 0。READY FOR PRODUCT POLISH = YES。**

## 1. Image Generation

本轮调用 Codex ImageGen 生成真实位图，没有使用 placeholder、SVG、程序化图形或网络现成塔罗牌。

| Deck / Card | ImageGen 调用 | 可见候选 / 阶段 | 选择结果 |
|---|---:|---:|---|
| legacy-classic / pentacles-09 | 3 | 3 | 前两张各只有 8 枚；选择第 3 张，严格 9 枚 |
| legacy-classic / pentacles-14 | 1 | 1 | 选择第 1 张 |
| legacy-classic / wands-10 | 1 | 1 | 选择第 1 张，5 + 5 = 10 根 |
| legacy-shadow / wands-10 | 1 | 1 | 选择第 1 张，5 + 5 = 10 根 |
| legacy-classic / major-12 | 1 | 1 | 选择第 1 张 |
| legacy-forest / major-12 | 4 | 1 | 3 次从零生成被安全系统拦截；第 4 次以已通过的 archetype 图作风格转换成功 |
| legacy-shadow / major-12 | 5 | 3 个成功阶段 | 2 次被安全系统拦截；以安全基础姿态生成、悬浮修正、题字修正三阶段完成 |

数字敏感牌没有用“差不多”验收；不满足数量的候选被淘汰。

## 2. Selected Replacements

| Deck | Card | Selected ImageGen asset | Canonical master |
|---|---|---|---|
| legacy-classic | pentacles-09 | `exec-723a66fb-5dfb-4001-9ed1-d16dc437e3c1.png` | `Arcana_Full_390/masters/legacy-classic/pentacles-09.png` |
| legacy-classic | pentacles-14 | `exec-9fa5ebca-14f6-4ea9-af14-87263a04395a.png` | `Arcana_Full_390/masters/legacy-classic/pentacles-14.png` |
| legacy-classic | wands-10 | `exec-3200cf2e-bb48-4d11-b792-bce497dca3c5.png` | `Arcana_Full_390/masters/legacy-classic/wands-10.png` |
| legacy-shadow | wands-10 | `exec-cfbe9af4-46e2-4833-bb0f-9e88eb32e560.png` | `Arcana_Full_390/masters/legacy-shadow/wands-10.png` |
| legacy-classic | major-12 | `exec-07c5a085-4990-4cd4-8dde-9ece85cc488d.png` | `Arcana_Full_390/masters/legacy-classic/major-12.png` |
| legacy-forest | major-12 | `exec-e5f190c8-8863-41d0-a2ff-6a42ac74a1f6.png` | `Arcana_Full_390/masters/legacy-forest/major-12.png` |
| legacy-shadow | major-12 | `exec-0be646eb-40d8-457a-89af-cc9489dc53bc.png` | `Arcana_Full_390/masters/legacy-shadow/major-12.png` |

ImageGen 原始输出位于 `/Users/wangyijie/.codex/generated_images/01a05846-006b-7950-9ccc-17fc885b5949/`。

## 3. Exact Symbol Verification

| Card | 结果 | 人工放大核验 |
|---|---|---|
| classic / pentacles-09 | **Pentacles = 9** | 三列，每列 3 枚；每枚均有五芒星。边框、太阳和背景无额外类 Pentacle 符号 |
| classic / pentacles-14 | **Pentacle symbol present = YES** | King 旁的主圆盘内有清楚五角 pentagram，不是空白金币或 Taurus 符号 |
| classic / wands-10 | **Wands = 10** | 左 5 + 右 5；十根均独立可识别 |
| shadow / wands-10 | **Wands = 10** | 左 5 + 右 5；原生曝光下即可计数，无需提亮 |

## 4. Hanged Man Verification

| Deck | Actually upside down? | Reflection-only? | Calm? | Non-violent? | Recognizable? |
|---|---|---|---|---|---|
| legacy-classic | YES | NO | YES | YES | YES |
| legacy-forest | YES | NO | YES | YES | YES |
| legacy-shadow | YES | NO | YES | YES | YES |

- classic：主体头低脚高，单踝悬吊，另一腿为 figure-4；表情平静，无伤口或挣扎。
- forest：主体真实倒悬于森林构图，不以水中倒影代替；植物水彩语言与本 Deck 一致。
- shadow：主体在不可能重力的阶梯空间中真实倒悬/悬浮；不是倒影，保留 gothic surrealism，且没有暴力或自伤图像。

五套横向图确认 moonlight、classic、forest、celestial、shadow 都能读作 The Hanged Man，同时五套媒材和气氛仍明显不同。

## 5. Review Artifacts

- Before / After：`Arcana_Full_390/review/p0-repair-before-after.png`（1496 × 5221，7 / 7 After 已落地）
- Hanged Man 五套横评：`Arcana_Full_390/review/hanged-man-five-decks.png`（2518 × 1119）

## 6. Old Backup

备份根目录：`Arcana_Full_390/qa/replaced-p0/`。

- 7 张旧 master、7 张旧 web、7 张旧 thumb，共 21 个文件
- 未删除、未覆盖旧备份
- 结构：`qa/replaced-p0/<deckId>/<cardId>.{master.png,web.webp,thumb.webp}`

## 7. New Runtime Asset Paths

所有牌沿用 canonical cardId，没有 `-fixed`、`-v2`、`-new` 或 `-final2`。

| Deck / Card | Full runtime | Thumb runtime |
|---|---|---|
| classic / pentacles-09 | `public/assets/decks/legacy-classic/cards/pentacles-09.webp` | `public/assets/decks/legacy-classic/thumbs/pentacles-09.webp` |
| classic / pentacles-14 | `public/assets/decks/legacy-classic/cards/pentacles-14.webp` | `public/assets/decks/legacy-classic/thumbs/pentacles-14.webp` |
| classic / wands-10 | `public/assets/decks/legacy-classic/cards/wands-10.webp` | `public/assets/decks/legacy-classic/thumbs/wands-10.webp` |
| shadow / wands-10 | `public/assets/decks/legacy-shadow/cards/wands-10.webp` | `public/assets/decks/legacy-shadow/thumbs/wands-10.webp` |
| classic / major-12 | `public/assets/decks/legacy-classic/cards/major-12.webp` | `public/assets/decks/legacy-classic/thumbs/major-12.webp` |
| forest / major-12 | `public/assets/decks/legacy-forest/cards/major-12.webp` | `public/assets/decks/legacy-forest/thumbs/major-12.webp` |
| shadow / major-12 | `public/assets/decks/legacy-shadow/cards/major-12.webp` | `public/assets/decks/legacy-shadow/thumbs/major-12.webp` |

浏览器实际请求使用 `?r=2`；只有 classic、forest、shadow 提升到 revision 2，未改动的 moonlight、celestial 仍为 revision 1。

## 8. Manifest / Hash Update

已更新：

- `Arcana_Full_390/manifests/full-production-manifest.json`
- `src/decks/artwork/production.generated.ts`
- `src/decks/artwork/manifests.ts` 的按 Deck revision

| Deck / Card | Old Web SHA256 | New Web SHA256 |
|---|---|---|
| classic / pentacles-09 | `9b7cc8bc…` | `f07b966da4e8cda8d8c742119d4116622748cbb87be7a2c901999a2bc2ee06e0` |
| classic / pentacles-14 | `5de74251…` | `26b27037501ba5203a282891629761f519fcf7d49ea64e780261438c3a5b11b0` |
| classic / wands-10 | `df17f373…` | `b91f76b42dd8733070610c24ab6d27579fce49de3a36f9ce350c0d06ddf5c26c` |
| shadow / wands-10 | `f3488849…` | `55d3d5686eb373ee91196bb367c4c8e9da1a297cbc95337f5f71c56bf2831a92` |
| classic / major-12 | `5dc37f57…` | `65e9e0b3cdfe5fa7666e36283372a9f7af4f46c34d0351a47df7ed1c18c7ae8f` |
| forest / major-12 | `5f84590a…` | `7e7425eedf9a23580a65a51d9536ce5a720c5bccf406160291a49da079cf171c` |
| shadow / major-12 | `eb897263…` | `71f1ba8a79d9c97810c9e3c7394bdd1540e13783f260a6df25a51e607bb41343` |

以修复前 manifest 为基线复算：**383 / 383 非目标 Web SHA256 不变；变化集合严格等于这 7 张。**

## 9. Prompt Builder Hard-count Fix

`src/decks/art/buildBrief.ts` 新增 `buildProductionPromptConstraints(cardId)`，并由 `CardArtBrief.visualProductionConstraints` 输出：

- 数字小阿卡纳 2–10：`EXACTLY TWO … TEN clearly identifiable ...`
- 禁止 `roughly`、`about`、`approximately`
- 每个符号独立可见，背景与边框不得产生额外可误计符号
- Pentacles 明确要求 five-pointed pentagram

`artwork:check` 已加入对应回归断言。

## 10. Major Archetype Hard-constraint Fix

The Hanged Man 的 visual production constraints 已升级为硬约束：

- human subject itself upside-down
- actual suspended orientation
- not reflection-only / shadow-only / environmental implication
- calm and voluntary
- symbolic and non-violent

没有修改 Tarot Semantic meaning 或五套 DeckArtBible。

## 11. P0 Before / After

| 阶段 | P0 |
|---|---:|
| Before | **7** |
| After | **0** |

`Arcana_Full_390/p0-gate.mjs`：A 段 35 / 35、B 段 7 / 7、P0 = 0、READY FOR PRODUCT POLISH: YES。

7 张 status 均为 `approved`、`qaSeverity = null`、`needsVisualReview = false`；没有直接升级为 `final`。当前全量 status：344 approved + 46 final = 390。

## 12. Remaining P1 / P2

本轮按约束未处理，QA 仍保留 7 条非 P0 issue：

| Severity | Deck / Card | Issue |
|---|---|---|
| P1 | legacy-moonlight / wands-08 | crop-damage |
| P1 | legacy-moonlight / major-17 | style-drift |
| P2 | legacy-shadow / major-13 | typography |
| P2 | legacy-moonlight / major-13 | semantic-weak |
| P2 | legacy-classic / major-13 | semantic-weak |
| P2 | legacy-moonlight / pentacles-14 | core-symbol-variant |
| P2 | 全局 | 原画英文题字与 UI 中文标签重叠 |

## 13. Tests

| Check | Assertions / Result |
|---|---|
| `npm run engine:check` | 64 / 64 pass |
| `npm run deck:check` | 338 / 338 pass |
| `npm run layout:check` | 119 / 119 pass |
| `npm run artwork:check` | 89 / 89 pass |
| `npm run reading:check` | 118 / 118 pass |
| `npx tsc -b --pretty false` | pass，0 error |
| `npm run lint` | pass，0 error；6 条既有 Fast Refresh warning |
| `npm run build` | pass；Vite 529 modules transformed |

## 14. Runtime Verification

| Metric | Result |
|---|---:|
| Web | **390** |
| Thumb | **390** |
| Missing | **0** |
| Corrupted | **0** |
| Runtime Raster | **390** |
| Normal Runtime Procedural | **0** |

额外不变量：Master 390；五套现行 Deck 全部 78 / 78 playable；public full/thumb 与 canonical 派生逐字节同步；新 Web 1080 × 1800，新 Thumb 240 × 400。

## 15. Real Browser Verification

使用 Codex 应用内真实浏览器连接 `http://localhost:5173`：

- Deck Library：五套现行牌组均显示 78 / 78；classic、forest、shadow 请求 `?r=2`
- Draw Page：从 Deck Library 选择古典牌组，完成问题、牌阵、专注、两次真实洗牌、切牌，并进入 `/table/draw`
- Reveal Page：打开 `/table/reveal`，页面布局正常
- Reading Page：打开 `/reading`，标准/深度解读入口正常
- Runtime artwork：逐一请求 7 张 full + 7 张 thumb，共 14 个 URL；全部 `complete = true`
- full 自然尺寸全部 1080 × 1800；thumb 自然尺寸全部 240 × 400
- Deck Library / Draw-Reveal / Benchmark 页面控制台：0 warning，0 error

Card Meaning Sheet 需要先把手牌拖入牌位并翻开；本次应用内浏览器的合成拖放未触发 React pointer-capture 落位，因此没有把该 Sheet 伪报为已实际打开。其组件、Reveal/Reading 路由和相关自动检查均通过，但这是本轮唯一未完成的浏览器交互项。

## READY FOR PRODUCT POLISH?

# YES

判定依据：**P0 = 0**。剩余 P1 / P2 已保留并明确排除在本轮修复范围之外。
