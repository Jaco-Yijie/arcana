/**
 * D4 · Acceptance Journey B —— 「随缘抽一张」
 * 验收核心问题：这个入口是不是**真的更轻**，还是只是少填了一个输入框。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, observe, scanDevStrings, shot, session } from './_lib.mjs'

const { browser, page, consoleErrors, failedRequests, apiCalls } = await open('m390')
const R = { steps: [], findings: [], devStrings: [], answers: {} }
const W = (ms) => wait(page, ms)
let n = 0
async function step(name, fn, settle = 900) {
  n++
  try { await fn() } catch (e) {
    R.findings.push({ sev: 'P0', step: name, issue: e.message.split('\n')[0], url: page.url() })
    await shot(page, `B-FAIL-${name}`)
    writeFileSync(`${OUT}/journey-b.json`, JSON.stringify(R, null, 2))
    await browser.close(); process.exit(1)
  }
  await W(settle)
  const o = await observe(page)
  const dev = scanDevStrings(o.text)
  if (dev.length) R.devStrings.push({ step: name, hits: dev })
  if (o.overflowX) R.findings.push({ sev: 'P1', step: name, issue: '横向溢出', url: o.url })
  if (o.brokenImgs) R.findings.push({ sev: 'P1', step: name, issue: `${o.brokenImgs} 张图失败`, url: o.url })
  await shot(page, `B-${String(n).padStart(2, '0')}-${name}`)
  R.steps.push({ n, name, url: o.url, controls: o.controls.map((c) => c.label).filter(Boolean), text: o.text.slice(0, 260) })
  console.log(`\n=== ${String(n).padStart(2, '0')} ${name}  ${o.url} ===`)
  console.log('   控件: ' + o.controls.map((c) => c.label).filter(Boolean).slice(0, 7).join(' | '))
  return o
}

await step('home', () => page.goto(BASE + '/', { waitUntil: 'networkidle' }), 1500)
const entry = await step('click-random', async () => {
  await page.getByText('随缘抽一张').click()
  await W(1500)
}, 1500)
R.answers.landedOn = entry.url
/* 验收点：是否被强迫填写问题？是否出现无意义的问题优化？ */
R.answers.forcedToTypeQuestion = await page.evaluate(() => {
  const ta = document.querySelector('textarea')
  if (!ta) return false
  // 有输入框不等于强迫；看有没有一条不填就走不下去的路
  const btns = [...document.querySelectorAll('button')].map((b) => b.innerText.trim())
  return !btns.some((t) => /随缘|直接|跳过|没有具体问题|我暂时/.test(t))
})
R.answers.entryControls = entry.controls.map((c) => c.label).filter(Boolean)

/* 走随缘路径：找一个「不填问题」的出口 */
await step('skip-question', async () => {
  const skip = page.getByRole('button', { name: /随缘|我暂时没有具体问题|直接/ }).first()
  if (await skip.count()) await skip.click()
  await W(1500)
}, 1600)
R.answers.afterSkipUrl = page.url()
/* 有没有出现问题优化？ */
R.answers.sawQuestionOptimizer = /换个说法试试|用优化后的/.test((await observe(page)).text)

/* 是否跳过了 spread 选择（单张牌应当自动） */
R.answers.sawSpreadPicker = page.url().includes('/spread')

if (page.url().includes('/focus') || page.url().includes('/question')) {
  await step('to-ritual', async () => {
    const go = page.getByRole('button', { name: /直接开始|开始/ }).first()
    if (await go.count()) await go.click()
    await page.waitForURL('**/table/**', { timeout: 20000 })
  }, 1600)
}
const sess0 = await session(page)
R.answers.spreadUsed = sess0?.spreadId
R.answers.mode = sess0?.mode

await step('shuffle', async () => {
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(105, 640); await page.mouse.down()
    for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
    await page.mouse.up(); await W(310)
  }
}, 1300)
await step('cut', async () => {
  await page.getByRole('button', { name: '洗好了' }).click()
  await page.waitForURL('**/table/cut', { timeout: 15000 })
}, 1500)
await step('cut-do', async () => {
  await page.mouse.move(307, 412); await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
  await page.mouse.up(); await W(800)
  await page.getByRole('button', { name: '从这里切开' }).click(); await W(2000)
  await page.getByRole('button', { name: '合起来' }).click()
}, 1900)
await step('fan', async () => {
  await page.getByRole('button', { name: '摊开牌' }).click()
  await page.waitForURL('**/table/draw', { timeout: 25000 })
}, 3200)
/* 单张牌的牌位坐标与五张牌阵不同，硬编码拖拽会落空。
   这里改走 D2-05 补的**点击落位**路径：从扇形拿起一张 → 点空牌位。
   顺带验证那条无障碍路径在真实产品里确实可用。 */
await step('place-one', async () => {
  await page.mouse.click(195, 660); await W(1000)
  const slot = page.getByRole('button', { name: /把这张牌放到/ }).first()
  await slot.click()
}, 1400)
await step('reveal-page', async () => {
  await page.getByRole('button', { name: '去翻牌' }).click()
  await page.waitForURL('**/table/reveal', { timeout: 15000 })
}, 2000)
const rv = await step('reveal-card', async () => {
  /* 未翻开的牌带一个常驻的轻微上下浮动（告诉用户「可以翻」），
     于是 Playwright 的 actionability 检查永远等不到「元素静止」而超时。
     真实用户点一张缓慢浮动的牌毫无问题，所以这里按坐标点，而不是把产品动画去掉。 */
  const btn = page.getByRole('button', { name: '翻开这张牌' }).first()
  const box = await btn.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await W(1400)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) await close.first().click()
}, 1200)
R.answers.revealText = rv.text
await step('to-reading', async () => {
  await page.getByRole('button', { name: /开始完整解读|解读/ }).first().click()
  await page.waitForURL('**/reading', { timeout: 20000 })
}, 1400)
await step('pick-depth', async () => {
  const d = page.getByRole('button', { name: /标准解读/ }).first()
  if (await d.count()) await d.click()
}, 800)
const t0 = Date.now()
await step('ai-reading', async () => {
  const go = page.getByRole('button', { name: '开始解读' })
  if (await go.count()) await go.click()
  for (let i = 0; i < 90; i++) {
    await W(2000)
    const t = await page.evaluate(() => document.body.innerText)
    if (t.length > 400 && !/正在|稍候/.test(t)) break
  }
}, 1500)
R.answers.readingSeconds = +((Date.now() - t0) / 1000).toFixed(1)
const rd = await observe(page)
R.answers.readingText = rd.text
R.answers.sessionFinal = await session(page)
await shot(page, 'B-reading-full', true)

R.consoleErrors = consoleErrors
R.failedRequests = failedRequests
R.apiCalls = apiCalls
writeFileSync(`${OUT}/journey-b.json`, JSON.stringify(R, null, 2))
console.log('\n\n############ JOURNEY B 汇总 ############')
console.log(`落地页: ${R.answers.landedOn}`)
console.log(`入口控件: ${JSON.stringify(R.answers.entryControls)}`)
console.log(`被强迫填问题: ${R.answers.forcedToTypeQuestion}`)
console.log(`出现问题优化: ${R.answers.sawQuestionOptimizer}`)
console.log(`出现牌阵选择: ${R.answers.sawSpreadPicker}`)
console.log(`实际牌阵: ${R.answers.spreadUsed} · mode=${R.answers.mode}`)
console.log(`步骤数: ${R.steps.length}`)
console.log(`解读 ${R.answers.readingSeconds}s`)
console.log(`console error ${consoleErrors.length} · 失败请求 ${failedRequests.length}`)
console.log(`开发痕迹 ${R.devStrings.length} · findings ${R.findings.length}`)
console.log(`session: ${JSON.stringify(R.answers.sessionFinal)}`)
await browser.close()
