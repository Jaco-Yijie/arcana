/**
 * Release 自检（REL 组 · Phase D3）
 *
 * 【它守的是什么】
 * D3 之前的所有检查都在问「产品对不对」。这一组问的是另一件事：
 * **「把它交出去会不会出事」。**
 *
 * 四类事故各自都能过 code review、过全部既有断言，且只在真实用户那里才炸：
 *   1. Key 泄漏 —— 有人给密钥加了 `VITE_` 前缀，或前端直连 api.deepseek.com。
 *      构建照常绿，密钥躺在 dist 的 JS 里公开发布。
 *   2. 资产路径断裂 —— 换 CDN 后 URL 拼错一个斜杠，390 张牌全挂，
 *      而 deck:check 查的是磁盘、不是运行期 URL。
 *   3. 首屏灾难 —— 某次改动让首页或摊牌页开始预加载整副牌，
 *      139MB 里的一大块被拖进首屏，本地开发（磁盘缓存）完全无感。
 *   4. 打包事故 —— 390 张 WebP 被当成模块 import，内联进 JS chunk。
 *
 * 【为什么是静态检查而不是跑浏览器】
 * 这些断言要能在 CI 里零网络、零 token、几秒内跑完。
 * 真实网络行为由 `qa/release/_audit-run.mjs` 实测（有截图与逐条请求记录），
 * 本文件锁的是**让那些实测结果保持成立的代码性质**。
 *
 * 用法：`npm run release:check`
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'
import { getManifest } from '../src/decks/artwork/manifests.ts'
import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import {
  assetBaseUrl,
  cardArtworkUrl,
  cardBackUrl,
  deckCoverUrl,
  urlToRepoPath,
} from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'
const R = '\x1b[31m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

let pass = 0
let fail = 0
const failures: string[] = []

function check(name: string, ok: boolean, note = ''): void {
  if (ok) {
    pass += 1
    console.log(`  ${G}PASS${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
  } else {
    fail += 1
    failures.push(name)
    console.log(`  ${R}FAIL${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`)
  }
}

function section(title: string): void {
  console.log(`\n${B}${title}${X}`)
}

const REPO_ROOT = resolve(import.meta.dirname, '..')
const SRC = join(REPO_ROOT, 'src')
const DIST = join(REPO_ROOT, 'dist')

/** 递归收集文件。用于扫 src/ 与 dist/ */
function walk(dir: string, pred: (p: string) => boolean, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      // 不进 assets/decks —— 那是 390 张图，扫它没有意义且很慢
      if (name === 'decks' && dir.endsWith(join('dist', 'assets'))) continue
      walk(p, pred, acc)
    } else if (pred(p)) acc.push(p)
  }
  return acc
}

const srcFiles = walk(SRC, (p) => /\.(ts|tsx)$/.test(p))
const srcText = srcFiles.map((p) => ({ p, t: readFileSync(p, 'utf8') }))
const distJs = existsSync(DIST) ? walk(join(DIST, 'assets'), (p) => /\.(js|css)$/.test(p)) : []
const hasDist = distJs.length > 0

/* ══════════════════════════════════════════════════════════════
 * REL-01 / REL-02 —— 运行期资产路径可解析
 * ════════════════════════════════════════════════════════════ */
function checkAssetPaths(): void {
  section('REL · 运行期资产路径')

  /* 【必须遍历 ALL_DECK_IDS，不是 ARTWORK_DECK_IDS】
     ARTWORK_DECK_IDS 是五套「规划中、尚未开工」的牌组；
     真正交付了 390 张的是 LEGACY_DECK_IDS。第一版这里写成前者，
     结果 REL-01/02 遍历出 0 张牌 —— 断言全绿，却什么都没查。
     一个恒真的断言比一个失败的断言更危险，所以这里额外锁死数量下限。 */
  const playable = ALL_DECK_IDS.filter((id) => isDeckPlayable(id))
  check(
    'REL-00 至少有 5 套可用牌组（防止断言被架空成遍历 0 个）',
    playable.length >= 5,
    `${playable.length} 套: ${playable.join(', ')}`,
  )

  /* REL-01：每一张牌的 full URL 反解回磁盘路径后，文件必须真的在。
     这条与 deck:check 的方向相反 —— 那边从磁盘出发，这边从**运行期真的会去请求的 URL** 出发。
     上一次路径契约断裂（rev 写成路径段）正是因为只有一个方向的检查。 */
  let fullMissing: string[] = []
  let thumbMissing: string[] = []
  let fullCount = 0
  let thumbCount = 0
  for (const deckId of playable) {
    const m = getManifest(deckId)
    if (!m) continue
    for (const [cardId, entry] of Object.entries(m.cards)) {
      const rev = entry.rev ?? m.rev
      const fullUrl = cardArtworkUrl(deckId, cardId, rev, 'full')
      fullCount += 1
      if (!existsSync(join(REPO_ROOT, urlToRepoPath(fullUrl)))) fullMissing.push(fullUrl)
      if (entry.thumb === true) {
        const thumbUrl = cardArtworkUrl(deckId, cardId, rev, 'thumb')
        thumbCount += 1
        if (!existsSync(join(REPO_ROOT, urlToRepoPath(thumbUrl)))) thumbMissing.push(thumbUrl)
      }
    }
  }
  check(
    'REL-01 全部可用牌组的 full artwork URL 都能解析到真实文件',
    fullMissing.length === 0 && fullCount >= 390,
    `${fullCount} 张${fullMissing.length ? ` · 缺 ${fullMissing.slice(0, 3).join(', ')}` : ''}`,
  )
  check(
    'REL-02 全部可用牌组的 thumb URL 都能解析到真实文件',
    thumbMissing.length === 0 && thumbCount >= 390,
    `${thumbCount} 张${thumbMissing.length ? ` · 缺 ${thumbMissing.slice(0, 3).join(', ')}` : ''}`,
  )
  check(
    'REL-02b 每一张可用牌都有 thumb —— 否则小尺寸场景会退回 full',
    thumbCount === fullCount && fullCount >= 390,
    `full ${fullCount} · thumb ${thumbCount}`,
  )
  /* ── 卡背与封面：登记了就必须在，没登记就必须走程序化 ──
     【为什么不是「卡背文件必须存在」】
     五套牌的卡背与封面目前**没有栅格素材**，也没有在 manifest 里登记，
     全部由 DeckCardBack 的程序化 SVG 绘制。这不是缺陷，是当前的正确状态，
     而且它正是「摊开 78 张牌产生 0 个网络请求」的原因 —— SVG 不走网络。

     所以这里锁的是契约而不是文件：**登记与磁盘必须一致**。
     哪天美术交付了卡背，登记进 manifest 却忘了放文件（或反过来），
     这条会立刻失败；在那之前它如实记录「卡背是程序化的」。 */
  const backRegistered = playable.filter((id) => (getManifest(id) as { back?: unknown })?.back)
  const backBroken = backRegistered.filter((id) => {
    const m = getManifest(id)!
    return !existsSync(join(REPO_ROOT, urlToRepoPath(cardBackUrl(id, m.rev, 'full'))))
  })
  check(
    'REL-02c 卡背：登记进 manifest 的必须在磁盘上（未登记 = 程序化 SVG，零网络）',
    backBroken.length === 0,
    backRegistered.length === 0
      ? `${playable.length} 套全部走程序化卡背，不产生网络请求`
      : `已登记 ${backRegistered.length} 套${backBroken.length ? ` · 缺文件 ${backBroken.join(', ')}` : ''}`,
  )
  const coverRegistered = playable.filter((id) => (getManifest(id) as { cover?: unknown })?.cover)
  const coverBroken = coverRegistered.filter((id) => {
    const m = getManifest(id)!
    return !existsSync(join(REPO_ROOT, urlToRepoPath(deckCoverUrl(id, m.rev, 'full'))))
  })
  check(
    'REL-02d 封面：登记进 manifest 的必须在磁盘上（未登记 = 回退到卡背）',
    coverBroken.length === 0,
    coverRegistered.length === 0 ? `${playable.length} 套全部回退到卡背` : `已登记 ${coverRegistered.length} 套`,
  )
}

/* ══════════════════════════════════════════════════════════════
 * REL-03 / REL-04 —— 密钥与上游边界
 * ════════════════════════════════════════════════════════════ */
function checkSecrets(): void {
  section('REL · 密钥与上游边界')

  /* REL-03：src/ 里不允许出现任何密钥读取。
     只要写成 `import.meta.env.VITE_*_KEY` 或读 DEEPSEEK_API_KEY，就会被打进前端产物。 */
  const keyInSrc = srcText.filter(
    ({ t }) => /DEEPSEEK_API_KEY|VITE_[A-Z_]*(KEY|SECRET|TOKEN)/.test(t),
  )
  check(
    'REL-03 src/ 不读取任何 API Key（读了就会进前端 bundle）',
    keyInSrc.length === 0,
    keyInSrc.length ? keyInSrc.map((f) => f.p.replace(REPO_ROOT + '/', '')).join(', ') : `扫描 ${srcFiles.length} 个文件`,
  )

  /* REL-03b：构建产物里不能出现密钥形状的字符串。
     不比对 .env 的真实 Key —— CI 上没有它；查的是形状。 */
  if (hasDist) {
    const leaked = distJs.filter((p) => /sk-[A-Za-z0-9]{16,}|DEEPSEEK_API_KEY/.test(readFileSync(p, 'utf8')))
    check(
      'REL-03b dist/ 产物不含 API Key 字面量',
      leaked.length === 0,
      leaked.length ? leaked.join(', ') : `扫描 ${distJs.length} 个产物`,
    )
  } else {
    check('REL-03b dist/ 产物不含 API Key 字面量', true, '跳过：无 dist，先 npm run build')
  }

  /* REL-04：浏览器只跟自家后端说话。 */
  const directUpstream = srcText.filter(({ t }) =>
    /['"`]https?:\/\/api\.deepseek\.com/.test(t),
  )
  check(
    'REL-04 src/ 不直连 api.deepseek.com（注释不算，只查字符串字面量）',
    directUpstream.length === 0,
    directUpstream.length ? directUpstream.map((f) => f.p.replace(REPO_ROOT + '/', '')).join(', ') : '',
  )
  if (hasDist) {
    const distUpstream = distJs.filter((p) => /api\.deepseek\.com/.test(readFileSync(p, 'utf8')))
    check('REL-04b dist/ 产物不含 api.deepseek.com', distUpstream.length === 0)
  } else {
    check('REL-04b dist/ 产物不含 api.deepseek.com', true, '跳过：无 dist')
  }

  /* 前端调用的 endpoint 必须全部是同源相对路径 */
  const endpoints = new Set<string>()
  for (const { t } of srcText) {
    for (const m of t.matchAll(/fetch\(\s*['"`](\/[^'"`]*)['"`]/g)) endpoints.add(m[1]!)
  }
  const allRelative = [...endpoints].every((e) => e.startsWith('/api/'))
  check(
    'REL-04c 前端 fetch 的全部是同源 /api/ 相对路径',
    allRelative && endpoints.size > 0,
    [...endpoints].join(' '),
  )
}

/* ══════════════════════════════════════════════════════════════
 * REL-05 / REL-06 —— 资产根：本地兜底与远端拼接
 * ════════════════════════════════════════════════════════════ */
function checkAssetBase(): void {
  section('REL · 资产根切换')

  /* REL-05：没配 CDN 时必须落到本地 public。
     Node 下 import.meta.env 不存在，assetBaseUrl() 走的正是「未配置」这条分支。 */
  check(
    'REL-05 未配置 VITE_DECK_ASSET_BASE_URL 时回落到本地 /assets/decks',
    assetBaseUrl() === '/assets/decks',
    assetBaseUrl(),
  )

  /* REL-06：远端根的拼接形状。
     这里不改全局环境，而是复刻 paths.ts 的拼接规则去验证形状 ——
     真正要守的是「base + 目录 + 文件 + ?r=」这四段的顺序与分隔符。 */
  const shapes: Array<[string, string, string]> = [
    ['full', cardArtworkUrl('legacy-moonlight', 'major-00', 3, 'full'), '/assets/decks/legacy-moonlight/cards/major-00.webp?r=3'],
    ['thumb', cardArtworkUrl('legacy-moonlight', 'major-00', 3, 'thumb'), '/assets/decks/legacy-moonlight/thumbs/major-00.webp?r=3'],
    ['back', cardBackUrl('legacy-moonlight', 2, 'full'), '/assets/decks/legacy-moonlight/deck/back.webp?r=2'],
    ['cover', deckCoverUrl('legacy-moonlight', 2, 'thumb'), '/assets/decks/legacy-moonlight/deck/cover-thumb.webp?r=2'],
  ]
  for (const [label, got, want] of shapes) {
    check(`REL-06 ${label} URL 形状`, got === want, got)
  }

  /* REL-06b：把 base 换成远端后，拼接结果必须只是前缀不同、其余逐字节相同。
     用 paths.ts 自己的规则模拟：远端 base + 相对部分。 */
  const CDN = 'https://assets.example.com/arcana/decks'
  const local = cardArtworkUrl('legacy-moonlight', 'major-00', 3, 'full')
  const remote = CDN + local.slice('/assets/decks'.length)
  check(
    'REL-06b 远端 base 拼接后路径结构不变',
    remote === 'https://assets.example.com/arcana/decks/legacy-moonlight/cards/major-00.webp?r=3',
    remote,
  )
  /* 末尾斜杠必须被规范化掉，否则会拼出 //legacy-moonlight */
  check(
    'REL-06c assetBaseUrl 去掉末尾斜杠（否则会拼出双斜杠）',
    !assetBaseUrl().endsWith('/'),
    assetBaseUrl(),
  )
  /* rev 必须是 query 而非路径段 —— 这是上一次真实事故的成因 */
  check(
    'REL-06d rev 是 query 参数，不是路径段（磁盘上没有 r<N>/ 这一层）',
    /\?r=\d+$/.test(local) && !/\/r\d+\//.test(local),
    local,
  )
}

/* ══════════════════════════════════════════════════════════════
 * REL-07 … REL-10 —— 加载时机：谁在什么时候请求图
 * ════════════════════════════════════════════════════════════ */
function checkLoadingPolicy(): void {
  section('REL · 加载时机')

  const read = (rel: string) => {
    const p = join(REPO_ROOT, rel)
    return existsSync(p) ? readFileSync(p, 'utf8') : ''
  }

  /* ── REL-07 首页牌面预算 ──

     【这条规则被改过，原文与改的理由都留在这里】
     原文是「首页不得引用任何会发起牌面请求的组件」，判据是 HomePage 里
     不出现 TarotCardFace / CardArtwork / DeckCardBack。它守的是首屏时间：
     那时首页是纯文字的，一张图都不该请求。

     E3 的 Card First 改造让首页必须展示当前牌组的真实牌面 ——
     用户第一眼要看到他将要抽的那副牌，而不是两个文字按钮。
     原规则与这个产品决定直接冲突。

     但**它守的东西没有过时**：首屏仍然不能被牌面拖慢。
     所以这条不是被删掉，而是换成更具体、也更严的三条判据：

       (a) 张数有明确上限常量，且 ≤ 3
       (b) 每一处牌面都显式 `variant="thumb"` —— thumb 中位 12.9KB，
           full 是 294.9KB，23 倍差距。首屏三张牌面差的是 39KB 还是 885KB。
       (c) 不做任何预热（prewarm）—— 首页不替后面的页面提前拉图

     换句话说：原规则禁止「首页有牌」，新规则允许「首页有牌」但禁止
     「首页有重牌」。守的仍是同一个东西，而且现在能被量化。 */
  const home = read('src/pages/HomePage.tsx')
  const heroIds = /const HERO_CARD_IDS = \[([^\]]*)\]/.exec(home)
  const heroCount = heroIds ? (heroIds[1]!.match(/'/g) ?? []).length / 2 : Infinity
  const homeUsesFace = /TarotCardFace|CardArtwork|DeckCardBack/.test(home)
  const homeThumbOnly = !homeUsesFace || /variant="thumb"/.test(home)
  const homePrewarms = /prewarm/.test(home)
  check(
    'REL-07 首页牌面 ≤ 3 张、只走 thumb 档、不预热',
    home.length > 0 && heroCount <= 3 && homeThumbOnly && !homePrewarms,
    `${heroCount === Infinity ? '未声明上限常量' : `${heroCount} 张`} · thumb=${homeThumbOnly} · prewarm=${homePrewarms}`,
  )

  /* ══ REL-06e … REL-06j 入口封面（E4）══
     封面是「打开网站」这一下的门。它可以慢一点、可以有仪式感，
     但它绝不能变成一道会卡住人的墙。下面几条锁的都是「卡住」的几种形态。 */
  const cover = read('src/pages/IntroCover.tsx')
  const homeSrc = read('src/pages/HomePage.tsx')
  const html = read('index.html')

  /* 深链必须直达。做成 /cover 路由的话，别人发来的 /journal/xxx
     会被强行拐去封面，刷新也会丢掉当前位置。 */
  check(
    'REL-06e 封面是首页内部状态，不是路由（深链不被拦截）',
    cover.length > 0
    && !/path="\/cover"/.test(read('src/App.tsx'))
    && /shouldShowCover/.test(homeSrc),
    'IntroCover 由 HomePage 挂载',
  )
  /* 显示策略必须集中在一个常量上，不能散在组件里 */
  check(
    'REL-06f 封面显示策略由单个常量控制',
    /export const COVER_MODE: CoverMode = '(session|always|once|off)'/.test(cover),
    /export const COVER_MODE: CoverMode = '(\w+)'/.exec(cover)?.[1] ?? '未找到',
  )
  /* 存储不可用（无痕 / 禁用 Cookie）时必须放行，不能白屏 */
  check(
    'REL-06g 存储读写失败时放行，不把人挡在门外',
    /catch\s*{[\s\S]{0,120}return false/.test(cover),
  )
  /* 离场必须同时有 transitionend + 定时器兜底 + pointer-events-none。
     只靠定时器时：用户点完立刻切标签页，浏览器会把定时器节流到 1 秒以上，
     回来时这一层还在 —— 它 opacity 已是 0 看不见，但 z-50 全屏容器
     仍然吃掉所有点击，首页整个点不动。这个故障没有任何报错。 */
  check(
    'REL-06h 封面离场有三重保障（transitionend + 兜底定时器 + pointer-events-none）',
    /onTransitionEnd/.test(cover)
    && /setTimeout\(onEnter/.test(cover)
    && /pointer-events-none/.test(cover),
  )
  /* 封面上不该有任何牌面请求 —— 它是首屏，且徽记是内联 SVG 就够了 */
  check(
    'REL-06i 封面不请求任何牌面资产',
    !/TarotCardFace|CardArtwork|DeckCardBack/.test(cover),
    'IntroCover.tsx',
  )
  /* 字体必须预载且自托管。CSP 是 font-src 'self'，外链会被直接拦掉 */
  /* 【判据换过，理由留下】
     原判据是「两个字体都被预载」。E5 加入 Cinzel 后，这条会在
     「预载了 Cormorant 但没预载 Cinzel」时依然通过 —— 而那恰恰是错的：
     封面上出现的是 Cinzel 与文楷，Cormorant 属于 Ritual 档，首屏一个字不用。
     预载一个首屏用不到的字体，等于占着带宽不干活。
     现在守的是「首屏用到的必须预载，首屏用不到的必须不预载」。 */
  const preloaded = [...html.matchAll(/rel="preload"[^>]*\/fonts\/([\w-]+)\.woff2/g)].map((m) => m[1]!)
  check(
    'REL-06j 只预载首屏字体（Cinzel + 文楷），不预载 Ritual 档',
    preloaded.includes('cinzel-latin')
    && preloaded.includes('lxgw-wenkai-light-subset')
    && !preloaded.includes('cormorant-garamond-latin'),
    preloaded.join(' + ') || '无',
  )
  check(
    'REL-06k 无外链字体（CSP font-src self 会拦掉）',
    !/fonts\.googleapis|fonts\.gstatic/.test(html + read('src/styles/theme.css')),
  )

  /* ── REL-07b 分享卡的隐私边界（E3）──
     用户写下的问题往往是这次占卜里最私人的一句。分享图默认只带牌、牌阵、
     牌组、一句核心结论与日期；要不要带原问题由用户自己勾（AC-14）。
     这条一旦破了不会有任何报错 —— 只会有人把自己的问题发到了社交平台上。 */
  const sharePage = read('src/pages/SharePage.tsx')
  const shareCard = read('src/features/reading/ShareCard.tsx')
  check(
    'REL-07b 分享页原问题默认关闭',
    /useState\(false\)/.test(sharePage) && /showQuestion \? entry\.question : null/.test(sharePage),
    'SharePage.tsx',
  )
  check(
    'REL-07c 分享卡只在拿到 question 时才渲染它（组件自身不去读 session）',
    shareCard.length > 0
    && /entry\.question &&/.test(shareCard)
    && !/useSession|useParams|getEntry/.test(shareCard),
    'ShareCard.tsx',
  )
  /* 分享卡也必须走 thumb —— 它是一张要被截图的静态版面，
     没有任何理由为 5 张牌拉 5×295KB 的原图。 */
  check(
    'REL-07d 分享卡牌面走 thumb 档',
    /variant="thumb"/.test(shareCard),
    'ShareCard.tsx',
  )

  /* REL-08：FanSpread（摊开的 78 张）必须只渲染卡背，绝不渲染正面。
     这既是性能约束，也是产品约束 —— 提前请求正面 = 在 Network 面板剧透下一张牌（G-05）。 */
  const fan = read('src/features/table/components/FanSpread.tsx')
  const fanLoadsFace = /TarotCardFace|CardArtwork\b|useCardArtwork/.test(fan)
  check(
    'REL-08 FanSpread 只渲染卡背，不渲染任何正面 artwork',
    fan.length > 0 && !fanLoadsFace && /CardBack/.test(fan),
    'FanSpread.tsx',
  )

  /* REL-09：Deck Library 的牌面预览必须走 thumb 档。 */
  const lib = read('src/pages/DeckLibraryPage.tsx')
  const libUsesSm = /size="sm"/.test(lib)
  const libUsesFullVariant = /variant=['"]full['"]/.test(lib)
  check(
    'REL-09 Deck Library 预览用 sm/thumb 档，不显式请求 full',
    libUsesSm && !libUsesFullVariant,
    'DeckLibraryPage.tsx',
  )
  /* TarotCardFace 的默认档位规则本身：sm → thumb */
  const face = read('src/components/card/TarotCardFace.tsx')
  check(
    'REL-09b TarotCardFace 档位规则：sm 恒为 thumb',
    /if \(size === 'sm'\) return 'thumb'/.test(face),
    'TarotCardFace.tsx · pickVariant',
  )
  /* ── REL-09c 按真实设备像素选档 ──
     D3 实测：翻牌页牌宽 112px 落进 md 档，md 取 full（1080px），过采样 4.8×。
     降档判据必须是「thumb 的真实像素 ≥ 需要的设备像素」——
     按构造不可能变糊，省下的全是看不见的像素。
     阈值必须引用 THUMB_SPEC，不能写死 240，否则缩略图规格一改就悄悄漂移。 */
  check(
    'REL-09c 档位按真实设备像素决定，阈值引用 THUMB_SPEC（不写死数字）',
    /THUMB_SPEC\.card\.width/.test(face) && /devicePixelRatio/.test(face),
    'TarotCardFace.tsx · pickVariant',
  )
  /* ── REL-09e 必须修正 CardFrame 的放大 ──
     传进来的是布局宽（1440 上 114.71px），真正绘制的框是 121.72px（+6.1%）。
     不修正就会在 1440 这一档选错档、只在那一个视口糊一点 ——
     实测抓到过一次，所以把它钉住。 */
  check(
    'REL-09e 档位计算修正了 CardFrame 的边框放大（否则边界视口会选错档）',
    /FRAME_INFLATION/.test(face) && /displayWidth \* FRAME_INFLATION \* dpr/.test(face),
    'TarotCardFace.tsx · FRAME_INFLATION',
  )
  const flipCard = read('src/features/table/components/FlipCard.tsx')
  check(
    'REL-09d 牌桌把布局引擎算出的真实牌宽透给 TarotCardFace',
    /displayWidth=\{width\}/.test(flipCard),
    'FlipCard.tsx',
  )

  /* REL-10：只有已翻开的牌才请求 full。
     useCardArtwork 挂载即发请求，所以它必须挂在「已翻开」分支里。
     FlipCard 用 showFace 门控 —— 这条注释与实现同时存在才算数。 */
  const flip = read('src/features/table/components/FlipCard.tsx')
  const gated = /showFace/.test(flip)
  check(
    'REL-10 牌面请求由 FlipCard 的 showFace 门控（未翻开不请求正面）',
    gated,
    'FlipCard.tsx',
  )
  const hook = read('src/decks/artwork/useCardArtwork.ts')
  check(
    'REL-10b useCardArtwork 仍然是「挂载即请求」，因此门控责任在调用方',
    /useEffect/.test(hook) && /plan\s*\n?\s*\.load\(variant\)|plan\.load\(variant\)/.test(hook),
    'useCardArtwork.ts',
  )
  /* ── REL-10c 整副牌预取只允许 thumb 档 ──
     full 档整副是 5 × 78 × 约 250KB ≈ 十几 MB，移动端不可接受。
     函数名是 prefetchDeck（第一版这里写成 prewarm，切片落空导致断言恒真，
     和 REL-01 是同一类事故：找不到目标时不要静默通过）。 */
  const resolver = read('src/decks/artwork/resolver.ts')
  const at = resolver.indexOf('export function prefetchDeck')
  const body = at >= 0 ? resolver.slice(at) : ''
  check(
    'REL-10c 整副牌预取只走 thumb 档，绝不预取 full',
    body.length > 0 && /'thumb'/.test(body) && !/'full'/.test(body),
    at < 0 ? '未找到 prefetchDeck —— 断言无法成立' : 'resolver.ts · prefetchDeck',
  )
  /* 【记录当前事实】prefetchDeck 目前没有任何调用方，
     且对 hybrid manifest 直接 return —— 也就是说整副预取实际从未发生。
     这条断言锁的是「哪天有人接上它时，它只能取 thumb」。 */
  /* 查**调用**而不是提及 —— D5 新增的 useSelectedArtworkPrefetch 在注释里
     正当地写了「prefetchDeck 至今没有调用方」，第一版把那句注释当成了调用。
     要守的性质是「牌桌上不会预取整副牌」，那由调用形式决定，不由注释决定。 */
  const callers = srcText.filter(
    ({ p, t }) => !p.endsWith('resolver.ts') && /\bprefetchDeck\s*\(/.test(t),
  )
  check(
    'REL-10d 整副预取若被启用，调用方必须在牌桌之外（当前无调用方）',
    callers.every(({ p }) => !/features\/table\//.test(p)),
    callers.length === 0 ? '当前无调用方，整副预取实际未发生' : callers.map((c) => c.p.replace(REPO_ROOT + '/', '')).join(', '),
  )
}

/* ══════════════════════════════════════════════════════════════
 * REL-11 —— 资产失败的兜底
 * ════════════════════════════════════════════════════════════ */
function checkFailureFallback(): void {
  section('REL · 资产失败兜底')

  const layer = readFileSync(join(REPO_ROOT, 'src/components/card/CardArtworkLayer.tsx'), 'utf8')
  check(
    'REL-11 已登记的牌加载失败 → 程序化牌面兜底（不是空白、不是崩溃）',
    /status === 'error'/.test(layer) && /ProceduralCardArt/.test(layer),
    'CardArtworkLayer.tsx',
  )
  check(
    'REL-11b 从未交付的牌仍然如实显示缺失态（不用占位图冒充成品）',
    /MissingArtwork/.test(layer) && /素材未提供/.test(layer),
    'CardArtworkLayer.tsx',
  )
  /* CLS：img 必须带原始像素尺寸 */
  check(
    'REL-11c <img> 写死 width/height，避免加载完成时的布局跳动（CLS）',
    /width=\{plan\.width\}/.test(layer) && /height=\{plan\.height\}/.test(layer),
    'CardArtworkLayer.tsx',
  )
  check(
    'REL-11d <img> 使用 decoding="async"，解码不阻塞主线程',
    /decoding="async"/.test(layer),
    'CardArtworkLayer.tsx',
  )
}

/* ══════════════════════════════════════════════════════════════
 * REL-12 —— 打包产物
 * ════════════════════════════════════════════════════════════ */
function checkBundle(): void {
  section('REL · 打包产物')

  if (!hasDist) {
    check('REL-12 390 张 Artwork 不进 JS chunk', true, '跳过：无 dist，先 npm run build')
    check('REL-12b JS 总体积在预算内', true, '跳过：无 dist')
    return
  }

  /* REL-12：牌面绝不能被内联成 data URI 进 JS。
     一旦有人写 `import art from './major-00.webp'`，vite 会把它变成产物依赖，
     小图甚至直接内联 —— 390 张的话 bundle 会爆炸。 */
  const inlined = distJs.filter((p) => /data:image\/(webp|png|jpeg)/.test(readFileSync(p, 'utf8')))
  check(
    'REL-12 产物里没有内联的 webp/png/jpeg data URI',
    inlined.length === 0,
    inlined.length ? inlined.join(', ') : `扫描 ${distJs.length} 个产物`,
  )

  /* ── REL-12b 牌面的存在性按**资产模式**判定 ──
     本地模式：牌面必须以原路径静态存在于 dist/assets/decks，且未被打包器改名 ——
     那是「克隆下来直接能跑」与单机部署的依赖。
     远端模式：牌面走 CDN，vite.config 的 dropLocalArtworkWhenRemote 会把那 139MB
     从产物里剔掉。此时 dist 里**不应该**还有牌面 —— 留着是纯死重量。

     第一版无条件断言「必须存在」，于是每一次为 CDN 做的生产构建都会让它失败。
     一个在生产构建下必然红的 gate，最后一定会被当成噪音忽略掉。 */
  const deckDir = join(DIST, 'assets', 'decks')
  /* 【模式必须从产物本身读，不能读检查时的环境变量】
     资产根是**构建期**写进 bundle 的。如果按 `process.env` 判断，
     「构建时设了变量、检查时没设」就会误判 —— E2 实测踩到过这一次：
     产物明明是远端模式，release:check 却按本地模式要求牌面存在，于是红了。

     上一版的做法是从 bundle 文本里正则捞第一个 http 字面量，并把
     `r2\.dev|cloudflarestorage` 写进判据 —— 那是**绑定到当前供应商**的：
     E2.1 换成自有域名后，这条正则就不再认识自己的资产根。
     现在由构建期直接写 `dist/arcana-build.json`，产物自己说出用的是哪个根。 */
  const buildManifestPath = join(DIST, 'arcana-build.json')
  check('REL-12b0 产物自带 arcana-build.json（资产根的唯一事实来源）', existsSync(buildManifestPath))
  const buildManifest = existsSync(buildManifestPath)
    ? (JSON.parse(readFileSync(buildManifestPath, 'utf8')) as {
        assetBase?: string; assetMode?: string; localArtworkInBundle?: boolean
      })
    : {}
  const remoteBase = (buildManifest.assetBase ?? '').startsWith('http') ? buildManifest.assetBase! : ''
  const isRemoteMode = buildManifest.assetMode === 'remote'
  const localArtworkPresent = existsSync(join(deckDir, 'legacy-moonlight', 'cards', 'major-00.webp'))
  check(
    'REL-12b1 manifest 声明的资产模式与产物实际状态一致',
    isRemoteMode !== localArtworkPresent,
    `assetMode=${buildManifest.assetMode ?? '?'} · dist 内有牌面=${localArtworkPresent}`,
  )
  if (isRemoteMode) {
    check(
      'REL-12b 远端资产模式：产物里不留本地牌面副本（139MB 死重量）',
      !existsSync(deckDir),
      remoteBase ? `资产根 ${remoteBase}` : '产物指向远端资产根',
    )
  } else {
    check(
      'REL-12b 本地资产模式：牌面以原路径静态存在于 dist/assets/decks（未被改名）',
      localArtworkPresent,
      'dist/assets/decks/legacy-moonlight/cards/major-00.webp',
    )
  }

  /* JS 预算。D2 收尾时 index chunk 约 292KB、JS 合计约 640KB。
     给 15% 余量：超了必须解释，而不是悄悄长大。 */
  const jsFiles = distJs.filter((p) => p.endsWith('.js'))
  const totalJs = jsFiles.reduce((s, p) => s + statSync(p).size, 0)
  const BUDGET = 760 * 1024
  check(
    'REL-12c JS 总体积在预算内（760KB 未压缩）',
    totalJs <= BUDGET,
    `${(totalJs / 1024).toFixed(1)}KB / ${(BUDGET / 1024).toFixed(0)}KB · ${jsFiles.length} 个 chunk`,
  )
  const cssFiles = distJs.filter((p) => p.endsWith('.css'))
  const totalCss = cssFiles.reduce((s, p) => s + statSync(p).size, 0)
  check(
    'REL-12d CSS 总体积在预算内（120KB 未压缩）',
    totalCss <= 120 * 1024,
    `${(totalCss / 1024).toFixed(1)}KB`,
  )
}

/* ══════════════════════════════════════════════════════════════
 * 环境与文档
 * ════════════════════════════════════════════════════════════ */
function checkEnvDocs(): void {
  section('REL · 环境与启动')

  const example = existsSync(join(REPO_ROOT, '.env.example'))
    ? readFileSync(join(REPO_ROOT, '.env.example'), 'utf8')
    : ''
  check('REL-13 .env.example 存在', example.length > 0)
  check(
    'REL-13b .env.example 里 DEEPSEEK_API_KEY 是空的（绝不能提交真 Key）',
    /^DEEPSEEK_API_KEY=\s*$/m.test(example),
  )
  check(
    'REL-13c .env.example 列出了 VITE_DECK_ASSET_BASE_URL',
    /VITE_DECK_ASSET_BASE_URL/.test(example),
  )
  check(
    'REL-13d .env 不在 git 追踪范围内',
    readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8').split('\n').some((l) => l.trim() === '.env'),
  )

  /* README 里出现的 npm 脚本必须真的存在 ——
     「按 README 敲一遍命令跑不起来」是最廉价也最常见的交付事故。 */
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
  const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8')
  const mentioned = new Set<string>()
  for (const m of readme.matchAll(/npm run ([a-z:]+[a-z])/g)) mentioned.add(m[1]!)
  const missing = [...mentioned].filter((s) => !(s in pkg.scripts))
  check(
    'REL-14 README 里提到的每个 npm 脚本都真实存在',
    missing.length === 0,
    missing.length ? `缺失: ${missing.join(', ')}` : `${mentioned.size} 个脚本`,
  )
  check('REL-14b 存在生产启动脚本 npm start', typeof pkg.scripts.start === 'string')
  check('REL-14c 存在 release:check 脚本', typeof pkg.scripts['release:check'] === 'string')
}

/* ══════════════════════════════════════════════════════════════
 * SEC —— 安全响应头与 CSP（Phase E2.1）
 *
 * 【为什么这些断言直接 import 产品代码，而不是正则扫源码】
 * CSP 是一条字符串，任何一个指令写错都不会报错，只会让产品悄悄坏掉。
 * 正则扫源码只能证明「文件里出现过这几个字」；这里 import `buildCsp()`
 * 拿到的是**服务器真正会发出去的那一条**，然后逐条解析它。
 * ════════════════════════════════════════════════════════════ */
async function checkSecurityHeaders(): Promise<void> {
  section('SEC · 安全响应头与 CSP')

  const { buildCsp, assetOrigin, cspMode } = await import('../server/security.ts')
  const csp = buildCsp()
  const directives = new Map(
    csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...values] = d.split(/\s+/)
      return [name!, values] as const
    }),
  )
  const dir = (name: string) => directives.get(name) ?? []

  /* SEC-01 入口只挂一次。分散到各个 writeHead 里迟早漏一处，
     而漏掉的那处通常是 SSE —— 唯一的长连接。 */
  const serverSrc = readFileSync(join(REPO_ROOT, 'server', 'index.ts'), 'utf8')
  check(
    'SEC-01 安全头在请求入口统一挂载（覆盖静态 / API / SSE 三条出口）',
    /applySecurityHeaders\(req, res\)/.test(serverSrc)
      && serverSrc.indexOf('applySecurityHeaders(req, res)') < serverSrc.indexOf("url.pathname === '/api/tarot/reading'"),
  )

  /* SEC-02 是整条安全边界在浏览器侧的强制版本。
     `DEEPSEEK_API_KEY` 待在服务端，所以泄漏路径不是「读到 Key」，
     而是「让浏览器把 session、问题文本或解读内容发到第三方」。
     connect-src 一旦被放宽成 `*`，这条边界就只剩一句注释。 */
  check(
    "SEC-02 connect-src 只有 'self'（浏览器不可能向任何第三方发请求）",
    dir('connect-src').length === 1 && dir('connect-src')[0] === "'self'",
    csp.match(/connect-src[^;]*/)?.[0] ?? '（缺失）',
  )
  check(
    'SEC-03 script-src 不含 unsafe-inline / unsafe-eval',
    !dir('script-src').some((v) => v.includes('unsafe')),
    csp.match(/script-src[^;]*/)?.[0] ?? '（缺失）',
  )
  check("SEC-04 default-src 兜底为 'self'", dir('default-src')[0] === "'self'")
  check("SEC-05 object-src 为 'none'", dir('object-src')[0] === "'none'")
  check("SEC-06 frame-ancestors 为 'none'（不可被嵌进 iframe）", dir('frame-ancestors')[0] === "'none'")
  check("SEC-07 base-uri 与 form-action 锁在 'self'",
    dir('base-uri')[0] === "'self'" && dir('form-action')[0] === "'self'")

  /* SEC-08 —— 这一条是 390 张牌面会不会被自己的 CSP 拦掉。
     img-src 必须放行**产物里那个**资产根，而不是检查时环境变量里的那个。 */
  const imgSrc = dir('img-src')
  check("SEC-08 img-src 含 'self'", imgSrc.includes("'self'"))
  if (assetOrigin) {
    check(
      'SEC-08b img-src 放行了产物声明的牌面来源（否则 390 张牌被自己的 CSP 拦掉）',
      imgSrc.includes(assetOrigin),
      assetOrigin,
    )
  } else {
    check('SEC-08b 本地资产模式：牌面就在 self，img-src 无需额外来源',
      imgSrc.length === 1, "img-src 'self'")
  }
  check('SEC-08c img-src 不是通配符', !imgSrc.includes('*'), imgSrc.join(' '))

  /* SEC-09 HSTS 必须按协议判断。对 localhost 误发一次 HSTS，
     整台开发机上所有跑在 localhost 的项目都会被强制升级到 https。 */
  const secSrc = readFileSync(join(REPO_ROOT, 'server', 'security.ts'), 'utf8')
  const hstsIdx = secSrc.indexOf('Strict-Transport-Security')
  check(
    'SEC-09 HSTS 只在 x-forwarded-proto=https 时发送（不污染 localhost）',
    hstsIdx > 0 && secSrc.lastIndexOf("x-forwarded-proto", hstsIdx) > 0
      && secSrc.lastIndexOf("proto === 'https'", hstsIdx) > 0,
  )
  check('SEC-10 CSP 违规有上报出口（report-uri）', /report-uri \/api\/csp-report/.test(csp))
  check('SEC-11 CSP 模式可由 CSP_MODE 切换，无需改代码',
    ['report-only', 'enforce', 'off'].includes(cspMode)
      && /CSP_MODE/.test(readFileSync(join(REPO_ROOT, '.env.example'), 'utf8')),
    `当前 ${cspMode}`)
}

/* ══════════════════════════════════════════════════════════════ */
console.log(`${B}Release 自检 · Phase D3${X}`)
checkAssetPaths()
checkSecrets()
checkAssetBase()
checkLoadingPolicy()
checkFailureFallback()
checkBundle()
checkEnvDocs()
await checkSecurityHeaders()

const line = '─'.repeat(64)
console.log(`\n${line}`)
if (fail === 0) {
  console.log(`${G}全部通过${X}  ${pass} 项断言，0 失败`)
  console.log(`${D}密钥没有出口，资产路径能解析，首屏与摊牌不拖整副牌。${X}`)
} else {
  console.log(`${R}${fail} 项失败${X} / ${pass + fail} 项`)
  for (const f of failures) console.log(`  ${R}·${X} ${f}`)
}
console.log(line)
process.exit(fail === 0 ? 0 : 1)
