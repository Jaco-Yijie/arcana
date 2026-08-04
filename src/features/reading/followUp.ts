/**
 * 后续追问（Follow-up）—— 见 docs/00-brief.md §13、docs/01-product-spec.md AC-12 / G-13
 *
 * 【这里不接真实 LLM】所有回答都由本次抽牌的数据 + 规则式模板组合而成。
 *
 * 【Context 受限是类型级的硬约束】
 * `FollowUpContext` 只允许携带：当前问题、牌阵、卡牌 + 正逆位、当前 Reading。
 * 类型上就不给「历史日记 / 过往 Session / 用户画像」留任何字段，
 * 因此即使调用方想传，也传不进来（AC-12 / G-13）。
 *
 * 与本次抽牌无关的追问，一律礼貌地拉回本次抽牌语境——本模块不是通用 Chatbot。
 */

import type { Orientation } from '@/types/tarot'
import type { SpreadId } from '@/types/spread'
import type { Reading } from '@/types/session'
import { getCard } from '@/data/deck'
import { getSpread } from '@/data/spreads'
import { detectRisk } from './safety'

/** 追问时可用的全部上下文——**不得再扩展任何字段** */
export interface FollowUpContext {
  /** 本次抽牌采用的问题（随缘模式可为空串） */
  readonly question: string
  readonly spreadId: SpreadId
  /** 本次牌阵上的牌，顺序即牌位顺序 */
  readonly cards: ReadonlyArray<{
    readonly positionId: string
    readonly cardId: string
    readonly orientation: Orientation
  }>
  /** 当前这一次的 Reading */
  readonly reading: Reading
}

const ORIENTATION_LABEL: Record<Orientation, string> = {
  upright: '正位',
  reversed: '逆位',
}

type DomainKey = 'love' | 'career' | 'study' | 'finance'

const DOMAIN_KEYWORDS: Record<DomainKey, string[]> = {
  love: ['感情', '爱情', '恋爱', '喜欢', '对象', '伴侣', '暧昧', '复合', '分手', 'relationship', 'love'],
  career: ['事业', '工作', '职业', '公司', '老板', '同事', '跳槽', '项目', '升职', 'career', 'job'],
  study: ['学业', '学习', '考试', '成绩', '读书', '课程', '论文', '升学', 'study', 'exam'],
  finance: ['财务', '钱', '收入', '存款', '投资', '理财', '花销', '预算', 'money', 'finance'],
}

const DOMAIN_LABEL: Record<DomainKey, string> = {
  love: '感情',
  career: '事业',
  study: '学业',
  finance: '财务',
}

/** 与本次抽牌明显无关的通用请求特征 */
const OFF_TOPIC_PATTERNS = [
  /写(一段)?(代码|程序|脚本|函数|sql)/iu,
  /(翻译|润色|改写)(一下)?(这段|以下)/u,
  /(帮我|替我)(写|做|生成)(一篇|一份|一个)?(作文|报告|方案|简历|邮件|文案)/u,
  /(天气|股票代码|汇率|新闻|菜谱|食谱)/u,
  /(你是谁|你用的什么模型|你是不是ai|你是ai吗|chatgpt|gpt)/iu,
  /(数学题|算一下\d)/u,
]

/**
 * 生成一条追问的 Mock 回答。
 * @param question 用户的追问
 * @param context 严格受限的本次抽牌上下文
 */
export function answerFollowUp(question: string, context: FollowUpContext): string {
  const raw = question.trim()
  if (raw.length === 0) {
    return '你可以问得更具体一点，比如某张牌为什么会落在那个位置、两张牌之间是什么关系，或者你更想聚焦在哪个方面。'
  }

  const entries = context.cards.map((c) => {
    const card = getCard(c.cardId)
    const spread = getSpread(context.spreadId)
    const position = spread.positions.find((p) => p.id === c.positionId) ?? spread.positions[0]!
    const up = c.orientation === 'upright'
    return {
      card,
      position,
      up,
      title: `${ORIENTATION_LABEL[c.orientation]}的${card.nameZh}`,
      meaning: up ? card.meaningUpright : card.meaningReversed,
      advice: up ? card.advice.upright : card.advice.reversed,
      keywords: up ? card.keywordsUpright : card.keywordsReversed,
    }
  })

  // 0. 高风险话题优先处理
  const risk = detectRisk(raw)
  if (risk.notice) {
    return `${risk.notice}\n\n回到这次的牌：${entries[0]!.position.label}位上的${entries[0]!.title}提示的是${entries[0]!.keywords.slice(0, 3).join('、')}。如果你愿意，我们可以从这一格开始，把你的想法一点点排开。`
  }

  // 1. 与本次抽牌无关 —— 拉回语境，不做通用助手
  if (isOffTopic(raw)) {
    return `这个问题超出了这次抽牌能谈的范围——我只看得到你这次的问题、牌阵和翻开的这 ${entries.length} 张牌。\n\n如果想继续，我们可以聊聊：${entries.map((e) => `「${e.position.label}」的${e.card.nameZh}`).join('、')}，或者你希望我把重点放在哪个方面。`
  }

  // 2. 问某两张牌之间的关系
  //    用户既可能报牌名/牌位名，也可能用序号（「第二张」「中间那张」「最后一张」）。
  //    序号必须能解析 —— 解析不出来就落到兜底，而兜底一旦笃定地指认某一张牌，
  //    就会变成「自信地答错」，比答不出更糟。
  const byName = entries.filter((e) => raw.includes(e.card.nameZh) || raw.includes(e.position.label))
  const byOrdinal = resolveOrdinals(raw, entries.length).map((i) => entries[i]!)
  const picked = new Set([...byName, ...byOrdinal])
  // 按牌阵顺序排列，保证「第二张和第三张」读出来的先后与桌面一致
  const mentioned = entries.filter((e) => picked.has(e))
  if (mentioned.length >= 2 && /(关系|一起|之间|对比|结合|冲突|矛盾)/u.test(raw)) {
    const [a, b] = [mentioned[0]!, mentioned[1]!]
    const sameDirection = a.up === b.up
    return `把「${a.position.label}」的${a.title}和「${b.position.label}」的${b.title}放在一起看：\n\n${a.card.nameZh}在这里谈的是${a.keywords.slice(0, 3).join('、')}，${b.card.nameZh}谈的是${b.keywords.slice(0, 3).join('、')}。${
      sameDirection
        ? '两张牌的朝向一致，可以把它们读成同一条线上的前后两段——前一格在描述条件，后一格在描述这些条件带来的结果。'
        : '一正一逆的组合，通常提示这两格之间存在落差：一边在往前，一边还没跟上。这个落差本身，往往就是这次值得看的地方。'
    }\n\n如果按当前状态继续发展，${b.advice}`
  }

  // 3. 请求再解释某一张牌
  if (mentioned.length >= 1) {
    const e = mentioned[0]!
    return `再看一次「${e.position.label}」上的${e.title}。\n\n这个牌位代表${e.position.meaning}${e.meaning}\n\n换一种说法：可以把这张牌理解为一种提醒——${e.advice}它描述的是一种当前的状态，不是一个已经写好的结果。\n\n关键词：${e.keywords.join(' · ')}。`
  }

  // 4. 聚焦某个生活领域
  const domain = detectDomain(raw)
  if (domain) {
    const lines = entries.map((e) => {
      const text = e.up ? e.card[domain].upright : e.card[domain].reversed
      return `· 「${e.position.label}」${e.title}：${text}`
    })
    return `如果把这次的牌全部收到「${DOMAIN_LABEL[domain]}」这个方向上看：\n\n${lines.join('\n')}\n\n目前值得关注的是：${entries[0]!.advice}这些只是从牌面延伸出来的一种理解，你自己的实际感受仍然更重要。`
  }

  // 5. 下一步该注意什么 / 该怎么做
  if (/(下一步|接下来|怎么做|该做什么|注意|建议|行动)/u.test(raw)) {
    const watch = context.reading.watchOut[0] ?? '先把你能控制的那一部分单独列出来。'
    return `就这次的牌面来说，接下来可以先关注这几点：\n\n${entries
      .slice(0, 3)
      .map((e) => `· 从「${e.position.label}」入手：${e.advice}`)
      .join('\n')}\n\n${watch}\n\n这些都是可以考虑的方向，采不采用由你决定。`
  }

  // 6. 兜底：**不指认任何一张牌**，把桌面摊给用户看，请他自己指方向。
  //    在没听懂的时候硬挑第一张来解释，会让人以为系统答的是他问的那张。
  return `这个追问我可以从这次的牌面来谈，但需要你再指一下方向。\n\n现在桌上是：${entries
    .map((e) => `「${e.position.label}」的${e.title}`)
    .join('、')}。\n\n${context.reading.headline[0] ?? ''}\n\n你想聚焦哪一张、哪个牌位，还是想让我从感情、事业、学业、财务里挑一个方面来看？`
}

/** 中文数字 → 阿拉伯数字（只需要覆盖牌阵最大 5 张的范围，留到十以备扩展） */
const CN_NUMERALS: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
}

/**
 * 把「第二张」「第 3 个」「中间那张」「最后一张」解析成牌位下标。
 * 负向断言排除「第一次」「第二天」这类与牌无关的序数用法。
 */
function resolveOrdinals(text: string, count: number): number[] {
  const found = new Set<number>()
  const re = /第\s*([0-9]+|[一二两三四五六七八九十])\s*(?:张|个|格|位)?(?!次|天|年|步|轮|遍|回|阶段)/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const token = match[1]!
    const n = /^[0-9]+$/.test(token) ? Number(token) : CN_NUMERALS[token]
    if (n && n >= 1 && n <= count) found.add(n - 1)
  }
  if (/(最后|末尾|最右|最后面)/u.test(text)) found.add(count - 1)
  if (/(最左|最前面|开头那)/u.test(text)) found.add(0)
  if (count >= 3 && /(中间|中央)/u.test(text)) found.add(Math.floor((count - 1) / 2))
  return [...found].sort((a, b) => a - b)
}

function isOffTopic(text: string): boolean {
  return OFF_TOPIC_PATTERNS.some((p) => p.test(text))
}

function detectDomain(text: string): DomainKey | null {
  const lower = text.toLowerCase()
  const domains: DomainKey[] = ['love', 'career', 'study', 'finance']
  for (const domain of domains) {
    if (DOMAIN_KEYWORDS[domain].some((k) => lower.includes(k.toLowerCase()))) {
      return domain
    }
  }
  return null
}
