/**
 * 塔罗日记存储（localStorage）。
 * 完整占卜结束时**自动**写入 —— 用户不需要点任何「保存」按钮（Guardrail G-23）。
 */

import type { JournalEntrySummary, TarotSession } from '@/types/session'
import { StorageKeys, readJSON, writeJSON } from '@/utils/storage'

/** 日记中保存的是一次已完成的 Session 全量快照 */
export type JournalEntry = TarotSession

const MAX_ENTRIES = 100

export function listEntries(): JournalEntry[] {
  const entries = readJSON<JournalEntry[]>(StorageKeys.journal, [])
  if (!Array.isArray(entries)) return []
  return entries.filter((e) => e && typeof e.id === 'string').sort((a, b) => b.createdAt - a.createdAt)
}

export function getEntry(id: string): JournalEntry | null {
  return listEntries().find((e) => e.id === id) ?? null
}

/** 写入或覆盖同 id 的记录 */
export function upsertEntry(session: TarotSession): void {
  const entries = listEntries().filter((e) => e.id !== session.id)
  entries.unshift(session)
  writeJSON(StorageKeys.journal, entries.slice(0, MAX_ENTRIES))
}

/** 用户事后补充：心情 / 笔记 / 后来发生了什么 */
export function patchEntry(
  id: string,
  patch: Partial<Pick<TarotSession, 'mood' | 'note' | 'outcome'>>,
): JournalEntry | null {
  const entries = listEntries()
  const index = entries.findIndex((e) => e.id === id)
  if (index === -1) return null
  const next: JournalEntry = { ...entries[index], ...patch, updatedAt: Date.now() }
  entries[index] = next
  writeJSON(StorageKeys.journal, entries)
  return next
}

export function deleteEntry(id: string): void {
  writeJSON(
    StorageKeys.journal,
    listEntries().filter((e) => e.id !== id),
  )
}

/** 列表页用的轻量摘要 */
export function toSummary(entry: JournalEntry): JournalEntrySummary {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    question: entry.usedOptimized && entry.optimizedQuestion ? entry.optimizedQuestion : entry.question,
    spreadId: entry.spreadId,
    mode: entry.mode,
    cards: entry.placements.map((p) => ({
      cardId: entry.deck[p.deckIndex]?.cardId ?? '',
      orientation: entry.deck[p.deckIndex]?.orientation ?? 'upright',
    })),
    headline: entry.reading?.headline[0] ?? '',
  }
}
