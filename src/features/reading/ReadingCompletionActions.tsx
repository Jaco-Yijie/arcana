import { Button } from '@/components/atoms/Button'
import { useI18n } from '@/i18n'

interface ReadingCompletionActionsProps {
  busy: boolean
  onNew: () => void
  onSave: () => void
  onShare: () => void
}

export function ReadingCompletionActions({ busy, onNew, onSave, onShare }: ReadingCompletionActionsProps) {
  const { t } = useI18n()
  return (
    <section className="reading-completion" aria-labelledby="reading-completion-title">
      <span className="reading-ornament" aria-hidden="true">✦</span>
      <h2 id="reading-completion-title" className="ritual-heading">{t('reading.completion.title')}</h2>
      <p className="reading-completion-note">{t('reading.completion.description')}</p>
      <Button variant="primary" size="lg" block disabled={busy} onClick={onNew}>
        {t('reading.completion.new')}
      </Button>
      <div className="reading-completion-secondary">
        <Button variant="ghost" disabled={busy} onClick={onSave}>{t('reading.completion.save')}</Button>
        <Button variant="quiet" disabled={busy} onClick={onShare}>{t('reading.completion.share')}</Button>
      </div>
      {busy && <p role="status" className="reading-completion-note">{t('reading.completion.busy')}</p>}
    </section>
  )
}
