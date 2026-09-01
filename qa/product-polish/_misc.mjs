import { chromium } from '/private/tmp/claude-501/-Users-wangyijie/c094371c-a2a3-4263-94a4-c839d933c8b0/scratchpad/node_modules/playwright-core/index.mjs'
import { VIEWPORTS, shot, probe, fmtProbe, BASE } from './walkthrough.mjs'

const b = await chromium.launch({ channel: 'chrome' })

/* ── A. 随缘抽一张（第四节）：数一共几步 ── */
{
  const ctx = await b.newContext({ viewport: VIEWPORTS.m390, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const trail = []
  await page.getByText('随缘抽一张').click()
  await page.waitForTimeout(1500)
  trail.push(page.url().replace(BASE, ''))
  await shot(page, 'mobile', 'random-01')
  console.log('=== 随缘抽一张 ===')
  console.log(fmtProbe(await probe(page, 'random 第一步')))

  // 一路点主 CTA，记录走了几页
  for (let i = 0; i < 10; i++) {
    const names = ['就用这副', '直接开始', '继续', '开始']
    let clicked = false
    for (const nm of names) {
      const btn = page.getByRole('button', { name: nm })
      if (await btn.count()) { await btn.first().click(); clicked = true; break }
    }
    if (!clicked) break
    await page.waitForTimeout(1600)
    const u = page.url().replace(BASE, '')
    if (trail[trail.length - 1] !== u) trail.push(u)
    await shot(page, 'mobile', `random-0${i + 2}`)
    if (u.includes('shuffle')) break
  }
  console.log('路径:', trail.join('  →  '))
  console.log(fmtProbe(await probe(page, 'random 停下处')))
  await ctx.close()
}

/* ── B. Settings ── */
for (const [k, vp] of [['m390', VIEWPORTS.m390], ['d1440', VIEWPORTS.d1440]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot(page, vp.dir, `settings-${k}`)
  if (k === 'm390') {
    console.log('\n=== Settings ===')
    console.log(fmtProbe(await probe(page, 'settings')))
    console.log((await page.evaluate(() => document.body.innerText)).slice(0, 500))
  }
  await ctx.close()
}

/* ── C. Journal 空态 ── */
{
  const ctx = await b.newContext({ viewport: VIEWPORTS.m390, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(BASE + '/journal', { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await shot(page, 'journal', 'journal-empty-m390')
  console.log('\n=== Journal 空态 ===')
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 300))
  await ctx.close()
}

/* ── D. prefers-reduced-motion（第十九节） ── */
{
  const ctx = await b.newContext({ viewport: VIEWPORTS.m390, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shot(page, 'motion', 'reduced-home-m390')
  const r = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('*').forEach((el) => {
      const s = getComputedStyle(el)
      const d = parseFloat(s.animationDuration) || 0
      const t = parseFloat(s.transitionDuration) || 0
      if (d > 0.05 || t > 0.05) out.push(`${el.tagName}.${String(el.className).slice(0, 40)} anim=${s.animationDuration} trans=${s.transitionDuration}`)
    })
    return { matches: matchMedia('(prefers-reduced-motion: reduce)').matches, moving: out.slice(0, 12), total: out.length }
  })
  console.log('\n=== prefers-reduced-motion: reduce ===')
  console.log('媒体查询命中:', r.matches, '· 仍有动效的元素:', r.total)
  r.moving.forEach((m) => console.log('   ' + m))
  await ctx.close()
}

await b.close()
