/**
 * Runtime Artwork 完备性检查与恢复契约（Phase E1）
 *
 * 【它回答一个具体问题】
 * 一个新开发者 clone 仓库之后，怎么知道牌面齐不齐？齐不齐又该怎么补？
 * 如果将来 390 张牌面**不再进 git**（走 CDN），这个问题会立刻变成阻塞项 ——
 * 而「问一下老同事」不是一种恢复机制。
 *
 * 所以这里定义两件事：
 *   1. `assets:check`            —— 本地牌面到底缺哪些（可机读、可 CI）
 *   2. `assets:sync --dry-run`   —— 缺的那些**应该从哪里、按什么 URL 取回来**
 *
 * 【本轮不下载任何东西】
 * `--dry-run` 只打印计划。真实下载留到确定 CDN 之后（Phase E2），
 * 那时把 `ARCANA_ASSET_SOURCE` 指向对象存储即可，本文件的契约不用改。
 *
 * 用法：
 *   npm run assets:check
 *   npm run assets:sync -- --dry-run
 */

import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'
import { getManifest } from '../src/decks/artwork/manifests.ts'
import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import { cardArtworkUrl, urlToRepoPath, LOCAL_ASSET_BASE } from '../src/decks/artwork/paths.ts'

const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m'; const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
const ROOT = resolve(import.meta.dirname, '..')
const DRY = process.argv.includes('--dry-run')
const SYNC = process.argv.includes('--sync') || DRY

/** 恢复源。Phase E2 定下 CDN 后填这里，或用环境变量覆盖。 */
const SOURCE = process.env.ARCANA_ASSET_SOURCE ?? ''

interface Want { deckId: string; cardId: string; variant: 'full' | 'thumb'; repoPath: string; url: string; rev: number }

const playable = ALL_DECK_IDS.filter((id) => isDeckPlayable(id))
const want: Want[] = []
for (const deckId of playable) {
  const m = getManifest(deckId)!
  for (const [cardId, entry] of Object.entries(m.cards)) {
    const rev = entry.rev ?? m.rev
    for (const variant of ['full', 'thumb'] as const) {
      if (variant === 'thumb' && entry.thumb !== true) continue
      const url = cardArtworkUrl(deckId, cardId, rev, variant)
      want.push({ deckId, cardId, variant, rev, url, repoPath: urlToRepoPath(url) })
    }
  }
}

const missing = want.filter((w) => !existsSync(join(ROOT, w.repoPath)))
const empty = want.filter((w) => {
  const p = join(ROOT, w.repoPath)
  return existsSync(p) && statSync(p).size === 0
})
const present = want.length - missing.length

console.log(`${B}Runtime Artwork 完备性${X}`)
console.log(`  牌组 ${playable.length} 套：${playable.join(', ')}`)
console.log(`  期望 ${want.length} 个文件（full ${want.filter((w) => w.variant === 'full').length} · thumb ${want.filter((w) => w.variant === 'thumb').length}）`)
console.log(`  本地 ${present} 个 · 缺失 ${missing.length} 个 · 空文件 ${empty.length} 个`)

if (missing.length === 0 && empty.length === 0) {
  console.log(`\n${G}完整${X}  本地牌面齐备，可直接 npm run dev`)
} else {
  const byDeck: Record<string, number> = {}
  for (const m of missing) byDeck[m.deckId] = (byDeck[m.deckId] ?? 0) + 1
  console.log(`\n${R}不完整${X}`)
  for (const [d, n] of Object.entries(byDeck)) console.log(`  ${d}: 缺 ${n}`)
  if (empty.length) console.log(`  ${Y}空文件 ${empty.length} 个（传输中断的典型症状）${X}`)
}

/* ── 恢复计划 ── */
if (SYNC) {
  console.log(`\n${B}恢复计划${X}`)
  if (!SOURCE) {
    console.log(`  ${Y}未配置恢复源${X}`)
    console.log(`  ${D}设置 ARCANA_ASSET_SOURCE 后可从远端取回，例如：${X}`)
    console.log(`  ${D}  ARCANA_ASSET_SOURCE=https://assets.example.com/arcana/decks npm run assets:sync -- --dry-run${X}`)
    console.log(`\n  ${D}当前可用的恢复途径（按优先级）：${X}`)
    console.log(`  ${D}  1. 牌面仍在 git 里 → git checkout -- public/assets/decks${X}`)
    console.log(`  ${D}  2. 从对象存储 sync → 见 deployment/README.md 的 CDN Path Contract${X}`)
    console.log(`  ${D}  3. 直接用生产 CDN 开发 → VITE_DECK_ASSET_BASE_URL=<CDN> npm run dev${X}`)
  } else {
    const base = SOURCE.replace(/\/+$/, '')
    const plan = (missing.length ? missing : want).slice(0, 5)
    console.log(`  源：${base}`)
    console.log(`  待取 ${missing.length || want.length} 个文件，前 5 条：`)
    for (const w of plan) {
      console.log(`    ${base}${w.url.slice(LOCAL_ASSET_BASE.length)}`)
      console.log(`      → ${w.repoPath}`)
    }
    if (DRY) console.log(`\n  ${Y}--dry-run：不下载任何文件${X}`)
    else {
      console.log(`\n  ${R}真实下载尚未实现${X} —— 恢复源确定后（Phase E2）再接。`)
      console.log(`  ${D}在那之前请用 rclone / aws s3 sync 等工具，目录结构与包内完全一致。${X}`)
      process.exit(1)
    }
  }
}

process.exit(missing.length === 0 && empty.length === 0 ? 0 : 1)
