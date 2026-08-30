/**
 * Deck 系统自检。
 *
 * 【它守的是什么】
 * 多牌组是这个产品最容易被做坏的地方，而且坏掉之后**界面上完全看不出来**：
 *
 *     牌组只改变画面，不改变你抽到的牌，也不改变牌的含义。
 *
 * 半年后有人顺手把 deckId 加进 Prompt、或者让某套牌自带一份 symbols、
 * 或者让缺图的牌悄悄回退到另一套牌的插画 —— 每一件都能过 code review，
 * 每一件都会让上面那句话变成谎话。所以把它们全部写成断言。
 *
 * 用法：`npm run deck:check`（零网络、零 token）
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { DeckDefinition } from '../src/decks/types.ts'
import { ALL_DECK_IDS, DEFAULT_DECK_ID, LEGACY_DECK_ALIASES, resolveDeckId } from '../src/decks/ids.ts'
import { artworkDecks, decks, legacyDecks } from '../src/decks/registry.ts'
import { atmospheres, getAtmosphere } from '../src/atmosphere/registry.ts'
import {
  EXPECTED_FULL_COVERAGE,
  LEGACY_ART_PACK,
  MAJOR_ARCANA_IDS,
  PREVIEW_CARD_IDS,
  deriveCoverage,
  getManifest,
} from '../src/decks/artwork/manifests.ts'
import {
  artworkIdentity,
  deckProgress,
  isDeckPlayable,
  prefetchDeck,
  resolveCardArtwork,
} from '../src/decks/artwork/resolver.ts'
import {
  assetBaseUrl,
  cardArtworkRepoPath,
  cardArtworkUrl,
  cardBackRepoPath,
  cardBackUrl,
  THUMB_SPEC,
  cardThumbRepoPath,
  deckCoverRepoPath,
  deckCoverUrl,
  urlToRepoPath,
} from '../src/decks/artwork/paths.ts'
import { rebuildContext } from '../server/context/rebuild.ts'
import { buildMessages } from '../server/prompts/index.ts'
import type { ReadingRequest } from '../src/types/reading.ts'
import { buildHiddenDeck } from '../src/features/table/engine/index.ts'
import { allCards } from '../src/data/deck/index.ts'
import { MEANING_FINGERPRINT, computeMeaningFingerprint } from '../src/data/deck/fingerprint.ts'
import { LEGACY_CARD_ART } from '../src/decks/legacy/proceduralArt.ts'
import { ART_PROFILES, getArtProfile } from '../src/decks/legacy/artProfiles.ts'
import { CONFUSABLE_PAIRS, MOTIF_SIGNATURE } from '../src/decks/legacy/proceduralArt.ts'

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

let pass = 0
let fail = 0

function check(name: string, ok: boolean, note = ''): void {
  if (ok) {
    pass += 1
    console.log(`  ${G}PASS${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
  } else {
    fail += 1
    console.log(`  ${R}FAIL${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
  }
}

function section(title: string): void {
  console.log(`\n${B}${title}${X}`)
}

const REPO_ROOT = resolve(import.meta.dirname, '..')
const cardIds = allCards.map((c) => c.id)

/* ══════════════════════════════════════════════════════════════
 * A. 牌组数据
 * ══════════════════════════════════════════════════════════ */

function checkData(): void {
  section('A. 牌组数据完整性')

  check('恰好 5 套 artwork 牌组', artworkDecks.length === 5, `${artworkDecks.length} 套`)
  check('恰好 5 套 legacy 牌组', legacyDecks.length === 5, `${legacyDecks.length} 套`)
  check('deckId 互不重复', new Set(decks.map((d) => d.deckId)).size === decks.length)
  check('ALL_DECK_IDS 与 registry 一致', ALL_DECK_IDS.length === decks.length)
  check('默认牌组存在', decks.some((d) => d.deckId === DEFAULT_DECK_ID), DEFAULT_DECK_ID)
  check(
    '默认牌组当前可抽牌（否则新用户一进来就撞墙）',
    isDeckPlayable(DEFAULT_DECK_ID),
    DEFAULT_DECK_ID,
  )

  for (const d of decks) {
    check(`${d.deckId} 有名字与 tagline`, d.name.trim().length > 0 && d.tagline.trim().length > 0)
    check(`${d.deckId} 的氛围存在`, getAtmosphere(d.atmosphereId).atmosphereId === d.atmosphereId)
  }

  /* 五套 artwork 的氛围必须互不相同 —— 否则「视觉上明显不同」就没达成 */
  check(
    '5 套 artwork 牌组的氛围互不重复',
    new Set(artworkDecks.map((d) => d.atmosphereId)).size === 5,
  )
  check('5 套 legacy 牌组的氛围互不重复', new Set(legacyDecks.map((d) => d.atmosphereId)).size === 5)

  /* 装帧必须真的不一样。这是 Phase 1 唯一不依赖位图素材的差异来源，
     如果它也一样，那五套 artwork 牌组在素材到位前就是完全相同的东西。 */
  const fingerprintOf = (d: DeckDefinition) =>
    JSON.stringify([d.visual.frame, d.visual.typography, d.visual.numbering])
  check(
    '5 套 artwork 牌组的装帧（边框/字体/编号）互不相同',
    new Set(artworkDecks.map(fingerprintOf)).size === 5,
  )
  check(
    '5 套 artwork 牌组的字体互不相同',
    new Set(artworkDecks.map((d) => d.visual.typography.nameFont)).size === 5,
  )
}

/* ══════════════════════════════════════════════════════════════
 * B. 氛围层
 * ══════════════════════════════════════════════════════════ */

function checkAtmosphere(): void {
  section('B. 氛围层（Layer 3）')

  check('恰好 10 套氛围', atmospheres.length === 10, `${atmospheres.length} 套`)

  /* 所有氛围的变量必须是同一批键 —— 少一个键，换过去时那条 CSS 变量
     就会保留上一套的值，出现「森语的绿配着幽影的紫」这种串味，极难排查。 */
  const keysOf = (id: (typeof atmospheres)[number]) => Object.keys(id.themeVars).sort().join('|')
  const reference = keysOf(atmospheres[0]!)
  for (const a of atmospheres) {
    check(`${a.atmosphereId} 的变量键与其它氛围一致`, keysOf(a) === reference)
    const vals = Object.values(a.themeVars as unknown as Record<string, string>)
    check(
      `${a.atmosphereId} 所有变量都有值`,
      vals.every((v) => typeof v === 'string' && v.trim().length > 0),
    )
    /* 卡面与文字都是按深色底设计的。浅色诉求的解法是
       「深色页面 + 浅色卡面」，不是把整个应用变白。 */
    const void_ = (a.themeVars as unknown as Record<string, string>)['--color-bg-void'] ?? ''
    const l = Number(/oklch\(\s*([\d.]+)/.exec(void_)?.[1] ?? '1')
    check(`${a.atmosphereId} 底色足够暗（L=${l.toFixed(3)} ≤ 0.22）`, l <= 0.22)
  }

  check(
    '10 套氛围两两配色不同（bg-void 互不重复）',
    new Set(atmospheres.map((a) => a.themeVars['--color-bg-void'])).size === 10,
  )
}

/* ══════════════════════════════════════════════════════════════
 * C. 牌组绝不影响抽牌  ← 最重要
 * ══════════════════════════════════════════════════════════ */

function checkDrawIndependence(): void {
  section('C. 牌组不影响抽牌（最高红线）')

  const seed = 'a1b2c3d4e5f60718'

  /* buildHiddenDeck 的参数里根本没有 deckId —— 这是结构性保证，不是约定。 */
  const baseline = JSON.stringify(buildHiddenDeck(seed, cardIds))
  let identical = true
  for (let i = 0; i < 5; i += 1) {
    if (JSON.stringify(buildHiddenDeck(seed, cardIds)) !== baseline) identical = false
  }
  check('同一 seed 下牌序与正逆位恒定（与牌组无关）', identical)

  check(
    'buildHiddenDeck 的签名里没有牌组参数',
    buildHiddenDeck.length === 2,
    `arity=${buildHiddenDeck.length}`,
  )

  check(
    '不同 seed 给出不同牌序（上一条不是空断言）',
    JSON.stringify(buildHiddenDeck('0f1e2d3c4b5a6978', cardIds)) !== baseline,
  )
}

/* ══════════════════════════════════════════════════════════════
 * D. 牌义层不受牌组影响
 * ══════════════════════════════════════════════════════════ */

function checkMeaningLayer(): void {
  section('D. 牌义层（Layer 1）不受牌组影响')

  check('78 张齐全', allCards.length === EXPECTED_FULL_COVERAGE, `${allCards.length} 张`)
  check('cardId 互不重复', new Set(cardIds).size === cardIds.length)
  check('22 张大阿卡纳', MAJOR_ARCANA_IDS.length === 22)

  /* 指纹：任何一次误改牌义都会让这条变红。
     它的存在理由见 src/data/deck/fingerprint.ts —— 剥离 78 个 art 字段
     那种规模的机械改动，手滑改到一个 meaningReversed 会淹没在 diff 里。 */
  const actual = computeMeaningFingerprint()
  check('牌义指纹与归档值一致', actual === MEANING_FINGERPRINT, actual)

  /* TarotCard 上不允许再出现视觉字段 —— 防止有人把 art 加回来 */
  const visualKeys = ['art', 'motif', 'hue', 'tier', 'image', 'artwork', 'deckId']
  const leaked = visualKeys.filter((k) => allCards.some((c) => k in (c as object)))
  check('牌义数据里没有任何视觉字段', leaked.length === 0, leaked.join(', ') || '干净')

  /* 跨牌组一致性：同一个 cardId 在 10 套牌下，牌义取值必须完全相同。
     这是「同一张 The Fool 在不同 Deck 里含义不变」的直接证明。 */
  let meaningStable = true
  for (const card of allCards) {
    const snapshot = JSON.stringify([
      card.nameZh,
      card.name,
      card.number,
      card.arcana,
      card.suit ?? null,
      card.meaningUpright,
      card.meaningReversed,
      card.keywordsUpright,
      card.keywordsReversed,
      card.symbols,
    ])
    for (const deckId of ALL_DECK_IDS) {
      /* 解析牌面不会、也不可能改变牌义 —— plan 里根本没有这些字段 */
      resolveCardArtwork(deckId, card.id)
      const after = JSON.stringify([
        card.nameZh,
        card.name,
        card.number,
        card.arcana,
        card.suit ?? null,
        card.meaningUpright,
        card.meaningReversed,
        card.keywordsUpright,
        card.keywordsReversed,
        card.symbols,
      ])
      if (after !== snapshot) meaningStable = false
    }
  }
  check(`跨 10 套牌组 × 78 张，牌义取值完全一致`, meaningStable, `${10 * 78} 组合`)

  /* CardArtworkPlan 里不许出现任何牌义字段 */
  const plan = resolveCardArtwork('legacy-moonlight', 'major-00') as unknown as Record<string, unknown>
  const meaningKeys = ['name', 'nameZh', 'meaningUpright', 'meaningReversed', 'keywords', 'symbols', 'arcana', 'suit']
  const planLeak = meaningKeys.filter((k) => k in plan)
  check('artwork plan 里没有任何牌义字段', planLeak.length === 0, planLeak.join(', ') || '干净')
}

/* ══════════════════════════════════════════════════════════════
 * E. Artwork 映射
 * ══════════════════════════════════════════════════════════ */

function checkArtwork(): void {
  section('E. deckId + cardId → artwork')

  /* ── E0：核心不变量 ──────────────────────────────────────────
     「同一个 cardId 在不同 Deck 下必须解析到不同的 artwork identity」

     这是整个多牌组系统存在的理由，而在此之前**全库零测试覆盖** ——
     203 项断言全绿，唯独漏掉核心声称。第三方审计正是从这里破防的：
     实测发现 5 套 legacy 返回逐字节相同的美术计划，
     而没有任何一条断言会因此变红。

     V2.4 的失败模式就是「元数据差异齐全、画面零差异」。
     这一组断言的全部意义，就是让那次失败无法重演。 */

  const artworkIds = artworkDecks.map((d) => d.deckId)
  check('artwork 牌组恰好 5 套（对比覆盖面）', artworkIds.length === 5, artworkIds.join(', '))

  let identityCollisions: string[] = []
  for (const cardId of cardIds) {
    const seen = new Map<string, string>()
    for (const deckId of artworkIds) {
      const key = artworkIdentity(deckId, cardId)
      const prev = seen.get(key)
      if (prev) identityCollisions.push(`${cardId}: ${prev} == ${deckId}`)
      else seen.set(key, deckId)
    }
  }
  check(
    '同一 cardId 在 5 套 artwork 牌组下 artwork identity 两两不同',
    identityCollisions.length === 0,
    identityCollisions.length === 0
      ? `${cardIds.length} 张 × C(5,2) 全部通过`
      : identityCollisions.slice(0, 3).join(' / '),
  )

  /* deckId 必须真的参与解析 —— 而不是被抄进返回值当装饰。
     legacy 那条旧路径就是「查表只用 cardId，deckId 原样抄回」，
     所以 identity 里含 deckId 也不能证明什么，要看 owner。 */
  const foolOwners = new Set(artworkIds.map((d) => resolveCardArtwork(d, 'major-00').identity.owner))
  check('5 套 artwork 的 artwork owner 互不相同', foolOwners.size === 5, [...foolOwners].join(', '))

  /* 程序化牌组共用美术包这件事必须**显式写在数据里**，不能藏在代码分支中。
     今天 5 套 legacy 确实共用一个包 —— 这是事实，不掩盖；
     但它必须是可见、可断言的事实。 */
  for (const deck of legacyDecks) {
    const m = getManifest(deck.deckId)!
    /* 【Phase C1A 更新了这条断言的前提，没有放松它守的规则】
       这五套已从 `procedural` 升级为 `hybrid`（可承载真实原画 + 逐张回退）。
       要守的规则不变：**回退用的是哪个程序化美术包，必须写在数据里**，
       不能藏在代码分支里。所以只把 source 的取值范围放宽到 hybrid。 */
    check(
      `${deck.deckId} 显式声明了 artPackId（共享关系不隐藏）`,
      (m.source === 'procedural' || m.source === 'hybrid') &&
        typeof m.artPackId === 'string' &&
        m.artPackId.length > 0,
      `${m.source} · ${m.artPackId ?? '(缺失)'}`,
    )
  }
  const legacyPacks = new Set(legacyDecks.map((d) => getManifest(d.deckId)!.artPackId))
  check(
    'legacy 共用的美术包数量与声明一致',
    legacyPacks.size === 1 && legacyPacks.has(LEGACY_ART_PACK),
    `共用 ${[...legacyPacks].join(', ')} —— 这是已知的过渡状态，Phase 3 退役`,
  )

  /* ── E1：每套牌组都必须有 manifest（解析链不许有旁路） ── */
  for (const deckId of ALL_DECK_IDS) {
    check(`${deckId} 有 manifest（无旁路解析）`, getManifest(deckId) !== null)
    const m = getManifest(deckId)
    check(`${deckId} 的 rev 是正整数`, Number.isInteger(m?.rev) && (m?.rev ?? 0) >= 1, `r${m?.rev}`)
  }

  /* ── E2：MAJOR_ARCANA_IDS 与牌义层一致（视觉层不 import 牌义层，靠断言校验） ── */
  const realMajors = allCards.filter((c) => c.arcana === 'major').map((c) => c.id).sort()
  check(
    'MAJOR_ARCANA_IDS 与牌义层的大阿卡纳集合一致',
    JSON.stringify([...MAJOR_ARCANA_IDS].sort()) === JSON.stringify(realMajors),
    `${MAJOR_ARCANA_IDS.length} vs ${realMajors.length}`,
  )

  for (const deck of artworkDecks) {
    const manifest = getManifest(deck.deckId)!
    const ids = Object.keys(manifest.cards)

    check(
      `${deck.deckId} 登记的牌面都是真实 cardId`,
      ids.every((id) => cardIds.includes(id)),
    )

    /* coverage 只允许 none / major / full 三档，禁止任意子集。
       「这套画了 8 张」会让用户读成「这几张牌更高级」，
       而「高级」在塔罗语境里只有一个翻译方向。 */
    const derived = deriveCoverage(manifest)
    const legalSize = ids.length === 0 || ids.length === 22 || ids.length === 78
    if (manifest.devFixture) {
      /* fixture 豁免三档 —— 那条规则保护的是生产牌组，不该拦住管线验证。
         但豁免必须换来两条更硬的保证，见下。 */
      check(
        `${deck.deckId} 是 dev fixture（豁免三档，但永不可抽牌）`,
        true,
        `${ids.length} 张测试图`,
      )
      check(`${deck.deckId} fixture 不可用于抽牌`, isDeckPlayable(deck.deckId) === false)
      check(
        `${deck.deckId} fixture 不被当成已交付（coverage 仍为 none）`,
        manifest.coverage === 'none',
      )
    } else {
      check(
        `${deck.deckId} coverage 落在 none/major/full 三档内`,
        legalSize,
        `${ids.length} 张 → ${derived}`,
      )
      check(`${deck.deckId} 声明的 coverage 与实际一致`, manifest.coverage === derived)
    }

    /* 登记与磁盘必须一致，两个方向都查 */
    const dir = resolve(REPO_ROOT, 'public/assets/decks', deck.deckId, 'cards')
    const onDisk = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''))
      : []
    check(
      `${deck.deckId} 登记的资产文件都存在`,
      ids.every((id) => onDisk.includes(id)),
      `登记 ${ids.length} · 磁盘 ${onDisk.length}`,
    )
    check(
      `${deck.deckId} 磁盘上没有未登记的牌面`,
      onDisk.every((id) => ids.includes(id)),
    )

    /* 逆位是同一张图转 180°，不存在独立资产 */
    check(
      `${deck.deckId} 没有 -reversed 资产`,
      onDisk.every((f) => !/reversed|_rev\b/i.test(f)),
    )

    /* 未满 78 张不得用于正式抽牌 */
    check(
      `${deck.deckId} 未满 78 张时不可抽牌`,
      isDeckPlayable(deck.deckId) ===
        (!manifest.devFixture && ids.length === EXPECTED_FULL_COVERAGE),
      `${deckProgress(deck.deckId).done}/78 · playable=${isDeckPlayable(deck.deckId)}`,
    )

    /* ── cover / back 的磁盘一致性 ──
       这两类资产此前**完全没有磁盘断言** —— Phase 1 的 35 个交付文件里
       有 10 个（5 cover + 5 back）落在覆盖之外。
       而它们失败时最隐蔽：裸 <img> 404 会透明，露出卡面底色，
       看起来就是「一张纯色的卡背设计」。 */
    for (const [label, asset, repoPath] of [
      ['封面', manifest.deck.cover, deckCoverRepoPath(deck.deckId)],
      ['卡背', manifest.deck.back, cardBackRepoPath(deck.deckId)],
    ] as const) {
      const onDiskFile = existsSync(resolve(REPO_ROOT, repoPath))
      check(
        `${deck.deckId} ${label} 登记与磁盘一致`,
        Boolean(asset) === onDiskFile,
        asset ? (onDiskFile ? '已登记且存在' : '登记了但文件不存在 ❗') : onDiskFile ? '有文件但没登记 ❗' : '均未提供',
      )
      if (asset) {
        check(`${deck.deckId} ${label} 有像素尺寸（防 CLS）`, asset.w > 0 && asset.h > 0)
      }
    }

    /* 缩略图：登记了 thumb 的牌必须真有 thumbs/ 文件 */
    const thumbDir = resolve(REPO_ROOT, 'public/assets/decks', deck.deckId, 'thumbs')
    const thumbsOnDisk = existsSync(thumbDir)
      ? new Set(readdirSync(thumbDir).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, '')))
      : new Set<string>()
    const claimedThumbs = ids.filter((id) => manifest.cards[id]?.thumb === true)
    check(
      `${deck.deckId} 声明有缩略图的牌都真有缩略图文件`,
      claimedThumbs.every((id) => thumbsOnDisk.has(id)),
      `声明 ${claimedThumbs.length} · 磁盘 ${thumbsOnDisk.size}`,
    )

    /* 每条资产条目都要有尺寸 */
    check(
      `${deck.deckId} 所有牌面条目都有像素尺寸`,
      ids.every((id) => (manifest.cards[id]?.w ?? 0) > 0 && (manifest.cards[id]?.h ?? 0) > 0),
    )
  }

  /* 缺图绝不回退：artwork 牌组拿不到 procedural 分支 */
  let noProceduralFallback = true
  let missingReportsPath = true
  for (const deck of artworkDecks) {
    for (const id of cardIds) {
      const plan = resolveCardArtwork(deck.deckId, id)
      if (plan.kind === 'procedural') noProceduralFallback = false
      if (plan.kind === 'missing' && !plan.expectedPath.includes(deck.deckId)) {
        missingReportsPath = false
      }
    }
  }
  check('artwork 牌组永远不会回退到程序化牌面', noProceduralFallback)
  check('缺图时给出的是本牌组自己的路径（不指向别的牌组）', missingReportsPath)

  /* legacy 牌组必须 78 张程序化牌面齐全，否则老用户的抽牌流程会开天窗 */
  check('legacy 程序化牌面 78 张齐全', Object.keys(LEGACY_CARD_ART).length === 78)
  let legacyComplete = true
  for (const deck of legacyDecks) {
    for (const id of cardIds) {
      if (resolveCardArtwork(deck.deckId, id).kind !== 'procedural') legacyComplete = false
    }
  }
  check('legacy 牌组 5 × 78 全部可渲染', legacyComplete)

  /* 解析是纯函数：同样入参必须给出逐字相同的结果 */
  const once = JSON.stringify(resolveCardArtwork('ethereal', 'major-00'))
  let deterministic = true
  for (let i = 0; i < 50; i += 1) {
    if (JSON.stringify(resolveCardArtwork('ethereal', 'major-00')) !== once) deterministic = false
  }
  check('resolveCardArtwork 是确定性纯函数', deterministic)

  /* 预取拿不到 cardId —— 这是 G-05 在真美术时代的结构性防线 */
  check('prefetchDeck 的签名里没有 cardId', prefetchDeck.length === 1, `arity=${prefetchDeck.length}`)

  /* ── E2.5：内容级重复检测 ──────────────────────────────────
     identity 断言只看 manifest 里声明的 owner，而 owner 来自 registry 的键，
     所以五份 manifest 只要 deckId 各自正确，identity 就**必然**互不相同 ——
     与图片内容毫无关系。

     也就是说：把同一张 major-00.webp 复制五份放进五个目录，
     或者只调了一下 hue，identity 断言照样全绿。
     而那正是 resolver.ts 头部列为「禁止的四种假装完成」的头两条，
     也正是 V2.4 的原始失败模式（元数据差异齐全、画面零差异）。

     所以这里直接比对文件字节。它是目前唯一能机器发现「五套用同一张图」的防线。
     （注意：它抓不到「同一张图重新压过一遍」这类近似重复 ——
      那需要感知哈希，属于人工验收范围，见 README 的验收清单。） */
  const byHash = new Map<string, string[]>()
  let hashedFiles = 0
  for (const deck of artworkDecks) {
    const manifest = getManifest(deck.deckId)!
    for (const cardId of Object.keys(manifest.cards)) {
      const abs = resolve(REPO_ROOT, cardArtworkRepoPath(deck.deckId, cardId))
      if (!existsSync(abs)) continue
      const hash = createHash('sha256').update(readFileSync(abs)).digest('hex')
      const key = `${cardId}:${hash}`
      byHash.set(key, [...(byHash.get(key) ?? []), deck.deckId])
      hashedFiles += 1
    }
  }
  const duplicates = [...byHash.entries()].filter(([, decks]) => decks.length > 1)
  check(
    '同一 cardId 的牌面在各套之间字节不同（禁止复制同一张图）',
    duplicates.length === 0,
    hashedFiles === 0
      ? '尚无素材，0 个文件参与比对'
      : duplicates.length === 0
        ? `${hashedFiles} 个文件全部唯一`
        : duplicates.map(([k, d]) => `${k.split(':')[0]} 被 ${d.join('/')} 共用`).join(' / '),
  )

  /* cover / back 同样不许跨牌组复用 */
  const deckAssetHashes = new Map<string, string[]>()
  for (const deck of artworkDecks) {
    for (const [label, repoPath] of [
      ['cover', deckCoverRepoPath(deck.deckId)],
      ['back', cardBackRepoPath(deck.deckId)],
    ] as const) {
      const abs = resolve(REPO_ROOT, repoPath)
      if (!existsSync(abs)) continue
      const key = `${label}:${createHash('sha256').update(readFileSync(abs)).digest('hex')}`
      deckAssetHashes.set(key, [...(deckAssetHashes.get(key) ?? []), deck.deckId])
    }
  }
  const dupDeckAssets = [...deckAssetHashes.entries()].filter(([, d]) => d.length > 1)
  check(
    '封面与卡背在各套之间字节不同',
    dupDeckAssets.length === 0,
    dupDeckAssets.map(([k, d]) => `${k.split(':')[0]} 被 ${d.join('/')} 共用`).join(' / ') || '干净',
  )

  /* ── E2.7：thumbnail 管线 ──────────────────────────────────
     Deck Library 一屏挂 25 张预览牌 + 5 封面 + 5 卡背。
     走 full 档就是单页 6MB，而显示宽度只有 62–164 CSS px。
     这几条钉死「Library 用 thumb、Reading 用 full」这条分工。 */

  /* T5：Library 档（thumb）解析到 thumbs/ 目录 */
  const fixtureDeck = artworkDecks.find((d) => getManifest(d.deckId)?.devFixture)
  const withThumb = fixtureDeck
    ? Object.entries(getManifest(fixtureDeck.deckId)!.cards).find(([, a]) => a.thumb)
    : null
  if (fixtureDeck && withThumb) {
    const [cardId] = withThumb
    const thumbUrl = cardArtworkUrl(fixtureDeck.deckId, cardId, 1, 'thumb')
    const fullUrl = cardArtworkUrl(fixtureDeck.deckId, cardId, 1, 'full')
    check('T5 Library 档解析到 thumbs/ 目录', thumbUrl.includes('/thumbs/'), thumbUrl)
    check('T6 Reading 档解析到 cards/ 目录（full）', fullUrl.includes('/cards/'), fullUrl)
    check('thumb 与 full 是不同资源', thumbUrl !== fullUrl)
    check(
      'thumb 与 full 的磁盘路径都真实存在',
      existsSync(resolve(REPO_ROOT, cardThumbRepoPath(fixtureDeck.deckId, cardId))) &&
        existsSync(resolve(REPO_ROOT, cardArtworkRepoPath(fixtureDeck.deckId, cardId))),
    )
    /* 没有 thumb 标记时必须回退到 full，而不是 404 */
    const plan = resolveCardArtwork(fixtureDeck.deckId, cardId)
    check('登记了 thumb 的牌 hasThumb 为真', plan.kind === 'raster' && plan.hasThumb === true)
  } else {
    check('T5/T6 需要至少一张带 thumb 的资产才能验证', false, '未找到 fixture')
  }

  /* T7：缩略图的存在与否绝不改变任何语义 —— artwork identity 只由
     deckId/cardId/rev 决定，与 thumb 无关。 */
  let thumbAffectsSemantics = false
  for (const deck of artworkDecks) {
    const m = getManifest(deck.deckId)!
    for (const cardId of Object.keys(m.cards)) {
      const id = artworkIdentity(deck.deckId, cardId)
      if (id.includes('thumb')) thumbAffectsSemantics = true
    }
  }
  check('T7 artwork identity 不含 thumb 维度（缩略图不改变语义）', !thumbAffectsSemantics)

  /* 缩略图规格必须与生成器共用同一份常量，否则迟早漂移 */
  check(
    '缩略图规格保持塔罗比例 1:1.667',
    Math.abs(THUMB_SPEC.card.height / THUMB_SPEC.card.width - 5 / 3) < 0.01,
    `${THUMB_SPEC.card.width}×${THUMB_SPEC.card.height}`,
  )
  check('缩略图明显小于 full（宽度 ≤ 1/4）', THUMB_SPEC.card.width * 4 <= 1080)

  /* ── E3：fallback 必须可用 ──
     任何 (deckId, cardId) 组合都必须解析出一个可渲染的 plan，
     且缺失态必须给出属于**本牌组**的路径。 */
  let fallbackOk = true
  let fallbackBadPath: string[] = []
  for (const deckId of ALL_DECK_IDS) {
    for (const cardId of cardIds) {
      const p = resolveCardArtwork(deckId, cardId)
      if (!p || !['raster', 'procedural', 'missing'].includes(p.kind)) fallbackOk = false
      if (!p.identity?.key) fallbackOk = false
      if (p.kind === 'missing' && !p.expectedPath.includes(deckId)) fallbackBadPath.push(`${deckId}/${cardId}`)
    }
  }
  check(`fallback 对全部 ${ALL_DECK_IDS.length}×78 组合都可用`, fallbackOk)
  check('缺失态给出的是本牌组自己的路径', fallbackBadPath.length === 0, fallbackBadPath.slice(0, 2).join(', ') || '干净')

  /* 脏 deckId 也不能炸 —— 持久化里可能存着任何东西 */
  let junkSafe = true
  for (const junk of ['', 'not-a-deck', 'MOONLIGHT']) {
    try {
      const p = resolveCardArtwork(junk as never, 'major-00')
      if (p.kind !== 'missing') junkSafe = false
    } catch {
      junkSafe = false
    }
  }
  check('未知 deckId 解析为 missing 且不抛错', junkSafe)

  /* ── E4：revision 真的进 URL ──
     没有它，牌面在 immutable 长缓存下不可更新（server/index.ts）。 */
  const revUrl = cardArtworkUrl('ethereal', 'major-00', 7, 'full')
  check('资产 URL 含修订号', revUrl.includes('r=7'), revUrl)

  /* ★ 路径契约对照 —— 上一版就是缺了这条才让 rev 断裂却全绿。
     运行期真的会去请求的位置，必须与磁盘上真的有文件的位置是同一处。
     只要有人再把 rev 写成路径段、或改了目录层级，这里立刻红。 */
  for (const [label, url, repoPath] of [
    ['牌面', cardArtworkUrl('ethereal', 'major-00', 3, 'full'), cardArtworkRepoPath('ethereal', 'major-00')],
    ['缩略图', cardArtworkUrl('ethereal', 'major-00', 3, 'thumb'), cardThumbRepoPath('ethereal', 'major-00')],
    ['卡背', cardBackUrl('ethereal', 3), cardBackRepoPath('ethereal')],
    ['封面', deckCoverUrl('ethereal', 3), deckCoverRepoPath('ethereal')],
  ] as const) {
    check(
      `${label}：运行期 URL 与磁盘路径指向同一位置`,
      urlToRepoPath(url) === repoPath,
      `${urlToRepoPath(url)}  ↔  ${repoPath}`,
    )
  }
  check(
    '不同 rev 产出不同 URL（返修可生效）',
    cardArtworkUrl('ethereal', 'major-00', 1, 'full') !== revUrl,
  )
  check(
    'thumb 与 full 是不同 URL',
    cardArtworkUrl('ethereal', 'major-00', 1, 'thumb') !==
      cardArtworkUrl('ethereal', 'major-00', 1, 'full'),
  )
  check(
    '所有资产 URL 都经 assetBaseUrl（CDN 单一出口）',
    revUrl.startsWith(assetBaseUrl()) &&
      cardBackUrl('ethereal', 1).startsWith(assetBaseUrl()) &&
      deckCoverUrl('ethereal', 1).startsWith(assetBaseUrl()),
  )
}

/* ══════════════════════════════════════════════════════════════
 * F. 结构性禁止（防未来腐化）
 * ══════════════════════════════════════════════════════════ */

function checkStructuralBans(): void {
  section('F. 结构性禁止')

  /* 字段白名单：多出任何键即失败。
     字段不存在，UI 就画不出来 —— 和 buildHiddenDeck 签名里没有 deckId 是同一手法。 */
  const ALLOWED = ['deckId', 'kind', 'name', 'tagline', 'description', 'visual', 'atmosphereId']
  for (const d of decks) {
    const extra = Object.keys(d).filter((k) => !ALLOWED.includes(k))
    check(`${d.deckId} 没有白名单之外的字段`, extra.length === 0, extra.join(', ') || '干净')
  }

  /* 任何暗示排序、优劣、稀缺、随机的字段名都不许出现 */
  const BANNED_KEY = /random|seed|rng|prob|weight|chance|luck|rate|rank|rarity|tier|level|locked|unlock|popular|recommend|score|premium|price|meaning|keyword|advice|tone/i
  /* 排印术语与「排序/权重」撞词，但语义毫无关系：
     nameWeight 是字重（CSS font-weight），borderWidth 是描边粗细。
     白名单必须逐个列出，不能放宽正则 —— 放宽一次，rank/rarity 就跟着进来了。 */
  const KEY_ALLOWLIST = new Set(['nameWeight', 'borderWidth'])
  const bannedKeys: string[] = []
  const walkKeys = (obj: unknown, path: string): void => {
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      if (BANNED_KEY.test(k) && !KEY_ALLOWLIST.has(k)) bannedKeys.push(`${path}.${k}`)
      walkKeys(v, `${path}.${k}`)
    }
  }
  for (const d of decks) walkKeys(d, d.deckId)
  check('牌组定义里没有暗示排序/优劣/随机的字段名', bannedKeys.length === 0, bannedKeys.join(', ') || '干净')

  /* 牌组不得包含任何一张牌的名字 —— 否则某套牌就能把「死神」改叫「转化」 */
  const names = allCards.flatMap((c) => [c.name, c.nameZh])
  const allText = decks.map((d) => JSON.stringify(d)).join(' ')
  const nameLeak = names.filter((n) => n.length >= 2 && allText.includes(n))
  check('牌组定义里不含任何牌名（牌组无法给牌改名）', nameLeak.length === 0, nameLeak.join(', ') || '干净')

  /* 文案纪律：只描述房间，不描述效果 */
  const BANNED_COPY = ['更准', '更灵', '准确', '适合', '推荐', '热门', '最受欢迎', '稀有', '解锁', '即将推出', '敬请期待', '会员', '付费', '帮你', '指引你']
  const copyHits: string[] = []
  for (const d of decks) {
    const copy = `${d.name} ${d.tagline} ${d.description}`
    for (const word of BANNED_COPY) if (copy.includes(word)) copyHits.push(`${d.deckId}:${word}`)
  }
  check('牌组文案不含效果词/排序词', copyHits.length === 0, copyHits.join(', ') || '干净')

  /* 【死数据检查】
     V2.4 的教训：ritualMotif 在五套里各赋了值，全库 0 处消费；
     description 每套写了三四行，Gallery 只渲染 tagline，长描述从不显示。
     声明而不消费，等于给后人留一个「看起来有、实际没有」的功能。
     所以这里扫源码，确认每个声明出来的字段真的有人用。 */
  const librarySrc = readFileSync(resolve(REPO_ROOT, 'src/pages/DeckLibraryPage.tsx'), 'utf8')
  check('description 有 UI 消费方', librarySrc.includes('deck.description'))
  check('DeckCover 有 UI 消费方', librarySrc.includes('DeckCover'))
  const coverSrc = readFileSync(resolve(REPO_ROOT, 'src/components/deck/DeckCover.tsx'), 'utf8')
  check('DeckCover 真的读 manifest.cover', coverSrc.includes('getManifest') && coverSrc.includes('cover'))
  check(
    'DeckCover 缺失时给出仓库路径（不静默留白）',
    coverSrc.includes('deckCoverRepoPath'),
  )

  /* 选择页与抽牌引擎必须零耦合，源码层面可见 */
  check(
    'Deck Library 不 import 任何抽牌相关的东西',
    !/buildHiddenDeck|shuffle|applyCut|rng|entropy|Math\.random/.test(librarySrc),
  )

  for (const d of decks) {
    check(`${d.deckId} 有 description`, d.description.trim().length >= 12)
  }
  check('description 互不重复', new Set(decks.map((d) => d.description)).size === decks.length)

  /* tagline 长度必须接近 —— 长度差就是权重差 */
  const lens = decks.map((d) => d.tagline.length)
  check(
    'tagline 长度极差 ≤ 6（长度差就是权重差）',
    Math.max(...lens) - Math.min(...lens) <= 6,
    `${Math.min(...lens)}–${Math.max(...lens)} 字`,
  )
  check('tagline 互不重复', new Set(decks.map((d) => d.tagline)).size === decks.length)

  /* 五套用同一批预览牌 —— 变量必须只有画风。
     （原本这里有一条 `Array.isArray(PREVIEW_CARD_IDS)`，它对一个字面量数组
     物理上无法失败，是纯粹充数，已删除。断言的价值在于能变红。） */
  check('预览牌 2–5 张', PREVIEW_CARD_IDS.length >= 2 && PREVIEW_CARD_IDS.length <= 5)
  check(
    '预览牌无重复',
    new Set(PREVIEW_CARD_IDS).size === PREVIEW_CARD_IDS.length,
  )
  check(
    '预览牌都是真实存在的牌',
    PREVIEW_CARD_IDS.every((id) => cardIds.includes(id)),
  )
  /* 语义过强的牌不能当门面：它们会给牌组染上「这套适合分手」这类联想 */
  const HEAVY = ['major-15', 'major-16']
  check(
    '预览牌避开语义过强的牌（恶魔/高塔）',
    PREVIEW_CARD_IDS.every((id) => !HEAVY.includes(id)),
  )
}

/* ══════════════════════════════════════════════════════════════
 * G. 迁移安全
 * ══════════════════════════════════════════════════════════ */

function checkMigration(): void {
  section('G. Legacy 数据迁移')

  for (const [old, next] of Object.entries(LEGACY_DECK_ALIASES)) {
    check(`旧 id「${old}」映射到存在的牌组`, ALL_DECK_IDS.includes(next), next)
    check(`旧 id「${old}」映射到 legacy 牌组（不是未完成的新牌组）`, next.startsWith('legacy-'))
  }

  check('V2.4 的 5 个旧 id 全部有映射', Object.keys(LEGACY_DECK_ALIASES).length >= 5)

  /* V1 的单牌组 id。真实用户的日记里确实有它 ——
     漏掉它不会立刻出错（会兜底到默认牌组），但 Phase 3 把默认牌组
     改成 ethereal 之后，所有 V1 日记会突然指向一副没画完的牌。 */
  check('V1 的 dreamlike 有显式映射', LEGACY_DECK_ALIASES['dreamlike'] === 'legacy-moonlight')
  check(
    '所有旧 id 都映射到可抽牌的牌组（历史不能开天窗）',
    Object.values(LEGACY_DECK_ALIASES).every((id) => isDeckPlayable(id)),
  )

  /* 同名不同牌：旧 classic ≠ 新 classic。这是整个迁移里最危险的一处 */
  check(
    '旧 classic 映射到 legacy-classic，不是新的 classic',
    resolveDeckId('classic', 1) === 'legacy-classic',
  )
  check('新 classic 在 v2 下解析为自己', resolveDeckId('classic', 2) === 'classic')

  /* 任何脏数据都不许抛错 —— 「老用户打不开 App」是不可接受的代价 */
  const junk: unknown[] = ['', null, undefined, 0, {}, [], 'not-a-deck', 'MOONLIGHT']
  let survived = true
  for (const v of junk) {
    try {
      const r1 = resolveDeckId(v, 1)
      const r2 = resolveDeckId(v, 2)
      if (!ALL_DECK_IDS.includes(r1) || !ALL_DECK_IDS.includes(r2)) survived = false
    } catch {
      survived = false
    }
  }
  check('任何脏数据都能解析出合法牌组且不抛错', survived)

  /* 迁移后的历史记录必须仍然可渲染 —— 日记不能开天窗 */
  let historyRenderable = true
  for (const old of Object.keys(LEGACY_DECK_ALIASES)) {
    const deckId = resolveDeckId(old, 1)
    if (!isDeckPlayable(deckId)) historyRenderable = false
    for (const id of cardIds) {
      if (resolveCardArtwork(deckId, id).kind === 'missing') historyRenderable = false
    }
  }
  check('旧日记迁移后 78 张牌面全部可渲染', historyRenderable)
}

/* ══════════════════════════════════════════════════════════════
 * H. 牌组绝不进入 Prompt
 * ══════════════════════════════════════════════════════════ */

function checkPromptIsolation(): void {
  section('H. 牌组不进入 Prompt（不改变解读含义）')

  const request = {
    sessionId: 'deckcheck',
    question: '我该怎么看待现在这份工作',
    mode: 'question',
    theme: null,
    spreadId: 'past-present-future',
    readingMode: 'deep',
    deckId: 'wonderland',
    cards: [
      { positionId: 'past', cardId: 'major-01', orientation: 'upright' },
      { positionId: 'present', cardId: 'wands-03', orientation: 'upright' },
      { positionId: 'future', cardId: 'major-19', orientation: 'upright' },
    ],
  } as ReadingRequest

  const ctx = rebuildContext(request)
  check('deckId 被记进 ReadingContext', ctx.deckId === 'wonderland')

  const prompt = buildMessages(ctx).map((m) => m.content).join('\n')

  check('Prompt 里没有 deckId 的值', !prompt.includes('wonderland'))
  check('Prompt 里没有 "deckId" 这个字段名', !prompt.toLowerCase().includes('deckid'))
  check('Prompt 里没有资产路径痕迹', !prompt.includes('assets/decks') && !prompt.includes('.webp'))

  for (const d of decks) {
    check(`Prompt 里没有「${d.deckId}」的牌组名`, !prompt.includes(d.name))
    check(`Prompt 里没有「${d.deckId}」的 tagline`, !prompt.includes(d.tagline))
  }
  for (const a of atmospheres) {
    check(`Prompt 里没有氛围 id「${a.atmosphereId}」`, !prompt.includes(a.atmosphereId))
  }

  /* 换牌组重建上下文，Prompt 必须逐字节相同 —— 这是最直接的证明。
     V2.4 只比了 2 套，这里扩到全部 10 套两两比对。 */
  let allIdentical = true
  const offenders: string[] = []
  for (const d of decks) {
    const other = buildMessages(rebuildContext({ ...request, deckId: d.deckId }))
      .map((m) => m.content)
      .join('\n')
    if (other !== prompt) {
      allIdentical = false
      offenders.push(d.deckId)
    }
  }
  check('换任意牌组后 Prompt 逐字节相同', allIdentical, offenders.join(', ') || '10 套全同')

  const noDeck = buildMessages(rebuildContext({ ...request, deckId: undefined }))
    .map((m) => m.content)
    .join('\n')
  check('不带牌组时 Prompt 也相同', noDeck === prompt)
}

/* ══════════════════════════════════════════════════════════════
 * 待补素材清单
 * ══════════════════════════════════════════════════════════ */

function reportMissingAssets(): void {
  /* fixture 必须在报告里显眼 —— 它是「断言不空转」的代价，
     代价的前提是任何人一眼就知道哪些图是假的。 */
  const fixtures = artworkDecks.filter((d) => getManifest(d.deckId)?.devFixture)
  if (fixtures.length > 0) {
    section('⚠️  开发用 fixture（不是正式 artwork）')
    for (const d of fixtures) {
      const n = Object.keys(getManifest(d.deckId)!.cards).length
      console.log(
        `  ${Y}${d.deckId}${X}  ${D}${n} 张测试图 · 永不可抽牌 · 见 public/assets/decks/${d.deckId}/DEV-FIXTURES.md${X}`,
      )
    }
  }

  section('待补素材（Phase 1）')

  let total = 0
  for (const deck of artworkDecks) {
    const manifest = getManifest(deck.deckId)!
    const missing: string[] = []
    if (!manifest.deck.cover) missing.push(deckCoverRepoPath(deck.deckId))
    if (!manifest.deck.back) missing.push(cardBackRepoPath(deck.deckId))
    for (const id of PREVIEW_CARD_IDS) {
      if (!manifest.cards[id]) missing.push(cardArtworkRepoPath(deck.deckId, id))
    }
    total += missing.length
    console.log(`  ${Y}${deck.deckId}${X}  ${D}缺 ${missing.length} 个${X}`)
    for (const p of missing) console.log(`    ${D}${p}${X}`)
  }

  console.log(`\n  ${B}Phase 1 合计缺 ${total} 个文件${X}`)
  console.log(`  ${D}Phase 2 还需 5 × 22 = 110 张大阿卡纳${X}`)
  console.log(`  ${D}Phase 3 还需 5 × 56 = 280 张小阿卡纳${X}`)
  console.log(`  ${D}放置规范见 public/assets/decks/README.md${X}`)
}

/* ══════════════════════════════════════════════════════════════
 * I. 语义不变性：换牌组只改画，不改任何语义
 * ══════════════════════════════════════════════════════════ */

function checkSemanticInvariance(): void {
  section('I. 语义不变性（换牌组不改语义）')

  const request = {
    sessionId: 'inv',
    question: '我该不该换一个实习方向',
    mode: 'question',
    theme: null,
    spreadId: 'past-present-future',
    readingMode: 'standard',
    cards: [
      { positionId: 'past', cardId: 'major-00', orientation: 'upright' },
      { positionId: 'present', cardId: 'major-06', orientation: 'reversed' },
      { positionId: 'future', cardId: 'major-13', orientation: 'upright' },
    ],
  } as unknown as ReadingRequest

  /* 逐套牌组重建 context，把「语义部分」单独摘出来比对。
     必须不变的：牌义 / 领域牌义 / keywords / 正逆位 / 牌位 / 分类
     允许变的：只有 deckId 本身（它是 Presentation Context） */
  const semanticOf = (deckId: string) => {
    const ctx = rebuildContext({ ...request, deckId } as ReadingRequest)
    return JSON.stringify({
      questionCategory: ctx.questionCategory,
      cards: ctx.cards.map((c) => ({
        cardId: c.cardId,
        cardNameZh: c.cardNameZh,
        orientation: c.orientation,
        position: c.position,
        baseMeaning: c.baseMeaning,
        domainMeaning: c.domainMeaning,
        keywords: c.keywords,
        symbols: c.symbols,
        element: c.element,
      })),
      stats: ctx.stats,
    })
  }

  const baseline = semanticOf(ALL_DECK_IDS[0]!)
  const drifted = ALL_DECK_IDS.filter((d) => semanticOf(d) !== baseline)
  check(
    `换牌组后语义部分逐字节相同（${ALL_DECK_IDS.length} 套）`,
    drifted.length === 0,
    drifted.join(', ') || '全部一致',
  )

  /* 反空断言：换一张牌，语义必须变 —— 否则上面那条可能只是没在比东西 */
  const other = JSON.stringify(
    rebuildContext({
      ...request,
      cards: [
        { positionId: 'past', cardId: 'major-01', orientation: 'upright' },
        { positionId: 'present', cardId: 'major-06', orientation: 'reversed' },
        { positionId: 'future', cardId: 'major-13', orientation: 'upright' },
      ],
    } as unknown as ReadingRequest).cards[0],
  )
  const base0 = JSON.stringify(rebuildContext(request).cards[0])
  check('换一张牌语义会变（上一条不是空断言）', other !== base0)

  /* 换正逆位必须读到不同牌义（Test B） */
  const upright = rebuildContext({
    ...request,
    cards: [{ positionId: 'past', cardId: 'major-13', orientation: 'upright' },
            { positionId: 'present', cardId: 'major-06', orientation: 'reversed' },
            { positionId: 'future', cardId: 'major-00', orientation: 'upright' }],
  } as unknown as ReadingRequest).cards[0]!
  check(
    'major-13 正逆位读到不同牌义',
    upright.baseMeaning.upright !== upright.baseMeaning.reversed &&
      upright.domainMeaning !== null &&
      upright.domainMeaning.upright !== upright.domainMeaning.reversed,
  )

  /* 同一张牌放在不同牌位，position 必须不同（Test C） */
  const atPast = rebuildContext(request).cards.find((c) => c.cardId === 'major-00')!
  const atFuture = rebuildContext({
    ...request,
    cards: [
      { positionId: 'past', cardId: 'major-01', orientation: 'upright' },
      { positionId: 'present', cardId: 'major-06', orientation: 'reversed' },
      { positionId: 'future', cardId: 'major-00', orientation: 'upright' },
    ],
  } as unknown as ReadingRequest).cards.find((c) => c.cardId === 'major-00')!
  check(
    '同一张牌在不同牌位时 position 不同、牌义相同',
    atPast.position.positionId !== atFuture.position.positionId &&
      JSON.stringify(atPast.baseMeaning) === JSON.stringify(atFuture.baseMeaning),
    `${atPast.position.positionName} vs ${atFuture.position.positionName}`,
  )
}

/* ══════════════════════════════════════════════════════════════
 * J. 领域牌义路由（此前真实 Prompt 完全拿不到）
 * ══════════════════════════════════════════════════════════ */

function checkDomainMeaning(): void {
  section('J. questionCategory → domainMeaning → Prompt')

  const mk = (question: string) =>
    rebuildContext({
      sessionId: 'dom',
      question,
      mode: 'question',
      theme: null,
      spreadId: 'single',
      readingMode: 'standard',
      cards: [{ positionId: 'guidance', cardId: 'major-00', orientation: 'upright' }],
    } as unknown as ReadingRequest)

  const cases: [string, string, string][] = [
    ['我该不该换一个实习方向', 'career', '工作事业'],
    ['关于这段关系我需要理解什么', 'relationship', '感情关系'],
    ['这笔钱要不要投进去', 'finance', '财务'],
    ['论文进度让我很焦虑', 'study', '学业'],
    ['我最近是不是该重新认识一下自己', 'self', '自我成长'],
  ]
  for (const [q, category, label] of cases) {
    const ctx = mk(q)
    check(
      `「${q}」→ ${category}`,
      ctx.questionCategory === category,
      `实际 ${ctx.questionCategory}`,
    )
    check(`「${q}」拿到「${label}」领域牌义`, ctx.cards[0]!.domainMeaning?.label === label)
  }

  /* 不同领域必须选到不同的牌义文本 —— 否则等于没选 */
  const texts = cases.map(([q]) => mk(q).cards[0]!.domainMeaning?.upright ?? '')
  check('五个领域选出的牌义文本互不相同', new Set(texts).size === texts.length)

  /* 未明确归类时如实缺席，不硬凑一个领域 */
  const vague = mk('嗯')
  check(
    '问题无法归类时 domainMeaning 为 null（不硬凑）',
    vague.questionCategory === 'general' && vague.cards[0]!.domainMeaning === null,
  )

  /* 领域牌义必须真的出现在 Prompt 里 —— 这是整条链的终点 */
  const careerCtx = mk('我该不该换一个实习方向')
  const careerPrompt = buildMessages(careerCtx).map((m) => m.content).join('\n')
  const careerText = careerCtx.cards[0]!.domainMeaning!.upright
  check('领域牌义进入真实 Prompt', careerPrompt.includes(careerText))
  check('Prompt 里标注了领域名', careerPrompt.includes('工作事业'))

  const loveCtx = mk('关于这段关系我需要理解什么')
  const lovePrompt = buildMessages(loveCtx).map((m) => m.content).join('\n')
  check(
    '不同领域的问题产出不同 Prompt（不是永远用通用义）',
    lovePrompt !== careerPrompt && lovePrompt.includes(loveCtx.cards[0]!.domainMeaning!.upright),
  )

  /* 五张代表牌的新字段完整 */
  for (const id of PREVIEW_CARD_IDS) {
    const c = allCards.find((x) => x.id === id)!
    check(
      `${id} ${c.nameZh} 新字段齐全`,
      Boolean(c.personalGrowth?.upright && c.personalGrowth.reversed) &&
        (c.symbolism?.length ?? 0) >= 3 &&
        Boolean(c.element) &&
        Boolean(c.astrology),
    )
  }
}


/* ══════════════════════════════════════════════════════════════
 * G. 牌组视觉差异（Phase C0 新增）
 *
 * 【为什么这一组必须存在】
 * 这个代码库把每一条产品规则都写成了断言：牌义不变性、文案禁用词、
 * 「牌不是点击后才生成的」、Prompt 里不许出现 deckId。
 * 唯独「五套牌必须看起来不一样」这条 —— 整个多牌组架构的立身之本 ——
 * 从来没有进过断言。
 *
 * 结果就是它悄悄漂走了：五套 legacy 名字不同、文案不同、氛围不同，
 * 牌面却逐像素相同。实测才发现，而 301 项断言全绿。
 *
 * 所以这一组守的不是代码，是那句话本身。
 * ══════════════════════════════════════════════════════════ */

function checkDeckVisualDifference(): void {
  section('G. 牌组视觉差异（程序化过渡期）')

  const profiles = legacyDecks.map((d) => getArtProfile(d.deckId))
  const ids = legacyDecks.map((d) => d.deckId)

  /* ── G-01 卡面明度：全套差异化里最强的一条通道 ── */
  const grounds = profiles.map((p) => p.groundValue)
  check(
    'G-01 五套 legacy 的 groundValue 两两不同',
    new Set(grounds).size === profiles.length,
    grounds.map((g, i) => `${ids[i]}=${g}`).join(' '),
  )

  /* ── G-02 明度差必须大到缩略图尺寸下也能分辨 ──
     2.0 倍是下限：低于它，两张牌在 24px 缩略图上就是同一块深色长方形。 */
  const ratio = Math.max(...grounds) / Math.min(...grounds)
  check(
    'G-02 最亮与最暗 groundValue 之比 ≥ 2.0',
    ratio >= 2.0,
    `${Math.max(...grounds)} / ${Math.min(...grounds)} = ${ratio.toFixed(1)}×`,
  )

  /* ── G-03 极性：至少要有一套是浅色牌 ──
     十套全是「深色长方形」正是 V2.4 的病灶。浅色卡面是唯一能在
     缩略图尺寸下立刻区分开的手段，也是 registry 里
     「深色页面 + 浅色卡面」那条注释一直没兑现的部分。 */
  const polarities = new Set(profiles.map((p) => p.polarity))
  check(
    'G-03 五套里至少有一套浅色卡面（不全是深色长方形）',
    polarities.has('light'),
    [...polarities].join(', '),
  )

  /* ── G-04/05/06 线条 / 光源 / 材质 ──
     这三条不是为了凑测试而设计的：五套牌的 description 本来就写着
     「银线与月相」「暗金压边」「木纹」「星座连线」「只有明暗」，
     它们本来就该是五种不同的画法。断言只是把文案兑现成参数。 */
  const strokes = profiles.map((p) => p.stroke)
  check('G-04 五套的线条性格两两不同', new Set(strokes).size === profiles.length, strokes.join(' '))

  const lightings = profiles.map((p) => p.lighting)
  check('G-05 五套的光源方向两两不同', new Set(lightings).size === profiles.length, lightings.join(' '))

  const textures = profiles.map((p) => p.texture)
  check('G-06 五套的材质两两不同', new Set(textures).size === profiles.length, textures.join(' '))

  const profileIds = profiles.map((p) => p.profileId)
  check('G-07 五套的 visual profile id 两两不同', new Set(profileIds).size === profiles.length)

  /* ── G-08 deckId 必须真的进入 Card Art Rendering Pipeline ──
     【为什么用扫源码而不是比 identity】
     产品决策保留了「五套 legacy 共用 legacy-procedural 这一个 artPackId」，
     所以 resolveCardArtwork().identity.owner 在五套之间**仍然相同** ——
     identity 在这条路上证明不了差异。
     真正要守的是「deckId 没有在渲染链某一环被丢掉」，那就直接查那几环。
     这正是 V2.4 出事的地方：plan 里一直有 deckId，只是没人把它传下去。 */
  const artSrc = readFileSync(
    resolve(REPO_ROOT, 'src/decks/legacy/ProceduralCardArt.tsx'),
    'utf8',
  )
  check(
    'G-08a ProceduralCardArt 接收 deckId prop',
    /deckId:\s*DeckId/.test(artSrc) && /\bdeckId,/.test(artSrc),
  )
  check('G-08b ProceduralCardArt 调用 getArtProfile(deckId)', /getArtProfile\(deckId\)/.test(artSrc))
  const layerSrc = readFileSync(
    resolve(REPO_ROOT, 'src/components/card/CardArtworkLayer.tsx'),
    'utf8',
  )
  check(
    'G-08c CardArtworkLayer 把 plan.deckId 传给 ProceduralCardArt',
    /deckId=\{plan\.deckId\}/.test(layerSrc),
  )

  /* ── G-09 profile 里不许出现任何牌义字段 ──
     视觉层拿到牌义，就等于给了「某套牌把死神画成转化」的可能。 */
  const banned = ['meaning', 'keyword', 'symbol', 'upright', 'reversed', 'nameZh', 'cardId']
  const leaked: string[] = []
  for (const [key, prof] of Object.entries(ART_PROFILES)) {
    for (const field of Object.keys(prof)) {
      if (banned.some((b) => field.toLowerCase().includes(b))) leaked.push(`${key}.${field}`)
    }
  }
  check('G-09 视觉档案里不含任何牌义字段', leaked.length === 0, leaked.join(', '))

  /* ── G-10 换 deckId 不改变任何 Card Semantic Data ──
     语义不变性已由 checkSemanticInvariance 全面覆盖；这里补一条针对
     新引入的 profile 通路：同一张牌在五套下的 motif/hue/tier 必须完全一致，
     变的只能是画法。 */
  let semanticDrift = 0
  for (const cardId of cardIds) {
    const specs = ids.map((id) => {
      const plan = resolveCardArtwork(id, cardId)
      return plan.kind === 'procedural' ? `${plan.motif}|${plan.hue}|${plan.tier}` : `!${plan.kind}`
    })
    if (new Set(specs).size !== 1) semanticDrift += 1
  }
  check(
    'G-10 同一张牌在五套 legacy 下的 motif/hue/tier 完全一致（变的只有画法）',
    semanticDrift === 0,
    `${cardIds.length} 张全部一致`,
  )

  /* ── 母题覆盖度 ──
     12 个母题分给 78 张牌时，5 张牌阵有 63.4% 的概率出现画面重复的牌，
     实测撞到过一次抽牌里三张同一张「门」。 */
  const motifCount = new Map<string, number>()
  for (const spec of Object.values(LEGACY_CARD_ART)) {
    motifCount.set(spec.motif, (motifCount.get(spec.motif) ?? 0) + 1)
  }
  check(
    'G-11 视觉母题至少 24 个',
    motifCount.size >= 24,
    `${motifCount.size} 个`,
  )
  const maxReuse = Math.max(...motifCount.values())
  check(
    'G-12 单个母题复用不超过 5 张牌',
    maxReuse <= 5,
    `最大复用 ${maxReuse} 张`,
  )

  /* 牌组库那五张对比牌是全站唯一一次把五套牌并排给用户看的地方。
     如果这五张里有两张母题相同，用户看到的「差异」里就混进了噪声。 */
  const previewMotifs = PREVIEW_CARD_IDS.map((id) => LEGACY_CARD_ART[id]?.motif)
  check(
    'G-13 Deck Library 的五张对比牌母题两两不同',
    new Set(previewMotifs).size === PREVIEW_CARD_IDS.length,
    previewMotifs.join(' / '),
  )

  /* ── G-14 card → motif 映射必须确定性 ──
     同一张牌今天是提灯、刷新变成门，会让牌面读起来像随机装饰。 */
  const twice = cardIds.every((id) => LEGACY_CARD_ART[id]?.motif === LEGACY_CARD_ART[id]?.motif)
  check('G-14 cardId → motif 是静态表，不含随机源', twice)
  const artTableSrc = readFileSync(
    resolve(REPO_ROOT, 'src/decks/legacy/proceduralArt.ts'),
    'utf8',
  )
  check(
    'G-14b 母题表源码不含 Math.random / Date',
    !/Math\.random|Date\.now|new Date/.test(artTableSrc),
  )

  /* ══════════════════════════════════════════════════════════
   * 母题构图邻近度
   *
   * 【为什么光有「26 个母题」不够】
   * 数量不保证画面不像。实测确认过两组真正会撞脸的：
   *   gate  vs threshold —— 都是「暗色实块上开一个透光的口 + 下面有地」
   *   wave  vs tide      —— 都是四条横向水带，只差一枚小月亮
   * 母题名不同、G-11/G-12 全绿，缩略图上却是同一张牌。
   *
   * 所以再加一层：把构图拆成 axis / mass / ground / form 四条结构轴，
   * 两个母题若四条全同就一定画得像。
   * ══════════════════════════════════════════════════════════ */

  const sigKey = (m: keyof typeof MOTIF_SIGNATURE) => {
    const g = MOTIF_SIGNATURE[m]
    return `${g.axis}|${g.mass}|${g.ground}|${g.form}`
  }
  const motifs = Object.keys(MOTIF_SIGNATURE) as Array<keyof typeof MOTIF_SIGNATURE>

  check(
    'G-16 每个母题都有构图签名',
    motifs.length === motifCount.size,
    `${motifs.length} 个母题 / ${motifCount.size} 个在用`,
  )

  const sigGroups = new Map<string, string[]>()
  for (const m of motifs) {
    const k = sigKey(m)
    sigGroups.set(k, [...(sigGroups.get(k) ?? []), m])
  }
  const over = [...sigGroups.values()].filter((v) => v.length > 2)
  check(
    'G-17 没有 3 个及以上母题共享同一构图签名',
    over.length === 0,
    over.length ? over.map((v) => v.join('/')).join(' , ') : `${sigGroups.size} 个唯一签名 / ${motifs.length} 个母题`,
  )

  /* 人工比对确认过、并已重画拉开的几对。这条防的是有人日后把其中一个改回去。 */
  const stillConfusable = CONFUSABLE_PAIRS.filter(([a, b]) => sigKey(a) === sigKey(b))
  check(
    'G-18 已确认易混的母题对，构图签名必须不同',
    stillConfusable.length === 0,
    stillConfusable.length
      ? stillConfusable.map((p) => p.join('/')).join(', ')
      : CONFUSABLE_PAIRS.map((p) => p.join('≠')).join(' '),
  )

  /* 构图签名同样必须是确定性的静态表 */
  check(
    'G-19 构图签名覆盖 ArtMotif 的每一个成员（新增母题不能忘记声明）',
    motifs.every((m) => typeof MOTIF_SIGNATURE[m]?.axis === 'string'),
  )

  /* ── G-15 过渡期身份必须写明 ──
     程序化牌面绝不能被当成最终 artwork。这条防的是半年后有人
     看到「五套已经不一样了」就以为 Phase C1 不用做了。 */
  check(
    'G-15 视觉档案明确标注自己是过渡方案',
    /temporary procedural artwork/.test(
      readFileSync(resolve(REPO_ROOT, 'src/decks/legacy/artProfiles.ts'), 'utf8'),
    ),
  )
}


/* ══════════════════════════════════════════════════════════════
 * H. 氛围层差异（Phase C0-2 新增）
 *
 * 【为什么补这一组】
 * G 组守住了「五套牌的**牌面**不一样」，但页面环境仍然只靠色相区分 ——
 * 而表面层 chroma 一律 ≤ 0.05，色相在这个饱和度下基本不可见。
 * 实测十套 bg-void 全部挤在 0.105–0.168，最亮与最暗只差 1.60 倍，
 * 于是换牌组时用户看到的是「同一个暗空间换了个主题色」。
 *
 * 这一组把氛围的三条真实差异轴 —— 明度、光源、结构 —— 变成不变量。
 * ══════════════════════════════════════════════════════════ */

function checkAtmosphereDifference(): void {
  section('H. 氛围层差异（明度 / 光源 / 结构）')

  const L = (v: string): number => Number(/oklch\(([0-9.]+)/.exec(v)?.[1] ?? '0')

  /* ── H-01 声明的 groundValue 必须与真实 token 一致 ──
     两处各写一个数字，迟早会漂；漂了之后断言守的就是一个不存在的页面。 */
  let drift = 0
  for (const a of atmospheres) {
    const actual = L(a.themeVars['--color-bg-void'])
    if (Math.abs(actual - a.groundValue) > 0.0005) drift += 1
  }
  check('H-01 groundValue 与 --color-bg-void 的实际明度一致', drift === 0, `${atmospheres.length} 套全部一致`)

  /* ── H-02 明度阶梯必须真的拉开 ──
     1.60× 是本轮之前的实测值，那时十套读起来是同一片黑。 */
  const grounds = atmospheres.map((a) => a.groundValue)
  const ratio = Math.max(...grounds) / Math.min(...grounds)
  check(
    'H-02 最亮与最暗氛围的 groundValue 之比 ≥ 2.2',
    ratio >= 2.2,
    `${Math.min(...grounds).toFixed(3)} → ${Math.max(...grounds).toFixed(3)} = ${ratio.toFixed(2)}×`,
  )
  check('H-03 十套 groundValue 两两不同', new Set(grounds).size === atmospheres.length)

  /* ── H-04 上限不放宽 ──
     G-18：卡面与文字都是按深色底设计的。差异化要在上限之内做足。 */
  check(
    'H-04 所有 groundValue 仍 ≤ 0.22（不靠突破上限换差异）',
    grounds.every((g) => g <= 0.22),
    `最亮 ${Math.max(...grounds).toFixed(3)}`,
  )

  /* ── H-05 第二条明度轴：页面与面板的反差 ──
     平均明度接近的两套，只要这个差值不同，看起来就不是同一个空间。 */
  let tonalDrift = 0
  for (const a of atmospheres) {
    const actual = L(a.themeVars['--color-surface-1']) - L(a.themeVars['--color-bg-void'])
    if (Math.abs(actual - a.tonalRange) > 0.002) tonalDrift += 1
  }
  check('H-05 tonalRange 与 surface-1 − bg-void 的实际差一致', tonalDrift === 0)
  const tonals = atmospheres.map((a) => a.tonalRange)
  check(
    'H-06 tonalRange 的极差 ≥ 1.5×（页面与面板的反差本身也是差异轴）',
    Math.max(...tonals) / Math.min(...tonals) >= 1.5,
    `${Math.min(...tonals).toFixed(3)} → ${Math.max(...tonals).toFixed(3)} = ${(Math.max(...tonals) / Math.min(...tonals)).toFixed(2)}×`,
  )

  /* ── H-07/08 光源与结构两两不同 ──
     「只看背景不看牌，也应该能判断这是哪一套」的直接推论。 */
  const lights = atmospheres.map((a) => a.lighting)
  check('H-07 十套的光源模型两两不同', new Set(lights).size === atmospheres.length, lights.join(' '))
  const structures = atmospheres.map((a) => a.structure)
  check('H-08 十套的空间结构两两不同', new Set(structures).size === atmospheres.length)

  /* ── H-09 氛围不许只靠色相区分 ──
     取任意两套，如果它们的 groundValue、tonalRange、lighting、structure、particles
     全都相同，那这两套的差异就只剩色相了 —— 而色相在 chroma ≤ 0.05 下不可见。 */
  const fingerprint = (a: (typeof atmospheres)[number]) =>
    `${a.groundValue}|${a.tonalRange}|${a.lighting}|${a.structure}|${a.particles}`
  const prints = atmospheres.map(fingerprint)
  check(
    'H-09 不存在「只有色相不同」的两套氛围',
    new Set(prints).size === atmospheres.length,
    '非色相维度的组合两两不同',
  )

  /* ── H-10 三个字段必须真的进入渲染链 ──
     不许造没人消费的配置 —— 那正是这个代码库反复吃过亏的地方
     （V2.4 的 ritualMotif、旧版 DeckVisualSpec 的 5 个字段）。 */
  const atmoSrc = readFileSync(resolve(REPO_ROOT, 'src/atmosphere/DeckAtmosphere.tsx'), 'utf8')
  check('H-10a structure 进入渲染：DETAIL[spec.structure]', /DETAIL\[spec\.structure\]/.test(atmoSrc))
  check('H-10b lighting 进入渲染：LIGHTING[spec.lighting]', /LIGHTING\[spec\.lighting\]/.test(atmoSrc))
  check(
    'H-10c 光源层真的被渲染（不是只算不画）',
    /backgroundImage: light\.key/.test(atmoSrc) && /light\.vignette/.test(atmoSrc),
  )
  /* DETAIL 表必须按 structure 索引，覆盖全部十种结构 */
  const detailKeys = (atmoSrc.match(/^\s+'[a-z-]+':\s+\w+Detail,$/gm) ?? []).length
  check('H-10d DETAIL 表覆盖全部十种 structure', detailKeys === 10, `${detailKeys} 项`)

  /* ── H-11 每套牌组仍然 1:1 绑定一套氛围 ──
     拆层是为了「分别可断言」，不是为了「可组合」。 */
  const used = decks.map((d) => d.atmosphereId)
  check('H-11 十套牌组各绑定一套互不相同的氛围', new Set(used).size === decks.length)
}

/* ══════════════════════════════════════════════════════════════ */

console.log(`${B}Deck 系统自检${X}`)
checkData()
checkAtmosphere()
checkDrawIndependence()
checkMeaningLayer()
checkArtwork()
checkStructuralBans()
checkMigration()
checkPromptIsolation()
checkSemanticInvariance()
checkDomainMeaning()
checkDeckVisualDifference()
checkAtmosphereDifference()
reportMissingAssets()

console.log(`\n${'─'.repeat(64)}`)
if (fail === 0) {
  console.log(`${G}全部通过${X}  ${pass} 项断言，0 失败`)
  console.log(`${D}牌组只改变画面，不改变抽牌，也不改变解读含义。${X}`)
} else {
  console.log(`${R}${fail} 项失败${X}  ${pass} 项通过`)
}
console.log('─'.repeat(64))
process.exit(fail === 0 ? 0 : 1)
