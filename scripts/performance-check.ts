/**
 * Performance 自检（PERF 组 · Phase D5）
 *
 * 【为什么不把公网耗时当 CI Gate】
 * 「首字 2.4 秒」这种数字取决于 DeepSeek 当天的排队情况，写成阈值只会得到一个
 * 时不时红一次、然后被所有人忽略的检查。真实耗时由
 * `scripts/perf-reading-trace.ts` 与 `qa/performance-d5/` 下的浏览器脚本实测记录。
 *
 * 这一组锁的是**让那些数字保持成立的结构性质**：
 *   · 牌一确定就开始准备原画，而且只准备选中的那几张
 *   · full 没就绪时有 thumb 兜底，不是空白卡面
 *   · standard 与 deep 的配置确实不同，且 standard 的预算确实更小
 *   · 流式内容写完一段就上屏，不是等整份 JSON
 *
 * 用法：`npm run performance:check`（零网络、零 token）
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildSystemPrompt } from '../server/prompts/tarotReadingPromptV2.ts'
import { thinkingParamFor } from '../server/providers/stream.ts'
import {
  extractPartialCards,
  extractPartialRelationships,
  extractPartialStringList,
} from '../src/features/reading/streamClient.ts'

const G = '\x1b[32m'; const R = '\x1b[31m'; const D = '\x1b[2m'; const B = '\x1b[1m'; const X = '\x1b[0m'
let pass = 0; let fail = 0
const failures: string[] = []
function check(name: string, ok: boolean, note = ''): void {
  if (ok) { pass += 1; console.log(`  ${G}PASS${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`) }
  else { fail += 1; failures.push(name); console.log(`  ${R}FAIL${X}  ${name}${note ? `  ${D}${note}${X}` : ''}`) }
}
function section(t: string): void { console.log(`\n${B}${t}${X}`) }

const ROOT = resolve(import.meta.dirname, '..')
const read = (p: string) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '')

/* ══ PERF-01 … PERF-04 牌面准备 ══ */
section('PERF · Card Artwork 准备时机')

const hook = read('src/features/table/useSelectedArtworkPrefetch.ts')
const draw = read('src/pages/DrawPage.tsx')
const reveal = read('src/pages/RevealPage.tsx')

check(
  'PERF-01 牌一确定（摆满）就触发 full artwork 准备',
  hook.length > 0
  && /useSelectedArtworkPrefetch/.test(draw)
  && /placedCards\.length === spreadForPrefetch\.cardCount/.test(draw)
  && /\.load\('full'\)/.test(hook),
  'DrawPage 摆满时启动 · RevealPage 挂载时兜底',
)
check(
  'PERF-01b Reveal 页也会准备（覆盖 Resume 直接进入的路径）',
  /useSelectedArtworkPrefetch/.test(reveal),
  'RevealPage.tsx',
)
check(
  'PERF-01c 预取会提前 decode，不只是下载字节',
  /\.decode\?\.\(\)/.test(hook),
  'HTMLImageElement.decode()',
)

/* PERF-02 —— 只取选中的牌。这条是 G-05 的边界，必须锁死 */
const prefetchesFromPlacements =
  /session\.placements\.map/.test(draw) && /session\.placements\.map/.test(reveal)
/* 查的是**调用**，不是提及 —— hook 的注释里正当地写了「prefetchDeck 至今没有调用方」，
   第一版断言把那句注释当成了调用，属于断言比代码还严。这里改成匹配调用形式。 */
const callsPrefetchDeck = (t: string) => /\bprefetchDeck\s*\(/.test(t)
const touchesWholeDeck = callsPrefetchDeck(draw) || callsPrefetchDeck(reveal) || callsPrefetchDeck(hook)
check(
  'PERF-02 只准备 placements 里的牌，绝不预取整副牌',
  prefetchesFromPlacements && !touchesWholeDeck,
  touchesWholeDeck ? '发现 prefetchDeck 调用' : '来源只有 session.placements',
)
const fan = read('src/features/table/components/FanSpread.tsx')
check(
  'PERF-02b FanSpread 仍然不请求任何正面（G-05 未松动）',
  !/TarotCardFace|CardArtwork\b|useCardArtwork/.test(fan) && /CardBack/.test(fan),
  'FanSpread.tsx',
)

/* PERF-03 thumb 兜底 */
const layer = read('src/components/card/CardArtworkLayer.tsx')
check(
  'PERF-03 full 未就绪时用 thumb 兜底，而不是空白卡面',
  /wantsFull/.test(layer) && /fallbackThumb/.test(layer)
  && /useCardArtwork\(plan, wantsFull \? 'thumb' : variant\)/.test(layer),
  'CardArtworkLayer.tsx',
)
check(
  'PERF-03b thumb → full 是同一个 <img> 换 src（不重播动画、不产生 CLS）',
  /const asset = state\.status === 'ready' \? state\.asset : fallbackThumb!/.test(layer),
)
check(
  'PERF-03c 没有引入长时间 blur 过渡（用户要立刻看见牌，不是看糊牌变清楚）',
  !/blur-|filter:\s*blur|transition-\[filter\]/.test(layer),
)

/* PERF-04 CLS */
check(
  'PERF-04 <img> 保留原图 width/height，防 CLS',
  /width=\{plan\.width\}/.test(layer) && /height=\{plan\.height\}/.test(layer),
)

/* ══ PERF-05 … PERF-07 Standard / Deep 配置 ══ */
section('PERF · Standard vs Deep 配置')

const sysStd = buildSystemPrompt('standard')
const sysDeep = buildSystemPrompt('deep')
check(
  'PERF-05 standard 与 deep 的 system prompt 确实不同',
  sysStd !== sysDeep,
  `standard ${sysStd.length} 字符 · deep ${sysDeep.length} 字符`,
)
check(
  'PERF-06 standard 的 prompt 更小（预算更紧，不是同一份加一句话）',
  sysStd.length < sysDeep.length,
  `差 ${sysDeep.length - sysStd.length} 字符`,
)
check(
  'PERF-06b standard 给出了明确的篇幅预算',
  /篇幅预算/.test(sysStd) && /最多 2 条/.test(sysStd),
)
check(
  'PERF-06c standard 不输出 alternativeInterpretations（留给 deep）',
  /alternativeInterpretations.*不输出|标准模式不输出/.test(sysStd)
  && !/标准模式不输出/.test(sysDeep),
)
/* 示例是最强的篇幅锚点 —— 两个模式必须用各自的那份 */
const stdExample = /输出示例（只演示 json 形状与篇幅密度/.test(sysStd)
const deepExample = /输出示例（只演示 json 形状与语感/.test(sysDeep)
/* 只看示例的 json 本体。示例前面那句说明里正当地写着「没有 alternativeInterpretations」，
   第一版把那句说明也算成了违规。 */
const stdExampleJson = (sysStd.split('# 输出示例')[1] ?? '').slice((sysStd.split('# 输出示例')[1] ?? '').indexOf('{'))
const deepExampleJson = (sysDeep.split('# 输出示例')[1] ?? '').slice((sysDeep.split('# 输出示例')[1] ?? '').indexOf('{'))
check(
  'PERF-06d standard 用紧凑示例、deep 用完整示例（示例即最强篇幅锚点）',
  stdExample && deepExample
  && stdExampleJson.length < deepExampleJson.length
  && !/"alternativeInterpretations"/.test(stdExampleJson)
  && /"alternativeInterpretations"/.test(deepExampleJson),
  `standard 示例 ${stdExampleJson.length} 字符 · deep 示例 ${deepExampleJson.length} 字符`,
)

/* PERF-07 推理配置 */
const stdThinking = JSON.stringify(thinkingParamFor('standard'))
const deepThinking = JSON.stringify(thinkingParamFor('deep'))
check(
  'PERF-07 standard 关闭推理，deep 开启（standard 不背 deep 的推理开销）',
  /disabled/.test(stdThinking) && /enabled/.test(deepThinking),
  `standard ${stdThinking} · deep ${deepThinking}`,
)

/* ══ PERF-08 流式上屏 ══ */
section('PERF · 流式上屏')

const hookReading = read('src/hooks/useReading.ts')
const page = read('src/pages/ReadingPage.tsx')
check(
  'PERF-08 收到 chunk 就上屏，不等整份 JSON',
  /onDelta/.test(hookReading) && /extractPartial\(acc, 'readingTheme'\)/.test(hookReading),
)
check(
  'PERF-08b 每张牌写完就上屏（否则等待期屏上会长时间一字不变）',
  /extractPartialCards\(acc\)/.test(hookReading) && /partial\.cards\.map/.test(page),
)
/* 只上屏已闭合的字段 —— 目标是 First Meaningful Text，不是 First Raw Token */
const half = '{"cards":[{"cardName":"隐士","position":"过去","interpretation":"写到一半'
check(
  'PERF-08c 半截字段不上屏（不展示写到一半的句子或裸 JSON）',
  extractPartialCards(half).length === 0,
  `半截输入解析出 ${extractPartialCards(half).length} 张`,
)
const closed = '{"cards":[{"cardName":"隐士","position":"过去","interpretation":"完整的一句。","connectionToQuestion":"x"}'
check(
  'PERF-08d 字段闭合后立即可上屏',
  extractPartialCards(closed).length === 1,
)
/* 等待文案不能再按 deep 时代校准 */
check(
  'PERF-08e 等待节奏与「久一点」提示按模式分开',
  /PHASE_INTERVAL_MS: Record<ReadingMode, number>/.test(hookReading)
  && /SLOW_HINT_AFTER_MS: Record<ReadingMode, number>/.test(hookReading),
)
/* 【判据被改过，理由留在这里】
   原判据是一条匹配旧源码字面量的正则：
     /mode === 'deep'\s*\n?\s*\? `深度解读比较完整，通常需要 1–2 分钟/
   它锁的是**那一行长什么样**，不是**产品行为对不对**。
   E3 把等待提示从独立段落挪进状态行（不再遮挡已上屏的内容），
   文案与换行都变了，行为一个字没变，这条却红了 —— 那是断言在守格式。

   现在改成守不变量本身：「1–2 分钟」这个说法只允许出现在 deep 分支里。
   判据是每一处出现，往前 120 字符内必须能找到 `mode === 'deep'` 与紧随的 `?`。
   这样文案怎么改都不影响，而一旦有人把它放进 standard 分支就会立刻红。 */
const minuteHints = [...page.matchAll(/1–2 分钟/g)]
const allInDeepBranch =
  minuteHints.length > 0
  && minuteHints.every((m) => /mode === 'deep'[\s\S]{0,40}\?[\s\S]{0,80}$/.test(page.slice(Math.max(0, m.index - 120), m.index)))
check(
  'PERF-08f 「1–2 分钟」只出现在 deep 分支，标准模式看不到',
  allInDeepBranch,
  `${minuteHints.length} 处出现，全部在 deep 分支=${allInDeepBranch}`,
)
/* ══════════════════════════════════════════════════════════════
 * PERF-08h … PERF-08m —— 「牌之后」的死窗口（E3）
 *
 * D5 修好了牌**之前**那一段（extractPartialCards）。E3 实测发现牌**之后**
 * 还有一段更长的空白：最后一张牌解释 10.4 秒就上屏了，而解读要到 19.3 秒
 * 才被标记完成 —— 中间 9.6 秒（占总时长 48%）屏幕上一个新字都没有。
 *
 * 那 9.6 秒模型在写 relationships / narrative / answerToQuestion /
 * reflectionQuestions，它们本来就在流里，只是前端扣着等 done 才一次性放出。
 * 下面这几条锁住「它们必须边写边放」。
 * ════════════════════════════════════════════════════════════ */

/* relationships：只取已闭合的那条。半截不能上屏 —— 与 cards 同一条原则 */
const relHalf = '{"relationships":[{"cards":["a","b"],"kind":"arc","interpretation":"这句还没写完'
check(
  'PERF-08h relationships 半截不上屏',
  extractPartialRelationships(relHalf).length === 0,
  `解析出 ${extractPartialRelationships(relHalf).length} 条`,
)
const relClosed =
  '{"relationships":[{"cards":["a","b"],"kind":"arc","interpretation":"完整的一条关系。"},'
check(
  'PERF-08i relationships 闭合后立即可上屏',
  extractPartialRelationships(relClosed).length === 1,
)
/* 必须只认 relationships 段 —— cards[].interpretation 后面跟的是逗号不是 }，
   如果判据写松了，三张牌的解释会被当成三条「牌间关系」重复显示一遍 */
const cardsThenRel =
  '{"cards":[{"cardName":"隐士","position":"过去","interpretation":"牌的解释。","connectionToQuestion":"x"}],'
  + '"relationships":[{"cards":["a"],"kind":"arc","interpretation":"关系的解释。"},'
check(
  'PERF-08j 不把 cards[].interpretation 误当成牌间关系',
  extractPartialRelationships(cardsThenRel).length === 1
  && extractPartialRelationships(cardsThenRel)[0] === '关系的解释。',
  extractPartialRelationships(cardsThenRel).join(' / '),
)

/* reflectionQuestions：字符串数组，同样只取已闭合的元素 */
const refl = '"reflectionQuestions":["第一问？","第二问？","第三问还没写完'
check(
  'PERF-08k reflectionQuestions 只放出已闭合的元素',
  extractPartialStringList(refl, 'reflectionQuestions').length === 2,
  `解析出 ${extractPartialStringList(refl, 'reflectionQuestions').length} 条`,
)

/* 前端必须真的消费这四个字段，否则上面的提取器写了也白写 */
check(
  'PERF-08l useReading 把牌之后的四段一并放出',
  /extractPartialRelationships\(acc\)/.test(hookReading)
  && /extractPartial\(acc, 'narrative'\)/.test(hookReading)
  && /extractPartial\(acc, 'answerToQuestion'\)/.test(hookReading)
  && /extractPartialStringList\(acc, 'reflectionQuestions'\)/.test(hookReading),
)

/* 流式与完成态必须共用一套渲染。两个互斥分支 = done 时整块替换 =
   用户正在读的段落位移，而且后半程内容全被扣住。 */
const body = read('src/features/reading/ReadingBody.tsx')
check(
  'PERF-08m 流式与完成态共用同一个渲染组件（不再有两个互斥分支）',
  body.length > 0
  && /streaming: boolean/.test(body)
  && /status === 'loading' \|\| structured/.test(page),
)

/* 不许为了仪式感加人为等待 */
check(
  'PERF-08g 没有为「仪式感」加入最低等待时间',
  !/MIN_(WAIT|LOADING)|artificialDelay|fakeProgress/.test(hookReading + page),
)

/* ══ PERF-09 / PERF-10 ══ */
section('PERF · Prompt 边界与重试')

const promptSrc = read('server/prompts/tarotReadingPromptV2.ts')
const ctxSrc = read('server/context/rebuild.ts')
check(
  'PERF-09 Reading prompt 不包含 artwork URL / 资产模块',
  !/artwork|\.webp|assets\/decks|cardArtworkUrl/i.test(promptSrc)
  && !/artwork|cardArtworkUrl/i.test(ctxSrc),
  '牌面资产与解读完全无关',
)
check(
  'PERF-10 重试不重新抽牌（请求体是已冻结 session 的纯函数产物）',
  /requestRef/.test(hookReading) && /逐字节相同/.test(hookReading),
  'useReading.ts · requestRef',
)

console.log(`\n${'─'.repeat(64)}`)
if (fail === 0) {
  console.log(`${G}全部通过${X}  ${pass} 项断言，0 失败`)
  console.log(`${D}牌一确定就开始准备，只准备选中的那几张；写完一段就上屏。${X}`)
} else {
  console.log(`${R}${fail} 项失败${X} / ${pass + fail} 项`)
  for (const f of failures) console.log(`  ${R}·${X} ${f}`)
}
console.log('─'.repeat(64))
process.exit(fail === 0 ? 0 : 1)
