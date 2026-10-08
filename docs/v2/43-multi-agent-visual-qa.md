# Multi-Agent Visual Semantic Review Pipeline

## 它解决的问题

`qa/visual-semantics/spot-check.md` 有 95 条待人工核对。每一条要做的事是：
打开一张牌面图，逐项确认 `scene` / `keyObjects` / `spatialRelations` 里写的东西
**图上真的有吗、数量对吗**。一个人做完要在 95 张图和一份 15 万字的 Markdown 之间
来回翻 95 次，而其中绝大多数条目是对的 —— 真正错的可能只有个位数。

这一层把「找出那几条」自动化，把「确认那几条」留给人。

目标不是替代人工复核，是把**需要人看的数量从 95 降到 5–20**。

## 它不是什么

- **不重新生成视觉语义**。一次 DeepSeek Vision 都不调，不碰 `visual:semantics`，
  不改 Vision Prompt，不改 390 条生成数据。这是 QA，不是 Generation。
- **不建立第二套 override 层**。结论走现有的 `qa/visual-semantics/review.json`
  与 `applyVisualReview()`，和人手写的修正完全同一条通道（见 §21 设计约束）。
- **不碰 canonical meaning**。cardId / baseMeaning / keywords / actionPlan /
  decisionDriver 全部不在审核范围内。只审视觉语义层。

## 为什么必须遮蔽牌面上的印刷文字

这是整条链路最反直觉、也最关键的一个决定。

五套牌**每一张原画上都印着罗马数字和英文牌名**（顶部 `III`，底部 `Three of Swords`）。
只改文件名做不到匿名 —— Reviewer 一睁眼就读到牌名。

而牌名一旦可见，就会触发一个**已被实证过的失效模式**。`review.json` 里
`legacy-celestial/wands-06` 那条记录写着：画面里只有 4 支竖立权杖，
Vision 连跑 4 次、其中 3 次坚持写 `five` —— 它在用牌名里的数字
（Six of Wands 的传统构图 = 5 支 + 骑手手里 1 支）代替数数。
对这种错误无限 retry 是在赌运气。

所以匿名化必须动像素，但**只动印刷文字带**：

```
y 0   ─┬─ 遮蔽（罗马数字带）
y 75  ─┴─
         画面主体 773px，逐像素原样
         不 crop · 不 resize · 不调色 · 不镜像 · 不加任何文字
y 848 ─┬─
y 933 ─┴─ 遮蔽（牌名带）
```

五套牌的标题带位置实测一致（数字 y≈25–48，牌名 y≈858–911），一套几何通用。

**代价**：95 条里有 74 条的 `keyObjects` 引用了印刷文字
（`gold border with the numeral VIII and the title Eight of Swords`）。
这些条目在揭示包里被替换为 `[MASKED REGION]`，**不计入盲审裁决**。
它们是边框装饰，不在本轮要查的清单（人物数 / 花色数 / 月相 / 持物 / 空间关系）里。
丢掉它们的可审性，换回 Blind Review 本身成立 —— 这笔交换是划算的。

## 流程

```
                 匿名图（遮蔽标题带 · reviewId 打乱编号）
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Reviewer A        Reviewer B   …    Reviewer E     ← 互不可见
        │                 │                 │
        └──── 第一阶段：盲观察（只写看见的）────┘
                          │
                     ★ 冻结提交 ★
                          │
                 揭示现有 Visual Semantic（二次脱敏）
                          │
        ┌──── 第二阶段：逐项比对 ─────┐
        ▼                            ▼
   pass / corrected / uncertain   （各自只看自己的观察）
                          │
                 只有争议项进 Judge ──────────► 双人一致高可信 PASS 直接放行
                          │
                  Judge 重新独立看图
                          │
   ┌──────────┬───────────┼───────────┬──────────┐
   ▼          ▼           ▼           ▼
AUTO_PASS  AUTO_CORRECT  MARK_UNCERTAIN  HUMAN_REVIEW
                │            │               │
                └── review.json ──┘      人工队列（只给人看这些）
```

**顺序是防偏见机制的全部意义**：图片 → 盲观察 → 冻结 → 揭示 → 比对。
反过来（图 + 现有语义一起给）Reviewer 会去「找证据支持已有描述」，
而不是独立观察 —— confirmation bias 正是这轮要排除的东西。

## 平票裁决 —— Pilot 暴露的瓶颈与解法

Pilot 跑完 11 张，6 张进了人工队列。拆开看，其中 **3 张的原因不是图看不清**，
而是 §16.2 那条硬规则：AUTO_CORRECT 要求两名 Reviewer 都报了同一件事。
一个人判 pass、另一个人提出问题时，即使 Judge 独立看图后同意提出方，也只能升级人工。

照这个比例外推到 95 张，人工队列会有约 50 张 —— 而目标是 5–20。
**门槛本身把流水线卡死了。**

解法不是放松门槛，是补一个独立样本：「1 pass + 1 flag」说明这件事
**恰好处在可分辨的边界上**，正是最值得再看一眼的情形。
派第三个 Reviewer 盲审同一张图（它不知道前两人说了什么，也不知道这张为什么被挑出来），
再按 2/3 多数决定还能不能走自动通道。

门槛没有变松 —— 仍然要求**两个独立观察者报同一件事 + Judge 独立复核**。
变的只是「去哪里找第二个观察者」：原来两次机会，现在三次。

不一开始就三审，是因为 Pilot 显示约 70% 的图两人就能达成一致；
全量三审等于 285 个审核位、成本翻 1.5 倍。只在真正卡住的那部分加人才划算。

## 条目级丢弃 vs 整字段丢弃

`uncertainFields` 是**整字段清空**。Pilot 里量化过这笔账：
`legacy-forest/swords-05` 只有 1 条「持剑数量」存疑，但标记 `keyObjects`
会把这张牌**全部 8 条** keyObjects 一起清空 —— 包括「地上平放两把剑」
这种两名 Reviewer 都独立确认过的可靠证据。**为一个数字丢掉七条真话。**

所以 Judge 可以改为点名具体条目（`uncertainItems`）。
`VisualReviewEntry` 没有这个字段，而 §35 不允许改其它功能 ——
但 `patch` 本来就是「整字段覆盖」，把**保留项**原样列进去，
效果就是精确删掉那一条。不新增类型、不碰 `applyVisualReview`。

代价要说清楚：`patch` 是快照，下次 `visual:semantics` 重新生成后，
新增的条目不会自动出现在这个字段里（只有 `replace` 跨重生成存活）。
所以只在 Judge 明确点名条目时才用，没点名就退回整字段。

## 命令

```bash
npm run blind:prepare -- --pilot              # 10 张 + 1 张控制案例
npm run blind:prepare -- --rest --wave 1 --waves 5   # 剩余 85 张的第 1 波
npm run blind:reveal   -- --run wave-1        # 第二阶段揭示包（二次脱敏）
npm run blind:tiebreak -- --run wave-1        # 找出需要第三审的「1 pass + 1 flag」
npm run blind:packet   -- --run wave-1        # 只把争议项打包给 Judge
npm run blind:collect  -- --run wave-1        # 一致性指标 · summary · 人工队列
npm run blind:apply    -- --run wave-1        # dry-run，打印写入计划
npm run blind:apply    -- --run wave-1 --write
```

**为什么分波**：85 张塞给 5 个 Agent 是每人 34 张，上下文一定爆。
切成 5 波 × 17 张，每波各自跑完整链路。切片在**打乱之后**做，
保证每波内部仍是五套牌混合。附带好处：波与波之间 Agent 全新，
顺带消除了「同一个 Agent 连看几十张后形成跨图先验」这个单批模式下无法避免的污染源。

## 自动修正的门槛

`AUTO_CORRECT` 会被自动写进数据，所以门槛刻意设得很高。以下**全部**成立才允许：

1. 视觉事实在图上无歧义（Judge 自己看过，不是只读结论）；
2. **两名独立 Reviewer 都报了同一件事** —— 一个 pass、只有另一个提出，不够；
3. Judge 独立看图后得出同一结论；
4. 是 observable fact（数量 / 位置 / 有无），不是 interpretation；
5. 改动小到能表达成一条精确子串替换。

措辞偏好永远不是 AUTO_CORRECT。「这个人物看起来更悲伤」永远不是 AUTO_CORRECT。
在 AUTO_CORRECT 与任何其它结论之间犹豫时，不选 AUTO_CORRECT。

数不清的，用 `MARK_UNCERTAIN` 整字段丢掉，而不是猜一个替代数字 ——
**宁可少一条证据，也不要把自己都不确定的东西递给解读模型。**

## 一致性指标为什么比 PASS 数重要

「95 张全 PASS」这个结果本身说明不了任何事 —— 它既可能意味着数据干净，
也可能意味着 Reviewer 没认真看。真正有信息量的是
**两个独立观察者在同一张图上是否得出同一个数字**：

| 指标 | 含义 |
|---|---|
| `figureCount` 一致率 | 人物数这个字段可不可信 |
| `objectCount` 一致率 | 花色数量可不可信 |
| `moonPhase` 一致率 | 月相可不可信 |
| `spatialRelation` 一致率 | 空间关系描述可不可信（启发式，只看趋势） |

某一类一致率特别低，说明**这类视觉字段本身不可靠**，
应该整类在 Runtime 投影里降权或过滤，而不是逐张纠结。

分母只计「两人都对该项表过态」的情况。一方写 `null` 是弃权，不是分歧 ——
把 null（正确的谨慎行为）计成不一致，等于惩罚诚实。

## 执行权限

| 角色 | 权限 |
|---|---|
| Reviewer | 只读指定图片与自己的揭示包。不写仓库。 |
| Judge | 只读。只决定，不落笔。 |
| Coordinator | 唯一写入方，且只在 Judge 判 AUTO_CORRECT / MARK_UNCERTAIN / AUTO_PASS 时，经 `blind:apply` 走现有 review 通道。 |

`src/data/deckVisualSemantics/` 在整条链路里**一个字节都不会被改**。
生成数据永远是「模型当时看到的」那份不可变原始记录。

## 运行时不变量

- Runtime Vision API 调用数：**0**
- canonical meaning：**完全不变**
- 生成数据集：**不可修改**
- QA 元数据（reviewer / reason / reviewedAt / reviewMethod）：
  在 `applyVisualReview` 里本来就被丢弃，**永远不进 Reading Prompt**
