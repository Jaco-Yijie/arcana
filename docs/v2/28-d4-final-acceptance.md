# Phase D4 — Final Acceptance Report

> 视角：不再当开发项目检查，而是当作**准备交给真实用户使用的完整产品**验收。
> 全程跑在**生产构建**上（`npm run build` → `npm start`），真实 DeepSeek、真实 390 张 Artwork、无 Mock。
> 除本轮发现的 release blocker 外，产品结构冻结。

---

## 1. Executive Result

| | |
|---|---|
| **P0** | **0** |
| **本轮新发现 P1** | **1 条 —— 已修复并复验**（核心流程对键盘用户是死路，§15） |
| **P2 / P3** | 11 条，全部非阻断，继续 DEFER |
| **测试** | **773 / 773，0 失败**（未删改任何断言） |
| **Production Build** | PASS，且全部验收都在生产构建上完成 |
| **console error（全部 Journey 累计）** | **0** |
| **失败请求（非注入）** | **0** |
| **CLS（累计布局偏移）** | **0** |
| **正式 UI 开发痕迹** | **0** |

本轮唯一被判定为 release blocker 的是**无障碍**：D2 补过「摆牌」、D3 补过「翻牌」，
但那两处都在流程后段 —— 键盘用户在**洗牌页**就走不下去，后面补的路径根本够不着。
修复后已实测「只用键盘从首页走到解读」全程贯通。

---

## 2. Journey A —— 带着问题来（完整 37 步）

真实链路，一步未跳，生产构建 + 真实 DeepSeek：

```
Home → Deck Library → 选牌组 → 输入问题 → 问题优化 → 确认 → Spread → Focus
     → Shuffle → Cut → Fan Spread → 亲自选牌 ×5 → Placement ×5 → Reveal ×5
     → Card Meaning → AI Reading → Follow-up ×2 → Journal → 离开 → 重新进入
```

**37 步全部通过，findings = 0。**

### §5 的 17 个验收问题，逐条回答

| # | 问题 | 结论 | 证据 |
|---|---|---|---|
| 1 | 用户是否知道下一步做什么 | ✅ 是 | 每一屏都有明确主 CTA；翻牌页控件随进度递减：`翻开这张牌 ×5 → ×4 → … → 开始完整解读` |
| 2 | 是否存在死路 | ✅ 无（指针路径）<br>⚠️ **键盘路径曾有 —— 已修**（§15） | 37 步无一失败 |
| 3 | 是否有按钮没有反应 | ✅ 无 | 每步都验证了 URL / 状态变化 |
| 4 | 是否有页面跳错 | ✅ 无 | 每步 URL 逐一记录并核对 |
| 5 | 是否有 layout shift | ✅ **CLS = 0** | `PerformanceObserver('layout-shift')` 全程累计 |
| 6 | 是否出现旧开发文案 | ✅ **0 次** | 14 个关键词全程扫描，命中 0 |
| 7 | 是否出现 0/78 / Coming Soon | ✅ 主流程 **0 次** | Settings 页另有一处 disabled 标签，见 §19 |
| 8 | 是否出现 broken artwork | ✅ **0 张** | 全程 `naturalWidth === 0` 计数为 0 |
| 9 | 是否重复牌名严重遮挡 | ✅ 无 | 牌面无 UI 文字；中文名只在牌义面板出现一次 |
| 10 | 正逆位是否正确 | ✅ 正确 | session `orientations` 与 UI caption、牌义面板三处一致 |
| 11 | Spread Position 是否正确 | ✅ 正确 | `现状 / A 方向发展 / A 结果 / B 方向发展 / B 结果` 与 spread 定义逐一对应 |
| 12 | Reading 是否引用真实问题 | ✅ 是 | 「你问两个方向各自会带你去哪里」直接回应优化后的问题 |
| 13 | Reading 是否引用真实抽牌 | ✅ 是 | 见下方逐条核对 |
| 14 | Follow-up 是否继续使用原牌 | ✅ 是 | 追问回答逐张点名牌位与正逆位 |
| 15 | Follow-up 是否没有重新抽牌 | ✅ 是 | `/api/tarot/reading` 请求 **0 次**；session 指纹逐字节不变 |
| 16 | Journal 是否保存正确 | ✅ 正确 | 1 条记录，5 张牌 + 4 条追问，问题/牌组/牌阵齐全 |
| 17 | Resume 是否恢复正确 | ✅ 正确 | 见 §13（Journey A 结束时不出现 Resume 是**对的** —— 会话已完成并入库） |

### Reading 引用真实抽牌 —— 逐条核对

某次实测抽到 `orientations = [reversed, reversed, upright, upright, upright]`，
B 分支两张是 `swords-13` / `swords-01`。解读原文：

> 五张牌里**两张逆位都集中在起点和 A 分支**，**B 分支则完全正位且由宝剑牌主导**。

**逐字对得上。** 这不是套话，是对这一副牌的真实描述。

结尾：「**选择权在你**，但牌面已经把两边的分量称得很清楚了。」——
不做宿命式断言，不替用户决定。

### 网络与 API

```
API 调用：POST /api/tarot/reading/stream ×1
          POST /api/tarot/followup       ×2
```

**没有重复解读请求，没有意外的第二次 reading，浏览器从未直连 `api.deepseek.com`。**

---

## 3. Journey B —— 随缘抽一张

**核心问题：这个入口是不是真的更轻，还是只少填了一个输入框。**

| 检查 | 结果 |
|---|---|
| 落地页 | `/question?mode=random` |
| 是否被强迫填写问题 | ❌ **否** —— 主操作是「直接随缘」，另有 4 个可选方向（今日提醒 / 最近状态 / 我需要注意什么 / 给我一个建议） |
| 是否出现问题优化 | ❌ **否** |
| 是否出现牌阵选择 | ❌ **否** —— 自动用「单张牌 · 1 张」 |
| 实际 session | `mode=random` · `spreadId=single` · `question=""` |
| 步骤数 | 14（Journey A 是 37） |
| findings / console error / 失败请求 | **0 / 0 / 0** |

**屏数对比**：带着问题来 = Home → Decks → Question → 优化 → 确认 → Spread → Focus（7 屏）；
随缘 = Home → 随缘页 → Focus（**3 屏**）。**确实更轻。**

### Reading 是否匹配「无明确问题」场景

抽到 `swords-07` 正位，解读原文：

> 放在此刻，这张牌想让你留意的**不是某件具体的事**，而是一种正在运转的方式……
> 绕开之后，**留在原地的那两把剑**是什么？

**明确按「没有具体问题」来写**，而不是硬套一个问题。且「留在原地的那两把剑」精确对应宝剑七的画面
（偷走五把、留下两把）。单张牌时解读自动去掉「牌与牌之间的关系」章节。

> 观察（非缺陷）：随缘一张牌仍要完整走完洗 → 切 → 摊 → 选 → 摆 → 翻。
> 这是 D1 §10 记录的开放问题，属产品取舍（仪式本身就是产品），不是本轮的验收缺陷。

---

## 4. Journey C —— 5 张牌

Journey A 用的正是 5 张牌的「二选一」牌阵，逐条对照 §7：

| 检查 | 结果 |
|---|---|
| Mobile 是否塞得下 | ✅ 360 / 390 / 430 全部无横向溢出，5 张牌全部可见 |
| Desktop 是否利用空间 | ⚠️ 部分 —— 牌阵占屏 46–58%，正文列 600px。见 §9 与 §20 |
| Placement 是否明确 | ✅ 每个空牌位都有 `把这张牌放到「A 结果」` 的可读标签 |
| Reveal 是否知道下一张 | ✅ 控件数随进度递减，翻完自动变成「开始完整解读」 |
| Reading 中 5 张是否可辨识 | ✅ 顶部牌条 5 张 + 位置名，桌面 110px、移动 62px |
| Reading 是否变成超长百科 | ✅ **否** —— 结论在上，四个细节章节**默认折叠**（每张牌的分析 / 牌与牌之间的关系 / 整体走向 / 可以再想想的问题） |
| Journal 是否爆版 | ✅ 否 —— 1 屏内，5 张缩略图 |

---

## 5. Five Deck Acceptance

五套全部真正选中并走完 Deck Library → Draw → Reveal：

| 牌组 | deckId | 抽到 | 正逆位 | 资产是否同套 |
|---|---|---|---|---|
| 月光 | `legacy-moonlight` | major-03 | upright | ✅ |
| 古典 | `legacy-classic` | major-05 | reversed | ✅ |
| 森语 | `legacy-forest` | wands-02 | upright | ✅ |
| 星图 | `legacy-celestial` | wands-02 | upright | ✅ |
| 幽影 | `legacy-shadow` | cups-13 | reversed | ✅ |

**森语与星图恰好都抽到 `wands-02`** —— 天然验证了「同一 cardId 在不同牌组下各自加载本套资产」：
两者的图片路径分别落在 `/decks/legacy-forest/` 与 `/decks/legacy-celestial/`，**没有串套**。

| 检查 | 结果 |
|---|---|
| Deck Library 陈列 | 月光 / 古典 / 森语 / 星图 / 幽影，**5 套** |
| 预览是否全走 thumb | ✅ 是（25 张全部 thumb，full 请求 0） |
| 卡背 | ✅ 程序化 SVG，摊牌 78 张产生 **0 个资产请求** |
| 切换牌组后牌义是否改变 | ✅ 不变 —— `deck:check` 的 338 项断言含「同一 cardId 在 5 套下牌义逐字段相同」 |
| 五套视觉是否明显不同 | ✅ 见 §6 抽样图：月光素白、古典象牙暖金、森语苔绿、星图深蓝星空、幽影近黑 |
| UI 语言是否一致 | ✅ 同一套边框、编号位置、caption 体系 |
| findings / 开发痕迹 / console error | **0 / 0 / 0** |

---

## 6. Artwork Runtime Sample（50 张）

每套 10 张 × 5 套。**URL 由真实 resolver 生成** —— 验的是「运行期真的会去请求的那个地址」。

| 检查 | 结果 |
|---|---|
| 覆盖 | Major + Wands + Cups + Swords + Pentacles，含 **15 张宫廷牌**（侍从/骑士/国王），正逆位各半 |
| full 加载失败 | **0** |
| thumb 加载失败 | **0** |
| 尺寸与 manifest 不符 | **0** |
| **串套（不同牌组画面相同）** | **0** |
| console error / 失败请求 | **0 / 0** |

> **串套检测差点变成空跑。** 第一版脚本停在 `about:blank`，所有图都是跨域，
> 带 `crossOrigin` 的取指纹全部失败 → 指纹全为 `null` → **检测恒真通过**，
> 而 50 次失败请求就是它留下的痕迹。修正为先导航到应用同源后，
> **50/50 指纹全部取到**，结论才真正成立。恒真的断言比失败的断言更危险。

### 视觉抽样（`artwork-sample-grid.png`）

主体可读、无裁切事故、无错牌、题字与罗马数字正确。

> 一处需要说明的判断：在 104px 的抽样网格里，**月光**明显比其余四套发白，一度像是饱和度问题。
> 但在**真实 DPR3 渲染尺寸**下复看（`A-m390-26-reveal-5.png`），
> `Ten of Swords` / `The Empress` / `The Tower` / `Eight of Pentacles` / `Ten of Pentacles`
> 主体与题字全部清晰可读 —— 那是缩略尺度造成的错觉，不是缺陷。
> **月光的高调冷白正是这套牌的身份**（「夜里最安静的那一段」）。

---

## 7. Mobile Final Acceptance（360 / 390 / 430）

| 检查 | 结果 |
|---|---|
| 横向溢出 | ✅ **0**（7 视口 × Home/Decks/Journal/Settings/Draw/Reveal） |
| 内容裁切 | ✅ 无（Reading 牌条在桌面三档均无右侧裁切） |
| 键盘 | ✅ 全流程可用（§15） |
| CTA / 安全区 | ✅ 底部 CTA 完整可点，安全区由独立 padding 兜住 |
| 卡牌触达 | ✅ 牌本体 103–124px，远超 44px |
| Bottom sheet | ✅ 遮罩 + 点击外部 + Escape + 关闭按钮，四条关闭路径 |
| Scroll / sticky | ✅ 追问区随内容滚动，不压正文 |
| Artwork 尺寸 | ✅ DPR3 取 full（源 1080 ≥ 所需 336）；DPR2 取 thumb（240 ≥ 224） |
| **触达 <44px** | ⚠️ 首页「牌组」「设置」27×44 —— **P2，DEFER** |
| console error | ✅ **0** |

**Slow 3G（400kbps / RTT 400ms）**：首页 **5.3s** 可交互；Deck Library 首个牌组名 **0.8s** 可见
（文字先于图片渲染）；25 张 thumb 全部加载成功、0 失败；**0 console error**。
加载中不用整屏 spinner，牌位显示本牌组卡面底色作为中性占位。

---

## 8. Tablet Final Acceptance（768×1024）

**结论：不处于「手机和电脑之间的尴尬状态」。**

| 检查 | 结果 |
|---|---|
| 内容宽度 | 随视口连续变化（`clamp` token），不是断点跳变 |
| Deck 卡片 | 25 张 thumb，2 屏内 |
| Spread | 5 张牌，牌宽 142px（三档里最大），无溢出 |
| Reveal | 源 1080 ≥ 所需 284，画质充足 |
| Reading | 正文列与桌面同为 600px |
| Journal | 无溢出 |

---

## 9. Desktop Final Acceptance（1024 / 1440 / 1920）

### Reveal

| 视口 | 牌宽 | 牌阵占宽 | 左/右空白 | 占屏 | 溢出 |
|---|---:|---:|---:|---:|---|
| 1024×768 | 100px | 589px | 218 / 218 | 58% | 否 |
| 1440×900 | 122px | 717px | 361 / 361 | 50% | 否 |
| 1920×1080 | 152px | 892px | 514 / 514 | 46% | 否 |

### Reading

| 视口 | 正文列宽 | 每行约字数 | 牌条 | 牌条宽 | 右侧裁切 | 溢出 |
|---|---:|---:|---:|---:|---|---|
| 1024 | 600px | 38 | 5 张 | 82px | 否 | 否 |
| 1440 | 600px | 38 | 5 张 | 95px | 否 | 否 |
| 1920 | 600px | 38 | 5 张 | 110px | 否 | 否 |

### 逐条回答 §12

| 问题 | 结论 |
|---|---|
| 是否仍有「手机页面放大」的感觉 | **Reading：否。** 600px / 每行 38 字是**刻意的阅读栏宽**，不是把手机列拉开；牌条随视口从 82 长到 110px。<br>**Reveal：部分是。** 牌阵只占 46–58% 宽度 —— 这正是 D2-07 已定论的 defer |
| Card 是否值得欣赏 | ✅ 1920 上 152px，取 full（1080px 源），题字与罗马数字清晰 |
| 空间是否合理 | Reading ✅ 合理；Reveal ⚠️ 两侧各约 514px 未用 |
| Side panel 是否合理 | ✅ 牌义面板是文字面板，不渲染牌面，不产生额外资产请求 |
| Reading 是否自然 | ✅ 结论在上、细节折叠、追问在文末 |
| Journal 是否合理 | ✅ 三档均无溢出 |
| 1920 是否出现巨大空白 | ⚠️ **Reveal 有**（两侧各 514px）。这是 D2-07，见 §20 |

**没有为此重新设计 `spreadLayout`** —— D2 恢复复验已用求解器逐视口证明：
桌面上高度约束以 3.8 倍差距碾压宽度约束，把牌放大会直接突破高度约束、裁掉底行；
唯一杠杆是改宽屏行列几何，那是**未决的产品选择**（与「牌 + 解读分栏」互斥）。

---

## 10. Standard Reading

| 项 | 结果 |
|---|---|
| Provider / Model | `deepseek` · `deepseek-v4-pro` · 真实 Key |
| HTTP | `POST /api/tarot/reading/stream` → 成功 |
| 首次出文 | 40.1s |
| 完成 | 42.3s |
| UI success | ✅ 结论 + 四个折叠章节 + 追问区 |
| 不做宿命式断言 | ✅「选择权在你」 |
| 不替用户决定 | ✅ 以问题收尾：「我到底在压着什么？」 |
| 不捏造未抽到的牌 | ✅ 只引用实际 5 张 |
| 正逆位正确 | ✅ 「三张逆位、两张正位，逆位集中在现状和两个结果上」与 session 一致 |
| position 正确 | ✅ 逐格点名 A 结果 / B 结果 |
| Question 正确 | ✅ 「你问两个方向各自会带你去什么样的处境」 |

## 11. Deep Reading

| 项 | 结果 |
|---|---|
| 耗时 | **141.3s**（D3 实测，落在服务端 180s 超时之内，浏览器未自行断开） |
| 正文 | 603 字 |
| 与 Standard 的差别 | 选项页写明：标准 =「每张牌 · 整体叙事」；深度 =「以上全部 · 牌阵内」，即**多出牌与牌之间的呼应、矛盾与转折点** —— 是多一层分析维度，不是同样内容写更长 |

## 12. Follow-up

| 项 | 结果 |
|---|---|
| 追问 1 / 2 | ✅ 均有新输出（正文 536 → 972 → 1378 字） |
| HTTP | `POST /api/tarot/followup` **×2** |
| 是否重新抽牌 | ❌ 否 —— `/api/tarot/reading` **0 次** |
| cards / orientation / session | ✅ **指纹逐字节不变** |
| 是否当前牌阵的延伸 | ✅ 回答逐张点名牌名 + 正逆位 + 牌位（「权杖四逆位在 A 结果格」） |
| UI 承诺 | 「牌不会变，也不会重抽。」 |
| 持久化 | ✅ `followUps=4` 随 session 入日记 |

---

## 13. Journal / Resume

**Journal**：1 条记录，含问题、牌组、牌阵、5 张牌、4 条追问。桌面三档无溢出。

**Resume**：Journey A 结束时首页**不**出现恢复入口 —— 这是**正确的**，会话已完成并存入日记，没有东西可恢复。
真正要验的是「中途离开再回来」，因此单独在三个阶段各中断一次：

| 中断阶段 | 恢复入口 | 首页文案 | 点「继续」到达 | session |
|---|---|---|---|---|
| 洗牌后 | ✅ | 你有一次未完成的抽牌 · 二选一 · **已摆 0/5** · 继续（洗牌） | `/table/shuffle` | ✅ **逐字节不变** |
| 切牌后 | ✅ | …**已摆 0/5** · 继续（切牌） | `/table/cut` | ✅ **逐字节不变** |
| 摆了 2 张后 | ✅ | …**已摆 2/5** · 继续（摆牌） | `/table/draw` | ✅ **逐字节不变** |

阶段名与进度都准确，问题与牌阵都回显。console error = 0。

---

## 14. Error Recovery

| 场景 | 用户看到 | 暴露 HTTP 码 | 明说牌保留 | Retry 后牌/正逆位/问题/牌阵/会话 |
|---|---|---|---|---|
| 解读服务不可用 | 「这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。」+ `重新尝试解读` / `先回去看牌阵` | ✅ 否 | ✅ 是 | ✅ **全部不变** |
| 连接失败 | 「没有连上解读服务。…你抽出的牌仍然保留…」 | ✅ 否 | ✅ 是 | ✅ **全部不变** |
| **真实 429**（服务端限流实测触发） | 「**请求有点频繁，稍等一下再试。**这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。」 | ✅ 否 | ✅ 是 | `retryable: true` |
| Artwork 404（390 张全挂） | 牌阵完整、程序化兜底、**布局不崩、无溢出、CTA 可点**、正逆位保留 | — | — | 流程可继续 |
| 超时 | 服务端 180s 封顶后映射为 `timeout` → 「这次解读花的时间太长了。…牌仍然保留」 | ✅ 否 | ✅ 是 | — |

> **一处如实说明**：我用 route 注入的 429 实际走到了「连接失败」分支
> （注入的 JSON body 无法被 SSE 客户端解析）。所以 429 文案改用**服务端真实限流**验证 ——
> 连发 40 次请求触发内置限流，第 41 次返回的正是上表那段产品文案。
> 注入没打中就该说没打中，不能拿它冒充 429 的证据。

**Retry 只重试 AI**：question / cards / orientations / spread / session 全部在浏览器 session 里，
服务端从头到尾不碰它们。

---

## 15. Accessibility —— 本轮唯一的 Release Blocker

### 发现

**只用键盘走流程，到洗牌页就走不下去了。**

`ShuffleStack` 只有 pointer 事件，没有 `tabIndex` / `role` / 键盘处理；
而「洗好了」只在 `shuffleCount > 0` 时才渲染。于是键盘用户能 Tab 到的只有「退出」。
`CutStack` 同样；`FanSpread` 的 78 张牌同样。

按 §20 的判据这是 **P0 级别的「流程无法继续」**，只是只影响键盘与辅助技术用户 ——
所以判为 **release-blocking P1，立即修复**。

> 这条之所以到 D4 才暴露，是因为 **D2-05 补的是「摆牌」、D3 补的是「翻牌」，
> 两处都在洗牌之后** —— 键盘用户根本走不到那里，那两次修复对他们等于不存在。

### 修复（三处，均保留原有指针路径一行未改）

| 组件 | 补的路径 | 守住的红线 |
|---|---|---|
| `ShuffleStack` | `role=button` + `tabIndex` + Enter/Space 洗一次 | **G-03**：熵仍来自用户 —— 取 keydown→keyup 的**按住时长**加亚毫秒抖动构造手势，**绝不调 `Math.random()`、绝不用常量手势**（那等于系统替用户洗牌） |
| `CutStack` | `role=slider` + 方向键调整 + Enter 确认 + `aria-valuetext` | **G-04**：仍然不存在默认切点 —— 按键之前 `ratio` 保持 `null`，第一按的时机才产生切点 |
| `FanSpread` | roving tabindex：整体一个 Tab 停靠点，方向键移动游标，Enter 拿起 | **G-05**：游标只播报「扇形里的第几张」，**绝不含 cardId 或牌名** —— 牌还没翻开。<br>不做 78 个 Tab 停靠点，否则键盘用户要按 78 次 Tab 才能走到「去翻牌」 |

### 复验：只用键盘的完整流程

```
✅ home-带着问题来      Tab×1
✅ decks-就用这副       Tab×12
✅ question-键盘输入
✅ question-继续 / 用优化后的
✅ spread-二选一 / focus-直接开始
✅ shuffle-聚焦牌堆     → 按 8 次 Enter → 页面显示「已洗 8 次」
✅ shuffle-洗好了
✅ cut-聚焦牌堆         → 方向键调整 → 「大约第 45 张」
✅ cut-从这里切开 / 合起来 / 摊开牌
✅ draw-键盘摆牌        → 5/5 张
✅ draw-去翻牌
✅ reveal-键盘翻牌      → 5/5 张 · Escape 关闭牌义面板 ✅
✅ reveal-开始完整解读
   Shift+Tab 反向聚焦 ✅
```

**从首页到解读，全程只用 Tab / 方向键 / Enter / Space / Escape 完成。**

### 其余项

| 项 | 结果 |
|---|---|
| Focus ring | ✅ 除输入框外全部有可见焦点环 |
| Dialog / Sheet | ✅ `role="dialog"`，Escape 关闭已实测生效 |
| Button names / aria-label | ✅ |
| `prefers-reduced-motion` | ✅ 生效，无溢出，**0 console error** —— 未被 D2 / D3 regression |
| 输入框无可见焦点环 | ⚠️ **P2** —— 有光标可见，非阻断，DEFER |

**回归验证**：修复后 `engine:check` 64/64 仍全绿（含「同 seed，仅最后一次手势差 1px → 抽到的牌不同」），
Journey A 指针路径重跑 37 步 0 findings。

---

## 16. Network / Console

| 检查 | 结果 |
|---|---|
| console error（全部 Journey，非注入） | **0** |
| 失败请求（非注入） | **0** |
| 意外 404 | **0** |
| 浏览器直连 `api.deepseek.com` | **0 次** —— 只请求同源 `/api/tarot/*` |
| 390 张 artwork 预加载 | **无** —— Home 0 张；摊开 78 张 **+0 请求** |
| 重复 AI 请求 | **无** —— `reading/stream ×1` + `followup ×2` |
| 意外重复 Reading | **无** |
| CLS | **0** |

---

## 17. Production Build

**全部验收都跑在生产构建上**（`rm -rf dist && npm run build` → `npm start`），不是 dev server。

| 项 | 结果 |
|---|---|
| 构建 | ✅ PASS |
| Home / Deck Library / Draw / Reveal / Reading | ✅ 全部在生产构建上完成 |
| 缓存头 | artwork 与哈希产物 `immutable, max-age=31536000`；`index.html` `no-cache` |
| JS / CSS | 674KB / 76KB（未压缩），gzip 约 217KB / 14KB |
| dist | 138MB，其中牌面 137.4MB |
| Key 是否进产物 | ✅ 真实 Key 全量 grep `dist/` **0 命中** |

**「dev 正常但 production 坏」这类问题不存在** —— 本轮没有任何一项是只在 dev 验过的。

---

## 18. Test Results

| Check | 结果 |
|---|---|
| `engine:check` | ✅ **64 / 64** |
| `deck:check` | ✅ **338 / 338** |
| `layout:check` | ✅ **119 / 119** |
| `artwork:check` | ✅ **89 / 89** |
| `reading:check` | ✅ **118 / 118** |
| `release:check` | ✅ **45 / 45** |
| **合计** | ✅ **773 / 773，0 失败** |
| `tsc -b`（app） | ✅ 0 error |
| `tsc -p tsconfig.server.json` | ✅ 0 error |
| `npm run lint` | ✅ **0 error**（6 条既有 warning） |
| `npm run build` | ✅ PASS |

**没有删除、跳过或放宽任何断言。**

---

## 19. P0 / P1 / P2 / P3

### P0 — **0 条**

### P1 — 1 条，已修复

| 项 | 状态 |
|---|---|
| 核心流程（洗牌 / 切牌 / 摊牌选牌）对键盘与辅助技术用户是死路 | ✅ **已修复并复验**（§15） |

### P2 — 11 条，全部 DEFER

| 项 | 说明 |
|---|---|
| Settings「自由桌面（即将推出）」 | **规范的 disabled 状态**（40% 透明、不可点、有明确标注），不是开发残留。<br>但它确实向用户预告了一个还没做的功能，而整个「摊牌模式」面板目前只有一个可用选项。<br>**一行删除即可让产品更像成品 —— 这是产品决策，不在 FREEZE 下自行做** |
| 首页「牌组 / 设置」触达 27×44px | 低于 44px |
| Reading 顶部牌条右侧裁切（仅 360×800） | 桌面三档均无；D2 已确认非 regression |
| 输入框无可见焦点环 | 光标可见 |
| 桌面 CardMeaningSheet 面板大量留白 | |
| 翻牌后面板自动弹出、压缩牌桌 | |
| CardMeaningSheet 未使用牌位信息 | |
| Journal 无 Deck identity / 无绝对日期 | |
| 深度解读 141s 无进度反馈 | |
| Cut 页三段连续 CTA | |
| 错误态标题与正文语义重复 | |

### P3 — 审美偏好，不列为缺陷

---

## 20. Deferred Items

| 项 | 归类 | 理由 |
|---|---|---|
| **`legacy-moonlight/major-17`** style / saturation drift | **POST-RELEASE ART MICRO-POLISH** | 单张牌的风格偏移，不影响可用性、解读或布局。重新生成属美术流程，应与其他返修**批量走 `rev+1`**，不因 Final Acceptance 单独触发 |
| **D2-07** 宽屏牌阵构图 | **DEFER** | 求解器已被证明正确且用尽横向富余；剩余差距是**未决的产品选择**（牌阵放大 vs「牌 + 解读」分栏，两条互斥）。本轮 1440 / 1920 终检：布局稳定、无溢出、画质充足 —— **仍属审美优化** |
| 上述 11 条 P2 | DEFER | 均不阻断 |

> Final Acceptance 不等于「不存在任何审美意见」。判据是：**没有影响用户正常使用和完成品感的阻断问题。**

---

## 21. Asset Hosting Decision

约 **137.4 MB** 牌面（390 full + 390 thumb + 5 套卡背/封面位）。

# OPTION A —— 本地 / 测试版本：继续用 public assets

- 零配置，`npm run build` 后 `dist/` 自带全部资产，单机 / Docker / HF Spaces 直接可跑
- 代价：dist 138MB；返修一张画要重新构建并重新部署整包

# OPTION B —— 正式线上版本：CDN / 对象存储（**推荐**）

- 只改一个构建期变量：`VITE_DECK_ASSET_BASE_URL=https://<你的域>/arcana/decks`
- dist 回到 **0.7MB**；返修一张画 = 上传一个文件 + `rev+1`
- 厂商中立：任何能按路径提供静态文件的对象存储都可以，目录原样上传
- ⚠️ **构建期生效**（Vite 静态替换 `import.meta.env`）—— 在 `npm start` 时才设**无效**

**建议**：测试与自托管走 A，正式上线走 B。**理由不是「CDN 更快」，而是 390 张手绘素材必然返修。**

**当前 `git-lfs` 未安装**（`git: 'lfs' is not a git command`）。
本轮**未执行** `git lfs migrate`，**未改写任何 Git 历史**，**未创建任何云资源，未产生任何费用**。

---

## 22. Commit Plan

`git status` 共 **825** 条，分类如下。**本轮未执行任何 commit。**

### A. 应提交 —— 产品代码（23 改 + 5 新）

```
 M src/components/card/{TarotCardFace,CardArtworkLayer}.tsx
 M src/components/deck/DeckCover.tsx
 M src/features/table/components/{FlipCard,DrawTable,FanSpread,ShuffleStack,CutStack}.tsx
 M src/features/reading/questionOptimizer.ts
 M src/pages/{ReadingPage,RevealPage,DeckLibraryPage}.tsx
 M src/decks/artwork/{manifests,paths,resolver}.ts · src/decks/art/{buildBrief,types}.ts
 M src/decks/types.ts · src/types/reading.ts · src/styles/theme.css · src/App.tsx
 M server/{index.ts,providers/deepseek.ts}
?? server/api/followUpRoute.ts · server/prompts/followUpPrompt.ts
?? src/features/reading/{FollowUpSection.tsx,followUpClient.ts}
?? src/decks/artwork/production.generated.ts
```

### B. 应提交 —— 配置

```
 M package.json      新增 release:check
 M README.md         修正不存在的 dev:all；断言数 106 → 118
 M .env.example      补全 10 个变量与说明，Key 为空
 M .gitignore        忽略 Arcana_Full_390/(1.4GB) 与 QA 截图
```

### C. 应提交 —— scripts / docs / QA 证据

```
 M scripts/{artwork-check,deck-check}.ts
?? scripts/{release-check,sample-artwork,generate-production-manifest}.ts
?? docs/v2/23…28（六份报告）
?? qa/  —— 仅 31 个驱动脚本 + 13 份 JSON 结论 + 1 README，共 352KB
```

### D. **不应提交 —— 大文件 / 源素材**

```
   public/assets/decks/**   780 个 webp · 137.4MB   ← 见下
!! Arcana_Full_390/         1.4GB 美术源素材        ← 已忽略
```

> **QA 截图曾差点混进来**：第一版 `.gitignore` 只写了 `qa/release/*.png` 与
> `qa/product-polish/**/*.png`，漏掉 `qa/final-acceptance/` 与直接躺在
> `qa/product-polish/` 下的图 —— 实测仍有 **188 个文件、151MB** 会被提交。
> 已改成按扩展名兜底（`qa/**/*.png`），现在 qa/ 只贡献 **352KB**。

### E. 临时文件

`.claude/`（本地 agent 配置）—— 建议加入 `.gitignore` 或不提交。

### F. Secrets — ✅ 安全

```
!! .env    已被 .gitignore 忽略，未出现在待提交列表（实测确认）
```

`.env.example` 中 `DEEPSEEK_API_KEY=` 为空（REL-13b 断言锁定）。
`dist/` 中真实 Key **0 命中**。

### 137MB 牌面的三条路（需你决定，**窗口仍然开着**）

1. **不进 git，随 CDN 交付**（配合 OPTION B）—— 把 `public/assets/decks` 加入 `.gitignore`
2. **Git LFS，但必须在首次提交之前**：`git lfs install` → `.gitattributes` 加 `*.webp filter=lfs` → 先提交它 → 再 add 资产。**现在做不需要改写历史**
3. 普通 git 直接提交 137MB —— **不推荐**

---

## 23. Remaining Release Decisions

1. **牌面放哪**（§21）：OPTION A 还是 B。**建议 B**
2. **137MB 与 git 的关系**（§22）：不进 git / LFS / 普通提交。**这是一个正在关闭的窗口**
3. **`即将推出` 是否删除**（§19）：一行改动，会让产品更像成品；FREEZE 下由你决定
4. **模型档位**：`.env.example` 默认 flash（55–60s），本轮 E2E 用 pro（42–141s）
5. **限流策略**：当前是进程内内存限流，多实例部署需共享存储或交给网关
6. **`major-17` 返修**（§20）：与后续美术返修批量走 `rev+1`
7. **D2-07 宽屏牌阵几何**（§20）：牌阵放大 vs 分栏，两条互斥

---

## 24. Final Acceptance Scorecard

| Area | Result | Release blocker |
|---|---|---|
| Core Draw | **PASS** | NO |
| Five Decks | **PASS** | NO |
| Artwork | **PASS** | NO |
| Responsive | **PASS** | NO |
| Reading | **PASS** | NO |
| Follow-up | **PASS** | NO |
| Journal | **PASS** | NO |
| Resume | **PASS** | NO |
| Error Recovery | **PASS** | NO |
| Performance | **PASS** | NO |
| Security | **PASS** | NO |
| Accessibility | **PASS**（本轮修复后） | NO |
| Production Build | **PASS** | NO |

---

# FINAL ACCEPTANCE: PASS

逐条对照准入条件：

| 条件 | 结果 |
|---|---|
| P0 = 0 | ✅ |
| 没有未处理的 Release-blocking P1 | ✅ 唯一一条（键盘死路）**已修复并复验** |
| Core Journey PASS | ✅ Journey A 37 步 / B 14 步 / C 5 张牌，findings 全为 0 |
| Reading PASS | ✅ 标准 42.3s、深度 141.3s，引用真实问题与真实牌，不替用户决定 |
| Follow-up PASS | ✅ 两次真实请求，`reading` 请求 0 次，session 指纹逐字节不变 |
| Production Build PASS | ✅ 全部验收都在生产构建上完成 |
| Security PASS | ✅ Key 不在产物、不在 `src/`、浏览器只请求同源 |
| Release Check PASS | ✅ 45 / 45 |

# READY FOR DEPLOYMENT DECISION?

# YES

两件需要你知情：

1. **§22 的 git 窗口仍然开着。** 137MB 牌面尚未提交 —— 现在选 LFS 或不入库都还是「改一行配置」，
   提交之后只能靠改写历史。
2. **§21 的 CDN 变量是构建期生效的。** 在 `npm start` 时才设置不会有任何效果。
