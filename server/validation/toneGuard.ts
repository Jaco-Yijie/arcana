/**
 * 语气红线运行时校验（Tone Guard）—— 见 docs/v2/10-product-scope.md AC-V2-08 / GV2-12
 *
 * 【为什么不复用 V1 的 FORBIDDEN_PHRASES】
 * V1 的禁语表是一串**裸子串**（含 `'一定'`、`'必须'`、`'绝对'`），
 * 它在 V1 能用，是因为 V1 的文案是我们自己写的、可穷举、可人工确认。
 * V2 的文本来自模型，不可穷举，而裸子串检索会把下面这些**我们恰恰要求模型使用**的表达判成违规：
 *
 *     「这不一定意味着…」「说不定…」「你不必现在就决定」「并非绝对」
 *     「未必一定会这样」「没有什么是注定的」「在一定程度上」
 *
 * 这些都是克制、留有余地的说法——正是本轮想要的语感。
 * **误杀好文本比漏掉一处坏文本更糟**：漏掉一处，用户读到一个稍硬的词；
 * 误杀一次，整份合格解读被判违规、重试、最终降级成 Mock，用户拿不到真解读。
 * 因此本文件的所有取舍都偏向「放行」。
 *
 * 【实现要点】
 * 1. 自建 V2 规则集，不 import V1 的 `FORBIDDEN_PHRASES`
 * 2. 每条规则带**否定语境识别**：命中词之前若存在否定表达，则不算违规
 * 3. 正则 + 前后文窗口，输出命中的字段路径与上下文片段，便于排查
 * 4. 覆盖两类：① 确定性 / 宿命论  ② 空洞玄学
 *
 * 【不扫描哪些字段，以及为什么】
 * - `cards[].cardName` / `cards[].position`：这是**输入回填字段**，内容由我们自己的牌库决定。
 *   「命运之轮」是一张真实存在的大阿卡纳，它的名字里就有「命运」——扫描它等于自己踩自己的红线。
 * - `safetyNotice`：由服务端本地 `safety.ts` 生成并覆盖，不是模型产出，不该被模型的红线校验拦下。
 * - `version` / `meta`：非文本字段。
 *
 * 依赖：无第三方依赖，只从 `../../src/types/reading.ts` 做类型导入。
 */

import type { StructuredReading } from '../../src/types/reading.ts'

/* ═══════════════════════════════════════════════════════════════════
 * 一、对外类型
 * ═══════════════════════════════════════════════════════════════ */

/** 违规类别 */
export type ToneRuleKind =
  /** 确定性 / 宿命论 */
  | 'determinism'
  /** 空洞玄学 */
  | 'mysticism'

export interface ToneViolation {
  /** 命中的原文片段（真实匹配到的字，不是规则名） */
  phrase: string
  /** 字段路径，例如 `narrative`、`cards[2].interpretation` */
  field: string
  /** 上下文片段，命中部分用【】标出，便于人眼定位 */
  excerpt: string
  /** 命中的规则 id，便于统计「哪条规则最常被触发」 */
  ruleId: string
  /** 违规类别 */
  kind: ToneRuleKind
  /** 命中位置在该字段文本中的起始下标 */
  index: number
}

/* ═══════════════════════════════════════════════════════════════════
 * 二、否定语境识别
 *
 * 两层判断，都只看**命中词之前**的文本（否定词几乎总在被否定词之前）：
 *
 *   Tier A「紧邻否定」：命中词前 4 个字以内，紧贴着结束的否定表达。
 *       例：不|一定  并非|绝对  未必|必然  这不是|注定
 *
 *   Tier B「近距否定」：命中词前 6 个字的窗口里**出现**否定标记。
 *       例：「没有什么是注定的」——「没」离「注定」有 4 个字，Tier A 够不着，Tier B 能兜住。
 *
 * Tier B 只对 `strict` 规则开放（确定性词汇，子串碰撞风险高）。
 * `lexical` 规则（宇宙 / 命运 / 天意 这类空洞玄学词）只走 Tier A：
 * 这些词本来就不该出现，放行范围收窄到「不是命运」「不谈命运」这类明确否定即可。
 *
 * Tier B 的标记集**刻意不含「无」和裸「非」**。
 * 原因：「毫无疑问一定会」里的「无」会把后面的「一定」误判成被否定 ——
 * 那是真违规却被放行，属于我们不能接受的漏检方向。
 * 「无需 / 无须 / 无关」这类真否定仍然由 Tier A 覆盖。
 * ═══════════════════════════════════════════════════════════════ */

const ANCHOR_WINDOW = 4
const CONTAINS_WINDOW = 6

/** Tier A：必须紧贴命中词结束（正则以 `$` 锚定窗口尾部） */
const ANCHORED_NEGATION =
  /(?:不|不是|并不是|不算|不谈|不等于|不涉及|不见得|不必|不太|没|没有|未|未必|非|并非|绝非|别|无需|无须|无关|毋须|说不|谈不上|算不上|难以|从不|从未|绝不|少有|鲜有)$/

/** Tier B：出现在窗口内即可 */
const CONTAINS_NEGATION = /不|没|未必|并非|别|毋|莫|难以|绝非|从未|谈不上|算不上/

/**
 * 否定敏感度。`strict` 走 Tier A + Tier B；`lexical` 只走 Tier A。
 *
 * 【为什么玄学类规则也必须用 strict】
 * 我们的 System Prompt 明确要求模型采取反宿命论表述，模型于是会写出
 * 「牌更像一道推理题，而不是一段**命运**的预告」这种句子 —— 否定词与命中词
 * 中间隔着「一段」，只看紧邻窗口就会把它误判成违规。
 * 那等于自己惩罚自己要求的输出，代价是白白丢掉一份真实解读。
 * 否定词表刻意不含「无」，所以放宽到 Tier B 不会让「毫无疑问」蒙混过关。
 */
type NegationMode = 'strict' | 'lexical'

function isNegated(text: string, matchStart: number, mode: NegationMode): boolean {
  const anchorWindow = text.slice(Math.max(0, matchStart - ANCHOR_WINDOW), matchStart)
  if (ANCHORED_NEGATION.test(anchorWindow)) return true

  if (mode === 'lexical') return false

  const nearWindow = text.slice(Math.max(0, matchStart - CONTAINS_WINDOW), matchStart)
  return CONTAINS_NEGATION.test(nearWindow)
}

/* ═══════════════════════════════════════════════════════════════════
 * 三、V2 规则集
 * ═══════════════════════════════════════════════════════════════ */

interface ToneRule {
  id: string
  kind: ToneRuleKind
  /** 给人看的规则名，出现在重试提示里 */
  label: string
  /** 必须带 `g`（用 matchAll 遍历；matchAll 内部会复制正则，不污染 lastIndex） */
  pattern: RegExp
  negation: NegationMode
}

/**
 * 正则里的负向前瞻都是**为了避免误杀真实存在的合法表达**，每一条都有具体来由：
 *
 * - `一定(?!程度|范围|条件|...)`：「在一定程度上」「一定范围内」是标准的**限定语**，
 *   语义与「一定会」完全相反，是我们鼓励的克制说法。
 * - `命运(?!之轮)`：「命运之轮」是大阿卡纳第 10 号牌的正式中文名，必须放行。
 * - `肯定(?=会|能|是|要|有|可以|不)`：「值得肯定」「肯定他的努力」是褒义动词，不是断言。
 * - `保证(?=会|能|你)`：「保证质量」之类不该拦，只拦「保证会…」这种承诺式断言。
 */
export const TONE_RULES: ToneRule[] = [
  /* ---------------- ① 确定性 / 宿命论 ---------------- */
  {
    id: 'certainty-yiding',
    kind: 'determinism',
    label: '一定 / 一定会',
    pattern: /一定(?!程度|范围|条件|规律|阶段|时期|数量|基础|意义上|的距离|的空间|的余地)/g,
    negation: 'strict',
  },
  {
    id: 'certainty-biran',
    kind: 'determinism',
    label: '必然 / 必定 / 势必 / 注定 / 终将',
    pattern: /必然|必定|势必|注定|终将|铁定/g,
    negation: 'strict',
  },
  {
    id: 'certainty-bixu',
    kind: 'determinism',
    label: '必须（替用户做决定）',
    pattern: /必须/g,
    negation: 'strict',
  },
  {
    id: 'certainty-juedui',
    kind: 'determinism',
    label: '绝对',
    pattern: /绝对/g,
    negation: 'strict',
  },
  {
    id: 'certainty-kending',
    kind: 'determinism',
    label: '肯定会 / 肯定能',
    pattern: /肯定(?=会|能|是|要|有|可以|不)/g,
    negation: 'strict',
  },
  {
    id: 'certainty-no-doubt',
    kind: 'determinism',
    label: '毫无疑问 / 百分之百 / 板上钉钉',
    pattern: /毫无疑问|毋庸置疑|百分之百|板上钉钉|铁板钉钉/g,
    negation: 'strict',
  },
  {
    id: 'certainty-irreversible',
    kind: 'determinism',
    label: '不可避免 / 无法改变 / 已成定局',
    pattern: /不可避免|无法避免|无法改变|无法逆转|已成定局|结局已定|木已成舟|覆水难收/g,
    negation: 'strict',
  },
  {
    id: 'certainty-assert',
    kind: 'determinism',
    label: '断定 / 下定论 / 完全确定',
    pattern: /断定|下定论|完全确定|确定无疑/g,
    negation: 'strict',
  },
  {
    id: 'certainty-guarantee',
    kind: 'determinism',
    label: '保证会 / 保证能',
    pattern: /保证(?=会|能|你)/g,
    negation: 'strict',
  },
  {
    id: 'certainty-sooner-or-later',
    kind: 'determinism',
    label: '迟早会 / 早晚会',
    pattern: /迟早会|迟早都|早晚会|早晚都会/g,
    negation: 'strict',
  },

  /* ---------------- ② 空洞玄学 ---------------- */
  {
    id: 'mystic-universe',
    kind: 'mysticism',
    label: '宇宙',
    pattern: /宇宙/g,
    negation: 'strict',
  },
  {
    id: 'mystic-fate',
    kind: 'mysticism',
    label: '命运（「命运之轮」除外）',
    pattern: /命运(?!之轮)/g,
    negation: 'strict',
  },
  {
    id: 'mystic-destiny',
    kind: 'mysticism',
    label: '天意 / 天机 / 宿命 / 冥冥之中 / 业力',
    pattern: /天意|天机|宿命|冥冥之中|因果业力|业力|轮回/g,
    negation: 'strict',
  },
  {
    id: 'mystic-heaven',
    kind: 'mysticism',
    label: '上天 / 老天 / 神谕 / 旨意',
    pattern: /上天|老天|上苍|神谕|旨意/g,
    negation: 'strict',
  },
  {
    id: 'mystic-energy-speaks',
    kind: 'mysticism',
    label: '能量告诉你 / 能量指引',
    pattern: /能量(?:告诉|指引|指示|暗示|驱使|驱动|在说|说)/g,
    negation: 'strict',
  },
  {
    id: 'mystic-field',
    kind: 'mysticism',
    label: '气场 / 磁场 / 振动频率 / 吸引力法则',
    pattern: /气场|磁场|能量场|高维|振动频率|吸引力法则/g,
    negation: 'strict',
  },
  {
    id: 'mystic-card-authority',
    kind: 'mysticism',
    label: '牌绝对说明 / 牌无疑指出（把牌说成不可质疑的权威）',
    // 刻意不含「一定」「必然」：它们由 ① 组的 certainty-* 规则以 determinism 类别报出，
    // 放在这里会因为跨度更长而在去重时吃掉那条，导致「这张牌一定会…」被误归为空洞玄学。
    pattern: /(?:牌面?|塔罗|这张牌|这组牌|这几张牌)(?:绝对|无疑|确凿|明确无误)/g,
    negation: 'strict',
  },
]

/* ═══════════════════════════════════════════════════════════════════
 * 四、字段遍历
 * ═══════════════════════════════════════════════════════════════ */

export interface ToneTextField {
  field: string
  text: string
}

/**
 * 收集 `StructuredReading` 中**由模型产出**的全部文本字段。
 *
 * 顺序按用户在页面上的阅读顺序排列，重试提示里的报错顺序因此也更容易对照。
 * 关于哪些字段被刻意排除、为什么排除，见文件头注释。
 */
export function collectTextFields(reading: StructuredReading): ToneTextField[] {
  const fields: ToneTextField[] = [
    { field: 'readingTheme', text: reading.readingTheme },
    { field: 'overallEnergy', text: reading.overallEnergy },
  ]

  reading.cards.forEach((card, i) => {
    fields.push({ field: `cards[${i}].interpretation`, text: card.interpretation })
    fields.push({ field: `cards[${i}].connectionToQuestion`, text: card.connectionToQuestion })
  })

  reading.relationships.forEach((relationship, i) => {
    fields.push({ field: `relationships[${i}].interpretation`, text: relationship.interpretation })
  })

  fields.push({ field: 'narrative', text: reading.narrative })
  fields.push({ field: 'answerToQuestion', text: reading.answerToQuestion })

  reading.reflectionQuestions.forEach((question, i) => {
    fields.push({ field: `reflectionQuestions[${i}]`, text: question })
  })

  return fields.filter((f) => typeof f.text === 'string' && f.text.length > 0)
}

/* ═══════════════════════════════════════════════════════════════════
 * 五、主入口
 * ═══════════════════════════════════════════════════════════════ */

const EXCERPT_PADDING = 14

function buildExcerpt(text: string, start: number, end: number): string {
  const left = Math.max(0, start - EXCERPT_PADDING)
  const right = Math.min(text.length, end + EXCERPT_PADDING)
  const prefix = left > 0 ? '…' : ''
  const suffix = right < text.length ? '…' : ''
  return `${prefix}${text.slice(left, start)}【${text.slice(start, end)}】${text.slice(end, right)}${suffix}`
}

/** 扫描单段文本。导出便于对任意片段做单点排查。 */
export function checkText(field: string, text: string): ToneViolation[] {
  const hits: ToneViolation[] = []

  for (const rule of TONE_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      const start = match.index
      if (typeof start !== 'number') continue
      if (isNegated(text, start, rule.negation)) continue

      hits.push({
        phrase: match[0],
        field,
        excerpt: buildExcerpt(text, start, start + match[0].length),
        ruleId: rule.id,
        kind: rule.kind,
        index: start,
      })
    }
  }

  return dedupeOverlaps(hits)
}

/**
 * 去掉被其他命中完全包含的条目。
 *
 * 例：「牌绝对说明」会同时命中 `mystic-card-authority`（牌绝对）与 `certainty-juedui`（绝对）。
 * 报两条不算错，但重试提示里出现重复片段会让模型以为有两处独立问题。只保留更长的那条。
 */
function dedupeOverlaps(hits: ToneViolation[]): ToneViolation[] {
  const sorted = [...hits].sort((a, b) => a.index - b.index || b.phrase.length - a.phrase.length)

  return sorted.filter((hit, i) =>
    !sorted.some((other, j) => {
      if (i === j) return false
      const otherEnd = other.index + other.phrase.length
      const hitEnd = hit.index + hit.phrase.length
      const contained = other.index <= hit.index && hitEnd <= otherEnd
      // 完全相同的区间只淘汰后出现的那个，避免两条互相淘汰
      const isSameSpan = other.index === hit.index && otherEnd === hitEnd
      return contained && (!isSameSpan || j < i)
    }),
  )
}

/**
 * 校验一份解读的全部模型产出文本。
 *
 * 返回空数组 = 通过。非空 = 命中红线，调用方应按 AC-V2-08 处理：
 * 把 `summarizeViolations()` 的结果追加到 Prompt 重试一次，仍命中则降级 Mock。
 */
export function checkTone(reading: StructuredReading): ToneViolation[] {
  return collectTextFields(reading).flatMap(({ field, text }) => checkText(field, text))
}

/* ═══════════════════════════════════════════════════════════════════
 * 六、重试提示
 * ═══════════════════════════════════════════════════════════════ */

const KIND_LABEL: Record<ToneRuleKind, string> = {
  determinism: '确定性 / 宿命论表述',
  mysticism: '空洞玄学表述',
}

/**
 * 把违规列表整理成一段可直接追加到 User Prompt 末尾的中文说明。
 *
 * 三个刻意的设计：
 * 1. 给出**具体片段**而不只是词表——模型改一个它能看见的句子，比改一条抽象规则准得多
 * 2. 明确要求「改写整句」而不是「删掉这个词」——删词往往留下语义仍然确定的残句
 * 3. 重申牌面回填约束——防止模型借这次修改顺手改动 cards[]，那会直接撞上 AC-V2-10
 */
export function summarizeViolations(v: ToneViolation[]): string {
  if (v.length === 0) return ''

  const lines: string[] = [
    '# 上一次输出未通过语言红线校验，请修正后重新输出',
    '',
    `共命中 ${v.length} 处禁止使用的表达。以下是每一处的字段与上下文（命中部分用【】标出）：`,
    '',
  ]

  v.forEach((hit, i) => {
    lines.push(
      `${i + 1}. 字段 \`${hit.field}\` 命中「${hit.phrase}」` +
        `（${KIND_LABEL[hit.kind]}，规则 ${hit.ruleId}）：${hit.excerpt}`,
    )
  })

  lines.push('')
  lines.push('修正要求：')
  lines.push('- **不要只是把这些词删掉**，要把整句改写成保留性、可证伪的表述；删词往往留下语义依然确定的残句。')
  lines.push(
    '- 优先使用这些句式：「这组牌更倾向于…」「如果把这几张牌联系起来看…」' +
      '「这里值得注意的是…」「在你当前的问题背景下…」「它描述的更像是一种状态，而不是一个即将发生的事件。」',
  )
  lines.push('- 描述的是**当前状态与倾向**，不是将要发生的事件；判断权留给用户。')
  lines.push(
    '- **牌面不得改动**：`cards` 的数量、顺序、`cardId`、`orientation` 必须与输入完全一致，' +
      '不要借这次修改替换牌、增删牌或改变正逆位。',
  )
  lines.push('- 其余未被指出的内容如果本来就合格，可以保留原样。')
  lines.push('- 仍然只输出一个 json 对象，不要代码块围栏，不要任何多余文字。')

  return lines.join('\n')
}

/* ═══════════════════════════════════════════════════════════════════
 * 七、自测用例（供 QA 与后续改规则时对照）
 *
 * 改动 TONE_RULES 或否定识别之后，至少要保证下面两组结论不变。
 *
 * 【必须判为违规】
 *   1. 「这件事一定会朝着你希望的方向发展。」        → certainty-yiding
 *   2. 「这个结果是注定的，你改变不了。」            → certainty-biran
 *   3. 「你必须现在就做出决定。」                    → certainty-bixu
 *   4. 「牌绝对说明他还在意你。」                    → mystic-card-authority（含 certainty-juedui，去重后留长的）
 *   5. 「宇宙已经为你安排好了这一切。」              → mystic-universe
 *   6. 「这是命运给你的信号。」                      → mystic-fate
 *   7. 「能量告诉你，该放手了。」                    → mystic-energy-speaks
 *   8. 「毫无疑问，这段关系一定会结束。」            → certainty-no-doubt + certainty-yiding
 *      （注意：「毫无疑问」里的「无」不得让后面的「一定」被放行——Tier B 刻意不含「无」）
 *   9. 「这个局面已成定局，无法改变。」              → certainty-irreversible ×2
 *  10. 「按照天意，你迟早会回到原点。」              → mystic-destiny + certainty-sooner-or-later
 *
 * 【必须放行（V1 裸子串会误杀，V2 不许误杀）】
 *   1. 「这不一定意味着关系会结束。」                ← 不|一定
 *   2. 「说不定过几天你就想清楚了。」                ← 不含任何规则词
 *   3. 「你不必现在就给出答案。」                    ← 「不必」不含「必须」
 *   4. 「这组牌并非绝对，只是一个观察角度。」        ← 并非|绝对
 *   5. 「未必一定会这样，牌面留有余地。」            ← 未必|一定
 *   6. 「没有什么是注定的，你随时可以改写它。」      ← Tier B：「没」在「注定」前 6 字内
 *   7. 「在一定程度上，你已经做出了选择。」          ← 负向前瞻放行「一定程度」
 *   8. 「命运之轮出现在「现在」这一格。」            ← 负向前瞻放行牌名
 *   9. 「他的努力值得肯定。」                        ← 「肯定」后不接 会/能/是…
 *  10. 「这不是命运的安排，而是一连串具体选择的结果。」← Tier A：「不是」紧邻「命运」
 *  11. 「这里没有绝对的对错。」                      ← Tier B：「没」在窗口内
 *  12. 「它描述的更像是一种状态，而不是一个即将发生的事件。」← 无规则词
 * ═══════════════════════════════════════════════════════════════ */
