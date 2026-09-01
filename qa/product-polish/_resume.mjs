import { chromium } from '/private/tmp/claude-501/-Users-wangyijie/c094371c-a2a3-4263-94a4-c839d933c8b0/scratchpad/node_modules/playwright-core/index.mjs'
import { VIEWPORTS, shot, probe, fmtProbe, BASE } from './walkthrough.mjs'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: VIEWPORTS.m390, deviceScaleFactor: 2 })
const page = await ctx.newPage()

// 走到洗牌页就中断
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.getByText('随缘抽一张').click()
await page.waitForTimeout(1000)
await page.getByRole('button', { name: '直接随缘' }).click()
await page.waitForTimeout(1400)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForTimeout(1600)
console.log('中断于:', page.url().replace(BASE, ''))

// 模拟关掉再回来
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1400)
await shot(page, 'mobile', 'resume-home-m390')
console.log('\n=== 回到首页（存在未完成会话）===')
console.log(fmtProbe(await probe(page, 'resume home')))
console.log('\n' + (await page.evaluate(() => document.body.innerText)))
await b.close()
