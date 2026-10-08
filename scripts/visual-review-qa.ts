/** QA-only projection. Never imported by runtime or prompt assembly. */
import type { DeckCardVisualSemantics, VisualReviewEntry } from '../src/types/visualSemantics.ts'

export function applyQaReview(original: DeckCardVisualSemantics, review: VisualReviewEntry): DeckCardVisualSemantics {
  const overrides = (review as VisualReviewEntry & { qaOverrides?: Record<string, string> }).qaOverrides ?? {}
  const out = structuredClone(original)
  for (const [path, value] of Object.entries(overrides)) {
    const parts = path.split('.')
    let parent = out as unknown as Record<string, unknown>
    for (const part of parts.slice(0, -1)) {
      if (!Object.hasOwn(parent, part) || typeof parent[part] !== 'object' || parent[part] === null) throw new Error(`Invalid QA override path: ${path}`)
      parent = parent[part] as Record<string, unknown>
    }
    const key = parts.at(-1)!
    if (!Object.hasOwn(parent, key) || typeof parent[key] !== 'string' || typeof value !== 'string') throw new Error(`QA override must replace an existing string: ${path}`)
    parent[key] = value
  }
  return out
}
