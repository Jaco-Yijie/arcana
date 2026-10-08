import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { useI18n } from '@/i18n'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useI18n()
  if (!user) return <Navigate to="/login" state={{ returnTo: '/admin' }} replace />
  if (user.role !== 'admin') return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 p-6">
    <h1 className="text-xl">{t('admin.forbidden')}</h1>
    <p role="alert">{t('admin.forbiddenNote')}</p>
    <Link to="/" className="text-silver">{t('admin.back')}</Link>
  </main>
  return children
}
