/**
 * Deployment Package 组装（Phase E1）
 *
 * 【它解决的问题】
 * 仓库现在是 3.7GB：1.4GB 美术源素材、1.4GB git 历史、349MB QA、167MB node_modules。
 * 而真正需要被部署出去的只有两样：**一个 0.7MB 的前端产物** 和 **139MB 牌面**。
 * 把整个工作区丢给部署人员，等于让他们自己去猜哪些不能上传 ——
 * 「masters 要不要传」「QA 截图算不算资产」这种问题不该在部署当天才问。
 *
 * 所以这里产出一个**只含该上传内容**的目录，并且每一项都能被 deployment:check 验证。
 *
 * 【为什么前端产物里不含牌面】
 * 牌面走 CDN（见 deployment/README.md）。前端产物因此从 146MB 掉到 0.7MB，
 * 每次发版不再重传 139MB 静态图。牌面单独成包，按 rev 独立发布。
 * 如果选择「牌面跟随前端部署」，把 artwork/ 原样放进 frontend/assets/decks/ 即可 —— 目录结构是一样的。
 *
 * 【不移动、不删除任何原始文件】
 * 只从 public/assets/decks 复制。canonical source 保持原位。
 *
 * 用法：`npm run deployment:build`
 */

import { createHash } from 'node:crypto'
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'
import { getManifest } from '../src/decks/artwork/manifests.ts'
import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import { cardArtworkUrl, urlToRepoPath } from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'; const R = '\x1b[31m'; const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'deployment')
const DIST = join(ROOT, 'dist')

function say(s: string) { console.log(s) }
function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p)
  }
  return acc
}
const human = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`
const sha256 = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex')

/* ── 0. 前置：必须先有 dist ── */
if (!existsSync(DIST)) {
  console.error(`${R}dist/ 不存在。先跑 npm run build。${X}`)
  process.exit(1)
}

/* ── 1. 清空并重建 deployment 的生成物部分 ──
   刻意**不删** README.md / production-checklist.md / config/ ——
   那三样是手写文档，不是生成物，删掉就等于每次打包都要重写。 */
for (const sub of ['frontend', 'artwork', 'manifests']) {
  const p = join(OUT, sub)
  if (existsSync(p)) rmSync(p, { recursive: true })
}
mkdirSync(join(OUT, 'frontend'), { recursive: true })
mkdirSync(join(OUT, 'artwork'), { recursive: true })
mkdirSync(join(OUT, 'manifests'), { recursive: true })

/* ── 2. Frontend Package ──
   从 dist/ 复制，但**排除 assets/decks** —— 牌面单独成包。 */
say(`\n${B}Frontend Package${X}`)
let feFiles = 0; let feBytes = 0
for (const p of walk(DIST)) {
  const rel = relative(DIST, p)
  if (rel.startsWith(join('assets', 'decks'))) continue
  const dest = join(OUT, 'frontend', rel)
  mkdirSync(join(dest, '..'), { recursive: true })
  cpSync(p, dest)
  feFiles += 1; feBytes += statSync(p).size
}
const feJs = walk(join(OUT, 'frontend')).filter((f) => f.endsWith('.js'))
const feCss = walk(join(OUT, 'frontend')).filter((f) => f.endsWith('.css'))
const sum = (a: string[]) => a.reduce((s, f) => s + statSync(f).size, 0)
say(`  文件 ${feFiles} 个 · ${human(feBytes)}`)
say(`  JS  ${feJs.length} 个 · ${human(sum(feJs))}`)
say(`  CSS ${feCss.length} 个 · ${human(sum(feCss))}`)

/* ── 3. Artwork Package ──
   只取**可用牌组**的 cards/ 与 thumbs/。
   DEV fixture（ethereal 那 3 张）与未开工牌组一律不进包 —— 它们不是产品资产。 */
say(`\n${B}Artwork Package${X}`)
const playable = ALL_DECK_IDS.filter((id) => isDeckPlayable(id))
interface Row {
  deckId: string; cardId: string; variant: 'full' | 'thumb'
  path: string; url: string; rev: number; bytes: number; sha256: string
}
const rows: Row[] = []
let missing: string[] = []
for (const deckId of playable) {
  const m = getManifest(deckId)!
  for (const [cardId, entry] of Object.entries(m.cards)) {
    const rev = entry.rev ?? m.rev
    for (const variant of ['full', 'thumb'] as const) {
      if (variant === 'thumb' && entry.thumb !== true) continue
      const url = cardArtworkUrl(deckId, cardId, rev, variant)
      const srcRel = urlToRepoPath(url)
      const src = join(ROOT, srcRel)
      if (!existsSync(src)) { missing.push(srcRel); continue }
      /* 包内路径与 CDN 上的路径逐段相同 —— 上传时整个目录原样 sync 即可 */
      const inPkg = join(deckId, variant === 'thumb' ? 'thumbs' : 'cards', `${cardId}.webp`)
      const dest = join(OUT, 'artwork', inPkg)
      mkdirSync(join(dest, '..'), { recursive: true })
      cpSync(src, dest)
      rows.push({
        deckId, cardId, variant, path: inPkg.split('\\').join('/'),
        url: url.replace('/assets/decks', '<ASSET_BASE>'),
        rev, bytes: statSync(dest).size, sha256: sha256(dest),
      })
    }
  }
}
const full = rows.filter((r) => r.variant === 'full')
const thumb = rows.filter((r) => r.variant === 'thumb')
const artBytes = rows.reduce((s, r) => s + r.bytes, 0)
say(`  牌组 ${playable.length} 套：${playable.join(', ')}`)
say(`  full  ${full.length} 张 · ${human(full.reduce((s, r) => s + r.bytes, 0))}`)
say(`  thumb ${thumb.length} 张 · ${human(thumb.reduce((s, r) => s + r.bytes, 0))}`)
say(`  合计  ${rows.length} 个文件 · ${human(artBytes)}`)
if (missing.length) say(`  ${R}缺失 ${missing.length}: ${missing.slice(0, 3).join(', ')}${X}`)

/* ── 4. Artwork Manifest ──
   sha256 的用途不是防篡改，是**发布后能验证 CDN 上那份和这里这份是同一份**。
   上传出错、传了一半、传成旧版 —— 这三件事只有逐文件哈希能查出来。 */
const manifest = {
  generatedAt: new Date().toISOString(),
  contract: 'v1',
  pathShape: '<ASSET_BASE>/<deckId>/{cards|thumbs}/<cardId>.webp?r=<rev>',
  decks: playable,
  counts: { full: full.length, thumb: thumb.length, total: rows.length, bytes: artBytes },
  revisions: Object.fromEntries(playable.map((id) => [id, getManifest(id)!.rev])),
  files: rows.sort((a, b) => a.path.localeCompare(b.path)),
}
writeFileSync(join(OUT, 'manifests', 'artwork-manifest.json'), JSON.stringify(manifest, null, 2))
say(`  manifest → deployment/manifests/artwork-manifest.json`)

/* ── 5. Frontend Manifest ── */
const feManifest = {
  generatedAt: new Date().toISOString(),
  files: walk(join(OUT, 'frontend')).map((f) => ({
    path: relative(join(OUT, 'frontend'), f).split('\\').join('/'),
    bytes: statSync(f).size, sha256: sha256(f),
  })).sort((a, b) => a.path.localeCompare(b.path)),
  totals: { files: feFiles, bytes: feBytes, js: sum(feJs), css: sum(feCss) },
  note: '不含 assets/decks —— 牌面单独成包，见 artwork-manifest.json',
}
writeFileSync(join(OUT, 'manifests', 'frontend-manifest.json'), JSON.stringify(feManifest, null, 2))

/* ── 6. Secret Audit ──
   【这里只记录「有没有」，绝不记录 Key 本身】
   一份把密钥写进去的审计报告，比不做审计更危险。 */
say(`\n${B}Secret Audit${X}`)
const scanDirs = [join(OUT, 'frontend'), DIST, join(ROOT, 'src'), join(ROOT, 'server')]
const KEY_SHAPE = /sk-[A-Za-z0-9]{16,}/
const findings: Array<{ where: string; what: string }> = []
for (const dir of scanDirs) {
  for (const f of walk(dir)) {
    if (!/\.(js|css|html|ts|tsx|json|map)$/.test(f)) continue
    const t = readFileSync(f, 'utf8')
    const rel = relative(ROOT, f)
    if (KEY_SHAPE.test(t)) findings.push({ where: rel, what: 'API Key 形状字符串' })
    if (/DEEPSEEK_API_KEY/.test(t) && !rel.startsWith('server/')) findings.push({ where: rel, what: 'DEEPSEEK_API_KEY 引用出现在非 server/ 代码中' })
    if (/['"`]https?:\/\/api\.deepseek\.com/.test(t) && !rel.startsWith('server/')) findings.push({ where: rel, what: '上游地址字面量出现在非 server/ 代码中' })
  }
}
const envExample = readFileSync(join(ROOT, '.env.example'), 'utf8')
const secretAudit = {
  generatedAt: new Date().toISOString(),
  scanned: scanDirs.map((d) => relative(ROOT, d)),
  checks: {
    apiKeyInFrontendPackage: findings.some((f) => f.where.startsWith('deployment/frontend')),
    apiKeyInDist: findings.some((f) => f.where.startsWith('dist/')),
    apiKeyInSrc: findings.some((f) => f.where.startsWith('src/')),
    upstreamUrlInClient: findings.some((f) => f.what.includes('上游地址')),
    envExampleHasEmptyKey: /^DEEPSEEK_API_KEY=\s*$/m.test(envExample),
    envIgnoredByGit: readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n').some((l) => l.trim() === '.env'),
  },
  findings,
  note: '本文件只记录「是否存在」，绝不记录任何密钥内容。',
}
writeFileSync(join(OUT, 'secret-audit.json'), JSON.stringify(secretAudit, null, 2))
const clean = findings.length === 0
say(`  扫描 ${scanDirs.length} 个目录 · findings ${findings.length} ${clean ? `${G}✓${X}` : `${R}✗${X}`}`)
if (!clean) for (const f of findings.slice(0, 5)) say(`    ${R}${f.where}: ${f.what}${X}`)

/* ── 7. 汇总 ── */
say(`\n${B}Deployment Package${X}`)
say(`  deployment/frontend/   ${feFiles} 文件 · ${human(feBytes)}`)
say(`  deployment/artwork/    ${rows.length} 文件 · ${human(artBytes)}`)
say(`  deployment/manifests/  artwork-manifest.json · frontend-manifest.json`)
say(`  deployment/secret-audit.json`)
say(`\n${D}下一步：npm run deployment:check${X}`)
if (missing.length || !clean) process.exit(1)
