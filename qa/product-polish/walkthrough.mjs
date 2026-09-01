/**
 * Phase D1 · Product Polish Audit —— 真实浏览器走查驱动
 *
 * ══════════════════════════════════════════════════════════════
 * 【dev-only QA helper】
 * 本文件不参与 build、不进 tsconfig、不被产品代码 import，
 * 依赖 playwright-core 装在 scratchpad 而不是 package.json ——
 * 产品依赖树保持不变（第三十节的约束）。
 *
 * 驱动系统已安装的 Chrome（channel:'chrome'），不下载浏览器。
 *
 * 【为什么不用 mock】
 * 第三节要求真实 Artwork、真实 Reading。所以这里连的是
 * `npm run dev` 起的真实前后端，解读走真实 DeepSeek。
 * 唯一的例外是 §18 的错误态，那里刻意用 route 拦截制造故障。
 * ══════════════════════════════════════════════════════════════
 *
 * 用法：
 *   node qa/product-polish/walkthrough.mjs <step>
 *   step: home | journey | random | decks | errors | responsive | all
 */

import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
/* playwright-core 装在 scratchpad —— 而 scratchpad 随会话销毁。
   D2 结束后会话重启，原来那条硬编码路径就失效了（脚本直接 ERR_MODULE_NOT_FOUND）。
   所以改为按候选顺序探测，并允许用 PW_CORE 显式指定；
   产品依赖树仍然没有 playwright。 */
const PW_CANDIDATES = [
  process.env.PW_CORE,
  '/private/tmp/claude-501/-Users-wangyijie/5ed5a8d3-3140-4570-9e98-2c05c3069914/scratchpad/node_modules/playwright-core/index.mjs',
  '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs',
].filter(Boolean)

let chromium
for (const c of PW_CANDIDATES) {
  try {
    ({ chromium } = await import(c))
    break
  } catch {
    /* 下一个候选 */
  }
}
if (!chromium) {
  throw new Error(
    'playwright-core 未找到。用 PW_CORE=<.../playwright-core/index.mjs> 指定，' +
      '或在 scratchpad 里 npm i playwright-core。',
  )
}

const HERE = dirname(fileURLToPath(import.meta.url))
/* 默认连 vite dev（5173）。生产模式审计连 `npm start` 的单进程（8787）——
   同一批脚本要能同时量开发态与生产态，否则「生产上到底请求了几次」只能靠推测。 */
const BASE = process.env.ARCANA_BASE || 'http://localhost:5173'

export const VIEWPORTS = {
  'm360': { width: 360, height: 800, dir: 'mobile' },
  'm390': { width: 390, height: 844, dir: 'mobile' },
  'm430': { width: 430, height: 932, dir: 'mobile' },
  't768': { width: 768, height: 1024, dir: 'tablet' },
  'd1024': { width: 1024, height: 768, dir: 'desktop' },
  'd1440': { width: 1440, height: 900, dir: 'desktop' },
  'd1920': { width: 1920, height: 1080, dir: 'desktop' },
}

for (const d of ['mobile', 'tablet', 'desktop', 'reading', 'deck-library', 'journal', 'errors', 'motion'])
  mkdirSync(resolve(HERE, d), { recursive: true })

export async function shot(page, sub, name) {
  const p = resolve(HERE, sub, `${name}.png`)
  await page.screenshot({ path: p })
  return p
}

/** 页面观测：可点元素、尺寸、溢出、对比度风险点 */
export async function probe(page, label) {
  const r = await page.evaluate(() => {
    const els = []
    const seen = new Set()
    document.querySelectorAll('h1,h2,h3,button,a,[role=button],input,textarea,img').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (b.width < 2 || b.height < 2) return
      const t = (el.innerText || el.value || el.placeholder || el.alt || '')
        .trim().replace(/\s+/g, ' ').slice(0, 60)
      const k = `${el.tagName}|${t}|${Math.round(b.x)},${Math.round(b.y)}`
      if (seen.has(k)) return
      seen.add(k)
      els.push({
        tag: el.tagName, t,
        w: Math.round(b.width), h: Math.round(b.height),
        x: Math.round(b.x), y: Math.round(b.y),
      })
    })
    const de = document.documentElement
    return {
      scrollH: de.scrollHeight,
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      clientH: de.clientHeight,
      overflowX: de.scrollWidth > de.clientWidth + 1,
      els,
    }
  })
  /* touch target < 44×44 是 §9 Accessibility 的机械可查项 */
  const small = r.els.filter(
    (e) => (e.tag === 'BUTTON' || e.tag === 'A') && e.t && (e.w < 44 || e.h < 44),
  )
  return { label, ...r, smallTargets: small }
}

export function fmtProbe(p) {
  const lines = [
    `[${p.label}] ${p.clientW}×${p.clientH} · scrollH=${p.scrollH}` +
      (p.overflowX ? `  ⚠ 横向溢出 ${p.scrollW}>${p.clientW}` : '') +
      (p.scrollH > p.clientH ? `  (可滚 ${p.scrollH - p.clientH}px)` : '  (不滚动)'),
  ]
  for (const e of p.els)
    lines.push(`  ${e.tag.padEnd(8)} ${String(e.w).padStart(4)}×${String(e.h).padStart(3)} @${String(e.x).padStart(4)},${String(e.y).padStart(4)}  ${e.t}`)
  if (p.smallTargets.length)
    lines.push(`  ⚠ touch target <44px: ` + p.smallTargets.map((e) => `${e.t||e.tag}(${e.w}×${e.h})`).join(', '))
  return lines.join('\n')
}

export async function launch(vp) {
  const b = await chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)))
  return { b, page, errors }
}

export { BASE }
