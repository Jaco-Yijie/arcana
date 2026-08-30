# Deck System 设计说明（V2.4）

> ## ⚠️ 本文档已被取代
>
> **现行架构见 [`18-multi-deck-architecture.md`](./18-multi-deck-architecture.md)。**
>
> 本文描述的是 V2.4 的「视觉皮肤」方案：五套牌组共用同一批程序化牌面，
> 只换卡背、背景与 CSS 变量。V2.5 已把它替换为**真正的多牌组** ——
> 五副牌各有独立插画，`deckId + cardId → artwork`。
>
> 本文保留有两个用途：
> 1. 它对「牌组不得影响抽牌」这条界线的论证**依然成立**，V2.5 全部继承并加强
> 2. 文中描述的五套牌组仍以 `legacy-*` 的形式存在，保证老用户流程不断
>
> 但下列内容**已经过时，不要照着做**：
> - 「牌面在五套之间共用」—— V2.5 起每套牌必须有自己的 78 张
> - `DeckDefinition.theme` / `cardBack` / `atmosphere` / `previewCards` / `ritualMotif`
>   —— 字段已重构，见新文档
> - 「50 项断言」—— 现为 183 项
>
> 另需更正本文一处**与当时实现不符**的表述：文中称 `--color-card-sky-*` 由
> 「CardArt / CardBack 共用」，但 V2.4 的 CardArt 从未读取过它（颜色是硬编码
> `oklch` 字面量）。所以「古典牌组的象牙纸卡面」在 V2.4 只在卡背上兑现，
> **牌面上完全没有兑现**。这正是 V2.5 要解决的问题之一。

## 这一条界线，比这个功能本身重要

> **牌组只改变视觉氛围，不改变你抽到的牌，也不改变牌的含义。**

Deck 是 V2.4 加的东西，而它恰恰最容易把产品做坏 —— 一旦「换一副牌会不会抽得更好」
这个念头在用户心里成立，前面所有关于「牌是你自己抽的」的努力就一起塌了。

所以这条界线不是写在文档里靠自觉遵守的，是**用结构和断言钉死的**：

| 保证 | 靠什么钉死 |
|---|---|
| Deck 不影响牌序与正逆位 | `buildHiddenDeck(seed, cardIds)` 的**参数里没有 deckId**，结构上无法影响 |
| Deck 不影响解读含义 | `server/prompts/*` 逐字段读取 context，从不整体序列化；`deck:check` 断言换牌组后 **Prompt 逐字节相同** |
| Deck 不泄露牌面 | `DeckCardBack({ deckId })` 的**签名里没有 cardId**，78 张卡背必然一致 |
| 上面三条不会被后人改坏 | `npm run deck:check` —— 50 项断言 |

`ReadingContext.deckId` 确实存在，但它是 **Presentation Context only**：
只进日志和日记回看，不进 Prompt。这一点由 deck-check 的三条断言守着。

---

## 五套牌组

| deckId | 名称 | 一句话 | 卡背构图 | 环境氛围 |
|---|---|---|---|---|
| `moonlight` **（默认）** | 月光 | 夜里最安静的那一段 | `lunar` 月相 + 同心星轨 | `starfield` 冷蓝夜空 |
| `classic` | 古典 | 一副被翻了很多年的牌 | `orbit` 暗金罗盘 | `parchment` 暖褐纸面 |
| `forest` | 森语 | 林子里的光会自己找路 | `botanic` 对称枝叶年轮 | `canopy` 树冠与光斑 |
| `celestial` | 星图 | 你在一张很大的图上 | `constellation` 星座连线 | `nebula` 星云与黄道带 |
| `shadow` | 幽影 | 往回看的那一面 | `veil` 层叠帷幕 | `depth` 近乎空无 |

默认选 `moonlight` 而不是 `classic`：默认值应该是大多数人打开时想要的那个氛围，
不是我们觉得最「正统」的那个。

---

## 换肤是怎么做到不改一行页面代码的

现有组件早就全部消费 `var(--color-*)`（见 `styles/theme.css` 的 `@theme`）。
所以一套 Deck 就是**一张纯数据的变量表**，换 Deck = 把这些变量重写到 `<html>` 上：

```
DeckContext.applyTheme(deckId)
  → document.documentElement.style.setProperty('--color-bg-void', …)  ×19
  → document.documentElement.dataset.deck = deckId
```

洗牌、切牌、摊牌、翻牌、解读页 —— 一行都没改，全部继承。

这也是为什么 `DeckDefinition.theme` 是数据而不是散落在组件里的
`if (deckId === 'moonlight')`。加第六套牌只需要加数据。

### 19 个主题变量必须五套齐全

`deck:check` 断言五套牌的**变量键完全一致**。少一个键，切换时那条变量会保留上一副的值，
出现「森语的绿配着幽影的紫」这种串味 —— 界面上只是「有点怪」，排查起来极难。

### 配色纪律

- 表面层（`surface-1/2/3`）色度 ≤ 0.05，靠**色相**而非饱和度区分层级
- 只有 `gold` 和 `card-sky` 允许超出
- 五套牌的 `--color-bg-void` 亮度必须 ≤ 0.22（有断言）

---

## 「古典」这套牌的特殊解法

古典是暖调纸感牌组：**象牙纸卡面 + 暗金线条**。
但它不能把整个应用变白 —— 全站的字号、对比度、卡面绘制全部是按深色底设计的，
翻成浅色不是换个颜色，是重做一遍设计系统。

解法是把「纸」放在**卡上**，不是放在**背景上**：

- 背景：`oklch(0.140 0.014 48)` 深褐，`parchment` 氛围给暖光与纸纤维
- 卡面/卡背：`--color-card-sky-a/b` 走象牙白，配暗金线条

效果是「深夜里一盏灯照着一副旧牌」，而不是「白底网页」。

---

## 卡背：78 张必须完全一致

```ts
DeckCardBack({ deckId, simplified?, className? })
```

**函数签名里没有 cardId** —— 这不是约定，是类型层面的保证：
它拿不到牌的身份，所以不可能因牌而异，也就不可能在翻开前泄露任何信息。

五种构图都用极细线条 + 几何对称。理由很实际：这个图形在一次抽牌里会**重复出现 78 次**，
随机撒点在重复这么多次之后会显得廉价，四折对称才经看。

`simplified` 只在 sm 尺寸下省略最细的刻度与星点，避免糊成一团 —— 不改变构图本身。

---

## 环境层：`DeckAtmosphere`

沿用 V1 `StarfieldBackground` 定下的规矩，一条都没放松：

- **不用 canvas 逐帧渲染**（移动端功耗）。纯 CSS 渐变 + 静态 SVG
- 点位用固定种子在模块加载时算一次，**永不重算** —— 切页面时背景不跳
- 点是静止的、不闪烁；唯一的运动是雾层的极慢漂移与呼吸
- `prefers-reduced-motion: reduce` 时全部静止

四层结构对每套氛围都一样，变的是明暗结构与细节层：

1. 整体明暗塑形
2. 缓慢漂移的雾（`depth` 只有 0.55 强度 —— 幽影的气质就是空）
3. 这套氛围特有的 SVG 细节
4. 底部压暗，保证底部操作区文字对比度始终达标

底色直接吃 `var(--color-bg-*)`，所以 `DeckAtmosphere` 只负责**形状与密度**，
色相由 Deck 数据决定，两边不会打架。

---

## Deck Library 页的一个细节

每一行牌组把**自己那套变量**作用在自己的子树上（`style={deck.theme}`）。

否则未选中的牌组会用**当前**主题的颜色画卡背和预览牌 ——
等于让用户照着月光的配色去挑古典，这个页面就没意义了。
CSS 自定义属性向下继承，所以一行 inline style 就够。

---

## 相关文件

```
src/types/deck.ts                        契约（DeckId / DeckThemeVars / CardBackStyle / AtmosphereStyle）
src/data/decks/index.ts                  五套牌组数据
src/store/DeckContext.tsx                换肤机制 + 持久化
src/hooks/useDeck.ts
src/components/card/DeckCardBack.tsx     五种卡背构图
src/components/card/ThemedCardBack.tsx   牌桌四个组件共用的入口
src/components/atoms/DeckAtmosphere.tsx  五种环境氛围
src/pages/DeckLibraryPage.tsx            牌组画廊
scripts/deck-check.ts                    50 项断言
```
