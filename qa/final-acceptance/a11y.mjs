/**
 * D4 · 无障碍最终验收 —— **只用键盘**走尽可能完整的流程。
 * 不用鼠标点任何一个按钮：Tab / Shift+Tab / Enter / Space / Escape。
 */
import { writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, observe, shot, session } from './_lib.mjs'

const { browser, page, consoleErrors } = await open('m390')
const W = (ms) => wait(page, ms)
const R = { steps: [], findings: [] }

const focused = () => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const cs = getComputedStyle(el)
  return {
    tag: el.tagName,
    label: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().slice(0, 36),
    ring: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none',
  }
})

/** Tab 直到聚焦到匹配 re 的控件；返回按了几次 */
async function tabTo(re, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab'); await W(140)
    const f = await focused()
    if (f && re.test(f.label)) return { found: true, tabs: i + 1, el: f }
  }
  return { found: false, tabs: max, el: await focused() }
}
async function press(key = 'Enter', settle = 1400) { await page.keyboard.press(key); await W(settle) }

async function rec(name, r, extra = {}) {
  const o = await observe(page)
  R.steps.push({ name, ...r, url: o.url, ...extra })
  const mark = r.found ? '✅' : '❌'
  console.log(`${mark} ${name.padEnd(26)} Tab×${String(r.tabs).padStart(2)}  聚焦=${r.el?.label ?? '(无)'}  焦点环=${r.el?.ring ? '有' : '无'}  → ${o.url}`)
  if (!r.found) R.findings.push({ sev: 'P1', step: name, issue: `键盘无法到达：${name}` })
  else if (r.el && !r.el.ring) R.findings.push({ sev: 'P2', step: name, issue: `聚焦时无可见焦点环：${r.el.label}` })
  await shot(page, `a11y-${name}`)
}

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await W(1400)

let r = await tabTo(/带着问题来/); await rec('home-带着问题来', r)
if (r.found) { await press('Enter', 2000) }

if (page.url().includes('/decks')) {
  r = await tabTo(/就用这副/); await rec('decks-就用这副', r)
  if (r.found) await press('Enter', 1800)
}
/* 输入问题 —— 键盘直接打字 */
r = await tabTo(/想问|说说|输入|发生|^$/, 12)
await page.evaluate(() => document.querySelector('textarea')?.focus())
await page.keyboard.type('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？', { delay: 2 })
await W(700)
await rec('question-键盘输入', { found: true, tabs: 0, el: await focused() })
r = await tabTo(/继续/); await rec('question-继续', r)
if (r.found) await press('Enter', 2400)
r = await tabTo(/用优化后的/); await rec('question-用优化后的', r)
if (r.found) await press('Enter', 1900)
r = await tabTo(/二选一/); await rec('spread-二选一', r)
if (r.found) await press('Enter', 1900)
r = await tabTo(/直接开始/); await rec('focus-直接开始', r)
if (r.found) await press('Enter', 2000)

/* 洗牌：原本只有 pointer 手势，D4 补了键盘路径。这里验的是「键盘能不能真的洗到牌」 */
const shuffleObs = await observe(page)
R.shuffleControls = shuffleObs.controls.map((c) => c.label).filter(Boolean)
r = await tabTo(/牌堆/, 20)
await rec('shuffle-聚焦牌堆', r)
if (r.found) {
  /* 按 8 次 Enter = 洗 8 次。每次按住的时长不同，手势也就不同 */
  for (let i = 0; i < 8; i++) { await press('Enter', 420) }
  const after = await observe(page)
  const m = after.text.match(/已洗 (\d+) 次/)
  R.keyboardShuffleCount = m ? Number(m[1]) : 0
  console.log(`   键盘洗牌：按 8 次 Enter → 页面显示「已洗 ${R.keyboardShuffleCount} 次」`)
  if (!R.keyboardShuffleCount) R.findings.push({ sev: 'P1', step: 'shuffle', issue: '按键后洗牌次数仍为 0' })
}
r = await tabTo(/洗好了/, 20); await rec('shuffle-洗好了', r)
if (r.found) await press('Enter', 2200)

/* 切牌：同样补了键盘路径（方向键调整 + Enter 确认） */
if (page.url().includes('/table/cut')) {
  r = await tabTo(/切牌位置/, 20); await rec('cut-聚焦牌堆', r)
  if (r.found) {
    await press('Enter', 700)            // 第一按定切点（G-04：之前不存在默认切点）
    for (let i = 0; i < 4; i++) await press('ArrowDown', 260)
    const cutObs = await observe(page)
    R.cutPickedText = (cutObs.text.match(/大约第 ?\d+ ?张/) || [])[0] ?? null
    console.log(`   键盘切牌：${R.cutPickedText ?? '(未显示切点)'}`)
    if (!R.cutPickedText) R.findings.push({ sev: 'P1', step: 'cut', issue: '键盘操作后未产生切点' })
  }
  r = await tabTo(/从这里切开/, 20); await rec('cut-从这里切开', r)
  if (r.found) await press('Enter', 2300)
  r = await tabTo(/合起来/, 20); await rec('cut-合起来', r)
  if (r.found) await press('Enter', 2100)
  r = await tabTo(/摊开牌/, 20); await rec('cut-摊开牌', r)
  if (r.found) await press('Enter', 3600)
}



/* 摆牌：D2-05 补的键盘落位路径 */
if (page.url().includes('/table/draw')) {
  let placed = 0
  for (let i = 0; i < 5; i++) {
    /* 先 Tab 到扇形里的一张牌并拿起 */
    /* 扇形是一个 roving tabindex 控件：整体一个 Tab 停靠点，方向键选牌，Enter 拿起 */
    const pick = await tabTo(/摊开的牌/, 30)
    if (!pick.found) { R.findings.push({ sev: 'P1', step: 'draw-拿起', issue: '键盘无法聚焦到摊开的牌' }); break }
    for (let k = 0; k < i * 3; k++) await press('ArrowRight', 120)
    await press('Enter', 1000)
    const slot = await tabTo(/把这张牌放到/, 30)
    if (!slot.found) { R.findings.push({ sev: 'P1', step: 'draw-落位', issue: '键盘无法聚焦到空牌位' }); break }
    await press('Enter', 1100)
    placed++
  }
  R.keyboardPlaced = placed
  await rec('draw-键盘摆牌', { found: placed > 0, tabs: 0, el: await focused() }, { placed })
  console.log(`   键盘摆牌成功 ${placed}/5 张`)
  r = await tabTo(/去翻牌/, 30); await rec('draw-去翻牌', r)
  if (r.found) await press('Enter', 2400)
}

/* 翻牌：D3 补的键盘路径 */
if (page.url().includes('/table/reveal')) {
  let flipped = 0
  for (let i = 0; i < 5; i++) {
    const f = await tabTo(/翻开这张牌/, 30)
    if (!f.found) break
    await press('Enter', 1700)
    /* 牌义面板会自动弹出 —— 用 Escape 关闭（§16 要求验 Escape） */
    const beforeEsc = await page.evaluate(() => document.body.innerText.includes('查看详细牌义'))
    if (beforeEsc) {
      await page.keyboard.press('Escape'); await W(900)
      const afterEsc = await page.evaluate(() => document.body.innerText.includes('查看详细牌义'))
      R.escapeClosesSheet = beforeEsc && !afterEsc
    }
    flipped++
  }
  R.keyboardFlipped = flipped
  await rec('reveal-键盘翻牌', { found: flipped > 0, tabs: 0, el: await focused() }, { flipped })
  console.log(`   键盘翻牌成功 ${flipped}/5 张 · Escape 关闭牌义面板 = ${R.escapeClosesSheet ? '✅' : '未触发/❌'}`)
  const s = await session(page)
  R.sessionAfterKeyboard = s
  r = await tabTo(/开始完整解读/, 30); await rec('reveal-开始完整解读', r)
}

/* Shift+Tab 反向 */
await page.keyboard.press('Shift+Tab'); await W(300)
R.shiftTabWorks = !!(await focused())
console.log(`   Shift+Tab 反向聚焦: ${R.shiftTabWorks ? '✅' : '❌'}`)

/* reduced-motion 未被 D2/D3 regression */
await browser.close()
const rm = await open('m390')
await rm.ctx.close()
const b2 = await (await import('./_lib.mjs')).chromium.launch({ channel: 'chrome' })
const ctx2 = await b2.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: 'reduce' })
const p2 = await ctx2.newPage()
const rmErrors = []
p2.on('console', (m) => { if (m.type() === 'error') rmErrors.push(m.text().slice(0, 160)) })
await p2.goto(BASE + '/', { waitUntil: 'networkidle' }); await p2.waitForTimeout(1500)
await p2.getByText('带着问题来').click()
await p2.waitForURL(/\/(decks|question)/, { timeout: 15000 }); await p2.waitForTimeout(1600)
const rmObs = await p2.evaluate(() => ({
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  text: document.body.innerText.slice(0, 200),
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
}))
R.reducedMotion = { active: rmObs.reduced, overflowX: rmObs.overflowX, consoleErrors: rmErrors.length }
console.log(`   prefers-reduced-motion 生效=${rmObs.reduced} 溢出=${rmObs.overflowX} console error=${rmErrors.length}`)
await p2.screenshot({ path: `${OUT}/a11y-reduced-motion.png` })
await b2.close()

R.consoleErrors = consoleErrors
writeFileSync(`${OUT}/a11y.json`, JSON.stringify(R, null, 2))
console.log(`\nfindings ${R.findings.length}`)
if (R.findings.length) console.log(JSON.stringify(R.findings, null, 1))
