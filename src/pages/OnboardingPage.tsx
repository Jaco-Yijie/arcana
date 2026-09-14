import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { DeckSigil } from '@/components/deck/DeckSigil'
import { useDeck } from '@/hooks/useDeck'
import { useI18n } from '@/i18n'
import { completeOnboarding } from '@/features/onboarding/state'

export default function OnboardingPage() {
  const { t, tList } = useI18n()
  const { deckId } = useDeck()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const review = params.get('from') === 'settings'
  const random = params.get('mode') === 'random'
  const [step, setStep] = useState(0)
  const [storageWarning, setStorageWarning] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const keys = ['question', 'spread', 'reading'] as const
  const current = keys[step]
  useEffect(() => { heading.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }) }, [step])
  const enter = () => navigate(review ? '/settings' : `/question?mode=${random ? 'random' : 'question'}`, { replace: true })
  const finish = () => {
    if (storageWarning || completeOnboarding()) enter()
    else setStorageWarning(true)
  }
  return (
    <AppShell back={review ? '/settings' : '/'}>
      <article className="tarot-guide">
        <DeckSigil deckId={deckId} size="4rem" opacity={0.55} />
        <p className="eyebrow">{t('onboarding.eyebrow')}</p>
        <ol className="tarot-guide-progress" aria-label={t('onboarding.progress')}>
          {keys.map((key, i) => <li key={key} aria-current={i === step ? 'step' : undefined}>
            <span aria-hidden="true">0{i + 1}</span><span className="sr-only">{t(`onboarding.${key}.title`)}</span>
          </li>)}
        </ol>
        <h1 ref={heading} tabIndex={-1} className="tarot-guide-title">{t(`onboarding.${current}.title`)}</h1>
        <p className="tarot-guide-copy">{t(`onboarding.${current}.body`)}</p>
        {step === 0 && <ul className="tarot-guide-topics">{tList('onboarding.question.topics').map(topic=><li key={topic}>{topic}</li>)}</ul>}
        {step === 1 && <div className="tarot-guide-spreads">
          {(['single', 'three'] as const).map((kind, i) => <section key={kind}>
            <div className="tarot-guide-cards" aria-hidden="true">{Array.from({length:i === 0 ? 1 : 3},(_,n)=><span key={n}>✦</span>)}</div>
            <h2 className="ritual-heading">{t(`onboarding.spread.${kind}.title`)}</h2>
            <p>{t(`onboarding.spread.${kind}.body`)}</p>
          </section>)}
        </div>}
        {step === 2 && <ol className="tarot-journey">{tList('introduction.flow').map((label,i)=><li key={i}><span className="eyebrow" aria-hidden="true">0{i+1}</span><span>{label}</span></li>)}</ol>}
        <div className="tarot-guide-actions">
          {storageWarning && <p role="status" className="text-note text-text-low">{t('onboarding.storageWarning')}</p>}
          <Button size="lg" variant="primary" block onClick={step < 2 ? () => setStep(step + 1) : finish}>
            {step < 2 ? t('onboarding.next') : review ? t('onboarding.returnSettings') : t('onboarding.begin')}
          </Button>
          {step > 0 && <Button variant="quiet" block onClick={() => {setStep(step - 1);setStorageWarning(false)}}>{t('onboarding.previous')}</Button>}
        </div>
      </article>
    </AppShell>
  )
}
