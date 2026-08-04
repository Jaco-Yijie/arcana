/**
 * engine-selfcheck.ts — Tarot Table 引擎自检
 *
 * 运行：  npm run engine:check      （等价于 npx tsx scripts/engine-selfcheck.ts）
 *
 * 这个脚本存在的理由：AC-01 / AC-02 / AC-03 与 G-01 / G-02 / G-21 / G-22
 * 都是「随机机制」层面的验收点，靠肉眼点界面验不出来。
 * 这里用纯逻辑复现完整流程并逐条断言，输出可读报告。
 */

import {
  applyCut,
  applyShuffleGesture,
  buildHiddenDeck,
  cardAt,
  createEntropy,
  computeFanLayout,
  computeFanMetrics,
  createSeed,
  deckFingerprint,
  hitTestFan,
  isValidPermutation,
  MIN_EXPOSURE,
  recordDrag,
  scrollOffsetForIndex,
} from '../src/features/table/engine/index.ts'
import type { ShuffleGesture } from '../src/features/table/engine/index.ts'
import type { DeckEntry, InteractionEntropy } from '../src/types/session.ts'

/* ------------------------------------------------------------------ 断言框架 */

let passed = 0
let failed = 0
const failures: string[] = []

function section(title: string): void {
  console.log(`\n\x1b[1m${title}\x1b[0m`)
}

function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed += 1
    console.log(`  \x1b[32mPASS\x1b[0m  ${label}${detail ? `  \x1b[2m${detail}\x1b[0m` : ''}`)
  } else {
    failed += 1
    failures.push(label)
    console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `  ${detail}` : ''}`)
  }
}

/* ------------------------------------------------- 测试用 78 张标准牌 id（不依赖 data 层） */

function standardCardIds(): string[] {
  const ids: string[] = []
  for (let i = 0; i <= 21; i += 1) ids.push(`major-${String(i).padStart(2, '0')}`)
  for (const suit of ['wands', 'cups', 'swords', 'pentacles']) {
    for (let i = 1; i <= 14; i += 1) ids.push(`${suit}-${String(i).padStart(2, '0')}`)
  }
  return ids
}

const CARD_IDS = standardCardIds()

/* ------------------------------------------------------------------ 手势样本 */

const G = {
  riffleShort: { dx: 4, dy: 90, durationMs: 260, startRatio: 0.5, endRatio: 0.7 },
  riffleLong: { dx: -6, dy: 260, durationMs: 380, startRatio: 0.3, endRatio: 0.9 },
  riffleHigh: { dx: 2, dy: 120, durationMs: 300, startRatio: 0.12, endRatio: 0.4 },
  stripRight: { dx: 180, dy: 10, durationMs: 220, startRatio: 0.4, endRatio: 0.8 },
  stripLeft: { dx: -180, dy: 10, durationMs: 220, startRatio: 0.4, endRatio: 0.8 },
  tooShort: { dx: 6, dy: 4, durationMs: 40, startRatio: 0.5, endRatio: 0.5 },
} satisfies Record<string, ShuffleGesture>

const SEED_A = 'a1b2c3d4e5f60718'
const SEED_B = 'ffee00112233aabb'

function runSequence(
  seed: string,
  gestures: ShuffleGesture[],
  cutRatio: number | null,
): { deck: DeckEntry[]; entropy: InteractionEntropy } {
  let deck = buildHiddenDeck(seed, CARD_IDS)
  let entropy = createEntropy()
  for (const g of gestures) {
    const r = applyShuffleGesture(deck, entropy, g, seed)
    deck = r.deck
    entropy = r.entropy
  }
  if (cutRatio !== null) {
    const c = applyCut(deck, cutRatio, entropy)
    deck = c.deck
    entropy = c.entropy
  }
  return { deck, entropy }
}

/* ================================================================== 1. 隐藏牌组 */

section('1. buildHiddenDeck — 隐藏牌组状态（AC-01 前提 / G-02）')
{
  const deck = buildHiddenDeck(SEED_A, CARD_IDS)
  check('产出 78 张', deck.length === 78, `实际 ${deck.length}`)
  check('无重复、无丢失（是原牌组的合法排列）', isValidPermutation(deck, CARD_IDS))
  check(
    '每张都带有确定的 orientation',
    deck.every((e) => e.orientation === 'upright' || e.orientation === 'reversed'),
  )

  // orientation 分布：在 100 个不同 seed 上统计，均值应接近 50%
  let total = 0
  let reversed = 0
  let minRate = 1
  let maxRate = 0
  for (let i = 0; i < 100; i += 1) {
    const d = buildHiddenDeck(`seed-${i}`, CARD_IDS)
    const r = d.filter((e) => e.orientation === 'reversed').length
    reversed += r
    total += d.length
    minRate = Math.min(minRate, r / d.length)
    maxRate = Math.max(maxRate, r / d.length)
  }
  const rate = reversed / total
  check(
    'orientation 分布合理（100 副牌逆位率 45%–55%）',
    rate > 0.45 && rate < 0.55,
    `逆位率 ${(rate * 100).toFixed(1)}%，单副区间 ${(minRate * 100).toFixed(0)}%–${(maxRate * 100).toFixed(0)}%`,
  )

  // 牌序与正逆位不相关：前半 / 后半的逆位率应接近
  let firstHalf = 0
  let secondHalf = 0
  for (let i = 0; i < 200; i += 1) {
    const d = buildHiddenDeck(`corr-${i}`, CARD_IDS)
    firstHalf += d.slice(0, 39).filter((e) => e.orientation === 'reversed').length
    secondHalf += d.slice(39).filter((e) => e.orientation === 'reversed').length
  }
  const diff = Math.abs(firstHalf - secondHalf) / (firstHalf + secondHalf)
  check('牌序位置与逆位无相关性（前后半逆位数偏差 < 3%）', diff < 0.03, `偏差 ${(diff * 100).toFixed(2)}%`)
}

/* ================================================================== 2. 可复现性 */

section('2. 可复现性 —— 同 seed 同牌组 / 异 seed 异牌组（G-22 会话恢复的前提）')
{
  const a1 = deckFingerprint(buildHiddenDeck(SEED_A, CARD_IDS))
  const a2 = deckFingerprint(buildHiddenDeck(SEED_A, CARD_IDS))
  const b = deckFingerprint(buildHiddenDeck(SEED_B, CARD_IDS))
  check('同 seed → 完全相同的牌组（含正逆位）', a1 === a2)
  check('不同 seed → 不同的牌组', a1 !== b)

  // 1000 个 seed 全部互不相同
  const set = new Set<string>()
  for (let i = 0; i < 1000; i += 1) set.add(deckFingerprint(buildHiddenDeck(`s${i}`, CARD_IDS)))
  check('1000 个不同 seed 产生 1000 个不同牌组', set.size === 1000, `唯一值 ${set.size}`)

  // createSeed 本身要有足够熵
  const seeds = new Set<string>()
  for (let i = 0; i < 2000; i += 1) seeds.add(createSeed())
  check('createSeed() 2000 次无碰撞', seeds.size === 2000, `唯一值 ${seeds.size}`)
}

/* ================================================================== 3. 洗牌 */

section('3. 洗牌 —— AC-02 / G-03 / G-21')
{
  const base = buildHiddenDeck(SEED_A, CARD_IDS)
  const e0 = createEntropy()

  // 3.1 无操作不得改变牌序
  const noop = applyShuffleGesture(base, e0, G.tooShort, SEED_A)
  check(
    '低于阈值的手势不构成洗牌，牌序不变（AC-02 上半段）',
    !noop.applied && deckFingerprint(noop.deck) === deckFingerprint(base),
  )

  // 3.2 有效手势必须改变牌序，且仍是合法排列
  const gestureNames = Object.keys(G).filter((k) => k !== 'tooShort') as (keyof typeof G)[]
  let allChanged = true
  let allValid = true
  const results: string[] = []
  for (const name of gestureNames) {
    const r = applyShuffleGesture(base, e0, G[name], SEED_A)
    if (!r.applied || deckFingerprint(r.deck) === deckFingerprint(base)) allChanged = false
    if (!isValidPermutation(r.deck, CARD_IDS)) allValid = false
    results.push(`${String(name)}:${r.kind}@${r.cutPoint}`)
  }
  check('每一种有效手势都改变了牌序（AC-02 下半段）', allChanged)
  check('洗牌后仍是 78 张合法排列（无重复无丢失）', allValid, results.join(' '))

  // 3.3 不同手势 → 不同结果
  const prints = new Map<string, string>()
  for (const name of gestureNames) {
    const r = applyShuffleGesture(base, e0, G[name], SEED_A)
    prints.set(String(name), deckFingerprint(r.deck))
  }
  check('不同手势 → 不同牌序', new Set(prints.values()).size === prints.size)

  // 3.4 手势幅度必须实质影响结果（G-21：entropy 不是装饰）
  const micro = applyShuffleGesture(base, e0, { ...G.riffleShort, dy: 30 }, SEED_A)
  const macro = applyShuffleGesture(base, e0, { ...G.riffleShort, dy: 300 }, SEED_A)
  check('同方向、仅距离不同 → 结果不同', deckFingerprint(micro.deck) !== deckFingerprint(macro.deck))

  const slow = applyShuffleGesture(base, e0, { ...G.riffleShort, durationMs: 900 }, SEED_A)
  const fast = applyShuffleGesture(base, e0, { ...G.riffleShort, durationMs: 120 }, SEED_A)
  check('同位移、仅时长不同 → 结果不同', deckFingerprint(slow.deck) !== deckFingerprint(fast.deck))

  const highCut = applyShuffleGesture(base, e0, { ...G.riffleShort, startRatio: 0.15 }, SEED_A)
  const lowCut = applyShuffleGesture(base, e0, { ...G.riffleShort, startRatio: 0.85 }, SEED_A)
  check('同手势、仅起始位置不同 → 结果不同', deckFingerprint(highCut.deck) !== deckFingerprint(lowCut.deck))
  check(
    '起始位置主导 riffle 切割点（0.15 → 靠前，0.85 → 靠后）',
    highCut.cutPoint < 20 && lowCut.cutPoint > 58,
    `cutPoint ${highCut.cutPoint} / ${lowCut.cutPoint}`,
  )

  const right = applyShuffleGesture(base, e0, G.stripRight, SEED_A)
  const left = applyShuffleGesture(base, e0, G.stripLeft, SEED_A)
  check('横滑方向相反 → 结果不同', deckFingerprint(right.deck) !== deckFingerprint(left.deck))

  // 3.5 相同手势序列 → 相同结果（G-22）
  const seq = [G.riffleShort, G.stripRight, G.riffleLong, G.stripLeft, G.riffleHigh]
  const runA = runSequence(SEED_A, seq, null)
  const runB = runSequence(SEED_A, seq, null)
  check('相同 seed + 相同手势序列 → 完全相同的牌序', deckFingerprint(runA.deck) === deckFingerprint(runB.deck))
  check('并且 entropy digest 也完全一致', runA.entropy.digest === runB.entropy.digest)
  check('长序列洗牌后仍是合法排列', isValidPermutation(runA.deck, CARD_IDS))

  // 3.6 手势顺序敏感
  const swapped = runSequence(SEED_A, [G.stripRight, G.riffleShort, G.riffleLong, G.stripLeft, G.riffleHigh], null)
  check('同一组手势换个顺序 → 不同牌序', deckFingerprint(runA.deck) !== deckFingerprint(swapped.deck))

  // 3.7 连续洗牌每次都追加扰动
  let deck = base
  let entropy = e0
  const chain = new Set<string>([deckFingerprint(base)])
  for (let i = 0; i < 12; i += 1) {
    const r = applyShuffleGesture(deck, entropy, { ...G.riffleShort, dy: 90 + i, durationMs: 250 + i * 7 }, SEED_A)
    deck = r.deck
    entropy = r.entropy
    chain.add(deckFingerprint(deck))
  }
  check('连续洗 12 次，每次都产生新牌序', chain.size === 13, `唯一状态 ${chain.size}/13`)
  check('12 次后仍是合法排列', isValidPermutation(deck, CARD_IDS))

  // 3.8 洗牌确实在打乱（位移统计）
  const displaced = deck.filter((e, i) => e.cardId !== base[i].cardId).length
  check('12 次洗牌后 ≥95% 的牌离开了原位置', displaced >= 74, `${displaced}/78 张换了位置`)
}

/* ================================================================== 4. 切牌 */

section('4. 切牌 —— AC-03 / G-04')
{
  const { deck: shuffled, entropy } = runSequence(SEED_A, [G.riffleShort, G.stripRight], null)

  // AC-03 明确点名的两个切点
  const p20 = applyCut(shuffled, 20 / 78, entropy)
  const p50 = applyCut(shuffled, 50 / 78, entropy)
  check(
    'AC-03 原文用例：P=20 与 P=50 得到不同牌序',
    deckFingerprint(p20.deck) !== deckFingerprint(p50.deck),
    `cutIndex ${p20.cutIndex} vs ${p50.cutIndex}`,
  )
  check('切牌后仍是合法排列', isValidPermutation(p20.deck, CARD_IDS) && isValidPermutation(p50.deck, CARD_IDS))
  check(
    '上下两叠张数之和 = 78',
    p20.upperCount + p20.lowerCount === 78 && p50.upperCount + p50.lowerCount === 78,
  )

  // 扫描全部可分辨切点
  const byIndex = new Map<number, string>()
  for (let i = 0; i <= 100; i += 1) {
    const r = applyCut(shuffled, i / 100, entropy)
    const print = deckFingerprint(r.deck)
    const prev = byIndex.get(r.cutIndex)
    if (prev !== undefined && prev !== print) {
      check('同一 cutIndex 必须得到同一牌序', false)
    }
    byIndex.set(r.cutIndex, print)
  }
  check(
    '不同切点 → 不同牌序（101 个 ratio 覆盖到的每个 cutIndex 结果两两不同）',
    new Set(byIndex.values()).size === byIndex.size,
    `可分辨切点 ${byIndex.size} 个`,
  )
  check('切牌永不产生恒等置换（切了就一定看得出变化）', ![...byIndex.values()].includes(deckFingerprint(shuffled)))

  // 切点由用户主导：ratio 单调对应 cutIndex
  let monotone = true
  let last = -1
  for (let i = 0; i <= 100; i += 1) {
    const r = applyCut(shuffled, i / 100, entropy)
    if (r.cutIndex < last) monotone = false
    last = r.cutIndex
  }
  check('cutIndex 随 ratio 单调不减（用户 ratio 主导，entropy 只做常量级偏移）', monotone)

  // 可复现
  const again = applyCut(shuffled, 20 / 78, entropy)
  check('同 ratio + 同 entropy → 相同结果（G-22）', deckFingerprint(again.deck) === deckFingerprint(p20.deck))
  check('切牌位置被记入 entropy.cutPositions', p20.entropy.cutPositions.length === entropy.cutPositions.length + 1)
}

/* ================================================================== 5. AC-01 核心 */

section('5. AC-01 核心 —— 抽牌是查表，不是现场随机')
{
  const seq = [G.riffleShort, G.stripLeft, G.riffleLong]
  const { deck } = runSequence(SEED_A, seq, 0.37)

  // 5.1 同一 index 重复取 100 次结果恒定
  let stable = true
  const first = cardAt(deck, 42)
  for (let i = 0; i < 100; i += 1) {
    const e = cardAt(deck, 42)
    if (e.cardId !== first.cardId || e.orientation !== first.orientation) stable = false
  }
  check(
    '对同一 index 重复调用 cardAt 100 次，结果恒定',
    stable,
    `index 42 → ${first.cardId} / ${first.orientation}`,
  )

  // 5.2 全部 78 个 index 各重复 100 次都恒定
  let allStable = true
  for (let idx = 0; idx < deck.length; idx += 1) {
    const expect = deck[idx]
    for (let k = 0; k < 100; k += 1) {
      const got = cardAt(deck, idx)
      if (got.cardId !== expect.cardId || got.orientation !== expect.orientation) allStable = false
    }
  }
  check('78 个 index × 100 次调用全部恒定（共 7800 次）', allStable)

  // 5.3 结果等于「初始化 + 洗切变换」后的确定值 —— 独立重算一遍比对
  const recomputed = runSequence(SEED_A, seq, 0.37).deck
  let matches = 0
  for (let i = 0; i < 78; i += 1) {
    const a = cardAt(deck, i)
    const b = recomputed[i]
    if (a.cardId === b.cardId && a.orientation === b.orientation) matches += 1
  }
  check(
    '抽到的牌 = 由 seed + 用户操作序列确定性推导出的值（78/78 对齐）',
    matches === 78,
    `${matches}/78`,
  )

  // 5.4 抽牌顺序不影响结果（用户先点哪张都一样）
  const orderA = [7, 13, 55, 2, 70].map((i) => cardAt(deck, i))
  const orderB = [70, 2, 55, 13, 7].map((i) => cardAt(deck, i)).reverse()
  check(
    '用户以任意顺序点选，同一 index 拿到的牌不变',
    orderA.every((e, i) => e.cardId === orderB[i].cardId && e.orientation === orderB[i].orientation),
  )

  // 5.5 G-01 静态检查：引擎源码里除 rng.ts 的 createSeed 降级路径外不得出现 Math.random
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const url = await import('node:url')
  const engineDir = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../src/features/table/engine')
  const files = await fs.readdir(engineDir)
  const offenders: string[] = []
  for (const f of files) {
    if (!f.endsWith('.ts')) continue
    const text = await fs.readFile(path.join(engineDir, f), 'utf8')
    const hits = text.split('\n').filter((line) => line.includes('Math.random') && !line.trim().startsWith('*'))
    if (hits.length > 0 && f !== 'rng.ts') offenders.push(`${f}(${hits.length})`)
    if (f === 'rng.ts' && hits.length > 1) offenders.push(`rng.ts 出现 ${hits.length} 处（只允许 createSeed 降级 1 处）`)
  }
  check('G-01 静态检查：引擎中不存在决定牌面的 Math.random 调用', offenders.length === 0, offenders.join(' '))
}

/* ================================================================== 6. entropy */

section('6. entropy 真的参与运算 —— G-21')
{
  const e0 = createEntropy()
  const digests = [e0.digest]
  let e = e0
  e = recordDrag(e, { dx: 40, dy: 12, dt: 16 })
  digests.push(e.digest)
  e = recordDrag(e, { dx: -25, dy: 60, dt: 33 })
  digests.push(e.digest)
  const shuffled = applyShuffleGesture(buildHiddenDeck(SEED_A, CARD_IDS), e, G.riffleShort, SEED_A)
  digests.push(shuffled.entropy.digest)
  const cut = applyCut(shuffled.deck, 0.4, shuffled.entropy)
  digests.push(cut.entropy.digest)
  check('每一次用户操作都改变 entropy.digest', new Set(digests).size === digests.length, digests.join(' → '))

  check('shuffleCount 被真实累加', shuffled.entropy.shuffleCount === 1)
  check('dragDistance 被真实累加', shuffled.entropy.dragDistance > 0, shuffled.entropy.dragDistance.toFixed(1))
  check('dragDirectionSum 记录了方向', shuffled.entropy.dragDirectionSum !== 0)
  check('cutPositions 记录了切点', cut.entropy.cutPositions.length === 1)

  // timings 环形缓冲 —— 防止 localStorage 膨胀
  let big = createEntropy()
  for (let i = 0; i < 500; i += 1) big = recordDrag(big, { dx: i % 7, dy: 3, dt: 8 + (i % 20) })
  check('timings 只保留最近 32 个（localStorage 不膨胀）', big.timings.length === 32, `实际 ${big.timings.length}`)
  check('整个 entropy 序列化后体积可控', JSON.stringify(big).length < 400, `${JSON.stringify(big).length} bytes`)

  // 关键：entropy 不同 → 牌序不同（若 entropy 是装饰，这一条必挂）
  const base = buildHiddenDeck(SEED_A, CARD_IDS)
  let e1 = createEntropy()
  let e2 = createEntropy()
  e1 = recordDrag(e1, { dx: 10, dy: 10, dt: 16 })
  e2 = recordDrag(e2, { dx: 11, dy: 10, dt: 16 })
  const r1 = applyShuffleGesture(base, e1, G.riffleShort, SEED_A)
  const r2 = applyShuffleGesture(base, e2, G.riffleShort, SEED_A)
  check(
    '仅 entropy 历史相差 1px → 同一手势得到不同牌序（entropy 实质参与置换）',
    deckFingerprint(r1.deck) !== deckFingerprint(r2.deck),
  )

  // 同一手势在不同 seed 下也必须不同（systemRandom 也在参与）
  const s1 = applyShuffleGesture(buildHiddenDeck(SEED_A, CARD_IDS), e0, G.riffleShort, SEED_A)
  const s2 = applyShuffleGesture(buildHiddenDeck(SEED_A, CARD_IDS), e0, G.riffleShort, SEED_B)
  check('相同牌组 + 相同手势 + 不同 seed → 不同牌序（systemRandom 也在参与）', deckFingerprint(s1.deck) !== deckFingerprint(s2.deck))
}

/* ================================================================== 7. 摊牌布局 */

section('7. 摊牌布局 —— AC-15 / G-20（375×667 移动端）')
{
  const input = {
    count: 78,
    containerWidth: 375,
    containerHeight: 320,
    scrollOffset: 0,
    cardWidth: 92,
    cardHeight: 156,
  }
  const metrics = computeFanMetrics(input)
  const layouts = computeFanLayout(input)

  check('78 张全部有布局', layouts.length === 78)
  check(
    `每张牌露出宽度 ≥ ${MIN_EXPOSURE}px（手指点得中）`,
    layouts.every((l) => l.exposure >= MIN_EXPOSURE),
    `最小 ${Math.min(...layouts.map((l) => l.exposure)).toFixed(1)}px`,
  )
  check(
    '扇形总宽 > 屏宽，可横向滚动浏览整副牌',
    metrics.contentWidth > input.containerWidth,
    `contentWidth ${metrics.contentWidth.toFixed(0)}px / maxScroll ${metrics.maxScrollOffset.toFixed(0)}px`,
  )
  check('中心附近的牌被上浮放大（提示可选）', layouts.some((l) => l.focused && l.scale > 1))
  check('远离中心的牌不放大', layouts.filter((l) => !l.focused).every((l) => l.scale === 1))
  check(
    '呈弧形：边缘牌比中心牌低且有倾角',
    Math.abs(layouts[0].rotate) > 5 && layouts[0].y > Math.min(...layouts.map((l) => l.y)),
    `首张 rotate ${layouts[0].rotate.toFixed(1)}° y ${layouts[0].y.toFixed(1)}`,
  )

  // 命中判定：重叠区取最上层
  let hitOk = true
  let hitCount = 0
  for (const l of layouts) {
    // 每张牌左侧 exposure 区域的中点，应当命中它自己
    const px = l.x + Math.min(l.exposure, l.width) / 2
    const py = l.y + l.height / 2
    const hit = hitTestFan(layouts, px, py)
    if (hit === null) continue
    hitCount += 1
    if (hit !== l.index && layouts[hit].zIndex <= l.zIndex) hitOk = false
  }
  check('hitTestFan 在重叠区始终返回 zIndex 最高的那张', hitOk, `采样 ${hitCount} 点`)
  check('点在扇形之外返回 null', hitTestFan(layouts, -500, -500) === null)

  // 滚动后仍可覆盖到最后一张
  const scrolled = computeFanLayout({ ...input, scrollOffset: metrics.maxScrollOffset })
  const last = scrolled[scrolled.length - 1]
  check(
    '滚到底时最后一张完整可见（不会有选不到的牌）',
    last.x >= 0 && last.x + last.width <= input.containerWidth + 1,
    `x ${last.x.toFixed(1)} .. ${(last.x + last.width).toFixed(1)}`,
  )

  const off = scrollOffsetForIndex(input, 40)
  const centered = computeFanLayout({ ...input, scrollOffset: off })
  const c = centered[40]
  check(
    'scrollOffsetForIndex 能把指定牌居中（会话恢复/引导定位）',
    Math.abs(c.x + c.width / 2 - input.containerWidth / 2) < 1,
  )

  // 小牌阵（少量牌）也不能算崩
  const few = computeFanLayout({ ...input, count: 3 })
  check('count=3 时布局依然有效且互相重叠', few.length === 3 && few[1].x - few[0].x <= input.cardWidth)
  check('count=0 返回空数组', computeFanLayout({ ...input, count: 0 }).length === 0)
}

/* ================================================================== 8. 端到端 */

section('8. 端到端 —— 模拟一次完整 Session（A8 → A12）并验证会话恢复')
{
  const seed = createSeed()
  const gestures: ShuffleGesture[] = [
    { dx: 8, dy: 140, durationMs: 300, startRatio: 0.44, endRatio: 0.8 },
    { dx: -210, dy: 18, durationMs: 240, startRatio: 0.5, endRatio: 0.3 },
    { dx: 3, dy: 220, durationMs: 410, startRatio: 0.62, endRatio: 0.95 },
  ]
  const live = runSequence(seed, gestures, 0.28)
  const picks = [12, 41, 66]
  const drawn = picks.map((i) => cardAt(live.deck, i))

  // 模拟：写入 localStorage → 刷新 → 读回（JSON 往返）
  const persisted = JSON.parse(JSON.stringify({ seed, deck: live.deck, entropy: live.entropy })) as {
    seed: string
    deck: DeckEntry[]
    entropy: InteractionEntropy
  }
  const restoredDrawn = picks.map((i) => cardAt(persisted.deck, i))
  check(
    'G-22 会话恢复后牌序与已抽牌完全不变',
    deckFingerprint(persisted.deck) === deckFingerprint(live.deck) &&
      restoredDrawn.every((e, k) => e.cardId === drawn[k].cardId && e.orientation === drawn[k].orientation),
    drawn.map((e) => `${e.cardId}${e.orientation === 'reversed' ? '(逆)' : '(正)'}`).join(' '),
  )
  check('恢复后 entropy digest 不变', persisted.entropy.digest === live.entropy.digest)

  // 重放同样的操作序列必须复现同一副牌 —— 这是「牌早已存在」的最强证据
  const replay = runSequence(seed, gestures, 0.28)
  check('用同样的 seed 与操作序列重放 → 得到一模一样的牌', deckFingerprint(replay.deck) === deckFingerprint(live.deck))

  // 不同用户操作 → 不同结局（「这是我自己抽出来的牌」的技术依据）
  const otherHand = runSequence(seed, gestures, 0.29)
  const otherGesture = runSequence(seed, [gestures[0], gestures[1], { ...gestures[2], dy: 221 }], 0.28)
  check('同 seed，仅切点差 0.01 → 抽到的牌不同', deckFingerprint(otherHand.deck) !== deckFingerprint(live.deck))
  check('同 seed，仅最后一次手势差 1px → 抽到的牌不同', deckFingerprint(otherGesture.deck) !== deckFingerprint(live.deck))
}

/* ================================================================== 报告 */

console.log(`\n${'─'.repeat(64)}`)
if (failed === 0) {
  console.log(`\x1b[32m全部通过\x1b[0m  ${passed} 项断言，0 失败`)
  console.log('AC-01 / AC-02 / AC-03 与 G-01 / G-02 / G-21 / G-22 在引擎层成立。')
} else {
  console.log(`\x1b[31m失败 ${failed} 项\x1b[0m（通过 ${passed} 项）`)
  for (const f of failures) console.log(`  - ${f}`)
}
console.log(`${'─'.repeat(64)}\n`)

process.exit(failed === 0 ? 0 : 1)
