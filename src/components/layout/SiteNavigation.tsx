import { useRef } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/identity/LanguageSwitcher'
import { needsOnboarding } from '@/features/onboarding/state'
import { useI18n } from '@/i18n'

export function SiteNavigation() {
  const { t } = useI18n()
  const menu = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const close = () => { if (menu.current) menu.current.open = false }
  const links = <>
    <NavLink to="/what-is-tarot" className="site-nav-tarot" onClick={close}>{t('navigation.tarot')}</NavLink>
    <NavLink to="/decks" onClick={close}>{t('home.nav.decks')}</NavLink>
    <Link to={needsOnboarding() ? '/guide' : '/decks'} className="site-nav-begin" onClick={close}>{t('navigation.begin')}</Link>
  </>
  return (
    <header className="site-navigation">
      <Link to="/" className="site-nav-brand" onClick={close}>{t('app.brand')}</Link>
      <nav className="site-nav-desktop" aria-label={t('navigation.label')}>
        {links}<LanguageSwitcher />
      </nav>
      <details ref={menu} className="site-nav-mobile" onKeyDown={event => {
        if (event.key === 'Escape') { close(); summary.current?.focus() }
      }}>
        <summary ref={summary}>{t('navigation.menu')}</summary>
        <nav className="site-nav-panel" aria-label={t('navigation.label')}>
          {links}
          <NavLink to="/journal" onClick={close}>{t('home.nav.journal')}</NavLink>
          <NavLink to="/settings" onClick={close}>{t('home.nav.settings')}</NavLink>
          <LanguageSwitcher size="md" />
        </nav>
      </details>
    </header>
  )
}
