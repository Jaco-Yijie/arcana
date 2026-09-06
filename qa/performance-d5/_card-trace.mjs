/**
 * D5 · Card Reveal 延迟分解（限速下才能复现用户报告的症状）
 * localhost 没有网络延迟，300KB 的图 300ms 就到了 —— 但真实用户不是。
 * 这里用 CDP 限速把「摆牌后不预取」的结构性代价量出来。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
const PW = process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)
const BASE = process.env.ARCANA_BASE || 'http://localhost:8787'
const PROFILE = process.argv[2] || 'fast4g'
const CACHE = process.argv[3] || 'cold'
const NET = {
  none:   null,
  fast4g: { latency: 60,  downloadThroughput: 4_000_000 / 8, uploadThroughput: 1_000_000 / 8 },
  slow4g: { latency: 150, downloadThroughput: 1_500_000 / 8, uploadThroughput: 750_000 / 8 },
  slow3g: { latency: 400, downloadThroughput:   400_000 / 8, uploadThroughput: 400_000 / 8 },
}[PROFILE]
mkdirSync('qa/performance-d5', { recursive: true })

const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
if (NET) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET })
/* 【cold 的正确含义是「会话开始时缓存是空的」，不是「全程禁用缓存」】
   第一版用了 setCacheDisabled:true，结果是 <img> 元素无法复用预取已经下好的字节，
   每次都重新走网络 —— 那种设置下**任何**预取策略都不可能生效，
   测出来的必然是「预取无效」，而那是测量方式造成的，不是产品行为。
   改成清空缓存但保持缓存可用，这才是真实用户第一次打开的样子。 */
await cdp.send('Network.clearBrowserCache')
if (CACHE === 'nocache') await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
const W = (ms) => page.waitForTimeout(ms)

const art = []
page.on('request', (r) => { if (/\/decks\/[^/]+\/(cards|thumbs)\//.test(r.url())) art.push({ url: r.url(), variant: /\/cards\//.test(r.url()) ? 'full' : 'thumb', start: Date.now(), end: null, bytes: 0 }) })
page.on('response', async (r) => {
  const rec = art.find((a) => a.url === r.url() && a.end === null)
  if (!rec) return
  rec.end = Date.now()
  try { rec.bytes = (await r.body()).length } catch { /* 中断的响应取不到 body */ }
})

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1000)
await page.getByText('随缘抽一张').click(); await W(1500)
const skip = page.getByRole('button', { name: /直接随缘/ }).first()
if (await skip.count()) { await skip.click(); await W(1600) }
const go = page.getByRole('button', { name: /直接开始/ }).first()
if (await go.count()) { await go.click(); await W(1600) }
await page.waitForURL('**/table/shuffle', { timeout: 25000 }); await W(1200)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await W(280)
}
await W(900)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut', { timeout: 20000 }); await W(1200)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await W(700)
await page.getByRole('button', { name: '从这里切开' }).click(); await W(1800)
await page.getByRole('button', { name: '合起来' }).click(); await W(1500)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 30000 }); await W(2500)

/* T0 用户选中牌 → 落位。
   【不要在落位后清空 art】第一版在落位 + 600ms 之后才清空，
   而预取正是在落位那一刻触发的 —— 于是预取请求刚好被清掉，
   测出来永远是「0 个」。改成记录时间戳，事后按落位时刻切分。 */
const tSelect = Date.now()
art.length = 0
await page.mouse.click(195, 660); await W(900)
await page.getByRole('button', { name: /把这张牌放到/ }).first().click()
const tPlaced = Date.now()
await W(3500)
const prefetch = art.filter((a) => a.variant === 'full' && a.start >= tPlaced - 200)
console.log(`[T1 落位完成] +${tPlaced - tSelect}ms（选中→落位）`)
console.log(`[预取窗口] 落位后 3.5s 内 full 请求 ${prefetch.length} 个  ← 0 = 无预取`)
for (const p of prefetch.slice(0, 3)) console.log(`   full 发起 +${p.start - tPlaced}ms · 耗时 ${p.end ? p.end - p.start : '?'}ms · ${(p.bytes / 1024).toFixed(1)} KB`)

await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal', { timeout: 20000 }); await W(1500)
art.length = 0

const btn = page.getByRole('button', { name: '翻开这张牌' }).first()
const box = await btn.boundingBox()
const tClick = Date.now()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

let firstPaintAt = null; let firstVariant = null; let blank = 0; let samples = 0
for (let i = 0; i < 120; i++) {
  await W(100); samples += 1
  const st = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
    const painted = imgs.filter((i) => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 40)
    return { painted: painted.length, variant: painted[0] ? (/\/thumbs\//.test(painted[0].currentSrc) ? 'thumb' : 'full') : null,
      anyCardBox: [...document.querySelectorAll('img,svg')].some((e) => e.getBoundingClientRect().width > 60) }
  })
  if (st.painted === 0) blank += 1
  if (st.painted > 0 && firstPaintAt === null) { firstPaintAt = Date.now() - tClick; firstVariant = st.variant }
  if (firstPaintAt !== null && i > 15) break
}
const reqs = art.map((a) => ({ variant: a.variant, afterClickMs: a.start - tClick, durationMs: a.end ? a.end - a.start : null, kb: +(a.bytes / 1024).toFixed(1) }))
const firstFull = reqs.find((r) => r.variant === 'full')
console.log(`[翻牌] 点击 → 牌面首次可见 ${firstPaintAt}ms（档位 ${firstVariant}）`)
console.log(`[翻牌] 空白采样帧 ${blank}/${samples}`)
console.log(`[翻牌] 点击后的资产请求：`)
for (const r of reqs.slice(0, 6)) console.log(`   ${r.variant.padEnd(5)} 发起 +${r.afterClickMs}ms · 耗时 ${r.durationMs}ms · ${r.kb} KB`)
if (firstFull) console.log(`[关键] full 直到点击后 ${firstFull.afterClickMs}ms 才发起，下载耗时 ${firstFull.durationMs}ms`)

const out = { profile: PROFILE, cache: CACHE, net: NET,
  selectToPlacedMs: tPlaced - tSelect, prefetchFullAfterPlacement: prefetch.length,
  clickToFirstPaintMs: firstPaintAt, firstPaintVariant: firstVariant,
  blankSamples: blank, totalSamples: samples, requestsAfterClick: reqs }
writeFileSync(`qa/performance-d5/card-${PROFILE}-${CACHE}.json`, JSON.stringify(out, null, 2))
await page.screenshot({ path: `qa/performance-d5/card-${PROFILE}-${CACHE}.png` })
await b.close()
