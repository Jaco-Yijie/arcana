/**
 * D2 Before / After 取证。同一脚本、同一视口、同一流程跑两次：
 *   PHASE=before  （git stash 掉 D2 的 UI 改动时跑）
 *   PHASE=after   （改动恢复后跑）
 * 保证 before/after 唯一的变量是代码本身。
 */
import { VIEWPORTS, launch, probe, BASE } from './walkthrough.mjs'

const PHASE = process.env.PHASE || 'after'
const OUT = 'qa/product-polish/d2'
const tag = (n) => `${OUT}/${n}-${PHASE}.png`

const sizes = []

/* ── Deck Library ── */
for (const [k, vp] of [['mobile', VIEWPORTS.m390], ['desktop', VIEWPORTS.d1440]]) {
  const { b, page } = await launch(vp)
  await page.goto(BASE + '/decks', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: tag(`deck-library-${k}`) })
  const p = await probe(page, k)
  const txt = await page.evaluate(() => document.body.innerText)
  console.log(`[${PHASE}] deck-library ${k}: 行数=${(txt.match(/看看这套/g) || []).length} · 素材未提供=${(txt.match(/素材未提供/g) || []).length} · 封面未提供=${(txt.match(/封面未提供/g) || []).length} · scrollH=${p.scrollH}`)
  await b.close()
}

/* ── 走到 Reveal / Reading，扫关键视口 ── */
const { b, page } = await launch(VIEWPORTS.m390)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.getByText('带着问题来').click()
await page.waitForURL('**/decks')
await page.getByRole('button', { name: '就用这副' }).click()
await page.waitForURL('**/question**')
const ta = page.locator('textarea').first()
await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click()
await page.waitForTimeout(2200)
await page.screenshot({ path: tag('question-optimize-mobile') })
const optTxt = await page.evaluate(() => document.body.innerText)
const quoted = optTxt.match(/在「([^」]*)」/)
console.log(`[${PHASE}] 优化后引用 = 「${quoted ? quoted[1] : '(未匹配)'}」`)
await page.getByRole('button', { name: '用优化后的' }).click()
await page.waitForTimeout(1400)
await page.getByRole('button', { name: /二选一/ }).first().click()
await page.waitForTimeout(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle')
await page.waitForTimeout(1200)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s2 = 1; s2 <= 6; s2++) await page.mouse.move(105 + s2 * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await page.waitForTimeout(320)
}
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut'); await page.waitForTimeout(1400)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await page.waitForTimeout(900)
await page.getByRole('button', { name: '从这里切开' }).click(); await page.waitForTimeout(1800)
await page.getByRole('button', { name: '合起来' }).click(); await page.waitForTimeout(1600)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw'); await page.waitForTimeout(2200)

const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await page.waitForTimeout(900)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++) await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await page.waitForTimeout(120); await page.mouse.up(); await page.waitForTimeout(1000)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal'); await page.waitForTimeout(1600)

const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1])
  await page.waitForTimeout(1300)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await page.waitForTimeout(600) }
}
await page.waitForTimeout(900)

async function sweep(name) {
  const before = page.viewportSize()
  for (const [vk, v] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize({ width: v.width, height: v.height })
    await page.waitForTimeout(900)
    if (['m360', 'd1024', 'd1440', 'd1920'].includes(vk))
      await page.screenshot({ path: tag(`${name}-${vk}`) })
    const pr = await probe(page, vk)
    const imgs = pr.els.filter((e) => e.tag === 'IMG')
    const w = imgs.length ? Math.max(...imgs.map((e) => e.w)) : 0
    sizes.push({ phase: PHASE, page: name, vp: vk, cardW: w })
    console.log(`[${PHASE}] ${name.padEnd(8)} ${vk.padEnd(6)} 最大牌宽=${w}px`)
  }
  await page.setViewportSize(before); await page.waitForTimeout(600)
}
await sweep('reveal')

await page.getByRole('button', { name: '开始完整解读' }).click()
await page.waitForTimeout(2500)
await page.getByRole('button', { name: /标准解读/ }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: '开始解读' }).click()
for (let i = 0; i < 100; i++) {
  await page.waitForTimeout(3000)
  const t = await page.evaluate(() => document.body.innerText)
  if (!t.includes('正在解读牌面') && t.length > 400) break
}
await page.waitForTimeout(1200)
await sweep('reading')
await page.screenshot({ path: tag('reading-full-mobile'), fullPage: true })

// 追问区
const fu = page.getByRole('textbox', { name: '继续问这次牌阵' })
if (await fu.count()) {
  await fu.scrollIntoViewIfNeeded(); await page.waitForTimeout(600)
} else {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)
}
await page.screenshot({ path: tag('followup-mobile') })

console.log('\n' + JSON.stringify(sizes))
await b.close()
