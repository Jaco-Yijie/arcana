/**
 * Tarot Artwork Visual Analyst 的 Prompt —— **离线批处理专用**。
 *
 * 【它和 tarotReadingPromptV2.ts 没有任何关系，也不该有】
 * 那份 Prompt 的角色是塔罗解读者：有用户、有问题、有牌阵、要给判断。
 * 这份 Prompt 的角色是美术档案员：只有一张图，没有用户，不做任何预测。
 * 两者的输入、输出、失败方式、延迟预算全都不同，混在一起改一边就会碰坏另一边。
 *
 * ══════════════════════════════════════════════════════════════
 * 【本轮最大的质量风险：Rider-Waite 先验泄漏】
 * 如果直接告诉模型「这是圣杯八」，它极可能不看图，
 * 直接背出 RWS 的记忆：八个杯子、月亮、背影、山路。
 * 而这五套牌组是各自重画的 —— 那些东西未必在画里。
 * 一旦背诵混进 dataset，整层就从「让 AI 看见这副牌」
 * 退化成「让 AI 更自信地复述传统牌义」，比没有还糟。
 *
 * 三道防线：
 *   1. Prompt 里反复、具体地禁止（下面 VISUAL FIDELITY 一节）；
 *   2. canonical meaning 只在 user message 末尾出现，并且明确标注
 *      它的用途只有一个 —— 判断画面强调了传统牌义的哪一层；
 *   3. 校验层对 RWS 高频意象做抽样对照（visualSemanticsSchema.ts）。
 * ══════════════════════════════════════════════════════════════
 *
 * 【为什么 dataset 统一用英文】
 * 中英双语会变成 390 × 2 条数据、两倍成本、两份需要同步的真相。
 * 而这些内容不直接显示给用户 —— 它们是给 Reading 模型看的材料，
 * DeepSeek 在中文解读里会自然把 "a lone figure walks away" 转述成中文。
 * 英文同时避免了英文解读里混进中文的风险。
 */

import { createHash } from 'node:crypto'

/** 画面事实类字段的条数上限。写进 Prompt，让模型自己收口，省得后期截断丢掉最重要的那条 */
export const VISUAL_FIELD_LIMITS = {
  figures: 4,
  keyObjects: 8,
  spatialRelations: 4,
  foreground: 4,
  background: 4,
  palette: 6,
  visualTensions: 3,
  deckSpecificMotifs: 4,
  emotionalTone: 3,
  emphasizedAspects: 3,
  softenedAspects: 2,
  tensionWithCanonical: 2,
  uncertainDetails: 4,
} as const

export const VISUAL_ANALYSIS_SYSTEM_PROMPT = `You are a Tarot Artwork Visual Analyst building a fixed visual-semantic dataset.

You are NOT a tarot reader. You do not interpret, predict, advise, or answer anyone's question.
There is no querent. There is no spread. There is no reading.

# VISUAL FIDELITY — your first responsibility

Describe ONLY what is actually visible in the supplied image.

Knowing which tarot card this is does NOT give you permission to invent canonical
Rider-Waite imagery that is absent from this particular artwork. Decks repaint their
cards freely: a card may have a different number of objects, different figures,
different animals, different landscape, or none of the traditional elements at all.

Hard rules:
- If a traditionally expected element is NOT in this image, do not mention it anywhere.
- **The rank in the card's name is not a count of objects** — see the section below.
- Do not name an object because the card "should" have it.
- Describe the moon, sun and other bodies **from the shape you can see** — crescent,
  gibbous, full, eclipsed, or a plain disc. Do not assume a phase from the deck's
  overall mood or from what the card traditionally shows.

# High-prior elements — the ones most often imported from memory

These appear so often in traditional tarot that they get written down even when the
artwork does not contain them. Before naming any of them, locate it in the image:

  moon (and its phase) · sun · crown · halo or nimbus · wings · blindfold ·
  horse · tower · throne · door or gateway · path or road · water · mountains ·
  the count of cups / wands / swords / pentacles

For each one, exactly three outcomes are allowed:
  1. You can see it → describe it as it actually appears.
  2. You cannot see it → say nothing about it. Its absence is a finding, not a gap.
  3. You can half see it → confidence.uncertainDetails, and leave it out of keyObjects.

Never a fourth outcome where it appears in keyObjects because the card usually has one.

# Card rank is not an object count

The rank in a minor arcana name — Two, Three, … Ten — is the card's *identity*,
not a tally of what is painted. "cups-08" does not guarantee eight cups are visible;
"wands-06" does not guarantee six wands.

- Count only what you can actually resolve in the image.
- A count that happens to match the rank is fine **when you counted it**: if you can
  resolve four upright wands, write "four upright wands" — do not hedge a count you
  genuinely made.
- If the objects overlap, are cropped, or fade into shadow, write "several" and put
  the number in confidence.uncertainDetails. Never fall back on the rank.
- If you are unsure whether something is present, put it in confidence.uncertainDetails
  and leave it out of keyObjects / foreground / background.
- It is correct and expected for an artwork to contain almost none of the traditional symbols.

# Separate observation from emphasis

Two different kinds of content, never mixed:

1. **Observable visual facts** — scene, figures, keyObjects, spatialRelations,
   foreground, background, lighting, palette, composition, visualTensions,
   deckSpecificMotifs, emotionalTone.
   These describe pixels. A stranger who has never heard of tarot should be able to
   verify every one of them by looking at the image.

2. **Semantic bridge** — semanticBridge only.
   This is the ONLY place where the canonical meaning may be referenced, and it may
   answer exactly one question: which layers of the traditional meaning does this
   particular painting make visually prominent, and which does it leave faint?

Never write a new meaning for the card. Statements like "this card represents danger"
or "this signals a difficult period" are forbidden — that is rewriting tarot, not
describing artwork. semanticBridge entries must be phrased as aspects of the existing
canonical meaning, e.g. "leaving something familiar", not as verdicts.

# Colour is not judgement

Dark palette does not mean danger. Bright palette does not mean hope.
Report the palette and the lighting as visual facts. Do not convert them into outcomes.
emotionalTone describes the mood of the *picture*, not the fate of any person.

# Orientation

Analyse the image exactly as supplied (upright). Do not speculate about how it would
look reversed. Reversal is handled elsewhere by the canonical layer.

# Output

Return one valid JSON object, no markdown, no commentary, with exactly these keys:

{
  "scene": "one sentence, what the picture shows",
  "figures": [{"role":"...","position":"...","posture":"...","gaze":"...","movement":"..."}],
  "keyObjects": ["..."],
  "spatialRelations": ["..."],
  "foreground": ["..."],
  "background": ["..."],
  "lighting": "one short phrase",
  "palette": ["..."],
  "composition": {"focalPoint":"...","direction":"...","openness":"...","balance":"..."},
  "visualTensions": ["..."],
  "deckSpecificMotifs": ["..."],
  "emotionalTone": ["..."],
  "semanticBridge": {
    "emphasizedAspects": ["..."],
    "softenedAspects": ["..."],
    "tensionWithCanonical": ["..."]
  },
  "confidence": {"overall":"high|medium|low","uncertainDetails":["..."]}
}

Item limits (stay within them; fewer is fine):
figures ≤ ${VISUAL_FIELD_LIMITS.figures}, keyObjects ≤ ${VISUAL_FIELD_LIMITS.keyObjects},
spatialRelations ≤ ${VISUAL_FIELD_LIMITS.spatialRelations}, foreground ≤ ${VISUAL_FIELD_LIMITS.foreground},
background ≤ ${VISUAL_FIELD_LIMITS.background}, palette ≤ ${VISUAL_FIELD_LIMITS.palette},
visualTensions ≤ ${VISUAL_FIELD_LIMITS.visualTensions}, deckSpecificMotifs ≤ ${VISUAL_FIELD_LIMITS.deckSpecificMotifs},
emotionalTone ≤ ${VISUAL_FIELD_LIMITS.emotionalTone}, emphasizedAspects ≤ ${VISUAL_FIELD_LIMITS.emphasizedAspects},
softenedAspects ≤ ${VISUAL_FIELD_LIMITS.softenedAspects}, tensionWithCanonical ≤ ${VISUAL_FIELD_LIMITS.tensionWithCanonical},
uncertainDetails ≤ ${VISUAL_FIELD_LIMITS.uncertainDetails}.

Write concise English. Omit "gaze" / "movement" when not determinable.
Use [] for arrays with nothing to report — never invent filler.
Every string is a plain observation, no markdown.`

export interface VisualAnalysisCardInput {
  cardId: string
  /** 英文牌名。只用于 semanticBridge 对照，不得作为「画里有什么」的依据 */
  cardName: string
  /** canonical 正位牌义（英文） */
  canonicalUpright: string
  /** canonical 逆位牌义（英文）。给出来是为了让 softenedAspects 判断更准 */
  canonicalReversed: string
  /** 牌组的视觉定位。**只描述房间，不含任何牌义**，防止模型从牌组名脑补 */
  deckLook: string
}

/**
 * user message 的文字部分。
 *
 * 【顺序是刻意的】
 * 先下达「先看图」的指令，再给 canonical meaning，并且当场重复一遍它的用途边界。
 * 把牌名放在最前面会让模型在看图之前就进入「我知道这张牌」的模式。
 */
export function buildVisualAnalysisUserText(input: VisualAnalysisCardInput): string {
  return [
    'Analyse the attached artwork image.',
    '',
    `Deck look (art direction only, NOT meaning): ${input.deckLook}`,
    '',
    'Start from the image. Write every observable field from the pixels alone.',
    '',
    '--- Reference, for semanticBridge only ---',
    `This artwork is this deck's rendering of: ${input.cardName} (${input.cardId}).`,
    `Canonical upright meaning: ${input.canonicalUpright}`,
    `Canonical reversed meaning: ${input.canonicalReversed}`,
    '',
    'The canonical meaning above is supplied for ONE purpose: to let you say which',
    'layers of it this painting makes visually prominent (emphasizedAspects) and which',
    'it leaves faint (softenedAspects). It is NOT evidence that any object is in the image.',
    'If the traditional imagery for this card is absent here, say nothing about it —',
    'that absence is a legitimate finding, not a gap to fill.',
    '',
    'Return the JSON object now.',
  ].join('\n')
}

/* ── 牌组美术定位 ─────────────────────────────────────────── */

/**
 * 牌组的美术定位，**只描述画法，不含任何牌义**。
 *
 * 为什么必须写这一段：不给的话，模型只能从 deckId 猜（"shadow" → 阴森），
 * 那正是规格里明令禁止的「只凭 deckId 改变结论」。
 * 为什么必须只写画法：写成「这套牌更内省」就是在给牌组附加语义，
 * 模型会把它当成解读线索。这里的每一句都必须能被一个不懂塔罗的人
 * 对着图片核对。
 */
export const DECK_LOOK: Record<string, string> = {
  'legacy-moonlight': 'Deep blue night palette, silver linework, soft moonlit glow, low mist near the horizon. Nothing harsh-edged.',
  'legacy-classic': 'Ivory paper stock, dark gilt edging, deep wine-red accents, the yellowing of an old printed book.',
  'legacy-forest': 'Deep greens, moss and wood grain, amber shafts of light falling through foliage gaps.',
  'legacy-celestial': 'Midnight blue and violet, nebulae and constellation lines, very small gold star points.',
  'legacy-shadow': 'Black, grey-silver and a trace of dim violet. Almost no chroma — the image is built from light and dark alone.',
  ethereal: 'Nearly colourless grey-blue and white, dissolved edges, more empty space than objects.',
  elysian: 'Olive green, old gold and deep brown; light slanting from above onto stone and leaves; long but warm shadows.',
  opaline: 'Very pale cyan, pink and violet shifting across one surface, like opal or wet sand after the tide.',
  wonderland: 'Deep violet and ink-green vines, mirrors and arches, proportions slightly twisted.',
  classic: 'Ivory stock, dark gilt pressing, deep wine-red marks; patterns look engraved rather than printed.',
}

/* ── 生成来源指纹 ─────────────────────────────────────────── */

/**
 * 这一版 Vision Prompt 的人读版本号。
 * 只用于报告与日志；**判断新鲜度的是下面的 hash，不是这个字符串** ——
 * 手写的版本号会忘记改，hash 不会。
 */
export const VISION_PROMPT_VERSION = 'v2-prior-guard'

/**
 * 参与生成的全部 Prompt 内容的确定性指纹。
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么必须有它】
 * 在它出现之前，stale 只看 `assetHash` —— 图没换就算新鲜。
 * 于是改完 Prompt 修掉一类幻觉之后，旧数据**全部仍然被判为 fresh**，
 * 390 条里 387 条来自旧 Prompt、3 条来自新 Prompt，而系统认为一切正常。
 * 「这批数据是不是旧 Prompt 生成的」变成一件只能靠人记住的事，
 * 这正是这一层最不该依赖人记忆的地方。
 *
 * 【hash 覆盖什么】
 * 真正影响模型输出的那三样，全部按固定顺序拼进来：
 *   1. System Prompt（含插值进去的字段条数上限）
 *   2. User Prompt **模板** —— 用哨兵值渲染一次，拿到的是模板骨架而不是某张牌的内容
 *   3. 全部牌组的美术定位说明（DECK_LOOK）
 *
 * 【为什么 DECK_LOOK 整张表都进 hash，而不是只进当前这副牌的那一行】
 * 只放当前牌组的话，hash 会变成 per-deck，390 条会有 5 个不同的 hash，
 * 「全库同一版本」这件事就无法用一个等式表达。
 * 代价是改任何一副牌的美术说明都会让全库 stale —— 偏保守，但方向是对的：
 * 生成规则变了就该重跑，而不是让人去判断「这次改动要不要紧」。
 *
 * 【什么不在里面】
 * 时间戳、随机数、延迟、model 名、temperature 一律不在 —— 它是 **Prompt** 的指纹。
 * model 单独记在 meta.model 里，由 QA 断言全库一致。
 * ══════════════════════════════════════════════════════════
 */
export function visionPromptHash(): string {
  /* 哨兵值必须是固定字符串：用真实牌面渲染会让每张牌算出不同的 hash */
  const templateSkeleton = buildVisualAnalysisUserText({
    cardId: '{{cardId}}',
    cardName: '{{cardName}}',
    canonicalUpright: '{{canonicalUpright}}',
    canonicalReversed: '{{canonicalReversed}}',
    deckLook: '{{deckLook}}',
  })
  const deckLookCanonical = Object.keys(DECK_LOOK)
    .sort()
    .map((k) => `${k}=${DECK_LOOK[k]}`)
    .join('\n')

  return createHash('sha256')
    .update(
      [
        `version:${VISION_PROMPT_VERSION}`,
        `system:${VISUAL_ANALYSIS_SYSTEM_PROMPT}`,
        `userTemplate:${templateSkeleton}`,
        `limits:${JSON.stringify(VISUAL_FIELD_LIMITS)}`,
        `deckLook:${deckLookCanonical}`,
      ].join('\n\u0000\n'),
      'utf8',
    )
    .digest('hex')
}
