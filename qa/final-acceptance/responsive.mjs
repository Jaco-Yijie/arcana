/**
 * D4 · 响应式最终验收（Mobile / Tablet / Desktop）
 * 一次会话走到 Reveal + Reading，然后逐档改视口观测 —— 保证比较的是同一副牌。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, VIEWPORTS, wait, observe, scanDevStrings, shot, session, installCLS, readCLS } from './_lib.mjs'

const ORDER = ['m360', 'm390', 'm430', 't768', 'd1024', 'd1440', 'd1920']
const { browser, page, consoleErrors, failedRequests } = await open('m390')
await installCLS(page)
const W = (ms) => wait(page, ms)
const R = { pages: {}, findings: [] }

/* 静态页先扫 */
async function sweepStatic(routeName, url) {
  R.pages[routeName] = []
  for (const k of ORDER) {
    const v = VIEWPORTS[k]
    await page.setViewportSize({ width: v.width, height: v.height })
    await page.goto(BASE + url, { waitUntil: 'networkidle' }); await W(1400)
    const o = await observe(page)
    const dev = scanDevStrings(o.text)
    const rec = {
      vp: k, w: v.width, h: v.height,
      overflowX: o.overflowX, scrollH: o.scrollH, screens: +(o.scrollH / o.vh).toFixed(1),
      imgs: o.imgs.length, broken: o.brokenImgs,
      maxImgW: o.imgs.length ? Math.max(...o.imgs.map((i) => i.w)) : 0,
      smallTargets: o.smallTargets.map((c) => `${c.label}(${c.w}×${c.h})`),
      devStrings: dev,
    }
    R.pages[routeName].push(rec)
    if (o.overflowX) R.findings.push({ sev: 'P1', page: routeName, vp: k, issue: '横向溢出' })
    if (o.brokenImgs) R.findings.push({ sev: 'P1', page: routeName, vp: k, issue: `${o.brokenImgs} 张图失败` })
    if (dev.length) R.findings.push({ sev: 'P1', page: routeName, vp: k, issue: '开发痕迹 ' + JSON.stringify(dev) })
    await shot(page, `resp-${routeName}-${k}`)
  }
  const t = R.pages[routeName]
  console.log(`\n[${routeName}] ` + t.map((r) => `${r.vp}:${r.overflowX ? '⚠溢出' : 'ok'}/${r.screens}屏/img${r.imgs}`).join('  '))
  const small = [...new Set(t.flatMap((r) => r.smallTargets))]
  if (small.length) console.log(`   <44px 触达: ${small.join(', ')}`)
}

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await sweepStatic('home', '/')
await sweepStatic('decks', '/decks')
await sweepStatic('journal', '/journal')
await sweepStatic('settings', '/settings')

/* 动态：走一次五张牌到 Reveal，再逐档扫 */
await page.setViewportSize({ width: 390, height: 844 })
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
await page.getByRole('button', { name: /二选一/ }).first().click(); await W(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle', { timeout: 15000 }); await W(1400)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await W(300)
}
await W(1000)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut', { timeout: 15000 }); await W(1400)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await W(800)
await page.getByRole('button', { name: '从这里切开' }).click(); await W(1900)
await page.getByRole('button', { name: '合起来' }).click(); await W(1700)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 25000 }); await W(3000)

/* 摊牌页逐档 */
R.pages.draw = []
for (const k of ORDER) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height }); await W(1300)
  const o = await observe(page)
  R.pages.draw.push({ vp: k, overflowX: o.overflowX, imgs: o.imgs.length, broken: o.brokenImgs })
  if (o.overflowX) R.findings.push({ sev: 'P1', page: 'draw', vp: k, issue: '横向溢出' })
  await shot(page, `resp-draw-${k}`)
}
console.log('\n[draw] ' + R.pages.draw.map((r) => `${r.vp}:${r.overflowX ? '⚠溢出' : 'ok'}/img${r.imgs}`).join('  '))

await page.setViewportSize({ width: 390, height: 844 }); await W(900)
const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await W(880)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await W(110); await page.mouse.up(); await W(900)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal', { timeout: 15000 }); await W(2000)
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await W(1300)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await W(600) }
}
await W(1000)

R.pages.reveal = []
for (const k of ORDER) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height }); await W(1500)
  const o = await observe(page)
  const art = o.imgs.filter((i) => /\/decks\//.test(i.src))
  const rec = {
    vp: k, w: v.width, h: v.height, dpr: v.dpr,
    overflowX: o.overflowX, cards: art.length,
    maxCardW: art.length ? Math.max(...art.map((i) => i.w)) : 0,
    variant: art.length ? (/\/thumbs\//.test(art[0].src) ? 'thumb' : 'full') : null,
    sourcePx: art.length ? art[0].natW : null,
    neededPx: art.length ? Math.round(art[0].w * v.dpr) : null,
    broken: o.brokenImgs,
    devStrings: scanDevStrings(o.text),
  }
  rec.sharpEnough = rec.sourcePx !== null ? rec.sourcePx >= rec.neededPx : null
  R.pages.reveal.push(rec)
  if (o.overflowX) R.findings.push({ sev: 'P1', page: 'reveal', vp: k, issue: '横向溢出' })
  if (rec.sharpEnough === false) R.findings.push({ sev: 'P2', page: 'reveal', vp: k, issue: `源像素 ${rec.sourcePx} < 所需 ${rec.neededPx}` })
  await shot(page, `resp-reveal-${k}`)
}
console.log('\n[reveal] 视口   牌数 牌宽 档位  源px  需px  够不够  溢出')
for (const r of R.pages.reveal)
  console.log(`         ${r.vp.padEnd(6)} ${String(r.cards).padStart(3)} ${String(r.maxCardW).padStart(4)} ${String(r.variant).padEnd(6)} ${String(r.sourcePx).padStart(5)} ${String(r.neededPx).padStart(5)}  ${r.sharpEnough ? '✅' : '❌'}    ${r.overflowX ? '⚠' : '否'}`)

R.cls = await readCLS(page)
R.consoleErrors = consoleErrors
R.failedRequests = failedRequests
writeFileSync(`${OUT}/responsive.json`, JSON.stringify(R, null, 2))
console.log(`\nCLS=${R.cls} · console error ${consoleErrors.length} · 失败请求 ${failedRequests.length} · findings ${R.findings.length}`)
if (R.findings.length) console.log(JSON.stringify(R.findings, null, 1))
await browser.close()
