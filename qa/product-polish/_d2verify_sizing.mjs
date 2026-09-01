/**
 * D2 恢复复验 —— D2-07 / D2-08 尺寸专项。
 *
 * 走完整流程到 Reveal，然后逐视口测量：
 *   - 牌桌可用区（availW/availH）与牌阵实占（boardW/boardH）
 *   - 卡宽，以及横向真正未被使用的富余
 * 再进 Reading，测顶部牌条卡宽。
 * dev-only，只读，不改产品代码。
 */
import { VIEWPORTS, launch, BASE } from './walkthrough.mjs'

const vp = VIEWPORTS.m390
const { b, page, errors } = await launch(vp)
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.getByText('带着问题来').click()
await page.waitForURL('**/decks'); await wait(1200)
await page.getByRole('button', { name: '就用这副' }).click()
await page.waitForURL('**/question**'); await wait(1000)
const ta = page.locator('textarea').first()
await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click(); await wait(1800)
await page.getByRole('button', { name: '用优化后的' }).click(); await wait(1400)
await page.getByRole('button', { name: /二选一/ }).first().click(); await wait(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle'); await wait(1400)
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
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 20000 }); await wait(2400)

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
await page.waitForURL('**/table/reveal'); await wait(2200)
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await wait(1400)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await wait(700) }
}
await wait(900)

const probeReveal = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('img')]
    .map((i) => i.getBoundingClientRect())
    .filter((r) => r.width > 30 && r.height > r.width)
  if (!cards.length) return null
  const cw = Math.max(...cards.map((r) => r.width))
  const L = Math.min(...cards.map((r) => r.left))
  const R = Math.max(...cards.map((r) => r.right))
  const T = Math.min(...cards.map((r) => r.top))
  const B = Math.max(...cards.map((r) => r.bottom))
  const rowTops = [...new Set(cards.map((r) => Math.round(r.top / 20) * 20))].sort((a, b) => a - b)
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    cardW: Math.round(cw), cardH: Math.round(Math.max(...cards.map((r) => r.height))),
    n: cards.length,
    spanW: Math.round(R - L), spanH: Math.round(B - T),
    leftGap: Math.round(L), rightGap: Math.round(window.innerWidth - R),
    topGap: Math.round(T), botGap: Math.round(window.innerHeight - B),
    rows: rowTops.length,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
})

const ORDER = ['m360', 'm390', 't768', 'd1024', 'd1440', 'd1920']
console.log('\n╔══ REVEAL 牌阵（二选一 · 5 张 · 3 行）══════════════════════════════')
console.log('视口         牌宽  牌高  行数  牌阵占宽  左空  右空  上空  下空  横向未用  溢出')
const reveal = {}
for (const k of ORDER) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height })
  await wait(1000)
  const m = await probeReveal()
  reveal[k] = m
  const unused = m.leftGap + m.rightGap
  console.log(
    `${k.padEnd(6)} ${String(v.width).padStart(4)}×${String(v.height).padEnd(4)} ` +
    `${String(m.cardW).padStart(4)} ${String(m.cardH).padStart(5)} ${String(m.rows).padStart(5)} ` +
    `${String(m.spanW).padStart(8)} ${String(m.leftGap).padStart(5)} ${String(m.rightGap).padStart(5)} ` +
    `${String(m.topGap).padStart(5)} ${String(m.botGap).padStart(5)} ${String(unused).padStart(9)} ` +
    `${m.overflowX ? '⚠是' : '否'}`,
  )
  await page.screenshot({ path: `qa/product-polish/d2/recover-reveal-${k}.png` })
}

/* 1024 反常专测：与 m360 直接比 */
console.log('\n【1024 反常复验】')
console.log(`  m360 (360×800)  牌宽 ${reveal.m360.cardW}px`)
console.log(`  d1024(1024×768) 牌宽 ${reveal.d1024.cardW}px  →  ` +
  (reveal.d1024.cardW >= reveal.m360.cardW
    ? '✅ 不再小于手机'
    : `⚠ 仍比 360 手机小 ${reveal.m360.cardW - reveal.d1024.cardW}px（视口高 768 < 800，高度约束仍占优）`))

await page.setViewportSize({ width: 390, height: 844 })
await wait(900)
await page.getByRole('button', { name: /解读|开始/ }).first().click()
await page.waitForURL('**/reading', { timeout: 30000 })
console.log('\n[等待真实 DeepSeek 解读…]')
for (let i = 0; i < 90; i++) {
  await wait(2000)
  const t = await page.evaluate(() => document.body.innerText)
  if (t.length > 400 && !t.includes('正在')) break
}
await wait(1500)

console.log('\n╔══ READING 顶部牌条 ═════════════════════════')
console.log('视口         牌宽   变化 vs 62px 基线')
for (const k of ORDER) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height })
  await wait(900)
  const m = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')]
      .map((i) => i.getBoundingClientRect())
      .filter((r) => r.width > 20)
    return {
      cardW: imgs.length ? Math.round(Math.max(...imgs.map((r) => r.width))) : 0,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      clipped: imgs.some((r) => r.right > window.innerWidth + 1),
    }
  })
  const d = (((m.cardW - 62) / 62) * 100).toFixed(0)
  console.log(`${k.padEnd(6)} ${String(v.width).padStart(4)}×${String(v.height).padEnd(4)} ${String(m.cardW).padStart(5)}   ${d >= 0 ? '+' : ''}${d}%${m.clipped ? '   ⚠ 牌条右侧有裁切' : ''}${m.overflowX ? '  ⚠横向溢出' : ''}`)
  await page.screenshot({ path: `qa/product-polish/d2/recover-reading-${k}.png` })
}
if (errors.length) console.log('\n⚠ console errors:\n  ' + errors.join('\n  '))
await b.close()
