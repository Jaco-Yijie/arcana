import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { useSession } from '@/hooks/useSession'
import { listEntries } from '@/store/journalStore'
import { readJSON, writeJSON } from '@/utils/storage'
import { accountRequest } from './client'
import { useI18n } from '@/i18n'
import { Button } from '@/components/atoms/Button'
import type { TarotSession } from '@/types/session'

function readingPayload(session: TarotSession) {
  return {
    client_session_id: session.id,
    deck_id: session.deckId,
    spread_type: session.spreadId,
    question: session.usedOptimized && session.optimizedQuestion ? session.optimizedQuestion : session.question,
    cards: session.placements.map(p => ({ ...session.deck[p.deckIndex], positionId: p.positionId })),
    interpretation: JSON.stringify(session.structuredReading ?? session.reading),
    created_at: new Date(session.completedAt ?? session.updatedAt).toISOString(),
  }
}

const SyncContext = createContext({ status: 'idle', retry: () => {} })

export function ReadingSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { session } = useSession()
  const [status, setStatus] = useState('idle')
  const [attempt, setAttempt] = useState(0)
  const userId = user?.id
  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      if (!userId) { setStatus('idle'); return }
      const key = `arcana.synced-readings.${userId}`
      const stored = readJSON<string[]>(key, [])
      const saved = new Set(Array.isArray(stored) ? stored : [])
      const entries = listEntries()
      if (session?.reading && !entries.some(entry => entry.id === session.id)) entries.unshift(session)
      const pending = entries.filter(entry => entry.userId === userId && entry.status === 'completed' && entry.reading && !saved.has(entry.id))
      if (!pending.length) { setStatus('saved'); return }
      setStatus('saving')
      try {
        for (const entry of pending) {
          if (cancelled) return
          await accountRequest('/api/readings', readingPayload(entry), userId)
          if (cancelled) return
          saved.add(entry.id)
          writeJSON(key, [...saved].slice(-200))
        }
        setStatus('saved')
      } catch { if (!cancelled) setStatus('error') }
    }
    void sync()
    return () => { cancelled = true }
  }, [userId, session, attempt])
  useEffect(() => {
    const retry = () => setAttempt(value => value + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])
  return <SyncContext.Provider value={{ status, retry: () => setAttempt(value => value + 1) }}>{children}</SyncContext.Provider>
}

export function ReadingSyncStatus() {
  const { status, retry } = useContext(SyncContext)
  const { session } = useSession()
  const { user } = useAuth()
  const { t } = useI18n()
  if (!session?.reading) return null
  if (!session.userId) return <p className="text-note text-text-low">{t('auth.guestReading')} <Link to="/login" className="text-silver">{t('auth.login')}</Link></p>
  if (session.userId !== user?.id) return <p role="status" className="text-note text-text-low">{t('auth.syncAccount')}</p>
  return <div role="status" className="text-note text-text-low">
    <p>{t(`auth.sync.${status}`)}</p>
    {status === 'error' && <Button variant="quiet" onClick={retry}>{t('auth.retry')}</Button>}
  </div>
}

export function AccountSyncNotice() {
  const { status, retry } = useContext(SyncContext)
  const { user } = useAuth()
  const { t } = useI18n()
  if (!user || (status !== 'saving' && status !== 'error')) return null
  return <div role="status" className="py-3 text-note text-text-low">
    <p>{t(`auth.sync.${status}`)}</p>
    {status === 'error' && <Button variant="quiet" onClick={retry}>{t('auth.retry')}</Button>}
  </div>
}
