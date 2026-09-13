/**
 * 英文本地兜底解读
 *
 * ══════════════════════════════════════════════════════════════
 * 【为什么另起一个文件，而不是把 mockReading.ts 也 i18n 掉】
 * `mockReading.ts` 是一台中文短语拼装机：它有十几组措辞库
 * （HEADLINE_SECOND_RANDOM、WATCH_OUT_PREFIX…），靠中文特有的
 * 连接词与语序把牌义缝成通顺的段落。把那套模板翻译成英文，
 * 得到的会是"能读但每句都别扭"的机翻腔 —— 而这份文本是要作为
 * **正式解读的替身**展示给用户的。
 *
 * 所以英文这边重写了一套更短、更直的组装逻辑：少一点串词，
 * 多依赖 78 张牌的英文牌义本身。它比中文版短，但每一句都是能读的英文。
 *
 * 【它仍然如实标注自己是兜底】
 * meta.provider = 'mock'，前端据此显示 "Showing a local sample reading"。
 * 这份文本不会被冒充成模型输出。
 * ══════════════════════════════════════════════════════════════
 */

import { getCard } from '@/data/deck'
import { localizeCard, orient } from '@/data/deck/localized'
import { detectRisk } from './safety'
import type { Orientation } from '@/types/tarot'
import type {
  ReadingRelationship,
  StructuredReading,
  StructuredReadingCard,
} from '@/types/reading'

export interface EnglishMockInput {
  question: string
  spreadName: string
  /** 顺序即牌位顺序 */
  cards: {
    cardId: string
    orientation: Orientation
    /** 已本地化的牌位名 */
    positionName: string
    /** 已本地化的牌位含义 */
    positionMeaning: string
  }[]
}

/** 稳定的伪随机取值：同一副牌永远给出同一份兜底文本（不能每次刷新都变） */
function pick<T>(list: readonly T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0
  return list[Math.abs(h) % list.length]!
}

const OPENERS = [
  'Taken together, these cards describe a situation still in motion rather than a settled one.',
  'Read as a set, these cards point at one pattern rather than several unrelated events.',
  'What this spread shows is less a prediction than a description of where the weight currently sits.',
] as const

const CLOSERS = [
  'None of this is fixed. It describes the current shape of things, which is the part you can still act on.',
  'Read it as a description of the present, not a forecast. What follows depends on what you do next.',
  'This is where things stand now. The useful question is which part of it is within your reach.',
] as const

export function buildEnglishMockReading(input: EnglishMockInput): Omit<StructuredReading, 'meta'> {
  const seed = input.cards.map((c) => `${c.cardId}:${c.orientation}`).join('|')

  const entries = input.cards.map((c) => {
    const card = getCard(c.cardId)
    const text = localizeCard(card, 'en-US')
    const meaning =
      c.orientation === 'upright' ? text.meaningUpright : text.meaningReversed
    return {
      ...c,
      card,
      text,
      meaning,
      advice: orient(text.advice, c.orientation),
      keywords: (c.orientation === 'upright'
        ? text.keywordsUpright
        : text.keywordsReversed
      ).slice(0, 3),
    }
  })

  const majors = entries.filter((e) => e.card.arcana === 'major')
  const reversed = entries.filter((e) => e.orientation === 'reversed')

  const cards: StructuredReadingCard[] = entries.map((e) => ({
    cardId: e.cardId,
    cardName: e.text.name,
    position: e.positionName,
    orientation: e.orientation,
    interpretation: `${e.meaning} In the "${e.positionName}" position — ${lowerFirst(
      e.positionMeaning,
    )} — the emphasis falls on ${e.keywords.join(', ')}.`,
    connectionToQuestion: e.advice,
  }))

  const relationships: ReadingRelationship[] = []
  if (entries.length >= 2) {
    if (majors.length >= 2) {
      relationships.push({
        cards: majors.map((e) => e.cardId),
        kind: 'major-density',
        interpretation: `${majors.length} of the ${entries.length} cards are Major Arcana (${majors
          .map((e) => e.text.name)
          .join(', ')}). That usually means the question is touching a stage of things rather than a single incident.`,
      })
    }
    if (reversed.length === entries.length) {
      relationships.push({
        cards: entries.map((e) => e.cardId),
        kind: 'orientation-balance',
        interpretation:
          'Every card here is reversed. Rather than reading that as "things are going badly", it is usually more useful as a sign that the effort is currently going in a direction that is not returning much.',
      })
    }
    if (relationships.length === 0) {
      const a = entries[0]!
      const b = entries[entries.length - 1]!
      relationships.push({
        cards: [a.cardId, b.cardId],
        kind: 'arc',
        interpretation: `From ${a.text.name} in "${a.positionName}" to ${b.text.name} in "${b.positionName}", the emphasis shifts. That shift is worth more attention than either card taken alone.`,
      })
    }
  }

  const theme =
    entries.length === 1
      ? `${input.spreadName} · one thing worth noticing`
      : reversed.length === entries.length
        ? `${input.spreadName} · a set asking for a change of direction`
        : majors.length >= Math.ceil(entries.length / 2)
          ? `${input.spreadName} · a stage rather than an incident`
          : `${input.spreadName} · a situation still moving`

  const overallEnergy = [
    pick(OPENERS, seed),
    entries
      .map((e) => `${e.text.name} sits in "${e.positionName}": ${e.keywords.join(', ')}.`)
      .join(' '),
  ].join('\n\n')

  const narrative = entries.map((e) => e.meaning).join(' ')

  const answer = input.question.trim()
    ? `On "${input.question.trim()}" — the clearest thing in this spread is what the "${
        entries[0]!.positionName
      }" card describes: ${lowerFirst(entries[0]!.meaning)} ${pick(CLOSERS, seed)}`
    : `${pick(OPENERS, `${seed}#a`)} ${entries[0]!.advice} ${pick(CLOSERS, seed)}`

  const reflectionQuestions = entries
    .slice(0, 4)
    .map((e) => `Looking at "${e.positionName}": ${e.advice}`)

  const risk = detectRisk(input.question, 'en')

  return {
    version: 2,
    readingTheme: theme,
    overallEnergy,
    cards,
    relationships,
    narrative,
    answerToQuestion: answer,
    reflectionQuestions:
      reflectionQuestions.length > 0
        ? reflectionQuestions
        : ['What part of this is actually within your reach right now?'],
    safetyNotice: risk.notice,
  }
}

function lowerFirst(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  /* 只在首词不是专名时降格。"The Fool describes…" 不该变成 "the Fool…"，
     但 "Something has opened…" 接在破折号后面时应该。 */
  const first = trimmed.split(/\s+/)[0]!
  if (first.length > 1 && first[1] === first[1]!.toUpperCase()) return trimmed
  return trimmed[0]!.toLowerCase() + trimmed.slice(1)
}
