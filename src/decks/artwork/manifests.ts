/**
 * Layer 2 · 各牌组的资产清单（Artwork Manifest）
 *
 * 【统一入口：10 套牌组，10 份 manifest】
 * 旧版只有 5 套 artwork 有 manifest，legacy 走一条完全不同的旁路 ——
 * `LEGACY_CARD_ART[cardId]` 单表查找，**deckId 在那条路径上被丢弃**。
 * 后果实测过：5 套 legacy 返回逐字节相同的美术计划。
 * 而且那不是「素材没补」，是数据模型里根本没有 deckId 维度。
 *
 * 现在每一套牌组都必须在这里登记，解析链固定为：
 *
 *     deckId → manifest → cardId → 资产
 *
 * deckId 出现在第一步，结构上不可能被绕过。
 *
 * 【为什么是手工登记而不是自动扫盘】
 * 真正的原因不是「多一道 review」（贴文件和加登记通常是同一个人同一个 commit）。
 * 是 deck:check 用 tsx 在 **Node** 下直接 import 本模块，
 * 而 `import.meta.glob` 在那里不存在 —— 自动扫盘会让整套断言跑不起来。
 * 长期方案是 codegen 产物入库（脚本扫盘生成本文件 + 尺寸 + 缩略图标记），
 * 那样 git diff 本身就是 review artifact，还能看出「这张图尺寸不对」。
 *
 * ═══════════════════════════════════════════════════════════
 * 当前状态：**5 套 artwork 牌组全部为空（0/78），5 套 legacy 共用一个程序化美术包**
 *
 * 仓库里没有任何一张塔罗插画。artwork 牌组不可用于抽牌；
 * legacy 牌组可用，但它们共用 `legacy-procedural` 这一个包 ——
 * 这件事现在**写在数据里**（artPackId），而不是藏在代码分支中，
 * deck:check 会断言它，不会再悄悄变成常态。
 * ═══════════════════════════════════════════════════════════
 */

import type { ArtworkCoverage, CardAsset, DeckArtworkManifest } from '../types'
import { isDeliveredStatus } from '../art/types'
import type { DeckId } from '../ids'
import { ARTWORK_DECK_IDS, LEGACY_DECK_IDS } from '../ids'

/**
 * 22 张大阿卡纳的 canonical id，用于 coverage 判定。
 *
 * 【为什么是硬编码而不是从牌义层 import】
 * 旧版写的是 `import { majorArcana } from '@/data/deck'` —— **值导入**，
 * 于是视觉层在运行期持有 22 个完整 TarotCard 对象（含 meaningUpright、
 * keywordsReversed、symbols），而类型注释白纸黑字写着
 * 「本层只 type-only 引用 Layer 1 的 cardId，拿不到任何牌义」。
 * 那句话当时是假的。
 *
 * 这里只需要 22 个字符串，没有任何理由把牌义拖进视觉层。
 * deck:check 会断言这份列表与牌义层的实际大阿卡纳集合一致 ——
 * 校验放在测试里，运行期不引入耦合。
 */
export const MAJOR_ARCANA_IDS: readonly string[] = [
  'major-00', 'major-01', 'major-02', 'major-03', 'major-04', 'major-05',
  'major-06', 'major-07', 'major-08', 'major-09', 'major-10', 'major-11',
  'major-12', 'major-13', 'major-14', 'major-15', 'major-16', 'major-17',
  'major-18', 'major-19', 'major-20', 'major-21',
]

export const EXPECTED_FULL_COVERAGE = 78

/**
 * Phase 1 的五张对比牌。
 *
 * 【为什么 8 套必须用同一批牌】
 * 如果空灵展示星星、经典展示死神，用户看到的差异里就**混进了牌本身的差异**，
 * 他会以为「空灵偏光明、经典偏沉重」—— 而这正是
 * 「牌组有性格 → 牌组影响结果」这条错误推论的起点。
 * 正确的心智模型是：**同一个模特，拍八组照片**。变量必须只有画风。
 */
export const PREVIEW_CARD_IDS: readonly string[] = [
  'major-00', // The Fool 愚者 —— 人物 + 空间
  'major-01', // The Magician 魔术师 —— 器物 + 光源
  'major-02', // The High Priestess 女祭司 —— 对称构图 + 织物材质
  'major-06', // The Lovers 恋人 —— 两个主体的关系与取舍，构图张力最大
  'major-13', // Death 死神 —— 最难画不落俗套的一张
]

/** legacy 五套共用的程序化美术包 id */
export const LEGACY_ART_PACK = 'legacy-procedural'

const NO_CARDS: Readonly<Record<string, CardAsset>> = {}

/** 尚未交付任何素材的 raster 牌组 */
function emptyRasterManifest(deckId: DeckId): DeckArtworkManifest {
  return {
    deckId,
    source: 'raster',
    rev: 1,
    coverage: 'none',
    cards: NO_CARDS,
    deck: { cover: null, back: null },
  }
}

/**
 * Phase C1B-1 · Benchmark 试产原画的登记位。
 *
 * ══════════════════════════════════════════════════════════════
 * 【现在是空的，而且必须是空的】
 * 五张 The Fool Style Anchor 的**图像尚未生成**（本环境无图像生成能力）。
 * 在这里登记一条指向不存在文件的记录，就是「声称图片已经完成」——
 * 它会让 deck:check 的路径一致性、Deck Library 的进度、
 * 以及 Visual QA 页面同时说谎。所以宁可空着。
 *
 * 【图到位之后怎么接】
 * 1. 把 master 转成 1080×1800 WebP 放进
 *      public/assets/decks/<deckId>/cards/major-00.webp
 *    以及 240×400 的 public/assets/decks/<deckId>/thumbs/major-00.webp
 * 2. 在下面每套加一行：
 *      'legacy-moonlight': { 'major-00': { w: 1080, h: 1800, thumb: true, status: 'benchmark' } },
 * 3. `npm run artwork:check` —— B 组会断言：状态必须是 benchmark、
 *    五条路径互不相同、且**文件在磁盘上真实存在**。
 *
 * 登记为 benchmark 之后，正式产品仍然看不到它们（resolver 的 status 门槛），
 * 只有 /dev/benchmark 传 previewBenchmark 才渲染。人工评审通过后
 * 才把 status 改成 approved —— 那一刻起 Deck Library 的 n/78 才会变成 1/78。
 * ══════════════════════════════════════════════════════════ */
export const BENCHMARK_STAGED: Readonly<Record<string, Readonly<Record<string, CardAsset>>>> =
  Object.freeze({})

/** Style Anchor 这一轮只做这一张牌 */
export const STYLE_ANCHOR_CARD_ID = 'major-00'

/**
 * canonical five（月光 / 古典 / 森语 / 星图 / 幽影）。
 *
 * 【Phase C1A：从 procedural 升级为 hybrid】
 * 这五套从「只能程序化」变成「可承载真实原画，缺的逐张回退到程序化」。
 * 目前 cards 为空 —— 25 张 Benchmark 原画尚未生产（Phase C1B），
 * 所以全部 78 张仍由 ProceduralCardArt 顶着，牌可抽、可翻、可解读。
 *
 * artPackId 保留：它记录的是「回退时用哪个程序化包」，
 * 这层间接在原画逐步到位的过程中仍然有意义。
 */
function hybridManifest(deckId: DeckId): DeckArtworkManifest {
  return {
    deckId,
    source: 'hybrid',
    rev: 1,
    /* hybrid 的 coverage 表示**已交付的真实原画**数量档位；
       回退用的程序化图不计入 —— 它们不是原画。 */
    coverage: 'none',
    /* 已交付的原画（approved/final）+ 试产中的 benchmark 都登记在 cards 里。
       区分它们的是 status，不是两个字段 —— 两个字段迟早会有一个被漏读。 */
    cards: { ...NO_CARDS, ...(BENCHMARK_STAGED[deckId] ?? {}) },
    deck: { cover: null, back: null },
    artPackId: LEGACY_ART_PACK,
  }
}

/**
 * 【开发用 fixture 登记 —— 不是正式 artwork】
 *
 * 这几张是 `DEV FIXTURE / NOT REAL ARTWORK` 字样的测试图，
 * 只为验证「full → 生成器 → thumb → manifest → resolver → 浏览器」这条链路
 * 真的能跑通。正式素材到位时，把它们连同这段代码一起删掉即可。
 *
 * 它们被单独放在这里而不是混进 emptyRasterManifest，就是为了
 * **一眼能看出哪些是假的** —— 绝不能让 fixture 被误认为正式牌面。
 * deck:check 有一条断言专门检查它们没有被冒充成完整交付。
 */
const DEV_FIXTURE_ETHEREAL: DeckArtworkManifest = {
  deckId: 'ethereal',
  source: 'raster',
  rev: 1,
  devFixture: true,
  /* 只有 3 张，落在三档之外 → coverage 仍为 none → 这副牌**依旧不可抽牌**。
     这正是我们要的：fixture 不能让一副没画完的牌变得可用。 */
  coverage: 'none',
  cards: {
    'major-00': { w: 1080, h: 1800, thumb: true },
    'major-01': { w: 1080, h: 1800, thumb: true },
    'major-13': { w: 1080, h: 1800, thumb: true },
  },
  deck: {
    cover: { w: 1080, h: 1800, thumb: true },
    back: { w: 1080, h: 1800, thumb: true },
  },
}

export const artworkManifests: Readonly<Record<string, DeckArtworkManifest>> = Object.freeze({
  ...Object.fromEntries(ARTWORK_DECK_IDS.map((id) => [id, emptyRasterManifest(id)])),
  ...Object.fromEntries(LEGACY_DECK_IDS.map((id) => [id, hybridManifest(id)])),
  ethereal: DEV_FIXTURE_ETHEREAL,
})

export function getManifest(deckId: DeckId): DeckArtworkManifest | null {
  return artworkManifests[deckId] ?? null
}

/**
 * 由实际登记的资产推导 coverage。
 *
 * 【为什么推导而不是信手写的字段】
 * coverage 决定这副牌能不能抽。手写的会和实际资产脱节，
 * 脱节意味着可能放一副缺 30 张牌的牌组进正式抽牌。
 */
export function deriveCoverage(manifest: DeckArtworkManifest): ArtworkCoverage {
  if (manifest.source === 'procedural') return 'full'
  /* hybrid：只统计真正交付的原画（approved / final），
     benchmark 与回退用的程序化图都不算 */
  const ids = Object.keys(manifest.cards)
  if (ids.length === 0) return 'none'
  if (ids.length === EXPECTED_FULL_COVERAGE) return 'full'
  const majors = new Set(MAJOR_ARCANA_IDS)
  if (ids.length === 22 && ids.every((id) => majors.has(id))) return 'major'
  /* 落在三档之外 = 任意子集，被明确禁止（见 types.ts ArtworkCoverage）。
     降级为 none，并由 deck:check 把它变成一次构建失败。 */
  return 'none'
}

/**
 * 一份 manifest 里**已交付**的原画数量。
 *
 * 【只数 approved / final】
 * benchmark 是试产、placeholder 是占位、程序化回退根本不是原画。
 * 把它们任何一类算进来，Deck Library 的「n / 78」就会在
 * 一张画都没验收的情况下显示 5/78 —— 那不是进度，那是谎报。
 *
 * 【为什么以 manifest 为入参而不是 deckId】
 * 仓库里现在一张原画都没有，按 deckId 查真实数据永远只能测出 0，
 * "benchmark 不被计入"这条规则在真实数据上无法被证伪。
 * 入参改成 manifest 之后，B-03 可以喂一份含 benchmark 的内存 manifest
 * 去验真正的分支 —— 而不必在正式 manifest 里登记不存在的文件。
 */
export function countDelivered(manifest: DeckArtworkManifest): number {
  if (manifest.source === 'procedural') return EXPECTED_FULL_COVERAGE
  return Object.values(manifest.cards).filter((c) =>
    isDeliveredStatus(c.status ?? 'final'),
  ).length
}

/** 已有牌面数量，用于 Deck Library 的「n / 78」 */
export function artworkCardCount(deckId: DeckId): number {
  const manifest = getManifest(deckId)
  if (!manifest) return 0
  return countDelivered(manifest)
}

export { ARTWORK_DECK_IDS }
