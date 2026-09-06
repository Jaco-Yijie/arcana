/**
 * E1.1 · 在 **deployment/frontend 这份包**上验证 D5 的性能行为
 *
 * 【为什么不能只做静态 grep】
 * 产物里出现 'thumbs' 字面量，只能说明代码被打进去了，
 * 不能说明「摆牌完成时真的会去预取」「翻牌时真的不再等网络」。
 * D5 的结论是行为结论，就必须在包上重新跑一遍行为。
 *
 * 这里起一个只托管 deployment/frontend 的静态服务器，
 * /api 反代到 npm start 的 Reading Server —— 与生产的同源部署形态一致。
 */
import { writeFileSync } from 'node:fs'
const PW = process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)
const BASE = process.env.PKG_BASE || 'http://localhost:8901'
const PROFILE = process.argv[2] || 'slow4g'
const NET = {
  fast4g: { latency: 60,  downloadThroughput: 4_000_000 / 8, uploadThroughput: 1_000_000 / 8 },
  slow4g: { latency: 150, downloadThroughput: 1_500_000 / 8, uploadThroughput: 750_000 / 8 },
  slow3g: { latency: 400, downloadThroughput:   400_000 / 8, uploadThroughput: 400_000 / 8 },
}[PROFILE]

const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Network.enable')
await cdp.send('Network.clearBrowserCache')
await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET })
const W = (ms) => page.waitForTimeout(ms)

const art = []
page.on('request', (r) => {
  if (/\/decks\/[^/]+\/(cards|thumbs)\//.test(r.url()))
    art.push({ variant: /\/cards\//.test(r.url()) ? 'full' : 'thumb', start: Date.now() })
})
const api = []
page.on('request', (r) => { if (/\/api\//.test(r.url())) api.push(`${r.method()} ${new URL(r.url()).pathname}`) })
page.on('request', (r) => { if (/api\.deepseek\.com/.test(r.url())) api.push('!!! 浏览器直连上游') })

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1000)
await page.getByText('随缘抽一张').click(); await W(1400)
const skip = page.getByRole('button', { name: /直接随缘/ }).first()
if (await skip.count()) { await skip.click(); await W(1500) }
const go = page.getByRole('button', { name: /直接开始/ }).first()
if (await go.count()) { await go.click(); await W(1500) }
await page.waitForURL('**/table/shuffle', { timeout: 25000 }); await W(1200)
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab'); await W(110)
  const l = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  if (/牌堆/.test(l)) break
}
for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await W(360) }
await W(600)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut', { timeout: 20000 }); await W(1200)
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab'); await W(110)
  const l = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  if (/切牌位置/.test(l)) break
}
await page.keyboard.press('Enter'); await W(500)
for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowDown'); await W(200) }
await page.getByRole('button', { name: '从这里切开' }).click(); await W(1800)
await page.getByRole('button', { name: '合起来' }).click(); await W(1500)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 30000 }); await W(2500)

/* 选牌 + 落位（键盘路径，与视口无关） */
art.length = 0
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab'); await W(110)
  const l = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  if (/摊开的牌/.test(l)) break
}
await page.keyboard.press('Enter'); await W(900)
await page.getByRole('button', { name: /把这张牌放到/ }).first().click()
const tPlaced = Date.now()
await W(3500)
const prefetch = art.filter((a) => a.start >= tPlaced - 300)
const prefFull = prefetch.filter((a) => a.variant === 'full').length
const prefThumb = prefetch.filter((a) => a.variant === 'thumb').length
console.log(`[1-2] 落位完成 → 3.5s 内：full ${prefFull} 个 · thumb ${prefThumb} 个  ← 预取是否触发`)
console.log(`[3]   预取总数 ${prefetch.length}（必须 ≤ 2，即只有这一张牌的两档，绝不是整副 78 张）`)

await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal', { timeout: 20000 }); await W(1500)
art.length = 0
const btn = page.getByRole('button', { name: '翻开这张牌' }).first()
const box = await btn.boundingBox()
const tClick = Date.now()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
let visibleAt = null; let variant = null; let blank = 0
for (let i = 0; i < 40; i++) {
  await W(100)
  const st = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
    const p = imgs.filter((i) => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 40)
    return { n: p.length, v: p[0] ? (/\/thumbs\//.test(p[0].currentSrc) ? 'thumb' : 'full') : null }
  })
  if (st.n === 0) blank += 1
  if (st.n > 0 && visibleAt === null) { visibleAt = Date.now() - tClick; variant = st.v }
  if (visibleAt !== null && i > 15) break
}
const afterClick = art.length
console.log(`[3]   点击 → 牌面可见 ${visibleAt}ms（${variant}）· 空白采样帧 ${blank}/17 · 点击后新请求 ${afterClick} 个`)

/* 翻牌后牌义面板会自动弹出，它的遮罩会挡住下方的 CTA —— 先用 Escape 关掉
   （这条关闭路径本身是 D4 验过的） */
await page.keyboard.press('Escape'); await W(800)

/* Standard Reading */
await page.getByRole('button', { name: /开始完整解读|解读/ }).first().click()
await page.waitForURL('**/reading', { timeout: 20000 }); await W(1000)
const d = page.getByRole('button', { name: /标准解读/ }).first()
if (await d.count()) { await d.click(); await W(700) }
const t0 = Date.now()
await page.getByRole('button', { name: '开始解读' }).click()
let firstText = null; let slowHint = null; let done = null
const tl = []
for (let i = 0; i < 120; i++) {
  await W(500)
  const s = await page.evaluate(() => {
    const t = document.body.innerText
    return { len: t.length, sections: /每张牌的分析|整体走向/.test(t), slow: /1–2 分钟|1-2 分钟/.test(t) }
  })
  const at = Date.now() - t0
  if (firstText === null && s.len > 120) firstText = at
  if (slowHint === null && s.slow) slowHint = at
  tl.push({ at, len: s.len })
  if (s.sections) { done = at; break }
}
console.log(`[4]   Standard：首段 ${firstText}ms · 完成 ${done}ms ·「1–2 分钟」${slowHint ? slowHint + 'ms' : '未出现'}`)
console.log(`      屏上文本：` + tl.filter((_, i) => i % 6 === 0).map((p) => `${Math.round(p.at / 1000)}s:${p.len}`).join(' → '))
console.log(`[安全] API 调用：${[...new Set(api)].join(' | ')}`)
writeFileSync('qa/performance-d5/package-verify.json', JSON.stringify({
  profile: PROFILE, servedFrom: 'deployment/frontend',
  prefetch: { full: prefFull, thumb: prefThumb, total: prefetch.length },
  reveal: { clickToVisibleMs: visibleAt, variant, blankSamples: blank, requestsAfterClick: afterClick },
  standard: { firstTextMs: firstText, doneMs: done, slowHintAtMs: slowHint, timeline: tl },
  apiCalls: [...new Set(api)],
}, null, 2))
await b.close()
