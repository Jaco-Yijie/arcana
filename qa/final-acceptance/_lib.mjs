/**
 * D4 Final Acceptance —— 公共观测库
 *
 * 【与 D1–D3 脚本的区别】
 * 之前的脚本是「开发者在验证自己改的东西」。这一轮是**验收**：
 * 只看页面上真实呈现给用户的东西，不读内部状态去替产品圆场。
 * 所以这里的观测函数全部基于可见文本、可见控件、真实网络与 console。
 */
import { mkdirSync } from 'node:fs'

const PW = process.env.PW_CORE
  || '/Users/wangyijie/.npm/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'
export const { chromium } = await import(PW)
export const BASE = process.env.ARCANA_BASE || 'http://localhost:8787'
export const OUT = 'qa/final-acceptance'
mkdirSync(OUT, { recursive: true })

export const VIEWPORTS = {
  m360: { width: 360, height: 800, dpr: 3 },
  m390: { width: 390, height: 844, dpr: 3 },
  m430: { width: 430, height: 932, dpr: 3 },
  t768: { width: 768, height: 1024, dpr: 2 },
  d1024: { width: 1024, height: 768, dpr: 2 },
  d1440: { width: 1440, height: 900, dpr: 2 },
  d1920: { width: 1920, height: 1080, dpr: 2 },
}

/** 正式 UI 里绝不允许出现的开发痕迹（§17） */
export const DEV_STRINGS = [
  'DEV FIXTURE', 'NOT REAL ARTWORK', 'FIXTURE', 'MOCK', 'TODO',
  'Coming Soon', 'coming soon', '即将推出', '0/78', '0 / 78',
  '素材未提供', '封面未提供', '素材备齐后开放', 'placeholder', 'PLACEHOLDER',
  'undefined', 'NaN', '[object Object]',
]

export async function open(vpKey = 'm390') {
  const vp = VIEWPORTS[vpKey]
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
  })
  const page = await ctx.newPage()
  const consoleErrors = []
  const failedRequests = []
  const apiCalls = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 220)) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 220)))
  page.on('requestfailed', (r) => failedRequests.push(`${r.failure()?.errorText ?? '?'} ${r.url().replace(BASE, '')}`))
  page.on('request', (r) => {
    const u = r.url()
    if (/\/api\//.test(u)) apiCalls.push(`${r.method()} ${u.replace(BASE, '')}`)
    if (/api\.deepseek\.com/.test(u)) apiCalls.push(`!!! 浏览器直连上游: ${u}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`)
  })
  return { browser, ctx, page, consoleErrors, failedRequests, apiCalls, vp }
}

export const wait = (page, ms) => page.waitForTimeout(ms)

/** 页面上用户真实看得到的东西 */
export async function observe(page) {
  return await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'
    }
    const controls = [...document.querySelectorAll('button,a[href],[role=button],input,textarea,select')]
      .filter(vis)
      .map((el) => ({
        tag: el.tagName,
        label: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().slice(0, 40),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
        disabled: el.disabled === true,
      }))
    const imgs = [...document.querySelectorAll('img')].filter(vis)
    return {
      url: location.pathname + location.search,
      text: document.body.innerText,
      controls,
      smallTargets: controls.filter((c) => (c.w < 44 || c.h < 44) && c.label),
      imgs: imgs.map((i) => ({
        src: i.currentSrc.replace(location.origin, ''),
        w: Math.round(i.getBoundingClientRect().width),
        natW: i.naturalWidth,
        broken: i.complete && i.naturalWidth === 0,
      })),
      brokenImgs: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollH: document.documentElement.scrollHeight,
      vh: window.innerHeight,
    }
  })
}

/** 扫描开发痕迹 */
export function scanDevStrings(text) {
  return DEV_STRINGS.map((w) => [w, text.split(w).length - 1]).filter(([, n]) => n > 0)
}

/** 累计 Layout Shift —— 用 PerformanceObserver 真实测量，不靠肉眼 */
export async function installCLS(page) {
  await page.addInitScript(() => {
    window.__cls = 0
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    } catch { /* 不支持就算了，报告里如实标注 */ }
  })
}
export const readCLS = (page) => page.evaluate(() => window.__cls ?? null)

export async function shot(page, name, full = false) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
}

/** session 快照 —— 用于验证追问不改牌、Resume 恢复正确 */
export const session = (page) => page.evaluate(() => {
  try {
    const s = JSON.parse(localStorage.getItem('arcana:active-session') || 'null')
    if (!s) return null
    return {
      id: s.id, deckId: s.deckId, spreadId: s.spreadId, question: s.question,
      mode: s.mode, stage: s.stage,
      placements: (s.placements || []).map((p) => ({ pos: p.positionId, idx: p.deckIndex, rev: p.revealed })),
      orientations: (s.deck || []).length ? (s.placements || []).map((p) => s.deck[p.deckIndex]?.orientation) : [],
      cardIds: (s.deck || []).length ? (s.placements || []).map((p) => s.deck[p.deckIndex]?.cardId) : [],
      followUps: (s.followUps || []).length,
      hasStructured: !!s.structuredReading,
    }
  } catch (e) { return 'ERR ' + e.message }
})

export const journal = (page) => page.evaluate(() => {
  try {
    const raw = localStorage.getItem('arcana:journal')
    const j = raw ? JSON.parse(raw) : []
    return { count: Array.isArray(j) ? j.length : 0, last: Array.isArray(j) && j.length ? {
      id: j[0].id, deckId: j[0].deckId, spreadId: j[0].spreadId,
      question: j[0].question, cards: (j[0].placements || []).length,
      followUps: (j[0].followUps || []).length,
    } : null }
  } catch (e) { return 'ERR ' + e.message }
})
