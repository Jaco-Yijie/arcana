import { VIEWPORTS, launch, BASE } from './walkthrough.mjs'
const { b, page } = await launch(VIEWPORTS.d1440)
await page.goto(BASE + '/decks', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
// 滚到「现行牌组」分隔线
await page.getByText('现行牌组').scrollIntoViewIfNeeded()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'qa/product-polish/deck-library/decks-real-d1440.png' })
// 再往下一屏，看两套真牌
await page.mouse.wheel(0, 700)
await page.waitForTimeout(1200)
await page.screenshot({ path: 'qa/product-polish/deck-library/decks-real2-d1440.png' })
console.log('ok')
await b.close()
