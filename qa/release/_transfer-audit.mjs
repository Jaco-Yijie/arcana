/**
 * D3 · 真实传输量审计
 *
 * 【为什么不能只数 response 事件】
 * Playwright 的 response 事件对**内存/磁盘缓存命中**同样触发，
 * 而 `res.body()` 会把缓存里的内容原样返回 —— 于是「请求了几次」看起来翻倍，
 * 「传了多少字节」被重复计算。生产上真正过网的字节数会被高估。
 *
 * PerformanceResourceTiming.transferSize 才是权威：缓存命中时它是 0。
 * 本脚本用它重测 Reveal 与 Deck Library，给出「真的过网了多少」。
 */
import { writeFileSync } from 'node:fs'
import { VIEWPORTS, launch, BASE } from '../product-polish/walkthrough.mjs'

const vp = VIEWPORTS[process.argv[2] || 'm390']
const { b, page, errors } = await launch(vp)
const wait = (ms) => page.waitForTimeout(ms)

const timing = () => page.evaluate(() => {
  const rows = performance.getEntriesByType('resource').map((e) => ({
    url: e.name.replace(location.origin, ''),
    transfer: e.transferSize,      // 0 = 缓存命中，没过网
    decoded: e.decodedBodySize,
    dur: Math.round(e.duration),
  }))
  const cls = (u) =>
    /\/decks\/[^/]+\/cards\//.test(u) ? 'artwork-full'
      : /\/decks\/[^/]+\/thumbs\//.test(u) ? 'artwork-thumb'
      : /\/decks\//.test(u) ? 'deck-other'
      : /\.css/.test(u) ? 'css'
      : /\.js/.test(u) ? 'js'
      : /^\/api\//.test(u) ? 'api' : 'other'
  const by = {}
  for (const r of rows) {
    const k = cls(r.url)
    by[k] ??= { entries: 0, overNetwork: 0, transferBytes: 0, decodedBytes: 0 }
    by[k].entries++
    if (r.transfer > 0) by[k].overNetwork++
    by[k].transferBytes += r.transfer
    by[k].decodedBytes += r.decoded
  }
  return { by, rows }
})

const marks = {}
async function mark(tag) {
  const t = await timing()
  marks[tag] = t.by
  console.log(`\n===== ${tag} =====`)
  console.log('类别            条目  真正过网  过网KB    解码KB')
  let tn = 0, tb = 0
  for (const [k, v] of Object.entries(t.by)) {
    tn += v.overNetwork; tb += v.transferBytes
    console.log(`${k.padEnd(15)} ${String(v.entries).padStart(4)} ${String(v.overNetwork).padStart(9)} ${(v.transferBytes / 1024).toFixed(1).padStart(9)} ${(v.decodedBytes / 1024).toFixed(1).padStart(9)}`)
  }
  console.log(`${'合计'.padEnd(13)} ${String(Object.values(t.by).reduce((s, v) => s + v.entries, 0)).padStart(4)} ${String(tn).padStart(9)} ${(tb / 1024).toFixed(1).padStart(9)}`)
  const art = ['artwork-full', 'artwork-thumb', 'deck-other']
  const ab = art.reduce((s, k) => s + (t.by[k]?.transferBytes ?? 0), 0)
  const an = art.reduce((s, k) => s + (t.by[k]?.overNetwork ?? 0), 0)
  console.log(`→ Artwork 真正过网 ${an} 个请求 · ${(ab / 1024).toFixed(1)} KB`)
  return t
}

/* Home */
await page.goto(BASE + '/', { waitUntil: 'networkidle' }); await wait(2000)
await mark('home')

/* Deck Library */
await page.getByText('带着问题来').click(); await page.waitForURL('**/decks'); await wait(2500)
await mark('deck-library（累计）')

/* 走到 reveal */
await page.getByRole('button', { name: '就用这副' }).click()
await page.waitForURL('**/question**'); await wait(1200)
const ta = page.locator('textarea').first(); await ta.click()
await ta.fill('我最近在考虑要不要换一份工作，但又怕现在这份的稳定是我唯一的依靠。我该怎么想这件事？')
await page.getByRole('button', { name: '继续' }).click(); await wait(1800)
await page.getByRole('button', { name: '用优化后的' }).click(); await wait(1400)
await page.getByRole('button', { name: /二选一/ }).first().click(); await wait(1600)
await page.getByRole('button', { name: '直接开始' }).click()
await page.waitForURL('**/table/shuffle'); await wait(1600)
for (let i = 0; i < 8; i++) {
  await page.mouse.move(105, 640); await page.mouse.down()
  for (let s = 1; s <= 6; s++) await page.mouse.move(105 + s * 30, 640 + (i % 2 ? 12 : -12))
  await page.mouse.up(); await wait(320)
}
await wait(1200)
await page.getByRole('button', { name: '洗好了' }).click()
await page.waitForURL('**/table/cut'); await wait(1600)
await page.mouse.move(307, 412); await page.mouse.down()
for (let i = 1; i <= 10; i++) await page.mouse.move(307, 412 + i * 12)
await page.mouse.up(); await wait(900)
await page.getByRole('button', { name: '从这里切开' }).click(); await wait(2000)
await page.getByRole('button', { name: '合起来' }).click(); await wait(1800)
await page.getByRole('button', { name: '摊开牌' }).click()
await page.waitForURL('**/table/draw', { timeout: 20000 }); await wait(3500)
await mark('draw · 摊开78张（累计）')

const SLOTS = [[195, 454], [70, 285], [70, 115], [320, 285], [320, 115]]
const FAN_X = [150, 205, 260, 310, 120]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(FAN_X[i], 660); await wait(900)
  const [sx, sy] = SLOTS[i]
  await page.mouse.move(129, 580); await page.mouse.down()
  for (let k = 1; k <= 12; k++)
    await page.mouse.move(129 + ((sx - 129) * k) / 12, 580 + ((sy + 40 - 580) * k) / 12)
  await wait(120); await page.mouse.up(); await wait(1000)
}
await page.getByRole('button', { name: '去翻牌' }).click()
await page.waitForURL('**/table/reveal'); await wait(2500)
await mark('reveal · 翻牌前（累计）')

const CARDS = [[194, 605], [70, 389], [70, 172], [319, 389], [319, 171]]
for (let i = 0; i < 5; i++) {
  await page.mouse.click(CARDS[i][0], CARDS[i][1]); await wait(1500)
  const close = page.getByRole('button', { name: '收起' })
  if (await close.count()) { await close.first().click(); await wait(700) }
}
await wait(1200)
const rev = await mark('reveal · 5张全翻开（累计）')

/* 逐张列出真正过网的 artwork */
console.log('\n[Reveal 真正过网的 artwork 逐条]')
for (const r of rev.rows.filter((r) => /\/decks\//.test(r.url))) {
  console.log(`  ${r.transfer > 0 ? '过网' : '缓存'} ${String((r.transfer / 1024).toFixed(1)).padStart(8)}KB  ${String((r.decoded / 1024).toFixed(1)).padStart(8)}KB解码  ${r.url}`)
}

/* 翻开的牌实际显示尺寸 —— 用来判断 full 档是否过采样 */
const disp = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter((i) => /\/decks\//.test(i.currentSrc))
  return imgs.map((i) => ({
    src: i.currentSrc.replace(location.origin, '').split('/').slice(-2).join('/'),
    cssW: Math.round(i.getBoundingClientRect().width),
    natW: i.naturalWidth,
    dpr: window.devicePixelRatio,
  }))
})
console.log('\n[显示尺寸 vs 原图尺寸]')
for (const d of disp) {
  console.log(`  ${d.src.padEnd(28)} 显示 ${String(d.cssW).padStart(4)}css × dpr${d.dpr} = ${d.cssW * d.dpr}px 设备像素  ← 原图 ${d.natW}px  过采样 ${(d.natW / (d.cssW * d.dpr)).toFixed(1)}×`)
}

writeFileSync('qa/release/transfer-audit.json', JSON.stringify({ viewport: vp, marks, display: disp }, null, 2))
if (errors.length) console.log('\n⚠ console errors:\n  ' + errors.join('\n  '))
await b.close()
