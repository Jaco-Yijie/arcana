/**
 * D3 · 档位决策的 DPR 边界验证
 *
 * 降档必须「按构造不可能变糊」。所以要证明的是两件事：
 *   1. thumb 够用时才降档（DPR2 的 112px 牌：需要 224px，thumb 240px → 降档）
 *   2. thumb 不够时绝不降档（DPR3 的同一张牌：需要 336px > 240px → 仍取 full）
 * 只验证第 1 条等于只验证了对自己有利的那一半。
 */
import { VIEWPORTS, BASE } from '../product-polish/walkthrough.mjs'

const PW = process.env.PW_CORE
  || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
const { chromium } = await import(PW)

async function probe(vpKey, dpr) {
  const vp = VIEWPORTS[vpKey]
  const b = await chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: dpr,
  })
  const page = await ctx.newPage()
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
  const cx = Math.round(vp.width * 0.27)
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(cx, 640); await page.mouse.down()
    for (let s = 1; s <= 6; s++) await page.mouse.move(cx + s * 30, 640 + (i % 2 ? 12 : -12))
    await page.mouse.up(); await wait(300)
  }
  await wait(1000)
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
  const r = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
    const t = performance.getEntriesByType('resource').filter((e) => /\/decks\//.test(e.name))
    return {
      dpr: window.devicePixelRatio,
      cards: imgs.map((i) => ({
        variant: /\/thumbs\//.test(i.currentSrc) ? 'thumb' : 'full',
        cssW: Math.round(i.getBoundingClientRect().width),
        natW: i.naturalWidth,
      })),
      artworkKB: +(t.reduce((s, e) => s + e.transferSize, 0) / 1024).toFixed(1),
      fullOverNet: t.filter((e) => /\/cards\//.test(e.name) && e.transferSize > 0).length,
    }
  })
  await b.close()
  return { vpKey, vp, ...r }
}

const cases = [['m390', 2], ['m390', 3], ['d1440', 1], ['d1920', 2]]
console.log('视口    DPR  牌宽css  需要设备px  实际档位  原图px  倍率   full过网  artworkKB  判定')
for (const [k, dpr] of cases) {
  const r = await probe(k, dpr)
  const c = r.cards[0]
  if (!c) { console.log(`${k} dpr${dpr}  ⚠ 未取到牌面`); continue }
  const need = c.cssW * r.dpr
  const ratio = (c.natW / need).toFixed(2)
  const ok = c.natW >= need ? '✅ 源像素≥所需' : '❌ 变糊'
  console.log(
    `${k.padEnd(6)} ${String(r.dpr).padStart(3)}  ${String(c.cssW).padStart(7)}  ${String(need).padStart(10)}  ` +
    `${c.variant.padEnd(8)} ${String(c.natW).padStart(6)}  ${ratio.padStart(5)}  ${String(r.fullOverNet).padStart(8)}  ` +
    `${String(r.artworkKB).padStart(9)}  ${ok}`,
  )
}
