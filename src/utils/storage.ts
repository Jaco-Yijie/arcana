/**
 * localStorage 封装。
 * MVP 阶段所有持久化都走这里 —— 不接云数据库、不接账号系统。
 * 所有读取都必须容错：用户可能手动清过 storage，或数据来自旧版本。
 */

const PREFIX = 'arcana:'

export const StorageKeys = {
  activeSession: `${PREFIX}active-session`,
  journal: `${PREFIX}journal`,
  settings: `${PREFIX}settings`,
  /**
   * 当前牌组（schema v2）。
   *
   * 【为什么要换 key 而不是原地迁移】
   * V2.4 的 `arcana:deck` 里存的是 moonlight/classic/forest/celestial/shadow，
   * 而新版本里 `classic` 是**另一副完全不同的牌**（还没画完、不能抽）。
   * 复用同一个 key 会让老用户的选择被静默解析成一副错误的牌。
   * 换 key 之后，v1 的值只会经 resolveDeckId 映射到 legacy-*，不会误判。
   */
  deck: `${PREFIX}deck-v2`,
  /** V2.4 的旧 key。只读不写，保留原值以便映射表将来可修正 */
  deckV1: `${PREFIX}deck`,
  guidance: `${PREFIX}guidance`,
} as const

function available(): boolean {
  try {
    const probe = `${PREFIX}__probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

const canUse = typeof window !== 'undefined' && available()

/** 读取并解析；任何异常都退回 fallback，不让坏数据阻断流程 */
export function readJSON<T>(key: string, fallback: T): T {
  if (!canUse) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (!canUse) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 配额满或隐私模式：静默失败，不影响当前抽牌流程
  }
}

export function remove(key: string): void {
  if (!canUse) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}
