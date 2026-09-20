# 39 · Reading Prompt V2.4 — Decision & Action Oriented

## 为什么改

真实反馈：解读看起来很多，真正有帮助的很少。停在描述状态、结论模糊、结尾反问 3 个问题。

根因（都在 V2.3 Prompt 本身）：

1. 只「允许」下判断，没有把「判断 + 行动建议」写成任务。
2. 旧硬约束 8 把医疗 / 财务 / 法律 / 分手 / 离职 / 搬迁捆在同一条严格限制里，普通生活问题一律退回「你自己决定」。
3. 输出契约强制 3 条 reflectionQuestions，示例结尾是「先核实，不做决定」—— 模型跟示例学。

## 改了什么

| 位置 | V2.3 | V2.4 |
|---|---|---|
| ROLE | 有立场的读者 | + 核心任务链：牌面事实 → 解释 → 判断 → 影响 → 行动 → 观察信号 |
| 硬约束 | 8 条，第 8 条捆绑所有重大决策 | 9 条：倾向不是定局；生理健康 / 法律 / 人身安全不越界 |
| 现实边界 | 无单独一节 | 新增：医疗、法律、人身安全严格；其他生活决策明确允许给方向；高风险投机只收紧加码 |
| 解释空间 | 「可以下判断」 | 「你应该有观点」+ 谨慎≠模糊 + 信息不足不是终点 |
| 行动 | 无 | 新增一节：空泛建议清单、按问题类型的建议范式、时间范围≠预言、「对方怎么想」 |
| answerToQuestion | 回应问题 | 四层：直接回答 / 为什么 / 下一步 / 判断信号 |
| 新字段 | — | `actionPlan[] {action, reason, timeframe?}`、`watchFor[]` |
| reflectionQuestions | 强制 3 条 | Standard 0–2，Deep 0–3，可为 [] |
| 示例 | 结尾「先核实」+ 3 条反问 | 同一组牌，示范明确倾向 + 行动 + 信号；Standard 反思问题为 [] |
| User Prompt 安全段 | 所有命中一视同仁 | 按 `riskCategories` 区分严格类别与高风险财务 |

`PROMPT_VERSION=v1/v2` 切换机制不变，V2.4 仍是 v2。

## Schema

- `StructuredReading.actionPlan?` / `watchFor?` 为可选：V2.4 之前的日记没有这两个字段。
- 校验只设上限（standard 3/3/2，deep 5/5/3，超出截断），缺失标 `repaired`，不整份作废。
- toneGuard 同样扫描 actionPlan 与 watchFor。
- 前端流式提前放出已闭合的 actionPlan / watchFor；ReadingBody 新增两段（「现在可以开始的」「之后留心看的」）。

## 验证

- `npm run reading:prompt` —— 离线：Prompt 结构、示例过校验、Schema、边界分类、流式提取。
- `npm run reading:check -- --live --v24-only` —— 真实调用：感情 / 工作 / A-B(deep) / 医疗 / 法律 / 关系牌阵六类场景。
