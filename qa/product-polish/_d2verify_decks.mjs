/**
 * D2 恢复复验 —— Deck Library 真实渲染状态。
 * dev-only。只读取页面，不改产品代码。
 */
import { VIEWPORTS, launch, BASE } from './walkthrough.mjs'

const BAD = ['DEV FIXTURE', 'NOT REAL ARTWORK', '素材未提供', '封面未提供', '素材备齐后开放', '制作中', '现行牌组', '0/78', '0 / 78', '78 / 78']

for (const key of ['m390', 'd1440']) {
  const vp = VIEWPORTS[key]
  const { b, page, errors } = await launch(vp)
  await page.goto(BASE + '/decks', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  const r = await page.evaluate(() => {
    const text = document.body.innerText
    const imgs = [...document.querySelectorAll('img')]
      .filter((i) => i.getBoundingClientRect().width > 20)
    return {
      text,
      scrollH: document.documentElement.scrollHeight,
      vh: window.innerHeight,
      imgCount: imgs.length,
      brokenImgs: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      srcSample: [...new Set(imgs.map((i) => i.currentSrc.replace(location.origin, '')))].slice(0, 8),
      deckRows: [...document.querySelectorAll('a[href^="/decks/"], [data-deck-id]')].length,
    }
  })
  const hits = BAD.map((w) => [w, (r.text.split(w).length - 1)]).filter(([, n]) => n > 0)
  console.log(`\n===== /decks @ ${key} ${vp.width}×${vp.height} =====`)
  console.log(`页面高度 ${r.scrollH}px (${(r.scrollH / r.vh).toFixed(1)} 屏) · 可见图片 ${r.imgCount} 张 · 加载失败 ${r.brokenImgs} 张`)
  console.log(`旧开发态文案命中: ${hits.length ? hits.map(([w, n]) => `${w}×${n}`).join(', ') : '✅ 0'}`)
  console.log('图片样本:\n  ' + r.srcSample.join('\n  '))
  const names = r.text.split('\n').filter((l) => l.trim() && l.length < 30).slice(0, 24)
  console.log('页面文本前 24 行:\n  ' + names.join('\n  '))
  if (errors.length) console.log('⚠ console errors: ' + errors.join(' | '))
  await page.screenshot({ path: `qa/product-polish/d2/recover-decks-${key}.png`, fullPage: true })
  await b.close()
}
