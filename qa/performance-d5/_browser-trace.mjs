/**
 * D5 · 浏览器感知时间线（STEP 0）
 * API 层首字 2s，但用户看到的是什么？每 500ms 采一次屏上可见文本，
 * 把「有内容」和「只有骨架屏」分开。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
const PW = process.env.PW_CORE || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)
const BASE = process.env.ARCANA_BASE || 'http://localhost:8787'
const VP = process.argv[2] === 'desktop' ? { w: 1440, h: 900, dpr: 2 } : { w: 390, h: 844, dpr: 3 }
mkdirSync('qa/performance-d5', { recursive: true })

const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: VP.w, height: VP.h }, deviceScaleFactor: VP.dpr })
const page = await ctx.newPage()
const W = (ms) => page.waitForTimeout(ms)
const netArt = []
page.on('response', (r) => {
  const u = r.url()
  if (/\/decks\/[^/]+\/(cards|thumbs)\//.test(u)) netArt.push({ at: Date.now(), url: u.replace(BASE, ''), variant: /\/cards\//.test(u) ? 'full' : 'thumb' })
})

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1200)
await page.getByText('带着问题来').click()
await page.waitForURL(/\/(decks|question)/, { timeout: 15000 }); await W(1400)
if (page.url().includes('/decks')) {
  await page.getByRole('button', { name: '就用这副' }).click()
  await page.waitForURL('**/question**', { timeout: 15000 }); await W(1200)
}
const ta = page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click(); await W(2000)
await page.getByRole('button', { name: '用优化后的' }).click(); await W(1600)
await page.getByRole('button', { name: /过去.*现在.*未来|三张/ }).first().click().catch(async () => {
  await page.getByRole('button', { name: /二选一/ }).first().click()
}); await W(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle', { timeout: 15000 }); await W(1400)
/* 洗牌手势的坐标是按移动端调的，桌面视口下会落空。
   改走 D4 补的键盘洗牌路径：聚焦牌堆后按 Enter —— 与视口无关，
   而且它本来就是真实产品路径（辅助技术用户走的就是这条）。 */
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab'); await W(120)
  const lbl = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  if (/牌堆/.test(lbl)) break
}
for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await W(380) }
await W(700)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut', { timeout: 15000 }); await W(1300)
/* 切牌同理，用 D4 的键盘路径 */
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab'); await W(120)
  const lbl = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  if (/切牌位置/.test(lbl)) break
}
await page.keyboard.press('Enter'); await W(500)
for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowDown'); await W(220) }
await page.getByRole('button', { name: '从这里切开' }).click(); await W(1800)
await page.getByRole('button', { name: '合起来' }).click(); await W(1600)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 25000 }); await W(3000)

/* ── 摆牌：记录「最后一张摆好」的时刻，以及此后是否有 full artwork 请求 ── */
/* 【空牌位按钮只在手上有牌时才存在】（D2-05 的设计）——
   所以不能先 count 再循环，那样永远是 0。改成：拿起 → 落位 → 直到「去翻牌」出现。 */
/* 扇形选牌同样用键盘路径（D4 的 roving tabindex）——
   坐标法只在 390 宽下成立，桌面视口会全部落空。 */
let nSlots = 0
for (let i = 0; i < 6; i++) {
  if (await page.getByRole('button', { name: '去翻牌' }).count()) break
  let focused = false
  for (let k = 0; k < 30; k++) {
    await page.keyboard.press('Tab'); await W(110)
    const lbl = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
    if (/摊开的牌/.test(lbl)) { focused = true; break }
  }
  if (!focused) break
  for (let k = 0; k < i * 3; k++) { await page.keyboard.press('ArrowRight'); await W(90) }
  await page.keyboard.press('Enter'); await W(900)
  const slot = page.getByRole('button', { name: /把这张牌放到/ }).first()
  if (!(await slot.count())) break
  await slot.click(); await W(1000)
  nSlots += 1
}
const tPlacementDone = Date.now()
netArt.length = 0                       // 只看摆牌完成之后的请求
console.log(`[摆牌完成] ${nSlots} 张`)
await W(3000)
const prefetchedAfterPlacement = netArt.filter((a) => a.variant === 'full').length
console.log(`[摆牌后 3s 内的 full artwork 请求] ${prefetchedAfterPlacement} 个  ← 0 表示没有预取`)

await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal', { timeout: 15000 }); await W(1800)
netArt.length = 0

/* ── 翻第一张：测「点击 → 牌面真正可见」 ── */
const btn = page.getByRole('button', { name: '翻开这张牌' }).first()
const box = await btn.boundingBox()
const tClick = Date.now()
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

let firstVisibleAt = null; let blankFrames = 0
for (let i = 0; i < 60; i++) {
  await W(100)
  const st = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
    const painted = imgs.filter((i) => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width > 40)
    return { imgs: imgs.length, painted: painted.length,
      srcs: painted.map((i) => (/\/thumbs\//.test(i.currentSrc) ? 'thumb' : 'full')) }
  })
  if (st.painted > 0 && firstVisibleAt === null) firstVisibleAt = Date.now() - tClick
  if (st.painted === 0) blankFrames += 1
  if (firstVisibleAt !== null && i > 12) break
}
const artReq = netArt.filter((a) => a.variant === 'full')
console.log(`[翻牌] 点击 → 牌面可见 ${firstVisibleAt}ms · 期间空白采样帧 ${blankFrames} · full 请求 ${artReq.length} 个`)
const firstFullAt = artReq.length ? artReq[0].at - tClick : null
console.log(`[翻牌] 首个 full 请求发生在点击后 ${firstFullAt}ms  ← 若 >0 说明是翻牌时才开始请求`)
await page.screenshot({ path: 'qa/performance-d5/browser-reveal.png' })

/* 翻完剩余 */
for (let i = 0; i < 6; i++) {
  const b2 = page.getByRole('button', { name: '翻开这张牌' }).first()
  if (!(await b2.count())) break
  const bb = await b2.boundingBox(); if (!bb) break
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await W(1200)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await W(600) }
}
await W(800)

/* ── Reading：每 500ms 采一次屏上可见内容 ── */
await page.getByRole('button', { name: '开始完整解读' }).click()
await page.waitForURL('**/reading', { timeout: 20000 }); await W(1000)
const d = page.getByRole('button', { name: /标准解读/ }).first()
if (await d.count()) { await d.click(); await W(700) }
const tStart = Date.now()
await page.getByRole('button', { name: '开始解读' }).click()

const timeline = []
let firstMeaningfulAt = null; let doneAt = null
for (let i = 0; i < 160; i++) {
  await W(500)
  const s = await page.evaluate(() => {
    const t = document.body.innerText
    const skeleton = document.querySelectorAll('.animate-pulse').length
    return { len: t.length, text: t, skeleton,
      hasSections: /每张牌的分析|整体走向/.test(t),
      slowHint: /1–2 分钟|1-2 分钟/.test(t) }
  })
  const at = Date.now() - tStart
  /* 「首段可读内容」= 出现了加载文案与骨架屏之外的实际解读文字 */
  const body = s.text.replace(/正在解读牌面……|正在观察整体牌面|正在分析牌与牌之间的关系|正在结合你的问题|正在整理解读|看牌阵|存入日记/g, '').trim()
  if (firstMeaningfulAt === null && body.length > 40) firstMeaningfulAt = at
  timeline.push({ at, len: s.len, skeleton: s.skeleton, sections: s.hasSections, slowHint: s.slowHint })
  if (s.hasSections) { doneAt = at; break }
}
console.log(`\n[Reading] 首段可读内容 ${firstMeaningfulAt}ms · 完成（出现章节）${doneAt}ms`)
const slowShown = timeline.find((x) => x.slowHint)
console.log(`[Reading] 「1–2 分钟」提示出现在 ${slowShown ? slowShown.at + 'ms' : '未出现'}`)
console.log('[Reading] 屏上文本长度随时间：')
for (const p of timeline.filter((_, i) => i % 4 === 0)) console.log(`   ${String(p.at).padStart(6)}ms  len=${String(p.len).padStart(5)}  骨架屏=${p.skeleton}${p.slowHint ? '  ⚠1–2分钟提示' : ''}`)
await page.screenshot({ path: 'qa/performance-d5/browser-reading.png', fullPage: true })

writeFileSync('qa/performance-d5/browser-trace.json', JSON.stringify({
  viewport: VP, cards: nSlots,
  card: { prefetchedAfterPlacement, clickToVisibleMs: firstVisibleAt, blankSamples: blankFrames,
    firstFullRequestAfterClickMs: firstFullAt, fullRequests: artReq.length },
  reading: { firstMeaningfulMs: firstMeaningfulAt, doneMs: doneAt,
    slowHintAtMs: slowShown ? slowShown.at : null, timeline },
}, null, 2))
await b.close()
