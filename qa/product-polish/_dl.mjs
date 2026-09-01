import { VIEWPORTS, launch, shot, probe, BASE } from './walkthrough.mjs'
for (const [k, vp] of [['m390', VIEWPORTS.m390], ['d1440', VIEWPORTS.d1440]]) {
  const { b, page } = await launch(vp)
  await page.goto(BASE + '/decks', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `qa/product-polish/deck-library/decks-${k}-full.png`, fullPage: true })
  await shot(page, 'deck-library', `decks-${k}-viewport`)
  const p = await probe(page, k)
  console.log(`${k}: scrollH=${p.scrollH} (${(p.scrollH / p.clientH).toFixed(1)} 屏)`)
  const txt = await page.evaluate(() => document.body.innerText)
  console.log('  「素材未提供」', (txt.match(/素材未提供/g) || []).length, '次')
  console.log('  「封面未提供」', (txt.match(/封面未提供/g) || []).length, '次')
  console.log('  「素材备齐后开放」', (txt.match(/素材备齐后开放/g) || []).length, '次')
  console.log('  牌组行数：', (txt.match(/看看这套/g) || []).length)
  console.log('  0/78 行数：', (txt.match(/0 \/ 78/g) || []).length)
  console.log('  78/78 行数：', (txt.match(/78 \/ 78/g) || []).length)
  await b.close()
}
