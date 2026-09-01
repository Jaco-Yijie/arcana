/**
 * D4 · Resume 验收
 * Journey A 结束时 Resume 不出现是**正确的** —— 会话已完成并存入日记，没有东西可恢复。
 * 真正要验的是「中途离开再回来」。这里在三个不同阶段各中断一次。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, observe, shot, session } from './_lib.mjs'

const { browser, page, consoleErrors } = await open('m390')
const W = (ms) => wait(page, ms)
const R = { cases: [] }

async function fresh() {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1200)
}

async function runTo(stage) {
  await page.getByText('带着问题来').click()
  await page.waitForURL(/\/(decks|question)/, { timeout: 15000 }); await W(1400)
  if (page.url().includes('/decks')) {
    await page.getByRole('button', { name: '就用这副' }).click()
    await page.waitForURL('**/question**', { timeout: 15000 }); await W(1200)
  }
  const ta = page.locator('textarea').first(); await ta.click()
  await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
  await page.getByRole('button', { name: '继续' }).click(); await W(2000)
  await page.getByRole('button', { name: '用优化后的' }).click(); await W(1600)
  await page.getByRole('button', { name: /二选一/ }).first().click(); await W(1600)
  await page.getByRole('button', { name: '直接开始' }).click()
  await page.waitForURL('**/table/shuffle', { timeout: 15000 }); await W(1500)
  if (stage === 'shuffle') return
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(105, 640); await page.mouse.down()
    for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
    await page.mouse.up(); await W(300)
  }
  await W(1000)
  await page.getByRole('button', { name: '洗好了' }).click()
  await page.waitForURL('**/table/cut', { timeout: 15000 }); await W(1400)
  if (stage === 'cut') return
  await page.mouse.move(307, 412); await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
  await page.mouse.up(); await W(800)
  await page.getByRole('button', { name: '从这里切开' }).click(); await W(1900)
  await page.getByRole('button', { name: '合起来' }).click(); await W(1700)
  await page.getByRole('button', { name: '摊开牌' }).click()
  await page.waitForURL('**/table/draw', { timeout: 25000 }); await W(3000)
  /* 摆 2 张就走人 —— 验证「已摆 2/5」这种部分进度 */
  const SLOTS = [[195, 454], [70, 285]]
  const FAN_X = [150, 205]
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(FAN_X[i], 660); await W(880)
    const [sx, sy] = SLOTS[i]
    await page.mouse.move(129, 580); await page.mouse.down()
    for (let k = 1; k <= 12; k++)
      await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
    await W(110); await page.mouse.up(); await W(900)
  }
}

for (const stage of ['shuffle', 'cut', 'draw-partial']) {
  await fresh()
  await runTo(stage)
  const before = await session(page)
  /* 真正的「离开」：关掉页面再回来 */
  await page.goto('about:blank'); await W(700)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1800)
  const home = await observe(page)
  const hasResume = /继续|未完成/.test(home.text)
  await shot(page, `resume-${stage}-home`)
  const rec = {
    stage, hasResume,
    homeSnippet: home.text.split('\n').filter(Boolean).slice(0, 8).join(' | '),
    sessionBefore: before,
  }
  if (hasResume) {
    const btn = page.getByRole('button', { name: /继续/ }).first()
    if (await btn.count()) {
      await btn.click(); await W(2500)
      const after = await session(page)
      rec.resumedUrl = page.url().replace(BASE, '')
      rec.sessionAfter = after
      rec.identical = JSON.stringify(before) === JSON.stringify(after)
      await shot(page, `resume-${stage}-resumed`)
    }
  }
  R.cases.push(rec)
  console.log(`\n[${stage}]`)
  console.log(`  首页出现恢复入口: ${hasResume ? '✅' : '❌'}`)
  console.log(`  首页文案: ${rec.homeSnippet}`)
  if (rec.resumedUrl) {
    console.log(`  点「继续」后到达: ${rec.resumedUrl}`)
    console.log(`  session 逐字节不变: ${rec.identical ? '✅' : '❌'}`)
    if (!rec.identical) {
      console.log(`    before: ${JSON.stringify(before).slice(0, 300)}`)
      console.log(`    after : ${JSON.stringify(rec.sessionAfter).slice(0, 300)}`)
    }
  }
}
R.consoleErrors = consoleErrors
writeFileSync(`${OUT}/resume.json`, JSON.stringify(R, null, 2))
console.log(`\nconsole error ${consoleErrors.length}`)
await browser.close()
