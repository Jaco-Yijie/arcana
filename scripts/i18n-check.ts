/**
 * i18n 完整性检查（`npm run i18n:check`，已挂进 `npm run build`）
 *
 * ══════════════════════════════════════════════════════════════
 * 【它守的都是"不会报错的故障"】
 * i18n 的坏法几乎全是静默的：
 *   · 某个 key 只有中文 → 英文界面上突然冒出一句中文
 *   · 某张牌没写英文覆盖 → 英文解读里夹一个中文牌名
 *   · 新加了一条展示位文案 → 子集字体里没有那个字，静默回退成系统字
 *   · 组件里漏改一处硬编码 → 切了语言，那一行不动
 * 四种都不会抛异常，也都不会在 code review 的 diff 里显眼。
 * 所以这里逐条断言，让它们在构建期变红。
 * ══════════════════════════════════════════════════════════ */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import zhCN from '../src/i18n/locales/zh-CN.json'
import enUS from '../src/i18n/locales/en-US.json'
import displayKeys from '../src/i18n/display-keys.json'
import { extractKeyQuote } from '../src/features/reading/extractKeyQuote'
import { spreads } from '../src/data/spreads'
import { decks } from '../src/decks/registry'
import { allCards } from '../src/data/deck/index'
import { cardTextEn } from '../src/data/deck/i18n/en-US'

const REPO_ROOT = resolve(import.meta.dirname, '..')

let pass = 0
let fail = 0
function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    pass += 1
    console.log(`  ✓ ${label}${detail ? `  — ${detail}` : ''}`)
  } else {
    fail += 1
    console.log(`  ✗ ${label}${detail ? `  — ${detail}` : ''}`)
  }
}
function section(title: string): void {
  console.log(`\n${title}`)
}

type Node = string | string[] | { [k: string]: Node }

/** 把消息树摊平成 dotted key → 文本 */
function flatten(node: Node, prefix = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof node === 'string') {
    out.set(prefix, node)
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, `${prefix}.${i}`, out))
  } else {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out)
  }
  return out
}

const zh = flatten(zhCN as unknown as Node)
const en = flatten(enUS as unknown as Node)

/* ══════════════════════════════════════════════════════════════
 * A. 两份资源结构一致
 * ══════════════════════════════════════════════════════════ */
section('A. 语言资源结构')

check('zh-CN 有内容', zh.size > 150, `${zh.size} 条`)

const missingEn = [...zh.keys()].filter((k) => !en.has(k))
check(
  'en-US 覆盖 zh-CN 的每一条 key',
  missingEn.length === 0,
  missingEn.length ? `缺 ${missingEn.length} 条：${missingEn.slice(0, 6).join(', ')}` : `${en.size} 条`,
)

const extraEn = [...en.keys()].filter((k) => !zh.has(k))
check(
  'en-US 没有 zh-CN 里不存在的 key',
  extraEn.length === 0,
  extraEn.length ? `多 ${extraEn.length} 条：${extraEn.slice(0, 6).join(', ')}` : '一致',
)

const emptyZh = [...zh.entries()].filter(([, v]) => v.trim().length === 0).map(([k]) => k)
const emptyEn = [...en.entries()].filter(([, v]) => v.trim().length === 0).map(([k]) => k)
check('没有空字符串', emptyZh.length + emptyEn.length === 0, [...emptyZh, ...emptyEn].join(', '))

/* 占位符必须两边一致 —— `{n}` 在一边有、另一边没有，会渲染成一句缺了数字的话 */
const placeholderMismatch: string[] = []
for (const [k, v] of zh) {
  const a = [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  const b = [...(en.get(k) ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  if (a !== b) placeholderMismatch.push(`${k}(zh:${a || '-'} en:${b || '-'})`)
}
check(
  '插值占位符两边一致',
  placeholderMismatch.length === 0,
  placeholderMismatch.slice(0, 5).join(' '),
)

/* ══════════════════════════════════════════════════════════════
 * B. 语言纯度：一门语言的资源里不该混进另一门
 *
 * 例外是语言选择器的语言自称：
 *   · meta / language.switchTo —— 语言选择器本身，两个语言名各写各的字
 * ══════════════════════════════════════════════════════════ */
section('B. 语言纯度')

const CJK = /[一-鿿㐀-䶿]/
const MIXED_ALLOWED = new Set([
  'language.switchTo',
])

const cjkInEn = [...en.entries()]
  .filter(([k, v]) => !MIXED_ALLOWED.has(k) && !k.startsWith('meta.') && CJK.test(v))
  .map(([k]) => k)
check(
  'en-US 里没有汉字',
  cjkInEn.length === 0,
  cjkInEn.length ? cjkInEn.slice(0, 8).join(', ') : `${en.size - MIXED_ALLOWED.size} 条干净`,
)

/* ══════════════════════════════════════════════════════════════
 * C. 领域数据：牌阵 / 牌位 / 牌组 / 牌义
 * ══════════════════════════════════════════════════════════ */
section('C. 领域数据的双语覆盖')

const missingSpread: string[] = []
for (const spread of spreads) {
  for (const key of [`spread.name.${spread.id}`, `spread.description.${spread.id}`]) {
    if (!zh.has(key) || !en.has(key)) missingSpread.push(key)
  }
  for (const pos of spread.positions) {
    for (const suffix of ['label', 'meaning']) {
      const key = `spread.position.${spread.id}.${pos.id}.${suffix}`
      if (!zh.has(key) || !en.has(key)) missingSpread.push(key)
    }
  }
}
check(
  '5 个牌阵 + 全部牌位都有双语',
  missingSpread.length === 0,
  missingSpread.length ? missingSpread.slice(0, 6).join(', ') : `${spreads.length} 个牌阵`,
)

const missingDeck: string[] = []
for (const deck of decks) {
  for (const kind of ['name', 'tagline', 'description']) {
    const key = `decks.${kind}.${deck.deckId}`
    if (!zh.has(key) || !en.has(key)) missingDeck.push(key)
  }
}
check(
  '10 套牌组的名称 / tagline / 描述都有双语',
  missingDeck.length === 0,
  missingDeck.length ? missingDeck.slice(0, 6).join(', ') : `${decks.length} 套`,
)

/* 牌组名与 tagline 的中文必须与 registry 逐字一致 ——
   registry 仍然是 deck:check 那些内容纪律断言的检查对象（禁用词表等），
   如果 i18n 这边悄悄改了文案，那些断言就检查不到真正展示出去的字。 */
const deckDrift = decks.filter(
  (d) => zh.get(`decks.name.${d.deckId}`) !== d.name || zh.get(`decks.tagline.${d.deckId}`) !== d.tagline,
)
check(
  '牌组中文名 / tagline 与 registry 逐字一致',
  deckDrift.length === 0,
  deckDrift.map((d) => d.deckId).join(', '),
)

const missingCards = allCards.filter((c) => !cardTextEn[c.id]).map((c) => c.id)
check(
  '78 张牌都有英文牌义覆盖',
  missingCards.length === 0,
  missingCards.length ? missingCards.slice(0, 8).join(', ') : '78 / 78',
)

const REQUIRED_CARD_FIELDS = [
  'name',
  'meaningUpright',
  'meaningReversed',
  'love',
  'career',
  'study',
  'finance',
  'advice',
] as const
const incompleteCards: string[] = []
for (const card of allCards) {
  const t = cardTextEn[card.id]
  if (!t) continue
  for (const f of REQUIRED_CARD_FIELDS) {
    const v = t[f]
    const ok =
      typeof v === 'string'
        ? v.trim().length > 0
        : Boolean(v && v.upright?.trim() && v.reversed?.trim())
    if (!ok) incompleteCards.push(`${card.id}.${f}`)
  }
  if (t.keywordsUpright.length === 0 || t.keywordsReversed.length === 0) {
    incompleteCards.push(`${card.id}.keywords`)
  }
  if (t.symbols.length === 0) incompleteCards.push(`${card.id}.symbols`)
}
check(
  '每张英文牌义的必填字段都非空',
  incompleteCards.length === 0,
  incompleteCards.slice(0, 8).join(', '),
)

const cjkInCards = allCards.filter((c) => CJK.test(JSON.stringify(cardTextEn[c.id] ?? {})))
check(
  '英文牌义里没有漏译的汉字',
  cjkInCards.length === 0,
  cjkInCards.map((c) => c.id).slice(0, 8).join(', '),
)

/* ══════════════════════════════════════════════════════════════
 * D. 展示字体子集覆盖
 *
 * 中文展示字体是子集。展示位（display-keys.json 声明的那些 key）用到的
 * 每一个字都必须在子集里，否则会**静默**回退到系统字体。
 * 回退目标同为楷体，不至于难看，但仍然是一次没人会发现的降级。
 * ══════════════════════════════════════════════════════════ */
section('D. 展示字体子集覆盖')

const charsetPath = resolve(REPO_ROOT, 'public/fonts/subset-charset.txt')
const charset = new Set(readFileSync(charsetPath, 'utf8'))
check('子集字符清单存在', charset.size > 100, `${charset.size} 字符`)

const displayMissing = new Set<string>()
for (const [key, value] of zh) {
  const inTier = (displayKeys as string[]).some((k) => key === k || key.startsWith(`${k}.`))
  if (!inTier) continue
  for (const ch of value) {
    if (ch === ' ' || ch === '\n') continue
    if (!charset.has(ch)) displayMissing.add(`${key}:${ch}`)
  }
}
check(
  '展示位文案的每个字都在子集里',
  displayMissing.size === 0,
  displayMissing.size ? [...displayMissing].slice(0, 10).join(' ') : '全覆盖',
)

/* ══════════════════════════════════════════════════════════════
 * E. 组件里不许再有面向用户的中文字面量
 *
 * 【为什么用正则扫源码，而不是靠 review】
 * 漏改一处的后果是「切了语言，这一行还是中文」，而它在中文下看起来
 * 完全正常 —— 只有真的切到英文才会暴露，而那正是最少被测的路径。
 *
 * 扫描范围只含 UI 层（pages / components / features 的 tsx）。
 * 数据层（牌义、Prompt、安全提示）不在此列 —— 它们有自己的双语机制。
 * ══════════════════════════════════════════════════════════ */
section('E. UI 层没有硬编码中文')

const UI_DIRS = ['src/pages', 'src/components', 'src/features']
/** dev-only 页面不面向用户，不要求 i18n */
const SKIP = [/^src\/dev\//]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(resolve(REPO_ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(resolve(REPO_ROOT, rel)).isDirectory()) walk(rel, out)
    else if (rel.endsWith('.tsx')) out.push(rel)
  }
  return out
}

/**
 * 去掉注释，只留真正会渲染的代码。
 * 行尾注释也要去 —— `const S = 100 // viewBox 边长` 里的中文不是文案。
 * `://`（URL）不当作注释起点。
 */
function stripComments(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    /* 开发者日志不是 UI 文案 —— console.warn 里的中文是给排查问题的人看的，
       它不会出现在任何用户界面上。整段 console.xxx(...) 调用一并去掉。 */
    .replace(/console\.\w+\([\s\S]*?\n\s*\)/g, '')
    .replace(/console\.\w+\(.*?\)/g, '')
}

/**
 * 允许保留中文字面量的文件。
 * 目前只有语言选择器 —— 它上面的「中文」是**语言的自称**，
 * 按定义就不能被翻译（英文界面下也必须写作「中文」，否则找不到）。
 */
const ALLOW_CJK_LITERAL = [/^src\/components\/identity\/LanguageSwitcher\.tsx$/]

const offenders: string[] = []
for (const dir of UI_DIRS) {
  for (const file of walk(dir)) {
    if (SKIP.some((re) => re.test(file))) continue
    if (ALLOW_CJK_LITERAL.some((re) => re.test(file))) continue
    const src = stripComments(readFileSync(resolve(REPO_ROOT, file), 'utf8'))
    const hits = [...src.matchAll(/[一-鿿]+/g)].map((m) => m[0])
    if (hits.length > 0) offenders.push(`${file}(${hits.slice(0, 3).join('/')})`)
  }
}
check(
  'pages / components / features 的 tsx 里没有中文字面量',
  offenders.length === 0,
  offenders.length ? offenders.slice(0, 6).join('  ') : '干净',
)

check('中文品牌引导语不混排英文', !/[A-Za-z]/.test(zh.get('app.brandEyebrow') ?? ''))
const fixedLanguageBindings = [
  ['src/components/card/TarotCardFace.tsx', /\{card\.nameZh\}/],
  ['src/features/table/components/DrawTable.tsx', /\{pos\.label\}/],
  ['src/features/table/components/CardMeaningSheet.tsx', /text\.name !== card\.name/],
] as const
check('卡面、牌位和详情不绕过语言层', fixedLanguageBindings.every(([file, pattern]) =>
  !pattern.test(stripComments(readFileSync(resolve(REPO_ROOT, file), 'utf8'))),
))

/* ══════════════════════════════════════════════════════════════
 * F. 沿用自 identity-check 的既有断言
 * ══════════════════════════════════════════════════════════ */
section('F. 引文抽取（沿用）')

assert.equal(extractKeyQuote(''), null)
assert.equal(extractKeyQuote('这是一句尚未结束也不应该被抽成结论的话'), null)
const sentence = '你可以先从一件力所能及的小事开始。'
assert.equal(extractKeyQuote(`提示。${sentence}然后再观察。`), sentence)
assert.equal(extractKeyQuote('长'.repeat(120) + '。'), null)
check('extractKeyQuote 边界不变', true)

console.log(`\n${'─'.repeat(64)}`)
if (fail === 0) {
  console.log(`i18n:check 全部通过（${pass} 项）`)
} else {
  console.log(`i18n:check 失败 ${fail} 项 / 共 ${pass + fail} 项`)
  process.exitCode = 1
}
