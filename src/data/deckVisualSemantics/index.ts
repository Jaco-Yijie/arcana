/**
 * 牌组视觉语义的运行期查找 —— **只读预生成数据，永不调用 Vision**。
 *
 * ══════════════════════════════════════════════════════════════
 * 【这里绝对不会发生的事】
 * 不请求任何 API、不读文件系统、不扫目录、不解析图片、不碰数据库。
 * 用户占卜时这一层做的全部事情是：两次对象取值。
 * Vision 只在 `npm run visual:semantics` 里出现，那是开发期批处理。
 *
 * 【为什么是静态 import 而不是动态】
 * Streamlit 形态下 Prompt 组装跑在浏览器里，而 `rebuildContext` 是同步函数。
 * 改成 async 会波及 Reading / Streamlit / 评测脚本三条调用链，
 * 为了一个可以直接测量的体积问题做这种改动不划算 —— 先量，再决定。
 * 实测五个 JSON 合计约 1.0MB raw / 190KB gzip，作为独立 chunk 由
 * rebuildContext 拉入；Node 与 Streamlit 拿到的是同一份数据（这是硬要求）。
 * 若将来 10 套牌组全部补齐原画导致体积翻倍，再考虑按牌组拆分动态加载。
 *
 * 【缺数据是正常状态，不是错误】
 * 某张牌没有视觉语义（生成失败、新素材还没跑、牌组没有原画）时返回 null，
 * 调用方跳过整个视觉段落。视觉层是 enhancement，不是 hard dependency。
 * ══════════════════════════════════════════════════════════════
 */

import type {
  DeckCardVisualRuntime,
  DeckVisualEvidence,
  DeckVisualRuntimeFile,
  VisualReviewEntry,
  VisualReviewFile,
  VisualReviewStatus,
} from '../../types/visualSemantics'
import { applyVisualReview, reviewKey } from '../../types/visualSemantics'

/* 这里 import 的是 runtime/ 下的**派生投影**，不是完整记录。
   完整记录（含 palette / composition / confidence / meta）留在上一层目录，
   只供 QA 与重新生成使用 —— 它们在设计上就不允许进入 Reading Prompt，
   打进前端包等于让解读 chunk 白白翻一倍。见 types/visualSemantics.ts 的说明。 */
import moonlight from './runtime/legacy-moonlight.json'
import classic from './runtime/legacy-classic.json'
import forest from './runtime/legacy-forest.json'
import celestial from './runtime/legacy-celestial.json'
import shadow from './runtime/legacy-shadow.json'

/* 人工复核层。**手写文件**，不是生成产物 —— 所以它住在 qa/ 而不是这里。
   体积极小（只有真正需要修正或存疑的牌才会有条目），随包发出去没有负担，
   而 Node 与 Streamlit 两种形态必须拿到同一份修正，这是硬要求。 */
import reviewFile from '../../../qa/visual-semantics/review.json'

/**
 * deckId → cardId → 记录。
 *
 * 两层普通对象，查找是两次哈希取值 —— O(1)，没有遍历、没有查找表构建开销。
 * 文件本身就是按 cardId 索引的，这里不需要任何预处理。
 */
const BY_DECK: Record<string, Record<string, DeckCardVisualRuntime>> = {
  'legacy-moonlight': (moonlight as unknown as DeckVisualRuntimeFile).cards,
  'legacy-classic': (classic as unknown as DeckVisualRuntimeFile).cards,
  'legacy-forest': (forest as unknown as DeckVisualRuntimeFile).cards,
  'legacy-celestial': (celestial as unknown as DeckVisualRuntimeFile).cards,
  'legacy-shadow': (shadow as unknown as DeckVisualRuntimeFile).cards,
}

const REVIEW: Record<string, VisualReviewEntry> =
  (reviewFile as unknown as VisualReviewFile).entries ?? {}

/**
 * 这张牌的人工复核状态。**只给 QA 用，运行时不读它** ——
 * 「这条有没有人看过」对解读没有任何意义，进 Prompt 只会干扰。
 */
export function getVisualReviewStatus(deckId: string, cardId: string): VisualReviewStatus {
  return REVIEW[reviewKey(deckId, cardId)]?.reviewStatus ?? 'unreviewed'
}

/** QA 用：全部人工复核条目 */
export function allVisualReviews(): Record<string, VisualReviewEntry> {
  return REVIEW
}

/**
 * 取一张牌在某副牌组下的视觉语义，**已合并人工修正**。
 *
 * ┌ 生成记录（模型原样，qa 之外任何人都不该手改）
 * ├ replace / patch      人工修正
 * └ uncertainFields      人工判定不可靠 → 清空
 *
 * **deckId 在这里只是一把钥匙。** 它不携带任何语义 ——
 * 没有任何一行代码会因为 deckId 叫 'legacy-shadow' 就让解读变暗。
 * 能影响解读的只有这把钥匙取出来的、来自真实原画的那条记录，
 * 以及人眼核对后按下的那几处修正。
 *
 * 没有复核条目时**原样返回生成记录** —— 绝大多数牌走的就是这条路。
 */
export function getDeckVisualSemantics(
  deckId: string | null | undefined,
  cardId: string,
): DeckCardVisualRuntime | null {
  if (!deckId) return null
  const generated = BY_DECK[deckId]?.[cardId]
  if (!generated) return null
  return applyVisualReview(generated, REVIEW[reviewKey(deckId, cardId)])
}

/** QA 用：未经人工合并的模型原始 runtime 记录。运行时不该用它 */
export function getGeneratedVisualSemantics(
  deckId: string | null | undefined,
  cardId: string,
): DeckCardVisualRuntime | null {
  if (!deckId) return null
  return BY_DECK[deckId]?.[cardId] ?? null
}

/**
 * 每张牌进入 Reading Prompt 的条数上限。
 *
 * standard 更紧：它的价值是让既有句子更具体，不是多出一段美术评论。
 * deep 放宽一点 —— 它本来就要看牌与牌之间的呼应，多一条空间关系有用。
 */
export const EVIDENCE_LIMITS = {
  standard: { keyObjects: 3, spatialRelations: 2, visualTensions: 1, emphasizedAspects: 2, deckSpecificMotifs: 1 },
  deep: { keyObjects: 5, spatialRelations: 3, visualTensions: 2, emphasizedAspects: 3, deckSpecificMotifs: 2 },
} as const

/** 单条证据的字数上限。个别条目会写得很长，截断比整条丢掉好 */
const MAX_ITEM_CHARS = 150

/**
 * 「印刷家具」而不是画面内容的母题。
 *
 * 边框、做旧颗粒、题字、罗马数字这些东西在**同一副牌的 78 张上完全相同**，
 * 对「这张牌画了什么」零信息量，却每张牌都要占掉一条 deckSpecificMotifs
 * 和几十个 token。数据集里保留它们（它们确实是这副牌的视觉特征），
 * 但不送进 Reading Prompt。
 */
const PRINT_FURNITURE =
  /\b(?:border|frame|framing|grain|vignette|typograph|lettering|caption|title|roman numeral|serif|parchment edge|card stock)\b/i

/**
 * 完整记录 → 进 Prompt 的那一小块。
 *
 * assetHash / model / latency / confidence / palette / lighting 一律不带：
 * 它们对解读没有作用，只会推高 Prompt 体积并稀释注意力。
 * palette 尤其危险 —— 把颜色递给模型等于邀请它做「暗=不好」的联想，
 * 而那是这一层明令禁止的推理。
 */
export function projectVisualEvidence(
  entry: DeckCardVisualRuntime | null,
  mode: 'standard' | 'deep' = 'standard',
): DeckVisualEvidence | null {
  if (!entry) return null
  const lim = EVIDENCE_LIMITS[mode]
  const take = (items: string[], n: number) => items.slice(0, n).map((t) => (t.length > MAX_ITEM_CHARS ? `${t.slice(0, MAX_ITEM_CHARS)}…` : t))
  const evidence: DeckVisualEvidence = {
    scene: entry.scene.length > 260 ? `${entry.scene.slice(0, 260)}…` : entry.scene,
    keyObjects: take(entry.keyObjects, lim.keyObjects),
    spatialRelations: take(entry.spatialRelations, lim.spatialRelations),
    visualTensions: take(entry.visualTensions, lim.visualTensions),
    emphasizedAspects: take(entry.emphasizedAspects, lim.emphasizedAspects),
    /* 先滤掉印刷家具再截断 —— 否则唯一的名额可能被「做旧边框」占掉 */
    deckSpecificMotifs: take(entry.deckSpecificMotifs.filter((m) => !PRINT_FURNITURE.test(m)), lim.deckSpecificMotifs),
  }
  /* 一条可见证据都没有的记录不值得占 Prompt 位置 */
  if (!evidence.scene && evidence.keyObjects.length === 0) return null
  return evidence
}

/** QA 用：这副牌组一共有多少条视觉语义。运行时用不到 */
export function visualSemanticsCoverage(): Record<string, number> {
  return Object.fromEntries(Object.entries(BY_DECK).map(([k, v]) => [k, Object.keys(v).length]))
}

/** QA 用：遍历全部 runtime 记录。完整记录见 loadFullVisualSemantics（只在 Node 下可用） */
export function allVisualSemantics(): DeckCardVisualRuntime[] {
  return Object.values(BY_DECK).flatMap((cards) => Object.values(cards))
}
