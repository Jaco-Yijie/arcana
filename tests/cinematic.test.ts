import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { ALL_DECK_IDS, DEFAULT_DECK_ID } from '../src/decks/ids.ts'
import { getCard } from '../src/data/deck/index.ts'
import { isDeckPlayable, resolveCardArtwork } from '../src/decks/artwork/resolver.ts'
import { CINEMATIC_PROFILES, cinematicProfile, cinematicMode, cinematicAssetUrl, crossfadeDuration } from '../src/atmosphere/cinematic/profiles.ts'
import { TransitionLock } from '../src/atmosphere/cinematic/TransitionLock.ts'

test('all registered decks have distinct compositions and real local media within budget', () => {
  assert.deepEqual(Object.keys(CINEMATIC_PROFILES).sort(), [...ALL_DECK_IDS].sort())
  assert.equal(new Set(Object.values(CINEMATIC_PROFILES).map(p => p.motif)).size, ALL_DECK_IDS.length)
  const compositions = new Set<string>(); let bytes = 0
  for (const [id, profile] of Object.entries(CINEMATIC_PROFILES)) {
    assert.equal(profile.background.type, 'image')
    if (profile.background.type !== 'image') continue
    for (const path of [profile.background.src, profile.artOverlay]) {
      const url = new URL('../public/' + path, import.meta.url)
      assert.ok(existsSync(url), path)
      bytes += statSync(url).size
      assert.doesNotMatch(readFileSync(url, 'utf8'), /<script|<foreignObject|<image/)
    }
    const svg = readFileSync(new URL('../public/' + profile.background.src, import.meta.url), 'utf8')
    // Ignore colors: remaining drawing geometry must still differ.
    compositions.add(svg.replace(/#[0-9a-f]{3,8}/gi, 'COLOR'))
    assert.equal(new Set(profile.cards).size, 3, id)
    for (const card of profile.cards) {
      assert.ok(getCard(card), `${id}/${card}`)
      if (isDeckPlayable(id as typeof DEFAULT_DECK_ID)) assert.notEqual(resolveCardArtwork(id as typeof DEFAULT_DECK_ID, card).kind, 'missing')
    }
    assert.ok(profile.depth.background >= 2 && profile.depth.background <= 4)
    assert.ok(profile.depth.cards >= 6 && profile.depth.cards <= 12)
    assert.ok(profile.depth.foreground >= 12 && profile.depth.foreground <= 20)
  }
  assert.equal(compositions.size, ALL_DECK_IDS.length)
  assert.ok(bytes < 60_000, `all worlds including overlays: ${bytes}`)
})
test('unrecognized persisted deck values get a valid fallback without prototype lookup', () => {
  for (const id of ['bad-deck', '__proto__', 'toString']) assert.equal(cinematicProfile(id), CINEMATIC_PROFILES[DEFAULT_DECK_ID])
  assert.equal(cinematicAssetUrl('assets/cinematic/ethereal.svg'), '/assets/cinematic/ethereal.svg')
})
test('a transition cannot be acquired twice until completion or failed preload releases it', () => {
  const lock = new TransitionLock()
  assert.equal(lock.acquire(), true)
  for (let i = 0; i < 20; i++) assert.equal(lock.acquire(), false)
  lock.release()
  assert.equal(lock.acquire(), true)
  lock.release(); lock.release()
  assert.equal(lock.acquire(), true)
})
test('reading is quiet, ritual routes retain their world, reduced motion uses a short opacity transition', () => {
  for (const route of ['/reading', '/journal/saved-id']) assert.equal(cinematicMode(route), 'reading')
  for (const route of ['/spread', '/table/shuffle', '/table/draw']) assert.equal(cinematicMode(route), 'table')
  assert.equal(crossfadeDuration(false), 1000)
  assert.equal(crossfadeDuration(true), 180)
})
test('all cinematic interface strings are translated in both languages', () => {
  const zh = JSON.parse(readFileSync(new URL('../src/i18n/locales/zh-CN.json', import.meta.url), 'utf8')).cinematic
  const en = JSON.parse(readFileSync(new URL('../src/i18n/locales/en-US.json', import.meta.url), 'utf8')).cinematic
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const key of Object.keys(zh)) { assert.ok(zh[key]); assert.ok(en[key]); assert.notEqual(zh[key], en[key]); assert.doesNotMatch(en[key], /[\u3400-\u9fff]/) }
})
