/**
 * Tarot Visual Semantic Layer V1 —— 牌组视觉语义的类型契约。
 *
 * ══════════════════════════════════════════════════════════════
 * 【它解决的问题】
 * 在这一层出现之前，`deckId` 在 Reading 链路上是纯记录字段：
 * 同一个 cardId + orientation + position + question，换任何牌组，
 * 模型拿到的输入逐字节相同。用户看着五套完全不同的画，AI 看到的是同一张牌。
 * V2.3 → V2.5 反复加 Prompt 规则也突破不了这个上限 ——
 * 缺的不是规则，是**这副牌到底画了什么**这条信息本身。
 *
 * 【它不是模型记忆】
 * 没有 chat history、没有 vector store、没有用户画像。
 * 每张固定 Artwork 在开发阶段被 Vision 分析一次，产出一条 JSON 存进仓库，
 * 用 sha256 与 artwork.lock.json 绑定。这是**版本化的项目数据资产**，
 * 可以 diff、可以重算、可以判 stale。用户运行时一次 Vision 都不会调。
 *
 * 【三层边界 —— 这一层只占中间那层】
 *   Layer 1 Canonical Meaning   这张牌是什么   —— 永不因牌组改变
 *   Layer 2 Visual Semantics    这副牌怎么画它 —— 本文件
 *   Layer 3 Reading             此刻该强调哪一层 —— 运行时由 V2.5 完成
 *
 * 所以这里的字段**刻意没有** meaning / interpretation / prediction。
 * 一条记录里能出现的最接近「意义」的东西是 semanticBridge，
 * 而它只被允许回答「这幅画把 canonical meaning 的哪一层放大了 / 柔化了」，
 * 不能重新定义任何一张塔罗牌。
 * ══════════════════════════════════════════════════════════════
 */

import type { DeckId } from '../decks/ids'

/** Schema 版本。改动字段含义时必须 +1，旧数据会被判 stale 重跑 */
export const VISUAL_SEMANTICS_VERSION = 1

export type VisualConfidence = 'high' | 'medium' | 'low'

export interface VisualFigure {
  /** 画面里这个人物/生物是什么，用可见特征描述（"a woman in a pale dress"），不要用牌义术语 */
  role: string
  /** 在画面中的位置："center", "lower left", "background right" */
  position: string
  /** 姿态："seated, leaning forward" */
  posture: string
  /** 视线方向。看不清就省略 */
  gaze?: string
  /** 是否在移动、往哪个方向移动。静止就省略 */
  movement?: string
}

export interface VisualComposition {
  /** 视觉焦点落在哪 */
  focalPoint: string
  /** 画面主导方向："left-to-right", "upward", "receding into depth" */
  direction: string
  /** 空间开放还是封闭："open", "enclosed", "partially blocked" */
  openness: string
  /** 平衡感："symmetrical", "weighted to the right" */
  balance: string
}

/**
 * 视觉证据 → canonical meaning 的桥。
 *
 * 【它唯一被允许做的事】
 * 指出这幅画把传统牌义的哪一部分画得更重、哪一部分画淡了。
 * 它**不能**写「这张牌代表危险」这种话 —— 那是重写牌义，不是视觉语义。
 */
export interface VisualSemanticBridge {
  /** 这幅画在视觉上放大了 canonical meaning 的哪些层面 */
  emphasizedAspects: string[]
  /** 传统牌义里有、但这幅画画得很淡或没画的层面 */
  softenedAspects: string[]
  /** 画面与传统牌义之间真实存在的张力。没有就省略 —— 不要为了填字段而制造张力 */
  tensionWithCanonical?: string[]
}

export interface DeckCardVisualSemantics {
  version: typeof VISUAL_SEMANTICS_VERSION
  deckId: DeckId
  cardId: string

  /**
   * 素材指纹。
   * assetHash 取自 artwork.lock.json 的 sha256 —— 换图即 stale，
   * 不依赖任何人记得「我刚才换过 major-09」。
   */
  source: {
    assetPath: string
    assetHash: string
  }

  /* ── A. 可见事实 ──────────────────────────────────── */

  /** 一句话概括画面。只写看得见的东西 */
  scene: string
  figures: VisualFigure[]
  /** 画面里实际出现的物件。不是传统牌义里「应该有」的东西 */
  keyObjects: string[]
  /** 元素之间的空间关系："the figure is separated from the cups by a stream" */
  spatialRelations: string[]
  foreground: string[]
  background: string[]
  lighting: string
  palette: string[]
  composition: VisualComposition

  /* ── B. 画面张力与牌组特征 ────────────────────────── */

  /** 画面内部的视觉张力（明暗、开合、朝向冲突）。没有就空数组 */
  visualTensions: string[]
  /** 这套牌组特有的反复出现的视觉母题 */
  deckSpecificMotifs: string[]
  /** 画面给人的情绪基调。这是**画面**的调子，不是对现实的预测 */
  emotionalTone: string[]

  /* ── C. 语义桥 ────────────────────────────────────── */

  semanticBridge: VisualSemanticBridge

  /* ── D. 质量与溯源 ────────────────────────────────── */

  confidence: {
    overall: VisualConfidence
    /** 看不清、拿不准的细节放这里。**不要猜，也不要省略不写** */
    uncertainDetails: string[]
  }

  /**
   * 这条记录是**谁、用哪一版规则**生成的。
   *
   * ══════════════════════════════════════════════════════════
   * 【为什么它和 source 分开】
   * source 回答「分析的是哪张图」，generator 回答「用哪一版规则分析的」。
   * 两者都会让记录过期，但过期的理由完全不同：
   * 换了图要重跑那一张，改了 Prompt 要重跑全部。
   *
   * 【它修的是一个真实发生过的问题】
   * 之前 stale 只看 assetHash。改完 Vision Prompt 修掉一类幻觉之后，
   * 图没换，于是旧数据全部仍被判为 fresh —— 390 条里 387 条来自旧 Prompt、
   * 3 条来自新 Prompt，而系统认为一切正常。
   * 「这批是不是旧 Prompt 生成的」曾经只能靠人记住。现在靠这三个字段。
   * ══════════════════════════════════════════════════════
   */
  generator: {
    /** 人读的版本号，只进报告 */
    promptVersion: string
    /** System Prompt + User Prompt 模板 + 字段上限 + 全部 DECK_LOOK 的 sha256 */
    promptHash: string
    /** 与 VISUAL_SEMANTICS_VERSION 同值。与顶层 version 冗余，但让 generator 自洽可读 */
    schemaVersion: number
  }

  /** 生成元数据。只用于 QA 与排查，**绝不进入 Reading Prompt** */
  meta: {
    model: string
    generatedAt: string
    latencyMs: number
  }
}

/** 一条记录相对当前 Artwork 与当前 Prompt 的新鲜度 */
export type VisualFreshness =
  | 'fresh'
  | 'missing'
  /** 原画换过了 —— 只需重跑这一张 */
  | 'stale-asset'
  /** Vision Prompt 改过了 —— 全库都要重跑 */
  | 'stale-prompt'
  /** schema 升过版 */
  | 'stale-schema'
  /** 这条记录生成于「还没有版本追踪」的年代，根本无从判断它用的是哪一版规则 */
  | 'stale-untracked'

/**
 * fresh 必须**三项同时成立**：图没变、Prompt 没变、schema 没变。
 *
 * 任意一项不同就是 stale，必须重跑。判定顺序按「修起来最麻烦」排：
 * schema 变了要全量重跑，Prompt 变了要全量重跑，图变了只重跑那一张。
 *
 * 【放在这里而不是脚本里】QA 脚本、测试、生成器三处都要问同一个问题，
 * 分三处写迟早不同步 —— 而不同步的表现是「测试说全新鲜，生成器说该重跑」。
 */
export function freshnessOf(
  entry: Pick<DeckCardVisualSemantics, 'version' | 'source' | 'generator'> | undefined | null,
  current: { assetHash: string; promptHash: string },
): VisualFreshness {
  if (!entry) return 'missing'
  if (entry.version !== VISUAL_SEMANTICS_VERSION) return 'stale-schema'
  /* 没有 generator 块 = 版本追踪上线之前的数据。
     不能默认它「大概是当前版本」—— 那正是这次要消灭的那种「靠人记住」。 */
  if (!entry.generator) return 'stale-untracked'
  if (entry.generator.schemaVersion !== VISUAL_SEMANTICS_VERSION) return 'stale-schema'
  if (entry.generator.promptHash !== current.promptHash) return 'stale-prompt'
  if (entry.source.assetHash !== current.assetHash) return 'stale-asset'
  return 'fresh'
}

/**
 * Runtime 投影 —— 真正进入 Reading Prompt 的那一小部分。
 *
 * 【为什么不直接把整条塞进去】
 * 一条完整记录约 1.5–2KB，三张牌就是 6KB，Deep 模式五张牌更多；
 * 而 assetHash / model / latency / confidence 对解读没有任何用处，
 * 只会稀释模型注意力并推高 Prompt 体积。
 * 这里只留能改变解读措辞的六项，条数在 projectVisualEvidence 里按模式收口。
 */
export interface DeckVisualEvidence {
  scene: string
  keyObjects: string[]
  spatialRelations: string[]
  visualTensions: string[]
  emphasizedAspects: string[]
  deckSpecificMotifs: string[]
}

/** 一套牌组的全部视觉语义，按 cardId 索引 —— 查找是 O(1) */
export type DeckVisualSemanticsFile = {
  version: typeof VISUAL_SEMANTICS_VERSION
  deckId: DeckId
  cards: Record<string, DeckCardVisualSemantics>
}

/* ══════════════════════════════════════════════════════════════
 * Runtime 数据集 —— 真正被打进前端包的那一份
 *
 * 【为什么要两份文件】
 * 完整记录里有一多半字段（figures / foreground / background / palette /
 * lighting / composition / emotionalTone / softenedAspects / confidence / meta）
 * **在设计上就不允许进入 Reading Prompt** —— palette 尤其危险，把颜色递给
 * 模型等于邀请它做「暗=不好」的联想。
 *
 * Node 部署下这无所谓：rebuildContext 跑在服务端，数据不进浏览器。
 * 但 Streamlit 形态下 Prompt 在浏览器组装，整份数据集会被打进包 ——
 * 实测完整版让解读 chunk 从 32KB gzip 涨到 394KB，其中一半是永远送不到模型的字段。
 *
 * 所以拆成两份：
 *   <deck>.json          完整记录。真相源，进 git，供 QA / diff / 重新生成
 *   runtime/<deck>.json  只含能进 Prompt 的六项 + assetHash。由前者派生，进前端包
 *
 * 两份都由 `npm run visual:semantics` 同一次写出；
 * `npm run visual:check` 有一条断言会从完整记录重新推导一遍 runtime 并逐字段比对，
 * 所以它们不可能悄悄漂移。
 * ══════════════════════════════════════════════════════════ */

export interface DeckCardVisualRuntime extends DeckVisualEvidence {
  cardId: string
  /** 与 artwork.lock.json 对照用 —— 换图即 stale。这是唯一保留的非 Prompt 字段 */
  assetHash: string
}

export type DeckVisualRuntimeFile = {
  version: typeof VISUAL_SEMANTICS_VERSION
  deckId: DeckId
  cards: Record<string, DeckCardVisualRuntime>
}

/**
 * 完整记录 → runtime 记录。**生成器与漂移测试共用这一份**，
 * 分成两处写迟早不同步，而不同步的表现是「视觉证据悄悄少了几条」。
 */
export function toRuntimeRecord(entry: DeckCardVisualSemantics): DeckCardVisualRuntime {
  const dropped = uncertainCountItems(entry)
  const keep = (items: string[]) => items.filter((t) => !dropped.has(t))
  return {
    cardId: entry.cardId,
    assetHash: entry.source.assetHash,
    scene: entry.scene,
    /* 列表字段过滤掉「模型自己说数不清、却又写了个数」的条目。
       scene 不过滤 —— 它是整条记录的锚句，整句丢掉等于丢掉这张牌。
       scene 里的坏数字属于人工复核层的活（见 applyVisualReview）。 */
    keyObjects: keep(entry.keyObjects),
    spatialRelations: keep(entry.spatialRelations),
    visualTensions: keep(entry.visualTensions),
    emphasizedAspects: entry.semanticBridge.emphasizedAspects,
    deckSpecificMotifs: keep(entry.deckSpecificMotifs),
  }
}

/* ── 模型自陈的计数不确定 ────────────────────────────────────
 *
 * 【它只处理一种情况，刻意很窄】
 * 模型在 uncertainDetails 里写了「exact number of X …」，
 * 却又在 keyObjects 里写死「five X」—— 这是自相矛盾，
 * 而矛盾的那一半会以「证据」的身份进入 Reading Prompt。
 *
 * 这里按**模型自己的话**把那一条摘掉，不做任何猜测：
 * 只有当同一个名词既被标为数不清、又被写了具体数字时才生效。
 * 「数不清就别写数字」本来就是 Vision Prompt 的要求，这只是把它兜住。
 */
const COUNT_WORD = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve'
const COUNT_RE = new RegExp(`\\b(?:${COUNT_WORD})\\b`, 'i')

/**
 * 从 uncertainDetails 里抽出「真的数不清」的**中心词**。
 *
 * 两道收窄，都是被误伤逼出来的：
 *
 * 1. 只取 `of` 后紧接的那一个名词，不取整个从句。
 *    第一版取整句，「exact number of blossoms on the trees」把 trees 也标了，
 *    于是同一张牌里完全可靠的「two flowering trees」被删 ——
 *    不确定的是花的数量，不是树的数量。
 *
 * 2. 这句 uncertainDetails 里如果**自己已经给出了数字**
 *    （"exact count of swords is nine but the lowest blades are partly obscured"），
 *    那它是「数出来了，只是有点糊」，不是「数不清」。不算存疑。
 */
function flaggedCounts(uncertainDetails: string[]): string[] {
  const nouns: string[] = []
  for (const u of uncertainDetails) {
    /* 取 `of` 后最多两个词，优先其中的复数那个 ——
       「number of leafy shoots」的中心词是 shoots 不是 leafy，
       取错会让「two tall leafy wooden staves」这条可靠证据被误删。 */
    for (const m of u.matchAll(/\b(?:exact\s+)?(?:number|count)\s+of\s+([a-z'-]{3,24})(?:\s+([a-z'-]{3,24}))?/gi)) {
      if (COUNT_RE.test(u)) continue
      const words = [m[1], m[2]].filter((w): w is string => typeof w === 'string').map((w) => w.toLowerCase())
      const head = words.find((w) => /e?s$/.test(w) && w.length >= 5) ?? words[0] ?? ''
      const stem = head.replace(/e?s$/, '')
      if (stem.length >= 4) nouns.push(stem)
    }
  }
  return nouns
}

/** 这条文字是不是「给某个中心词写了紧挨着的具体数字」 */
function statesCountOf(text: string, noun: string): boolean {
  return new RegExp(`\\b(?:${COUNT_WORD})\\b(?:\\s+[a-z'-]+){0,3}\\s+${noun}e?s?\\b`, 'i').test(text)
}

/**
 * 挑出「模型自己说数不清、却又写了具体数字」的条目。
 *
 * 【为什么要求全条记录里只有一处】
 * 同一个名词出现在多条证据里时，uncertainDetails 那句话指的是哪一处
 * **无从判断**。实测两个误伤都出在这里：
 *   「exact number of swords in the carried bundle」→ 删掉了地上那两把明确可数的剑
 *   同一句 → 还删掉了牌面印刷标题「title text 'Eight of Swords'」
 * 只有唯一一处时，那句存疑才不可能指向别的东西。
 * 拿不准就不删 —— 删掉一条真实证据，比留下一个可疑数字更亏。
 */
function uncertainCountItems(entry: DeckCardVisualSemantics): Set<string> {
  const flagged = flaggedCounts(entry.confidence.uncertainDetails)
  if (flagged.length === 0) return new Set()
  const pool = [
    ...entry.keyObjects,
    ...entry.spatialRelations,
    ...entry.visualTensions,
    ...entry.deckSpecificMotifs,
  ]
  const drop = new Set<string>()
  for (const noun of flagged) {
    const hits = pool.filter((t) => statesCountOf(t, noun))
    if (hits.length === 1) drop.add(hits[0]!)
  }
  return drop
}

/* ══════════════════════════════════════════════════════════════
 * 人工复核层（Human Review & Override）
 *
 * 【为什么需要它，而不是继续重跑】
 * 有一类 Vision 错误是**稳定**的，不是噪声。实测 legacy-celestial/wands-06：
 * 画面里只有 4 支权杖，模型连跑 4 次、其中 3 次坚持写 "five"
 * —— 它在用牌名里的数字（Six of Wands = 5 支 + 骑手 1 支）代替数数。
 * 对这种错误无限 retry 是在赌运气，而且每次都要花 API 调用。
 *
 * 【为什么不直接改生成的 JSON】
 * 改了就再也分不清「模型看到的」与「人改过的」。而且下一次
 * `visual:semantics --force` 会静默把人工修正覆盖掉 —— 一次看不见的回归。
 * 所以生成数据保持模型原样，人工修正单独存一份，运行时合并。
 *
 * 【与模型 confidence 的分工，这条线不能混】
 * confidence      模型对自己看得准不准的判断 —— 由 Vision 写
 * reviewStatus    这张有没有经过人眼核对 —— 由人写
 * 一张 high 置信度的牌完全可能是错的（wands-06 就是 high），
 * 一张 medium 也完全可能是对的。两者互不替代。
 * ══════════════════════════════════════════════════════════ */

export type VisualReviewStatus =
  /** 没人看过。**不在 review 文件里的牌一律是这个状态** */
  | 'unreviewed'
  /** 人眼核对过，模型写的是对的 */
  | 'pass'
  /** 人眼核对过，发现错误并给出了修正 patch */
  | 'corrected'
  /** 人眼看过但自己也拿不准 —— 相关字段不进 Reading Prompt */
  | 'uncertain'

/** 人工可以覆盖的字段 = 会进 Reading Prompt 的那几个，其余没有覆盖的意义 */
export type VisualPatchableField = keyof DeckVisualEvidence

export interface VisualReviewEntry {
  reviewStatus: VisualReviewStatus
  /** ISO 日期。只进 QA 报告 */
  reviewedAt?: string
  /** 谁看的。只进 QA 报告 */
  reviewer?: string
  /** 为什么改 / 为什么存疑。**只进 QA 报告，绝不进 Reading Prompt** */
  reason?: string
  /**
   * 逐字替换。在 scene 与全部列表条目上做**精确子串**替换。
   *
   * 【为什么要有它，而不是只有整字段 patch】
   * 整字段 patch 要求人把模型写的其余条目原样抄一遍，
   * 而下一次重新生成之后那份抄写就过期了 —— 修正会悄悄把新证据盖掉。
   * 「five upright wands → four upright wands」这类改动只涉及一个词组，
   * 用替换表达既准确又能跨重生成存活。
   *
   * 不是正则，是精确子串 —— 人手写的规则必须可预测。
   * 匹配不上时不会静默失效：visual:qa 会把「不再生效的 override」报出来。
   */
  replace?: { find: string; with: string }[]
  /** 整字段覆盖。没列的字段保持模型原值 */
  patch?: Partial<Record<VisualPatchableField, string | string[]>>
  /** 人工判定不可靠的字段 —— 整个字段清空，不进 Prompt */
  uncertainFields?: VisualPatchableField[]
}

export interface VisualReviewFile {
  version: number
  entries: Record<string, VisualReviewEntry>
}

/** `deckId/cardId` —— review 文件的主键 */
export function reviewKey(deckId: string, cardId: string): string {
  return `${deckId}/${cardId}`
}

const PATCHABLE: readonly VisualPatchableField[] = [
  'scene',
  'keyObjects',
  'spatialRelations',
  'visualTensions',
  'emphasizedAspects',
  'deckSpecificMotifs',
]

/**
 * 生成记录 + 人工复核 → 运行时记录。
 *
 * 【合并顺序】生成值 → replace 逐字替换 → patch 整字段覆盖 → uncertainFields 清空。
 * 顺序是刻意的：人既可以先修正一个字段、又把另一个字段标为不可靠，
 * 两者互不干扰；同一个字段同时出现在两边时以「不可靠」为准 ——
 * 宁可少一条证据，也不要把自己都不确定的东西递给解读模型。
 *
 * 【这里做清洗，不信任手写 JSON】
 * review 文件是人手改的，可能写错类型、写成对象、写超长。
 * 它最终会进 Reading Prompt，所以和模型输出一样要过一遍清洗。
 *
 * **reason / reviewer / reviewedAt / reviewStatus 一个都不会进入返回值** ——
 * 它们是 QA 元数据，进 Prompt 等于告诉解读模型「这条是人改的」，毫无用处且干扰。
 */
export function applyVisualReview(
  entry: DeckCardVisualRuntime,
  review: VisualReviewEntry | undefined,
): DeckCardVisualRuntime {
  if (!review) return entry
  let out: DeckCardVisualRuntime = { ...entry }

  const cleanItem = (v: unknown): string =>
    typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, 240) : ''

  /* ① 逐字替换：作用于 scene 与全部列表条目 */
  const rules = (review.replace ?? []).filter((r) => typeof r?.find === 'string' && r.find.length > 0)
  if (rules.length > 0) {
    const sub = (t: string) => rules.reduce((acc, r) => acc.split(r.find).join(cleanItem(r.with)), t)
    out = {
      ...out,
      scene: sub(out.scene),
      keyObjects: out.keyObjects.map(sub),
      spatialRelations: out.spatialRelations.map(sub),
      visualTensions: out.visualTensions.map(sub),
      emphasizedAspects: out.emphasizedAspects.map(sub),
      deckSpecificMotifs: out.deckSpecificMotifs.map(sub),
    }
  }

  for (const field of PATCHABLE) {
    const raw = review.patch?.[field]
    if (raw === undefined) continue
    if (field === 'scene') {
      const s = cleanItem(raw)
      if (s) out.scene = s.slice(0, 400)
      continue
    }
    const list = (Array.isArray(raw) ? raw : [raw]).map(cleanItem).filter((s) => s.length > 0)
    out[field] = list
  }

  for (const field of review.uncertainFields ?? []) {
    if (!PATCHABLE.includes(field)) continue
    if (field === 'scene') out.scene = ''
    else out[field] = []
  }

  return out
}
