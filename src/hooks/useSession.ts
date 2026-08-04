import { useContext } from 'react'
import { SessionContext } from '@/store/SessionContext'

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession 必须在 SessionProvider 内使用')
  return ctx
}
