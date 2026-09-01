# qa/product-polish —— Phase D1 走查产物

**dev-only。不参与 build、不被产品代码 import、不进 `tsconfig.app.json`（它只含 `src`）。**
依赖 `playwright-core` 装在 scratchpad 而非 `package.json`，产品依赖树未改动。

驱动系统已安装的 Chrome（`channel: 'chrome'`），连的是 `npm run dev` 起的真实前后端，
解读走真实 DeepSeek，牌面是真实 Artwork —— 没有 mock。

| 脚本 | 用途 |
|---|---|
| `walkthrough.mjs` | 公共库：视口表、截图、DOM 观测（含 <44px touch target 检测）|
| `_journey.mjs` | 主流程走查。env：`SPREAD` `DEPTH` `ERR=abort\|500` `NOART=1` `SHEET=1` `FOLLOWUP=1` |
| `_home.mjs` `_dl.mjs` `_dl2.mjs` | 首页 / Deck Library 全视口 |
| `_misc.mjs` | 随缘入口、设置、日记空态、prefers-reduced-motion |
| `_random.mjs` `_resume.mjs` | 随缘路径、未完成会话恢复 |
| `_crop.mjs` `_j1.mjs` | 局部放大取证 |

复现示例：

```bash
npm run dev                                    # 另开一个终端
node qa/product-polish/_journey.mjs m390       # 完整流程 + 真实深度解读
ERR=abort node qa/product-polish/_journey.mjs m390   # 解读失败态
NOART=1  node qa/product-polish/_journey.mjs m390    # 牌面资产全挂，验证程序化兜底
```
