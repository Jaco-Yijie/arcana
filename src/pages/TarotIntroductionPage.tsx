import { Link } from 'react-router-dom'
import { SiteNavigation } from '@/components/layout/SiteNavigation'
import { WIDTH_STYLE } from '@/components/layout/AppShell'
import { ArtBackdrop } from '@/components/identity/ArtBackdrop'
import { DeckSigil } from '@/components/deck/DeckSigil'
import { TarotIntroduction } from '@/features/tarot/TarotIntroduction'
import { needsOnboarding } from '@/features/onboarding/state'
import { useDeck } from '@/hooks/useDeck'
import { useI18n } from '@/i18n'

export default function TarotIntroductionPage() {
  const { t } = useI18n()
  const { deckId } = useDeck()
  return (
    <div className="tarot-manual relative isolate mx-auto min-h-[100dvh] px-5" style={{maxWidth: WIDTH_STYLE.gallery}}>
      <ArtBackdrop variant="page" />
      <SiteNavigation />
      <main className="tarot-manual-content">
        <header className="tarot-manual-hero">
          <DeckSigil deckId={deckId} size="5rem" opacity={0.6} />
          <p className="eyebrow">{t('tarotPage.eyebrow')}</p>
          <h1>{t('introduction.whatTitle')}</h1>
          <p>{t('tarotPage.subtitle')}</p>
          <div className="tarot-manual-emblem" aria-hidden="true"><span>☽</span><span>✦</span><span>☉</span></div>
        </header>
        <TarotIntroduction />
        <section className="tarot-manual-cta" aria-labelledby="tarot-ready-title">
          <span className="reading-ornament" aria-hidden="true">✦</span>
          <h2 id="tarot-ready-title" className="ritual-heading">{t('tarotPage.ready')}</h2>
          <Link to={needsOnboarding() ? '/guide' : '/decks'} className="ritual-button ritual-button-primary ritual-corner tarot-manual-begin">
            {t('navigation.begin')}
          </Link>
        </section>
      </main>
    </div>
  )
}
