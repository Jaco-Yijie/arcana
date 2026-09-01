/**
 * D4 · Acceptance Journey A —— 「带着问题来」完整流程
 * 视角：第一次打开 Arcana 的用户。只根据页面上看得到的信息操作。
 * 真实 DeepSeek · 真实 Artwork · 生产构建 · 不跳步。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, observe, scanDevStrings, installCLS, readCLS, shot, session, journal } from './_lib.mjs'

const VP = process.argv[2] || 'm390'
const DEPTH = process.env.DEPTH || '标准解读'
const { browser, page, consoleErrors, failedRequests, apiCalls, vp } = await open(VP)
await installCLS(page)
const R = { viewport: VP, depth: DEPTH, steps: [], findings: [], devStrings: [], answers: {} }
const W = (ms) => wait(page, ms)

let stepNo = 0
async function step(name, fn, settle = 900) {
  stepNo++
  const t0 = Date.now()
  const beforeUrl = page.url()
  try { await fn() } catch (e) {
    R.findings.push({ sev: 'P0', step: name, issue: `步骤失败: ${e.message.split('\n')[0]}`, url: page.url() })
    await shot(page, `A-${VP}-FAIL-${name}`)
    R.steps.push({ n: stepNo, name, ok: false, error: e.message.split('\n')[0], url: page.url() })
    writeFileSync(`${OUT}/journey-a-${VP}.json`, JSON.stringify(R, null, 2))
    await browser.close(); process.exit(1)
  }
  await W(settle)
  const o = await observe(page)
  const dev = scanDevStrings(o.text)
  if (dev.length) R.devStrings.push({ step: name, url: o.url, hits: dev })
  if (o.overflowX) R.findings.push({ sev: 'P1', step: name, issue: '横向溢出', url: o.url })
  if (o.brokenImgs > 0) R.findings.push({ sev: 'P1', step: name, issue: `${o.brokenImgs} 张图加载失败`, url: o.url })
  await shot(page, `A-${VP}-${String(stepNo).padStart(2, '0')}-${name}`)
  R.steps.push({
    n: stepNo, name, ok: true, ms: Date.now() - t0, url: o.url,
    urlChanged: beforeUrl !== page.url(),
    controls: o.controls.map((c) => c.label).filter(Boolean),
    smallTargets: o.smallTargets.map((c) => `${c.label}(${c.w}×${c.h})`),
    imgs: o.imgs.length, brokenImgs: o.brokenImgs, overflowX: o.overflowX,
    devStrings: dev,
  })
  console.log(`\n=== ${String(stepNo).padStart(2, '0')} ${name}  ${Date.now() - t0}ms  ${o.url} ===`)
  console.log('   可见控件: ' + o.controls.map((c) => c.label).filter(Boolean).slice(0, 8).join(' | '))
  if (dev.length) console.log('   ⚠ 开发痕迹: ' + dev.map(([w, n]) => `${w}×${n}`).join(', '))
  if (o.overflowX) console.log('   ⚠ 横向溢出')
  return o
}

const QUESTION = '我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？'

await step('home', () => page.goto(BASE + '/', { waitUntil: 'networkidle' }), 1500)
await step('choose-question-entry', async () => {
  await page.getByText('带着问题来').click()
  await page.waitForURL(/\/(decks|question)/, { timeout: 15000 })
}, 1800)

/* 产品当前是先选牌组再问问题 —— D1 记录过这个顺序。验收只如实记录用户看到的顺序 */
if (page.url().includes('/decks')) {
  R.answers.deckBeforeQuestion = true
  await step('deck-library', async () => { await W(600) }, 1500)
  await step('pick-deck', async () => {
    await page.getByRole('button', { name: '就用这副' }).click()
    await page.waitForURL('**/question**', { timeout: 15000 })
  }, 1400)
}
await step('type-question', async () => {
  const ta = page.locator('textarea').first()
  await ta.click(); await ta.fill(QUESTION)
}, 800)
const optimized = await step('optimize-question', async () => {
  await page.getByRole('button', { name: '继续' }).click()
}, 2200)
/* 记录优化后的问题原文 —— 验收要看它是不是破损句 */
R.answers.optimizedQuestionText = (optimized.text.match(/[「"][^」"]{4,60}[」"]/g) || []).slice(0, 4)
await step('confirm-question', async () => {
  await page.getByRole('button', { name: '用优化后的' }).click()
  await page.waitForURL('**/spread**', { timeout: 15000 })
}, 1600)
await step('pick-spread-5card', async () => {
  await page.getByRole('button', { name: /二选一/ }).first().click()
  await page.waitForURL('**/focus**', { timeout: 15000 })
}, 1600)
await step('focus-ritual', async () => {
  await page.getByRole('button', { name: '直接开始' }).click()
  await page.waitForURL('**/table/shuffle', { timeout: 15000 })
}, 1600)
await step('shuffle', async () => {
  const cx = Math.round(vp.width * 0.27)
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(cx, 640); await page.mouse.down()
    for (let s = 1; s <= 6; s++) await page.mouse.move(cx + s * 30, 640 + (i % 2 ? 12 : -12))
    await page.mouse.up(); await W(320)
  }
}, 1400)
await step('cut', async () => {
  await page.getByRole('button', { name: '洗好了' }).click()
  await page.waitForURL('**/table/cut', { timeout: 15000 })
}, 1600)
await step('cut-pick', async () => {
  await page.mouse.move(307, 412); await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
  await page.mouse.up()
}, 1000)
await step('cut-confirm', async () => {
  await page.getByRole('button', { name: '从这里切开' }).click()
}, 2100)
await step('cut-close', async () => {
  await page.getByRole('button', { name: '合起来' }).click()
}, 1900)
await step('fan-spread', async () => {
  await page.getByRole('button', { name: '摊开牌' }).click()
  await page.waitForURL('**/table/draw', { timeout: 25000 })
}, 3200)

/* 用户亲自选牌并摆放 */
const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await step(`place-card-${i + 1}`, async () => {
    await page.mouse.click(FAN_X[i], 660); await W(880)
    const [sx, sy] = SLOTS[i]
    await page.mouse.move(129, 580); await page.mouse.down()
    for (let k = 1; k <= 12; k++)
      await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
    await W(110); await page.mouse.up()
  }, 900)
}
const sessAfterPlace = await session(page)
R.answers.sessionAfterPlace = sessAfterPlace

await step('go-reveal', async () => {
  await page.getByRole('button', { name: '去翻牌' }).click()
  await page.waitForURL('**/table/reveal', { timeout: 15000 })
}, 2200)
for (let i = 0; i < 5; i++) {
  const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
  await step(`reveal-${i + 1}`, async () => {
    await page.mouse.click(CARDS[i][0], CARDS[i][1]); await W(1300)
    const close = page.getByRole('button', { name: '收起' })
    if (await close.count()) { await close.first().click(); await W(600) }
  }, 800)
}
/* 牌义面板 */
const meaning = await step('card-meaning-sheet', async () => {
  await page.mouse.click(194, 605); await W(1200)
}, 900)
R.answers.meaningSheetText = meaning.text.slice(-500)
await step('close-meaning-sheet', async () => {
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) await close.first().click()
}, 900)

const revealObs = await observe(page)
R.answers.revealText = revealObs.text
R.answers.revealCLS = await readCLS(page)

/* AI 解读 */
await step('go-reading-page', async () => {
  await page.getByRole('button', { name: '开始完整解读' }).click()
  await page.waitForURL('**/reading', { timeout: 30000 })
}, 1400)
/* 解读页是两步：先选档位，再点「开始解读」。
   第一版脚本用 /解读|开始/ 匹配，结果匹中的是档位选项「标准解读」——
   档位选上了，解读却从没开始，脚本还傻等了 222 秒。
   这是脚本的错，不是产品的错；但也说明这一页确实需要两次点击才能开始。 */
await step('pick-depth', async () => {
  await page.getByRole('button', { name: new RegExp(DEPTH) }).first().click()
}, 900)
const tRead = Date.now()
let firstPaint = null
await step('ai-reading', async () => {
  await page.getByRole('button', { name: '开始解读' }).click()
  for (let i = 0; i < 110; i++) {
    await W(2000)
    const t = await page.evaluate(() => document.body.innerText)
    if (!firstPaint && t.length > 300) firstPaint = Date.now() - tRead
    if (t.length > 500 && !/正在|稍候/.test(t)) break
  }
}, 1800)
R.answers.readingSeconds = +((Date.now() - tRead) / 1000).toFixed(1)
R.answers.readingFirstPaintMs = firstPaint
const readObs = await observe(page)
R.answers.readingText = readObs.text
await shot(page, `A-${VP}-reading-full`, true)

/* 追问 ×2 */
const ASKS = ['那我接下来最需要注意什么？', '如果我先不做决定，只是再观察一个月呢？']
const sessBeforeFU = await session(page)
for (let n = 0; n < 2; n++) {
  const before = (await page.evaluate(() => document.body.innerText)).length
  await step(`follow-up-${n + 1}`, async () => {
    const input = page.getByRole('textbox', { name: '继续问这次牌阵' })
    await input.scrollIntoViewIfNeeded(); await input.fill(ASKS[n])
    await page.getByRole('button', { name: '发送' }).click()
    for (let i = 0; i < 70; i++) {
      await W(2000)
      const t = await page.evaluate(() => document.body.innerText)
      if (t.includes(ASKS[n]) && t.length > before + 120 && !t.includes('正在顺着这组牌')) break
    }
  }, 1500)
}
const sessAfterFU = await session(page)
R.answers.sessionBeforeFollowUp = sessBeforeFU
R.answers.sessionAfterFollowUp = sessAfterFU
R.answers.followUpText = (await observe(page)).text
await shot(page, `A-${VP}-followup-full`, true)

/* 日记 */
await step('save-journal', async () => {
  await page.getByRole('button', { name: '存入日记' }).click()
}, 1800)
R.answers.journal = await journal(page)
await step('journal-list', async () => {
  await page.goto(BASE + '/journal', { waitUntil: 'networkidle' })
}, 1800)
await step('journal-detail', async () => {
  await page.locator('a, [role=button]').filter({ hasText: /在「|随缘|工作/ }).first().click()
}, 1800)
R.answers.journalDetailText = (await observe(page)).text.slice(0, 900)

/* 离开 → 重新进入 → Resume */
await step('leave-and-return', async () => {
  await page.goto('about:blank'); await W(600)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
}, 2000)
const homeAfter = await observe(page)
R.answers.homeAfterReturnText = homeAfter.text.slice(0, 400)
R.answers.resumeVisible = /继续|未完成/.test(homeAfter.text)

R.consoleErrors = consoleErrors
R.failedRequests = failedRequests
R.apiCalls = apiCalls
R.cls = await readCLS(page)
writeFileSync(`${OUT}/journey-a-${VP}.json`, JSON.stringify(R, null, 2))

console.log('\n\n############ JOURNEY A 汇总 ############')
console.log(`视口 ${VP} · 步骤 ${R.steps.length} · 全部通过`)
console.log(`解读 ${R.answers.readingSeconds}s · 首次出文 ${R.answers.readingFirstPaintMs}ms`)
console.log(`CLS 累计 = ${R.cls}`)
console.log(`console error = ${consoleErrors.length}`)
console.log(`失败请求 = ${failedRequests.length}` + (failedRequests.length ? '\n  ' + failedRequests.slice(0, 8).join('\n  ') : ''))
console.log(`API 调用:\n  ` + apiCalls.join('\n  '))
console.log(`开发痕迹命中 = ${R.devStrings.length}` + (R.devStrings.length ? '\n  ' + JSON.stringify(R.devStrings) : ''))
console.log(`findings = ${R.findings.length}` + (R.findings.length ? '\n  ' + JSON.stringify(R.findings, null, 1) : ''))
console.log(`\nsession 摆牌后 : ${JSON.stringify(sessAfterPlace)}`)
console.log(`session 追问前 : ${JSON.stringify(sessBeforeFU)}`)
console.log(`session 追问后 : ${JSON.stringify(sessAfterFU)}`)
console.log(`journal: ${JSON.stringify(R.answers.journal)}`)
console.log(`Resume 可见: ${R.answers.resumeVisible}`)
await browser.close()
