/**
 * Mock 问题优化（Question optimizer）—— 见 docs/00-brief.md §4、docs/01-product-spec.md A4 / F20
 *
 * 这里**不接任何真实 LLM**，只是一组规则式改写。
 *
 * 设计意图：塔罗回答不了「会不会 / 是不是 / 什么时候」这类闭合问题，
 * 但它擅长把问题重新摊开成「我现在需要看清什么」。
 *
 * 【绝不强制改写】
 * - 返回值只是一个**建议**，UI 必须同时提供「保留我的问题」；
 * - 若原问题已经足够开放，返回 `null`，表示不需要打扰用户。
 */

export interface OptimizedQuestion {
  /** 建议的问法 */
  optimized: string
  /** 一句话说明为什么这样改 */
  rationale: string
}

interface Rule {
  id: string
  /** 命中条件 */
  test: (raw: string) => boolean
  /** 生成建议问法 */
  build: (raw: string) => OptimizedQuestion
}

/** 去掉尾部标点，便于拼接 */
function trimTail(text: string): string {
  return text.replace(/[?？。.!！,，、\s]+$/u, '').trim()
}

/** 粗略提取问题里的「对象」，失败时返回 null */
function extractSubject(raw: string): string | null {
  const match = raw.match(/(他|她|对方|前任|前男友|前女友|老板|同事|朋友|家人)/u)
  return match ? match[1]! : null
}

/**
 * 规则表。顺序即优先级：越靠前越具体。
 */
const RULES: Rule[] = [
  {
    // 1. 关系类的「会不会回来 / 还爱不爱我」
    id: 'relationship-yes-no',
    test: (raw) =>
      /(他|她|对方|前任|前男友|前女友)/u.test(raw) &&
      /(会不会|会|还爱|喜欢我吗|回来|复合|联系我|想我|在乎我)/u.test(raw),
    build: (raw) => {
      const subject = extractSubject(raw) ?? '对方'
      return {
        optimized: `在我和${subject}的这段关系里，我现在最需要看清的是什么？`,
        rationale:
          '塔罗读不到另一个人的决定，但可以帮你看清自己在这段关系里的位置和真正在意的东西。',
      }
    },
  },
  {
    // 2. 时间类：「什么时候」
    id: 'when',
    test: (raw) => /(什么时候|何时|多久|几月|多长时间|when will)/iu.test(raw),
    build: (raw) => ({
      optimized: `关于「${trimTail(raw).slice(0, 20)}」这件事，目前进展到哪一步，还缺什么条件？`,
      rationale: '把「什么时候」换成「还缺什么」，答案才是你能着手处理的部分。',
    }),
  },
  {
    // 3. 结果预测类：「会成功吗 / 能不能成」
    id: 'will-succeed',
    test: (raw) =>
      /(会成功|能成吗|能不能成|会不会成|有没有希望|能通过吗|会顺利吗|能拿到吗)/u.test(raw),
    build: (raw) => ({
      optimized: `想让「${trimTail(raw).slice(0, 18)}」这件事往好的方向走，我目前的哪些做法在起作用、哪些在拖后腿？`,
      rationale: '成不成取决于接下来的动作，所以更值得问的是「什么在起作用」。',
    }),
  },
  {
    // 4. 二选一类
    id: 'binary-choice',
    test: (raw) => /(还是|要不要|该不该|应不应该|选哪个|哪一个更好|要不要换)/u.test(raw),
    build: (raw) => ({
      optimized: `在「${trimTail(raw).slice(0, 20)}」这个选择上，两个方向各自会带我去到什么样的处境？`,
      rationale: '与其求一个答案，不如把两条路各自的代价都摊开来看。',
    }),
  },
  {
    // 5. 求判断类：「我是不是…」
    id: 'self-judgement',
    test: (raw) => /(我是不是|我是否|是不是我|我做错了吗|我不好吗)/u.test(raw),
    build: (raw) => ({
      optimized: `在「${trimTail(raw).slice(0, 18)}」这件事里，我的哪些感受是真实的，哪些是我自己加上去的？`,
      rationale: '把「是不是」换成「哪些是真的」，可以避免一开始就给自己下判决。',
    }),
  },
  {
    // 6. 归因类：「为什么总是我 / 为什么他要这样」
    id: 'why-blame',
    test: (raw) => /(为什么总是|为什么老是|为什么他|为什么她|凭什么|为何总)/u.test(raw),
    build: (raw) => ({
      optimized: `在反复出现的这个局面里（${trimTail(raw).slice(0, 16)}），有哪些部分是我可以改变的？`,
      rationale: '把追问原因换成寻找可控部分，比追责更有机会打破循环。',
    }),
  },
  {
    // 7. 泛化的是非问句兜底
    id: 'generic-yes-no',
    test: (raw) => /(吗|嘛|么|会不会|是否|可不可以|能不能)\s*[?？]?$/u.test(trimTail(raw) + '？') ||
      /(吗|会不会|是否|能不能|可不可以)/u.test(raw),
    build: (raw) => ({
      optimized: `关于「${trimTail(raw).slice(0, 20)}」，我现在最需要弄清楚的是什么？`,
      rationale: '是非问句只有两个答案，而开放式的问法能让这次抽牌给出更多可用的信息。',
    }),
  },
]

/** 已经足够开放的问法特征 */
const OPEN_PATTERNS = [
  /最需要/u,
  /该注意什么/u,
  /什么在/u,
  /哪些/u,
  /如何理解/u,
  /怎么看待/u,
  /有什么是我/u,
  /我可以/u,
]

function isAlreadyOpen(raw: string): boolean {
  // 含疑问语气助词的多半仍是闭合问句。
  if (/(吗|嘛|会不会|是不是|能不能|该不该)/u.test(raw)) return false
  return OPEN_PATTERNS.some((p) => p.test(raw))
}

/**
 * 给出一个更适合塔罗的问法建议。
 * @returns 需要建议时返回 `OptimizedQuestion`；原问题已足够开放或过短时返回 `null`
 */
export function optimizeQuestion(raw: string): OptimizedQuestion | null {
  const text = raw.trim()

  // 太短的输入没有可改写的信息量，交给用户自己补充。
  if (text.length < 4) return null
  if (isAlreadyOpen(text)) return null

  for (const rule of RULES) {
    if (rule.test(text)) {
      const result = rule.build(text)
      // 改写后如果和原问题几乎一样，就不打扰用户。
      if (trimTail(result.optimized) === trimTail(text)) return null
      return result
    }
  }

  // 兜底：陈述式的诉说也可以被整理成一个可被塔罗回应的问题。
  if (text.length >= 10) {
    return {
      optimized: `关于「${trimTail(text).slice(0, 20)}」，此刻有什么是我还没看清的？`,
      rationale: '把描述整理成一个开放的问题，这次抽牌才有可以回应的落点。',
    }
  }

  return null
}
