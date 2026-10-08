/**
 * Multi-Agent Visual QA —— 第 2.5 步：平票裁决集。
 *
 *     npx tsx scripts/blind-review-tiebreak.ts --run wave-1
 *
 * ══════════════════════════════════════════════════════════════
 * 【它修的是 Pilot 暴露出来的最大瓶颈】
 * Pilot 里 11 张有 6 张进了人工队列，其中 **3 张**（review-003/004/010）
 * 的原因不是「图看不清」，而是 §16.2 那条硬规则：
 *   AUTO_CORRECT 要求两名 Reviewer 都报了同一件事。
 * 一个人判 pass、另一个人提出问题时，即使 Judge 自己看过图后同意提出方，
 * 也只能升级人工。照这个比例外推到 95 张，人工队列会有 ~50 张，
 * 而目标是 5–20 —— 门槛本身把流水线卡死了。
 *
 * 【解法不是放松门槛，是补一个独立样本】
 * 「1 pass + 1 flag」说明这件事**处在可分辨的边界上**，恰恰最值得再看一眼。
 * 所以派第三个 Reviewer 盲审同一张图（它不知道前两人说了什么，也不知道
 * 这张图为什么被挑出来），然后按 2/3 多数决定还能不能走自动通道。
 *
 * 门槛没有变松：仍然需要**两个独立观察者报同一件事** + Judge 独立复核。
 * 变的只是「去哪里找第二个观察者」—— 原来只有两次机会，现在有三次。
 *
 * 【为什么不一开始就三审】
 * 三审全部 95 张 = 285 个审核位，成本翻 1.5 倍，而 Pilot 显示
 * 约 70% 的图两人就能达成一致。只在真正卡住的那部分加人，才划算。
 * ══════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const RUN = argValue('--run') ?? 'pilot'
const OUT_DIR = resolve(ROOT, 'qa/visual-semantics/multi-agent-review', RUN)

interface Cmp { reviewId: string; reviewer: string; verdict: string }

function load<T>(sub: string): T[] {
  const dir = resolve(OUT_DIR, sub)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .flatMap((f) => {
      const raw = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as T | T[]
      return Array.isArray(raw) ? raw : [raw]
    })
}

const manifest = JSON.parse(readFileSync(resolve(OUT_DIR, 'manifest.json'), 'utf8')) as {
  rows: { reviewId: string; blindImage: string }[]
}
const comparisons = load<Cmp>('comparisons')

const needed: { reviewId: string; blindImage: string; split: string }[] = []

for (const row of manifest.rows) {
  const cs = comparisons.filter((c) => c.reviewId === row.reviewId)
  if (cs.length !== 2) continue
  const verdicts = cs.map((c) => c.verdict)
  const passes = verdicts.filter((v) => v === 'pass').length
  /* 只处理「恰好一个 pass、一个非 pass」—— 这是可以靠第三票打破的僵局。
     两人都 pass 不需要第三人；两人都提出问题也不需要（本来就满足双人一致）。 */
  if (passes !== 1) continue
  needed.push({
    reviewId: row.reviewId,
    blindImage: row.blindImage,
    split: cs.map((c) => `${c.reviewer}=${c.verdict}`).join(' vs '),
  })
}

writeFileSync(
  resolve(OUT_DIR, 'tiebreak.json'),
  `${JSON.stringify({ run: RUN, count: needed.length, cards: needed }, null, 2)}\n`,
  'utf8',
)

console.log(`\n平票裁决集  run=${RUN}：${needed.length} 张需要第三个独立 Reviewer`)
for (const n of needed) console.log(`  ${n.reviewId}  ${n.split}`)
if (needed.length > 0) {
  console.log(`\n图片路径：`)
  for (const n of needed) console.log(`  ${resolve(ROOT, n.blindImage)}`)
}
console.log()
