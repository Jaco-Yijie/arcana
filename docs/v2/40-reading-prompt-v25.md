# 40 · Reading Prompt V2.5 — Evidence-Grounded Action Reading

在 V2.4（见 39）之上继续，**不回滚 V2.4**。V2.4 解决了「敢不敢判断」，V2.5 只解决 **Specificity**：
同一个问题换一副牌，建议要真的变；同一副牌遇到不同的现实处境，建议也要跟着变。

## 为什么 V2.4 仍然泛

1. Prompt 要求「有判断、有行动」，但没有要求「这句话离开这副牌就不成立」。
2. 行动可以不经过具体的牌，直接由问题类别推出：关系 → 少主动、等对方；工作 → 投简历测市场。
3. 用户问题原文里的现实细节没有被要求使用，模型实际上只看 questionCategory。
4. V2.4 两份示例是同一个工作问题，行动恰好就是「更新简历、测试外部机会」—— 模板被示例双倍强化；
   指令里的示范句又写着「未来一到两周」「接下来两周」，教会了模型用凭空的时间窗口伪装具体。
5. 没有「先点名一个核心问题」的要求，模型平均解释每张牌。

## Prompt 变化

| 新增 / 调整 | 内容 |
|---|---|
| 不可替换性原则 | 放在角色之后、所有规则之前；换牌测试 + 换人测试 |
| 四层推导 | 牌面证据 → 模式 → 现实后果 → 行动；给出错误 / 正确推导对照 |
| 现实锚点 | 用户已经做过什么 / 正在考虑什么 / 已发生的事实 / 明确的限制 / A-B 选项；只用原文里有的 |
| 万能行动模板 | 20 个短语，未具体化时不算完整 action |
| 反模板 | 明确列出 关系→少主动、工作→投简历、学习→调方法、A/B→A 稳 B 险，并给出各领域的多种可能方向 |
| A/B | A 的具体好处、B 的具体代价、用户在用什么标准选 |
| 数字 | 禁止凭空的天数 / 份数 / 次数；优先事件型窗口；指令示范句里的「两周」全部删除 |
| 核心问题 | decisionDriver：如果用户只能记住一句话 |
| answerToQuestion | 直接回答 → 关键依据 → 现实影响 → 下一步；至少一个只属于本次的细节；不重复 narrative |
| 替换测试 | actionPlan、watchFor、reflectionQuestions 各自的 specificity check |
| 标准模式预算 | narrative 3–5、answer 4–6、reflectionQuestions 0–1 |
| 示例 | Standard 改为关系问题（主动过两次 / 会回复 / 从不主动），行动是「把不对等说出来」而非「等他」；Deep 改为工作问题（三年 / 上个月口头答应调岗），行动是「把承诺变成可验证的事」而非「投简历」 |

## Schema

- `decisionDriver?: { coreIssue, whyItMatters, evidence: string[] }` —— 缺失标 repaired，不作废。
- `actionPlan[].evidence?: { cardId, position, orientation, signal }[]` ——
  没抽到的牌剔除并标 repaired；position / orientation 以服务端为准；**朝向明确写反则整份作废**（与改牌同一条红线）；每条最多 3 个。
- 标准模式 reflectionQuestions 上限 2 → 1。
- toneGuard 扫描 decisionDriver 与 evidence.signal。
- 前端：流式提前放出 coreIssue / whyItMatters；新增「最核心的一点 / What Actually Decides This」小节。evidence 不单独渲染（reason 已承载可读理由）。

## 验证

- `npm run reading:prompt` —— 离线：V2.4 + V2.5 Prompt 结构、示例过校验并用上现实锚点、Schema、边界、流式、投影。
- `npm run reading:check -- --live --v24-only` —— 真实调用：感情 / 工作 / A-B / 医疗 / 法律 / 关系牌阵。
- `npm run reading:specificity` —— 真实调用：反模板（关系 / 工作 / 学习各 3 副牌）、跨牌面差异、同牌面稳定、现实背景敏感、A/B 标准、英文。
  原文写入 `qa/reading-specificity/results.json`。

## 真实输出迭代记录（DeepSeek，`reading:specificity`）

第一版 V2.5 Prompt 上线评测后，原文暴露的问题与对应修正：

| 轮次 | 现象 | 修正 |
|---|---|---|
| 1 | 补编时长普遍：「接下来一周」「25 分钟」「五道题」「每周至少一次」 | 数字禁令列出这些具体写法；timeframe 不写任何时长 |
| 1 | 现实锚点被引用但没有改变推理：「上周他约我、我拒绝了」仍被读成「他投入少 → 别主动」 | 新增「锚点要能改变推理」，用同一张失衡牌在两种锚点下方向相反作说明 |
| 1–2 | 问题问法变成默认答案：「我还应该继续 X 吗」→「别继续」；建议位是权杖首牌仍给「先停下」 | 「问法不是答案的默认值」；建议类牌位是行动方向最直接的证据 |
| 1–3 | watchFor 写感受：「你是感到轻松还是焦虑」 | 字段定义写明「外部可见的行为或结果」，并给出改写示范 |
| 2 | A/B 回答没有讲选择标准 | two-choices 牌阵在 User Prompt 末尾追加一句选择标准要求 |
| 3 | 同一副牌（R2）两次运行方向翻转 | 在 User Prompt 末尾（紧挨输出）加入五项自检：换牌、锚点、数字、感受类信号、建议位方向 |
| 4 | 英文解读 evidence 出现中文牌名 | **评测脚本缺陷**：脚本没有像 server/index.ts 那样注册英文牌义覆盖层。线上不受影响；已补注册与离线测试 |

评测用例调整：关系组第一版 R3（宝剑四逆 / 星币四 / 圣杯三）与 R1、R2 一样偏困难，三份都给「暂停」各有依据，
测不出「困难牌 ≠ 一律停止主动」。换成明显支持推进的 R3（恋人 / 权杖二 / 圣杯骑士）。
