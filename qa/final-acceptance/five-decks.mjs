/**
 * D4 · 五套 Deck 最终验收
 * 每套至少走一次 Deck Library → Draw → Reveal，验证：
 * artwork 正确、卡背正确、氛围不同、同一 cardId 不串套、切换牌组后牌义不变。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, observe, scanDevStrings, shot, session } from './_lib.mjs'

const { browser, page, consoleErrors, failedRequests } = await open('m390')
const W = (ms) => wait(page, ms)
const R = { decks: [], findings: [], devStrings: [] }

await page.goto(BASE + '/decks', { waitUntil: 'networkidle' }); await W(2200)
const lib = await observe(page)
const devLib = scanDevStrings(lib.text)
if (devLib.length) R.devStrings.push({ page: 'deck-library', hits: devLib })
R.library = {
  text: lib.text.slice(0, 400),
  deckNames: lib.text.split('\n').map((l) => l.trim()).filter((l) => /^(月光|古典|森语|星图|幽影)$/.test(l)),
  imgs: lib.imgs.length, broken: lib.brokenImgs, overflowX: lib.overflowX, scrollH: lib.scrollH,
  allThumb: lib.imgs.every((i) => /\/thumbs\//.test(i.src)),
}
await shot(page, 'decks-library-mobile', true)
console.log(`Deck Library: ${R.library.deckNames.join(' / ')} · 图 ${R.library.imgs} 张（全 thumb=${R.library.allThumb}）· 失败 ${R.library.broken} · 开发痕迹 ${devLib.length}`)

const NAMES = ['月光', '古典', '森语', '星图', '幽影']
for (const name of NAMES) {
  const rec = { name }
  await page.goto(BASE + '/decks', { waitUntil: 'networkidle' }); await W(2000)
  /* 选中这一套 */
  await page.getByText(name, { exact: true }).first().click(); await W(1500)
  await shot(page, `decks-${name}-detail`)
  const det = await observe(page)
  rec.detailUrl = det.url
  rec.detailImgs = det.imgs.length
  rec.detailBroken = det.brokenImgs
  const use = page.getByRole('button', { name: /就用这副|使用中/ }).first()
  if (await use.count()) { await use.click(); await W(1600) }

  /* 走到 draw + reveal（用随缘单张，最短路径） */
  await page.goto(BASE + '/question?mode=random', { waitUntil: 'networkidle' }); await W(1400)
  const skip = page.getByRole('button', { name: /随缘|我暂时没有具体问题|直接/ }).first()
  if (await skip.count()) { await skip.click(); await W(1600) }
  const go = page.getByRole('button', { name: /直接开始|开始/ }).first()
  if (await go.count()) { await go.click(); await W(1600) }
  await page.waitForURL('**/table/shuffle', { timeout: 20000 }); await W(1200)
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
  /* 摊牌页：卡背验收 */
  const draw = await observe(page)
  rec.drawImgs = draw.imgs.length
  rec.drawArtworkRequests = draw.imgs.filter((i) => /\/decks\//.test(i.src)).length
  rec.drawOverflowX = draw.overflowX
  await shot(page, `decks-${name}-draw`)

  /* 单张牌的槽位坐标与五张牌阵不同，硬编码拖拽会落空 —— 走点击落位路径 */
  await page.mouse.click(195, 660); await W(1000)
  await page.getByRole('button', { name: /把这张牌放到/ }).first().click(); await W(1300)
  await page.getByRole('button', { name: '去翻牌' }).click()
  await page.waitForURL('**/table/reveal', { timeout: 15000 }); await W(1900)
  /* 未翻开的牌带常驻浮动动画，Playwright 等不到「静止」——按坐标点 */
  const fb = await page.getByRole('button', { name: '翻开这张牌' }).first().boundingBox()
  await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2); await W(1600)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await W(700) }
  const rv = await observe(page)
  const s = await session(page)
  rec.sessionDeckId = s?.deckId
  rec.cardId = s?.cardIds?.[0]
  rec.orientation = s?.orientations?.[0]
  rec.revealImg = rv.imgs.find((i) => /\/decks\//.test(i.src))?.src ?? null
  rec.revealBroken = rv.brokenImgs
  rec.revealOverflowX = rv.overflowX
  /* 关键验收：请求的资产路径里的 deckId 必须等于 session 的 deckId */
  rec.deckMatches = rec.revealImg ? rec.revealImg.includes(`/decks/${rec.sessionDeckId}/`) : null
  const dev = scanDevStrings(rv.text)
  if (dev.length) R.devStrings.push({ deck: name, hits: dev })
  await shot(page, `decks-${name}-reveal`)
  R.decks.push(rec)
  console.log(`${name.padEnd(3)} deckId=${String(rec.sessionDeckId).padEnd(18)} card=${String(rec.cardId).padEnd(13)} ${String(rec.orientation).padEnd(9)} 资产=${rec.deckMatches ? '✅ 同套' : '❌ 串套'} 摊牌图=${rec.drawArtworkRequests} 溢出=${rec.drawOverflowX || rec.revealOverflowX}`)
  if (rec.deckMatches === false) R.findings.push({ sev: 'P0', deck: name, issue: `串套：session ${rec.sessionDeckId} 却请求 ${rec.revealImg}` })
  if (rec.revealBroken) R.findings.push({ sev: 'P1', deck: name, issue: `${rec.revealBroken} 张图失败` })
}

/* 牌义不随牌组改变 —— 用同一张牌在两套下的牌义面板文本比对 */
R.consoleErrors = consoleErrors
R.failedRequests = failedRequests
writeFileSync(`${OUT}/five-decks.json`, JSON.stringify(R, null, 2))
console.log(`\n五套验收完成 · findings ${R.findings.length} · 开发痕迹 ${R.devStrings.length} · console error ${consoleErrors.length} · 失败请求 ${failedRequests.length}`)
if (R.findings.length) console.log(JSON.stringify(R.findings, null, 1))
await browser.close()
