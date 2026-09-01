/**
 * Phase C3 · 全量原画导入管线
 *
 * ══════════════════════════════════════════════════════════════
 *   Arcana_Full_390/masters/<deckId>/<cardId>.png     （源归档，1.1GB，不进 public）
 *          │
 *          ├─ derive ─► Arcana_Full_390/web/    1080×1800 WebP q82
 *          │            Arcana_Full_390/thumbs/  240×400  WebP q72
 *          │
 *          ├─ audit  ─► Arcana_Full_390/manifests/full-production-manifest.json
 *          │            （manifest ↔ filesystem 双向核对）
 *          │
 *          ├─ import ─► public/assets/decks/<deckId>/cards|thumbs/
 *          │
 *          └─ codegen ► src/decks/artwork/production.generated.ts
 * ══════════════════════════════════════════════════════════════
 *
 * 用法：
 *   npx tsx scripts/generate-production-manifest.ts            全流程
 *   npx tsx scripts/generate-production-manifest.ts --codegen  只重生成 TS（源未变时）
 *
 * 【为什么派生而不是直接用交付的 WebP】
 * C2 只导出了 25 张 benchmark 的 WebP，其余 365 张只有 master PNG。
 * 而且那 25 张与 master 同源（结构一致，差异 1.3–5.4/255 全部来自有损编码），
 * 所以统一从 master 派生，390 张走同一套编码参数 ——
 * 否则 benchmark 那 25 张会比其余的大一倍，而原因没人记得。
 * 原始交付件备份在 Arcana_Full_390/qa/benchmark-web-original/。
 *
 * 【为什么 masters 不进 public】
 * 1.1GB PNG 的用途是返修、再压缩、重新导出，不是给浏览器下载的。
 * 源归档与 runtime 交付物职责不同，两者都保留，谁也不删谁。
 *
 * 【为什么 codegen 产物入库】
 * deck:check 用 tsx 在 Node 下直接 import manifest 模块，
 * `import.meta.glob` 在那里不存在 —— 运行期扫盘会让整套断言跑不起来。
 * 所以扫盘发生在构建前，产物入库，git diff 本身就是 review artifact。
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { CANONICAL_DECK_IDS } from '../src/decks/art/bibles.ts'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const ARCHIVE = resolve(REPO_ROOT, 'Arcana_Full_390')
const CODEGEN_ONLY = process.argv.includes('--codegen')

/** 与 paths.ts THUMB_SPEC 对齐；web 档的 q82 对应 paths.ts 注释里的「约 220KB」量级 */
const WEB = { w: 1080, h: 1800, q: 82 } as const
const THUMB = { w: 240, h: 400, q: 72 } as const

const CARD_IDS: string[] = [
  ...Array.from({ length: 22 }, (_, i) => `major-${String(i).padStart(2, '0')}`),
  ...['wands', 'cups', 'swords', 'pentacles'].flatMap((s) =>
    Array.from({ length: 14 }, (_, i) => `${s}-${String(i + 1).padStart(2, '0')}`),
  ),
]

interface Record_ {
  deckId: string
  cardId: string
  title: string | null
  masterPath: string
  webPath: string
  thumbPath: string
  web: { w: number; h: number; format: string; bytes: number }
  thumb: { w: number; h: number; format: string; bytes: number }
  webSha256: string
  status: 'approved' | 'final'
  needsVisualReview: boolean
  qaSeverity: 'P0' | 'P1' | 'P2' | null
  scaledToSpec: boolean
}

async function derive(): Promise<void> {
  for (const deck of CANONICAL_DECK_IDS) {
    const srcDir = resolve(ARCHIVE, 'masters', deck)
    const webDir = resolve(ARCHIVE, 'web', deck)
    const thumbDir = resolve(ARCHIVE, 'thumbs', deck)
    mkdirSync(webDir, { recursive: true })
    mkdirSync(thumbDir, { recursive: true })
    for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.png')).sort()) {
      const id = f.replace(/\.png$/, '')
      const src = resolve(srcDir, f)
      /* fit:'cover' 而不是 fill —— 塔罗牌的 1:1.667 是产品的物理约定，
         拉伸会让人物变形，比裁掉边缘严重得多。365 张源为 971×1619（比例 0.59975），
         cover 到 1080×1800 的裁切量小于 1px。 */
      await sharp(src)
        .resize(WEB.w, WEB.h, { fit: 'cover', position: 'centre', withoutEnlargement: false })
        .webp({ quality: WEB.q, effort: 4 })
        .toFile(resolve(webDir, `${id}.webp`))
      await sharp(src)
        .resize(THUMB.w, THUMB.h, { fit: 'cover', position: 'centre', withoutEnlargement: false })
        .webp({ quality: THUMB.q, effort: 4 })
        .toFile(resolve(thumbDir, `${id}.webp`))
    }
    console.log(`  derive  ${deck}`)
  }
}

async function audit(): Promise<Record_[]> {
  const progress = JSON.parse(readFileSync(resolve(ARCHIVE, 'logs/progress.json'), 'utf8')) as {
    flagged: { deckId: string; cardId: string }[]
  }
  const flagged = new Set(progress.flagged.map((f) => `${f.deckId}/${f.cardId}`))
  const plan = JSON.parse(
    readFileSync(resolve(ARCHIVE, 'logs/production-plan.json'), 'utf8'),
  ) as { deckId: string; cardId: string; title: string }[]
  const planIdx = new Map(plan.map((p) => [`${p.deckId}/${p.cardId}`, p]))

  /* Phase C4 视觉 QA 结论。缺席时全部退回 approved —— 没有 QA 就没有 final。 */
  const qaPath = resolve(ARCHIVE, 'qa/c4-visual-qa.json')
  const qa = existsSync(qaPath)
    ? (JSON.parse(readFileSync(qaPath, 'utf8')) as {
        issues: { deckId: string; cardId: string; severity: 'P0' | 'P1' | 'P2' }[]
        closeUpPass: [string, string][]
      })
    : { issues: [], closeUpPass: [] }
  /* 最严重的一档说了算：同一张牌可能同时命中多条 */
  const rank = { P0: 3, P1: 2, P2: 1 } as const
  const sev = new Map<string, 'P0' | 'P1' | 'P2'>()
  for (const i of qa.issues) {
    if (i.cardId === '*') continue
    const k = `${i.deckId}/${i.cardId}`
    const prev = sev.get(k)
    if (!prev || rank[i.severity] > rank[prev]) sev.set(k, i.severity)
  }
  const passed = new Set(qa.closeUpPass.map(([d, c]) => `${d}/${c}`))

  const records: Record_[] = []
  const issues: string[] = []

  for (const deck of CANONICAL_DECK_IDS) {
    const ids = readdirSync(resolve(ARCHIVE, 'masters', deck))
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, ''))
      .sort()
    /* 命名完整性：多一个少一个都必须在这里就停，不能等到 UI 上发现 */
    const missing = CARD_IDS.filter((id) => !ids.includes(id))
    const extra = ids.filter((id) => !CARD_IDS.includes(id))
    if (missing.length) issues.push(`${deck} 缺 ${missing.join(',')}`)
    if (extra.length) issues.push(`${deck} 多 ${extra.join(',')}`)

    for (const cardId of ids) {
      const key = `${deck}/${cardId}`
      const masterPath = `masters/${deck}/${cardId}.png`
      const webPath = `web/${deck}/${cardId}.webp`
      const thumbPath = `thumbs/${deck}/${cardId}.webp`
      for (const [label, p] of [['master', masterPath], ['web', webPath], ['thumb', thumbPath]]) {
        if (!existsSync(resolve(ARCHIVE, p!))) issues.push(`缺 ${label} ${p}`)
      }
      const [mm, wm, tm] = await Promise.all([
        sharp(resolve(ARCHIVE, masterPath)).metadata(),
        sharp(resolve(ARCHIVE, webPath)).metadata(),
        sharp(resolve(ARCHIVE, thumbPath)).metadata(),
      ])
      if (wm.width !== WEB.w || wm.height !== WEB.h) issues.push(`web 尺寸异常 ${webPath}`)
      if (tm.width !== THUMB.w || tm.height !== THUMB.h) issues.push(`thumb 尺寸异常 ${thumbPath}`)
      records.push({
        deckId: deck,
        cardId,
        title: planIdx.get(key)?.title ?? null,
        masterPath,
        webPath,
        thumbPath,
        web: { w: wm.width!, h: wm.height!, format: wm.format!, bytes: statSync(resolve(ARCHIVE, webPath)).size },
        thumb: { w: tm.width!, h: tm.height!, format: tm.format!, bytes: statSync(resolve(ARCHIVE, thumbPath)).size },
        webSha256: createHash('sha256').update(readFileSync(resolve(ARCHIVE, webPath))).digest('hex'),
        /* 【final 的门槛：逐张放大看过且没问题】
           程序化校验（尺寸/格式/decode）全绿只够 approved ——
           它证明文件是好的，证明不了画对不对。
           只有进了 C4 closeUpPass 且没有任何 severity 的牌才升 final。
           这条规则的意义是让「390 final」无法靠跑测试达成。 */
        status:
          passed.has(key) && !sev.has(key) ? 'final' : 'approved',
        needsVisualReview: flagged.has(key) || sev.has(key),
        qaSeverity: sev.get(key) ?? null,
        scaledToSpec: !(mm.width === WEB.w && mm.height === WEB.h),
      })
    }
  }

  /* 反向：磁盘上有没有 manifest 没登记的文件。
     单向核对只能发现「登记了但没有文件」，发现不了「多出来一张没人知道的图」。 */
  const known = new Set(records.flatMap((r) => [r.masterPath, r.webPath, r.thumbPath]))
  for (const layer of ['masters', 'web', 'thumbs']) {
    for (const deck of CANONICAL_DECK_IDS) {
      for (const f of readdirSync(resolve(ARCHIVE, layer, deck)).filter((x) => !x.startsWith('.'))) {
        if (!known.has(`${layer}/${deck}/${f}`)) issues.push(`ORPHAN ${layer}/${deck}/${f}`)
      }
    }
  }

  if (issues.length) {
    console.error(`\n审计未通过（${issues.length} 项）：`)
    issues.slice(0, 20).forEach((i) => console.error(`  ${i}`))
    process.exit(1)
  }

  mkdirSync(resolve(ARCHIVE, 'manifests'), { recursive: true })
  writeFileSync(
    resolve(ARCHIVE, 'manifests/full-production-manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), phase: 'C3', spec: { web: WEB, thumb: THUMB }, total: records.length, decks: CANONICAL_DECK_IDS, records }, null, 2)}\n`,
  )
  console.log(`  audit   ${records.length} 条，双向核对 0 问题`)
  return records
}

function importToPublic(): void {
  for (const deck of CANONICAL_DECK_IDS) {
    for (const [from, to] of [['web', 'cards'], ['thumbs', 'thumbs']] as const) {
      const srcDir = resolve(ARCHIVE, from, deck)
      const outDir = resolve(REPO_ROOT, 'public/assets/decks', deck, to)
      mkdirSync(outDir, { recursive: true })
      for (const f of readdirSync(srcDir).filter((x) => x.endsWith('.webp'))) {
        writeFileSync(resolve(outDir, f), readFileSync(resolve(srcDir, f)))
      }
    }
    console.log(`  import  ${deck}`)
  }
}

function codegen(records: Record_[]): void {
  const byDeck: Record<string, Record_[]> = {}
  for (const r of records) (byDeck[r.deckId] ??= []).push(r)
  const varOf = (d: string) => d.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_CARDS'

  let out = `/**
 * Layer 2 · Phase C3 正式原画登记（**代码生成产物，请勿手工编辑**）
 *
 * 生成器：scripts/generate-production-manifest.ts
 * 数据源：Arcana_Full_390/manifests/full-production-manifest.json
 *
 * 【status 为什么统一是 approved 而不是 final】
 * 390 张已完成生产、已通过程序化校验（尺寸/格式/decode 全绿），
 * 但尚未完成逐张人工视觉复核。
 *   approved = 可以在正式产品中使用，但仍允许以后替换
 *   final    = 人工最终确认，留给后续 Visual QA 轮次
 *
 * 【尺寸】全部 1080×1800。${records.filter((r) => r.scaledToSpec).length} 张源为 971×1619 等，
 * 派生时按 fit:'cover' 统一缩放；25 张 benchmark 源生即为 1080×1800。
 */

import type { CardAsset } from '../types'

/**
 * 原画里烘焙了牌名与编号的牌组。
 *
 * 见 paths.ts 命名规则 4/5：这批原画把顶部罗马数字与底部英文题字画进了构图。
 * 代码侧必须知道，否则会在同一位置再画一个编号；
 * 它同时是「逆位不旋转」的依据 —— 旋转会让画里的题字倒过来。
 */
export const DECKS_WITH_BAKED_TEXT: readonly string[] = Object.freeze([
${CANONICAL_DECK_IDS.map((d) => `  '${d}',`).join('\n')}
])

/**
 * 需要人工视觉复核的牌。
 *
 * P0 = 牌义/数字/核心符号错误，**必须修复后才能进产品打磨**
 * P1 = 明显风格漂移或严重裁切
 * P2 = 美术细节，记录不阻塞
 *
 * 这些牌的 status 仍是 approved（文件有效、可渲染、不会让牌阵开天窗），
 * 但它们**永远拿不到 final** —— final 的门槛见 generate-production-manifest.ts。
 */
export const NEEDS_VISUAL_REVIEW: readonly string[] = Object.freeze([
${records.filter((r) => r.needsVisualReview).map((r) => `  '${r.deckId}/${r.cardId}',${r.qaSeverity ? ` // ${r.qaSeverity}` : ''}`).join('\n')}
])

/** 按严重度分组，供 artwork:check 断言与人工排期使用 */
export const QA_SEVERITY: Readonly<Record<string, 'P0' | 'P1' | 'P2'>> = Object.freeze({
${records.filter((r) => r.qaSeverity).map((r) => `  '${r.deckId}/${r.cardId}': '${r.qaSeverity}',`).join('\n')}
})

/** 逐张放大复核通过、已升 final 的数量 */
export const FINAL_COUNT = ${records.filter((r) => r.status === 'final').length}

`

  for (const deck of CANONICAL_DECK_IDS) {
    const idx = new Map(byDeck[deck]!.map((r) => [r.cardId, r]))
    const f = byDeck[deck]!.filter((r) => r.status === 'final').length
    const rv = byDeck[deck]!.filter((r) => r.needsVisualReview).length
    out += `/** ${deck} · ${byDeck[deck]!.length}/78 · final ${f} · approved ${byDeck[deck]!.length - f}${rv ? ` · 待复核 ${rv}` : ''} */\nexport const ${varOf(deck)}: Readonly<Record<string, CardAsset>> = Object.freeze({\n`
    for (const cardId of CARD_IDS) {
      const r = idx.get(cardId)!
      const note = r.qaSeverity
        ? `  // ${r.qaSeverity} needs visual review`
        : r.needsVisualReview
          ? '  // needs visual review'
          : ''
      out += `  '${cardId}': { w: ${r.web.w}, h: ${r.web.h}, thumb: true, status: '${r.status}' },${note}\n`
    }
    out += `})\n\n`
  }

  out += `export const PRODUCTION_CARDS: Readonly<Record<string, Readonly<Record<string, CardAsset>>>> = Object.freeze({\n`
  for (const deck of CANONICAL_DECK_IDS) out += `  '${deck}': ${varOf(deck)},\n`
  out += `})\n\n/** 登记总数，供断言使用 */\nexport const PRODUCTION_CARD_TOTAL = ${records.length}\n`

  writeFileSync(resolve(REPO_ROOT, 'src/decks/artwork/production.generated.ts'), out)
  console.log(`  codegen src/decks/artwork/production.generated.ts`)
}

console.log('Phase C3 · 全量原画导入')
if (!CODEGEN_ONLY) await derive()
const records = await audit()
if (!CODEGEN_ONLY) importToPublic()
codegen(records)
console.log(
  `\n完成：${records.length} 张 · web ${(records.reduce((a, r) => a + r.web.bytes, 0) / 1048576).toFixed(1)}MB · thumbs ${(records.reduce((a, r) => a + r.thumb.bytes, 0) / 1048576).toFixed(1)}MB · 待人工复核 ${records.filter((r) => r.needsVisualReview).length} 张`,
)
