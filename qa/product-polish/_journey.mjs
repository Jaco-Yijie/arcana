/**
 * 完整用户流程走查（第三节）。真实 Artwork、真实 DeepSeek Reading，不跳步。
 * 用法：node qa/product-polish/_journey.mjs [m390|d1440] [untilStep]
 */
import { VIEWPORTS, launch, shot, probe, fmtProbe, BASE } from './walkthrough.mjs'

const key = process.argv[2] || 'm390'
const SPREAD = process.env.SPREAD || '二选一'
const DEPTH = process.env.DEPTH || '深度解读'
const NCARDS = Number(process.env.NCARDS || 5)
const stopAt = Number(process.argv[3] || 99)
const vp = VIEWPORTS[key]
const dir = vp.dir
const { b, page, errors } = await launch(vp)

// ── 故障注入（第十八节）。只在本 QA 驱动里生效，不改产品代码 ──
if (process.env.ERR === 'abort') {
  await page.route('**/api/tarot/reading**', (r) => r.abort('failed'))
  console.log('[注入] /api/tarot/reading → 网络中断')
}
if (process.env.ERR === '500') {
  await page.route('**/api/tarot/reading**', (r) =>
    r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }))
  console.log('[注入] /api/tarot/reading → 500')
}
if (process.env.NOART === '1') {
  await page.route('**/assets/decks/**', (r) => r.abort('failed'))
  console.log('[注入] 所有牌面资产 → 404（验证程序化兜底）')
}

let n = 0
const step = async (name, fn, opts = {}) => {
  n++
  if (n > stopAt) return
  const t0 = Date.now()
  try {
    await fn()
  } catch (e) {
    console.log(`\n✗✗✗ ${name} 失败: ${e.message.split('\n')[0]}`)
    console.log('   当前 URL:', page.url())
    console.log(fmtProbe(await probe(page, name + ' 失败现场')))
    await shot(page, dir, `FAIL-${name}-${key}`)
    await b.close()
    process.exit(1)
  }
  await page.waitForTimeout(opts.settle ?? 700)
  await shot(page, opts.dir || dir, `${name}-${key}`)
  const p = await probe(page, name)
  console.log(`\n=== ${name}  (${Date.now() - t0}ms)  ${page.url().replace(BASE, '')} ===`)
  console.log(fmtProbe(p))
}

await step('01-home', () => page.goto(BASE + '/', { waitUntil: 'networkidle' }))
await step('02-decks', async () => {
  await page.getByText('带着问题来').click()
  await page.waitForURL('**/decks')
})
await step('03-question', async () => {
  await page.getByRole('button', { name: '就用这副' }).click()
  await page.waitForURL('**/question**')
})
await step('04-question-filled', async () => {
  const ta = page.locator('textarea').first()
  await ta.click()
  await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
})
await step('05-after-continue', async () => {
  await page.getByRole('button', { name: '继续' }).click()
  await page.waitForTimeout(1500)
}, { settle: 1500 })

await step('06-spread', async () => {
  await page.getByRole('button', { name: '用优化后的' }).click()
  await page.waitForTimeout(1200)
}, { settle: 1200 })

await step('07-after-spread', async () => {
  await page.getByRole('button', { name: new RegExp(SPREAD) }).first().click()
  await page.waitForTimeout(1400)
}, { settle: 1400 })

await step('08-shuffle', async () => {
  await page.getByRole('button', { name: '直接开始' }).click()
  await page.waitForURL('**/table/shuffle')
  await page.waitForTimeout(1200)
}, { settle: 1200 })

await step('09-shuffled', async () => {
  const box = { x: 195, y: 640 }
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(box.x - 90, box.y)
    await page.mouse.down()
    for (let s = 1; s <= 6; s++) await page.mouse.move(box.x - 90 + s * 30, box.y + (i % 2 ? 12 : -12))
    await page.mouse.up()
    await page.waitForTimeout(320)
  }
  await page.waitForTimeout(1200)
}, { settle: 1200 })

await step('10-cut', async () => {
  await page.getByRole('button', { name: '洗好了' }).click()
  await page.waitForURL('**/table/cut')
  await page.waitForTimeout(1400)
}, { settle: 1400 })

await step('11-cut-picked', async () => {
  await page.mouse.move(307, 412)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
  await page.mouse.up()
  await page.waitForTimeout(900)
}, { settle: 900 })

await step('12-cut-done', async () => {
  await page.getByRole('button', { name: '从这里切开' }).click()
  await page.waitForTimeout(1800)
}, { settle: 1200 })
await step('13-cut-closed', async () => {
  await page.getByRole('button', { name: '合起来' }).click()
  await page.waitForTimeout(1600)
}, { settle: 1000 })
await step('14-draw', async () => {
  await page.getByRole('button', { name: '摊开牌' }).click()
  await page.waitForURL('**/table/draw', { timeout: 20000 })
  await page.waitForTimeout(2200)
}, { settle: 2200 })

const SLOTS = [
  ['现状', 195, 454],
  ['A 方向发展', 70, 285],
  ['A 结果', 70, 115],
  ['B 方向发展', 320, 285],
  ['B 结果', 320, 115],
]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await step(`15-${i + 1}-placed`, async () => {
    await page.mouse.click(FAN_X[i], 660)      // 从扇形拿起
    await page.waitForTimeout(900)
    const [, sx, sy] = SLOTS[i]
    await page.mouse.move(129, 580)            // 悬空牌
    await page.mouse.down()
    for (let k = 1; k <= 12; k++)              // 必须超过 DRAG_THRESHOLD
      await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
    await page.waitForTimeout(120)
    await page.mouse.up()
    await page.waitForTimeout(1000)
  }, { settle: 800 })
}

await step('16-reveal', async () => {
  await page.getByRole('button', { name: '去翻牌' }).click()
  await page.waitForURL('**/table/reveal')
  await page.waitForTimeout(2000)
}, { settle: 2000 })

const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await step(`17-${i + 1}-flip`, async () => {
    await page.mouse.click(CARDS[i][0], CARDS[i][1])
    await page.waitForTimeout(1400)
    // 每翻一张都会自动弹出牌义面板并挡住牌桌，必须先收起才能翻下一张
    const close = page.getByRole('button', { name: '收起' })
    if (await close.count()) { await close.first().click(); await page.waitForTimeout(700) }
  }, { settle: 900 })
}

await step('18-all-revealed', async () => { await page.waitForTimeout(800) }, { settle: 800 })

// 同一会话内切换视口，覆盖第二节要求的连续响应检查
async function sweep(tag) {
  const before = page.viewportSize()
  for (const [vk, v] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize({ width: v.width, height: v.height })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `qa/product-polish/${v.dir}/${tag}-${vk}.png` })
    const pr = await probe(page, `${tag} ${vk}`)
    const imgs = pr.els.filter((e) => e.tag === 'IMG')
    const cw = imgs.length ? Math.max(...imgs.map((e) => e.w)) : 0
    console.log(`   ${vk.padEnd(6)} ${String(v.width).padStart(4)}×${v.height}  scrollH=${String(pr.scrollH).padStart(5)}  最大牌宽=${cw}px${pr.overflowX ? '  ⚠横向溢出' : ''}`)
  }
  await page.setViewportSize(before)
  await page.waitForTimeout(700)
}
console.log('\n--- REVEAL 全视口 ---')
await sweep('reveal')

if (process.env.SHEET === '1') {
  // 重新点开第一张牌的牌义面板，扫全视口看 sheet 形态
  await page.mouse.click(194, 605)
  await page.waitForTimeout(1200)
  console.log('\n--- CardMeaningSheet 全视口 ---')
  await sweep('sheet')
  console.log('\n[sheet 文本]\n' + (await page.evaluate(() => document.body.innerText)).slice(-700))
  await b.close()
  process.exit(0)
}

await step('19-reading', async () => {
  const cta = page.getByRole('button', { name: /解读|开始/ })
  console.log('   [CTA 候选]', await cta.allInnerTexts())
  await cta.first().click()
  await page.waitForTimeout(3000)
}, { settle: 3000, dir: 'reading' })

await step('20-reading', async () => {
  await page.getByRole('button', { name: new RegExp(DEPTH) }).click()
  await page.waitForTimeout(400)
  const t0 = Date.now()
  await page.getByRole('button', { name: '开始解读' }).click()
  // 真实 DeepSeek 深度解读可能要 1-3 分钟。加载文案会闪断，
  // 所以要求「连续 3 次轮询都不含加载文案」才算完成。
  let last = 0, gone = 0
  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(3000)
    const t = await page.evaluate(() => document.body.innerText)
    last = t.length
    gone = t.includes('正在解读牌面') || t.includes('正在进行更深入') ? 0 : gone + 1
    if (i % 4 === 0) console.log(`   [${((i + 1) * 3)}s] ${last} 字 · 加载态${gone ? '已消失×' + gone : '中'}`)
    if (t.includes('没有完整生成') || t.includes('没有成功完成')) {
      console.log('   [错误态已出现，停止等待]')
      await page.screenshot({ path: 'qa/product-polish/errors/reading-network-failure-m390.png' })
      break
    }
    if (gone >= 3 && last > 300) break
  }
  console.log(`   [解读耗时] ${((Date.now() - t0) / 1000).toFixed(1)}s · 正文 ${last} 字`)
}, { settle: 1200, dir: 'reading' })

await page.screenshot({ path: 'qa/product-polish/reading/reading-full-m390.png', fullPage: true })
console.log('\n\n===== READING 全文 =====')
console.log(await page.evaluate(() => document.body.innerText))
console.log('\n--- READING 全视口 ---')
await sweep('reading')

if (process.env.FOLLOWUP === '1') {
  const readFU = async () => await page.evaluate(() => {
    try { return (JSON.parse(localStorage.getItem('arcana:active-session') || '{}').followUps || []).length }
    catch { return 'err' }
  })
  /* D2 恢复复验：追问必须是「当前这次抽牌的延伸」，
     所以把 session 的不变量拍成指纹，逐次比对。 */
  const fingerprint = async () => await page.evaluate(() => {
    try {
      const s = JSON.parse(localStorage.getItem('arcana:active-session') || '{}')
      return JSON.stringify({
        id: s.id,
        deckId: s.deckId,
        spreadId: s.spreadId,
        question: s.question,
        placements: s.placements,
        drawnCards: s.drawnCards ?? s.cards ?? null,
        structured: !!s.structuredReading,
      })
    } catch { return 'ERR' }
  })
  /* 真实网络取证：追问必须打到 /api/tarot/followup，
     而且**不能**再打 /api/tarot/reading（那意味着重新解读/重抽）。 */
  const netFollow = []
  const netReading = []
  page.on('request', (r) => {
    if (r.url().includes('/api/tarot/followup')) netFollow.push(r.method())
    if (r.url().includes('/api/tarot/reading')) netReading.push(r.method())
  })
  const fpBefore = await fingerprint()
  const ASKS = ['那我接下来最需要注意什么？', '如果我先不做决定，只是再观察一个月呢？']
  for (let n = 0; n < ASKS.length; n++) {
    const input = page.getByRole('textbox', { name: '继续问这次牌阵' })
    await input.scrollIntoViewIfNeeded()
    await input.fill(ASKS[n])
    const before = (await page.evaluate(() => document.body.innerText)).length
    await page.getByRole('button', { name: '发送' }).click()
    let ok = false
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(2000)
      const t = await page.evaluate(() => document.body.innerText)
      if (t.includes(ASKS[n]) && t.length > before + 120 && !t.includes('正在顺着这组牌')) { ok = true; break }
    }
    console.log(`[追问${n + 1}] ${ok ? '✅ 有输出' : '❌ 无输出'} · followUps=${await readFU()} · 正文 ${(await page.evaluate(() => document.body.innerText)).length} 字`)
    await shot(page, 'reading', `followup-${n + 1}-m390`)
  }
  const fpAfter = await fingerprint()
  console.log(`\n[网络] followup 请求 ${netFollow.length} 次 · reading 请求 ${netReading.length} 次（追问后应为 0）`)
  console.log(`[不变量] session 指纹 ${fpBefore === fpAfter ? '✅ 逐字节不变' : '❌ 已变化'}`)
  if (fpBefore !== fpAfter) {
    console.log('  before: ' + fpBefore.slice(0, 700))
    console.log('  after : ' + fpAfter.slice(0, 700))
  } else {
    console.log('  ' + fpBefore.slice(0, 700))
  }
  console.log('\n[追问区文本]\n' + (await page.evaluate(() => {
    const el = [...document.querySelectorAll('section')].find((s) => s.innerText.includes('继续问这次牌阵'))
    return el ? el.innerText : '(未找到追问区)'
  })))
  await shot(page, 'reading', 'followup-result-m390')
  console.log('\n[追问后正文尾部]\n' + (await page.evaluate(() => document.body.innerText)).slice(-1600))
}

await step('21-journal', async () => {
  await page.getByRole('button', { name: '存入日记' }).click()
  await page.waitForTimeout(1500)
  await page.goto(BASE + '/journal', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
}, { settle: 1200, dir: 'journal' })
console.log('\n--- JOURNAL 全视口 ---')
await sweep('journal')
await step('22-journal-detail', async () => {
  await page.locator('a, [role=button]').filter({ hasText: /在「|随缘/ }).first().click()
  await page.waitForTimeout(1500)
}, { settle: 1200, dir: 'journal' })
console.log('\n[journal detail]\n' + (await page.evaluate(() => document.body.innerText)).slice(0, 900))
console.log('\n[journal 文本]\n' + (await page.evaluate(() => document.body.innerText)).slice(0, 600))

console.log('\n\n############ 停在这里，看下一步控件 ############')
console.log('URL:', page.url())
console.log(fmtProbe(await probe(page, 'current')))
console.log('\n--- body 文本 ---')
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1400))
if (errors.length) console.log('\n⚠ console errors:\n  ' + errors.join('\n  '))
await b.close()
