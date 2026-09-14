import { useI18n } from '@/i18n'

export function TarotIntroduction() {
  const { t, tList } = useI18n()
  return (
    <div className="tarot-manual-chapters">
      <section className="tarot-intro-chapter" aria-labelledby="tarot-reflection-title">
        <span className="eyebrow" aria-hidden="true">01</span>
        <h2 id="tarot-reflection-title" className="ritual-heading ritual-heading-marked">{t('tarotPage.reflectionTitle')}</h2>
        <p>{t('tarotPage.reflection')}</p>
        <ul className="tarot-guide-topics">{tList('tarotPage.perspectives').map(item => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="tarot-intro-chapter" aria-labelledby="tarot-process-title">
        <span className="eyebrow" aria-hidden="true">02</span>
        <h2 id="tarot-process-title" className="ritual-heading ritual-heading-marked">{t('introduction.howTitle')}</h2>
        <ol className="tarot-journey">
          {tList('tarotPage.flow').map((label, i) => (
            <li key={i}><span className="eyebrow" aria-hidden="true">0{i + 1}</span><span>{label}</span></li>
          ))}
        </ol>
      </section>
      <section className="tarot-intro-chapter" aria-labelledby="tarot-cards-title">
        <span className="eyebrow" aria-hidden="true">03</span>
        <h2 id="tarot-cards-title" className="ritual-heading ritual-heading-marked">{t('tarotPage.cardsTitle')}</h2>
        <div className="tarot-arcana-pair">
          {(['major', 'minor'] as const).map((kind, i) => <div key={kind}>
            <span className="tarot-arcana-number" aria-hidden="true">{i === 0 ? '22' : '56'}</span>
            <h3 className="ritual-heading">{t(`tarotPage.${kind}.title`)}</h3>
            <p>{t(`tarotPage.${kind}.body`)}</p>
          </div>)}
        </div>
      </section>
      <section className="tarot-intro-chapter" aria-labelledby="tarot-questions-title">
        <span className="eyebrow" aria-hidden="true">04</span>
        <h2 id="tarot-questions-title" className="ritual-heading ritual-heading-marked">{t('introduction.askTitle')}</h2>
        <p>{t('introduction.ask')}</p>
        <dl className="tarot-question-example">
          <div><dt>{t('introduction.lessHelpful')}</dt><dd>{t('introduction.before')}</dd></div>
          <div><dt>{t('introduction.moreHelpful')}</dt><dd>{t('tarotPage.betterQuestion')}</dd></div>
        </dl>
      </section>
    </div>
  )
}
