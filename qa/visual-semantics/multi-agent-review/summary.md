# Visual Semantic V1 QA · 已关闭

95 张全部有最终处置；7 条人工最终裁决已应用；HUMAN_REVIEW=0。

| 最终状态 | 数量 |
|---|---:|
| PASS | 28 |
| AUTO_CORRECT | 36 |
| CORRECTED | 7 |
| MARK_UNCERTAIN | 24 |
| HUMAN_REVIEW | 0 |
| TOTAL | 95 |

新增7条 human-final review entry，reviewStatus=corrected；15条精确替换用于6张牌，另1张仅修正QA数据。自动修正与人工修正分开统计。

## 本轮逐张结果

| Review ID | Before → After |
|---|---|
| review-001 | hooded → 裸露头发、无兜帽；保留 faceless |
| review-003 | low table / table → 草地上的布，杯子放在布上；底部支撑/材质未知 |
| review-004 | 环绕 / loose ring → 左5剑、右4剑，形成开放夹道 |
| review-005 | QA appears to be six → five clearly visible; no additional sword reliably confirmed；Runtime不变 |
| review-009 | four slender poles / 左右各2 → three slender poles；不猜分布 |
| review-010 | 两人均戴兜帽 → 一人戴兜帽，另一人头发裸露 |
| review-207 | 两人均有面纱 → 左下编发裸露，右侧戴兜帽 |

详细逐字段before/after、Generated原文、Reviewer与旧Judge意见、Human裁决、实际Runtime：[human-final-decisions.md](human-final-decisions.md)。

## 不确定内容

- review-003：底部支撑物和材质只存 QA metadata；不推定石头，不传入Prompt。
- 对该牌强调描述中依赖 shared table 的1条内容，使用现有patch逐条过滤，其余2条保留。
- 本轮未新增任何整字段 uncertainFields；保留上轮已有的 field/item filtering。
- 24张MARK_UNCERTAIN仍是已完成处置；它们的不可靠内容被过滤，不是未完成审核任务。

## Runtime与完整性

- 7条human-final记录优先于旧Judge；原Reviewer/Judge文件未更改。blind:apply保护人工最终记录。
- 11个生成层文件与任务开始前基准哈希完全一致；完整390条记录和原runtime投影未覆盖。
- 实际检查68张复核影响牌（含额外控制案例）；本轮7张标准/深度投影与ReadingContext专项测试通过。
- canonical meanings不变；review metadata、human reason、QA overrides与支撑物猜测不进入Prompt。
- 0 Reviewer / Judge重跑；0 DeepSeek Vision调用；Reading保持查预生成数据，回归使用Mock Provider。
- [human-final-runtime-audit.json](human-final-runtime-audit.json) / [runtime-audit.json](runtime-audit.json) 保存真实投影与核对结果。

## Regression

| 命令 | 最终结果 |
|---|---|
| npm run visual:check | PASS（exit 0） |
| npm run visual:qa | PASS（exit 0） |
| npm run deck:check | PASS（exit 0） |
| npm run reading:prompt | PASS（exit 0） |
| npm run reading:check | PASS（exit 0） |
| npm run intake:check | PASS（exit 0） |
| npm run typecheck | PASS（exit 0） |
| npm run build | PASS（exit 0） |
| npm run build:streamlit | PASS（exit 0） |
| npm run performance:check | PASS（exit 0） |
| npm run layout:check | PASS（exit 0） |
| npm run artwork:check | PASS（exit 0） |
| npm run design:check | PASS（exit 0） |
| npm run cinematic:check | PASS（exit 0） |
| npm run i18n:check | PASS（exit 0） |

另：完整runtime audit、七张human-final审计、原有blind:apply对人工记录保护检查通过。旧测试假定所有corrected都必须改变Runtime，已改为同时验证有效QA-only修正；未添加无用Runtime事实。

## 文件与历史

- review.json：新增7条人工override与QA元数据。
- human-final-decisions.json / .md：完整人工裁决及逐张报告。
- summary.json / .md、各批summary及human-review-queue.md：已更新关闭状态。
- scripts/blind-review-collect.ts、blind-review-apply.ts、blind-review-audit.ts：人工裁决优先、保护与审计。
- scripts/visual-review-qa.ts / visual-semantics-qa.ts、tests/visual-semantics.test.ts：QA-only实际投影验证及专项回归。
- 构建产物按要求更新；未修改产品功能、视觉schema、Vision Prompt或原始dataset。
- 上轮summary/queue/review快照在human-final-history，所有原Reviewer/Judge保留。

No unresolved human-review items. 无未处理Visual QA任务；既有不确定事实按策略过滤。Visual Semantic V1 QA正式关闭。

置信度：执行、数据完整性与Runtime验证为高；视觉判断沿用用户最终裁决。
