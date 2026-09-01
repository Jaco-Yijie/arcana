import { VIEWPORTS, launch, shot, probe, fmtProbe, BASE } from './walkthrough.mjs'
const { b, page, errors } = await launch(VIEWPORTS.m390)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.getByText('带着问题来').click()
await page.waitForTimeout(1200)
console.log('URL:', page.url())
await shot(page, 'mobile', 'question-empty-m390')
console.log(fmtProbe(await probe(page, 'question 空态 m390')))

// 输入问题
const ta = page.locator('textarea').first()
await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.waitForTimeout(900)
await shot(page, 'mobile', 'question-filled-m390')
console.log('\n--- 填入问题后 ---')
console.log(fmtProbe(await probe(page, 'question 已填 m390')))
if (errors.length) console.log('⚠ console:', errors.join(' | '))
await b.close()
