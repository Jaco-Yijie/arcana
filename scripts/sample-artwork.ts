/**
 * D4 · Artwork Runtime 抽样清单生成（不做 Art QA，只做运行期验收）
 *
 * 每套 10 张 · 五套共 50 张，覆盖 Major / Wands / Cups / Swords / Pentacles 与宫廷牌。
 * URL **由真实 resolver 生成** —— 验的是「运行期真的会去请求的那个地址」，
 * 不是「磁盘上有没有文件」（那是 deck:check 的方向）。
 */
import { writeFileSync } from 'node:fs'
import { ALL_DECK_IDS } from '../src/decks/ids.ts'
import { getManifest } from '../src/decks/artwork/manifests.ts'
import { isDeckPlayable } from '../src/decks/artwork/resolver.ts'
import { cardArtworkUrl } from '../src/decks/artwork/paths.ts'
import { allCards } from '../src/data/deck/index.ts'

const byId = new Map(allCards.map((c) => [c.id, c]))
const playable = ALL_DECK_IDS.filter((id) => isDeckPlayable(id))

/** 每套固定取这 10 张：五个花色 + 大阿卡纳 + 四张宫廷牌都覆盖到 */
const PICKS = [
  'major-00', 'major-13', 'major-21',   // 大阿卡纳：首 / 中 / 末
  'wands-01', 'cups-07',                 // 数字牌
  'swords-10', 'pentacles-05',           // 数字牌
  'wands-11', 'cups-14', 'swords-12',    // 宫廷牌：侍从 / 国王 / 骑士
]

const rows: unknown[] = []
for (const deckId of playable) {
  const m = getManifest(deckId)!
  PICKS.forEach((cardId, i) => {
    const entry = m.cards[cardId]
    if (!entry) { rows.push({ deckId, cardId, error: 'manifest 无此牌' }); return }
    const rev = entry.rev ?? m.rev
    const card = byId.get(cardId)
    rows.push({
      deckId, cardId,
      nameZh: card?.nameZh ?? '?', nameEn: card?.name ?? '?',
      arcana: card?.arcana, suit: card?.suit ?? null,
      /* 正逆位交替 —— 逆位不换文件（同一张图），验的是 UI 标记而不是资产 */
      orientation: i % 2 === 0 ? 'upright' : 'reversed',
      full: cardArtworkUrl(deckId, cardId, rev, 'full'),
      thumb: cardArtworkUrl(deckId, cardId, rev, 'thumb'),
      expectW: entry.w, expectH: entry.h,
    })
  })
}
writeFileSync('qa/final-acceptance/artwork-sample.json', JSON.stringify({ decks: playable, count: rows.length, rows }, null, 2))
console.log(`抽样 ${rows.length} 张 · ${playable.length} 套 · ${PICKS.length} 张/套`)
console.log('覆盖:', [...new Set(rows.map((r: any) => r.suit ?? r.arcana))].join(', '))
