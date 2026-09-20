import type { CSSProperties } from 'react'
import { decks } from '@/decks/registry'
import { isDeckPlayable } from '@/decks/artwork/resolver'
import { useI18n } from '@/i18n'
import { deckName } from '@/i18n/domain'
import { DeckSigil } from '@/components/deck/DeckSigil'
import type { DeckId } from '@/decks/ids'
import { cinematicProfile } from './profiles'
export function DeckAtmosphereSwitcher({ deckId, busy, failed, select }: {
  deckId: DeckId; busy: boolean; failed: boolean; select: (id: DeckId) => Promise<void>
}) {
  const { t } = useI18n()
  return <section className="cinema-switcher" aria-label={t('cinematic.choose')} aria-busy={busy}>
    <div className="cinema-switcher-heading"><span>{t('cinematic.choose')}</span><span role="status" aria-live="polite">{failed ? t('cinematic.failed') : busy ? t('cinematic.entering') : t('cinematic.hint')}</span></div>
    <div className="cinema-deck-list">
      {[...decks].sort((a, b) => Number(isDeckPlayable(b.deckId)) - Number(isDeckPlayable(a.deckId))).map(({ deckId: id }) => {
        const playable = isDeckPlayable(id)
        return <button key={id} type="button" className="cinema-deck-option" data-deck-option={id}
          aria-pressed={id === deckId} disabled={busy || !playable}
          style={{ '--option-accent': cinematicProfile(id).palette.accent } as CSSProperties}
          onClick={() => { void select(id) }}>
          <DeckSigil deckId={id} size="1.35rem" opacity={0.8} /><span>{deckName(t, id)}{!playable && <small>{t('cinematic.unavailable')}</small>}</span>
        </button>
      })}
    </div>
  </section>
}
