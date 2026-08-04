import { createContext, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppSettings, GuidanceState, GuidanceStep } from '@/types/settings'
import { DEFAULT_GUIDANCE, DEFAULT_SETTINGS } from '@/types/settings'
import { StorageKeys, readJSON, writeJSON } from '@/utils/storage'

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  guidance: GuidanceState
  /** 这一步是否应该显示「明显引导」。第二次以后自动弱化。 */
  shouldGuide: (step: GuidanceStep) => boolean
  markGuidanceSeen: (step: GuidanceStep) => void
  markCompletedOnce: () => void
  resetGuidance: () => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJSON<Partial<AppSettings>>(StorageKeys.settings, {}),
  }))
  const [guidance, setGuidance] = useState<GuidanceState>(() => ({
    ...DEFAULT_GUIDANCE,
    ...readJSON<Partial<GuidanceState>>(StorageKeys.guidance, {}),
  }))

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      writeJSON(StorageKeys.settings, next)
      return next
    })
  }, [])

  const persistGuidance = useCallback(
    (updater: (prev: GuidanceState) => GuidanceState) => {
      setGuidance((prev) => {
        const next = updater(prev)
        writeJSON(StorageKeys.guidance, next)
        return next
      })
    },
    [],
  )

  const shouldGuide = useCallback(
    (step: GuidanceStep) => settings.guidanceEnabled && !guidance.seen.includes(step),
    [settings.guidanceEnabled, guidance.seen],
  )

  const markGuidanceSeen = useCallback(
    (step: GuidanceStep) => {
      persistGuidance((prev) =>
        prev.seen.includes(step) ? prev : { ...prev, seen: [...prev.seen, step] },
      )
    },
    [persistGuidance],
  )

  const markCompletedOnce = useCallback(() => {
    persistGuidance((prev) => (prev.completedOnce ? prev : { ...prev, completedOnce: true }))
  }, [persistGuidance])

  const resetGuidance = useCallback(() => {
    persistGuidance(() => ({ ...DEFAULT_GUIDANCE }))
  }, [persistGuidance])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings,
      guidance,
      shouldGuide,
      markGuidanceSeen,
      markCompletedOnce,
      resetGuidance,
    }),
    [
      settings,
      updateSettings,
      guidance,
      shouldGuide,
      markGuidanceSeen,
      markCompletedOnce,
      resetGuidance,
    ],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
