/**
 * D4 · Artwork Runtime 抽样验收（50 张）
 * 用真实浏览器按 resolver 生成的 URL 加载，检查：
 * 能否解码、尺寸是否与 manifest 一致、是否串套、是否有明显裁切/主体不可读。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { open, BASE, OUT, wait, shot } from './_lib.mjs'

const sample = JSON.parse(readFileSync('qa/final-acceptance/artwork-sample.json', 'utf8'))
const { browser, page, consoleErrors, failedRequests } = await open('d1440')

/* 【必须先落到应用同源上】
   第一版没有这一步，page 停在 about:blank，于是所有指向 localhost:8787 的图都是跨域：
   带 crossOrigin 的取指纹全部失败 → 指纹全为 null → **串套检测恒真通过**。
   50 次失败请求就是它留下的痕迹。空跑的断言比失败的断言更危险，所以这里先导航。 */
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await wait(page, 800)

const results = await page.evaluate(async (rows) => {
  const load = (src) => new Promise((res) => {
    const i = new Image()
    i.onload = () => res({ ok: true, w: i.naturalWidth, h: i.naturalHeight })
    i.onerror = () => res({ ok: false, w: 0, h: 0 })
    i.src = src
  })
  const out = []
  for (const r of rows) {
    const f = await load(r.full)
    const t = await load(r.thumb)
    out.push({ ...r, fullLoad: f, thumbLoad: t })
  }
  return out
}, sample.rows.map((r) => ({ ...r, full: BASE + r.full, thumb: BASE + r.thumb })))

let broken = 0, sizeMismatch = 0, thumbBad = 0
const problems = []
for (const r of results) {
  if (!r.fullLoad.ok) { broken++; problems.push({ sev: 'P0', deck: r.deckId, card: r.cardId, issue: 'full 加载失败' }) }
  if (!r.thumbLoad.ok) { thumbBad++; problems.push({ sev: 'P1', deck: r.deckId, card: r.cardId, issue: 'thumb 加载失败' }) }
  if (r.fullLoad.ok && (r.fullLoad.w !== r.expectW || r.fullLoad.h !== r.expectH)) {
    sizeMismatch++
    problems.push({ sev: 'P1', deck: r.deckId, card: r.cardId, issue: `尺寸与 manifest 不符: 实际 ${r.fullLoad.w}×${r.fullLoad.h} vs 登记 ${r.expectW}×${r.expectH}` })
  }
  if (r.thumbLoad.ok && r.thumbLoad.w !== 240) {
    problems.push({ sev: 'P2', deck: r.deckId, card: r.cardId, issue: `thumb 宽 ${r.thumbLoad.w} ≠ 240` })
  }
}

/* 串套检测：同一 cardId 在五套下必须是**五个不同的文件**（字节不同）。
   只比 URL 不够 —— URL 不同但内容相同才是真正的串套。这里比图像的平均色。 */
const crossDeck = await page.evaluate(async (rows) => {
  const fp = async (src) => new Promise((res) => {
    const i = new Image()
    i.onload = () => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 26
      const x = c.getContext('2d'); x.drawImage(i, 0, 0, 16, 26)
      const d = x.getImageData(0, 0, 16, 26).data
      let s = ''
      for (let k = 0; k < d.length; k += 40) s += d[k].toString(16).padStart(2, '0')
      res(s)
    }
    i.onerror = () => res(null)
    i.src = src
  })
  const out = {}
  for (const r of rows) {
    out[r.deckId] ??= {}
    out[r.deckId][r.cardId] = await fp(r.full)
  }
  return out
}, sample.rows.map((r) => ({ ...r, full: BASE + r.full })))

/* 指纹必须真的取到 —— 取不到就说明这项检测没生效，必须报出来而不是静静通过 */
const fpTotal = Object.values(crossDeck).reduce((s, d) => s + Object.keys(d).length, 0)
const fpNull = Object.values(crossDeck).reduce(
  (s, d) => s + Object.values(d).filter((v) => !v).length, 0)

const cards = [...new Set(sample.rows.map((r) => r.cardId))]
const decks = sample.decks
let crossIssues = 0
for (const cid of cards) {
  const seen = new Map()
  for (const d of decks) {
    const f = crossDeck[d]?.[cid]
    if (!f) continue
    if (seen.has(f)) {
      crossIssues++
      problems.push({ sev: 'P0', card: cid, issue: `串套：${d} 与 ${seen.get(f)} 的画面完全相同` })
    }
    seen.set(f, d)
  }
}

const out = {
  total: results.length, decks, brokenFull: broken, brokenThumb: thumbBad,
  sizeMismatch, crossDeckDuplicates: crossIssues,
  crossDeckFingerprints: { total: fpTotal, failed: fpNull,
    valid: fpNull === 0 ? '✅ 全部取到，串套检测真实生效' : `⚠ ${fpNull} 张取不到指纹，该项检测未完全生效` },
  coverage: {
    arcana: [...new Set(sample.rows.map((r) => r.arcana))],
    suits: [...new Set(sample.rows.map((r) => r.suit).filter(Boolean))],
    orientations: [...new Set(sample.rows.map((r) => r.orientation))],
    courtCards: sample.rows.filter((r) => ['wands-11', 'cups-14', 'swords-12'].includes(r.cardId)).length,
  },
  problems,
  rows: results.map((r) => ({
    deck: r.deckId, card: r.cardId, name: r.nameZh, orientation: r.orientation,
    full: `${r.fullLoad.w}×${r.fullLoad.h}`, thumb: `${r.thumbLoad.w}×${r.thumbLoad.h}`,
    ok: r.fullLoad.ok && r.thumbLoad.ok,
  })),
}
writeFileSync(`${OUT}/artwork-sample-result.json`, JSON.stringify(out, null, 2))

console.log(`抽样 ${out.total} 张 · ${decks.length} 套`)
console.log(`覆盖 arcana=${out.coverage.arcana.join('/')} suits=${out.coverage.suits.join('/')} 宫廷牌=${out.coverage.courtCards} 张 正逆位=${out.coverage.orientations.join('/')}`)
console.log(`full 加载失败 ${broken} · thumb 加载失败 ${thumbBad} · 尺寸不符 ${sizeMismatch} · 串套 ${crossIssues}`)
console.log(`串套指纹: ${fpTotal - fpNull}/${fpTotal} 取到` + (fpNull ? `  ⚠ ${fpNull} 张失败，该检测未完全生效` : '  ✅ 检测真实生效'))
if (fpNull > 0) problems.push({ sev: 'P1', issue: `串套检测有 ${fpNull} 张取不到指纹，结论不可信` })
console.log(`console error ${consoleErrors.length} · 失败请求 ${failedRequests.length}`)
if (problems.length) console.log('问题:\n' + JSON.stringify(problems, null, 1))
else console.log('✅ 50 张全部正常：可解码、尺寸与登记一致、五套画面互不相同')

/* 视觉抽样图：五套 × 10 张贴成一张，供人工看裁切与主体可读性 */
await page.setContent(`<body style="margin:0;background:#0b0d14;font:11px system-ui;color:#8892a6">
${sample.decks.map((d) => `<div style="padding:6px 8px;color:#cbd3e1;font-size:13px">${d}</div>
<div style="display:flex;gap:4px;padding:0 8px 10px">
${sample.rows.filter((r) => r.deckId === d).map((r) => `<div style="text-align:center">
<img src="${BASE + r.full}" style="width:104px;height:173px;object-fit:cover;border-radius:3px">
<div>${r.cardId}${r.orientation === 'reversed' ? ' ⌃逆' : ''}</div></div>`).join('')}
</div>`).join('')}
</body>`)
await wait(page, 3500)
await shot(page, 'artwork-sample-grid', true)
await browser.close()
