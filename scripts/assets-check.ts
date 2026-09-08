/**
 * Runtime Artwork 完备性检查、完整性锁与真实恢复（Phase E1 → E2.2）
 *
 * 【它回答一个具体问题】
 * 一个新开发者 clone 仓库之后，怎么知道牌面齐不齐？齐不齐又该怎么补？
 * 如果将来 780 个牌面文件**不再进 git**（走 R2 / CDN），这个问题会立刻变成阻塞项 ——
 * 而「问一下老同事」不是一种恢复机制。
 *
 * 所以这里定义三件事：
 *   1. `assets:check`   —— 本地牌面到底缺哪些、坏哪些（可机读、可 CI）
 *   2. `assets:lock`    —— 把「正确的 780 个文件长什么样」固化成 artwork.lock.json
 *   3. `assets:sync`    —— 缺的/坏的那些，**真的从资产根取回来**并逐字节校验
 *
 * ═══════════════════════════════════════════════════════════
 * 【E2.2：真实下载接上了，以及为什么需要一个锁文件】
 *
 * E1 时这里写的是「真实下载留到确定 CDN 之后（Phase E2）」。E2 已经确定：
 * 780 个对象在 Cloudflare R2，路径形状与本地逐段相同。于是下载本身是简单的。
 *
 * 难的是**「取回来的到底对不对」**。E2.1 的 ORG-04 已经证明过一次：
 * 对象存储配错时最常见的表现不是 404，而是 **200 + 一个错误文档**。
 * 把那个 XML 存成 `major-00.webp`，磁盘上就有了一个「存在、非空、可疑」的文件 ——
 * 从此 assets:check 全绿，而产品显示裂图。
 *
 * 校验需要一份可信的期望值（每个对象的 sha256 与字节数）。原本唯一的一份在
 * `deployment/manifests/artwork-manifest.json` —— 但它是 `deployment:build` 的产物，
 * 被 .gitignore 排除，而 `deployment:build` 又要求本地牌面**已经齐备**。
 * 于是恰恰在最需要它的场景（刚 clone、牌面还没下载）它一定不存在。
 *
 * `artwork.lock.json` 就是为了切断这个循环：**它进 git**，
 * 和 package-lock.json 同一个性质 —— 记录「这份仓库期望的 780 个字节流是哪些」。
 * 它不描述任何一台机器的现状，所以在空目录上依然成立。
 * ═══════════════════════════════════════════════════════════
 *
 * 用法：
 *   npm run assets:check                     完备性（存在 / 非空 / 字节数与锁一致）
 *   npm run assets:check -- --verify         再加逐文件 sha256（读满 ~276MB，慢但确定）
 *   npm run assets:lock                      从当前本地牌面重新生成锁（要求本地齐备）
 *   npm run assets:sync -- --dry-run         只打印恢复计划，不下载
 *   npm run assets:sync                      真实下载缺失/损坏的对象
 *   npm run assets:sync -- --force           不管本地有没有，全部重下
 *   ARCANA_ASSET_SOURCE=https://… npm run assets:sync
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'
import { getManifest } from '../src/decks/artwork/manifests.ts'
import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import {
  cardArtworkUrl, urlToRepoPath, normalizeAssetBase, LOCAL_ASSET_BASE,
} from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m'
const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
const ROOT = resolve(import.meta.dirname, '..')
const LOCK_FILE = join(ROOT, 'artwork.lock.json')

/* ── 参数 ── */
const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
const valueOf = (f: string) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : undefined)

const DRY = has('--dry-run')
const SYNC = has('--sync') || DRY
const WRITE_LOCK = has('--lock')
const FORCE = has('--force')
/** sha256 逐文件校验。默认关：780 个文件 ~276MB，日常 check 不该等它 */
const VERIFY = has('--verify') || WRITE_LOCK
const CONCURRENCY = Number(valueOf('--concurrency')) || 8
const RETRIES = 2

/* ── 期望的 780 个对象 ──
   来自产品代码本身（manifests + paths），不是扫盘 ——
   扫盘只能告诉你「磁盘上有什么」，回答不了「应该有什么」。 */
interface Want {
  deckId: string; cardId: string; variant: 'full' | 'thumb'; rev: number
  /** 对象相对路径：`<deckId>/{cards|thumbs}/<cardId>.webp`，与 R2 上逐段相同 */
  objectPath: string
  /** 仓库内相对路径 */
  repoPath: string
  /** 带 rev query 的运行期 URL 尾巴，拼上资产根即为真实 URL */
  urlTail: string
}

const playable = ALL_DECK_IDS.filter((id) => isDeckPlayable(id))
const want: Want[] = []
for (const deckId of playable) {
  const m = getManifest(deckId)!
  for (const [cardId, entry] of Object.entries(m.cards)) {
    const rev = entry.rev ?? m.rev
    for (const variant of ['full', 'thumb'] as const) {
      if (variant === 'thumb' && entry.thumb !== true) continue
      const url = cardArtworkUrl(deckId, cardId, rev, variant)
      const urlTail = url.slice(LOCAL_ASSET_BASE.length)
      want.push({
        deckId, cardId, variant, rev, urlTail,
        objectPath: (urlTail.split('?')[0] ?? urlTail).replace(/^\//, ''),
        repoPath: urlToRepoPath(url),
      })
    }
  }
}
want.sort((a, b) => a.objectPath.localeCompare(b.objectPath))

/* ── 锁文件 ──
   files 用「路径 → {bytes, sha256}」的映射而不是数组：查找是 O(1)，
   而且 git diff 上一行就是一个对象，改了哪张牌一眼看得见。 */
interface Lock {
  contract: string
  generatedAt: string
  note: string
  decks: string[]
  revisions: Record<string, number>
  counts: { full: number; thumb: number; total: number; bytes: number }
  files: Record<string, { bytes: number; sha256: string }>
}

const sha256Of = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex')

function readLock(): Lock | null {
  if (!existsSync(LOCK_FILE)) return null
  try { return JSON.parse(readFileSync(LOCK_FILE, 'utf8')) as Lock } catch { return null }
}

/* ── 本地现状 ── */
type State = 'ok' | 'missing' | 'empty' | 'size' | 'hash' | 'unlocked'
interface Local { want: Want; state: State; bytes: number }

function inspect(lock: Lock | null, withHash: boolean): Local[] {
  return want.map((w) => {
    const p = join(ROOT, w.repoPath)
    if (!existsSync(p)) return { want: w, state: 'missing' as State, bytes: 0 }
    const bytes = statSync(p).size
    if (bytes === 0) return { want: w, state: 'empty' as State, bytes }
    const expect = lock?.files[w.objectPath]
    if (!expect) return { want: w, state: 'unlocked' as State, bytes }
    if (expect.bytes !== bytes) return { want: w, state: 'size' as State, bytes }
    if (withHash && sha256Of(p) !== expect.sha256) return { want: w, state: 'hash' as State, bytes }
    return { want: w, state: 'ok' as State, bytes }
  })
}

/* ── 恢复源 ──
   三个来源，按可信度排序。第三个是 E2.1 的「产物自述资产根」的直接复用：
   dist/arcana-build.json 记着这份产物构建时真正用的根，
   那是构建期的事实，比任何运行期猜测都硬。 */
function resolveSource(): { base: string; from: string } | null {
  const explicit = valueOf('--source') ?? argv.find((a) => /^https?:\/\//.test(a))
  if (explicit) return { base: normalizeAssetBase(explicit), from: '命令行参数' }
  const env = process.env.ARCANA_ASSET_SOURCE
  if (env && env.trim()) return { base: normalizeAssetBase(env), from: 'ARCANA_ASSET_SOURCE' }
  const buildManifest = join(ROOT, 'dist', 'arcana-build.json')
  if (existsSync(buildManifest)) {
    try {
      const m = JSON.parse(readFileSync(buildManifest, 'utf8')) as { assetBase?: string; assetMode?: string }
      if (m.assetMode === 'remote' && m.assetBase) {
        return { base: normalizeAssetBase(m.assetBase), from: 'dist/arcana-build.json（产物自述资产根）' }
      }
    } catch { /* 产物坏了就当没有，下面会照常提示三条恢复途径 */ }
  }
  return null
}

/* ── 下载一个对象 ──
 *
 * 【为什么写临时文件再改名，而不是直接写目标路径】
 * 这个脚本自己在上面把「空文件」列为「传输中断的典型症状」。
 * 直接往目标路径写，一次 Ctrl-C 就会亲手制造那个症状 ——
 * 而且下一次 assets:check 只会说「有这个文件」。
 * 先写 `.part`、校验通过后 rename（同目录内的 rename 是原子的），
 * 目标路径就只有两种状态：不存在，或者是一份已经验过的完整文件。
 *
 * 【为什么校验放在 rename 之前】
 * 校验不过的字节根本不该落到 public/ 里。200 + 错误文档这种东西一旦落盘，
 * 它就有了「存在且非空」这个身份，之后每一次不带 --verify 的 check 都会放它过。
 */
interface Fetched { want: Want; ok: boolean; bytes: number; retries: number; reason?: string }

async function download(w: Want, base: string, lock: Lock | null): Promise<Fetched> {
  const url = `${base}${w.urlTail}`
  const dest = join(ROOT, w.repoPath)
  const part = `${dest}.part`
  let retries = 0
  for (;;) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if ((res.status === 429 || res.status >= 500) && retries < RETRIES) {
        await res.arrayBuffer(); retries += 1
        await new Promise((r) => setTimeout(r, 500 * retries)); continue
      }
      if (res.status !== 200) {
        await res.arrayBuffer()
        return { want: w, ok: false, bytes: 0, retries, reason: `HTTP ${res.status}` }
      }
      const buf = Buffer.from(await res.arrayBuffer())

      /* WebP 魔数 `RIFF` + 4 字节长度 + `WEBP`。
         这一条是「拿到的是一张图」与「拿到的是错误页」的分界线 —— 见 ORG-04 */
      const isWebp = buf.length > 12
        && buf.subarray(0, 4).toString('ascii') === 'RIFF'
        && buf.subarray(8, 12).toString('ascii') === 'WEBP'
      if (!isWebp) {
        return { want: w, ok: false, bytes: buf.length, retries, reason: '不是 WebP（极可能是错误页或 SPA 兜底）' }
      }

      const expect = lock?.files[w.objectPath]
      if (expect) {
        if (buf.length !== expect.bytes) {
          return { want: w, ok: false, bytes: buf.length, retries, reason: `字节数 ${buf.length} ≠ 锁 ${expect.bytes}` }
        }
        const got = createHash('sha256').update(buf).digest('hex')
        if (got !== expect.sha256) {
          return { want: w, ok: false, bytes: buf.length, retries, reason: `sha256 不符（源上的不是这一版）` }
        }
      }

      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(part, buf)
      renameSync(part, dest)
      return { want: w, ok: true, bytes: buf.length, retries }
    } catch (err) {
      /* .r2.dev 实测会间歇性掐断连接 —— 重试后仍失败才算失败，见 ORG-01b */
      if (retries < RETRIES) {
        retries += 1
        await new Promise((r) => setTimeout(r, 500 * retries)); continue
      }
      try { if (existsSync(part)) rmSync(part) } catch { /* 清不掉就留着，下次覆盖 */ }
      return { want: w, ok: false, bytes: 0, retries, reason: (err as Error).message }
    }
  }
}

async function mapLimit<T, U>(items: T[], limit: number, fn: (t: T, i: number) => Promise<U>): Promise<U[]> {
  const out: U[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next; next += 1
      if (i >= items.length) return
      out[i] = await fn(items[i]!, i)
    }
  }))
  return out
}

/* ══ 主流程 ══ */
async function main(): Promise<number> {
  const lock = readLock()

  /* ── 生成锁 ──
     锁必须从一份**已知齐备**的本地牌面生成。允许从残缺的目录生成，
     等于把当时的残缺固化成「期望值」，之后所有校验都会照着错的那份全绿。 */
  if (WRITE_LOCK) {
    console.log(`${B}生成 artwork.lock.json${X}`)
    const broken = inspect(null, false).filter((l) => l.state === 'missing' || l.state === 'empty')
    if (broken.length) {
      console.log(`  ${R}本地牌面不齐（缺失/空 ${broken.length} 个），拒绝生成锁${X}`)
      console.log(`  ${D}锁是「期望值」，从残缺的目录生成会把残缺固化成期望。${X}`)
      console.log(`  ${D}先 npm run assets:sync 补齐，或 git checkout -- public/assets/decks${X}`)
      return 1
    }
    const files: Lock['files'] = {}
    let bytes = 0
    for (const w of want) {
      const p = join(ROOT, w.repoPath)
      const size = statSync(p).size
      bytes += size
      files[w.objectPath] = { bytes: size, sha256: sha256Of(p) }
    }
    const next: Lock = {
      contract: 'v1',
      generatedAt: new Date().toISOString(),
      note: '牌面完整性锁。进 git —— 刚 clone、牌面还没下载时，它是唯一可信的期望值来源。'
        + ' 由 npm run assets:lock 生成，被 npm run assets:check / assets:sync 校验。',
      decks: playable,
      revisions: Object.fromEntries(playable.map((id) => [id, getManifest(id)!.rev])),
      counts: {
        full: want.filter((w) => w.variant === 'full').length,
        thumb: want.filter((w) => w.variant === 'thumb').length,
        total: want.length,
        bytes,
      },
      files,
    }
    const changed = lock
      ? want.filter((w) => lock.files[w.objectPath]?.sha256 !== files[w.objectPath]!.sha256).length
      : want.length
    writeFileSync(LOCK_FILE, `${JSON.stringify(next, null, 2)}\n`)
    console.log(`  ${G}已写入${X}  artwork.lock.json  ${D}${want.length} 个对象 · ${(bytes / 1048576).toFixed(1)} MB${X}`)
    console.log(`  ${lock ? `与上一版相比有 ${changed} 个对象的 sha256 变化` : '首次生成'}`)
    return 0
  }

  /* ── 现状 ── */
  const before = inspect(lock, VERIFY)
  const count = (s: State) => before.filter((l) => l.state === s).length
  const bad = before.filter((l) => l.state !== 'ok' && l.state !== 'unlocked')

  console.log(`${B}Runtime Artwork 完备性${X}`)
  console.log(`  牌组 ${playable.length} 套：${playable.join(', ')}`)
  console.log(`  期望 ${want.length} 个文件（full ${want.filter((w) => w.variant === 'full').length} · thumb ${want.filter((w) => w.variant === 'thumb').length}）`)
  if (lock) {
    console.log(`  锁   artwork.lock.json  ${D}${lock.counts.total} 个对象 · contract ${lock.contract}${X}`)
    const strayInLock = Object.keys(lock.files).filter((p) => !want.some((w) => w.objectPath === p))
    const notInLock = count('unlocked')
    if (strayInLock.length || notInLock) {
      console.log(`  ${Y}锁与代码不同步${X}  ${D}锁里多出 ${strayInLock.length} 个 · 代码要求但锁里没有 ${notInLock} 个 —— 跑 npm run assets:lock${X}`)
    }
  } else {
    console.log(`  ${Y}锁   缺失${X}  ${D}artwork.lock.json 不在 —— 只能查存在与非空，无法验字节${X}`)
  }
  console.log(`  本地 ${want.length - count('missing')} 个 · 缺失 ${count('missing')} · 空 ${count('empty')}`
    + ` · 字节数不符 ${count('size')} · sha256 不符 ${count('hash')}`
    + (VERIFY ? '' : `  ${D}（未验 sha256，加 --verify）${X}`))

  if (bad.length === 0) {
    console.log(`\n${G}完整${X}  本地牌面齐备${lock ? '且与锁一致' : ''}，可直接 npm run dev`)
  } else {
    const byDeck: Record<string, number> = {}
    for (const l of bad) byDeck[l.want.deckId] = (byDeck[l.want.deckId] ?? 0) + 1
    console.log(`\n${R}不完整${X}`)
    for (const [d, n] of Object.entries(byDeck)) console.log(`  ${d}: ${n} 个待恢复`)
    for (const l of bad.slice(0, 5)) console.log(`  ${D}${l.state.padEnd(7)} ${l.want.objectPath}${X}`)
    if (bad.length > 5) console.log(`  ${D}…… 还有 ${bad.length - 5} 个${X}`)
  }

  if (!SYNC) return bad.length === 0 ? 0 : 1

  /* ── 恢复 ── */
  console.log(`\n${B}恢复计划${X}`)
  const source = resolveSource()
  if (!source) {
    console.log(`  ${Y}未配置恢复源${X}`)
    console.log(`  ${D}设置 ARCANA_ASSET_SOURCE 或直接给一个 URL，例如：${X}`)
    console.log(`  ${D}  npm run assets:sync -- https://assets.example.com${X}`)
    console.log(`\n  ${D}当前可用的恢复途径（按优先级）：${X}`)
    console.log(`  ${D}  1. 牌面仍在 git 里 → git checkout -- public/assets/decks${X}`)
    console.log(`  ${D}  2. 从对象存储取回 → npm run assets:sync -- <资产根>${X}`)
    console.log(`  ${D}  3. 直接用生产 CDN 开发 → VITE_DECK_ASSET_BASE_URL=<CDN> npm run dev${X}`)
    return bad.length === 0 ? 0 : 1
  }

  const targets = FORCE ? want : bad.map((l) => l.want)
  console.log(`  源：${source.base}  ${D}← ${source.from}${X}`)
  console.log(`  待取 ${targets.length} 个对象${FORCE ? `（--force：不管本地有没有）` : ''}`)
  console.log(`  校验：WebP 魔数${lock ? ' + 字节数 + sha256（对 artwork.lock.json）' : `  ${Y}无锁 —— 只能验魔数${X}`}`)

  if (targets.length === 0) {
    console.log(`  ${G}没有要取的${X}`)
    return 0
  }

  if (DRY) {
    for (const w of targets.slice(0, 5)) {
      console.log(`    ${source.base}${w.urlTail}`)
      console.log(`      → ${w.repoPath}`)
    }
    if (targets.length > 5) console.log(`    ${D}…… 还有 ${targets.length - 5} 个${X}`)
    console.log(`\n  ${Y}--dry-run：不下载任何文件${X}`)
    return bad.length === 0 ? 0 : 1
  }

  const t0 = Date.now()
  let done = 0
  const results = await mapLimit(targets, CONCURRENCY, async (w) => {
    const r = await download(w, source.base, lock)
    done += 1
    if (done % 50 === 0 || done === targets.length) {
      process.stdout.write(`  ${D}${done}/${targets.length}${X}\r`)
    }
    return r
  })

  const okCount = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  const retried = results.filter((r) => r.retries > 0)
  const gotBytes = results.filter((r) => r.ok).reduce((s, r) => s + r.bytes, 0)
  const secs = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`\n  取回 ${okCount} / ${targets.length} 个 · ${(gotBytes / 1048576).toFixed(1)} MB · ${secs}s · 并发 ${CONCURRENCY}`)
  /* 掉包率是 E2.1 要改善的指标，不能被「重试后成功了」吞掉 */
  if (retried.length) console.log(`  ${Y}需要重试才成功的对象 ${retried.length} 个${X}  ${D}—— 资产根在掉连接${X}`)
  if (failed.length) {
    console.log(`\n  ${R}失败 ${failed.length} 个${X}  ${D}（这些文件没有落盘 —— 宁可缺，不要一个坏的）${X}`)
    for (const f of failed.slice(0, 8)) console.log(`  ${R}·${X} ${f.want.objectPath}  ${D}${f.reason}${X}`)
    if (failed.length > 8) console.log(`  ${D}…… 还有 ${failed.length - 8} 个${X}`)
  }

  /* ── 复验 ──
     不复用下载时的判断：那验的是「刚才收到的字节」，
     这里要验的是「现在磁盘上真的躺着什么」。中间隔着写盘与 rename。 */
  const after = inspect(lock, VERIFY || lock !== null)
  const stillBad = after.filter((l) => l.state !== 'ok' && l.state !== 'unlocked')
  if (stillBad.length === 0) {
    console.log(`\n${G}完整${X}  ${want.length} 个牌面${lock ? '与锁逐字节一致' : '齐备'}`)
    return 0
  }
  console.log(`\n${R}仍不完整${X}  ${stillBad.length} 个未恢复`)
  return 1
}

main().then((code) => process.exit(code), (err: unknown) => {
  console.error(`${R}${(err as Error).stack ?? String(err)}${X}`)
  process.exit(2)
})
