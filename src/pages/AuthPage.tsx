import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { useAuth } from '@/store/AuthContext'
import { AccountError } from '@/features/auth/client'
import { useI18n } from '@/i18n'

export default function AuthPage() {
  const { pathname, state } = useLocation()
  const register = pathname === '/register'
  const { user, loading, authenticate, logout, error: authError, refresh } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (register && password !== confirmation) { setError('password-mismatch'); return }
    setBusy(true); setError(null)
    try {
      await authenticate(register, email, password, confirmation)
      setPassword(''); setConfirmation('')
      navigate(state?.returnTo === '/admin' ? '/admin' : '/', { replace: true })
    } catch (cause) { setError(cause instanceof AccountError ? cause.message : 'service-unavailable') }
    finally { setBusy(false) }
  }
  const signOut = async () => {
    setBusy(true); setError(null)
    try { await logout() } catch { setError('service-unavailable') }
    finally { setBusy(false) }
  }
  return <AppShell back="/" centered title={t('auth.account')}>
    <section className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <span className="reading-ornament text-center" aria-hidden="true">✦</span>
      <h1 className="ritual-heading text-center">{t(user ? 'auth.account' : register ? 'auth.register' : 'auth.login')}</h1>
      {loading ? <p role="status">{t('auth.loading')}</p> : user ? <>
        <p className="text-center text-text-low break-all">{user.email}</p>
        <Link to="/journal" className="text-center text-silver">{t('home.nav.journal')}</Link>
        <Button onClick={signOut} disabled={busy}>{t('auth.logout')}</Button>
      </> : <>
        <p className="text-center text-note text-text-low">{t('auth.description')}</p>
        {authError && <div role="alert"><p>{t('auth.errors.service-unavailable')}</p><Button variant="quiet" onClick={() => { void refresh() }}>{t('auth.retry')}</Button></div>}
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Input label={t('auth.email')} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
          <Input label={t('auth.password')} type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : 1} maxLength={128} hint={register ? t('auth.passwordHint') : undefined} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
          {register && <Input label={t('auth.confirmPassword')} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} />}
          <Button type="submit" variant="primary" block disabled={busy}>{t(busy ? 'auth.loading' : register ? 'auth.register' : 'auth.login')}</Button>
        </form>
        <Link className="text-center text-note text-silver" to={register ? '/login' : '/register'} onClick={() => { setError(null); setPassword(''); setConfirmation('') }}>{t(register ? 'auth.haveAccount' : 'auth.createAccount')}</Link>
      </>}
      {error && <p role="alert" className="text-note text-caution">{t(`auth.errors.${error}`)}</p>}
    </section>
  </AppShell>
}
