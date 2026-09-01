/**
 * D3 · 桌面档位与画质验证（§24）
 * 走到 Reveal 后逐档改视口，观察实际取到的档位、显示尺寸与源像素是否够用。
 */
import { VIEWPORTS, launch, BASE } from '../product-polish/walkthrough.mjs'
const { b, page, errors } = await launch(VIEWPORTS.m390)
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.getByText('带着问题来').click(); await page.waitForURL('**/decks'); await wait(1500)
await page.getByRole('button', { name: '就用这副' }).click()
await page.waitForURL('**/question**'); await wait(1000)
const ta = page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click(); await wait(1800)
await page.getByRole('button', { name: '用优化后的' }).click(); await wait(1400)
await page.getByRole('button', { name: /二选一/ }).first().click(); await wait(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle'); await wait(1500)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await wait(300)
}
await wait(1100)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut'); await wait(1500)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await wait(900)
await page.getByRole('button', { name: '从这里切开' }).click(); await wait(1900)
await page.getByRole('button', { name: '合起来' }).click(); await wait(1700)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 20000 }); await wait(3000)
const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await wait(850)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await wait(110); await page.mouse.up(); await wait(950)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal'); await wait(2200)
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await wait(1300)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await wait(650) }
}
await wait(1000)

console.log('视口          牌宽css  dpr  需要设备px  档位    源像素  源/需   判定        牌阵溢出')
for (const k of ['m360', 'm390', 't768', 'd1024', 'd1440', 'd1920']) {
  const v = VIEWPORTS[k]
  await page.setViewportSize({ width: v.width, height: v.height })
  await wait(1400)
  const r = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
    if (!imgs.length) return null
    const i = imgs.reduce((a, c) => (c.getBoundingClientRect().width > a.getBoundingClientRect().width ? c : a))
    return {
      variant: /\/thumbs\//.test(i.currentSrc) ? 'thumb' : 'full',
      cssW: Math.round(i.getBoundingClientRect().width),
      natW: i.naturalWidth,
      dpr: window.devicePixelRatio,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    }
  })
  if (!r) { console.log(`${k} 未取到牌面`); continue }
  if (k === 'd1440' || k === 'd1920') {
    const all = await page.evaluate(() => [...document.querySelectorAll('img')]
      .filter((i) => /\/decks\//.test(i.currentSrc))
      .slice(0, 2)
      .map((i) => {
        /* 往上找带 inline width 的祖先 —— 那个就是 RevealPage 用 slot.card.w 摆的盒子，
           也就是 FlipCard 收到的 width / TarotCardFace 收到的 displayWidth */
        let el = i.parentElement
        const chain = []
        while (el && chain.length < 6) {
          chain.push({
            tag: el.tagName,
            styleW: el.style.width || null,
            rectW: +el.getBoundingClientRect().width.toFixed(2),
          })
          el = el.parentElement
        }
        return {
          imgW: +i.getBoundingClientRect().width.toFixed(2),
          nat: i.naturalWidth,
          src: i.currentSrc.split('/').slice(-2).join('/'),
          dpr: window.devicePixelRatio,
          chain,
        }
      }))
    console.log(`   [debug ${k}] ` + JSON.stringify(all))
  }
  const need = Math.round(r.cssW * r.dpr)
  const ratio = (r.natW / need).toFixed(2)
  console.log(
    `${k.padEnd(6)} ${String(v.width).padStart(4)}×${String(v.height).padEnd(4)} ${String(r.cssW).padStart(6)}  ${r.dpr}  ${String(need).padStart(10)}  ` +
    `${r.variant.padEnd(6)} ${String(r.natW).padStart(6)}  ${ratio.padStart(5)}   ` +
    `${r.natW >= need ? '✅ 不会糊' : '❌ 变糊'}   ${r.overflowX ? '⚠是' : '否'}`,
  )
  await page.screenshot({ path: `qa/release/desktop-variant-${k}.png` })
}
if (errors.length) console.log('\n⚠ console errors:\n  ' + errors.join('\n  '))
await b.close()
