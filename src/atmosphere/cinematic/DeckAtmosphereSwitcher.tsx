import type { CSSProperties } from 'react'
import { productionDecks } from '@/decks/registry'
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
      {/* 只列正式开放的五套。
          改造前这里遍历全部十套，把五套点不动的「筹备中」摆在首页 ——
          既让用户以为产品没做完，又和 Deck Library 里只有五套对不上。
          未完成的牌组不属于首页，属于 /dev/decks。 */}
      {productionDecks.map(({ deckId: id }) => (
        <button key={id} type="button" className="cinema-deck-option" data-deck-option={id}
          aria-pressed={id === deckId} disabled={busy}
          style={{ '--option-accent': cinematicProfile(id).palette.accent } as CSSProperties}
          onClick={() => { void select(id) }}>
          <DeckSigil deckId={id} size="1.35rem" opacity={0.8} /><span>{deckName(t, id)}</span>
        </button>
      ))}
    </div>
  </section>
}
