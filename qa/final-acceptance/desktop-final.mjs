/**
 * D4 · 桌面终检（§12）
 * 在同一次真实解读上逐档看 Reading / Journal / Reveal，
 * 判断「是不是手机页面放大」「1920 是否巨大空白」。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, VIEWPORTS, wait, observe, scanDevStrings, shot, session } from './_lib.mjs'

const { browser, page, consoleErrors, failedRequests } = await open('m390')
const W = (ms) => wait(page, ms)
const R = { reveal: [], reading: [], journal: [], findings: [] }

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1300)
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
const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await W(880)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await W(110); await page.mouse.up(); await W(880)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal', { timeout: 15000 }); await W(2000)
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await W(1200)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await W(600) }
}
await W(900)

/* Reveal 桌面三档 */
for (const k of ['d1024', 'd1440', 'd1920']) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height }); await W(1500)
  const o = await observe(page)
  const art = o.imgs.filter((i) => /\/decks\//.test(i.src))
  const xs = art.map((i) => i.w)
  const rec = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
    if (!imgs.length) return null
    const L = Math.min(...imgs.map((i) => i.getBoundingClientRect().left))
    const Rt = Math.max(...imgs.map((i) => i.getBoundingClientRect().right))
    return { leftGap: Math.round(L), rightGap: Math.round(window.innerWidth - Rt), spanW: Math.round(Rt - L), vw: window.innerWidth }
  })
  R.reveal.push({ vp: k, cards: art.length, maxCardW: Math.max(...xs), ...rec,
    usedPct: rec ? Math.round((rec.spanW / rec.vw) * 100) : null, overflowX: o.overflowX })
  await shot(page, `desktop-reveal-${k}`)
}
console.log('[Reveal 桌面] 视口   牌数 牌宽 牌阵占宽 左空 右空 占屏% 溢出')
for (const r of R.reveal)
  console.log(`            ${r.vp.padEnd(6)} ${String(r.cards).padStart(3)} ${String(r.maxCardW).padStart(4)} ${String(r.spanW).padStart(8)} ${String(r.leftGap).padStart(4)} ${String(r.rightGap).padStart(4)} ${String(r.usedPct).padStart(5)}% ${r.overflowX ? '⚠' : '否'}`)

/* 解读 */
await page.setViewportSize({ width: 390, height: 844 }); await W(900)
await page.getByRole('button', { name: '开始完整解读' }).click()
await page.waitForURL('**/reading', { timeout: 20000 }); await W(1200)
const d = page.getByRole('button', { name: /标准解读/ }).first()
if (await d.count()) { await d.click(); await W(800) }
await page.getByRole('button', { name: '开始解读' }).click()
for (let i = 0; i < 90; i++) {
  await W(2000)
  const t = await page.evaluate(() => document.body.innerText)
  if (t.length > 450 && !/正在生成|稍候/.test(t)) break
}
await W(1500)

for (const k of ['d1024', 'd1440', 'd1920']) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height }); await W(1500)
  const o = await observe(page)
  const col = await page.evaluate(() => {
    const p = [...document.querySelectorAll('p')].filter((e) => e.innerText.length > 60)
    if (!p.length) return null
    const w = Math.round(p[0].getBoundingClientRect().width)
    /* 每行大致字数 —— 判断「是不是一行拉到 1900px」 */
    const fs = parseFloat(getComputedStyle(p[0]).fontSize)
    return { textColW: w, approxCharsPerLine: Math.round(w / fs) }
  })
  const strip = o.imgs.filter((i) => /\/decks\//.test(i.src))
  R.reading.push({ vp: k, ...col, stripCards: strip.length,
    stripMaxW: strip.length ? Math.max(...strip.map((i) => i.w)) : 0,
    clipped: await page.evaluate(() => [...document.querySelectorAll('img')]
      .filter((i) => /\/decks\//.test(i.currentSrc))
      .some((i) => i.getBoundingClientRect().right > window.innerWidth + 1)),
    overflowX: o.overflowX, devStrings: scanDevStrings(o.text) })
  await shot(page, `desktop-reading-${k}`, true)
}
console.log('\n[Reading 桌面] 视口   正文列宽 每行约字数 牌条数 牌条宽 右侧裁切 溢出')
for (const r of R.reading)
  console.log(`               ${r.vp.padEnd(6)} ${String(r.textColW).padStart(8)} ${String(r.approxCharsPerLine).padStart(10)} ${String(r.stripCards).padStart(6)} ${String(r.stripMaxW).padStart(6)} ${r.clipped ? '⚠是' : '否'}      ${r.overflowX ? '⚠' : '否'}`)

/* 日记 */
await page.setViewportSize({ width: 390, height: 844 }); await W(700)
await page.getByRole('button', { name: '存入日记' }).click(); await W(1800)
for (const k of ['d1024', 'd1440', 'd1920']) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height })
  await page.goto(BASE + '/journal', { waitUntil: 'networkidle' }); await W(1600)
  const o = await observe(page)
  R.journal.push({ vp: k, overflowX: o.overflowX, imgs: o.imgs.length, scrollH: o.scrollH,
    devStrings: scanDevStrings(o.text), text: o.text.slice(0, 200) })
  await shot(page, `desktop-journal-${k}`, true)
}
console.log('\n[Journal 桌面] ' + R.journal.map((r) => `${r.vp}:${r.overflowX ? '⚠溢出' : 'ok'}/img${r.imgs}`).join('  '))

R.consoleErrors = consoleErrors
R.failedRequests = failedRequests
writeFileSync(`${OUT}/desktop-final.json`, JSON.stringify(R, null, 2))
console.log(`\nconsole error ${consoleErrors.length} · 失败请求 ${failedRequests.length}`)
await browser.close()
