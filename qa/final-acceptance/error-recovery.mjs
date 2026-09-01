/**
 * D4 · 错误恢复验收
 * 五种故障各注入一次，每次都必须确认：牌 / 问题 / 牌阵 / 正逆位全部保留，Retry 不重新抽牌。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, observe, shot, session } from './_lib.mjs'

const CASE = process.argv[2] || 'unavailable'
const { browser, page, consoleErrors } = await open('m390')
const W = (ms) => wait(page, ms)
const R = { case: CASE }

/* 注入 */
if (CASE === 'unavailable') await page.route('**/api/tarot/reading**', (r) => r.abort('failed'))
if (CASE === 'timeout') await page.route('**/api/tarot/reading**', async (r) => { await new Promise((x) => setTimeout(x, 60000)); await r.abort('timedout') })
if (CASE === 'rate-limit') await page.route('**/api/tarot/reading**', (r) => r.fulfill({
  status: 429, contentType: 'application/json',
  body: JSON.stringify({ ok: false, error: { code: 'rate-limited', message: '请求有点频繁，稍等一下再试。这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。', retryable: true } }) }))
if (CASE === 'artwork-404') await page.route('**/assets/decks/**', (r) => r.fulfill({ status: 404, body: '' }))
if (CASE === 'stream-cut') {
  let n = 0
  await page.route('**/api/tarot/reading/stream**', async (r) => {
    n++
    if (n === 1) await r.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"type":"partial"}\n\n' })
    else await r.continue()
  })
}
console.log(`[注入] ${CASE}`)

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1200)
await page.getByText('带着问题来').click()
await page.waitForURL(/\/(decks|question)/, { timeout: 15000 }); await W(1400)
if (page.url().includes('/decks')) {
  await page.getByRole('button', { name: '就用这副' }).click()
  await page.waitForURL('**/question**', { timeout: 15000 }); await W(1200)
}
const Q = '我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？'
const ta = page.locator('textarea').first(); await ta.click(); await ta.fill(Q)
await page.getByRole('button', { name: '继续' }).click(); await W(2000)
await page.getByRole('button', { name: '用优化后的' }).click(); await W(1600)
await page.getByRole('button', { name: /二选一/ }).first().click(); await W(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle', { timeout: 15000 }); await W(1400)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await W(300)
}
await W(1000)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut', { timeout: 15000 }); await W(1400)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await W(800)
await page.getByRole('button', { name: '从这里切开' }).click(); await W(1900)
await page.getByRole('button', { name: '合起来' }).click(); await W(1700)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 25000 }); await W(3000)
const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await W(880)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await W(110); await page.mouse.up(); await W(880)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal', { timeout: 15000 }); await W(2000)
const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await W(1200)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await W(600) }
}
await W(900)
const revealObs = await observe(page)
R.revealOk = revealObs.brokenImgs === 0 || CASE === 'artwork-404'
R.revealText = revealObs.text
R.revealBroken = revealObs.brokenImgs
R.revealOverflowX = revealObs.overflowX
await shot(page, `err-${CASE}-reveal`)

const before = await session(page)
R.sessionBeforeError = before

if (CASE === 'artwork-404') {
  /* 资产 404 场景：核心是牌阵仍完整、流程可继续 */
  R.artworkFallbackOk = !revealObs.overflowX && /开始完整解读/.test(revealObs.text)
  console.log(`[资产 404] 牌位与正逆位: ${revealObs.text.replace(/\n+/g, ' | ').slice(0, 200)}`)
  console.log(`[资产 404] 布局不崩=${!revealObs.overflowX} CTA可点=${/开始完整解读/.test(revealObs.text)} 图失败=${revealObs.brokenImgs}`)
} else {
  await page.getByRole('button', { name: '开始完整解读' }).click()
  await page.waitForURL('**/reading', { timeout: 20000 }); await W(1200)
  const d = page.getByRole('button', { name: /标准解读/ }).first()
  if (await d.count()) { await d.click(); await W(700) }
  const go = page.getByRole('button', { name: '开始解读' })
  if (await go.count()) await go.click()
  /* 等错误面板出现 */
  for (let i = 0; i < 45; i++) {
    await W(2000)
    const t = await page.evaluate(() => document.body.innerText)
    if (/重新|再试|失败|没有成功|太长|频繁|没有连上/.test(t)) break
  }
  const errObs = await observe(page)
  R.errorText = errObs.text
  R.errorControls = errObs.controls.map((c) => c.label).filter(Boolean)
  R.showsHttpCode = /HTTP|\b(401|403|429|500|502|503)\b/.test(errObs.text)
  R.saysCardsKept = /牌仍然保留|牌还在|仍然保留/.test(errObs.text)
  await shot(page, `err-${CASE}-error`)
  console.log(`[错误面板] ${errObs.text.replace(/\n+/g, ' | ').slice(0, 300)}`)
  console.log(`[控件] ${R.errorControls.join(' | ')}`)
  console.log(`[暴露 HTTP 码] ${R.showsHttpCode ? '❌ 是' : '✅ 否'}`)
  console.log(`[明说牌保留] ${R.saysCardsKept ? '✅ 是' : '⚠ 否'}`)

  const afterErr = await session(page)
  R.sessionAfterError = afterErr
  R.sessionUnchangedAfterError = JSON.stringify(before) === JSON.stringify(afterErr)

  /* Retry —— 解除注入后重试，必须用同一副牌 */
  await page.unroute('**/api/tarot/reading**').catch(() => {})
  const retry = page.getByRole('button', { name: /重新|再试|重试/ }).first()
  if (await retry.count()) {
    await retry.click()
    for (let i = 0; i < 60; i++) {
      await W(2000)
      const t = await page.evaluate(() => document.body.innerText)
      if (t.length > 500 && !/正在|稍候/.test(t)) break
    }
    const afterRetry = await session(page)
    R.sessionAfterRetry = afterRetry
    R.cardsSameAfterRetry = JSON.stringify(before.cardIds) === JSON.stringify(afterRetry.cardIds)
      && JSON.stringify(before.orientations) === JSON.stringify(afterRetry.orientations)
      && before.id === afterRetry.id && before.question === afterRetry.question
      && before.spreadId === afterRetry.spreadId
    console.log(`[Retry] 牌/正逆位/问题/牌阵/会话 全部不变: ${R.cardsSameAfterRetry ? '✅' : '❌'}`)
    if (!R.cardsSameAfterRetry) {
      console.log('  before: ' + JSON.stringify(before))
      console.log('  after : ' + JSON.stringify(afterRetry))
    }
    await shot(page, `err-${CASE}-retry`)
  } else {
    R.retryButtonMissing = true
    console.log('[Retry] ⚠ 未找到重试按钮')
  }
}
R.consoleErrors = consoleErrors
writeFileSync(`${OUT}/error-${CASE}.json`, JSON.stringify(R, null, 2))
console.log(`console error ${consoleErrors.length}`)
await browser.close()
