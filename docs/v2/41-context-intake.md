# 41 · Context-Aware Pre-Reading Questions（解读前动态背景提问）

用户写下问题之后、选择牌阵之前，按**原问题本身**生成 0–4 道可选的选择题。完全自愿：
可以全答、答一部分、一题不答按「继续」，或点「跳过，直接开始」。V2.5 Reading Prompt 核心逻辑不变。

## 流程

```
/question 提交问题
  ├─ startSession
  ├─ 并行：POST /api/tarot/context-questions（与 1.6 秒「问题落定」动画同时进行）
  └─ 动画结束 → /context
        ├─ 题目为空 / 失败 / 超时 → replace 到 /spread（这一页不出现）
        ├─ 继续 → session.userContext = { skipped: false, answers: 实际选中的题 }
        └─ 跳过 → session.userContext = { skipped: true, answers: [] }
      → /spread → /focus → 洗牌 → 切牌 → 抽牌 → 翻牌 → /reading
```

不出题的情况：随缘模式、「我暂时没有具体问题」、涉及人身安全、Streamlit 部署形态、无 API Key。

## 模块

| 文件 | 职责 |
|---|---|
| `server/prompts/contextIntakePrompt.ts` | 独立的出题 Prompt：先写 knownFacts，再只为缺口出题；10 条硬约束；医疗 / 法律 / 安全边界 |
| `server/validation/contextIntakeSchema.ts` | 逐题剔除：数量、选项数、长度、语言、越界（提牌 / 建议）、语气红线、原问题已给时间却问「多久」、医疗问题里的用药 / 症状细节与法律问题里的证据 / 案情（整题剔除，不只删那一个选项） |
| `server/intake/contextIntake.ts` | 调用 DeepSeek（默认 `deepseek-v4-flash`，关闭推理，max_tokens 1200，超时 8 秒）；knownFacts ≥ 5 时最多 1 题；任何失败都返回 [] |
| `server/api/contextIntakeRoute.ts` | `POST /api/tarot/context-questions` |
| `src/features/reading/contextIntakeClient.ts` | 并行准备、按 会话+语言 缓存、客户端 10 秒超时；Promise 从不 reject |
| `src/pages/ContextIntakePage.tsx` / `src/features/context-intake/ContextQuestionCard.tsx` | 「在翻开牌之前」页面；可取消选择的切换按钮组（aria-pressed） |
| `server/context/rebuild.ts` | 清洗 userContext：最多 4 条、限长、去重、去不完整；随缘模式忽略 |
| `server/prompts/tarotReadingPromptV2.ts` | User Prompt 新增「一点五、用户主动补充的现实背景」（无回答时整段不出现，Prompt 逐字不变）；System Prompt 新增使用规则 |

环境变量：`DEEPSEEK_INTAKE_MODEL`（默认 deepseek-v4-flash）、`DEEPSEEK_INTAKE_TIMEOUT_MS`（默认 8000）。

## 数据

- `TarotSession.userContext?: { skipped, answers[] }`：随会话存在浏览器本地（与问题、解读同一处），**不进入**账号同步上传的载荷，不跨会话合并。
- `ReadingRequest.userContext?: { answers[] }`：只在有实际回答时出现；skipped 不发给服务端，模型不知道用户跳过。
- knownFacts 只在服务端用于收口与评测，不返回前端，不保存；服务端日志不记录问题原文。

## 验证

- `npm run intake:check` —— 离线：校验器、Prompt 规则、超时 / 上游错误 / 坏 JSON / 网络错误回退、缓存、清洗、Prompt 注入、请求构建。
- `npm run intake:eval` —— 真实调用：11 个场景 × 3 次（延迟 P50/P95）、重复询问、医疗 / 法律边界、英文；同一组牌 A 跳过 / B 全答 / C 答一题 的解读对比。结果写入 `qa/context-intake/results.json`。

## 真实评测中修正过的两处

| 现象 | 修正 |
|---|---|
| 「非常详细的问题」仍然出 3 题（模型自己列了 7 条已知事实） | `knownFacts >= 5` 时服务端只保留 1 题；Prompt 同步写明 |
| 医疗问题出现选项「自己休息或吃点药」 | 按风险类别整题剔除用药 / 症状细节；法律同理（证据、案情、胜算） |

## Context Grounding 修正（第二轮真实测试之后）

真实对比里出现的问题：用户选「我主动得有点累」，解读写成「你已经陷入无法停止的惯性」；
选「主要是我主动」，解读写成「你在依赖这段关系」。背景被当成了可以加码的起点，
而且方向常常是「先看背景 → 得结论 → 再去牌里找支持」。

三处规则修改（不改 Schema、不新增字段）：

1. **出题 Prompt：选项优先写可观察的事实。**
   ✓「最近主要是我主动」「回复比较慢」「我提过见面，被推掉了」；
   ✗「我太依赖他」「我有点上瘾」「我害怕失去」「他不在乎我」。
   事实与解释不能混在同一个选项里；确实要问感受时**单独成题**，一份问卷最多 1 道感受题，
   选项用用户会自己说出口的程度写。
2. **V2.5：用户给的背景是事实边界。** 不得放大程度、不得补心理动机、不得贴心理标签：
   「有点累」→「有一些消耗」，不是「停不下来」；「主要是我主动」→「主动更多来自你这一侧」，
   不是「你在依赖」；「回复比较慢」→「回应节奏偏慢」，不是「他不在乎你」。
   有独立牌面证据时才可以提某种心理模式，且只能写成**可能的模式**；
   牌本身带「成瘾 / 束缚」含义（例如恶魔）时这条同样成立，也不能把用户的感受当成更强结论的证据。
3. **背景不能压过牌面。** 正确顺序是：先独立读牌 → 再看与背景一致还是冲突 → 然后形成判断；
   有张力就直接说出张力，不为贴合用户而修改牌义（建议位是推进的牌，不会因为背景偏消极就变成「先停下来」）。
   另外在紧挨输出处加了一句自检：程度词有没有被升级。

新增评测：`intake:eval` 的解读对比增加 D/E/F 三个单条背景变体
（「最近主要是我主动」「回复比较慢」「我主动得有点累」），每个变体检查
① 有没有放大背景 ② 三张牌是否仍然被指名解释。
放大检查区分两种写法：归因到牌的「一种……的模式」放行，直接对用户下的确定判断（「你停不下来」）拦截。
