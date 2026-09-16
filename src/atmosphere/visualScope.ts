import type { CSSProperties } from 'react'
import type { DeckId } from '@/decks/ids'
import { getDeck } from '@/decks/registry'
import { getAtmosphere } from './registry'
import { readingVars } from './signatures'

export function deckVisualScope(deckId: DeckId): CSSProperties {
  return { ...getAtmosphere(getDeck(deckId).atmosphereId).themeVars, ...readingVars(deckId) } as CSSProperties
}
