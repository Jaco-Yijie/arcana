/**
 * Phase D3 · Release Readiness —— 真实网络审计
 *
 * dev-only。驱动系统 Chrome，逐页记录**每一个**网络请求，
 * 按资源类型与 artwork variant（full / thumb / back / cover）分桶。
 * 只观测，不改产品代码。
 *
 * 用法：node qa/release/_network-audit.mjs [home|decks|journey|all]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { VIEWPORTS, launch, BASE } from '../product-polish/walkthrough.mjs'

const OUT = 'qa/release'
mkdirSync(OUT, { recursive: true })

/** 把一个 URL 归类。artwork 的判定完全按 paths.ts 的目录形状 */
function classify(url) {
  const u = url.replace(BASE, '')
  if (/\/assets\/decks\/[^/]+\/cards\//.test(u)) return 'artwork-full'
  if (/\/assets\/decks\/[^/]+\/thumbs\//.test(u)) return 'artwork-thumb'
  if (/\/assets\/decks\/[^/]+\/deck\/back-thumb/.test(u)) return 'card-back-thumb'
  if (/\/assets\/decks\/[^/]+\/deck\/back/.test(u)) return 'card-back-full'
  if (/\/assets\/decks\/[^/]+\/deck\/cover-thumb/.test(u)) return 'cover-thumb'
  if (/\/assets\/decks\/[^/]+\/deck\/cover/.test(u)) return 'cover-full'
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(u)) return 'font'
  if (/\.css(\?|$)/.test(u)) return 'css'
  if (/\.(js|mjs|ts|tsx)(\?|$)/.test(u) || u.startsWith('/@') || u.startsWith('/src/')) return 'js'
  if (/^\/api\//.test(u)) return 'api'
  if (/\.(png|jpe?g|svg|webp|avif)(\?|$)/i.test(u)) return 'image-other'
  return 'other'
}

export function makeRecorder(page) {
  const rows = []
  page.on('response', async (res) => {
    const req = res.request()
    const url = res.url()
    let bytes = 0
    try {
      const h = res.headers()
      bytes = Number(h['content-length'] ?? 0)
      if (!bytes) {
        const body = await res.body().catch(() => null)
        bytes = body ? body.length : 0
      }
    } catch { /* 忽略：某些响应体不可取（重定向/中断） */ }
    rows.push({
      url: url.replace(BASE, ''),
      kind: classify(url),
      method: req.method(),
      status: res.status(),
      bytes,
      fromCache: res.fromServiceWorker?.() ?? false,
    })
  })
  return {
    rows,
    reset: () => { rows.length = 0 },
    summary() {
      const by = {}
      for (const r of rows) {
        by[r.kind] ??= { count: 0, bytes: 0 }
        by[r.kind].count++
        by[r.kind].bytes += r.bytes
      }
      return by
    },
  }
}

export function fmtSummary(title, by, rows) {
  const lines = [`===== ${title} =====`]
  const order = ['artwork-full', 'artwork-thumb', 'card-back-full', 'card-back-thumb',
    'cover-full', 'cover-thumb', 'image-other', 'font', 'css', 'js', 'api', 'other']
  let tc = 0, tb = 0
  for (const k of order) {
    const v = by[k]
    if (!v) continue
    tc += v.count; tb += v.bytes
    lines.push(`  ${k.padEnd(16)} ${String(v.count).padStart(4)} 个  ${(v.bytes / 1024).toFixed(1).padStart(9)} KB`)
  }
  lines.push(`  ${'合计'.padEnd(14)} ${String(tc).padStart(4)} 个  ${(tb / 1024).toFixed(1).padStart(9)} KB`)
  const art = ['artwork-full', 'artwork-thumb', 'card-back-full', 'card-back-thumb', 'cover-full', 'cover-thumb']
  const ac = art.reduce((s, k) => s + (by[k]?.count ?? 0), 0)
  const ab = art.reduce((s, k) => s + (by[k]?.bytes ?? 0), 0)
  lines.push(`  → Artwork 小计   ${String(ac).padStart(4)} 个  ${(ab / 1024).toFixed(1).padStart(9)} KB`)
  const uniq = [...new Set(rows.filter((r) => r.kind.startsWith('artwork') || r.kind.startsWith('card-back') || r.kind.startsWith('cover')).map((r) => r.url))]
  lines.push(`  → Artwork 去重后 ${String(uniq.length).padStart(4)} 个 URL`)
  return lines.join('\n')
}
