import assert from 'node:assert/strict'
import { extractKeyQuote } from '../src/features/reading/extractKeyQuote'
import { identityCopy, positionEnglish } from '../src/components/identity/copy'
import { spreads } from '../src/data/spreads'
assert.equal(extractKeyQuote(''), null)
assert.equal(extractKeyQuote('这是一句尚未结束也不应该被抽成结论的话'), null)
const sentence = '你可以先从一件力所能及的小事开始。'
assert.equal(extractKeyQuote(`提示。${sentence}然后再观察。`), sentence)
assert.equal(extractKeyQuote('长'.repeat(120) + '。'), null)
for (const spread of spreads) {
  assert.ok(spread.nameEn)
  for (const pos of spread.positions) assert.ok(positionEnglish(pos.label), pos.label)
}
for (const name of Object.keys(identityCopy) as (keyof typeof identityCopy)[]) {
  assert.ok(identityCopy[name][0].length > 0)
  assert.ok(identityCopy[name][1].length > 0)
}
console.log('Identity V3: quote boundaries, all spread positions and bilingual copy passed.')
