/**
 * 缩略图生成器。
 *
 * ══════════════════════════════════════════════════════════════
 * full artwork  →  Deck Library 用的 thumbnail
 *
 * 为什么必须有它：Deck Library 一屏同时挂 25 张预览牌 + 5 张封面 + 5 张卡背。
 * 走 full 档（1080×1800，约 220KB）就是单页 6MB 以上，
 * 而它们的实际显示宽度只有 62–164 CSS px —— 像素面积浪费近 500 倍。
 *
 * 手工逐张切 4 × 78 = 312 张是不可能维持的，所以做成脚本。
 * ══════════════════════════════════════════════════════════════
 *
 * 用法：
 *   npm run thumbs           生成（增量）
 *   npm run thumbs -- --force  强制全部重做
 *   npm run thumbs -- --check  只报告，不写文件（CI / 提交前自检）
 *
 * 【绝不覆盖原图】
 * 输入只读，输出永远写到另一个文件名/目录。任何一次改动都不会碰 full artwork。
 *
 * 【确定性】
 * 同一张输入永远得到同一个输出：固定尺寸、固定质量、固定 fit、固定文件名，
 * 无随机裁切、无时间戳。这样 git diff 才干净、CDN 缓存才稳定。
 *
 * 【比例】
 * 用 `fit: 'cover'` + 居中裁切，绝不拉伸。塔罗牌的 1:1.667 是产品的物理约定
 * （--card-ratio），拉伸会让人物变形，比裁掉边缘严重得多。
 * 源图本来就该是 1:1.667（见 public/assets/decks/README.md），
 * 所以正常情况下裁切量为 0；这里的 cover 是防止交付比例跑偏时把画面拉坏。
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'
import { ARTWORK_DECK_IDS } from '../src/decks/ids.ts'
import {
  THUMB_SPEC,
  cardArtworkRepoPath,
  cardBackRepoPath,
  cardThumbRepoPath,
  deckCoverRepoPath,
} from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const B = '\x1b[1m'
const X = '\x1b[0m'

const REPO_ROOT = resolve(import.meta.dirname, '..')
const CACHE_PATH = resolve(REPO_ROOT, 'scripts/thumb-cache.json')

const args = new Set(process.argv.slice(2))
const FORCE = args.has('--force')
const CHECK_ONLY = args.has('--check')

/* ══════════════════════════════════════════════════════════════
 * 待处理清单：由 canonical 路径函数派生，不手写第二份映射
 * ══════════════════════════════════════════════════════════ */

interface Job {
  label: string
  /** 源文件（仓库相对路径） */
  src: string
  /** 目标文件（仓库相对路径） */
  out: string
  width: number
  height: number
}

function jobsForDeck(deckId: (typeof ARTWORK_DECK_IDS)[number]): Job[] {
  const jobs: Job[] = []

  /* 牌面：扫 cards/ 目录。**不读 manifest** ——
     manifest 记录的是「已登记可用的资产」，而生成器要处理的是
     「磁盘上已经存在的源文件」。刚交付还没登记的图也应该能生成缩略图，
     否则会陷入「要先登记才有 thumb、但登记又要求 thumb 存在」的死锁。 */
  const cardsDir = resolve(REPO_ROOT, `public/assets/decks/${deckId}/cards`)
  const cardFiles = existsSync(cardsDir)
    ? readdirSync(cardsDir).filter((f) => f.endsWith('.webp')).sort()
    : []
  for (const file of cardFiles) {
    const cardId = file.replace(/\.webp$/, '')
    jobs.push({
      label: `${deckId}/${cardId}`,
      src: cardArtworkRepoPath(deckId, cardId),
      out: cardThumbRepoPath(deckId, cardId),
      ...THUMB_SPEC.card,
    })
  }

  /* 封面与卡背：它们在 Library 里同样是小尺寸展示 */
  jobs.push({
    label: `${deckId}/cover`,
    src: deckCoverRepoPath(deckId, 'full'),
    out: deckCoverRepoPath(deckId, 'thumb'),
    ...THUMB_SPEC.cover,
  })
  jobs.push({
    label: `${deckId}/back`,
    src: cardBackRepoPath(deckId, 'full'),
    out: cardBackRepoPath(deckId, 'thumb'),
    ...THUMB_SPEC.back,
  })

  return jobs
}

/* ══════════════════════════════════════════════════════════════
 * 增量：按源文件内容哈希
 * ══════════════════════════════════════════════════════════ */

type Cache = Record<string, { srcHash: string; spec: string }>

function loadCache(): Cache {
  if (!existsSync(CACHE_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as Cache
  } catch {
    /* 缓存坏了不是错误，全量重做即可 */
    return {}
  }
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

/** 规格指纹：改了尺寸或质量，即使源没变也必须重做 */
function specKey(job: Job): string {
  return `${job.width}x${job.height}q${THUMB_SPEC.quality}`
}

/* ══════════════════════════════════════════════════════════════
 * 生成
 * ══════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  console.log(`${B}缩略图生成${X}${FORCE ? `  ${Y}--force${X}` : ''}${CHECK_ONLY ? `  ${Y}--check（只报告）${X}` : ''}`)

  const cache = loadCache()
  const nextCache: Cache = {}

  let generated = 0
  let updated = 0
  let skipped = 0
  let missing = 0
  let failed = 0
  const missingList: string[] = []
  const failedList: string[] = []

  for (const deckId of ARTWORK_DECK_IDS) {
    for (const job of jobsForDeck(deckId)) {
      const srcAbs = resolve(REPO_ROOT, job.src)
      const outAbs = resolve(REPO_ROOT, job.out)

      /* 源不存在 —— 这是**正常状态**（素材还没交付），不是错误。
         整批不能因此失败，也不能让单张缺失挡住其它张。 */
      if (!existsSync(srcAbs)) {
        missing += 1
        missingList.push(job.src)
        continue
      }

      try {
        const srcBuf = readFileSync(srcAbs)
        const hash = sha256(srcBuf)
        const key = job.out
        const spec = specKey(job)
        const prev = cache[key]
        const outExists = existsSync(outAbs)

        if (!FORCE && outExists && prev?.srcHash === hash && prev.spec === spec) {
          skipped += 1
          nextCache[key] = { srcHash: hash, spec }
          continue
        }

        if (CHECK_ONLY) {
          console.log(`  ${Y}需要重做${X}  ${job.label}  ${D}${job.out}${X}`)
          if (outExists) updated += 1
          else generated += 1
          nextCache[key] = prev ?? { srcHash: hash, spec }
          continue
        }

        mkdirSync(dirname(outAbs), { recursive: true })
        await sharp(srcBuf)
          .resize(job.width, job.height, {
            /* cover + 居中：保持比例，绝不拉伸。源图比例正确时裁切量为 0 */
            fit: 'cover',
            position: 'centre',
            withoutEnlargement: false,
          })
          .webp({ quality: THUMB_SPEC.quality, effort: 4 })
          .toFile(outAbs)

        nextCache[key] = { srcHash: hash, spec }
        if (outExists) {
          updated += 1
          console.log(`  ${G}更新${X}  ${job.label}  ${D}${job.width}×${job.height}${X}`)
        } else {
          generated += 1
          console.log(`  ${G}生成${X}  ${job.label}  ${D}${job.width}×${job.height}${X}`)
        }
      } catch (error) {
        /* 单张失败不阻塞其余 —— 一张损坏的源文件不该让整批停摆 */
        failed += 1
        failedList.push(`${job.src}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  if (!CHECK_ONLY) {
    writeFileSync(CACHE_PATH, `${JSON.stringify(nextCache, null, 2)}\n`)
  }

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`Generated: ${generated}`)
  console.log(`Updated:   ${updated}`)
  console.log(`Skipped:   ${skipped}  ${D}（源未变）${X}`)
  console.log(`Missing:   ${missing}  ${D}（源文件尚未交付，属正常）${X}`)
  console.log(`Failed:    ${failed}`)
  if (missing > 0 && missing <= 12) {
    for (const m of missingList) console.log(`  ${D}missing: ${m}${X}`)
  } else if (missing > 12) {
    console.log(`  ${D}missing 前 6 条：${X}`)
    for (const m of missingList.slice(0, 6)) console.log(`  ${D}  ${m}${X}`)
  }
  for (const f of failedList) console.log(`  ${R}failed: ${f}${X}`)
  console.log('─'.repeat(56))

  /* 只有真正的代码/文件错误才让脚本失败。源缺失不算。 */
  process.exit(failed === 0 ? 0 : 1)
}

void main()
