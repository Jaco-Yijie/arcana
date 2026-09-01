import { chromium } from '/private/tmp/claude-501/-Users-wangyijie/c094371c-a2a3-4263-94a4-c839d933c8b0/scratchpad/node_modules/playwright-core/index.mjs'
import { VIEWPORTS, shot, probe, fmtProbe, BASE } from './walkthrough.mjs'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: VIEWPORTS.m390, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
const trail = ['/']
await page.getByText('随缘抽一张').click()
await page.waitForTimeout(1200)
trail.push(page.url().replace(BASE, ''))
await page.getByRole('button', { name: '直接随缘' }).click()
await page.waitForTimeout(1800)
trail.push(page.url().replace(BASE, ''))
await shot(page, 'mobile', 'random-after-direct')
console.log('路径:', trail.join('  →  '))
console.log(fmtProbe(await probe(page, '直接随缘之后')))
console.log('\n' + (await page.evaluate(() => document.body.innerText)).slice(0, 400))
await b.close()
