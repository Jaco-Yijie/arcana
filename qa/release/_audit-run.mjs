import { writeFileSync } from 'node:fs'
import { VIEWPORTS, launch, BASE } from '../product-polish/walkthrough.mjs'
import { makeRecorder, fmtSummary } from './_network-audit.mjs'

const vp = VIEWPORTS[process.argv[2] || 'm390']
const { b, page, errors } = await launch(vp)
const rec = makeRecorder(page)
const wait = (ms) => page.waitForTimeout(ms)
const out = {}

async function snap(tag) {
  const by = rec.summary()
  const rows = [...rec.rows]
  const text = fmtSummary(tag, by, rows)
  console.log('\n' + text)
  writeFileSync(`qa/release/network-${tag}.txt`, text + '\n\n--- 逐条 ---\n' +
    rows.map((r) => `${String(r.status).padEnd(4)} ${r.kind.padEnd(16)} ${String(r.bytes).padStart(8)}B  ${r.url}`).join('\n'))
  out[tag] = { summary: by, artworkUrls: [...new Set(rows.filter((r) => /artwork|card-back|cover/.test(r.kind)).map((r) => r.url))] }
  rec.reset()
}

/* ── 1. Home 冷启动 ── */
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await wait(1800)
await snap('home')

/* ── 2. Deck Library ── */
await page.getByText('带着问题来').click()
await page.waitForURL('**/decks'); await wait(2500)
await snap('deck-library')
/* 滚到底，看懒加载是否只按可视区加载 */
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await wait(2500)
await snap('deck-library-scrolled')

/* ── 3. 走到 Draw（FanSpread 78 张） ── */
await page.getByRole('button', { name: '就用这副' }).click()
await page.waitForURL('**/question**'); await wait(1200)
const ta = page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click(); await wait(1800)
await page.getByRole('button', { name: '用优化后的' }).click(); await wait(1400)
await page.getByRole('button', { name: /二选一/ }).first().click(); await wait(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle'); await wait(1600)
rec.reset()
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await wait(320)
}
await wait(1200)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut'); await wait(1600)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await wait(900)
await page.getByRole('button', { name: '从这里切开' }).click(); await wait(2000)
await page.getByRole('button', { name: '合起来' }).click(); await wait(1800)
rec.reset()
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 20000 }); await wait(3500)
await snap('draw')   /* ← FanSpread 78 张在这里 */

/* ── 4. 摆牌 + Reveal ── */
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
await snap('draw-placed')
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal'); await wait(2500)
await snap('reveal-before-flip')
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await wait(1400)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await wait(700) }
}
await wait(1000)
await snap('reveal-flipped')

/* ── 5. Reading ── */
await page.getByRole('button', { name: /解读|开始/ }).first().click()
await page.waitForURL('**/reading', { timeout: 30000 })
for (let i = 0; i < 90; i++) {
  await wait(2000)
  const t = await page.evaluate(() => document.body.innerText)
  if (t.length > 400 && !t.includes('正在')) break
}
await wait(1500)
await snap('reading')

/* ── 6. Journal ── */
await page.getByRole('button', { name: '存入日记' }).click(); await wait(1500)
await page.goto(BASE + '/journal', { waitUntil: 'networkidle' }); await wait(2000)
await snap('journal')

writeFileSync('qa/release/asset-request-summary.json', JSON.stringify(out, null, 2))
if (errors.length) console.log('\n⚠ console errors:\n  ' + errors.join('\n  '))
console.log('\n[写入] qa/release/network-*.txt · asset-request-summary.json')
await b.close()
