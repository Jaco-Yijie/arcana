/**
 * Deployment 自检（DEP / DEPLOY 组 · Phase E1）
 *
 * 【它和 release:check 的分工】
 * `release:check` 问的是「这份**代码**交出去会不会出事」。
 * 这一组问的是「这个**包**是不是可以照着说明书部署的那一个」——
 * 包里有没有该有的东西、有没有不该有的东西、说明书写的命令是不是真的存在。
 *
 * 四类事故各自都能过前面所有检查，只在部署当天炸：
 *   1. 把整个工作区当成部署物上传 —— 1.1GB masters 和 QA 截图跟着上了 CDN
 *   2. 换 CDN 时资产根拼出 `//` 或漏 rev —— 780 个 404，而本地开发完全无感
 *   3. 前端包里混进 dist 之外的东西，或漏了 index.html
 *   4. 服务器启动契约（入口、端口、health、环境变量）只存在于某个人的记忆里
 *
 * 用法：`npm run deployment:check`（零网络、零 token）
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'

import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import {
  LOCAL_ASSET_BASE, normalizeAssetBase, cardArtworkUrl, THUMB_SPEC,
} from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'; const R = '\x1b[31m'; const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
let pass = 0; let fail = 0
const failures: string[] = []
function check(name: string, ok: boolean, note = ''): void {
  if (ok) { pass += 1; console.log(`  ${G}PASS${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`) }
  else { fail += 1; failures.push(name); console.log(`  ${R}FAIL${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`) }
}
function section(t: string): void { console.log(`\n${B}${t}${X}`) }

const ROOT = resolve(import.meta.dirname, '..')
const PKG = join(ROOT, 'deployment')
const FE = join(PKG, 'frontend')
const ART = join(PKG, 'artwork')
const MAN = join(PKG, 'manifests')

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p)
  }
  return acc
}
const human = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`
const pkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>; dependencies: Record<string, string>
}
const packageExists = existsSync(FE) && existsSync(ART)

/* ══ DEP-01 … DEP-03 前端包 ══ */
function checkFrontend(): void {
  section('DEP · Frontend Package')
  check('DEP-01 生产构建存在（dist/）', existsSync(join(ROOT, 'dist', 'index.html')))
  if (!packageExists) {
    check('DEP-03 前端包结构完整', false, '缺 deployment/ —— 先跑 npm run deployment:build')
    return
  }
  const feFiles = walk(FE)
  const rel = feFiles.map((f) => relative(FE, f).split('\\').join('/'))
  check('DEP-03 前端包含 index.html', rel.includes('index.html'))
  check('DEP-03b 前端包含 JS 与 CSS', rel.some((f) => f.endsWith('.js')) && rel.some((f) => f.endsWith('.css')),
    `${rel.filter((f) => f.endsWith('.js')).length} JS · ${rel.filter((f) => f.endsWith('.css')).length} CSS`)

  /* DEP-02 包里不能有密钥 */
  const KEY = /sk-[A-Za-z0-9]{16,}/
  const leaked = feFiles.filter((f) => /\.(js|css|html|json|map)$/.test(f) && KEY.test(readFileSync(f, 'utf8')))
  check('DEP-02 前端包不含 API Key 形状字符串', leaked.length === 0,
    leaked.length ? leaked.map((f) => relative(ROOT, f)).join(', ') : `扫描 ${feFiles.length} 个文件`)
  const upstream = feFiles.filter((f) => /\.(js|css|html)$/.test(f) && /api\.deepseek\.com/.test(readFileSync(f, 'utf8')))
  check('DEP-02b 前端包不含上游地址', upstream.length === 0)

  /* DEP-12 / DEP-13 不该出现的东西 */
  const forbidden = [
    ['masters', /(^|\/)masters(\/|$)/], ['prompts', /(^|\/)prompts(\/|$)/],
    ['review', /(^|\/)review(\/|$)/], ['Arcana_Full_390', /Arcana_Full_390/],
    ['.env', /(^|\/)\.env($|\.)/], ['node_modules', /node_modules/],
  ] as const
  const hits = forbidden.filter(([, re]) => rel.some((f) => re.test(f)))
  check('DEP-12 前端包不含美术源素材 / prompts / review / .env / node_modules',
    hits.length === 0, hits.length ? hits.map(([n]) => n).join(', ') : `${rel.length} 个文件全部来自 dist/`)
  const shots = rel.filter((f) => /\.(png|jpe?g|gif)$/i.test(f))
  check('DEP-13 前端包不含 QA 截图', shots.length === 0, shots.length ? shots.slice(0, 3).join(', ') : '')

  /* 前端包里不该有牌面 —— 牌面单独成包（选择跟随部署时把 artwork/ 放进去即可） */
  const deckImgs = rel.filter((f) => f.startsWith('assets/decks/'))
  check('DEP-03c 前端包不含 390 张牌面（牌面单独成包）', deckImgs.length === 0,
    deckImgs.length ? `${deckImgs.length} 张` : `前端包 ${human(feFiles.reduce((s, f) => s + statSync(f).size, 0))}`)

  /* ── DEP-03d 配了远端资产根时，产物里不能还留着 139MB 本地牌面副本 ──
     vite 会把整个 public/ 复制进 dist。牌面走 CDN 时那份副本是纯死重量：
     部署平台每次传 139MB，而它上线后一次都不会被访问。
     反过来，不配远端根时那份副本**必须**在 —— 那是本地兜底与单机部署的依赖。 */
  const viteCfg = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8')
  check(
    'DEP-03d 配了远端资产根时会从产物中移除本地牌面副本（不配时保留）',
    /dropLocalArtworkWhenRemote/.test(viteCfg)
    && /VITE_DECK_ASSET_BASE_URL/.test(viteCfg)
    && /dist\/assets\/decks/.test(viteCfg),
    'vite.config.ts · 按 VITE_DECK_ASSET_BASE_URL 分支',
  )

  /* DEP-14 SPA 路由：index.html 必须是 fallback 的落点 */
  const html = readFileSync(join(FE, 'index.html'), 'utf8')
  check('DEP-14 index.html 存在且引用了打包产物（SPA fallback 落点）',
    /<script[^>]+src="[^"]*assets\//.test(html) || /<script[^>]+type="module"/.test(html))
  const routesFile = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8')
  const routes = [...routesFile.matchAll(/path="([^"]+)"/g)].map((m) => m[1]!)
  check('DEP-14b 前端路由已登记（部署层需为它们回 index.html）', routes.length >= 8,
    routes.filter((r) => !r.startsWith('/dev')).join(' '))
}

/* ══ DEP-04 … DEP-06 牌面包 ══ */
function checkArtwork(): void {
  section('DEP · Artwork Package')
  const manPath = join(MAN, 'artwork-manifest.json')
  if (!existsSync(manPath)) {
    check('DEP-04 artwork-manifest.json 存在', false, '先跑 npm run deployment:build')
    return
  }
  const man = JSON.parse(readFileSync(manPath, 'utf8')) as {
    decks: string[]; counts: { full: number; thumb: number; total: number }
    files: Array<{ path: string; bytes: number; sha256: string; variant: string; rev: number }>
    pathShape: string; revisions: Record<string, number>
  }
  check('DEP-04 artwork-manifest.json 存在且可解析', true, `${man.files.length} 条记录`)
  const playable = ALL_DECK_IDS.filter((id) => isDeckPlayable(id))
  check('DEP-04b manifest 覆盖全部可用牌组', man.decks.length === playable.length && playable.every((d) => man.decks.includes(d)),
    man.decks.join(', '))
  check('DEP-05 full 数量 = 390（5 × 78）', man.counts.full === 390, `${man.counts.full}`)
  check('DEP-06 thumb 数量 = 390（5 × 78）', man.counts.thumb === 390, `${man.counts.thumb}`)

  /* 逐文件核对：存在 + 大小 + sha256。0 missing / 0 corrupted 必须是**算出来的** */
  let miss = 0; let sizeBad = 0; let hashBad = 0
  for (const f of man.files) {
    const p = join(ART, f.path)
    if (!existsSync(p)) { miss += 1; continue }
    if (statSync(p).size !== f.bytes) { sizeBad += 1; continue }
    if (createHash('sha256').update(readFileSync(p)).digest('hex') !== f.sha256) hashBad += 1
  }
  check('DEP-04c manifest 里每个文件都真的在包里', miss === 0, `缺 ${miss}`)
  check('DEP-04d 每个文件大小与 manifest 一致', sizeBad === 0, `不符 ${sizeBad}`)
  check('DEP-04e 每个文件 sha256 与 manifest 一致（0 corrupted）', hashBad === 0,
    hashBad === 0 ? `${man.files.length} 个文件逐一校验` : `不符 ${hashBad}`)

  /* 包内不能混进源素材 */
  const all = walk(ART).map((f) => relative(ART, f).split('\\').join('/'))
  const stray = all.filter((f) => !/^[a-z0-9-]+\/(cards|thumbs)\/[a-z0-9-]+\.webp$/.test(f))
  check('DEP-04f 牌面包里只有 <deckId>/{cards,thumbs}/<cardId>.webp', stray.length === 0,
    stray.length ? stray.slice(0, 3).join(', ') : `${all.length} 个文件`)
  check('DEP-04g 牌面包不含 DEV fixture 牌组', !man.decks.some((d) => ['ethereal', 'classic', 'elysian', 'opaline', 'wonderland'].includes(d)))
  check('DEP-04h manifest 记录了每套牌的 revision（回滚依据）',
    playable.every((d) => typeof man.revisions[d] === 'number'),
    Object.entries(man.revisions).map(([k, v]) => `${k}=r${v}`).join(' '))

  /* ── DEP-04i / DEP-04j 牌面包 与 artwork.lock.json ──
     两份文件都在说「正确的 780 个字节流是哪些」，来源却不同：
     manifest 是 deployment:build **刚刚从 public/ 拷进包里那一份**的实测值，
     lock 是**进 git 的期望值**（assets:sync 拿它校验从对象存储取回的字节）。

     两份必须相等。不等只有两种可能，而且都必须在上传前发现：
       · 有人换了牌面却没跑 assets:lock —— 锁还停在旧版，
         于是 assets:sync 会把刚上传的新牌面判成「sha256 不符」而拒收
       · 包是用一份被改坏的 public/ 构建的 —— 那正是锁存在的理由

     没有这一条，两份真值就会各自漂移，而漂移只会在别人 clone 之后才炸。 */
  const lockPath = join(ROOT, 'artwork.lock.json')
  if (!existsSync(lockPath)) {
    check('DEP-04i artwork.lock.json 存在（新 clone 恢复牌面的唯一期望值来源）', false,
      '先跑 npm run assets:lock')
  } else {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as {
      contract: string; counts: { total: number }
      files: Record<string, { bytes: number; sha256: string }>
    }
    check('DEP-04i artwork.lock.json 存在（新 clone 恢复牌面的唯一期望值来源）', true,
      `${Object.keys(lock.files).length} 个对象 · contract ${lock.contract}`)
    const onlyInPkg = man.files.filter((f) => !lock.files[f.path])
    const onlyInLock = Object.keys(lock.files).filter((k) => !man.files.some((f) => f.path === k))
    const drifted = man.files.filter((f) => {
      const e = lock.files[f.path]
      return e && (e.bytes !== f.bytes || e.sha256 !== f.sha256)
    })
    check('DEP-04j 牌面包与 artwork.lock.json 逐字节一致（两份真值没有漂移）',
      onlyInPkg.length === 0 && onlyInLock.length === 0 && drifted.length === 0,
      onlyInPkg.length || onlyInLock.length || drifted.length
        ? `包里多 ${onlyInPkg.length} · 锁里多 ${onlyInLock.length} · sha256 不符 ${drifted.length} —— 跑 npm run assets:lock`
        : `${man.files.length} 个对象逐一比对`)
  }
}

/* ══ DEPLOY-01 … DEPLOY-04 资产根契约 ══ */
function checkAssetBase(): void {
  section('DEPLOY · 资产根契约')

  /* DEPLOY-01 本地模式 */
  check('DEPLOY-01 未配置时回落本地根 /assets/decks',
    normalizeAssetBase(undefined) === LOCAL_ASSET_BASE
    && normalizeAssetBase('') === LOCAL_ASSET_BASE
    && normalizeAssetBase('   ') === LOCAL_ASSET_BASE
    && normalizeAssetBase(null) === LOCAL_ASSET_BASE,
    LOCAL_ASSET_BASE)

  /* DEPLOY-02 远端模式 */
  const CDN = 'https://assets.example.com/arcana/decks'
  check('DEPLOY-02 远端绝对 URL 原样保留', normalizeAssetBase(CDN) === CDN, normalizeAssetBase(CDN))
  check('DEPLOY-02b 远端根前后空白被清理', normalizeAssetBase(`  ${CDN}  `) === CDN)

  /* DEPLOY-03 末尾斜杠 —— 一个多余斜杠 = 780 个 404 */
  const slashCases: Array<[string, string]> = [
    [`${CDN}/`, CDN], [`${CDN}//`, CDN], [`${CDN}///`, CDN],
    ['/assets/decks/', '/assets/decks'], ['https://cdn.example.com/', 'https://cdn.example.com'],
  ]
  const slashOk = slashCases.every(([i, o]) => normalizeAssetBase(i) === o)
  check('DEPLOY-03 末尾斜杠（含多重）全部被去掉', slashOk,
    slashCases.map(([i]) => `"${i}"→"${normalizeAssetBase(i)}"`).join('  '))
  /* 拼接后不得出现 `//`（协议里的 `//` 除外） */
  const composed = `${normalizeAssetBase(`${CDN}/`)}/legacy-classic/cards/major-00.webp?r=2`
  check('DEPLOY-03b 拼接结果不含多余的 //',
    !composed.replace(/^https?:\/\//, '').includes('//'), composed)

  /* DEPLOY-04 cards / thumbs 路径一致性 —— 用产品代码本身生成 */
  const full = cardArtworkUrl('legacy-classic', 'major-00', 2, 'full')
  const thumb = cardArtworkUrl('legacy-classic', 'major-00', 2, 'thumb')
  check('DEPLOY-04 full 路径形状', full === '/assets/decks/legacy-classic/cards/major-00.webp?r=2', full)
  check('DEPLOY-04b thumb 路径形状', thumb === '/assets/decks/legacy-classic/thumbs/major-00.webp?r=2', thumb)
  check('DEPLOY-04c full 与 thumb 只差目录段',
    full.replace('/cards/', '/§/') === thumb.replace('/thumbs/', '/§/'))
  check('DEPLOY-04d rev 是 query 而非路径段', /\?r=\d+$/.test(full) && !/\/r\d+\//.test(full))
  /* 换成远端根之后，除了前缀什么都不该变 */
  const remoteFull = CDN + full.slice(LOCAL_ASSET_BASE.length)
  check('DEPLOY-04e 换远端根后路径结构逐段不变',
    remoteFull === `${CDN}/legacy-classic/cards/major-00.webp?r=2`, remoteFull)
  check('DEPLOY-04f thumb 规格与生成器共用同一常量', THUMB_SPEC.card.width === 240 && THUMB_SPEC.card.height === 400,
    `${THUMB_SPEC.card.width}×${THUMB_SPEC.card.height}`)
}

/* ══ DEP-09 / DEP-10 / DEP-15 服务器契约 ══ */
function checkServer(): void {
  section('DEP · Reading Server 契约')
  check('DEP-09 生产启动命令存在（npm start）', typeof pkgJson.scripts.start === 'string', pkgJson.scripts.start)
  check('DEP-09b 入口文件存在', existsSync(join(ROOT, 'server', 'index.ts')), 'server/index.ts')
  check('DEP-09c 运行时依赖含 tsx（生产直接跑 TS 入口）', typeof pkgJson.dependencies.tsx === 'string',
    `tsx@${pkgJson.dependencies.tsx}`)
  const idx = readFileSync(join(ROOT, 'server', 'index.ts'), 'utf8')
  check('DEP-09d 端口来自环境变量（PORT）', /config\.port/.test(idx) && /process\.env\.PORT/.test(readFileSync(join(ROOT, 'server', 'env.ts'), 'utf8')))

  /* DEP-10 health */
  check('DEP-10 存在 /health 探针', /'\/health'/.test(idx), 'GET /health')
  check('DEP-10b /health 不返回任何密钥或环境变量原文',
    /readingProviderConfigured/.test(idx) && !/apiKey|baseUrl|DEEPSEEK_API_KEY/.test(
      idx.slice(idx.indexOf("'/health'"), idx.indexOf("'/health'") + 500)),
    'status · readingProviderConfigured · provider')

  /* DEP-15 生产 API 路径 */
  const apiPaths = [...idx.matchAll(/url\.pathname === '(\/api\/[^']+)'/g)].map((m) => m[1]!)
  check('DEP-15 生产 API 路径齐备', ['/api/tarot/reading', '/api/tarot/reading/stream', '/api/tarot/followup', '/api/tarot/config']
    .every((p) => apiPaths.includes(p)), apiPaths.join(' '))
  check('DEP-15b 未知 /api/ 路径返回 404 而不是 SPA 兜底', /pathname\.startsWith\('\/api\/'\)/.test(idx))
  /* 服务器运行期需要哪些 src/ 模块 —— 部署时不能只拷 server/ */
  const srcImports = [...idx.matchAll(/from '\.\.\/src\//g)].length
    + [...readFileSync(join(ROOT, 'server', 'context', 'rebuild.ts'), 'utf8').matchAll(/from '\.\.\/\.\.\/src\//g)].length
  check('DEP-09e 服务器确实值依赖 src/（部署必须同时包含 src/）', srcImports > 0,
    `server/ 引用 src/ 共 ${srcImports} 处 —— 详见 deployment/README.md`)
}

/* ══ DEP-11 环境变量 ══ */
function checkEnv(): void {
  section('DEP · 环境变量与文档')
  const ex = existsSync(join(ROOT, '.env.example')) ? readFileSync(join(ROOT, '.env.example'), 'utf8') : ''
  check('DEP-11 .env.example 存在', ex.length > 0)
  check('DEP-11b DEEPSEEK_API_KEY 为空（绝不提交真 Key）', /^DEEPSEEK_API_KEY=\s*$/m.test(ex))
  const required = ['DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL', 'READING_PROVIDER', 'PORT', 'VITE_DECK_ASSET_BASE_URL']
  const declaredInEnv = new Set([...ex.matchAll(/^#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]!))
  const missingVar = required.filter((v) => !declaredInEnv.has(v))
  check('DEP-11c 全部必需变量已在 .env.example 列出', missingVar.length === 0,
    missingVar.length ? `缺 ${missingVar.join(', ')}` : required.join(' '))
  /* 服务器真正读的变量必须都被文档化 —— 否则部署时会漏配 */
  const envTs = readFileSync(join(ROOT, 'server', 'env.ts'), 'utf8')
  const read = [...envTs.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]!)
  const undocumented = [...new Set(read)].filter((v) => !declaredInEnv.has(v))
  check('DEP-11d server/env.ts 读取的每个变量都在 .env.example 里', undocumented.length === 0,
    undocumented.length ? `未文档化: ${undocumented.join(', ')}` : `${new Set(read).size} 个变量`)
  check('DEP-11e .env 被 git 忽略',
    readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n').some((l) => l.trim() === '.env'))

  /* 文档存在性 */
  check('DEP-11f deployment/README.md 存在', existsSync(join(PKG, 'README.md')))
  check('DEP-11g deployment/production-checklist.md 存在', existsSync(join(PKG, 'production-checklist.md')))
  /* 文档里提到的 npm 命令必须真实存在 */
  for (const doc of ['README.md', 'production-checklist.md']) {
    const p = join(PKG, doc)
    if (!existsSync(p)) continue
    const t = readFileSync(p, 'utf8')
    const mentioned = [...new Set([...t.matchAll(/npm run ([a-z:]+[a-z])/g)].map((m) => m[1]!))]
    const bad = mentioned.filter((s) => !(s in pkgJson.scripts))
    check(`DEP-11h deployment/${doc} 里的 npm 命令都真实存在`, bad.length === 0,
      bad.length ? `缺 ${bad.join(', ')}` : `${mentioned.length} 个`)
  }
}

/* ══ Secret Audit 产物 ══ */
function checkSecretAudit(): void {
  section('DEP · Secret Audit 产物')
  const p = join(PKG, 'secret-audit.json')
  if (!existsSync(p)) { check('DEP-02c secret-audit.json 存在', false, '先跑 npm run deployment:build'); return }
  const raw = readFileSync(p, 'utf8')
  const a = JSON.parse(raw) as { checks: Record<string, boolean>; findings: unknown[] }
  check('DEP-02c secret-audit.json 存在', true)
  check('DEP-02d 审计报告本身不含密钥', !/sk-[A-Za-z0-9]{16,}/.test(raw))
  check('DEP-02e 审计结论：客户端与产物均无 Key',
    a.checks.apiKeyInFrontendPackage === false && a.checks.apiKeyInDist === false
    && a.checks.apiKeyInSrc === false && a.checks.upstreamUrlInClient === false,
    `findings ${a.findings.length}`)
  check('DEP-02f 审计结论：.env.example Key 为空且 .env 已忽略',
    a.checks.envExampleHasEmptyKey === true && a.checks.envIgnoredByGit === true)
}

console.log(`${B}Deployment 自检 · Phase E1${X}`)
checkFrontend()
checkArtwork()
checkAssetBase()
checkServer()
checkEnv()
checkSecretAudit()

const line = '─'.repeat(64)
console.log(`\n${line}`)
if (fail === 0) {
  console.log(`${G}全部通过${X}  ${pass} 项断言，0 失败`)
  console.log(`${D}包里有该有的，没有不该有的；资产根换 CDN 不会拼错。${X}`)
} else {
  console.log(`${R}${fail} 项失败${X} / ${pass + fail} 项`)
  for (const f of failures) console.log(`  ${R}·${X} ${f}`)
}
console.log(line)
process.exit(fail === 0 ? 0 : 1)
