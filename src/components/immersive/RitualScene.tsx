import type { DeckId } from '@/decks/ids'
import { useEffectiveDeckId } from '@/hooks/useEffectiveDeck'
import { DECK_SIGNATURES } from '@/atmosphere/signatures'
import { SignatureArt } from '@/atmosphere/SignatureArt'

/** Decorative, deck-specific scene; never intercepts card gestures. */
export function RitualScene({ variant = 'hero', deckId }: { variant?: 'hero' | 'cover' | 'table'; deckId?: DeckId }) {
  const effective = useEffectiveDeckId()
  const id = deckId ?? effective
  const signature = DECK_SIGNATURES[id]
  return (
    <div className={`ritual-scene ritual-scene-${variant} deck-world`} data-motif={signature.motif} aria-hidden="true">
      <div className="ritual-horizon" />
      <SignatureArt deckId={id} />
      {(signature.motif === 'veil' || signature.motif === 'tide' || signature.motif === 'eclipse') && <div className="ritual-orb"><span /></div>}
    </div>
  )
}
