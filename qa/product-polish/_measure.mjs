import { VIEWPORTS, launch, BASE } from './walkthrough.mjs'
const { b, page } = await launch(VIEWPORTS.d1920)
await page.goto(BASE + '/table/reveal', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
for (const [k, v] of Object.entries(VIEWPORTS)) {
  await page.setViewportSize({ width: v.width, height: v.height })
  await page.waitForTimeout(700)
  const m = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('img, [class*="CardFrame"]')]
    // 牌桌容器：包含绝对定位牌位的那个 relative flex-1
    const board = [...document.querySelectorAll('div')].find(
      (d) => d.className.includes('flex-1') && d.querySelector('[style*="position: absolute"], .absolute'),
    )
    const bb = board?.getBoundingClientRect()
    const root = document.documentElement
    return {
      vw: root.clientWidth,
      vh: root.clientHeight,
      boardW: bb ? Math.round(bb.width) : null,
      boardH: bb ? Math.round(bb.height) : null,
      cardW: cards.length ? Math.round(Math.max(...cards.map((c) => c.getBoundingClientRect().width))) : 0,
    }
  })
  console.log(
    `${k.padEnd(6)} 视口 ${String(m.vw).padStart(4)}×${m.vh}  牌桌 ${m.boardW}×${m.boardH}  牌宽 ${m.cardW}px`,
  )
}
await b.close()
