import { useContext } from 'react'
import { SettingsContext } from '@/store/SettingsContext'

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用')
  return ctx
}
