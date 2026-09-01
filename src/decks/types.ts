/**
 * Layer 2 · 牌组视觉层类型（Deck Visual Layer）
 *
 * 【这一层管什么】
 * 牌面插画、卡背、边框、字体、编号排版、装饰元素。
 * 一句话：**这副牌长什么样。**
 *
 * 【这一层绝不管什么】
 * cardId、牌名、编号数值、大小阿卡纳、花色、正逆位含义、keywords、
 * 抽牌概率、随机逻辑、牌阵规则、Prompt、已有阅读记录的语义数据。
 * 那些全部属于 Layer 1（src/data/deck），换牌组时一个字节都不许变。
 *
 * 【结构性保证，不是口头约定】
 * - 本层只 type-only 引用 Layer 1 的 cardId（一个 string），拿不到任何牌义
 * - 本层不 import `@/features/table/**` 与 `@/store/SessionContext` ——
 *   拿不到 session 就读不到牌序，就不可能按牌序做任何事（含预加载泄露）
 * - `resolveCardArtwork` 的返回类型里没有任何 Layer 1 字段，
 *   所以它连「知道这张牌是什么意思」都做不到，更不用说改变它
 * 以上三条由 deck:check 的 E / F 组断言逐条检查。
 */

import type { CSSProperties } from 'react'
import type { AtmosphereId } from '@/atmosphere/types'
import type { DeckId } from './ids'

/* ══════════════════════════════════════════════════════════════
 * 一、牌面资产
 * ══════════════════════════════════════════════════════════ */

/**
 * 资产尺寸档位。
 *
 * 【为什么是 thumb/full 两档，而不是 @1x/@2x/@3x】
 * 全站最大展示是 `--card-w-lg` = 176 CSS px，@3x 设备也只需要 528 物理像素。
 * full 定在 1080 宽已经有 2 倍余量，@2x（2160）永远用不上。
 * 三档 = 1170 个文件约 170MB；两档 = 780 个文件约 93MB。
 * 同样的画质，一半的体积和文件数。
 */
export type AssetVariant = 'thumb' | 'full'

/** 一张已加载的牌面资产 */
export interface ArtworkAsset {
  /** 完整可用的 URL（已拼过 baseUrl 与 revision） */
  src: string
  /** 实际用的是哪一档 */
  variant: AssetVariant
  width: number
  height: number
}

/**
 * manifest 里登记的一条资产。
 *
 * 【为什么 value 必须是结构体而不是文件名字符串】
 * 旧版是 `Record<cardId, string>`，但 resolver 从不使用那个字符串 ——
 * 它用 cardId 重新推导文件名。于是 manifest 里唯一能承载
 * 尺寸 / 修订号 / 是否有缩略图的位置，是一个被完全忽略的字段。
 * 结果是 srcSet 和 lqip 这类字段**在物理上无法被填充**：
 * 数据没有地方可放。
 */
export interface CardAsset {
  /** 原图像素宽高。渲染时写进 <img width height>，消除 CLS */
  w: number
  h: number
  /**
   * 单张覆盖的修订号。缺省沿用 deck 级 rev。
   * 返修一张牌不必让整副牌的 URL 全变 —— 那会让用户重下 78 张。
   */
  rev?: number
  /** thumbs/ 下是否有对应文件。没有则 thumb 档回退到 full */
  thumb?: boolean
  /**
   * 这张原画在生产管线里的位置。缺省视为 'final'（历史条目）。
   *
   * 只有 approved / final 会被当成正式原画渲染；
   * benchmark 是试产，**不进正式牌组** —— 它存在的意义是验收 Style Bible。
   */
  status?: import('./art/types').ArtworkStatus
}

/**
 * 一套牌的原画覆盖档位。
 *
 * 【为什么只允许三档，禁止任意子集】
 * 如果允许「这套画了 8 张」，用户看到的不是"美术进度"，而是
 * **"这几张牌更高级"** —— 而"高级"在塔罗语境里只有一个翻译方向：更灵。
 * 三档的边界是大/小阿卡纳这条**塔罗史上本来就存在**的语义线，
 * 不是"哪张牌好看"这条抽卡稀有度线。
 */
export type ArtworkCoverage =
  /** 0 张原画 */
  | 'none'
  /** 恰好 22 张大阿卡纳 */
  | 'major'
  /** 恰好 78 张 */
  | 'full'

/**
 * 一套牌组的资产清单。
 *
 * 【每一套牌组都有一份 —— 包括 legacy】
 * 旧版只有 5 套 artwork 有 manifest，legacy 走一条完全不同的旁路：
 * `LEGACY_CARD_ART[cardId]` 单表查找，**deckId 在那条路径上被彻底丢弃**。
 * 后果是 5 套 legacy 牌组返回逐字节相同的美术计划，
 * 而且不是"素材没补"——是数据模型里根本没有 deckId 这个维度，
 * 补多少素材都不会变。
 *
 * 现在统一：解析永远是 `deckId → manifest → cardId → 资产`。
 * deckId 结构性地出现在查找链的第一步，不可能被绕过。
 */
export interface DeckArtworkManifest {
  deckId: DeckId

  /**
   * 资产来源。
   * `raster`     = 只认真实插画；缺图显示「素材未提供」
   * `procedural` = 只走程序化绘制
   * `hybrid`     = **Phase C1A 新增**：有原画用原画，没有的逐张回退到程序化
   *
   * 【为什么必须新增 hybrid】
   * 旧的二选一意味着一套牌要么 0 张原画、要么 78 张齐活。
   * 390 张原画不可能一夜之间到齐，而中间这段时间五套牌必须仍然可抽、可读、不坏。
   * §16 的要求写得很直接：「禁止出现半套牌直接坏掉」。
   *
   * 旧规则担心的「这几张牌更高级」依然成立，所以 hybrid 只给
   * canonical five 使用，且 Deck Library 会如实显示 n/78 的进度。
   */
  source: 'raster' | 'procedural' | 'hybrid'

  /**
   * 整副牌的修订号，进 URL 路径（`…/<deckId>/r<rev>/…`）。
   *
   * 【为什么必须有】静态资产按内容不变假设发 `immutable` 长缓存，
   * 而牌面文件名按设计恒定（= cardId，永不改）。两条各自正确的设计撞在一起，
   * 结果是**牌面在架构上不可更新**：返修一版画，老用户一年看不到。
   * 390 张手绘素材必然返修，这不是"如果"。
   * rev 是唯一的逃生口，且必须在第一张真图入库前就位 ——
   * 事后加要重排全部文件。
   */
  rev: number

  coverage: ArtworkCoverage

  /** cardId → 资产条目。键集合必须与 coverage 精确匹配 */
  cards: Readonly<Record<string, CardAsset>>

  /**
   * 不属于任何一张牌的资产。
   * 独立成组是刻意的：物理目录 `deck/` 与 `cards/` 分开之后，
   * 「封面绝不能是 78 张里的某一张」这条约束在文件系统层面也成立了 ——
   * 美术不可能"顺手"把一张牌放成封面。
   */
  deck: {
    cover: CardAsset | null
    back: CardAsset | null
  }

  /**
   * 程序化牌组使用的美术包 id。
   * `source === 'procedural'` 时必填，指向 legacy 的构图表。
   *
   * 【为什么要这层间接】即使今天五套 legacy 指向同一个包，
   * 有了这个字段，将来给某一套换独立构图就是**纯数据改动**。
   * 更重要的是：共享这件事从"代码里看不出来"变成"数据上写着"，
   * deck:check 可以断言它，不会再悄悄变成常态。
   */
  artPackId?: string

  /**
   * 开发用测试素材，**不是正式 artwork**。
   *
   * 【为什么需要这个标记而不是放宽规则】
   * coverage 只允许 0/22/78 三档，是为了禁止「这套画了 8 张」这种
   * 会被用户读成「这几张牌更高级」的状态。那条规则保护的是**生产牌组**。
   *
   * 而验证资产管线本身需要少量真图跑通 full → thumb → resolver → 浏览器。
   * 与其为此放宽三档规则（放宽了就再也收不回来），不如让 fixture 显式承认自己是假的：
   * 标记为 fixture 的牌组豁免三档检查，但**永远不可抽牌**，
   * 并且 deck:check 会把它们单独列出来 —— 不可能被悄悄当成已交付。
   *
   * 正式素材到位时删掉这个标记即可。
   */
  devFixture?: true
}

/* ══════════════════════════════════════════════════════════════
 * 二、resolveCardArtwork 的返回类型  ← 本架构的核心
 * ══════════════════════════════════════════════════════════ */

/**
 * 每个 plan 都带的身份标识。
 *
 * 【它是核心断言的抓手】
 * 「同一个 cardId 在不同 Deck 下必须解析到不同 artwork」这条最重要的不变量，
 * 在此之前**全库没有任何测试覆盖** —— 203 项断言全绿，唯独漏掉核心声称。
 * 而 V2.4 的失败模式恰恰是「元数据差异齐全、画面零差异」。
 *
 * identity 让这件事变得可断言：它是一个稳定字符串，
 * 同一张牌在两套牌组下若得到相同的 identity，就说明这两套共用了同一份美术。
 * 格式：`<source>:<packOrDeck>/<cardId>@r<rev>`
 */
export interface ArtworkIdentity {
  /** 稳定、可比对的字符串 */
  key: string
  /** 这份美术真正归属于谁。raster = deckId；procedural = artPackId */
  owner: string
  source: 'raster' | 'procedural' | 'missing'
}

/** legacy 牌组的程序化牌面。**仅 procedural manifest 可达，raster 牌组永远拿不到。** */
export interface ProceduralArtworkPlan {
  kind: 'procedural'
  deckId: DeckId
  cardId: string
  identity: ArtworkIdentity
  motif: string
  hue: number
  tier: 'signature' | 'placeholder'
}

/** 真实插画 */
export interface RasterArtworkPlan {
  kind: 'raster'
  deckId: DeckId
  cardId: string
  identity: ArtworkIdentity
  /** 懒加载。**调用它才会发网络请求** —— 何时调用是 G-05 的新战场，见 resolver 注释 */
  load: (variant?: AssetVariant) => Promise<ArtworkAsset>
  /** 最终 URL（full 档），用于调试与 UI 提示 */
  path: string
  /** 原图像素尺寸，写进 <img width height> 防 CLS */
  width: number
  height: number
  /** 是否有独立缩略图。没有时 thumb 档会回退到 full */
  hasThumb: boolean
  /**
   * 运行期加载失败时的程序化兜底。**只有 hybrid 牌组有**。
   *
   * 【它和 MissingArtworkPlan 解决的不是同一个问题】
   * `missing` 说的是「这张牌的素材从来没交付过」—— 那是待办事项，
   * 必须如实显示，绝不能用程序化图冒充成品（见 MissingArtworkPlan 注释）。
   *
   * 这里说的是「素材已交付并已登记，但这一次没加载到」——
   * 弱网、CDN 抖动、文件被误删。用户此刻正在读自己的占卜结果，
   * 让他在三张牌中间看到一张写着「加载失败」的方块，
   * 和让他看到一张能读的程序化牌面，前者没有任何额外价值：
   * 缺失的事实对他不可操作，而牌阵的完整性对他是全部意义。
   *
   * 所以只在**已登记**的牌上兜底，且只兜底到本牌组自己声明的
   * artPackId（不会串到别的牌组），并在 console 留一条 warn 供开发者定位。
   * raster 牌组没有 artPackId，拿不到这个字段，行为完全不变。
   */
  fallback?: {
    motif: string
    hue: number
    tier: 'signature' | 'placeholder'
  }
}

/**
 * 素材尚未提供。
 *
 * 【为什么必须有这个分支，而不是悄悄回退】
 * 回退到程序化 SVG = 用占位图冒充最终牌面；
 * 回退到别的牌组 = 这副牌里混进了别副牌的画。
 * 两者都会让「五套牌真的不一样」这句话变成谎话。
 * 所以缺素材就**如实显示缺素材**，并把期望路径直接写在界面上。
 */
export interface MissingArtworkPlan {
  kind: 'missing'
  deckId: DeckId
  cardId: string
  identity: ArtworkIdentity
  /** 需要美术提供的文件应该放在哪里 —— 直接显示给开发者看 */
  expectedPath: string
}

export type CardArtworkPlan = ProceduralArtworkPlan | RasterArtworkPlan | MissingArtworkPlan

/* ══════════════════════════════════════════════════════════════
 * 三、牌面装帧：边框 / 字体 / 编号 / 装饰
 * ══════════════════════════════════════════════════════════ */

/**
 * 卡框装帧。**每个字段都必须有渲染消费方。**
 *
 * 【这里为什么变短了】
 * 旧版有 5 个字段（borderColor / borderWidth / inlay / vignette / cornerOrnament），
 * 在 registry 里给 10 套牌各赋了值 —— 而 `CardFrame` 一个都不读，
 * 全库 grep 消费方数为 0。也就是说「elysian 是 double inlay + leaf 四角装饰」
 * 一个像素都没渲染出来，A 组那条「5 套装帧互不相同」的断言在守空气。
 *
 * 这恰好是 deck:check 的「死数据检查」注释里痛陈的 V2.4 教训
 * （ritualMotif 声明而不消费），而那段检查只查了 description 和 DeckCover，
 * 漏掉了 spec 里最大的一块。
 *
 * 现在的规矩：**字段进这个接口的前提是 CardFrame 真的画它**，
 * 并且 deck:check 会扫源码确认消费方存在。想加装饰母题？
 * 先把绘制代码写了再加字段。
 */
export interface DeckFrameSpec {
  /** 外框描边色（CSS 值或 var()）。CardFrame 用它画边 */
  borderColor: string
  /** 描边宽度 px */
  borderWidth: number
  /** 内衬线：无 / 单发丝 / 双线。CardFrame 用 inset box-shadow 画 */
  inlay: 'none' | 'hairline' | 'double'
  /** 暗角强度 0–1。CardFrame 用 radial-gradient 覆层画 */
  vignette: number
}

/** 只给样式 token，**不给任何文本** —— 牌名来自 Layer 1 */
export interface DeckTypeSpec {
  nameFont: string
  nameWeight: number
  nameTracking: string
  nameCase: 'as-is' | 'upper'
}

/** 数字本身来自 TarotCard.number；这里只决定怎么画它 */
export interface DeckNumberingSpec {
  style: 'roman' | 'arabic' | 'none'
  position: 'top' | 'bottom' | 'corner'
  font: string
}

/** 卡背规格。**不含 cardId** —— 78 张卡背必然一致 */
export interface DeckCardBackSpec {
  kind: 'procedural' | 'raster'
  /** kind === 'procedural' 时的构图 id */
  composition?: CardBackComposition
}

export type CardBackComposition = 'orbit' | 'lunar' | 'botanic' | 'constellation' | 'veil'

export interface DeckVisualSpec {
  frame: DeckFrameSpec
  typography: DeckTypeSpec
  numbering: DeckNumberingSpec
  cardBack: DeckCardBackSpec
}

/* ══════════════════════════════════════════════════════════════
 * 四、牌组定义（组合根）
 * ══════════════════════════════════════════════════════════ */

export interface DeckDefinition {
  deckId: DeckId
  /** 'artwork' = 目标牌组（需 78/78 才能抽牌）；'legacy' = V2.4 遗留（可抽牌） */
  kind: 'artwork' | 'legacy'
  name: string
  /** 一句非常短的氛围白描，8–16 字。只描述「房间」，不描述「效果」 */
  tagline: string
  /** 展开态的定位说明，40–90 字。同样只描述房间 */
  description: string
  visual: DeckVisualSpec
  /** 只引 id，不内联 —— 保证氛围层可独立演进与独立断言 */
  atmosphereId: AtmosphereId

  /* ★ 永久禁止的字段（deck:check F 组按键名白名单 + 正则双重拦截）：
     previewCards —— 已提为全局 PREVIEW_CARD_IDS，五套必须用同一批牌
     coverageLabel —— 完成度不进 UI 文案，只做内部不变量
     toneHint / ritualMotif —— 前者离牌义只有一步，后者是零消费的死数据
     rank / rarity / locked / popular / recommended / price —— 排序即优劣 */
}

/** 把一套牌组的氛围变量转成可挂在容器 style 上的对象 */
export type DeckThemeStyle = CSSProperties
