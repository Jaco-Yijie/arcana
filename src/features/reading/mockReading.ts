/**
 * Mock AI 综合解读（Mock Reading）—— 见 docs/00-brief.md §12、docs/01-product-spec.md AC-10 / AC-11
 *
 * 【这里不接任何真实 LLM】全部文本由牌面数据 + 牌阵结构 + 句式池组合而成。
 *
 * 三条产品约束在本文件中的体现：
 * 1. **AI 不参与抽牌**：本模块只接收「已经翻开的结果」，不产生也不修改任何牌序。
 * 2. **理性分析型语气**：所有句式使用「这组牌可能反映…」「目前值得关注的是…」这类
 *    可证伪、可保留的表述；确定性/宿命论词汇见 `FORBIDDEN_PHRASES`。
 * 3. **不替用户做决定**：`actions` 一律是「可以考虑」而非「你应该」。
 *
 * 同一份输入会稳定产出同一份解读（基于内容哈希选句），
 * 不同的牌 / 牌位 / 牌阵会明显走到不同的句式分支。
 */

import type { Orientation, TarotCard } from '@/types/tarot'
import type { SpreadId, SpreadPosition } from '@/types/spread'
import type { SessionMode, RandomThemeId, Reading, CardAnalysis } from '@/types/session'
import { getCard } from '@/data/deck'
import { getSpread } from '@/data/spreads'
import { getRandomTheme } from '@/data/randomThemes'
import { detectRisk, shouldSoftenTone } from './safety'

/* ------------------------------------------------------------------ */
/* 语气红线：QA 可直接检索本常量做全文验证（AC-11 / G-14）             */
/* ------------------------------------------------------------------ */

/**
 * 禁用表述。任何 Mock 文案（牌义数据、牌阵文案、Reading、Follow-up）中
 * 都不允许出现以下字符串。QA 用它对生成结果做零命中断言。
 */
export const FORBIDDEN_PHRASES: string[] = [
  '你一定会',
  '一定会',
  '一定',
  '命运已经决定',
  '命运注定',
  '注定',
  '必然',
  '你必须',
  '必须',
  '绝对',
  '肯定会',
  '毫无疑问',
  '百分之百',
  '不可避免',
  '无法改变',
  '天意',
  '宿命',
]

/* ------------------------------------------------------------------ */
/* 输入契约                                                            */
/* ------------------------------------------------------------------ */

/** 一张已翻开的牌落在某个牌位上 */
export interface ReadingPlacement {
  positionId: string
  cardId: string
  orientation: Orientation
}

export interface ReadingInput {
  /** 用户最终采用的问题（原问题或优化后的问题）；随缘模式可为空串 */
  question: string
  spreadId: SpreadId
  /** 顺序即牌位顺序，长度应等于牌阵张数 */
  placements: ReadingPlacement[]
  mode: SessionMode
  /** 随缘模式的轻主题，带着问题来时为 null */
  theme: RandomThemeId | null
}

/* ------------------------------------------------------------------ */
/* 选句工具：由内容决定分支，保证同输入同输出、不同牌面走不同句式        */
/* ------------------------------------------------------------------ */

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function pick<T>(pool: readonly T[], seed: string): T {
  return pool[hash(seed) % pool.length]!
}

const ORIENTATION_LABEL: Record<Orientation, string> = {
  upright: '正位',
  reversed: '逆位',
}

const SUIT_LABEL = {
  wands: '权杖',
  cups: '圣杯',
  swords: '宝剑',
  pentacles: '星币',
} as const

const SUIT_TONE = {
  wands: '行动与动力',
  cups: '情感与关系',
  swords: '思考与沟通',
  pentacles: '现实与资源',
} as const

/* ------------------------------------------------------------------ */
/* 句式池                                                              */
/* ------------------------------------------------------------------ */

const HEADLINE_OPENERS = [
  '这组牌整体上更像是在描述一个正在变化中的局面，而不是给出一个结论。',
  '把这几张牌放在一起看，它们指向的重点并不在结果，而在你此刻的处境本身。',
  '这次的牌面比较集中，可以先从最显眼的那一张开始理解。',
  '这组牌读起来并不激烈，更像是在提示一些容易被跳过的细节。',
  '这次摊开的组合有一点张力，几张牌之间的角度并不完全一致。',
]

const HEADLINE_FRAMES = [
  (pos: string, card: string, meaning: string) =>
    `在「${pos}」这个位置上出现了${card}，这组牌可能反映的是：${meaning}`,
  (pos: string, card: string, meaning: string) =>
    `落在「${pos}」的是${card}。可以把它理解为一种提醒——${meaning}`,
  (pos: string, card: string, meaning: string) =>
    `「${pos}」这个牌位由${card}承接，目前值得关注的是：${meaning}`,
  (pos: string, card: string, meaning: string) =>
    `${card}出现在「${pos}」上，这通常对应着这样一种状态：${meaning}`,
]

const HEADLINE_SECOND = [
  (q: string) => `你带来的问题是「${q}」。牌面没有替这个问题给出答案，但它把问题的重心挪了一下位置。`,
  (q: string) => `围绕「${q}」这个问题，这次的牌更多是在帮你分辨哪些部分在你手里、哪些不在。`,
  (q: string) => `就「${q}」而言，牌面提供的是一个观察角度，最终怎么判断仍然由你自己决定。`,
]

const HEADLINE_SECOND_RANDOM = [
  (t: string) => `这次是随缘抽的一张，语境是「${t}」。它更像一句放在今天的提示，而不是对某件具体事情的回答。`,
  (t: string) => `你选的语境是「${t}」。这张牌可以当作一个观察自己的入口，读完之后如果没有共鸣，放下也没关系。`,
  (t: string) => `在「${t}」这个语境下，这张牌指向的是一种此刻的状态，而不是一个即将发生的事件。`,
]

const ANALYSIS_FRAMES = [
  (pos: string, posMeaning: string, card: string, meaning: string, domain: string) =>
    `「${pos}」这个位置代表${posMeaning}这里出现的是${card}，${meaning}放到这个牌位上看，${domain}`,
  (pos: string, posMeaning: string, card: string, meaning: string, domain: string) =>
    `${card}落在「${pos}」。这个牌位关注的是${posMeaning}${meaning}结合起来，${domain}`,
  (pos: string, posMeaning: string, card: string, meaning: string, domain: string) =>
    `在「${pos}」上，${card}的出现值得多看一眼。${posMeaning}${meaning}也就是说，${domain}`,
  (pos: string, posMeaning: string, card: string, meaning: string, domain: string) =>
    `「${pos}」——${posMeaning}这一格是${card}。${meaning}对应到这个位置，${domain}`,
]

const DOMAIN_BRIDGES = [
  (advice: string) => `可以考虑的方向是：${advice}`,
  (advice: string) => `这张牌给出的提示偏向于：${advice}`,
  (advice: string) => `如果要落到具体做法上，它更接近：${advice}`,
  (advice: string) => `它在这个位置上更像是在说：${advice}`,
]

const TREND_FRAMES = [
  (s: string) => `如果按照当前状态继续发展，${s}`,
  (s: string) => `就目前这组牌呈现的结构来说，${s}`,
  (s: string) => `把几个牌位串起来看，趋势更接近于：${s}`,
  (s: string) => `在没有明显外部变化的前提下，${s}`,
]

const WATCH_OUT_PREFIX = [
  '值得留意的是：',
  '这里有一个容易被忽略的点：',
  '需要提前想到的是：',
  '一个可能的盲区在于：',
]

const ACTION_PREFIX = [
  '可以考虑',
  '如果想试试看，可以',
  '一个成本很低的做法是',
  '也许可以先',
]

/* ------------------------------------------------------------------ */
/* 主函数                                                              */
/* ------------------------------------------------------------------ */

export function generateReading(input: ReadingInput): Reading {
  const spread = getSpread(input.spreadId)
  const seedBase =
    input.spreadId +
    '|' +
    input.placements.map((p) => `${p.positionId}:${p.cardId}:${p.orientation}`).join(',')

  const entries = input.placements.map((placement) => {
    const card = getCard(placement.cardId)
    const position =
      spread.positions.find((p) => p.id === placement.positionId) ?? spread.positions[0]!
    const up = placement.orientation === 'upright'
    return {
      placement,
      card,
      position,
      up,
      /** 例：「逆位的宝剑八」 */
      title: `${ORIENTATION_LABEL[placement.orientation]}的${card.nameZh}`,
      meaning: up ? card.meaningUpright : card.meaningReversed,
      advice: up ? card.advice.upright : card.advice.reversed,
      keywords: up ? card.keywordsUpright : card.keywordsReversed,
    }
  })

  const riskSource = [input.question, input.theme ? getRandomTheme(input.theme).prompt : '']
    .filter(Boolean)
    .join(' ')
  const risk = detectRisk(riskSource)
  const soften = shouldSoftenTone(risk)

  return {
    generatedAt: Date.now(),
    headline: buildHeadline(input, entries, seedBase, soften),
    cardAnalyses: buildCardAnalyses(entries, seedBase),
    relations: buildRelations(entries, seedBase),
    trend: buildTrend(input, entries, seedBase, soften),
    watchOut: buildWatchOut(entries, seedBase, soften),
    actions: buildActions(entries, seedBase),
    safetyNotice: risk.notice,
  }
}

/** 一个牌位 + 落在其上的牌，展开成解读时直接可用的形态 */
interface Entry {
  placement: ReadingPlacement
  card: TarotCard
  position: SpreadPosition
  /** 是否正位 */
  up: boolean
  /** 例：「逆位的宝剑八」 */
  title: string
  meaning: string
  advice: string
  keywords: string[]
}

/* ---------------------------- headline ---------------------------- */

function buildHeadline(
  input: ReadingInput,
  entries: Entry[],
  seed: string,
  soften: boolean,
): string[] {
  // 焦点牌：多牌阵取「阻碍 / 建议 / 走向 / 现在」等结构关键位，否则取第一张。
  const focusOrder = ['obstacle', 'advice', 'between', 'present', 'direction', 'situation']
  const focus =
    entries.find((e) => focusOrder.includes(e.position.id)) ?? entries[0]!

  const opener = pick(HEADLINE_OPENERS, seed + '#opener')
  const frame = pick(HEADLINE_FRAMES, seed + '#frame')
  const first = `${opener}${frame(focus.position.label, focus.title, focus.meaning)}`

  let second: string
  if (input.mode === 'random' && input.theme) {
    second = pick(HEADLINE_SECOND_RANDOM, seed + '#second')(getRandomTheme(input.theme).label)
  } else {
    const q = input.question.trim() || '你此刻想弄清楚的事'
    second = pick(HEADLINE_SECOND, seed + '#second')(q)
  }

  const reversedCount = entries.filter((e) => !e.up).length
  if (entries.length > 1) {
    second +=
      reversedCount === 0
        ? `全部 ${entries.length} 张都是正位，整组牌的方向比较一致。`
        : reversedCount === entries.length
          ? `${entries.length} 张全部逆位，这更像是在提示：当前的力气可能用在了不太顺的方向上。`
          : `${entries.length} 张里有 ${reversedCount} 张逆位，说明局面里同时存在推进和阻力。`
  }

  if (soften) {
    second +=
      '这次的话题涉及现实中的重要判断，以下内容只作为整理思路的参考，不构成任何预测或专业建议。'
  }

  return [first, second]
}

/* -------------------------- cardAnalyses -------------------------- */

function buildCardAnalyses(entries: Entry[], seed: string): CardAnalysis[] {
  return entries.map((entry, index) => {
    const frame = pick(ANALYSIS_FRAMES, seed + '#a' + index + entry.card.id)
    const bridge = pick(DOMAIN_BRIDGES, seed + '#b' + index + entry.card.id)
    const domainText = pickDomainText(entry)
    const text = frame(
      entry.position.label,
      entry.position.meaning,
      entry.title,
      entry.meaning,
      `${domainText}${bridge(entry.advice)}`,
    )
    return {
      positionId: entry.position.id,
      positionLabel: entry.position.label,
      cardId: entry.card.id,
      orientation: entry.placement.orientation,
      text: `${text}关键词：${entry.keywords.join(' · ')}。`,
    }
  })
}

/** 依据牌位属性挑一个最贴近的生活领域段落 */
function pickDomainText(entry: Entry): string {
  const { card, up, position } = entry
  const o = <T extends { upright: string; reversed: string }>(t: T) => (up ? t.upright : t.reversed)

  const id = position.id
  if (id === 'self' || id === 'other' || id === 'between' || id === 'direction') {
    return `${o(card.love)}`
  }
  if (id === 'a-process' || id === 'a-result' || id === 'b-process' || id === 'b-result') {
    return `${o(card.career)}`
  }
  if (card.suit === 'cups') return `${o(card.love)}`
  if (card.suit === 'pentacles') return `${o(card.finance)}`
  if (card.suit === 'swords') return `${o(card.study)}`
  if (card.suit === 'wands') return `${o(card.career)}`
  return `${o(card.career)}`
}

/* ---------------------------- relations --------------------------- */

function buildRelations(entries: Entry[], seed: string): string[] {
  const relations: string[] = []

  const majors = entries.filter((e) => e.card.arcana === 'major')
  const reversed = entries.filter((e) => !e.up)
  const total = entries.length

  // 1. 大阿卡纳占比
  if (total === 1) {
    const only = entries[0]!
    relations.push(
      only.card.arcana === 'major'
        ? `只抽了一张，而它是大阿卡纳${only.card.nameZh}。大阿卡纳通常对应比较大的主题，所以这张牌更像是在谈一个阶段，而不是某件具体的小事。`
        : `这一张是小阿卡纳${SUIT_LABEL[only.card.suit!]}${only.card.nameZh}，${SUIT_LABEL[only.card.suit!]}这个花色偏向${SUIT_TONE[only.card.suit!]}，所以它指向的多半是日常层面的具体事项。`,
    )
  } else if (majors.length === 0) {
    relations.push(
      `${total} 张牌全部是小阿卡纳，没有大阿卡纳出现。这组牌可能反映的是：当前局面更多由具体的日常事务构成，暂时没有牵动整体方向的大议题。`,
    )
  } else if (majors.length >= Math.ceil(total / 2)) {
    relations.push(
      `${total} 张里有 ${majors.length} 张大阿卡纳（${majors.map((m) => m.card.nameZh).join('、')}），比例偏高。这通常意味着这件事对你来说牵动的层面比表面看起来更大。`,
    )
  } else {
    relations.push(
      `牌阵中出现了 ${majors.length} 张大阿卡纳（${majors.map((m) => m.card.nameZh).join('、')}），其余为小阿卡纳。可以理解为：有一个较大的主题在背景里，但眼前要处理的仍是具体的事。`,
    )
  }

  // 2. 花色分布
  const suitCount = new Map<string, number>()
  for (const e of entries) {
    if (e.card.suit) suitCount.set(e.card.suit, (suitCount.get(e.card.suit) ?? 0) + 1)
  }
  const dominant = [...suitCount.entries()].sort((a, b) => b[1] - a[1])[0]
  if (dominant && dominant[1] >= 2) {
    const suit = dominant[0] as keyof typeof SUIT_LABEL
    relations.push(
      `${SUIT_LABEL[suit]}出现了 ${dominant[1]} 次，是牌面上最集中的花色。${SUIT_LABEL[suit]}对应${SUIT_TONE[suit]}，所以目前值得关注的重心可能在这一块，而不是你原本以为的地方。`,
    )
  } else if (suitCount.size >= 3) {
    relations.push(
      `牌面上出现了 ${suitCount.size} 种不同花色，分布很散。这组牌可能反映的是：影响这件事的因素来自好几个方向，很难只用一个原因解释。`,
    )
  }

  // 3. 正逆位比例
  if (total > 1) {
    if (reversed.length === 0) {
      relations.push(
        '全部为正位，说明各个牌位之间的方向相对一致，推进时遇到的内部矛盾可能较少。',
      )
    } else if (reversed.length === total) {
      relations.push(
        `全部为逆位（${entries.map((e) => e.card.nameZh).join('、')}）。整体逆位往往指向能量卡在内部，此时把节奏放慢一点，可能比继续加力更有用。`,
      )
    } else {
      relations.push(
        `正位的是${entries.filter((e) => e.up).map((e) => `${e.position.label}·${e.card.nameZh}`).join('，')}；逆位的是${reversed.map((e) => `${e.position.label}·${e.card.nameZh}`).join('，')}。顺与不顺的分界正好落在这几个牌位上，值得对照着看。`,
      )
    }
  }

  // 4. 相邻牌位对照
  if (total >= 2) {
    const a = entries[0]!
    const b = entries[1]!
    const contrast =
      a.up === b.up
        ? `「${a.position.label}」的${a.title}与「${b.position.label}」的${b.title}方向相同，这两格可以合起来读成同一件事的两个阶段。`
        : `「${a.position.label}」的${a.title}和「${b.position.label}」的${b.title}一正一逆，这两格之间存在落差——通常是期待与实际之间的那种落差。`
    relations.push(contrast)
  }

  // 5. 宫廷牌（11–14）意味着「人」的因素
  const courts = entries.filter((e) => e.card.arcana === 'minor' && e.card.number >= 11)
  if (courts.length > 0) {
    relations.push(
      `牌面上有 ${courts.length} 张宫廷牌（${courts.map((c) => c.card.nameZh).join('、')}）。宫廷牌常常对应具体的人或某种态度，可以想想它们让你联想到谁，或者你自己是不是正处在这种状态里。`,
    )
  }

  // 保证至少 2 条
  if (relations.length < 2) {
    relations.push(
      pick(
        [
          '这次的牌数不多，牌与牌之间的关系比较简单，重点还是落在单张牌本身给出的角度上。',
          '牌面结构比较干净，没有明显互相拉扯的部分，可以直接从每个牌位各自的含义来读。',
        ],
        seed + '#rel',
      ),
    )
  }

  return relations
}

/* ------------------------------ trend ----------------------------- */

function buildTrend(
  input: ReadingInput,
  entries: Entry[],
  seed: string,
  soften: boolean,
): string {
  const frame = pick(TREND_FRAMES, seed + '#trend')
  const last = entries[entries.length - 1]!
  const reversedRatio = entries.filter((e) => !e.up).length / entries.length

  let body = ''
  switch (input.spreadId) {
    case 'single':
      body = `这张${last.title}描述的更像是一个当前的状态，它会随着你接下来的做法改变。${last.advice}`
      break
    case 'past-present-future': {
      const future = entries.find((e) => e.position.id === 'future') ?? last
      body = `「未来」位上的${future.title}给出的是一种延伸，而不是一个结局：${future.meaning}这段延伸随时可以因为你的选择而改写。`
      break
    }
    case 'situation-obstacle-advice': {
      const obstacle = entries.find((e) => e.position.id === 'obstacle')
      const advice = entries.find((e) => e.position.id === 'advice')
      body = `当前的症结更接近「阻碍」位上的${obstacle?.title ?? last.title}所描述的那种情况；而「建议」位的${advice?.title ?? last.title}提示的做法是：${advice?.advice ?? last.advice}`
      break
    }
    case 'two-choices': {
      const aResult = entries.find((e) => e.position.id === 'a-result')
      const bResult = entries.find((e) => e.position.id === 'b-result')
      body = `A 方向收束在${aResult?.title ?? '——'}，B 方向收束在${bResult?.title ?? '——'}。两边不是「好」与「坏」的关系，而是代价不同：前者更接近${aResult?.keywords.slice(0, 2).join('与') ?? '—'}，后者更接近${bResult?.keywords.slice(0, 2).join('与') ?? '—'}。选择权在你手上。`
      break
    }
    case 'relationship': {
      const direction = entries.find((e) => e.position.id === 'direction') ?? last
      const between = entries.find((e) => e.position.id === 'between')
      body = `两个人之间目前的状态更接近${between?.title ?? '牌面所示'}，而「走向」位的${direction.title}提示的是：${direction.meaning}这只是当前相处方式的延长线，双方任何一方改变做法，这条线都会跟着变。`
      break
    }
  }

  const tail =
    reversedRatio >= 0.6
      ? '逆位偏多的时候，通常更适合先收拾内部，再谈往外推进。'
      : reversedRatio === 0
        ? '正位居多时，把已经在做的事继续做下去，往往比换方向更省力。'
        : '正逆混杂的局面里，进展和阻力会交替出现，这是正常的节奏。'

  const softTail = soften
    ? '涉及现实中的重要决定时，这段趋势只是一个思考框架，实际判断请结合专业意见与你手上的具体信息。'
    : ''

  return `${frame(body)}${tail}${softTail}`
}

/* ---------------------------- watchOut ---------------------------- */

function buildWatchOut(entries: Entry[], seed: string, soften: boolean): string[] {
  const items: string[] = []
  const reversed = entries.filter((e) => !e.up)

  if (reversed.length > 0) {
    const target = reversed[0]!
    items.push(
      `${pick(WATCH_OUT_PREFIX, seed + '#w0')}「${target.position.label}」上的${target.title}指向的是${target.keywords.slice(0, 3).join('、')}这一类状态。它不代表结果不好，但确实提示这一格需要多花点注意力。`,
    )
  }

  const swords = entries.filter((e) => e.card.suit === 'swords')
  if (swords.length > 0) {
    items.push(
      `${pick(WATCH_OUT_PREFIX, seed + '#w1')}牌面上出现了${swords.map((s) => s.card.nameZh).join('、')}。宝剑对应语言与思考，这类牌出现时，误解和过度分析往往比事情本身更消耗人。`,
    )
  }

  const majorsReversed = entries.filter((e) => e.card.arcana === 'major' && !e.up)
  if (majorsReversed.length > 0) {
    items.push(
      `${pick(WATCH_OUT_PREFIX, seed + '#w2')}逆位的${majorsReversed.map((m) => m.card.nameZh).join('、')}属于大阿卡纳，它谈的是比较根本的层面。这类提示通常不能靠一次调整解决，可以给它多一点时间。`,
    )
  }

  if (items.length === 0) {
    items.push(
      `${pick(WATCH_OUT_PREFIX, seed + '#w3')}这次牌面整体顺畅，反而容易让人放松对细节的检查。可以留意那些「看起来没问题所以没再确认」的部分。`,
    )
  }

  items.push(
    '还有一点：这次解读只基于你这一次抽到的牌和你写下的问题，它没有你生活里的其他信息，所以请把它当作一个角度，而不是判断依据。',
  )

  if (soften) {
    items.push(
      '这个话题涉及现实中的重要判断，塔罗在这里能做的只是帮你把想法排列清楚，具体决定请交给专业渠道和你自己。',
    )
  }

  return items
}

/* ----------------------------- actions ---------------------------- */

function buildActions(entries: Entry[], seed: string): string[] {
  const actions: string[] = []

  entries.slice(0, 3).forEach((entry, i) => {
    const prefix = pick(ACTION_PREFIX, seed + '#act' + i + entry.card.id)
    actions.push(`${prefix}从「${entry.position.label}」这一格入手：${entry.advice}`)
  })

  const keywordPool = entries.flatMap((e) => e.keywords)
  const focusKeyword = pick(keywordPool, seed + '#kw')
  actions.push(
    `如果只想记住一个词，这次可以带走「${focusKeyword}」，把它放在接下来几天里当作一个观察自己的提示。`,
  )

  actions.push(
    '读完之后如果哪一段让你不太舒服，可以先放着不处理——这些内容不需要被立刻接受，也不需要被完整采纳。',
  )

  return actions
}
