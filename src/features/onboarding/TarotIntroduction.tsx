import { useI18n } from '@/i18n'

export function TarotIntroduction() {
  const { t, tList } = useI18n()
  return (
    <section className="tarot-introduction" aria-labelledby="tarot-intro-title">
      <div className="tarot-intro-opening">
        <span className="reading-ornament" aria-hidden="true">✦</span>
        <h2 id="tarot-intro-title" className="ritual-heading">{t('introduction.whatTitle')}</h2>
        <p>{t('introduction.what')}</p>
      </div>
      <div className="tarot-intro-chapter">
        <h2 className="ritual-heading ritual-heading-marked">{t('introduction.howTitle')}</h2>
        <ol className="tarot-journey">
          {tList('introduction.flow').map((label, i) => (
            <li key={i}><span className="eyebrow" aria-hidden="true">0{i + 1}</span><span>{label}</span></li>
          ))}
        </ol>
      </div>
      <div className="tarot-intro-chapter">
        <h2 className="ritual-heading ritual-heading-marked">{t('introduction.askTitle')}</h2>
        <p>{t('introduction.ask')}</p>
        <dl className="tarot-question-example">
          <div><dt>{t('introduction.lessHelpful')}</dt><dd>{t('introduction.before')}</dd></div>
          <div><dt>{t('introduction.moreHelpful')}</dt><dd>{t('introduction.after')}</dd></div>
        </dl>
      </div>
    </section>
  )
}
