import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AccountError, accountRequest } from '@/features/auth/client'
import type { User } from '@/features/auth/client'
import { useI18n } from '@/i18n'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  authenticate: (register: boolean, email: string, password: string, confirmPassword?: string) => Promise<void>
  logout: () => Promise<void>
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const revision = useRef(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const refresh = useCallback(async () => {
    const current = ++revision.current
    try {
      const result = await accountRequest<{ user: User }>('/api/auth/me')
      if (current === revision.current) { setUser(result.user); setError(null) }
    } catch (cause) {
      if (current === revision.current) {
        setUser(null)
        setError(cause instanceof AccountError && cause.status === 401 ? null : 'service-unavailable')
      }
    } finally { if (current === revision.current) setLoading(false) }
  }, [])
  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('arcana-auth')
      channel.current.onmessage = onFocus
    }
    return () => { window.removeEventListener('focus', onFocus); channel.current?.close() }
  }, [refresh])
  const authenticate = async (register: boolean, email: string, password: string, confirmPassword?: string) => {
    ++revision.current
    const result = await accountRequest<{ user: User }>(`/api/auth/${register ? 'register' : 'login'}`, { email, password, confirmPassword })
    ++revision.current
    setUser(result.user); setError(null); setLoading(false)
    channel.current?.postMessage('changed')
  }
  const logout = async () => {
    await accountRequest('/api/auth/logout', {})
    ++revision.current
    setUser(null); setError(null)
    channel.current?.postMessage('changed')
  }
  return <AuthContext.Provider value={{ user, loading, error, refresh, authenticate, logout }}>
    {loading ? <div role="status" className="flex min-h-[100dvh] items-center justify-center text-note text-text-low">{t('auth.loading')}</div> : children}
  </AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
