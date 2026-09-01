import { VIEWPORTS, launch, shot, probe, fmtProbe, BASE } from './walkthrough.mjs'
for (const [k, vp] of Object.entries(VIEWPORTS)) {
  const { b, page, errors } = await launch(vp)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await shot(page, vp.dir, `home-${k}`)
  console.log(fmtProbe(await probe(page, `home ${k}`)))
  if (errors.length) console.log('  ⚠ console:', errors.join(' | '))
  console.log()
  await b.close()
}
