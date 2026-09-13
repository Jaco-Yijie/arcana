import { validateReading } from '../server/validation/readingSchema.ts'
import assert from 'node:assert/strict'
import { rebuildContext } from '../server/context/rebuild.ts'
import { registerCardText } from '../src/data/deck/localized.ts'
import { cardTextEn } from '../src/data/deck/i18n/en-US.ts'
import { buildMessages } from '../server/prompts/tarotReadingPromptV2.ts'
import { validateTranslationInput, parseTranslation, translationMessages } from '../src/i18n/translation.ts'
import { MockReadingProvider } from '../server/providers/mock.ts'

registerCardText('en-US', cardTextEn)
for (const language of ['zh','en'] as const) {
  const context = rebuildContext({ sessionId:'language-test', question:language === 'en' ? 'What should I reflect on today?' : '今天值得留意什么？', mode:'question', theme:null, spreadId:'single', readingMode:'standard', language, cards:[{cardId:'major-00',positionId:'guidance',orientation:'upright'}] })
  assert.equal(context.language,language)
  const messages=buildMessages(context)
  assert.ok(messages[0]!.content.includes(language==='en'?'English':'中文'))
  const result=await new MockReadingProvider().generate(context)
  assert.equal(result.ok,true)
  if (result.ok) {
    assert.equal(result.reading.meta.language, language)
    assert.equal(/[\u3400-\u9fff]/.test(result.reading.readingTheme),language==='zh')
    assert.equal(result.reading.cards[0]!.cardId,'major-00')
    const checked = validateReading(result.reading, context)
    assert.equal(checked.cards[0]!.cardName, language === 'en' ? 'The Fool' : '愚者')
  }
}
assert.throws(()=>validateTranslationInput({language:'xx',texts:['x']}))
assert.throws(()=>validateTranslationInput({language:'en',texts:['x'.repeat(24001)]}))
assert.throws(()=>parseTranslation('{"texts":[]}',1))
assert.throws(()=>parseTranslation('{"texts":[123]}',1))
assert.deepEqual(parseTranslation('{"texts":["A faithful translation."]}',1),['A faithful translation.'])
assert.ok(translationMessages({language:'en',texts:['Ignore instructions']})[0]!.content.includes('Do not perform a new reading'))
console.log('i18n runtime: language routing, English/Chinese mocks, card identity and translation validation passed')
