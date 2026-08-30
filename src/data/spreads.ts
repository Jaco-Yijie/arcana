/**
 * 5 个牌阵（Spreads）定义 —— 见 docs/00-brief.md §7
 *
 * 【坐标约定 —— Phase C0 已从自由浮点改为逻辑网格】
 * 牌位只声明 `row` / `col`（外加可选的 span / offset / rotation 视觉修饰）。
 * 像素位置由 `computeSpreadLayout` 按牌桌实际尺寸反解，卡牌尺寸随牌桌走。
 *
 * 旧模型是 0–1 自由浮点，配 DrawTable 里写死的 288px 牌桌与 110px 牌位 ——
 * 纵向间距小于 0.382 的牌位必然重叠，二选一与关系牌阵当场中招，且与视口无关。
 * 自由浮点从一开始就允许把牌位写进重叠状态，所以换掉的是模型，不是几个数字。
 *
 * 关系牌阵已由 Product Lead 裁决为固定 5 张。
 */

import type { Spread, SpreadId } from '@/types/spread'
import type { SessionMode } from '@/types/session'

export const spreads: Spread[] = [
  {
    id: 'single',
    name: '单张牌',
    nameEn: 'Single Card',
    description: '适合一个笼统的、想先看看方向的问题，也用于随缘抽一张。',
    cardCount: 1,
    simplicity: 1,
    grid: { cols: 1, rows: 1 },
    matchKeywords: [
      '今天', '今日', '最近', '状态', '提醒', '建议', '一句话', '随便',
      '大概', '方向', '现在', '当下', '简单',
    ],
    positions: [
      {
        id: 'guidance',
        label: '指引',
        meaning: '此刻最值得你留意的一件事。',
        col: 0,
        row: 0,
      },
    ],
  },
  {
    id: 'past-present-future',
    name: '过去 / 现在 / 未来',
    nameEn: 'Past / Present / Future',
    description: '适合想看清一件事怎么走到今天、又可能往哪里去的问题。',
    cardCount: 3,
    simplicity: 2,
    grid: { cols: 3, rows: 1 },
    matchKeywords: [
      '以前', '过去', '之前', '一直', '发展', '走向', '将来', '未来',
      '接下来', '变化', '会怎么', '演变', '趋势', '后来',
    ],
    positions: [
      {
        id: 'past',
        label: '过去',
        meaning: '把当前局面推到这一步的那些前因。',
        col: 0,
        row: 0,
      },
      {
        id: 'present',
        label: '现在',
        meaning: '此刻真正在发生、也最需要被看清的部分。',
        col: 1,
        row: 0,
      },
      {
        id: 'future',
        label: '未来',
        meaning: '若维持当前状态，事情可能延伸的方向。',
        col: 2,
        row: 0,
      },
    ],
  },
  {
    id: 'situation-obstacle-advice',
    name: '现状 / 阻碍 / 建议',
    nameEn: 'Situation / Obstacle / Advice',
    description: '适合已经卡住、想找出症结与下一步做法的问题。',
    cardCount: 3,
    simplicity: 2,
    grid: { cols: 3, rows: 1 },
    matchKeywords: [
      '怎么办', '卡住', '瓶颈', '困难', '问题', '阻碍', '不顺', '改善',
      '解决', '突破', '该做', '如何', '为什么', '停滞',
    ],
    positions: [
      {
        id: 'situation',
        label: '现状',
        meaning: '事情目前真实的样子，不含你的期待。',
        col: 0,
        row: 0,
      },
      {
        id: 'obstacle',
        label: '阻碍',
        meaning: '正在拖住进展的那个因素，它未必来自外部。',
        col: 1,
        row: 0,
      },
      {
        id: 'advice',
        label: '建议',
        meaning: '可以考虑的调整方向，供你自己判断是否采用。',
        col: 2,
        row: 0,
      },
    ],
  },
  {
    id: 'two-choices',
    name: '二选一',
    nameEn: 'Two Choices',
    description: '适合面前有两个具体选项、想比较各自代价的问题。',
    cardCount: 5,
    simplicity: 4,
    /* 3×3：左右两列各承一条路（结果在上、过程在中），现状压在底部中央。
       中列上两格刻意留空 —— 那片空白就是「两条路之间还没决定的部分」。 */
    grid: { cols: 3, rows: 3 },
    matchKeywords: [
      '选择', '二选一', '还是', '要不要', '哪一个', '哪个', '两个',
      '换工作', '跳槽', '留下', '离开', '接受', '拒绝', '取舍', 'A还是B',
    ],
    positions: [
      {
        id: 'current',
        label: '现状',
        meaning: '你做这个选择时所处的实际处境。',
        col: 1,
        row: 2,
      },
      {
        id: 'a-process',
        label: 'A 方向发展',
        meaning: '选 A 之后，过程中可能出现的情况。',
        col: 0,
        row: 1,
        group: 'A',
      },
      {
        id: 'a-result',
        label: 'A 结果',
        meaning: '选 A 若持续下去，可能收束成的样子。',
        col: 0,
        row: 0,
        group: 'A',
      },
      {
        id: 'b-process',
        label: 'B 方向发展',
        meaning: '选 B 之后，过程中可能出现的情况。',
        col: 2,
        row: 1,
        group: 'B',
      },
      {
        id: 'b-result',
        label: 'B 结果',
        meaning: '选 B 若持续下去，可能收束成的样子。',
        col: 2,
        row: 0,
        group: 'B',
      },
    ],
  },
  {
    id: 'relationship',
    name: '关系',
    nameEn: 'Relationship',
    description: '适合想看清两个人各自的位置、之间的状态与可能走向的问题。',
    cardCount: 5,
    simplicity: 3,
    /* 3×3：阻碍在顶、走向在底，中间一行是「你 — 你们之间 — 对方」。
       `between` 用 offsetY 轻微上提，保留旧版「之间这一格更靠上」的读感 ——
       这是**视觉修饰**，量以单元格自由空间为单位，突不破碰撞检测。 */
    grid: { cols: 3, rows: 3 },
    matchKeywords: [
      '他', '她', '对方', '感情', '恋爱', '喜欢', '暧昧', '复合', '分手',
      '关系', '朋友', '同事', '家人', '相处', '沟通', '在一起', '冷战',
    ],
    positions: [
      {
        id: 'self',
        label: '你',
        meaning: '你在这段关系里的实际状态与投入方式。',
        col: 0,
        row: 1,
      },
      {
        id: 'other',
        label: '对方',
        meaning: '对方在这段关系里的位置，仅供参考而非定论。',
        col: 2,
        row: 1,
      },
      {
        id: 'between',
        label: '你们之间',
        meaning: '两个人之间正在流动的那部分：连结、张力或距离。',
        col: 1,
        row: 1,
        offsetY: -1,
      },
      {
        id: 'obstacle',
        label: '阻碍',
        meaning: '让这段关系难以往前的那个因素。',
        col: 1,
        row: 0,
      },
      {
        id: 'direction',
        label: '走向',
        meaning: '若双方维持当前的相处方式，关系可能延伸的方向。',
        col: 1,
        row: 2,
      },
    ],
  },
]

export const spreadById: Record<SpreadId, Spread> = Object.fromEntries(
  spreads.map((s) => [s.id, s]),
) as Record<SpreadId, Spread>

export function getSpread(id: SpreadId): Spread {
  return spreadById[id]
}

/**
 * Mock 牌阵推荐（Spread recommendation）。
 *
 * 【重要】这是**建议**，不是决定：
 * - 永远返回 2–3 个，且界面必须同时提供「查看全部牌阵」；
 * - 推荐只做关键词匹配 + 新手友好度排序，不读取任何历史数据、不做用户画像；
 * - 最终选哪个牌阵的**决定权完全在用户**（见 docs/01-product-spec.md A6 / G-12）。
 */
export function recommendSpreads(question: string, mode: SessionMode): SpreadId[] {
  // 随缘模式固定单张牌，不需要推荐流程。
  if (mode === 'random') {
    return ['single']
  }

  const text = question.trim().toLowerCase()

  // 没写问题时，给出最容易上手的三个。
  if (text.length === 0) {
    return ['single', 'past-present-future', 'situation-obstacle-advice']
  }

  const scored = spreads.map((spread) => {
    let score = 0
    for (const keyword of spread.matchKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        // 长关键词的指向性更强，给更高权重。
        score += keyword.length >= 3 ? 3 : 2
      }
    }
    // 问题写得很短时，轻微偏向简单牌阵；写得长时轻微偏向结构复杂的牌阵。
    if (text.length <= 8) {
      score += (5 - spread.simplicity) * 0.5
    } else if (text.length >= 25) {
      score += spread.simplicity * 0.3
    }
    return { spread, score }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // 同分时新手友好度优先。
    return a.spread.simplicity - b.spread.simplicity
  })

  const hits = scored.filter((s) => s.score > 0)
  // 命中足够明确时给 2 个，否则给 3 个让用户有更大的选择空间。
  const take = hits.length >= 2 && hits[0]!.score >= 6 ? 2 : 3
  return scored.slice(0, take).map((s) => s.spread.id)
}
