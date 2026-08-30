# 多牌组架构（V2.5）

> 本文档取代 [`16-deck-design.md`](./16-deck-design.md)。
> 配套红线见 [`01-product-spec.md` §6.1](../01-product-spec.md)（修订后的 G-16）。

---

## 0. 为什么要重做

V2.4 号称有 5 套牌组。实际情况是：

| 层 | 真差异化？ |
|---|---|
| 卡背（5 份独立 SVG） | ✅ 真的 |
| 背景氛围（4 份独立 + 1 份空壳） | ✅ 真的 |
| 19 个 CSS 颜色变量 | ⚠️ 纯主题 |
| **78 张牌面** | ❌ **五套完全共用同一批图** |
| 字体 / 边框 / 编号排版 | ❌ 零差异 |

更彻底一点说：`CardArt` 的 props 是 `{ motif, hue, tier }`，**签名里根本没有
deckId**；文件里 `var(--` 出现 **0 次**，银线与金色是硬编码的 `oklch` 字面量。
所以牌面这一层不只是"没换画"，是**连 CSS 主题都没换**——
V2.4 文档里承诺的"古典牌组象牙纸卡面"只在卡背上兑现了，翻开牌还是冷蓝夜空。

按"用户翻开一张牌时看到的画面"算：翻开前 100% 换了，翻开后 **0%**。

这不是偷工减料，是当时刻意的红线设计（`buildHiddenDeck` 无 deckId 参数、
Prompt 逐字节相同）。V2.5 要做的是**在完整保留那些红线的前提下**，
把牌面这一层真正打开。

---

## 1. 三层数据架构

```
┌──────────────────────────────────────────────────────────┐
│  Layer 3  Atmosphere  src/atmosphere/                     │
│  背景 · 光效 · 粒子 · 页面色温                             │
│  → 不 import Layer 1，不 import Layer 2                   │
└──────────────────────────────────────────────────────────┘
                          ▲ 单向引用（只引 atmosphereId）
┌──────────────────────────────────────────────────────────┐
│  Layer 2  Deck Visual  src/decks/                         │
│  插画 · 卡背 · 边框 · 字体 · 编号 · 装饰                    │
│  → 只 type-only 引用 Layer 1 的 cardId（一个 string）      │
│  → 不 import features/table，不 import SessionContext      │
└──────────────────────────────────────────────────────────┘
                          ┆ 只知道 cardId 是个字符串
┌──────────────────────────────────────────────────────────┐
│  Layer 1  Tarot Meaning  src/data/deck/ + src/types/tarot │
│  cardId · 牌名 · 编号 · 大小阿卡纳 · 花色                  │
│  正逆位含义 · keywords · symbols                          │
│  → 零出边。全层不出现 deckId 这个标识符                     │
└──────────────────────────────────────────────────────────┘
                          │ 只交出 CardId[]
┌──────────────────────────────────────────────────────────┐
│  Engine  src/features/table/engine/                       │
│  buildHiddenDeck(seed, cardIds)  ← 参数里没有 deckId       │
└──────────────────────────────────────────────────────────┘
```

### 1.1 为什么 Layer 1 的物理路径没改

按理说语义层该叫 `src/tarot/`。它没改，原因很具体：
`server/context/rebuild.ts` 依赖 `src/data/deck/index.ts` 和 `src/types/tarot.ts`
这两个路径，而它属于**本轮绝对不可修改**的红线文件。

分层是靠规则与断言成立的，不是靠目录名。改名会带来一次跨 13 个文件的
import 变更，收益却只有"看起来更整齐"——不值得拿红线文件去换。

### 1.2 拆出 Atmosphere ≠ 允许自由组合

deck → atmosphere 是 **1:1 固定映射**，不开放用户搭配。
开放组合会把 QA 面从 10 种炸成 100 种（对比度、卡面与底色串味、
`bg-void` 亮度断言全部要按组合跑），而且用户搭出来的大概率比设计定的难看。

拆层的目的是"分别可断言"，不是"可组合"。这一点写进了 `atmosphere/types.ts` 的注释，
因为拆层本身很容易变成一个坏功能的入口。

---

## 2. CardSemantic 与 DeckVisual 的边界

这条边界就是修订后的 G-16。

### 2.1 Deck 可以完整替换

卡牌插画 · 卡背 · 边框 · 字体 · 编号排版 · 配色 · 装饰元素 · 页面氛围

### 2.2 Deck 绝不可修改

`cardId` · 卡牌名称与编号 · 大/小阿尔卡纳分类 · 花色 · 正位与逆位含义 ·
keywords · 抽牌概率与随机逻辑 · 牌阵规则 · AI Prompt 与解读逻辑 ·
已有阅读记录的语义数据

### 2.3 这条边界靠什么成立

不靠自觉，靠四个结构性事实：

| 保证 | 机制 |
|---|---|
| 牌义层里没有视觉信息 | `TarotCard.art` **已删除**，78 条 `{motif,hue,tier}` 搬到 `src/decks/legacy/proceduralArt.ts` |
| 牌义没被误改 | `MEANING_FINGERPRINT` —— 剥离 art 前后 sha256 逐字节比对通过 |
| 视觉层拿不到牌义 | `resolveCardArtwork` 返回的 `CardArtworkPlan` 里**没有任何牌义字段**，它连"知道这张牌是什么意思"都做不到 |
| 视觉层影响不了抽牌 | `src/decks/**` 不 import `features/table` 与 `SessionContext`，拿不到牌序 |

> **关于 `symbols`**：它是 Rider–Waite 的图像学意象（如「悬崖边缘」「白色的犬」），
> 会进 Prompt。它属于 **Layer 1，必须与牌组无关**。
> 一旦让某套牌自带一份 symbols，「换牌组后 Prompt 逐字节相同」立刻失败 ——
> 而那条断言正是整个产品哲学的守门员。
> 各牌组画面上实际画了什么，是 Layer 2 的事，与 `symbols` 无关。

---

## 3. 类型定义

### 3.1 Layer 1

```ts
interface TarotCard {
  id: string; name: string; nameZh: string; number: number
  arcana: 'major' | 'minor'; suit?: Suit
  keywordsUpright: string[]; keywordsReversed: string[]
  meaningUpright: string; meaningReversed: string
  love/career/study/finance/advice: OrientedText
  symbols: string[]
  // ★ art 字段已删除
}
const MEANING_FINGERPRINT = 'fnv1a64:30c61426e8517242'
```

### 3.2 ArtworkAsset

```ts
interface ArtworkAsset {
  src: string
  srcSet?: string     // Phase 2 起。字段先存在，避免届时改类型导致 5 份 manifest 全改
  width: number
  height: number
  lqip?: string       // Phase 2 起。翻牌瞬间先铺它，避免白闪
  // ★ 刻意没有 alt / caption / title —— 牌面上的一切文字都来自 Layer 1
}
```

### 3.3 CardArtworkPlan ← 核心返回类型

```ts
type CardArtworkPlan =
  | { kind: 'raster';     deckId; cardId; path: string; load: () => Promise<ArtworkAsset> }
  | { kind: 'procedural'; deckId; cardId; motif; hue; tier }   // 仅 legacy 可达
  | { kind: 'missing';    deckId; cardId; expectedPath: string }
```

`missing` 分支的存在是刻意的。四种"假装完成"被明确禁止：

- ✗ 同一张插画只改 hue
- ✗ CSS 滤镜伪装不同牌组
- ✗ 同一 SVG 换配色
- ✗ 缺失时静默回退到其它牌组的牌面

所以缺素材就**如实显示缺素材**，并把期望路径直接画在牌面上。
它刻意不好看、也刻意不像一张牌 —— 一张缺失的牌就该看起来像一个待办事项。

### 3.4 ArtworkCoverage —— 只有三档

```ts
type ArtworkCoverage = 'none' | 'major' | 'full'   // 0 / 22 / 78
```

**禁止任意子集。** 如果允许"这套画了 8 张"，用户读到的不是"美术进度"，
而是"这几张牌更高级"—— 而"高级"在塔罗语境里只有一个翻译方向。

三档的边界是大/小阿卡纳这条**塔罗史上本来就存在**的语义线
（Marseille 的小牌本来就是 pip），不是"哪张牌好看"这条抽卡稀有度线。

### 3.5 DeckVisualSpec

```ts
interface DeckVisualSpec {
  frame:      { borderColor; borderWidth; inlay; vignette; cornerOrnament }
  typography: { nameFont; nameWeight; nameTracking; nameCase }  // 只给样式，不给文本
  numbering:  { style: 'roman'|'arabic'|'none'; position; font } // 数值来自 Layer 1
  cardBack:   { kind: 'procedural'|'raster'; composition? }      // 不含 cardId
}

interface DeckDefinition {
  deckId; kind: 'artwork'|'legacy'; name; tagline; description
  visual: DeckVisualSpec
  atmosphereId: AtmosphereId    // 只引 id，不内联
}
```

**字段白名单**：`deck:check` 断言 `DeckDefinition` 的键**恰好**是这 7 个。
多出任何一个即失败。字段不存在，UI 就画不出来 ——
和 `buildHiddenDeck` 签名里没有 deckId 是同一手法。

永久禁止的字段：`previewCards`（已提为全局常量）· `coverageLabel` ·
`toneHint` · `ritualMotif` · `rank` / `rarity` / `locked` / `popular` /
`recommended` / `price`。

---

## 4. 目录结构

```
src/
├── types/tarot.ts                    Layer 1 类型（art 已删除）
├── data/deck/                        Layer 1 数据
│   ├── index.ts                      allCards / getCard / 78 张完整性自检
│   ├── fingerprint.ts                ★ 新：MEANING_FINGERPRINT
│   ├── majorArcana.ts                22 张（-22 行 art）
│   └── minorArcana.ts                56 张（-56 行 art）
│
├── decks/                            ★ 新：Layer 2
│   ├── ids.ts                        DeckId / 别名表 / resolveDeckId
│   ├── types.ts                      ArtworkAsset / CardArtworkPlan / DeckVisualSpec
│   ├── registry.ts                   10 套牌组定义
│   ├── artwork/
│   │   ├── paths.ts                  baseUrl · 命名规范 · CDN 切换点
│   │   ├── manifests.ts              各牌组已有资产登记 · PREVIEW_CARD_IDS
│   │   ├── resolver.ts               ★ resolveCardArtwork / isDeckPlayable / prefetchDeck
│   │   └── useCardArtwork.ts         加载 hook（只在翻开后挂载）
│   └── legacy/
│       ├── proceduralArt.ts          ★ 78 条 art（从牌义层搬来）
│       └── ProceduralCardArt.tsx     ← 原 components/card/CardArt.tsx
│
├── atmosphere/                       ★ 新：Layer 3
│   ├── types.ts                      AtmosphereSpec / ThemeVars
│   ├── registry.ts                   10 套氛围
│   └── DeckAtmosphere.tsx            ← 原 components/atoms/DeckAtmosphere.tsx
│
└── components/card/
    ├── TarotCardFace.tsx             ★ deckId 必填。Layer 1 × Layer 2 的装配点
    ├── CardArtworkLayer.tsx          ★ 新：三分支渲染
    ├── DeckCardBack.tsx              新增 raster 分支 + 缺失态
    ├── ThemedCardBack.tsx            ★ 改读 session 冻结的牌组
    └── CardFrame.tsx                 未改

public/assets/decks/<deckId>/         ★ 新：资产目录（含 README）
```

**已删除**：`components/atoms/StarfieldBackground.tsx`（126 行死代码）·
`components/card/CardBack.tsx`（仅被已删除的 DeckPage 使用）·
`pages/DeckPage.tsx`（写着"当前唯一牌组"，与 `/decks` 矛盾）·
`data/decks/index.ts` · `types/deck.ts`（拆入 Layer 2 / Layer 3）

---

## 5. canonical cardId 与文件命名

```
public/assets/decks/<deckId>/
  cover.webp              牌组封面（Deck Library 用，不是任何一张牌）
  back.webp               卡背（78 张共用同一张）
  cards/<cardId>.webp     牌面，文件名 = canonical cardId
```

`<deckId>` 只有五个：`ethereal` `elysian` `opaline` `wonderland` `classic`

### 四条硬规则

1. **文件名必须等于 cardId**：`major-00.webp` … `pentacles-14.webp`。
   不用牌名、不用序号、不用中文 —— 牌名可能改文案，cardId 永不改。
2. **不存在 `-reversed` 资产**。逆位是同一张图 `rotate(180deg)`。
   两套图迟早会不同步，而"逆位图和正位图画得不一样"直接等于视觉层影响了牌义。
3. **原画里不烘焙任何文字与数字**。牌名与编号由 Layer 2 的
   `typography` / `numbering` 在图上绘制。否则 180° 旋转会出现倒字；
   而且牌组一旦能自带文字，就能自带给牌改名。
4. 因为第 2 条，构图必须**可 180° 阅读**：不要强重力构图，四角装饰尽量对称。

> ⚠️ 第 4 条**无法自动断言**，只能靠人工验收（5 × 78 = 390 张抽检）。
> 这是本架构自动化覆盖不到的最大缺口，必须承认。

### 为什么手工登记而不是 glob 自动扫

自动扫意味着"画好了丢进目录"直接生效，听起来方便，但它同时意味着
**没人 review 过的图能直接进产品**。牌面是这个产品的门面。

多一步在 `manifests.ts` 里登记（一行），换来一次显式确认。
`deck:check` 会同时检查两个方向：登记了但文件不存在、文件存在但没登记。

---

## 6. resolveCardArtwork(deckId, cardId)

```ts
function resolveCardArtwork(deckId: DeckId, cardId: string): CardArtworkPlan
```

**纯函数、无副作用、不发起任何网络请求。** 请求只在调用返回值里的 `load()` 时发生。

```
legacy 牌组  → LEGACY_CARD_ART[cardId] 存在 → procedural
artwork 牌组 → manifest.cards[cardId] 已登记 → raster
其余                                          → missing
              ——— 没有第四种回退 ———
```

两条不可越过的线：

- **禁止跨牌组回退**。缺图时绝不去拿 `ethereal` 的图 ——
  否则这副牌里会混进别副牌的画，牌组身份直接崩，
  而且暗示"某些牌来自更好的那副"。
- **禁止 artwork 牌组回退到 procedural**。那正是"用程序化占位图冒充最终牌面"。
  结构上保证：`procedural` 分支只在 `isLegacyDeck(deckId)` 为真时返回。

牌义不变性由类型保证：整条链的输出里**没有任何字段能到达牌名、牌义、
正逆位或 alt 文本**。牌名/编号一律由 `TarotCardFace` 从 `getCard(cardId)`
取，与 plan 无关。所以任何一级回退都不可能改变"这是愚者、逆位、意思是 X"。

---

## 7. 资源加载、预加载、失败处理

### 7.1 G-05 的新战场

V2.4 的牌面是程序化 SVG，零网络请求，"抽牌前泄露牌面"在**物理上不存在**。

换成真实插画后，一个善意的性能优化 ——
"把已摆放的三张牌先预加载，翻牌才不卡" ——
就能让用户打开 DevTools 的 Network 面板**直接看到下一张是什么**。

> 这是本次改造引入的一个**全新的、结构上无法彻底消除**的风险类别。
> 只能靠签名级设计压住。Code review 时任何往预取里传
> session / placements / cardId 的 PR 都应无条件拒绝。

### 7.2 五条防线

| 编号 | 规则 | 落地 |
|---|---|---|
| R1 | 单张请求只在 reveal 之后发起 | `FlipCard` 的 `showFace ? <TarotCardFace/> : <CardBack/>` —— 牌面组件根本不挂载，`useCardArtwork` 就不会跑 |
| R2 | 批量预取签名里没有 cardId | `prefetchDeck(deckId)`，**arity === 1**，有断言 |
| R3 | 预取按 canonical 顺序，绝不按牌序 | resolver 内部 `Object.keys(...).sort()` |
| R4 | 视觉层拿不到 session | `src/decks/**` 不 import `SessionContext` —— 结构上不可能按牌序预取 |
| R5 | 只在牌桌之外预热 | 进入 session 后不再发起整副预取，此时任何流量变化都可能被关联 |

### 7.3 失败处理

加载失败**不回退到别的牌组、不回退到程序化图**，而是退回 missing 态并显示期望路径。

> 一张加载不出来的牌，应该长得像"这里缺一张牌"，
> 而不是长得像"另一副牌的牌"。

加载中只铺本牌组自己的卡面底色（`--color-card-sky-a`），
刻意**不**先显示线稿再换成原画 —— 那种"突然变好看"的落差
会让人觉得线稿版本是次一等的牌。

### 7.4 体积预算

| 阶段 | 资产量 | 存储 |
|---|---|---|
| Phase 1 | 35 个文件 | `public/assets/decks/`，随应用部署 |
| Phase 2 | +110 张 | 同上，评估是否切 CDN |
| Phase 3 | +280 张，加多倍图约 60–100MB | **必须** CDN / 对象存储 |

---

## 8. CDN 切换设计

所有资产 URL **只能**从 `src/decks/artwork/paths.ts` 产出。
这不是洁癖 —— 如果路径散落在 30 个组件里，Phase 3 那次迁移会变成一场重构。

切换只需要一个环境变量，代码一行不用改：

```bash
VITE_DECK_ASSET_BASE_URL=https://cdn.example.com/arcana/decks
```

```ts
export function assetBaseUrl(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env
  const configured = env?.VITE_DECK_ASSET_BASE_URL
  return (configured?.trim() || '/assets/decks').replace(/\/+$/, '')
}
```

> 注意这里用结构化取值而不是直接写 `import.meta.env`：
> 本模块会被 `deck:check` 在 Node 下 import（`tsconfig.server.json` 没有 Vite 类型）。
> **断言脚本必须能跑，比写法漂亮重要。**

同理，`loadAsset` 用结构化的 `ImageLike` 而不是 DOM 的 `Image`。

**Phase 1 明确不引入 Git LFS。** 35 个文件进仓库没有负担；
LFS 一旦引入就很难退出，等到真正需要时（Phase 3）再决定 LFS 还是 CDN。

---

## 9. Legacy 数据迁移

### 9.1 为什么必须有 legacy 牌组

两条要求同时成立：

- 五套 artwork 牌组在 78 张就绪前**不得用于正式抽牌**
- 现有可运行牌组**必须保证原有抽牌流程可用**

五套新牌现在是 0/78，都不能抽。所以必须有东西承接现有流程 ——
这就是 5 套 `legacy-*` 牌组：V2.4 的原班视觉，可抽牌，Phase 3 后退役。

### 9.2 最危险的一处：同名不同牌

V2.4 有一个 deckId 叫 `classic`，V2.5 也有一个叫 `classic`，
但它们是**完全不同的两副牌**。不做处理的话，老用户的历史日记会被解析成
一副尚未完成、根本不能抽的新牌 —— 这是一次静默的数据损坏。

解法是**双保险**：

1. **换 storage key**：`arcana:deck` → `arcana:deck-v2`。
   v1 的 key 只读不写、刻意保留，万一映射表将来要修，原值还在。
2. **记录 schema 版本**：session / journal entry 带 `deckSchema: 2`。
   缺失或 `< 2` 一律走别名表。

```ts
LEGACY_DECK_ALIASES = {
  moonlight: 'legacy-moonlight',
  classic:   'legacy-classic',     // ← 不是新的 classic
  forest:    'legacy-forest',
  celestial: 'legacy-celestial',
  shadow:    'legacy-shadow',
}
resolveDeckId('classic', 1) === 'legacy-classic'
resolveDeckId('classic', 2) === 'classic'
```

### 9.3 历史记录不做数据迁移

`arcana:active-session` 与 `arcana:journal` 里的 `deckId` **原值不动**，
只在渲染时经 `resolveDeckId` 解析。

理由：一次性重写 localStorage 里的历史记录，一旦别名表将来再改就再也回不去；
而且写失败（配额满 / 隐私模式）会造成半迁移状态。
"原值只读 + 渲染期解析"是唯一不会把日记做坏的做法。

### 9.4 日记回看的历史保真

`TarotCardFace` 的 `deckId` 是**必填**的，编译器逼着每个调用点表态：

| 页面 | 用哪个 deckId |
|---|---|
| 牌桌（RevealPage / FlipCard） | `session.deckId`（已冻结） |
| 解读页 | `session.deckId` |
| 日记列表 / 详情 / 分享 | `entry.deckId`（历史保真） |
| Deck Library 预览 | 该行自己那套 deck |

> V2.4 这里是坏的：`session.deckId` 是**只写不读**的字段，
> 唯一读取方是 `buildReadingRequest`。注释承诺的"日记回看氛围能对得上"
> 从未实现 —— 用 shadow 抽的牌，切到 forest 后回看全是 forest。
> V2.5 修正了这一点。

`deck:check` 的 G 组断言"旧日记迁移后 78 张牌面全部可渲染"。

---

## 10. session.deckId 冻结规则

```
创建 session   deckId = 当前选择    deckLocked = false
  ↓            （此时还可跟随切换：用户选完牌阵回头换牌组仍然算数）
进入牌桌       lockDeck()           deckLocked = true    ← ShufflePage 挂载时
  ↓            （从这一刻起，再换牌组只影响下一次抽牌）
completed      写入日记，永久冻结
```

### 为什么要冻结

真美术时代，抽到一半换牌组会看到整桌的画全变了 ——
心理上非常接近"重抽"。牌一张没动，但那个念头一旦成立就很难消除。

### 为什么不是"禁止切换"

锁定 = 暗示有后果，恰恰是反效果。
所以：**不锁定，但沉浸区内不提供换牌组入口**。
用户要换必须走"退出 → 首页 → 牌组 → 继续"，摩擦已经足够。

而且允许换本身是红线的最强证据：用户可以在摆好牌之后去换一副，
回来发现整桌换了颜色而**牌、位置、正逆位、已翻开状态原封不动** ——
这比任何免责声明都有说服力。

### 实现要点

- `SessionProvider` 的 effect 只在 `!deckLocked && status === 'in-progress'` 时同步 deckId
- 它**只改 deckId 一个字段**，`deck` / `placements` / `drawn` 一个字节都不动
- `ThemedCardBack` 读 `session.deckId` 而不是 DeckContext —— 牌桌卡背不跟着变

---

## 11. 覆盖率检查机制

`npm run deck:check` —— **183 项断言**（V2.4 为 50 项），零网络零 token。

| 组 | 守什么 |
|---|---|
| **A** 牌组数据 | 5+5 套 · 装帧真的不同 · 字体互不相同 · 默认牌组可抽牌 |
| **B** 氛围层 | 10 套 · 变量键完全一致 · `bg-void` 亮度 ≤ 0.22 · 配色互不重复 |
| **C** 不影响抽牌 | 同 seed 牌序恒定 · `buildHiddenDeck` arity=2 · 反空断言 |
| **D** 牌义层 | 78 张 · **指纹比对** · 无视觉字段 · **10×78 跨牌组牌义一致** · plan 里无牌义字段 |
| **E** artwork 映射 | coverage 只三档 · 登记与磁盘双向一致 · 无 `-reversed` · **artwork 永不回退到 procedural** · 缺图路径指向本牌组 · 纯函数确定性 · `prefetchDeck` arity=1 |
| **F** 结构性禁止 | 字段白名单 · 禁用键名正则 · **牌组不含任何牌名** · 文案禁用词 · tagline 长度极差 ≤ 6 · 预览牌全局统一 |
| **G** 迁移安全 | 别名表完备 · **旧 classic ≠ 新 classic** · 脏数据不抛错 · 旧日记 78 张可渲染 |
| **H** Prompt 隔离 | 无 deckId / 牌组名 / tagline / 氛围 id / 资产路径 · **10 套 Prompt 逐字节相同** |

### 最有价值的四条

1. `MEANING_FINGERPRINT` —— 剥离 78 个 art 字段时手滑改到一句 `meaningReversed`
   会淹没在 1892 行的 diff 里，人眼看不见，这条断言看得见
2. **10 套 Prompt 逐字节相同** —— 整个产品哲学的守门员
3. **artwork 永不回退到 procedural** —— 让"用占位图冒充成品"在结构上不可能
4. **字段白名单 + 禁用键名** —— 让 `rarity` / `locked` / `rank` 无法被表达

> 顺带一提，写这批断言时它们当场抓到了两个问题：
> `nameWeight`（字重）被 `/weight/` 误判（已加精确白名单），
> 以及仙境之影的描述里出现了「月亮」——正好是 major-18 的牌名。
> 后者属于误伤，但**改一句文案比放宽一条守着产品哲学的断言划算**。

---

## 12. Phase 1–3 验收标准

五套牌**必须同步推进**。不允许先把一套画完再让其他四套长期 placeholder ——
那会在上线窗口里制造一段"某副牌明显更高级"的时期，
而用户读到的不是"美术进度不同"，是"这副牌更用心/更灵"。

### Phase 1 — 架构 + Cover + Card Back + 代表牌面

**架构必须在这一阶段全部冻结。** 下列任何一条推迟，Phase 2/3 都要返工 ×390：

- `resolveCardArtwork` 签名与 `CardArtworkPlan` 类型
- 资产路径与命名约定
- `ArtworkAsset` 的**完整字段**（含此阶段用不到的 `srcSet` / `lqip`）
- `ArtworkCoverage` 三档 + E 组断言
- `prefetchDeck(deckId)` 无 cardId 的签名
- 删除 `TarotCard.art` + 指纹
- `TarotCardFace.deckId` 必填 + 日记历史保真
- `LEGACY_DECK_ALIASES` + schema 版本
- 三层目录拆分
- session 内牌组冻结

**素材交付**：每套 7 个文件 × 5 套 = **35 个**

| 文件 | 说明 |
|---|---|
| `cover.webp` | 牌组封面 |
| `back.webp` | 卡背 |
| `cards/major-00.webp` | The Fool 愚者 |
| `cards/major-01.webp` | The Magician 魔术师 |
| `cards/major-02.webp` | The High Priestess 女祭司 |
| `cards/major-13.webp` | Death 死神 |
| `cards/major-17.webp` | The Star 星星 |

这五张是**横向对比用的对照组**。五套必须画同样这五张，才能验证同一个
cardId 在五副牌下真的有不同的主体插画、构图、边框、字体、编号形式、
配色与装饰元素。

> **为什么五套必须用同一批牌**：如果空灵展示星星、经典展示死神，
> 用户看到的差异里就混进了**牌本身的差异**，他会以为"空灵偏光明、
> 经典偏沉重"—— 而这正是"牌组有性格 → 牌组影响结果"这条错误推论的起点。
> 正确的心智模型是：**同一个模特，拍五组照片**。变量必须只有画风。

**验收**：`deck:check` 全绿 · `tsc` 0 error · `build` 通过 ·
五套 coverage 一律 `none` 且 `isDeckPlayable === false` ·
legacy 牌组抽牌流程完整可用

### Phase 2 — 每套 22 张大阿卡纳

- 五套**同步**翻到 `coverage: 'major'`，E 组断言保证是 22/22 而不是 8/22
- 启用 `srcSet` + `lqip`，启用 thumb 层预取
- 决定并落地 CDN / LFS
- **人工验收 110 张的 180° 可读性**（自动化覆盖不到，见 §5）
- **架构零改动** —— 如果这一阶段需要改 `CardArtworkPlan` 或路径约定，
  说明 Phase 1 没做对

### Phase 3 — 补齐 56 张小阿卡纳

- 五套同步翻到 `coverage: 'full'`，`isDeckPlayable` 转 true
- `DEFAULT_DECK_ID` 从 `legacy-moonlight` 改为 `ethereal`
- **legacy 牌组退役**：删除 `src/decks/legacy/`，别名表改为映射到 artwork 牌组
- thumb 层考虑合并 atlas（`ArtworkAsset` 类型不变 ——
  这正是把 loader 设计成 `() => Promise<ArtworkAsset>` 而非裸 URL 的原因）

---

## 13. 已知缺口

| 缺口 | 说明 |
|---|---|
| **180° 可读性无法断言** | 只能人工抽检 390 张。自动化覆盖不到的最大缺口 |
| **预取泄露风险无法根除** | 只能靠签名级设计压住（§7.1），需要长期 code review 纪律 |
| **Deck Library 显示「n / 78」** | 严格说这是一个可比维度，有轻微「完成度=质量」暗示。保留它是因为"一副牌不满 78 张不能抽"这件事用户有权提前知道。缓解：五套用完全相同的位置与措辞，差异来自事实而非排版 |
| **legacy 与 artwork 并排** | 两组之间确实存在质量档次差。缓解：单独成组 + 明确标注"插画还在制作中" |
| **定制字体尚未引入** | 当前用系统字体栈。定制字体属于 Phase 2 素材需求，在字体文件到位前不假装已经有了 |
