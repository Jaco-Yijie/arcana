/**
 * Phase C1B-1 · THE FOOL PRODUCTION SPEC 生成器
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么是生成的，不是手写的】
 * §3 的要求是：最终生成指令必须由
 *     Semantic Layer + CardArtBrief + DeckArtBible
 * 形成。手写五段 Prompt 做不到这一点 —— 手写的东西看起来像是从 Bible 来的，
 * 但没有任何机制保证它真的是。改了 Bible 而 Prompt 没跟着改，
 * 就会出现「规则说水彩、Prompt 写油画」而两边都绿。
 *
 * 这个脚本把 Prompt 变成 Bible 的**投影**：
 * 改 Bible → 重跑 → Prompt 自动跟着变。Prompt 里没有一句凭空写的话。
 *
 * 用法：`npm run spec:fool` → docs/v2/22-the-fool-production-spec.md
 * ══════════════════════════════════════════════════════════ */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { CANONICAL_DECK_IDS, getArtBible } from '../src/decks/art/bibles.ts'
import { buildCardArtBrief } from '../src/decks/art/buildBrief.ts'
import { STYLE_ANCHOR_CARD_ID } from '../src/decks/artwork/manifests.ts'
import { cardArtworkRepoPath, cardThumbRepoPath, THUMB_SPEC } from '../src/decks/artwork/paths.ts'
import type { DeckId } from '../src/decks/ids.ts'

const CARD_ID = STYLE_ANCHOR_CARD_ID

/* ── 技术规格：全部从项目里读出来，不重新发明 ────────────────── */

/** 与 src/styles/theme.css 的 --card-ratio 一致，由 layout:check 守住 */
const CARD_RATIO = 0.5999
/** 与 paths.ts 文件头的目录形状注释一致 */
const FULL = { w: 1080, h: 1800 }
/** master 取交付尺寸的 2 倍，返修与后期裁切都还有余量 */
const MASTER = { w: FULL.w * 2, h: FULL.h * 2 }

/**
 * 安全区。数值来源是**代码里真实画上去的东西**：
 *   TarotCardFace 底部 `absolute inset-x-0 bottom-0 … pt-4 pb-1.5` +
 *   `bg-gradient-to-t from-bg-void/85` —— 底部约 14% 会被压暗并盖上牌名
 *   顶部编号 `text-[10px]` —— 约 10% 归编号
 * 原画里主体的头、手、核心象征必须落在中间那段。
 */
const SAFE = { topPct: 10, bottomPct: 14 }

/**
 * 与牌组无关的硬禁令。
 *
 * 前两条是**管线约束**，不是审美偏好：
 * 逆位复用同一张图 rotate(180deg)，画里烘焙的字会倒过来；
 * 牌名与编号由 TarotCardFace 绘制，画里再画一遍就是两层。
 * 后两条是 Quality Gate C 组（原创性）与 A-10（AI artifact）的直接投影。
 */
const UNIVERSAL_NEGATIVE: readonly string[] = [
  '画面内任何文字、字母、汉字、罗马数字（牌名与编号由代码绘制）',
  '画面内自带的牌名条 / 编号框 / 第二层边框',
  '描摹或复刻任何现有塔罗牌的具体构图与人物动作（含 Rider-Waite-Smith 的愚者姿势与白狗位置）',
  '多余手指、错误手部结构、重复器官、崩坏人脸、断裂的边框',
  '水印、签名、logo',
]

function bar(n = 62): string {
  return '─'.repeat(n)
}

function list(items: readonly string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

/* ══════════════════════════════════════════════════════════════
 * 单套牌的 Production Spec
 * ══════════════════════════════════════════════════════════ */

function specFor(deckId: DeckId): string {
  const bible = getArtBible(deckId)
  const brief = buildCardArtBrief(deckId, CARD_ID)
  if (!bible || !brief) throw new Error(`[fool-spec] 缺 bible 或 brief：${deckId}`)

  const v = brief.visual
  const t = brief.deckTranslation

  /* 正向 Prompt：一段可以直接交给出图环节的连续描述。
     每一句的来源都标在括号里 —— 评审时可以逐句回溯到 Bible 的哪一条。 */
  const positive = [
    `【画种】一幅 ${bible.medium.primary} 的塔罗牌插画，竖构图。${bible.medium.secondary.join('、')}。表面质感：${bible.medium.surfaceTexture}。印刷性格：${bible.medium.printCharacter}`,
    `【主体】${v.heroSubject}`,
    `【瞬间】${v.narrativeMoment}`,
    `【取景】${v.camera}。主体尺度：${bible.composition.subjectScale}`,
    `【前景】${v.foreground}`,
    `【中景】${v.midground}`,
    `【远景】${v.background}`,
    `【光】${t.lighting}`,
    `【线条】${t.lineLanguage}`,
    `【空间】${t.environment}。对称：${bible.composition.symmetry}`,
    `【人物语言】${bible.subjectLanguage.humans}`,
    `【动物语言】${bible.subjectLanguage.animals}`,
    `【自然语言】${bible.subjectLanguage.nature}`,
    `【色彩】主色 ${bible.palette.dominant.join(' / ')}；点缀 ${bible.palette.accent.join(' / ')}。明度：${bible.palette.luminanceProfile}`,
    `【情绪】${bible.identity.visualThesis} 关键词：${bible.identity.coreMood.join('、')}；${bible.identity.emotionalKeywords.join('；')}`,
  ].join('\n')

  /* 负向 Prompt = 全局硬禁令 + 这一张的禁令 + 整套的禁令 + 调色板禁令。
     后三段 buildCardArtBrief 已经合并好；第一段是与牌组无关的管线约束，
     写在这里而不是五份 Bible 里，是为了避免五处各写一遍然后漂移。 */
  const negative = [...UNIVERSAL_NEGATIVE, ...brief.forbidden]

  return `
## ${bible.identity.name}　\`${deckId}\`

> ${bible.identity.visualThesis}

### 象征落位（Layer 1 的四个符号 → 这套牌怎么画）

${v.symbolPlacement.map((s) => `- ${s}`).join('\n')}

### Production Prompt（正向）

\`\`\`text
${positive}
\`\`\`

### Negative Prompt（禁止出现）

\`\`\`text
${negative.join('\n')}
\`\`\`

### 硬性必含（缺一项即退回重画）

${list(brief.mustInclude)}

${brief.optional.length > 0 ? `### 可选元素\n\n${list(brief.optional)}\n` : ''}
### 缩略图锚点（A-05 的判据）

**${brief.thumbnailAnchor}**

缩到 ${THUMB_SPEC.card.width / 4}px 宽时，必须仍能认出这一条。认不出 = 构图失败，不是分辨率问题。

### 边框与排印（由代码绘制，不画进原画）

| | |
|---|---|
| 边框 | ${t.frame} |
| 字体性格 | ${t.typography} |
| 卡背 | ${bible.cardBack.composition}（${bible.cardBack.symmetry}） |

### 资产落位

| | |
|---|---|
| full | \`${cardArtworkRepoPath(deckId, CARD_ID)}\` |
| thumb | \`${cardThumbRepoPath(deckId, CARD_ID)}\` |
| status | \`benchmark\`（**不是** approved / final） |
`
}

/* ══════════════════════════════════════════════════════════════
 * 文档
 * ══════════════════════════════════════════════════════════ */

function build(): string {
  const anyBrief = buildCardArtBrief(CANONICAL_DECK_IDS[0]!, CARD_ID)!
  const tarot = anyBrief.tarot

  const head = `# THE FOOL — Production Spec（Phase C1B-1 · Style Anchor）

> **本文件由 \`npm run spec:fool\` 生成，不要手改。**
> 内容全部是 Semantic Layer + DeckArtBible + CardArtBrief 的投影 ——
> 想改 Prompt，去改 Bible 或 Brief，然后重新生成。

五套牌在同一张牌上的表现，是判断「这是五副真正不同的牌」还是
「一副牌换了五个滤镜」的唯一硬证据。所以 Style Anchor 只做这一张，
过了人工评审才做剩下 20 张。

${bar()}

## 0. 语义层（五套完全一致，不可改写）

**${tarot.nameZh}　${tarot.name}**　\`${tarot.cardId}\`　${tarot.arcana} · ${tarot.number}

| | |
|---|---|
| 核心关键词 | ${tarot.semanticCore.join(' · ')} |
| 正位 | ${tarot.meaningUpright} |
| 逆位 | ${tarot.meaningReversed} |

**四个符号（五套必须全部表达，可换物件、不可缺功能）**

${tarot.symbolMeanings.map((s) => `- **${s.title}** —— ${s.meaning}`).join('\n')}

> 逆位不另出图。同一张原画 \`rotate(180deg)\` —— 因此**原画里不得烘焙任何文字与数字**，
> 否则倒过来就是倒字。牌名与编号一律由 \`TarotCardFace\` 绘制。

${bar()}

## 1. 技术规格（五套一致）

| 项 | 值 | 来源 |
|---|---|---|
| 卡牌宽高比 | \`${CARD_RATIO}\`（1 : 1.667） | \`src/styles/theme.css --card-ratio\` |
| master | ${MASTER.w} × ${MASTER.h} px | 交付尺寸 ×2，留返修余量 |
| full 交付 | ${FULL.w} × ${FULL.h} px · WebP | \`paths.ts\` 目录形状 |
| thumb 交付 | ${THUMB_SPEC.card.width} × ${THUMB_SPEC.card.height} px · WebP q${THUMB_SPEC.quality} | \`THUMB_SPEC.card\` |
| 出血 | 满幅。牌面 \`object-cover\`，画面即整张牌 | \`CardArtworkLayer\` |

**安全区** —— 代码会在原画之上画这两样东西：

- 顶部 **${SAFE.topPct}%**：编号（罗马 / 阿拉伯，按各套 Bible）
- 底部 **${SAFE.bottomPct}%**：牌名，且带一层由下而上的暗色渐变

因此主体的**头、手、核心象征必须落在纵向 ${SAFE.topPct}% – ${100 - SAFE.bottomPct}% 之间**。
底部 ${SAFE.bottomPct}% 可以有画面，但不能有必须看清的东西 —— 它会被压暗。

**${FULL.w} / ${FULL.h} = ${(FULL.w / FULL.h).toFixed(4)}**，与 \`--card-ratio ${CARD_RATIO}\` 一致（差 ${((FULL.w / FULL.h - CARD_RATIO) * 100).toFixed(2)}%，肉眼不可见）。
不要按其它比例出图后再裁 —— 裁切会先吃掉边框和头顶。

${bar()}

## 2. 五套 Production Spec
`

  const bodies = CANONICAL_DECK_IDS.map((d) => specFor(d)).join(`\n${bar()}\n`)

  const tail = `
${bar()}

## 3. 出图后的接入顺序

1. master → \`${FULL.w}×${FULL.h}\` WebP → \`public/assets/decks/<deckId>/cards/major-00.webp\`
2. 生成 \`${THUMB_SPEC.card.width}×${THUMB_SPEC.card.height}\` thumb → \`.../thumbs/major-00.webp\`
3. 在 \`manifests.ts\` 的 \`BENCHMARK_STAGED\` 里登记，**status 必须是 \`benchmark\`**
4. \`npm run artwork:check\` —— B 组会验证状态、路径唯一性、以及**文件真的在磁盘上**
5. \`npm run dev\` → \`/dev/benchmark\` 做 ROUND A–D 四轮比较
6. 人工评审通过 → status 改 \`approved\` → 这时 Deck Library 才会显示 1/78

> 第 6 步之前，正式产品里**看不到**这五张图。这不是保守，是 §13 的硬要求：
> benchmark 是试产，approved 才是交付。
`

  return head + bodies + tail
}

const out = resolve(import.meta.dirname, '../docs/v2/22-the-fool-production-spec.md')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, build(), 'utf8')
console.log(`\x1b[32m已生成\x1b[0m  docs/v2/22-the-fool-production-spec.md`)
console.log(`\x1b[2m五套 The Fool Production Spec，全部由 Bible + Brief + 语义层投影而成。\x1b[0m`)
