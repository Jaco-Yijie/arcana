# Tarot Visual Semantic Layer V1

## 为什么需要这一层

V2.3 → V2.5 反复加 Prompt 规则，解读仍然有一个上限。上限不在措辞，在**输入**：

改造之前，`deckId` 在解读链路上是纯记录字段。同一个 `cardId + orientation + position + question`，
换任何牌组，模型拿到的输入逐字节相同 —— 用户看着五幅完全不同的画，AI 看到的是同一张牌。
模型只能围绕有限的 canonical meaning / keywords / symbols 重新组织语言。

更糟的是 `symbols` 写的是**这张塔罗牌的传统意象**，与牌组无关。
所以在幽影牌组里，模型会写「人已经往缺角的月亮那边走」—— 而幽影的圣杯八画的是
一个嵌在岩壁里的酒柜和一道向上的石阶，**画面里根本没有月亮**。
用户看着一幅画，读到的是另一幅画的描述。

## 架构

```
开发阶段（一次性，npm run visual:semantics）
  真实原画 .webp
    → base64 data URL
    → DeepSeek Vision（deepseek-flash，唯一支持图片输入的模型）
    → 结构校验 / 越界剔除
    → src/data/deckVisualSemantics/<deck>.json          完整记录（真相源，QA / diff）
    → src/data/deckVisualSemantics/runtime/<deck>.json  派生投影（进前端包）

用户运行阶段（零 Vision 调用）
  deckId + cardId
    → getDeckVisualSemantics()   两次对象取值，O(1)
    → projectVisualEvidence()    按 standard / deep 收口条数
    → ReadingContextCard.deckVisualEvidence
    → V2.5 Prompt 里每张牌材料下多出的那一小段
```

## 三层边界

| 层 | 回答 | 换牌组会变吗 |
|---|---|---|
| Canonical Meaning | 这张牌是什么 | **不会**。cardId / 牌名 / baseMeaning / domainMeaning / keywords / symbols / orientation / position 逐字节不变 |
| Visual Semantics | 这副牌怎么画它 | 会。这正是这一层存在的理由 |
| Reading | 此刻该强调哪一层 | 由 V2.5 在运行时决定 |

`deckId` 本身**仍然不进 Prompt**，也仍然不参与任何判断。它只是查表的钥匙。
没有任何一行代码写着「如果 deckId 是 legacy-shadow 就让解读变暗」——
能影响解读的只有从真实原画里看出来的那条预生成记录。

deck:check 的「换任意牌组后 Prompt 逐字节相同」被升级成「**非视觉部分**逐字节相同」，
并加了一条反向断言防止它空过。canonical 那一半一个字都没有放松。

## 数据

| 牌组 | 独立原画 | 视觉语义 |
|---|---|---|
| legacy-moonlight | 78 | 78 |
| legacy-classic | 78 | 78 |
| legacy-forest | 78 | 78 |
| legacy-celestial | 78 | 78 |
| legacy-shadow | 78 | 78 |
| ethereal | 3（DEV FIXTURE，不在 artwork.lock.json） | 0 |
| elysian / opaline / wonderland / classic | 0 | 0 |

**390 张**。这个数字不是硬编码的 —— 脚本从 `artwork.lock.json` 的 `cards/*.webp`
逐条推导。将来那五套 artwork 牌组补齐原画并进 lock，重跑一次就会自动覆盖，不用改代码。

## Cache / Resume / Stale

每成功一张立刻落盘。再次运行时逐张比对：

| 判定 | 条件 | 动作 |
|---|---|---|
| fresh | `entry.source.assetHash === artwork.lock.json 的 sha256` 且 version 相符 | 跳过 |
| missing | 没有记录 | 生成 |
| stale-hash | 原画换过了 | **只**重新生成这一张 |
| stale-version | schema 升过版 | 重新生成 |

换掉 `legacy-shadow/major-09.webp` 只会让那一张变 stale，不会触发 390 张重跑。
`--force` 忽略缓存。`runtime/` 投影每次运行都从完整记录重推一遍 ——
改了投影规则却全缓存命中时，它不会留下一份过期的产物。

## 失败绝不伪造

图缺、超时、JSON 坏、校验不过 —— 该条记录就是不存在，**绝不用 canonical meaning
反推一份假的视觉描述**。运行时缺这一条，那张牌的解读退回 V2.5 原样，Prompt 里
整个视觉段落不出现（也不输出「暂无视觉信息」这种占位）。

视觉层是 enhancement，不是 hard dependency。

## 防 Rider-Waite 背诵

最大的质量风险：告诉模型「这是圣杯八」，它可能不看图就背出 RWS 的八个杯子、
月亮、背影、山路 —— 而这五套牌是各自重画的。三道防线：

1. **Vision Prompt** 明写：知道牌的身份不等于有权把缺席的传统意象写进来；
   拿不准的放 `uncertainDetails`，不要猜。canonical meaning 只在 user message 末尾出现，
   并当场重申它的唯一用途是判断这幅画强调了牌义的哪一层。
2. **校验器** 拒绝在写牌义 / 做预测 / 把明暗推成结论 / 断言吉凶的记录。
3. **跨牌组对比**：78 个 cardId，任何一个在五副牌之间出现雷同 scene 或 keyObjects
   都会被 `visual:qa` 与 `visual:check` 标出来 —— 那是背诵最直接的信号。

程序判断不了「这段描述对不对得上那张画」。那只有看着图才知道，
所以 `npm run visual:qa` 产出的是一份**要人看的 20 张抽查清单**（固定种子），
`--png` 顺带把图导出来。

## 命令

```bash
npm run visual:semantics -- --dry-run        看会跑哪些，不调 API
npm run visual:semantics -- --pilot          每副牌 5 张代表牌
npm run visual:semantics -- --deck legacy-shadow --card major-09
npm run visual:semantics -- --major-only
npm run visual:semantics -- --all
npm run visual:semantics -- --all --force    忽略缓存重跑

npm run visual:qa                            覆盖率 / 新鲜度 / 背诵检测 / 抽查清单
npm run visual:qa -- --card cups-08          某张牌的跨牌组对照
npm run visual:qa -- --png                   顺带导出抽查图

npm run visual:check                         离线测试，零 token
npm run visual:ab                            真实 Reading A/B（OFF/ON + Cross-Deck）
```

## 配置

Vision 是**开发期批处理**，与用户运行时的 Reading / Intake 完全分开。
API Key 复用 `DEEPSEEK_API_KEY`，没有第二套。

```
DEEPSEEK_VISION_MODEL=deepseek-flash   # 2026-09 实测唯一支持图片输入的模型
DEEPSEEK_VISION_TIMEOUT_MS=90000
DEEPSEEK_VISION_CONCURRENCY=2
DEEPSEEK_VISION_MAX_TOKENS=2400
```

## 体积

完整记录 1.6MB raw / 357KB gzip，其中一多半字段（palette / composition /
confidence / meta）**在设计上就不允许进入 Reading Prompt**。
所以拆成两份：完整记录留在仓库供 QA，`runtime/` 只含能进 Prompt 的六项 + assetHash
（170KB gzip），只有它被打进前端包。

Node 部署：`rebuildContext` 跑在服务端，首屏包**逐字节不变**（105.61KB gzip）。
Streamlit 部署：Prompt 在浏览器组装，数据落在按需加载的解读 chunk 上
（31.51 → 208.69KB gzip），首屏包同样不变（204.23KB gzip）。

若将来 10 套牌组全部补齐原画让这个数字翻倍，下一步是按牌组动态加载
（只加载当前 session 那一副，约 34KB gzip）。那需要在 `streamlitReading`
里预载后再调同步的 `rebuildContext` —— 现在不做，因为它引入一个
「预载漏了就 Streamlit 静默没有视觉证据、而 Node 有」的失败模式，
而当前体积还不值得承担它。

## 人工复核记录

| 轮次 | 范围 | 结果 |
|---|---|---|
| 2026-09-27 | 随机抽查 10 张 | 零偏差 |
| 2026-09-27 | **`confidence: medium` 全部 39 张逐图核对** | 36 张准确，3 张有偏差，1 张边界 |

三处偏差与它们的**同一个根因**：

| 条目 | 偏差 | 根因 |
|---|---|---|
| legacy-celestial/wands-06 | 写「five upright wands」，画面只有 4 支 | 用牌名里的数字（Six of Wands = 5 支 + 骑手 1 支）代替了数数 |
| legacy-moonlight/wands-08 | 写「crescent moon」，画面是接近满月 | 用这张牌传统上的月相代替了看形状 |
| legacy-shadow/swords-03 | 写「双手握剑柄」，实为一手握柄、一手按在包裹上 | 极暗画面里的姿态误读 |

原样重跑三次都**稳定复现**（temperature 0.2），说明不是随机噪声。
于是给 Vision Prompt 补了两条针对性硬规则：

- **牌名里的数字不是画面里的物件数量。** 数不清就写 "several" 并把数量放进 uncertainDetails，
  不许回退到牌号。
- **月相按看到的形状写**，不许从牌组气氛或传统图样推。

补完之后三张全部重跑通过并逐图复验：「four upright wands」「a large pale moon disc」
「gripping one sword」，且都自带了对应的 uncertainDetails。

边界项 legacy-shadow/major-04 写了 "crowned" 而没有存疑 —— 放大后头部确有锯齿状冠形，
判定为可信但本应进 uncertainDetails，未重跑。

**同类风险的规模**：200 张编号小阿卡纳里，121 张的文本出现了与牌号相同的英文数字；
其中 84 张已经在 uncertainDetails 里对数量存疑，35 张是高置信度未存疑。
抽查其中 3 张（classic 的九圣杯 / 九宝剑 / 五钱币）逐个数过，**全部正确** ——
牌组通常确实按传统数量作画，wands-06 属于牌组自己改了数量的少数情况。

> **数据集由两个 Prompt 版本生成**：387 张用的是初版，上面 3 张用的是补了计数规则的版本。
> 视觉语义的 stale 判定只看 `assetHash`，**不追踪 Prompt 版本** —— 所以改 Prompt 不会让旧数据自动过期。
> 将来若要让全库受益于新规则，需要显式 `--all --force` 重跑一次（约 11 分钟），
> 那是一次独立决定，会产生全量 diff 并需要重新 QA。

## 已知风险

- **Vision 幻觉**：390 张里已逐图核对 49 张（10 随机 + 39 medium + 3 计数抽查），
  发现并修复 3 处。其余 341 张未逐图核对。
- **视觉证据压过 canonical**：Prompt 里视觉是最低优先级，且明写不得覆盖牌义、
  不得单独做预测、不得把颜色翻译成吉凶。但这是 Prompt 级约束，不是结构级 ——
  reading:check 的 120 项断言是当前的回归网。
- **stale**：靠 assetHash 自动判定，不依赖人工记忆。但 `artwork.lock.json`
  本身要靠 `npm run assets:lock` 更新 —— 换图后没 relock，这一层看不见。
