import { VIEWPORTS, launch, probe, BASE } from './walkthrough.mjs'
const ROUTES = [['home', '/'], ['decks', '/decks'], ['journal', '/journal'], ['settings', '/settings']]
let bad = 0
for (const [name, path] of ROUTES) {
  for (const [k, vp] of Object.entries(VIEWPORTS)) {
    const { b, page, errors } = await launch(vp)
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    const p = await probe(page, `${name} ${k}`)
    const flags = []
    if (p.overflowX) { flags.push(`⚠横向溢出 ${p.scrollW}>${p.clientW}`); bad++ }
    if (errors.length) { flags.push(`⚠console:${errors.length}`); bad++ }
    console.log(
      `${name.padEnd(9)} ${k.padEnd(6)} scrollH=${String(p.scrollH).padStart(5)} ` +
      `触达<44px:${p.smallTargets.length} ${flags.join(' ')}`,
    )
    await b.close()
  }
}
console.log(bad === 0 ? '\n✅ 无横向溢出、无 console error' : `\n❌ ${bad} 项异常`)
