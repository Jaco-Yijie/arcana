# Arcana — Content Spec 内容规格（Agent 6 Content 产出，Lead 补全文档）

## 1. 交付规模

| 项 | 数量 | 文件 |
|---|---|---|
| 大阿卡纳 | 22 张，完整原创中文牌义 | `src/data/deck/majorArcana.ts`（783 行） |
| 小阿卡纳 | 56 张，4 花色 × 14，逐张差异化 | `src/data/deck/minorArcana.ts`（1109 行） |
| 合计 | **78 张，0 个空字段，关键词均 ≥3** | `src/data/deck/index.ts` 模块加载时断言 |
| signature 牌面 | 10 张（愚者 / 魔术师 / 女祭司 / 恋人 / 隐士 / 死神 / 星星 / 月亮 / 太阳 / 世界） | — |
| 牌阵 | 5 个 | `src/data/spreads.ts` |
| 轻主题 | 4 个 + 直接随缘 | `src/data/randomThemes.ts` |

**Lead 裁决 L-02 的落点**：数据层必须 78 张齐全，图像层才允许复用 Placeholder。
否则摊牌会退化成「只有 10 张牌可抽」，直接违反简报 §17。

## 2. 牌义结构

每张 `TarotCard` 含：正/逆位关键词、正/逆位基础牌义、感情 / 事业 / 学业 / 财务 / 建议（均按正逆位分列）、象征元素、`art` 三参数。

**正逆位不挂在牌上**（Lead 裁决 L-03）：`TarotCard` 是静态牌义，只有一份；
朝向属于「那一次抽牌」，挂在 `DeckEntry` / `Placement` 上。

小阿卡纳的写法：先按花色定语调（权杖 = 行动/火、圣杯 = 情感/水、宝剑 = 思维/风、星币 = 现实/土），
再按 1–10 + 侍从/骑士/皇后/国王 写各自具体含义。**不允许循环批量套同一套文案。**

## 3. 语气规范（AC-11 的落点）

塔罗在本产品中用于**整理问题、提供新的观察角度，不替用户做决定**。

**禁止**（`FORBIDDEN_PHRASES` 常量导出，QA 可直接全文检索）：
「你一定会」「一定」「命运已经决定」「命运注定」「你必须」「注定」「必然」…

**应当使用**：
- 「这组牌可能反映…」
- 「目前值得关注的是…」
- 「如果按照当前状态继续发展…」
- 「可以把这张牌理解为一种提醒…」

`actions` 一律写成「可以考虑」，不写「你应该」。

## 4. Mock Reading 组装方式

`generateReading(input)` → `Reading`，结构对应简报 §12 的「先短后长」：

- `headline`：1–2 段核心结论，**必须引用具体牌名与牌位**（例：「『现在』这个牌位由逆位的宝剑侍从承接…」）
- `cardAnalyses`：每张牌 = 牌义 × 牌位含义 × 正逆位
- `relations`：从**实际牌面**推导（同花色占比、大阿卡纳占比、正逆位比例、相邻牌位对照），至少 2 条
- `trend` / `watchOut` / `actions`：结合牌阵结构
- `safetyNotice`：调用 `detectRisk`

**同一份输入稳定产出同一份解读**（基于内容哈希选句），不同牌面走到明显不同的句式分支 ——
这样它读起来像在说这几张牌，而不是在套模板。

## 5. 问题优化（不强制改写）

`optimizeQuestion(raw)` → `{ optimized, rationale } | null`。规则式，≥6 条规则 + 兜底。
把是非问句 / 求预测句式改写成开放式。原问题已足够开放时返回 `null`。

实测：「他会不会同意我换岗？」→「在我和他的这段关系里，我现在最需要看清的是什么？」
rationale：「塔罗读不到另一个人的决定，但可以帮你看清自己在这段关系里的位置和真正在意的东西。」

用户始终可以选「保留我的问题」，原问题永远保存在 `session.question`。

## 6. 牌阵推荐（建议，不是决定）

`recommendSpreads(question, mode)` 基于 `matchKeywords` 匹配 + `simplicity` 排序，返回 2–3 个。
页面上明确写着「推荐只是建议，选哪个由你决定」，并始终提供「查看全部牌阵」。

## 7. 安全边界（简报 §22）

`detectRisk(text)` 检测四类：`medical` / `financial` / `legal` / `harm`。
- 一般三类 → `GENERAL_SAFETY_NOTICE`（塔罗更适合整理思路，不应替代专业意见）
- `harm`（自伤/他伤）→ `HARM_SAFETY_NOTICE`，更明确的求助导向，但不说教、不长篇

呈现方式是**信息条而非弹窗**，后面直接跟「我知道了，继续」/「换个问题」两个平级按钮，**绝不阻断**。

## 8. 追问的 Context 边界（AC-12）

`FollowUpContext` 在**类型上**就只允许四样东西：当前问题、牌阵、卡牌+正逆位、当前 Reading。
组装点只有一个：`src/features/reading/buildReadingInput.ts`。历史日记没有入口能进来。

与本次抽牌无关的问题 → 礼貌拉回本次抽牌语境，不表现为通用 Chatbot。

**已知限制**：对「第二张和第三张牌」这类**序号**指代的解析不准，可能答成别的牌（见 QA 报告）。

## 9. QA 可以怎样验证

```bash
# 语气红线：应当零命中
npx tsx -e "import {FORBIDDEN_PHRASES} from './src/features/reading/mockReading.ts'; ..."
# 数据完整性：78 张、id 唯一、无空字段
npx tsx -e "import {allCards} from './src/data/deck/index.ts'; ..."
```
