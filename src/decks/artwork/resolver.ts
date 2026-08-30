/**
 * Layer 2 · deckId + cardId → artwork
 *
 * ══════════════════════════════════════════════════════════════
 * 唯一职责：给定「哪副牌」和「哪张牌」，回答「该画什么」。
 *
 * 纯函数，入参只有两个字符串，返回的 CardArtworkPlan 里
 * **没有任何 Layer 1 字段** —— 它连「知道这张牌是什么意思」都做不到，
 * 更不可能改变牌义、正逆位或抽牌结果。
 * ══════════════════════════════════════════════════════════════
 *
 * 【解析链固定为一条，deckId 在第一步】
 *
 *     deckId → manifest → cardId → 资产
 *
 * 旧版有两条路：raster 走 manifest，legacy 走 `LEGACY_CARD_ART[cardId]`
 * 单表查找 —— **deckId 在那条路径上被彻底丢弃**，
 * 实测 5 套 legacy 返回逐字节相同的美术计划。
 * 那不是素材缺失，是数据模型里没有 deckId 维度，补多少素材都不会变。
 * 现在只有一条路，绕不过去。
 *
 * 【G-05 的新战场：预加载会泄露牌面】
 * 程序化 SVG 时代零网络请求，「抽牌前泄露牌面」在物理上不存在。
 * 换成真实插画后，一个善意的优化 ——「把已摆放的三张先预加载」——
 * 就能让人从 DevTools 的 Network 面板看到下一张是什么。
 *
 * 而 URL 里明文含 cardId，这意味着**没有中间地带**：
 * 预取 3 张就等于剧透 3 张。所以规则必须是机械可执行的：
 *
 *   牌面资源的请求粒度只有两种 ——
 *     单张（且必须在 reveal 之后）
 *     整副（且必须是一个 URL）
 *   禁止任何 N 张（1 < N < 78）的批量。
 *
 * 这条比「任何往预取里传 session 的 PR 都应拒绝」可操作得多。
 *
 * 【禁止的四种「假装完成」】
 *   ✗ 同一张插画只改 hue     ✗ CSS 滤镜伪装不同牌组
 *   ✗ 同一 SVG 换配色        ✗ 缺失时静默回退到其它牌组的牌面
 */

import type {
  ArtworkAsset,
  ArtworkIdentity,
  AssetVariant,
  CardArtworkPlan,
  CardAsset,
  DeckArtworkManifest,
} from '../types'
import type { DeckId } from '../ids'
import { LEGACY_CARD_ART } from '../legacy/proceduralArt'
import { isDeliveredStatus } from '../art/types'
import { cardArtworkRepoPath, cardArtworkUrl } from './paths'
import { EXPECTED_FULL_COVERAGE, artworkCardCount, getManifest } from './manifests'

/* ══════════════════════════════════════════════════════════════
 * 资产加载
 * ══════════════════════════════════════════════════════════ */

/** 只缓存**成功**的加载。见下方注释 */
const assetCache = new Map<string, Promise<ArtworkAsset>>()

interface ImageLike {
  onload: (() => void) | null
  onerror: (() => void) | null
  src: string
  naturalWidth: number
  naturalHeight: number
}

/**
 * 加载一张资产。
 *
 * 【失败不进缓存 —— 这曾经是一个真实的 bug】
 * 旧版在 Promise 创建后立刻 `cache.set(url, promise)`，**包括最终 reject 的那个**。
 * 后果：一次瞬时网络抖动会把这张牌永久钉死在「加载失败」态，
 * 直到用户刷新整个页面。移动端弱网下这是必然事件，
 * 而它发生的位置是解读页 —— 用户会在自己的占卜结果里看到一张写着
 * 「加载失败」的牌，而且再也回不来。
 *
 * 现在 reject 时把缓存条目摘掉，下次挂载会重新尝试。
 */
function loadAsset(url: string, variant: AssetVariant): Promise<ArtworkAsset> {
  const cached = assetCache.get(url)
  if (cached) return cached

  const promise = new Promise<ArtworkAsset>((resolve, reject) => {
    const ImageCtor = (globalThis as { Image?: new () => ImageLike }).Image
    if (!ImageCtor) {
      /* Node / 测试环境：没有 Image，给出不带尺寸的资产 */
      resolve({ src: url, variant, width: 0, height: 0 })
      return
    }
    const img = new ImageCtor()
    img.onload = () =>
      resolve({ src: url, variant, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error(`[artwork] 资产加载失败：${url}`))
    img.src = url
  })

  promise.catch(() => {
    /* 失败的 promise 不留在缓存里，允许下次重试 */
    if (assetCache.get(url) === promise) assetCache.delete(url)
  })

  assetCache.set(url, promise)
  return promise
}

/* ══════════════════════════════════════════════════════════════
 * 身份
 * ══════════════════════════════════════════════════════════ */

/**
 * 这份美术真正归属于谁。
 *
 * raster      → deckId 本身（各套牌各有各的文件）
 * procedural  → artPackId（多套牌组可能共用一个包，这一点必须显式可见）
 */
function ownerOf(manifest: DeckArtworkManifest): string {
  return manifest.source === 'procedural'
    ? (manifest.artPackId ?? `${manifest.deckId}:unnamed-pack`)
    : manifest.deckId
}

function identityOf(
  manifest: DeckArtworkManifest,
  cardId: string,
  source: ArtworkIdentity['source'],
  rev: number,
): ArtworkIdentity {
  const owner = source === 'missing' ? manifest.deckId : ownerOf(manifest)
  return { key: `${source}:${owner}/${cardId}@r${rev}`, owner, source }
}

/** 某张牌生效的修订号：单张覆盖优先，否则用整副牌的 */
function revOf(manifest: DeckArtworkManifest, entry?: CardAsset): number {
  return entry?.rev ?? manifest.rev
}

/* ══════════════════════════════════════════════════════════════
 * 解析
 * ══════════════════════════════════════════════════════════ */

/**
 * 解析选项。
 *
 * 【previewBenchmark 是唯一的门槛豁免，且默认关闭】
 * Phase C1B 的 Style Anchor 评审需要在浏览器里看 `status: 'benchmark'` 的试产图 ——
 * 但那批图**没有经过人工批准**，正式产品里必须继续被挡住。
 *
 * 所以豁免做成一个必须由调用方显式传入的参数，而不是一个环境变量或全局开关：
 *   - 环境变量会让 `production` 与 `development` 的牌面**不是同一张**，
 *     评审通过的东西和用户看到的东西对不上；
 *   - 全局开关一旦被某个模块打开，就再也没人知道它什么时候是开的。
 *
 * 现在「谁看得到 benchmark」这件事在调用点一眼可见，
 * B-04 断言正式路径（不传 opts）永远不把 benchmark 当已交付。
 */
export interface ResolveOptions {
  /** 仅供 DEV Visual QA。正式渲染路径**绝不传 true** */
  previewBenchmark?: boolean
}

/**
 * 解析一张牌在某副牌组下该画什么。
 *
 * 纯函数、无副作用、**不发起任何网络请求** ——
 * 请求只在调用返回值里的 `load()` 时才发生。
 */
export function resolveCardArtwork(
  deckId: DeckId,
  cardId: string,
  opts: ResolveOptions = {},
): CardArtworkPlan {
  const manifest = getManifest(deckId)

  /* 没有 manifest 的牌组根本不该存在，但持久化里可能存着任何东西 */
  if (!manifest) {
    return {
      kind: 'missing',
      deckId,
      cardId,
      identity: { key: `missing:${deckId}/${cardId}@r0`, owner: deckId, source: 'missing' },
      expectedPath: cardArtworkRepoPath(deckId, cardId),
    }
  }

  return resolvePlanFrom(manifest, cardId, opts)
}

/**
 * manifest 注入版。**唯一实现**，`resolveCardArtwork` 只是它的查表包装。
 *
 * 存在的理由是可测性：仓库里目前一张原画都没有，
 * 「已交付原画优先于回退」「benchmark 默认被挡住」这类规则
 * 在真实数据上测不出来。把 manifest 变成入参之后，
 * 断言可以喂进一份内存中的 manifest 去验真实分支，
 * 而**不需要在正式 manifest 里登记不存在的文件**（那才是伪造交付）。
 */
export function resolvePlanFrom(
  manifest: DeckArtworkManifest,
  cardId: string,
  opts: ResolveOptions = {},
): CardArtworkPlan {
  const deckId = manifest.deckId

  /** 程序化回退。hybrid 与 procedural 共用同一条路径 */
  const proceduralPlan = (): CardArtworkPlan => {
    const art = LEGACY_CARD_ART[cardId]
    if (art) {
      return {
        kind: 'procedural',
        deckId,
        cardId,
        identity: identityOf(manifest, cardId, 'procedural', manifest.rev),
        motif: art.motif,
        hue: art.hue,
        tier: art.tier,
      }
    }
    return {
      kind: 'missing',
      deckId,
      cardId,
      identity: identityOf(manifest, cardId, 'missing', manifest.rev),
      expectedPath: cardArtworkRepoPath(deckId, cardId),
    }
  }

  /* ── 程序化牌组：查它自己声明的美术包 ──
     注意这里也是先经 manifest（deckId）再取 cardId，
     所以「这副牌用哪个包」是数据决定的，不是代码里写死的分支。 */
  if (manifest.source === 'procedural') return proceduralPlan()

  /* ── raster / hybrid：只认 manifest 里登记过的真实插画 ──
     【hybrid 的关键一行在下面的 else 分支】
     有原画就用原画，没有就逐张回退到程序化 —— 半套牌不会坏。
     只有 approved / final 算正式原画；benchmark 是试产，不进正式牌组。 */
  const entry = manifest.cards[cardId]
  const entryStatus = entry?.status ?? 'final'
  /* 正式路径：只认 approved / final。
     DEV Visual QA 路径：额外放行 benchmark —— 但**只放行 benchmark**，
     placeholder 依旧被挡住（占位图任何时候都不许冒充牌面）。 */
  const visible =
    entry !== undefined &&
    (isDeliveredStatus(entryStatus) ||
      (opts.previewBenchmark === true && entryStatus === 'benchmark'))
  if (entry && visible) {
    const rev = revOf(manifest, entry)
    const fullUrl = cardArtworkUrl(deckId, cardId, rev, 'full')
    const hasThumb = entry.thumb === true
    return {
      kind: 'raster',
      deckId,
      cardId,
      identity: identityOf(manifest, cardId, 'raster', rev),
      path: fullUrl,
      width: entry.w,
      height: entry.h,
      hasThumb,
      load: (variant: AssetVariant = 'full') => {
        const useThumb = variant === 'thumb' && hasThumb
        return loadAsset(
          useThumb ? cardArtworkUrl(deckId, cardId, rev, 'thumb') : fullUrl,
          useThumb ? 'thumb' : 'full',
        )
      },
    }
  }

  /* ── 缺素材 ──
     hybrid：回退到程序化，牌仍然可抽、可读、可解读（§16）
     raster：**绝不回退**，如实显示缺素材并写出期望路径
             —— 这条对未开工的 ethereal 等五套仍然成立 */
  if (manifest.source === 'hybrid') return proceduralPlan()

  return {
    kind: 'missing',
    deckId,
    cardId,
    identity: identityOf(manifest, cardId, 'missing', manifest.rev),
    expectedPath: cardArtworkRepoPath(deckId, cardId),
  }
}

/** 供断言与调试使用：这张牌在这副牌组下的美术身份字符串 */
export function artworkIdentity(deckId: DeckId, cardId: string): string {
  return resolveCardArtwork(deckId, cardId).identity.key
}

/* ══════════════════════════════════════════════════════════════
 * 可用性
 * ══════════════════════════════════════════════════════════ */

/**
 * 这副牌能不能用于正式抽牌。
 *
 * raster 牌组必须 78/78。差一张都不行 —— 摊牌时用户面对的是一整副牌，
 * 中间夹着几张「素材缺失」会直接摧毁「这是我自己从整副牌里抽出来的」。
 * procedural 牌组 78 张恒有，可用。
 */
export function isDeckPlayable(deckId: DeckId): boolean {
  const manifest = getManifest(deckId)
  if (!manifest) return false
  /* 开发 fixture 永远不可抽牌，无论登记了多少张 —— 它们是假图 */
  if (manifest.devFixture) return false
  if (manifest.source === 'procedural') return true
  /* hybrid 恒可抽：缺图的位置由程序化顶着，78 张永远都在。
     这正是「不许半套牌坏掉」与「不许用占位图冒充成品」之间的那条线 ——
     牌能抽，但 Deck Library 会如实显示 n/78。 */
  if (manifest.source === 'hybrid') return true
  return artworkCardCount(deckId) === EXPECTED_FULL_COVERAGE
}

/** Deck Library 的「n / 78」 */
export function deckProgress(deckId: DeckId): { done: number; total: number } {
  return { done: artworkCardCount(deckId), total: EXPECTED_FULL_COVERAGE }
}

/* ══════════════════════════════════════════════════════════════
 * 预热
 * ══════════════════════════════════════════════════════════ */

/**
 * 整副牌的缩略图预热。
 *
 * 【签名里没有 cardId —— 刻意的，和 DeckCardBack 是同一招】
 * 它拿不到牌的身份，就不可能按牌序预取，
 * Network 面板里的请求序列因此**零信息量**。
 *
 * 【只预热 thumb，且按 canonical 顺序】
 * full 档整副是十几 MB，移动端不可用；thumb 整副约 1.5MB，可接受。
 * 顺序固定按 cardId 字典序，绝不按 session 牌序。
 *
 * 【只应在牌桌之外调用】
 * Deck Library 停留、首页空闲。进入 session 后不再发起整副预取 ——
 * 此时任何流量变化都可能被关联到牌面。
 */
export function prefetchDeck(deckId: DeckId): Promise<void> {
  const manifest = getManifest(deckId)
  if (!manifest || manifest.source !== 'raster') return Promise.resolve()

  const urls = Object.entries(manifest.cards)
    .filter(([, entry]) => entry.thumb === true)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cardId, entry]) =>
      cardArtworkUrl(deckId, cardId, revOf(manifest, entry), 'thumb'),
    )

  return Promise.allSettled(urls.map((u) => loadAsset(u, 'thumb'))).then(() => undefined)
}

/** 供测试与自检使用：清空缓存 */
export function __clearArtworkCache(): void {
  assetCache.clear()
}
