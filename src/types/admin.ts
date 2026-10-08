export type AdminRange = '7d' | '30d' | '90d'
export interface AdminOverview {
  totalUsers: number
  newUsersToday: number
  newUsers7d: number
  newUsers30d: number
  dau: number
  wau: number
  mau: number
  totalReadings: number
  readingsToday: number
  readings7d: number
  readings30d: number
  readingsPerActiveUser: number
  d1Retention: number | null
  d7Retention: number | null
  d30Retention: number | null
  averageRating: number | null
  feedbackCount: number
  timeZone: string
  generatedAt: string
}
export interface AdminTrend { date: string; newUsers: number; activeUsers: number; readings: number }
export interface AdminDeck { deckId: string; readings: number; percentage: number }
export interface AdminSpread { spreadType: string; readings: number; percentage: number }
export interface AdminFeedback { averageRating: number | null; total: number; distribution: Record<'1' | '2' | '3' | '4' | '5', number> }
export interface RetentionMeasure { eligible: number; returned: number; rate: number | null }
export interface AdminCohort { date: string; users: number; d1: RetentionMeasure; d7: RetentionMeasure; d30: RetentionMeasure }
export interface AdminRetention {
  d1: number | null
  d7: number | null
  d30: number | null
  denominators: { d1: number; d7: number; d30: number }
  cohorts: AdminCohort[]
}
