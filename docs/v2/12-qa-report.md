# Arcana V2 — QA 报告

> 执行者：Lead（QA Agent 未单独启动，原因见 `docs/agent-development-log.md`）。
> 所有结论均来自**实际执行**，输出可复现。

## 0. 一句话结论

**可交付。** V1 抽牌链路零回归，V2 结构化解读全链路打通，密钥不进前端产物，
失败/重试路径不动用户的牌。**尚未用真实 API Key 做过 LIVE 验证**（见 §5）。

## 1. 自动化结果（真实输出）

| 检查 | 命令 | 结果 |
|---|---|---|
| 抽牌引擎回归 | `npm run engine:check` | **64 项断言，0 失败** |
| 解读评测 | `npm run reading:check` | **106 项断言，0 失败** |
| 类型 + 构建 | `npm run build` | 通过（前端 + 服务端两份 tsconfig 都检查） |
| Lint | `npm run lint` | 4 条 Fast-Refresh 建议，非缺陷 |
| 密钥泄漏 | `grep -rniE "sk-…\|api.deepseek.com\|DEEPSEEK_API_KEY" dist/` | **零命中** |

`reading:check` 的 106 项分三部分：

**A. 牌面完整性（AC-V2-10）** —— 用伪造的模型输出直接打校验器，验证以下情况**必被拒绝**：
少返回一张牌 / 多返回一张牌 / 替换了一张牌 / 改了正逆位 / 多张牌阵却零关系 /
缺 narrative / 缺 answerToQuestion / reflectionQuestions 为空。
同时验证**可修复项**（关系引用了不存在的 cardId、kind 非法）被就地修掉并标 `repaired`，而不是整份作废。
另验证 JSON 提取容错：能剥 ```json 围栏、空内容判失败、截断 JSON 判失败。

**B. 语气红线** —— 5 条应判违规全部命中；6 条**含禁语子串但语义相反**的表达全部放行：
「这不一定意味着…」「说不定还有别的解释」「你并非必须现在就决定」「没有什么是注定的」
「不能绝对说明什么」「在一定程度上」。

**C. 10 组解读用例** —— 1/3/5 张、全正位、混合逆位、全逆位、大阿卡纳偏重、
小阿卡纳偏重+同花色重复、重复数字、决策类、关系类、高风险话题。
每组检查：牌数一致 / 无凭空出现的牌 / 正逆位未被改 / 有关系分析且只引用真实存在的牌 /
单张牌阵不硬凑关系 / 有整体叙事 / 回答了问题 / 语气无违规 / 高风险带安全提示。

## 2. 浏览器实测

| 项 | 结果 |
|---|---|
| 加载态分阶段文案 | ✓ 「正在解读牌面……」+ 阶段文案；牌阵缩略条全程可见 |
| V2 结构化渲染 | ✓ 主题/整体基调/回到你的问题 常驻，其余 Accordion 折叠；页面无 JSON、无 Markdown 标记 |
| Provider 标注 | ✓ Mock 时如实显示「当前使用本地示例解读」 |
| 错误态 | ✓ 不白屏，牌阵仍在，文案正确，有「重新尝试解读」与「先回去看牌阵」 |
| **Retry 不重抽（AC-V2-06）** | ✓ 连点 3 次重试：**3 次载荷逐字节相同**；`deck` 指纹未变、`placements` 未变、`reading` 仍为 null |
| **历史日记兼容（AC-V2-09）** | ✓ 植入一条纯 V1 结构的老日记，与 V2 新记录**在同一列表共存**，两者摘要均正常显示 |

## 3. 三种 Provider 配置的实测行为

| 配置 | 行为 | 验证 |
|---|---|---|
| 不配任何东西 | 回落 Mock，正常出解读 | ✓ `provider=mock`，`ok=true` |
| `READING_PROVIDER=deepseek` 无 Key | **明确失败** `missing-api-key`，启动时 stderr 告警 | ✓ `ok=false, code=missing-api-key` |
| `READING_PROVIDER=mock` | 恒为 Mock | ✓ |

## 4. 开发过程中发现并修复的缺陷

| # | 现象 | 根因 | 修法 |
|---|---|---|---|
| V2-B01 | **Key 配错被静默掩盖**：显式 `READING_PROVIDER=deepseek` 但无 Key 时，系统悄悄返回 Mock 解读 | `getProvider()` 用 `config.ready` 选择，无 Key 即回落 Mock，分不清「没配」与「配错」 | 改用 `config.provider`：显式要 deepseek 就必须以 `missing-api-key` 失败；只有「什么都没配」才回落 Mock |
| V2-B02 | **解读永远停在加载中** | React StrictMode 开发期 mount→effect→cleanup(abort)→effect 再跑，我的 `startedRef` 守卫让第二次直接 return，而第一次已被 abort | 移除该守卫，靠 `canRequest` + cleanup abort 保证不重复提交 |
| V2-B03 | Mock 的 `readingTheme` 是一整段话，当标题渲染很难看 | 直接取了 V1 的 `headline[0]` | 新增 `shortTheme()`，长文移到 `overallEnergy` |
| V2-B04 | `erasableSyntaxOnly` 下构造函数参数属性编译失败 | tsconfig 约束 | 改为显式字段赋值 |
| V2-B05 | `server/` 不在任何 tsconfig 的 include 里，`tsc -b` 根本不检查它 | `tsconfig.app.json` 只含 `src` | 新增 `tsconfig.server.json` 并挂进 `npm run build` |

## 5. 已知限制 / 未验证项

1. **未做 LIVE 验证**：没有真实 `DEEPSEEK_API_KEY`，所以从未真正调用过 DeepSeek。
   以下环节只在 Mock 与伪造输出下验证过，**必须由你用真 Key 复验**：
   - 真实模型输出能否稳定通过 `validateReading`（尤其 `cards[].cardId` 是否原样回填）
   - 语气红线的真实命中率与重试纠正是否有效
   - 60s 超时是否足够、4000 `max_tokens` 是否会截断
   - 关系分析是否真的「有意义才写」，而不是硬凑
   验证命令：`DEEPSEEK_API_KEY=... npm run reading:check -- --live`
2. **模型名未经真实请求确认**：`deepseek-v4-pro` / `deepseek-v4-flash` 取自官方文档，未实际发过请求。
   模型名收敛在 `DEEPSEEK_MODEL` 一个配置点，改起来是一行。
3. **追问（Follow-up）仍是 V1 规则式 Mock**，未接 LLM —— Product Agent 判定推迟到 V2.1。
4. **限流是单机内存实现**，多实例部署下失效。MVP 够用。
5. **bundle 570 kB** 未做代码分割（V1 遗留）。

## 6. 未采纳的建议

Architecture 文档建议把 API 类型拆成 `src/types/readingApi.ts` 独立文件。
**未采纳** —— 类型总量不大，单文件 `src/types/reading.ts` 更容易保证三方看到的是同一份契约；
拆成两份反而增加漂移风险。
