# 人工复核队列 —— Multi-Agent Visual QA

生成时间：2026-10-08T07:53:10.241Z
范围：95 张 · 需要你看 **7** 张

> 其余 88 张已由 Reviewer + Judge 处理完毕：
> AUTO_PASS 28 · AUTO_CORRECT 36 · MARK_UNCERTAIN 24
> 不需要重读它们。

## review-001

**Card**: legacy-shadow/cups-01
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-shadow__cups-01.png)
**Conflict Field**: scene/head covering
**Current Semantic**: A hooded, faceless figure

**Reviewer A (reviewer-b)**: 兜帽/披风覆盖头部
**Reviewer B (reviewer-e)**: 可见垂落头发，无法辨认兜帽边缘
**Judge**: 倾向头发；与 Reviewer B 冲突，未自动修改。

**只需确认**：跪着人物的头部是兜帽覆盖，还是裸露头发垂在脸前？

---

## review-003

**Card**: legacy-moonlight/cups-10
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-moonlight__cups-10.png)
**Conflict Field**: scene/keyObjects/spatialRelations · cup support
**Current Semantic**: a draped cloth over a low table

**Reviewer A (reviewer-c)**: Comparison pass；盲观察描述地面铺布
**Reviewer B (reviewer-e)**: 杯子站在草地铺布上，未确认桌子
**Judge**: 未看到桌腿/边沿，但不能排除布下低桌。

**只需确认**：前景杯子在低桌上，还是直接在草地铺布上？

---

## review-004

**Card**: legacy-classic/swords-08
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-classic__swords-08.png)
**Conflict Field**: scene/spatialRelations · sword arrangement
**Current Semantic**: arranged in a loose ring around the figure

**Reviewer A (reviewer-a)**: Comparison pass；盲观察为左右两组剑
**Reviewer B (reviewer-d)**: 剑只在左右，前后为开放通道
**Judge**: 倾向左右夹道；另有剑数分歧，未自动修改。

**只需确认**：人物正后方是否有插地剑，还是剑全部在左右两侧？

---

## review-005

**Card**: legacy-moonlight/swords-06
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-moonlight__swords-06.png)
**Conflict Field**: confidence.uncertainDetails · sword count（原生成自述；不进入 Prompt）
**Current Semantic**: exact number of swords standing in the bow (appears to be six, some overlapping)

**Reviewer A (reviewer-b)**: 可辨五把；无法可靠确认是否有第六把
**Reviewer B (reviewer-d)**: 可辨五把；无法确认第六把
**Judge**: 倾向五把，但 Reviewer 均不愿确认精确总数。

**只需确认**：船上可以确认的竖立剑总数是五把、六把，还是无法确认？

---

## review-009

**Card**: legacy-moonlight/wands-04
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-moonlight__wands-04.png)
**Conflict Field**: keyObjects · garlanded pole count
**Current Semantic**: four slender poles forming an arch

**Reviewer A (reviewer-a)**: 三根
**Reviewer B (reviewer-d)**: 两根
**Judge**: 倾向三根，与 Reviewer D 冲突。

**只需确认**：贯穿画面高度的花环杆可确认是两根、三根、四根，还是无法确认？

---

## review-010

**Card**: legacy-classic/swords-06
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-classic__swords-06.png)
**Conflict Field**: scene · passenger head coverings
**Current Semantic**: two seated, hooded passengers

**Reviewer A (reviewer-b)**: 中间乘客披风覆盖头肩
**Reviewer B (reviewer-d)**: 中间乘客裸露头发，另一名有兜帽
**Judge**: 倾向仅一人戴兜帽；未自动覆盖冲突观察。

**只需确认**：两名坐着乘客都戴兜帽，还是只有一名？

---

## review-207

**Card**: legacy-moonlight/pentacles-06
**Image Path**: [打开图片](/Users/wangyijie/Desktop/arcana/qa/visual-semantics/png/legacy-moonlight__pentacles-06.png)
**Conflict Field**: scene · lower-left kneeling figure head covering
**Current Semantic**: two kneeling, veiled figures

**Reviewer A (reviewer-b)**: 左下人物为 hooded pale mantle
**Reviewer B (reviewer-d)**: 左下可见编发和花，披肩从肩部开始
**Judge**: 倾向左下头发裸露；右侧头部有覆盖物。

**只需确认**：左下跪着人物头部有面纱/兜帽，还是编发裸露可见？

---

