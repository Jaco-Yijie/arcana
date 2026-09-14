import { readJSON, StorageKeys } from '@/utils/storage'

export const ONBOARDING_KEY = 'arcana:onboarding-completed'
let completedThisVisit = false

export function hasCompletedOnboarding(): boolean {
  return completedThisVisit || readJSON<boolean>(ONBOARDING_KEY, false) === true
}

/** Existing readers keep their familiar entry path after this feature ships. */
export function needsOnboarding(): boolean {
  if (hasCompletedOnboarding()) return false
  const guidance = readJSON<{ completedOnce?: boolean } | null>(StorageKeys.guidance, null)
  if (guidance?.completedOnce) return false
  const active = readJSON<{ id?: string } | null>(StorageKeys.activeSession, null)
  if (active?.id) return false
  const journal = readJSON<unknown>(StorageKeys.journal, [])
  return !(Array.isArray(journal) && journal.length > 0)
}

export function completeOnboarding(): boolean {
  completedThisVisit = true
  try {
    window.localStorage.setItem(ONBOARDING_KEY, 'true')
    return true
  } catch {
    return false
  }
}
