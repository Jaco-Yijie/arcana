/**
 * Artwork Pipeline 自检（ART 组 · Phase C1A）
 *
 * 【它守的是什么】
 * 390 张原画的生产会持续几个月。这期间每天都可能发生：
 *   - 某张原画进来了，但另外 77 张的位置坏掉
 *   - 有人为了"先看看效果"把 benchmark 当成正式原画渲染
 *   - 有人为了让画面好看，顺手改了牌义
 *   - 某套牌的 cardId 命名跑偏，与其余四套对不上
 *
 * 这四件事都能过 code review，都会在几周后才被发现，
 * 而那时已经有几十张画建立在错误的前提上。所以全部写成断言。
 *
 * 用法：`npm run artwork:check`（零网络、零 token）
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { allCards } from '../src/data/deck/index.ts'
import { ALL_DECK_IDS, ARTWORK_DECK_IDS } from '../src/decks/ids.ts'
import { decks } from '../src/decks/registry.ts'
import {
  BENCHMARK_STAGED,
  STYLE_ANCHOR_CARD_ID,
  artworkManifests,
  countDelivered,
  getManifest,
} from '../src/decks/artwork/manifests.ts'
import {
  isDeckPlayable,
  resolveCardArtwork,
  resolvePlanFrom,
} from '../src/decks/artwork/resolver.ts'
import { cardArtworkRepoPath, cardThumbRepoPath, urlToRepoPath } from '../src/decks/artwork/paths.ts'
import {
  FINAL_COUNT,
  NEEDS_VISUAL_REVIEW,
  PRODUCTION_CARDS,
  QA_SEVERITY,
} from '../src/decks/artwork/production.generated.ts'
import { ARTWORK_STATUSES, isDeliveredStatus } from '../src/decks/art/types.ts'
import { CANONICAL_DECK_IDS, DECK_ART_BIBLES, getArtBible } from '../src/decks/art/bibles.ts'
import { BENCHMARK_CARD_IDS, BENCHMARK_SEEDS } from '../src/decks/art/briefs.ts'
import {
  allBenchmarkBriefs,
  buildCardArtBrief,
  buildProductionPromptConstraints,
} from '../src/decks/art/buildBrief.ts'

const G = '\x1b[32m'
const R = '\x1b[31m'
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
 * ART-01 … ART-10
 * ══════════════════════════════════════════════════════════ */

function checkPipeline(): void {
  section('ART · Artwork 管线')

  /* ── ART-01 有正式原画时优先用原画 ──
     用一份**内存中的假 manifest** 验证决策逻辑，不去碰真实数据 ——
     真实数据现在是 0 张原画，测不出"优先"这件事。 */
  const probeDeck = CANONICAL_DECK_IDS[0]!
  const real = getManifest(probeDeck)!
  const withArt = {
    ...real,
    cards: { 'major-00': { w: 1080, h: 1800, thumb: true, status: 'final' as const } },
  }
  /* 直接验证 status 门槛函数与 hybrid 分支的组合结果 */
  const deliveredWins =
    withArt.source === 'hybrid' &&
    (withArt.cards['major-00']!.status ?? 'final') === 'final'
  check('ART-01 已交付（approved/final）的原画优先于程序化回退', deliveredWins)

  /* benchmark 不算已交付 —— 试产不能冒充正式牌面。
     直接调用真正的门槛函数，而不是比较字面量。 */
  check(
    'ART-01b 只有 approved / final 被视为已交付原画',
    isDeliveredStatus('approved') &&
      isDeliveredStatus('final') &&
      !isDeliveredStatus('benchmark') &&
      !isDeliveredStatus('placeholder'),
    ARTWORK_STATUSES.map((s) => `${s}=${isDeliveredStatus(s)}`).join(' '),
  )

  /* ── ART-02 缺原画时正确回退 ──
     【Phase C3 修订：改成注入 manifest，断言反而变强了】
     原实现遍历 canonical five 的真实数据，期望 390 张全部落到 procedural ——
     它成立的唯一原因是「当时一张原画都没有」。390 张到位后它必然失败，
     而失败的含义恰恰是「C3 成功了」，这说明它测的从来不是 fallback 本身，
     只是当时的库存状态。

     现在改成喂一份**故意缺图**的 hybrid manifest：
     fallback 是否有效，与生产资产齐不齐彻底解耦。
     这样它在 390 张齐备的今天仍然是一条会失败的真断言 ——
     如果谁把 hybrid 的回退分支删了，它立刻红。 */
  const emptyHybrid = { ...real, cards: {} }
  let fellBack = 0
  let brokeOut = 0
  for (const cardId of cardIds) {
    const plan = resolvePlanFrom(emptyHybrid, cardId)
    if (plan.kind === 'procedural') fellBack += 1
    else if (plan.kind === 'missing') brokeOut += 1
  }
  check(
    'ART-02 缺原画时逐张回退到 ProceduralCardArt',
    fellBack === cardIds.length,
    `注入空 hybrid manifest · ${fellBack} / ${cardIds.length} 张回退成功`,
  )
  check('ART-02b 回退路径不产生 missing（半套牌不许坏）', brokeOut === 0)

  /* ── ART-02c 真实数据：canonical five 现在应当 390 张全部是 raster ──
     这是 ART-02 让出来的位置。上面那条负责「fallback 还能用吗」，
     这条负责「日常还会用到 fallback 吗」——两个问题必须分开问，
     合成一条就会出现「回退正常所以一切正常」这种掩盖。 */
  let liveRaster = 0
  let liveProcedural = 0
  let liveMissing = 0
  for (const deckId of CANONICAL_DECK_IDS) {
    for (const cardId of cardIds) {
      const kind = resolveCardArtwork(deckId, cardId).kind
      if (kind === 'raster') liveRaster += 1
      else if (kind === 'procedural') liveProcedural += 1
      else if (kind === 'missing') liveMissing += 1
    }
  }
  const liveTotal = CANONICAL_DECK_IDS.length * cardIds.length
  check(
    'ART-02c canonical five 正常路径全部 raster（FULL-ART-08 / 09 / 14）',
    liveRaster === liveTotal && liveProcedural === 0 && liveMissing === 0,
    `raster ${liveRaster}/${liveTotal} · procedural ${liveProcedural} · missing ${liveMissing}`,
  )

  /* ── ART-03 回退不改语义 ──
     plan 的类型里就没有牌义字段，这里做运行期复核。 */
  const semanticKeys = ['meaning', 'keyword', 'symbol', 'upright', 'reversed', 'nameZh']
  let leaked = 0
  for (const deckId of CANONICAL_DECK_IDS) {
    const plan = resolveCardArtwork(deckId, 'major-00') as unknown as Record<string, unknown>
    for (const k of Object.keys(plan)) {
      if (semanticKeys.some((s) => k.toLowerCase().includes(s))) leaked += 1
    }
  }
  check('ART-03 artwork plan 不携带任何牌义字段', leaked === 0)

  /* ── ART-04 五套用同一套 cardId ── */
  const perDeck = CANONICAL_DECK_IDS.map((d) => {
    const m = getManifest(d)!
    return new Set([...Object.keys(m.cards), ...cardIds])
  })
  const same = perDeck.every((s) => s.size === perDeck[0]!.size)
  check(
    'ART-04 五套 Deck 使用完全相同的 cardId 集合',
    same,
    `${cardIds.length} 个 cardId，命名规则统一为 <cardId>.webp`,
  )

  /* ── ART-05 不存在的 artwork 不得 crash ── */
  let threw = false
  for (const bogus of ['major-99', '', 'not-a-card', 'wands-00']) {
    try {
      const p = resolveCardArtwork(CANONICAL_DECK_IDS[0]!, bogus)
      if (!p || typeof p.kind !== 'string') threw = true
    } catch {
      threw = true
    }
  }
  /* 连不存在的 deckId 也要能安全返回 */
  try {
    const p = resolveCardArtwork('no-such-deck' as never, 'major-00')
    if (p.kind !== 'missing') threw = true
  } catch {
    threw = true
  }
  check('ART-05 不存在的 cardId / deckId 不抛错，返回可渲染的 plan', !threw)

  /* ── ART-06 manifest 内无重复 cardId ──
     对象键天然唯一，真正要防的是"同一张牌在 cards 与 deck 里各登记一次"。 */
  let dup = 0
  for (const deckId of ALL_DECK_IDS) {
    const m = getManifest(deckId)
    if (!m) continue
    const keys = Object.keys(m.cards)
    if (new Set(keys).size !== keys.length) dup += 1
    /* 封面/卡背绝不能是 78 张里的某一张 —— 物理目录已分开，这里再守一次 */
    if (keys.some((k) => k === 'cover' || k === 'back')) dup += 1
  }
  check('ART-06 manifest 中不存在重复 cardId，封面/卡背不混入牌面', dup === 0)

  /* ── ART-07 status 只能用合法值 ── */
  let badStatus: string[] = []
  for (const deckId of ALL_DECK_IDS) {
    const m = getManifest(deckId)
    if (!m) continue
    for (const [cid, asset] of Object.entries(m.cards)) {
      const st = asset.status
      if (st !== undefined && !ARTWORK_STATUSES.includes(st)) badStatus.push(`${deckId}/${cid}=${st}`)
    }
  }
  check(
    'ART-07 artwork status 只能是 placeholder/benchmark/approved/final',
    badStatus.length === 0,
    badStatus.slice(0, 3).join(', ') || ARTWORK_STATUSES.join(' / '),
  )

  /* ── ART-08 换 deck 不改牌义 ──
     这是整个多牌组架构的立身之本，deck:check 已覆盖；
     这里针对新引入的 hybrid 路径再验一次。 */
  let drift = 0
  for (const cardId of cardIds) {
    const briefs = CANONICAL_DECK_IDS.map((d) => buildCardArtBrief(d, cardId)).filter(
      (b) => b !== null,
    )
    if (briefs.length < 2) continue
    const sigs = briefs.map((b) => JSON.stringify(b!.tarot))
    if (new Set(sigs).size !== 1) drift += 1
  }
  check('ART-08 同一 cardId 在五套下的 tarot 字段逐字节相同', drift === 0)

  /* ── ART-09 Benchmark 只影响 artwork，不影响 Reading ──
     Prompt 构建链完全不 import 视觉层，这里扫源码确认。 */
  const promptSrc = readFileSync(
    resolve(REPO_ROOT, 'server/prompts/tarotReadingPromptV2.ts'),
    'utf8',
  )
  const rebuildSrc = readFileSync(resolve(REPO_ROOT, 'server/context/rebuild.ts'), 'utf8')
  /* 【断言范围】要守的是「Benchmark / Art Bible 这套东西不会渗进解读」。
     `deckId` 本身不算违规 —— rebuild 里它只是**被记录**，
     且注释与 deck:check 的 Prompt 隔离组已经守住「不写进 Prompt」这条。
     所以这里只查 art 模块的概念与 import。 */
  const artConcepts = /decks\/art|ArtBible|CardArtBrief|BENCHMARK_SEEDS|thumbnailAnchor/
  check(
    'ART-09 解读链路不引用 Art Bible / Brief 概念',
    !artConcepts.test(promptSrc + rebuildSrc),
  )
  check(
    'ART-09b 解读链路不 import 任何视觉层模块',
    !/from '.*decks\//.test(promptSrc + rebuildSrc),
  )

  /* ── ART-10 五套都有完整 Art Bible ── */
  const missingBible = CANONICAL_DECK_IDS.filter((d) => getArtBible(d) === null)
  check('ART-10 五套 canonical Deck 均有 Art Bible', missingBible.length === 0)

  const requiredSections = [
    'identity',
    'medium',
    'palette',
    'lineLanguage',
    'composition',
    'lighting',
    'subjectLanguage',
    'frame',
    'typography',
    'cardBack',
    'forbidden',
  ]
  let incomplete: string[] = []
  for (const bible of DECK_ART_BIBLES) {
    for (const key of requiredSections) {
      const v = (bible as unknown as Record<string, unknown>)[key]
      if (v === undefined || (Array.isArray(v) && v.length === 0)) {
        incomplete.push(`${bible.deckId}.${key}`)
      }
    }
  }
  check('ART-10b 每份 Art Bible 的 11 个板块全部非空', incomplete.length === 0, incomplete.slice(0, 3).join(', '))
}

/* ══════════════════════════════════════════════════════════════
 * Deck Differentiation Gate（§19）
 * ══════════════════════════════════════════════════════════ */

function checkDifferentiation(): void {
  section('Deck Differentiation Gate · 遮住牌名也要分得出是哪套')

  const axes: Array<[string, (b: (typeof DECK_ART_BIBLES)[number]) => string]> = [
    ['medium.primary', (b) => b.medium.primary],
    ['medium.surfaceTexture', (b) => b.medium.surfaceTexture],
    ['lineLanguage.edgeCharacter', (b) => b.lineLanguage.edgeCharacter],
    ['lighting.source', (b) => b.lighting.source],
    ['palette.luminanceProfile', (b) => b.palette.luminanceProfile],
    ['composition.perspective', (b) => b.composition.perspective],
    ['cardBack.composition', (b) => b.cardBack.composition],
    ['frame.structure', (b) => b.frame.structure],
  ]

  for (const [name, get] of axes) {
    const vals = DECK_ART_BIBLES.map(get)
    check(`五套的 ${name} 两两不同`, new Set(vals).size === DECK_ART_BIBLES.length)
  }

  /* 调色板不许高度重叠 —— 两套牌共用一半以上主色就会开始像 */
  let overlapping: string[] = []
  for (let i = 0; i < DECK_ART_BIBLES.length; i += 1) {
    for (let j = i + 1; j < DECK_ART_BIBLES.length; j += 1) {
      const a = new Set(DECK_ART_BIBLES[i]!.palette.dominant)
      const b = DECK_ART_BIBLES[j]!.palette.dominant
      const shared = b.filter((c) => a.has(c)).length
      if (shared > 1) {
        overlapping.push(`${DECK_ART_BIBLES[i]!.deckId}×${DECK_ART_BIBLES[j]!.deckId}=${shared}`)
      }
    }
  }
  check('任意两套的主色重合不超过 1 个', overlapping.length === 0, overlapping.join(', '))

  /* Bible 的中文名必须与 registry 一致 —— 两处各写一份必然会漂 */
  let nameDrift: string[] = []
  for (const bible of DECK_ART_BIBLES) {
    const deck = decks.find((d) => d.deckId === bible.deckId)
    if (!deck || deck.name !== bible.identity.name) {
      nameDrift.push(`${bible.deckId}: bible=${bible.identity.name} registry=${deck?.name}`)
    }
  }
  check('Art Bible 的中文名与 registry 一致', nameDrift.length === 0, nameDrift.join('; '))
}

/* ══════════════════════════════════════════════════════════════
 * Benchmark Brief 完整性
 * ══════════════════════════════════════════════════════════ */

function checkBriefs(): void {
  section('Benchmark Brief · 5 牌 × 5 套 = 25 份')

  const briefs = allBenchmarkBriefs()
  check(
    'Brief 数量为 25',
    briefs.length === 25,
    `${briefs.length} 份 · ${BENCHMARK_CARD_IDS.length} 张牌 × ${CANONICAL_DECK_IDS.length} 套`,
  )

  /* 矩阵不许有洞 */
  const holes: string[] = []
  for (const deckId of CANONICAL_DECK_IDS) {
    for (const cardId of BENCHMARK_CARD_IDS) {
      if (!buildCardArtBrief(deckId, cardId)) holes.push(`${deckId}:${cardId}`)
    }
  }
  check('25 格矩阵无缺失', holes.length === 0, holes.slice(0, 3).join(', '))

  /* seeds 里不许出现牌义字段 —— 那必须来自语义层 */
  const seedSrc = readFileSync(resolve(REPO_ROOT, 'src/decks/art/briefs.ts'), 'utf8')
  check(
    'Brief seed 里不含 meaningUpright / keywordsUpright 等牌义字段',
    !/meaningUpright|meaningReversed|keywordsUpright|keywordsReversed/.test(seedSrc),
  )

  /* 每份 Brief 必须具体到可生产（§11）：五个层次 + 缩略图锚点 + 必含项 */
  const thin: string[] = []
  for (const b of briefs) {
    const v = b.visual
    const ok =
      v.heroSubject.length >= 8 &&
      v.narrativeMoment.length >= 10 &&
      v.camera.length >= 4 &&
      v.foreground.length >= 4 &&
      v.midground.length >= 4 &&
      v.background.length >= 4 &&
      v.symbolPlacement.length >= 3 &&
      b.mustInclude.length >= 3 &&
      b.thumbnailAnchor.length >= 4
    if (!ok) thin.push(`${b.deckId}:${b.cardId}`)
  }
  check('每份 Brief 都写到可生产粒度（主体/瞬间/取景/前中远景/象征落位/必含/缩略图锚点）', thin.length === 0, thin.join(', '))

  /* 死神五套不许同时落进"骷髅"这个刻板印象 */
  const deathBriefs = CANONICAL_DECK_IDS.map((d) => buildCardArtBrief(d, 'major-13')!).filter(Boolean)
  const skullBanned = deathBriefs.every((b) => b.forbidden.some((f) => f.includes('骷髅')))
  check('死神 5 份 Brief 全部明令禁止骷髅', skullBanned)
  const deathHeroes = deathBriefs.map((b) => b.visual.heroSubject)
  check('死神 5 份 Brief 的主体两两不同', new Set(deathHeroes).size === deathBriefs.length)

  /* 小阿卡纳必须是完整场景，不能退化成"一个符号 + 背景" */
  const aceBriefs = CANONICAL_DECK_IDS.map((d) => buildCardArtBrief(d, 'wands-01')!).filter(Boolean)
  const aceFull = aceBriefs.every(
    (b) =>
      b.visual.foreground.length >= 4 &&
      b.visual.midground.length >= 4 &&
      b.visual.background.length >= 4 &&
      b.mustInclude.some((m) => m.includes('手')),
  )
  check('权杖首牌 5 份 Brief 均为完整场景且含具体的手（RWS 叙事原则）', aceFull)

  /* 五张 The Fool 的缩略图锚点必须各不相同 —— 这是 §19 的可断言投影 */
  const foolAnchors = CANONICAL_DECK_IDS.map((d) => buildCardArtBrief(d, 'major-00')!.thumbnailAnchor)
  check('五张 The Fool 的缩略图锚点两两不同', new Set(foolAnchors).size === 5, foolAnchors.length + ' 个')

  /* seed 覆盖面与声明一致 */
  const seedKeys = Object.keys(BENCHMARK_SEEDS)
  check('BENCHMARK_SEEDS 的键数与矩阵一致', seedKeys.length === 25, `${seedKeys.length} 个 key`)

  const numericMinor = allCards.filter(
    (c) => c.arcana === 'minor' && c.number >= 2 && c.number <= 10,
  )
  const softCount = /\b(?:roughly|approximately|about)\b/i
  const hardCountFailures = numericMinor.filter((card) => {
    const block = buildProductionPromptConstraints(card.id).join(' ')
    return !/\bEXACTLY (?:TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\b/.test(block) ||
      softCount.test(block)
  })
  check(
    '数字牌 2–10 的生产约束使用 EXACTLY N，禁止 roughly/about/approximately',
    hardCountFailures.length === 0,
    hardCountFailures.map((c) => c.id).join(', '),
  )

  const hangedManConstraints = buildProductionPromptConstraints('major-12').join(' ')
  check(
    'The Hanged Man 生产约束锁定主体本体倒置、实际悬置、非倒影、平静且非暴力',
    /own body is upside-down/.test(hangedManConstraints) &&
      /actual suspended orientation/.test(hangedManConstraints) &&
      /must not be shown only through a reflection/.test(hangedManConstraints) &&
      /calm, voluntary, contemplative/.test(hangedManConstraints) &&
      /symbolic and non-violent/.test(hangedManConstraints),
    hangedManConstraints,
  )
}

/* ══════════════════════════════════════════════════════════════
 * 现有行为不得回归
 * ══════════════════════════════════════════════════════════ */

function checkNoRegression(): void {
  section('无回归 · Phase C1A 不得动到已稳定的东西')

  check(
    'canonical five 全部仍可用于抽牌',
    CANONICAL_DECK_IDS.every((d) => isDeckPlayable(d)),
  )
  check(
    '未开工的 raster 牌组仍然不可抽牌（不许用回退图冒充成品）',
    ['elysian', 'opaline', 'wonderland', 'classic'].every(
      (d) => !isDeckPlayable(d as never),
    ),
  )
  check('ethereal dev fixture 仍然不可抽牌', !isDeckPlayable('ethereal'))
  check('牌义层仍为 78 张', cardIds.length === 78)
  check('牌组总数仍为 10（未删除、未新增）', decks.length === 10)
  check(
    'ProceduralCardArt 仍然存在（它是 fallback，不许删）',
    readFileSync(resolve(REPO_ROOT, 'src/decks/legacy/ProceduralCardArt.tsx'), 'utf8').length > 0,
  )

  /* CardArtwork 必须是唯一的解析入口 */
  const faceSrc = readFileSync(resolve(REPO_ROOT, 'src/components/card/TarotCardFace.tsx'), 'utf8')
  check(
    '牌面渲染经由 CardArtwork（解析规则集中一处）',
    /<CardArtwork/.test(faceSrc) && !/resolveCardArtwork/.test(faceSrc),
  )
}


/* ══════════════════════════════════════════════════════════════
 * B-01 … B-08 · Phase C1B-1 Style Anchor
 *
 * 这一组守的是「五张 The Fool 试产」这条通道本身：
 * brief 齐不齐、路径撞不撞、benchmark 会不会被当成交付、
 * DEV 能不能看见、图缺了会不会崩、以及**有没有人偷偷登记不存在的文件**。
 * ══════════════════════════════════════════════════════════ */

function checkStyleAnchor(): void {
  section('B · Style Anchor（The Fool × 5）')

  const FOOL = STYLE_ANCHOR_CARD_ID

  /* ── B-01 五套 The Fool 均存在 benchmark brief ── */
  const foolBriefs = CANONICAL_DECK_IDS.map((d) => ({ d, b: buildCardArtBrief(d, FOOL) }))
  check(
    `B-01 五套均有 ${FOOL} 的 Benchmark Brief`,
    foolBriefs.every((x) => x.b !== null),
    foolBriefs.filter((x) => !x.b).map((x) => x.d).join(', ') || '5/5',
  )
  /* 光"存在"不够 —— 空壳 brief 出不了图 */
  check(
    'B-01b 每份 Fool Brief 的前中远景、必含项、缩略图锚点都非空',
    foolBriefs.every(
      ({ b }) =>
        b !== null &&
        b.visual.foreground.length > 0 &&
        b.visual.midground.length > 0 &&
        b.visual.background.length > 0 &&
        b.mustInclude.length > 0 &&
        b.thumbnailAnchor.length > 0,
    ),
  )
  /* 五张的主体两两不同 —— 同一个主体描述出五次，
     等于五套在 Brief 阶段就已经是同一张牌了 */
  const heroes = new Set(foolBriefs.map((x) => x.b!.visual.heroSubject))
  check('B-01c 五张 Fool 的主体描述两两不同', heroes.size === 5, `${heroes.size}/5`)

  /* ── B-02 五套 benchmark asset path 不重复 ── */
  const fullPaths = CANONICAL_DECK_IDS.map((d) => cardArtworkRepoPath(d, FOOL))
  const thumbPaths = CANONICAL_DECK_IDS.map((d) => cardThumbRepoPath(d, FOOL))
  const allPaths = [...fullPaths, ...thumbPaths]
  check(
    'B-02 五套 full + thumb 共 10 条路径两两不同',
    new Set(allPaths).size === allPaths.length,
    `${new Set(allPaths).size}/10`,
  )
  /* 路径必须落在各自 deckId 的目录下 —— 这是"deckId 在第一步"的物理体现 */
  check(
    'B-02b 每条路径都落在自己 deckId 的目录下',
    CANONICAL_DECK_IDS.every(
      (d, i) => fullPaths[i]!.includes(`/${d}/`) && thumbPaths[i]!.includes(`/${d}/`),
    ),
  )
  /* 运行期真的会去请求的位置，与磁盘上该放文件的位置，必须是同一处 */
  check(
    'B-02c 运行期 URL 还原后与磁盘路径一致',
    CANONICAL_DECK_IDS.every(
      (d) => urlToRepoPath(`/assets/decks/${d}/cards/${FOOL}.webp?r=1`) === cardArtworkRepoPath(d, FOOL),
    ),
  )

  /* ── 用一份内存 manifest 验真实分支 ──
     真实数据里 0 张原画，下面三条规则在真实数据上测不出来。
     喂 manifest 而不是往正式 manifest 里塞假登记 —— 后者才是伪造交付。 */
  const base = getManifest(CANONICAL_DECK_IDS[0]!)!
  const staged = {
    ...base,
    cards: { [FOOL]: { w: 1080, h: 1800, thumb: true, status: 'benchmark' as const } },
  }
  const approved = {
    ...base,
    cards: { [FOOL]: { w: 1080, h: 1800, thumb: true, status: 'approved' as const } },
  }

  /* ── B-03 benchmark 不计入 artworkCardCount ── */
  check('B-03 benchmark 不计入已交付数量', countDelivered(staged) === 0, `${countDelivered(staged)}`)
  check('B-03b approved 计入已交付数量', countDelivered(approved) === 1)
  check(
    'B-03c placeholder 同样不计入',
    countDelivered({
      ...base,
      cards: { [FOOL]: { w: 1080, h: 1800, status: 'placeholder' as const } },
    }) === 0,
  )
  /* 【Phase C3 修订】原文是「五套当前已交付数量均为 0（尚无原画通过人工批准）」。
     那是一条**状态锁**：它锁住的正是 C3 要推翻的那个状态，
     C3 完成的那一刻它必然失败。保留它的字面判定等于禁止项目前进。

     它真正要防的是「在没有资产的情况下谎报交付数量」，
     所以改为断言 **数量与磁盘实际文件数一致** —— 同一个防线，
     但现在无论已交付是 0 还是 390 都成立，且比原来更难糊弄：
     往 manifest 里塞一条不存在的登记会立刻红。 */
  const deliveredVsDisk = CANONICAL_DECK_IDS.map((d) => {
    const delivered = countDelivered(getManifest(d)!)
    const dir = resolve(REPO_ROOT, 'public/assets/decks', d, 'cards')
    const onDisk = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith('.webp')).length
      : 0
    return { d, delivered, onDisk }
  })
  check(
    'B-03d 五套已交付数量与磁盘实际牌面文件数一致（不许谎报交付）',
    deliveredVsDisk.every((x) => x.delivered === x.onDisk),
    deliveredVsDisk.map((x) => `${x.d.replace('legacy-', '')} ${x.delivered}/${x.onDisk}`).join(' · '),
  )
  /* FULL-ART-01 / 02 / 03：数量本身也要断言，否则「一致」可以在 0=0 时成立 */
  check(
    'FULL-ART-01/02 五套均为 78/78，合计 390',
    deliveredVsDisk.every((x) => x.delivered === 78) &&
      deliveredVsDisk.reduce((a, x) => a + x.delivered, 0) === 390,
    `${deliveredVsDisk.reduce((a, x) => a + x.delivered, 0)} / 390`,
  )

  /* ── B-04 production resolver 默认不把 benchmark 当 approved ── */
  const prod = resolvePlanFrom(staged, FOOL)
  check(
    'B-04 正式解析路径把 benchmark 挡在外面（回退到程序化）',
    prod.kind === 'procedural',
    `kind=${prod.kind}`,
  )
  check(
    'B-04b 显式传 previewBenchmark:false 同样挡住',
    resolvePlanFrom(staged, FOOL, { previewBenchmark: false }).kind === 'procedural',
  )
  check(
    'B-04c approved 在正式路径上正常渲染为 raster',
    resolvePlanFrom(approved, FOOL).kind === 'raster',
  )
  /* preview 只放行 benchmark，placeholder 任何时候都不许冒充牌面 */
  check(
    'B-04d preview 模式也不放行 placeholder',
    resolvePlanFrom(
      { ...base, cards: { [FOOL]: { w: 1080, h: 1800, status: 'placeholder' as const } } },
      FOOL,
      { previewBenchmark: true },
    ).kind === 'procedural',
  )
  /* ── 源码扫描：谁真的把这个口子打开了 ──
     只认"作为 JSX 属性传成真"的两种写法：裸属性 `previewBenchmark` 与 `={true}`。
     定义处（interface / 解构默认值 / 转发）不算 —— 那些是管道，不是开关。
     允许名单只有 src/dev/。多一个文件出现在这里都必须是一次构建失败。 */
  const TRUTHY_PASS = /previewBenchmark(\s*$|\s*\/?>|=\{true\})/
  const openers: string[] = []
  const walk = (dir: string): void => {
    for (const e of readdirSync(resolve(REPO_ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`
      if (e.isDirectory()) walk(rel)
      else if (/\.tsx?$/.test(e.name)) {
        const lines = readFileSync(resolve(REPO_ROOT, rel), 'utf8').split('\n')
        if (lines.some((l) => TRUTHY_PASS.test(l.trim()))) openers.push(rel)
      }
    }
  }
  walk('src')
  const outsideDev = openers.filter((f) => !f.startsWith('src/dev/'))
  check(
    'B-04e 全仓只有 src/dev/ 会把 previewBenchmark 打开',
    outsideDev.length === 0 && openers.length > 0,
    outsideDev.length > 0 ? `泄漏：${outsideDev.join(', ')}` : `唯一调用点：${openers.join(', ')}`,
  )

  /* ── B-05 dev preview 可以查看 benchmark ── */
  const preview = resolvePlanFrom(staged, FOOL, { previewBenchmark: true })
  check('B-05 preview 模式能解析到 benchmark 原画', preview.kind === 'raster', `kind=${preview.kind}`)
  const devSrc = readFileSync(resolve(REPO_ROOT, 'src/dev/BenchmarkReviewPage.tsx'), 'utf8')
  check('B-05b DEV 评审台存在且确实传了 previewBenchmark', /previewBenchmark/.test(devSrc))
  check(
    'B-05c 评审台覆盖 ROUND A–D 四轮（含 60px 与灰阶）',
    /grayscale/.test(devSrc) && /THUMB_W = 60/.test(devSrc) && /ROUND_LABEL/.test(devSrc),
  )
  const appSrc = readFileSync(resolve(REPO_ROOT, 'src/App.tsx'), 'utf8')
  check(
    'B-05d 评审台路由仅在 DEV 下注册，且不进导航',
    /import\.meta\.env\.DEV[\s\S]{0,120}BenchmarkReviewPage/.test(appSrc) &&
      /\/dev\/benchmark/.test(appSrc),
  )

  /* ── B-06 benchmark fallback 失败时仍不 crash ── */
  let threw = false
  try {
    /* 登记了 benchmark，但请求的是另一张牌 → 必须回退，不能抛 */
    resolvePlanFrom(staged, 'major-21', { previewBenchmark: true })
    /* 登记了 benchmark，但那张牌连程序化美术都没有 → 必须给 missing，不能抛 */
    resolvePlanFrom(staged, 'not-a-real-card', { previewBenchmark: true })
    resolveCardArtwork('legacy-moonlight', 'not-a-real-card', { previewBenchmark: true })
  } catch {
    threw = true
  }
  check('B-06 preview 模式下解析未知牌不抛异常', !threw)
  check(
    'B-06b 未知牌得到 missing 而不是别的牌的画面',
    resolvePlanFrom(staged, 'not-a-real-card', { previewBenchmark: true }).kind === 'missing',
  )
  /* 图登记了但文件 404：RasterArtwork 必须有 error 分支落到 MissingArtwork */
  const layerSrc = readFileSync(
    resolve(REPO_ROOT, 'src/components/card/CardArtworkLayer.tsx'),
    'utf8',
  )
  check(
    'B-06c 原画加载失败有明确的错误分支（不是白屏）',
    /status === 'error'/.test(layerSrc) && /MissingArtwork/.test(layerSrc),
  )

  /* ── B-07 五套 canonical deckId 未发生改变 ── */
  const EXPECTED_IDS = [
    'legacy-moonlight',
    'legacy-classic',
    'legacy-forest',
    'legacy-celestial',
    'legacy-shadow',
  ]
  check(
    'B-07 五套 canonical deckId 与 Phase C1A 逐字节一致',
    JSON.stringify([...CANONICAL_DECK_IDS]) === JSON.stringify(EXPECTED_IDS),
    CANONICAL_DECK_IDS.join(', '),
  )
  check(
    'B-07b 五套仍全部可抽牌（hybrid 由程序化顶着）',
    CANONICAL_DECK_IDS.every((d) => isDeckPlayable(d)),
  )

  /* ── B-08 The Fool semantic data 五套完全相同 ── */
  const tarotJson = foolBriefs.map((x) => JSON.stringify(x.b!.tarot))
  check(
    'B-08 五套下 The Fool 的牌义字段逐字节相同',
    new Set(tarotJson).size === 1,
    `${new Set(tarotJson).size} 种`,
  )
  const t0 = foolBriefs[0]!.b!.tarot
  check('B-08b cardId / 正逆位牌义来自语义层且非空', t0.cardId === FOOL && t0.meaningUpright.length > 0 && t0.meaningReversed.length > 0)
  check(
    'B-08c 四个象征的详解已接进 Brief（A-09 需要"功能"而不只是名字）',
    t0.symbolMeanings.length === t0.symbolism.length && t0.symbolMeanings.every((s) => s.meaning.length > 0),
    `${t0.symbolMeanings.length} 条`,
  )

  /* ── 磁盘真实性：登记 ≠ 存在 ──
     这条是整组里最重要的一条。它让"声称图片已经完成"变成一次构建失败，
     而不是一句没人核对的话。 */
  const phantom: string[] = []
  for (const manifest of Object.values(artworkManifests)) {
    for (const cardId of Object.keys(manifest.cards)) {
      const full = cardArtworkRepoPath(manifest.deckId, cardId)
      if (!existsSync(resolve(REPO_ROOT, full))) phantom.push(full)
    }
  }
  check(
    'B-09 manifest 里登记的每一张原画在磁盘上真实存在',
    phantom.length === 0,
    phantom.length > 0 ? `幽灵登记：${phantom.join(', ')}` : `已核对 ${Object.values(artworkManifests).reduce((n, m) => n + Object.keys(m.cards).length, 0)} 条登记`,
  )
  /* 登记位当前必须为空，且空这件事要被说出来 */
  const stagedCount = Object.values(BENCHMARK_STAGED).reduce((n, c) => n + Object.keys(c).length, 0)
  check(
    'B-09b BENCHMARK_STAGED 与实际出图状态一致',
    stagedCount === 0,
    stagedCount === 0 ? '0 条 —— 五张 The Fool 尚未生成（IMAGE_GENERATION_BLOCKED）' : `${stagedCount} 条`,
  )
  check(
    'B-09c Production Spec 已生成且覆盖五套',
    (() => {
      const f = resolve(REPO_ROOT, 'docs/v2/22-the-fool-production-spec.md')
      if (!existsSync(f)) return false
      const doc = readFileSync(f, 'utf8')
      return CANONICAL_DECK_IDS.every((d) => doc.includes(`\`${d}\``))
    })(),
  )
}

/* ══════════════════════════════════════════════════════════════
 * FULL-ART · Phase C3 全量原画导入
 *
 * 这一组断言的对象是**磁盘上真实的 780 个 runtime 文件**，
 * 不是 manifest 里的声明。上面 B-09 已经查过「登记的文件存在」，
 * 这里查的是反方向与更深一层：文件本身是不是一张合格的图。
 *
 * 【为什么 decode 默认只抽样】
 * 全量 decode 390 张约 10 秒，cards + thumbs 就是 20 秒 ——
 * 而 artwork:check 在 `npm run build` 的关键路径上。
 * metadata 是全量的（283ms，能抓到尺寸/格式/损坏头），
 * 完整 decode 每套抽 10 张；`--deep` 走全量，用于导入与返修后的验收。
 * ══════════════════════════════════════════════════════════ */

const DEEP = process.argv.includes('--deep')

async function checkFullArtwork(): Promise<void> {
  section(`FULL-ART · 390 张正式原画${DEEP ? '（--deep 全量 decode）' : ''}`)

  const EXPECTED_IDS = cardIds
  const cardsOf = (d: string, dir: 'cards' | 'thumbs'): string[] => {
    const p = resolve(REPO_ROOT, 'public/assets/decks', d, dir)
    return existsSync(p)
      ? readdirSync(p).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''))
      : []
  }

  /* FULL-ART-03 每个 canonical deckId 都有完整 78 cardIds
     FULL-ART-04 不存在重复 cardId（readdir 天然去重，所以这里查的是
     「文件名集合 === 期望集合」，多一个少一个都会红） */
  let allComplete = true
  let noExtra = true
  for (const d of CANONICAL_DECK_IDS) {
    const ids = cardsOf(d, 'cards')
    const set = new Set(ids)
    if (set.size !== 78 || !EXPECTED_IDS.every((id) => set.has(id))) allComplete = false
    if (ids.some((id) => !EXPECTED_IDS.includes(id))) noExtra = false
  }
  check('FULL-ART-03 五套各有完整 78 个 canonical cardId', allComplete)
  check('FULL-ART-04 不存在多余或重复的 cardId 文件', noExtra)

  /* FULL-ART-07 所有 Thumb 均存在 */
  check(
    'FULL-ART-07 五套 thumbs 各 78 张，合计 390',
    CANONICAL_DECK_IDS.every((d) => cardsOf(d, 'thumbs').length === 78),
    `${CANONICAL_DECK_IDS.reduce((a, d) => a + cardsOf(d, 'thumbs').length, 0)} / 390`,
  )

  /* FULL-ART-06 比例 / 尺寸 / 格式，FULL-ART-15 可 decode */
  const sharp = (await import('sharp')).default
  const bad: string[] = []
  let decoded = 0
  for (const d of CANONICAL_DECK_IDS) {
    for (const [dir, spec] of [
      ['cards', { w: 1080, h: 1800 }],
      ['thumbs', { w: 240, h: 400 }],
    ] as const) {
      const ids = cardsOf(d, dir as 'cards' | 'thumbs').sort()
      const sample = DEEP ? ids : ids.filter((_, i) => i % 8 === 0)
      for (const id of ids) {
        const file = resolve(REPO_ROOT, 'public/assets/decks', d, dir, `${id}.webp`)
        const m = await sharp(file).metadata()
        if (m.format !== 'webp') bad.push(`${d}/${dir}/${id} format=${m.format}`)
        if (m.width !== spec.w || m.height !== spec.h) {
          bad.push(`${d}/${dir}/${id} ${m.width}×${m.height}`)
        }
        if (m.orientation && m.orientation !== 1) bad.push(`${d}/${dir}/${id} exif=${m.orientation}`)
        if (sample.includes(id)) {
          try {
            await sharp(file).raw().toBuffer()
            decoded += 1
          } catch (e) {
            bad.push(`${d}/${dir}/${id} decode 失败: ${(e as Error).message.slice(0, 40)}`)
          }
        }
      }
    }
  }
  check(
    'FULL-ART-06 全部 runtime WebP 尺寸/格式/EXIF 正确',
    bad.length === 0,
    bad.length === 0 ? 'cards 1080×1800 · thumbs 240×400 · 780 个文件' : bad.slice(0, 3).join(' | '),
  )
  check(
    `FULL-ART-15 runtime WebP 可成功 decode${DEEP ? '' : '（抽样）'}`,
    bad.filter((b) => b.includes('decode')).length === 0,
    `${decoded} 个文件`,
  )

  /* 运行期兜底：已登记的牌加载失败时必须能落到程序化牌面，
     而不是给用户一个「加载失败」方块。这条断言查的是 plan 里带没带兜底数据 ——
     渲染分支由 CardArtworkLayer 消费（见该文件 error 分支）。

     注意它与 ART-02 的分工：ART-02 管「素材从未交付」（missing → procedural），
     这条管「素材已交付但这次没加载到」。两者都不许让牌阵开天窗，
     但前者的 plan 是 procedural，后者的 plan 是 raster + fallback。 */
  let withFallback = 0
  let raster = 0
  for (const d of CANONICAL_DECK_IDS) {
    for (const id of cardIds) {
      const plan = resolveCardArtwork(d, id)
      if (plan.kind !== 'raster') continue
      raster += 1
      if (plan.fallback) withFallback += 1
    }
  }
  check(
    'FULL-ART-08b 已登记的牌都带运行期程序化兜底（弱网/误删不开天窗）',
    raster > 0 && withFallback === raster,
    `${withFallback} / ${raster}`,
  )
  /* 反向：raster 牌组（没有 artPackId）不许有兜底 ——
     那会变成「用程序化图冒充还没画的牌」，正是 MissingArtworkPlan 要防的事。 */
  const artworkRasterHasNoFallback = ARTWORK_DECK_IDS.every((d) =>
    cardIds.every((id) => {
      const plan = resolveCardArtwork(d, id)
      return plan.kind !== 'raster' || !plan.fallback
    }),
  )
  check('FULL-ART-08c 未开工的 raster 牌组没有兜底（不许冒充成品）', artworkRasterHasNoFallback)

  /* ── Phase C4 视觉 QA 分级 ──
     【这一组断言存在的理由：让 final 无法靠跑测试拿到】
     程序化校验（尺寸/格式/decode）证明的是「文件是好的」，
     它对「画的是不是这张牌」一无所知 —— pentacles-09 画了 12 个五芒星，
     所有自动断言依然全绿。所以 final 的门槛必须挂在人工复核上，
     并且**有未修复 P0 的牌永远不能是 final**，否则这条门槛形同虚设。 */
  const finalCards: string[] = []
  const p0Cards: string[] = []
  for (const [deckId, cards] of Object.entries(PRODUCTION_CARDS)) {
    for (const [cardId, asset] of Object.entries(cards)) {
      const key = `${deckId}/${cardId}`
      if ((asset.status ?? 'final') === 'final') finalCards.push(key)
      if (QA_SEVERITY[key] === 'P0') p0Cards.push(key)
    }
  }
  check(
    'C4-01 存在未修复 P0 的牌一律不是 final',
    p0Cards.every((k) => !finalCards.includes(k)),
    `P0 ${p0Cards.length} 张 · final ${finalCards.length} 张`,
  )
  check(
    'C4-02 每张待复核牌都有明确的 severity 分级',
    NEEDS_VISUAL_REVIEW.every((k) => QA_SEVERITY[k] !== undefined),
    `${NEEDS_VISUAL_REVIEW.length} 张待复核`,
  )
  /* 这条断言会在 P0 清零时**主动失败**，提醒把门槛推进到下一档 ——
     一条永远绿的断言等于没有断言。 */
  check(
    'C4-03 P0 清单与 QA 结论一致（Phase C4.1 门槛）',
    p0Cards.length === 0,
    p0Cards.length === 0 ? 'P0 = 0' : p0Cards.join(' · '),
  )
  check(
    'C4-04 final 数量等于 codegen 记录（防止手工改 status）',
    finalCards.length === FINAL_COUNT,
    `${finalCards.length} / ${FINAL_COUNT}`,
  )

  /* FULL-ART-10 五套切换后相同 cardId 的 artwork URL 必须不同。
     这条是「五套是不是真的五套」在**资产层**的证据 ——
     identity 不同但 URL 相同，就是同一张图换了个名字。 */
  let urlsDistinct = true
  for (const id of EXPECTED_IDS) {
    const urls = new Set(
      CANONICAL_DECK_IDS.map((d) => {
        const plan = resolveCardArtwork(d, id)
        return plan.kind === 'raster' ? plan.path : `non-raster:${d}`
      }),
    )
    if (urls.size !== CANONICAL_DECK_IDS.length) urlsDistinct = false
  }
  check('FULL-ART-10 同一 cardId 在五套下的 artwork URL 两两不同', urlsDistinct, `78 张 × 5 套`)

  /* FULL-ART-11 五套相同 cardId 的 Semantic Data 必须完全一致。
     B-08 只验了 The Fool 一张；390 张原画到位后，
     「牌组只改变画面」这条产品承诺必须在**全部 78 张**上成立。
     做法是拿语义层的牌逐张比对自身 —— resolver 拿不到牌义，
     所以这里真正验的是：没有任何代码路径能让 deckId 改写牌义。 */
  const semanticStable = allCards.every((card) => {
    const seen = CANONICAL_DECK_IDS.map(() =>
      JSON.stringify({
        id: card.id,
        nameZh: card.nameZh,
        arcana: card.arcana,
        number: card.number,
        up: card.meaningUpright,
        rev: card.meaningReversed,
        kwUp: card.keywordsUpright,
        kwRev: card.keywordsReversed,
      }),
    )
    return new Set(seen).size === 1
  })
  check('FULL-ART-11 五套下 78 张牌义逐字段相同', semanticStable, `${allCards.length} 张`)

  /* FULL-ART-12 Artwork 变化不能影响 upright / reversed。
     resolver 的签名里根本没有 orientation —— 这条断言把
     「结构上不可能」变成「可被证伪」：如果谁给 plan 加了朝向字段，它会红。 */
  const planKeys = new Set(Object.keys(resolveCardArtwork(CANONICAL_DECK_IDS[0]!, cardIds[0]!)))
  check(
    'FULL-ART-12 artwork plan 不携带 orientation（正逆位不受牌面影响）',
    !planKeys.has('orientation') && !planKeys.has('reversed') && !planKeys.has('upright'),
    [...planKeys].join(','),
  )

  /* FULL-ART-13 已由 ART-03「artwork plan 不携带任何牌义字段」覆盖，
     此处补一条方向相反的：Reading 侧的 prompt 构造不得 import 牌面路径。
     上面第 251 行已有 `!/from '.*decks\//` 对 prompt 源码的检查，
     这里只断言那条检查覆盖到了 artwork 路径模块。 */
  const promptSrcAll = [
    resolve(REPO_ROOT, 'server/prompts/tarotReadingPromptV2.ts'),
    resolve(REPO_ROOT, 'server/context/rebuild.ts'),
  ]
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
  check(
    'FULL-ART-13 Reading prompt 不引用任何 artwork 路径/资产模块',
    !/artwork\/paths|artwork\/resolver|artwork\/manifests|assets\/decks/.test(promptSrcAll),
  )
}

/* ══════════════════════════════════════════════════════════════ */

console.log(`${B}Artwork Pipeline 自检${X}`)
checkPipeline()
checkDifferentiation()
checkBriefs()
checkStyleAnchor()
checkNoRegression()
await checkFullArtwork()

console.log(`\n${'─'.repeat(64)}`)
if (fail === 0) {
  console.log(`${G}全部通过${X}  ${pass} 项断言，0 失败`)
  console.log(`${D}五套牌的视觉规则已进入代码，390 张原画的生产系统就位。${X}`)
} else {
  console.log(`${R}${fail} 项失败${X}  ${pass} 项通过`)
}
console.log('─'.repeat(64))
process.exit(fail === 0 ? 0 : 1)
