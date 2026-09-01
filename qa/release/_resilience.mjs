/**
 * D3 · 弹性与慢网验证
 *   A. 全部牌面资产 404 → 程序化兜底，布局不崩，流程可继续
 *   B. Slow 3G 限速下的 Deck Library / Reveal 首屏观感
 * dev-only，只观测 + 注入故障，不改产品代码。
 */
import { VIEWPORTS, BASE } from '../product-polish/walkthrough.mjs'
const PW = process.env.PW_CORE
  || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)

const MODE = process.argv[2] || 'fail'   // fail | slow
const vp = VIEWPORTS.m390
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
const wait = (ms) => page.waitForTimeout(ms)

if (MODE === 'fail') {
  await page.route('**/assets/decks/**', (r) => r.abort('failed'))
  console.log('[注入] 所有牌面资产 → 网络失败')
} else {
  /* Slow 3G：CDP 限速。400kbps / 400ms RTT */
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 400,
    downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8,
  })
  console.log('[注入] Slow 3G · 400kbps · RTT 400ms')
}

const t = (label) => `${label} ${((Date.now() - T0) / 1000).toFixed(1)}s`
let T0 = Date.now()
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=带着问题来', { timeout: 60000 })
console.log(t('[首页可交互]'))
await page.screenshot({ path: `qa/release/resilience-${MODE}-home.png` })

T0 = Date.now()
await page.getByText('带着问题来').click(); await page.waitForURL('**/decks')
await page.waitForSelector('text=月光', { timeout: 60000 })
console.log(t('[Deck Library 首个牌组名可见]'))
await wait(MODE === 'slow' ? 9000 : 2500)
const libState = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.src || i.currentSrc))
  return {
    imgs: imgs.length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    text: document.body.innerText.slice(0, 200),
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollH: document.documentElement.scrollHeight,
  }
})
console.log(`[Deck Library] img=${libState.imgs} 加载失败=${libState.broken} overflowX=${libState.overflowX} 高度=${libState.scrollH}`)
await page.screenshot({ path: `qa/release/resilience-${MODE}-decks.png`, fullPage: false })

/* 走到 reveal */
await page.getByRole('button', { name: '就用这副' }).click()
await page.waitForURL('**/question**'); await wait(1200)
const ta = page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click(); await wait(2000)
await page.getByRole('button', { name: '用优化后的' }).click(); await wait(1600)
await page.getByRole('button', { name: /二选一/ }).first().click(); await wait(1800)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle'); await wait(1800)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await wait(320)
}
await wait(1200)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut'); await wait(1800)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await wait(1000)
await page.getByRole('button', { name: '从这里切开' }).click(); await wait(2200)
await page.getByRole('button', { name: '合起来' }).click(); await wait(2000)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 40000 }); await wait(3500)
console.log('[摊开 78 张] 到达')
await page.screenshot({ path: `qa/release/resilience-${MODE}-draw.png` })

const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await wait(900)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await wait(120); await page.mouse.up(); await wait(1000)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal'); await wait(2500)

/* 键盘翻牌验证（D3 新增的无障碍路径）——只在 fail 模式跑一次就够 */
if (MODE === 'fail') {
  const before = await page.evaluate(() => document.body.innerText.includes('已翻开 1/5'))
  await page.keyboard.press('Tab')
  let tabs = 0
  while (tabs < 25) {
    const focused = await page.evaluate(() => {
      const el = document.activeElement
      return el ? { label: el.getAttribute('aria-label'), tag: el.tagName } : null
    })
    if (focused?.label === '翻开这张牌') break
    await page.keyboard.press('Tab'); tabs++
  }
  const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  console.log(`[键盘] Tab ${tabs} 次后聚焦到: ${focusedLabel ?? '(无)'}`)
  if (focusedLabel === '翻开这张牌') {
    await page.keyboard.press('Enter'); await wait(1800)
    const after = await page.evaluate(() => document.body.innerText)
    console.log(`[键盘] 按 Enter 后: ${/已翻开 [1-5]\/5|都翻开了/.test(after) ? '✅ 牌被翻开' : '❌ 无反应'}  (before1/5=${before})`)
  } else {
    console.log('[键盘] ❌ Tab 无法聚焦到牌')
  }
}

T0 = Date.now()
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await wait(1500)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await wait(700) }
}
await wait(1500)
console.log(t('[5 张全部翻开]'))
const rev = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.src || i.currentSrc))
  const svgs = document.querySelectorAll('svg').length
  return {
    imgs: imgs.length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    svgs,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    text: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 260),
    ctaVisible: !!document.body.innerText.match(/解读|开始/),
  }
})
console.log(`[Reveal] img=${rev.imgs} 加载失败=${rev.broken} svg=${rev.svgs} overflowX=${rev.overflowX} CTA可见=${rev.ctaVisible}`)
console.log(`[Reveal 文本] ${rev.text}`)
await page.screenshot({ path: `qa/release/resilience-${MODE}-reveal.png` })
if (errors.length) console.log(`\n⚠ console errors (${errors.length}):\n  ` + errors.slice(0, 6).join('\n  '))
else console.log('\n✅ 无 console error')
await b.close()
