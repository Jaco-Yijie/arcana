/**
 * 资产根真实核验（ORG 组 · Phase E2.1）
 *
 * 【它和 assets:check / deployment:check 的分工】
 * `assets:check` 问「本地 390 张在不在」，`deployment:check` 问「包对不对」——
 * 两者都是**离线**的，查的是磁盘。
 * 这一组问的是唯一一个它们查不到的问题：
 * **「把 VITE_DECK_ASSET_BASE_URL 设成这个 URL 之后，牌面真的能取回来吗」。**
 *
 * 【为什么必须真的下载字节，而不是看 200】
 * 对象存储配错时最常见的表现**不是** 404，而是 200 + 一个 XML 错误文档，
 * 或者 200 + SPA 兜底的 index.html。`<img>` 拿到它只会静静显示裂图，
 * 而任何只统计 HTTP 状态码的检查全绿。所以这里逐个：
 *   取回字节 → 验 WebP 魔数 → 算 sha256 → 与 artwork-manifest 逐字节比对。
 *
 * 【为什么它是 E2.1 的核心工具】
 * E2.1 要把 rate-limited 的 `.r2.dev` 换成自有域名 + Cloudflare Cache。
 * 「换完了有没有更好」不能靠感觉 —— 这个脚本对**两个根**跑同一批断言，
 * 尤其是二次请求的 `cf-cache-status`：`.r2.dev` 上根本没有这个头
 * （Cloudflare 自己标注该 URL 无法使用 Cache），换域名后应当出现 HIT。
 * 那一列就是这次迁移唯一的、可验证的收益证据。
 *
 * 用法：
 *   npm run assets:origin -- https://assets.example.com
 *   npm run assets:origin -- https://assets.example.com --samples 4
 *   npm run assets:origin -- https://assets.example.com --all      # 全部 780 个
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { normalizeAssetBase } from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m'
const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
let pass = 0; let fail = 0
const failures: string[] = []
function check(name: string, ok: boolean, note = ''): void {
  if (ok) { pass += 1; console.log(`  ${G}PASS${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`) }
  else { fail += 1; failures.push(name); console.log(`  ${R}FAIL${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`) }
}
/** 观察项：记录但不判定成败。缓存是否命中取决于对方有没有被预热过，不该让 CI 变红 */
function note(name: string, value: string): void {
  console.log(`  ${Y}NOTE${X}  ${name}  ${D}${value}${X}`)
}
function section(t: string): void { console.log(`\n${B}${t}${X}`) }

const ROOT = resolve(import.meta.dirname, '..')
const MANIFEST = join(ROOT, 'deployment', 'manifests', 'artwork-manifest.json')

interface ManifestFile {
  deckId: string; cardId: string; variant: 'full' | 'thumb'
  path: string; url: string; rev: number; bytes: number; sha256: string
}
interface Manifest {
  contract: string; pathShape: string; decks: string[]
  counts: { full: number; thumb: number; total: number; bytes: number }
  revisions: Record<string, number>
  files: ManifestFile[]
}

/* ── 参数 ── */
const argv = process.argv.slice(2)
const rawBase = argv.find((a) => !a.startsWith('--'))
const wantAll = argv.includes('--all')
const perDeck = Number(argv[argv.indexOf('--samples') + 1]) || 2

if (!rawBase) {
  console.error(`${R}用法：npm run assets:origin -- <资产根 URL> [--samples N] [--all]${X}`)
  console.error(`${D}      资产根是 VITE_DECK_ASSET_BASE_URL 的值 —— 根，不带 /<deckId> 或 /cards${X}`)
  process.exit(2)
}
if (!existsSync(MANIFEST)) {
  console.error(`${R}找不到 ${MANIFEST} —— 先跑 npm run deployment:build${X}`)
  process.exit(2)
}

/* 归一走产品代码自己那一份。资产根多一个斜杠就是 780 个 404，
   这条规则不能在核验脚本里另写一遍 —— 否则脚本验的是它自己的想象。 */
const base = normalizeAssetBase(rawBase)
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest

console.log(`${B}资产根${X}  ${base}`)
console.log(`${D}manifest  ${manifest.counts.total} 个对象 · contract ${manifest.contract}${X}`)

/* ── 抽样 ──
   默认每套牌 full/thumb 各 N 个，覆盖全部 5 套；--all 时验全部 780 个。
   固定按 cardId 排序后等距取样，而不是随机 —— 同一次迁移的前后两次运行
   必须验的是同一批对象，否则「换域名前后」根本没法比。 */
function pick(): ManifestFile[] {
  if (wantAll) return manifest.files
  const out: ManifestFile[] = []
  for (const deckId of manifest.decks) {
    for (const variant of ['full', 'thumb'] as const) {
      const group = manifest.files
        .filter((f) => f.deckId === deckId && f.variant === variant)
        .sort((a, b) => a.cardId.localeCompare(b.cardId))
      const step = Math.max(1, Math.floor(group.length / perDeck))
      for (let i = 0; i < perDeck && i * step < group.length; i += 1) out.push(group[i * step]!)
    }
  }
  return out
}
const samples = pick()

const toUrl = (f: ManifestFile) => f.url.replace('<ASSET_BASE>', base)

interface Probe {
  file: ManifestFile; url: string
  status: number; contentType: string; cacheControl: string
  cfCacheStatus: string | null; age: string | null
  bytes: number; sha256: string
  isWebp: boolean; ms: number; retries: number; error?: string
}

/**
 * 取回一个对象，失败重试两次。
 *
 * 【为什么必须重试，以及为什么重试次数要单独记下来】
 * `.r2.dev` 实测会**间歇性掐断连接**（20 个并发抽样里偶尔 2 个 `terminated`，
 * 下一轮又全过）—— 那正是 Cloudflare 标注的 rate-limited。
 *
 * 不重试，这条断言就是个 flaky gate：偶尔红一次，很快就被当成噪音忽略，
 * 那它守的东西也就没人看了。
 * 但把失败悄悄吞掉同样错 —— 掉包率恰恰是 E2.1 要改善的那个指标。
 *
 * 所以：**重试后仍失败才判 FAIL，重试次数作为观察项单独报出来。**
 * 换到自有域名 + Cloudflare Cache 之后，这个数应当归零。
 */
const RETRIES = 2

async function probe(f: ManifestFile): Promise<Probe> {
  const url = toUrl(f)
  const t0 = Date.now()
  const empty = {
    file: f, url, status: 0, contentType: '', cacheControl: '',
    cfCacheStatus: null, age: null, bytes: 0, sha256: '', isWebp: false, retries: 0,
  }
  let retries = 0
  for (;;) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if ((res.status === 429 || res.status >= 500) && retries < RETRIES) {
        await res.arrayBuffer()
        retries += 1
        await new Promise((r) => setTimeout(r, 500 * retries))
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      return {
        ...empty,
        retries,
        status: res.status,
        contentType: res.headers.get('content-type') ?? '',
        cacheControl: res.headers.get('cache-control') ?? '',
        cfCacheStatus: res.headers.get('cf-cache-status'),
        age: res.headers.get('age'),
        bytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
        /* WebP 的魔数是 `RIFF` + 4 字节长度 + `WEBP`。
           这一条是「拿到的是不是一张图」与「拿到的是不是错误页」的分界线 */
        isWebp: buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF'
          && buf.subarray(8, 12).toString('ascii') === 'WEBP',
        ms: Date.now() - t0,
      }
    } catch (err) {
      if (retries < RETRIES) {
        retries += 1
        await new Promise((r) => setTimeout(r, 500 * retries))
        continue
      }
      return { ...empty, retries, ms: Date.now() - t0, error: (err as Error).message }
    }
  }
}

/** 并发 8。对方是 CDN，不是我们的服务；也不要把 .r2.dev 的限速直接撞满 */
async function mapLimit<T, U>(items: T[], limit: number, fn: (t: T) => Promise<U>): Promise<U[]> {
  const out: U[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next; next += 1
      if (i >= items.length) return
      out[i] = await fn(items[i]!)
    }
  }))
  return out
}

async function main(): Promise<void> {
  section(`ORG · 抽样取回（${samples.length} 个对象，并发 8）`)
  const first = await mapLimit(samples, 8, probe)

  const errored = first.filter((p) => p.error)
  check(`ORG-01 全部请求最终都完成（每个最多重试 ${RETRIES} 次）`, errored.length === 0,
    errored.length ? `${errored.length} 个重试后仍失败：${errored[0]!.error}` : `${first.length} 个`)

  /* 这一行是 E2.1 的核心指标之一。`.r2.dev` 上它不为 0，自有域名上应当为 0 */
  const retried = first.filter((p) => p.retries > 0)
  const retryTotal = first.reduce((n, p) => n + p.retries, 0)
  note('ORG-01b 需要重试才成功的对象',
    retried.length === 0
      ? '0 个 —— 连接稳定'
      : `${retried.length} / ${first.length} 个（共重试 ${retryTotal} 次）—— 资产根在掉连接`)

  const bad = first.filter((p) => p.status !== 200)
  check('ORG-02 全部返回 200', bad.length === 0,
    bad.length ? bad.slice(0, 3).map((p) => `${p.status} ${p.url}`).join(' · ') : `${first.length} / ${first.length}`)

  const wrongType = first.filter((p) => p.status === 200 && !p.contentType.startsWith('image/webp'))
  check('ORG-03 Content-Type 全为 image/webp', wrongType.length === 0,
    wrongType.length ? `${wrongType[0]!.contentType} @ ${wrongType[0]!.url}` : 'image/webp')

  /* ORG-04 是本组存在的理由：200 + 错误页会通过前面所有断言 */
  const notWebp = first.filter((p) => p.status === 200 && !p.isWebp)
  check('ORG-04 取回的字节确实是可解码的 WebP（RIFF…WEBP 魔数）', notWebp.length === 0,
    notWebp.length ? `${notWebp.length} 个不是 WebP —— 极可能是错误页或 SPA 兜底` : `${first.length} 个`)

  const mismatch = first.filter((p) => p.status === 200 && p.sha256 !== p.file.sha256)
  check('ORG-05 sha256 与 artwork-manifest 逐字节一致', mismatch.length === 0,
    mismatch.length ? mismatch.slice(0, 2).map((p) => p.file.path).join(' · ') : `${first.length} / ${first.length}`)

  const sizeOff = first.filter((p) => p.status === 200 && p.bytes !== p.file.bytes)
  check('ORG-06 字节数与 manifest 一致', sizeOff.length === 0,
    sizeOff.length ? `${sizeOff[0]!.bytes} ≠ ${sizeOff[0]!.file.bytes}` : '')

  const noImmutable = first.filter((p) => p.status === 200 && !/immutable/.test(p.cacheControl))
  check('ORG-07 Cache-Control 带 immutable（rev 机制的前提）', noImmutable.length === 0,
    noImmutable.length ? `${noImmutable[0]!.cacheControl || '（空）'}` : first[0]?.cacheControl ?? '')

  /* ── ORG-08 路径契约 ──
     产品代码拼出来的 URL，和 manifest 记录的对象位置，必须是同一个。
     E2 踩过一次：资产根多带了 `/legacy-classic`，780 个全 404，
     而本地开发（相对路径）完全无感。 */
  section('ORG · 路径契约')
  /* URL 的**形状**必须来自产品代码本身，不能在这里照着契约再拼一遍 ——
     那样脚本验的是它自己的想象。`assetBaseUrl()` 在 Node 里读不到
     `import.meta.env`，恒为本地根，所以这里的做法是：让产品函数产出
     本地根下的完整 URL，剥掉那段前缀拿到相对形状，再接上待验的资产根。
     形状全部由 cardArtworkUrl / cardBackUrl 决定，本文件只负责拼根。 */
  const { cardArtworkUrl, LOCAL_ASSET_BASE } = await import('../src/decks/artwork/paths.ts')
  const shapeOf = (f: ManifestFile) =>
    base + cardArtworkUrl(f.deckId as never, f.cardId, f.rev, f.variant)
      .slice(LOCAL_ASSET_BASE.length)
  const shapeMismatch = samples.filter((f) => shapeOf(f) !== toUrl(f))
  check('ORG-08 产品代码拼出的 URL == manifest 记录的对象位置',
    shapeMismatch.length === 0,
    shapeMismatch.length
      ? `${shapeOf(shapeMismatch[0]!)} ≠ ${toUrl(shapeMismatch[0]!)}`
      : `${samples.length} 个逐个比对 · 例 ${shapeOf(samples[0]!)}`)

  /* ── ORG-09 根不能有 SPA 兜底 ──
     资产根若被一个会把未知路径回成 index.html 的服务器托管，
     每一张缺失的牌都会拿到 200 + HTML，而不是 404 ——
     于是「牌缺了」这件事在监控上永远不可见。 */
  const ghostUrl = `${base}/legacy-moonlight/cards/__不存在的牌__.webp`
  let ghostStatus = 0; let ghostType = ''
  try {
    const r = await fetch(ghostUrl)
    ghostStatus = r.status; ghostType = r.headers.get('content-type') ?? ''
    await r.arrayBuffer()
  } catch { /* 连不上也算「没有兜底」 */ }
  check('ORG-09 不存在的对象返回 4xx，而不是 200 + HTML 兜底',
    ghostStatus === 0 || ghostStatus >= 400, `${ghostStatus} ${ghostType}`)

  /* ── ORG-10 缓存 ──
     第二次请求同一批 URL。判定项只有「有没有 cf-cache-status 这个头」，
     命中率只作观察 —— 一个刚绑好的域名第一次跑必然大面积 MISS，
     那不是失败，但「连这个头都没有」意味着请求根本没经过 Cloudflare 缓存层。 */
  section('ORG · 缓存（二次请求）')
  const reachable = first.filter((p) => p.status === 200).map((p) => p.file)
  const second = await mapLimit(reachable.slice(0, 20), 8, probe)
  const withCfHeader = second.filter((p) => p.cfCacheStatus !== null)
  const hits = second.filter((p) => (p.cfCacheStatus ?? '').toUpperCase() === 'HIT')
  const tally = second.reduce<Record<string, number>>((acc, p) => {
    const k = p.cfCacheStatus ?? '（无该响应头）'
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  if (withCfHeader.length === 0) {
    /* 这正是 `.r2.dev` 的现状。不判 FAIL —— 本地资产模式或别家 CDN 也不会有这个头。
       但必须显式说出来，因为它就是 E2.1 要解决的那件事。 */
    note('ORG-10 Cloudflare 缓存层', '响应里没有 cf-cache-status —— 请求未经过 Cloudflare 缓存'
      + '（`.r2.dev` 开发 URL 即是如此，绑定 custom domain 后应出现此头）')
  } else {
    check('ORG-10 响应经过 Cloudflare 缓存层（有 cf-cache-status）',
      withCfHeader.length === second.length, `${withCfHeader.length} / ${second.length}`)
  }
  note('ORG-11 二次请求缓存分布', Object.entries(tally).map(([k, v]) => `${k} ×${v}`).join(' · '))
  if (withCfHeader.length > 0) {
    note('ORG-11b 命中率', `${hits.length} / ${second.length}`
      + (hits.length === 0 ? '  —— 首次预热，MISS 属正常；再跑一次应转 HIT' : ''))
  }

  const ok200 = first.filter((p) => p.status === 200)
  const p50 = [...ok200].sort((a, b) => a.ms - b.ms)[Math.floor(ok200.length / 2)]?.ms
  note('ORG-12 单对象取回耗时中位数', `${p50 ?? '-'} ms（含完整下载，非 TTFB）`)

  /* ── 存档 ──
     换域名前后要能逐项对比，所以结果必须落盘，而不是只打在终端里。 */
  const outDir = join(ROOT, 'qa', 'asset-origin')
  mkdirSync(outDir, { recursive: true })
  const host = new URL(base.startsWith('http') ? base : `https://${base}`).host
  const outFile = join(outDir, `${host}.json`)
  writeFileSync(outFile, `${JSON.stringify({
    checkedAt: new Date().toISOString(),
    assetBase: base,
    sampled: samples.length,
    retriedObjects: first.filter((p) => p.retries > 0).length,
    retryTotal: first.reduce((n, p) => n + p.retries, 0),
    mode: wantAll ? 'all' : `per-deck ${perDeck}`,
    pass, fail,
    cacheTally: tally,
    cfCacheHeaderPresent: withCfHeader.length > 0,
    medianFetchMs: p50 ?? null,
    probes: first.map((p) => ({
      path: p.file.path, status: p.status, contentType: p.contentType,
      cacheControl: p.cacheControl, cfCacheStatus: p.cfCacheStatus,
      bytes: p.bytes, sha256Match: p.sha256 === p.file.sha256, isWebp: p.isWebp,
      ms: p.ms, retries: p.retries,
    })),
  }, null, 2)}\n`)

  console.log(`\n${D}结果已存档 ${outFile.replace(ROOT, '.')}${X}`)
  console.log(`\n${B}${pass + fail} 项断言${X}  ${G}${pass} PASS${X}  ${fail ? `${R}${fail} FAIL${X}` : '0 FAIL'}`)
  if (fail) {
    console.log(`\n${R}失败项：${X}`)
    for (const f of failures) console.log(`  ${R}·${X} ${f}`)
    process.exit(1)
  }
}

void main()
