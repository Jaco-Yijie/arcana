import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { designTransition } from '../src/design/motion.ts'

const theme = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles/design-system.css', import.meta.url), 'utf8')

function color(token: string) {
  const hex = new RegExp(`--${token}:\\s*#([a-f0-9]{6});`, 'i').exec(theme)?.[1]
  assert.ok(hex, `Missing color token ${token}`)
  return [0, 2, 4].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0)
}

test('paper reading text and interactive accents retain AA contrast', () => {
  for (const surface of ['color-paper', 'color-paper-raised', 'color-paper-inset']) {
    for (const ink of ['color-ink-primary', 'color-ink-secondary', 'color-ink-muted', 'color-ink-accent']) {
      const ratio = (color(surface) + .05) / (color(ink) + .05)
      assert.ok(ratio >= 4.5, `${ink} on ${surface}: ${ratio.toFixed(2)}`)
    }
  }
})

test('Framer transitions read CSS time units and preserve the half-turn reveal duration', () => {
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const oldStyle = Object.getOwnPropertyDescriptor(globalThis, 'getComputedStyle')
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: {} } })
  Object.defineProperty(globalThis, 'getComputedStyle', { configurable: true, value: () => ({
    getPropertyValue: (key: string) => new RegExp(`${key}:\\s*([^;]+);`).exec(theme)?.[1] ?? '',
  }) })
  try {
    assert.equal(designTransition('flip').duration, .52)
    assert.equal(designTransition('flip').duration / 2, .26)
    assert.equal(designTransition('card-idle').duration, 6)
    assert.deepEqual(designTransition('flip').ease, [.32, .72, 0, 1])
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (oldStyle) Object.defineProperty(globalThis, 'getComputedStyle', oldStyle)
    else Reflect.deleteProperty(globalThis, 'getComputedStyle')
  }
})

test('visual surfaces use tokens and reduced motion has a static presentation', () => {
  assert.doesNotMatch(styles, /#[\da-f]{3,8}\b/i, 'Component styles must not contain literal colors')
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /\.hero-card-stage, \.hero-copy, \.reading-theme, \.art-moon \{ animation: none/)
  assert.doesNotMatch(styles, /@keyframes[^}]+(?:width:|height:|filter:)/)
})

test('font and identity artwork budgets stay bounded without remote imports', () => {
  const budget = (directory: string, suffix: string) => {
    const url = new URL(directory, import.meta.url)
    return readdirSync(url).filter(name => name.endsWith(suffix)).reduce((sum, name) => sum + statSync(new URL(name, url)).size, 0)
  }
  assert.ok(budget('../public/fonts/', '.woff2') < 125_000)
  assert.ok(budget('../public/assets/identity/', '.svg') < 10_000)
  assert.doesNotMatch(theme + styles, /https?:\/\//)
})

test('Home entrance keeps controls independent and offers a static mobile/reduced mode', () => {
  const motion = readFileSync(new URL('../src/styles/home-motion.css', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(motion, /pointer-events:\s*none[^}]*\.hero-actions/)
  assert.doesNotMatch(motion, /\.hero-actions\s*\{[^}]*(opacity|visibility|animation):/)
  assert.match(motion, /--home-card-delay: 3s/)
  assert.match(motion, /\.hero-card-float, \.hero-card-float::before \{ animation: none/)
  assert.match(motion, /prefers-reduced-motion: reduce/)
  assert.match(motion, /animation: none !important/)
  assert.doesNotMatch(motion, /url\(/)
  assert.match(home, /variant="thumb"/)
  assert.match(home, /aria-label=\{t\('app.brand'\)\}/)
})

test('immersive depth stays decorative and does not introduce a render loop or remote assets', () => {
  const scene = readFileSync(new URL('../src/components/immersive/RitualScene.tsx', import.meta.url), 'utf8')
  const depth = readFileSync(new URL('../src/components/immersive/useHeroDepth.ts', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/styles/immersive-3d.css', import.meta.url), 'utf8')
  assert.match(scene, /aria-hidden="true"/)
  assert.match(css, /pointer-events: none/)
  assert.doesNotMatch(scene + css, /https?:\/\//)
  assert.match(depth, /\(pointer: fine\)/)
  assert.match(depth, /cancelAnimationFrame\(frame\)/)
  assert.match(depth, /removeEventListener\('pointermove'/)
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(css, /\.identity-home \{ overflow-x: clip; \}/)
})

test('every deck has a distinct silhouette and readable dark reading palette', async () => {
  const { DECK_SIGNATURES } = await import('../src/atmosphere/signatures.ts')
  const { ALL_DECK_IDS } = await import('../src/decks/ids.ts')
  assert.deepEqual(Object.keys(DECK_SIGNATURES).sort(), [...ALL_DECK_IDS].sort())
  assert.equal(new Set(Object.values(DECK_SIGNATURES).map(s => s.motif)).size, ALL_DECK_IDS.length)
  const luminance = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i]!, 0)
  for (const [id, palette] of Object.entries(DECK_SIGNATURES)) {
    for (const bg of [palette.paper, palette.raised]) {
      assert.ok(luminance(bg) < .09, `${id}: reading surface should remain dark`)
      for (const fg of [palette.text, palette.secondary, palette.accent]) {
        const ratio = (luminance(fg) + .05) / (luminance(bg) + .05)
        assert.ok(ratio >= 4.5, `${id}: contrast ${ratio}`)
      }
    }
  }
})
