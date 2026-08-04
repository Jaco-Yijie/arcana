/**
 * Tarot Session（占卜会话）状态中心。
 *
 * 【最高优先原则的实现位置】
 * `startSession` 是**唯一**生成牌序与正逆位的地方：Session 一开始，78 张牌的顺序和每张的
 * 正逆位就已经全部确定并冻结。之后所有用户操作只做两件事：
 *   1. 对已存在的牌序做**用户驱动**的置换（洗牌手势 / 切牌位置）
 *   2. 从牌序中**按 index 取牌**（pickCard）
 * 本文件中除 `startSession` 外，任何函数都不得调用随机数（对应 AC-01 / G-01 / G-02）。
 *
 * 每次状态变更都同步写入 localStorage，保证「未完成 Session」可原样恢复（AC-08 / G-22）。
 */

import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  FollowUpMessage,
  InteractionEntropy,
  Reading,
  SessionMode,
  SessionStage,
  TarotSession,
} from '@/types/session'
import type { RandomThemeId } from '@/types/session'
import type { SpreadId } from '@/types/spread'
import {
  applyCut,
  applyShuffleGesture,
  buildHiddenDeck,
  createEntropy,
  createSeed,
} from '@/features/table/engine'
import type { CutResult, ShuffleGesture, ShuffleResult } from '@/features/table/engine'
import type { StructuredReading } from '@/types/reading'
import { allCards } from '@/data/deck'
import { getSpread } from '@/data/spreads'
import { StorageKeys, readJSON, remove, writeJSON } from '@/utils/storage'
import { upsertEntry } from '@/store/journalStore'
import { createId } from '@/utils/id'

export interface StartSessionInput {
  mode: SessionMode
  question: string
  optimizedQuestion: string | null
  usedOptimized: boolean
  theme: RandomThemeId | null
  /** 随缘模式牌阵固定为 single；带问题来时此刻还没选，为 null */
  spreadId: SpreadId | null
  stage: SessionStage
}

interface SessionContextValue {
  session: TarotSession | null
  /** 首页「未完成的抽牌」提示用 */
  hasUnfinished: boolean

  startSession: (input: StartSessionInput) => TarotSession
  discardSession: () => void
  patchSession: (patch: Partial<TarotSession>) => void
  goToStage: (stage: SessionStage) => void

  /** 用户的一次洗牌手势 —— 手势参数实质参与牌序置换，返回值供 UI 驱动错位重组动画 */
  shuffle: (gesture: ShuffleGesture) => ShuffleResult | null
  /** 洗牌次数（有效手势次数），来自 entropy，UI 用它决定「洗好了」是否出现 */
  shuffleCount: number
  markShuffled: () => void
  /** 用户指定的切牌位置（0–1） */
  cut: (ratio: number) => CutResult | null

  /** 用户从摊开的扇形中拿起第 deckIndex 张（纯查表，不含随机） */
  pickCard: (deckIndex: number) => void
  /** 把手上的牌放回牌堆 */
  returnCard: (deckIndex: number) => void
  /** 用户把手上的牌拖到某个牌位 */
  placeCard: (deckIndex: number, positionId: string) => void
  /** 未翻开时把牌从牌位拿回手上 */
  liftCard: (positionId: string) => void
  /** 用户主动翻开某个牌位的牌 */
  revealCard: (positionId: string) => void

  setReading: (reading: Reading, structuredReading?: StructuredReading | null) => void
  addFollowUp: (message: Omit<FollowUpMessage, 'id' | 'createdAt'>) => void
  /** 写入日记并结束会话 */
  completeSession: () => string | null
}

export const SessionContext = createContext<SessionContextValue | null>(null)

function loadSession(): TarotSession | null {
  const raw = readJSON<TarotSession | null>(StorageKeys.activeSession, null)
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.deck) || raw.deck.length === 0) {
    return null
  }
  return raw
}

function persist(session: TarotSession | null) {
  if (session) writeJSON(StorageKeys.activeSession, session)
  else remove(StorageKeys.activeSession)
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TarotSession | null>(() => loadSession())
  // 保存最新引用，供 completeSession 等需要读当前值的场景使用
  const sessionRef = useRef(session)
  sessionRef.current = session

  const commit = useCallback((updater: (prev: TarotSession) => TarotSession) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      if (next === prev) return prev
      const stamped = { ...next, updatedAt: Date.now() }
      persist(stamped)
      // 【G-23 / AC-09】日记必须自动保存。
      // 只要 Reading 已生成，这次占卜就算完成了 —— 从这一刻起每次状态变更都同步写入日记，
      // 用户看完解读直接关掉页面也不会丢。「存入日记」按钮只负责结束会话，不负责保存。
      if (stamped.status === 'completed') upsertEntry(stamped)
      sessionRef.current = stamped
      return stamped
    })
  }, [])

  const startSession = useCallback((input: StartSessionInput) => {
    const seed = createSeed()
    const now = Date.now()
    const next: TarotSession = {
      id: createId('ses'),
      createdAt: now,
      updatedAt: now,
      status: 'in-progress',
      stage: input.stage,
      mode: input.mode,
      question: input.question,
      optimizedQuestion: input.optimizedQuestion,
      usedOptimized: input.usedOptimized,
      theme: input.theme,
      deckId: 'dreamlike',
      spreadId: input.spreadId,
      shuffleSeed: seed,
      entropy: createEntropy(),
      // ↓ 全场唯一一次「决定牌序与正逆位」的调用
      deck: buildHiddenDeck(
        seed,
        allCards.map((c) => c.id),
      ),
      shuffled: false,
      cut: false,
      drawn: [],
      placements: [],
      reading: null,
      followUps: [],
      mood: null,
      note: null,
      outcome: null,
    }
    persist(next)
    sessionRef.current = next
    setSession(next)
    return next
  }, [])

  const discardSession = useCallback(() => {
    persist(null)
    sessionRef.current = null
    setSession(null)
  }, [])

  const patchSession = useCallback(
    (patch: Partial<TarotSession>) => commit((prev) => ({ ...prev, ...patch })),
    [commit],
  )

  const goToStage = useCallback(
    (stage: SessionStage) => commit((prev) => (prev.stage === stage ? prev : { ...prev, stage })),
    [commit],
  )

  /**
   * 同步计算 —— 因为洗牌页需要立刻拿到 cutPoint / packets 来驱动「错位重组」动画。
   * 计算完再 commit，保证 UI 动画与真实牌序变化是同一件事。
   */
  const shuffle = useCallback(
    (gesture: ShuffleGesture): ShuffleResult | null => {
      const prev = sessionRef.current
      if (!prev) return null
      const result = applyShuffleGesture(prev.deck, prev.entropy, gesture, prev.shuffleSeed)
      if (!result.applied) return result
      commit((s) => ({ ...s, deck: result.deck, entropy: result.entropy, shuffled: true }))
      return result
    },
    [commit],
  )

  const markShuffled = useCallback(
    () => commit((prev) => ({ ...prev, shuffled: true, stage: 'cut' })),
    [commit],
  )

  /** 同步计算，UI 需要 cutIndex 才能把牌堆画成上下两叠 */
  const cut = useCallback(
    (ratio: number): CutResult | null => {
      const prev = sessionRef.current
      if (!prev) return null
      const result = applyCut(prev.deck, ratio, prev.entropy)
      commit((s) => ({ ...s, deck: result.deck, entropy: result.entropy, cut: true }))
      return result
    },
    [commit],
  )

  const pickCard = useCallback(
    (deckIndex: number) =>
      commit((prev) => {
        if (prev.drawn.some((d) => d.deckIndex === deckIndex)) return prev
        if (prev.placements.some((p) => p.deckIndex === deckIndex)) return prev
        return { ...prev, drawn: [...prev.drawn, { deckIndex, pickedAt: Date.now() }] }
      }),
    [commit],
  )

  const returnCard = useCallback(
    (deckIndex: number) =>
      commit((prev) => ({
        ...prev,
        drawn: prev.drawn.filter((d) => d.deckIndex !== deckIndex),
      })),
    [commit],
  )

  const placeCard = useCallback(
    (deckIndex: number, positionId: string) =>
      commit((prev) => {
        // 已翻开的牌位不可被覆盖（AC-06）
        const target = prev.placements.find((p) => p.positionId === positionId)
        if (target?.revealed) return prev
        const placements = prev.placements.filter(
          (p) => p.positionId !== positionId && p.deckIndex !== deckIndex,
        )
        placements.push({ positionId, deckIndex, revealed: false })
        return {
          ...prev,
          placements,
          drawn: prev.drawn.filter((d) => d.deckIndex !== deckIndex),
        }
      }),
    [commit],
  )

  const liftCard = useCallback(
    (positionId: string) =>
      commit((prev) => {
        const target = prev.placements.find((p) => p.positionId === positionId)
        // 翻开后不可替换（AC-06 / G-09）
        if (!target || target.revealed) return prev
        return {
          ...prev,
          placements: prev.placements.filter((p) => p.positionId !== positionId),
          drawn: [...prev.drawn, { deckIndex: target.deckIndex, pickedAt: Date.now() }],
        }
      }),
    [commit],
  )

  const revealCard = useCallback(
    (positionId: string) =>
      commit((prev) => ({
        ...prev,
        placements: prev.placements.map((p) =>
          p.positionId === positionId && !p.revealed
            ? { ...p, revealed: true, revealedAt: Date.now() }
            : p,
        ),
      })),
    [commit],
  )

  /**
   * Reading 生成即视为「这次占卜已完成」：status 转为 completed，
   * commit 会把它写进日记（见上方注释）。首页的「未完成的抽牌」提示也就自然消失。
   * 之后的追问、心情、笔记仍然会继续同步进日记。
   *
   * V2：结构化解读与 V1 投影**两份都写**。
   * `structuredReading` 供 Reading 页渲染，`reading` 供日记摘要 / 详情 / 分享页 ——
   * 那三处一行都没改，靠的就是这份投影。
   */
  const setReading = useCallback(
    (reading: Reading, structuredReading?: StructuredReading | null) =>
      commit((prev) => ({
        ...prev,
        reading,
        structuredReading: structuredReading ?? null,
        stage: 'reading',
        status: 'completed',
      })),
    [commit],
  )

  const addFollowUp = useCallback(
    (message: Omit<FollowUpMessage, 'id' | 'createdAt'>) =>
      commit((prev) => ({
        ...prev,
        followUps: [
          ...prev.followUps,
          { ...message, id: createId('msg'), createdAt: Date.now() },
        ],
      })),
    [commit],
  )

  /**
   * 结束会话。此时日记**早已**写好（Reading 生成时就写了），
   * 这里只做最后一次同步并清空 active session —— 用户点不点这个按钮都不影响记录留存。
   */
  const completeSession = useCallback(() => {
    const current = sessionRef.current
    if (!current) return null
    const finished: TarotSession = {
      ...current,
      status: 'completed',
      stage: 'done',
      updatedAt: Date.now(),
    }
    upsertEntry(finished)
    persist(null)
    sessionRef.current = null
    setSession(null)
    return finished.id
  }, [])

  const hasUnfinished = session !== null && session.status === 'in-progress'
  const shuffleCount = session?.entropy.shuffleCount ?? 0

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      hasUnfinished,
      shuffleCount,
      startSession,
      discardSession,
      patchSession,
      goToStage,
      shuffle,
      markShuffled,
      cut,
      pickCard,
      returnCard,
      placeCard,
      liftCard,
      revealCard,
      setReading,
      addFollowUp,
      completeSession,
    }),
    [
      session,
      hasUnfinished,
      shuffleCount,
      startSession,
      discardSession,
      patchSession,
      goToStage,
      shuffle,
      markShuffled,
      cut,
      pickCard,
      returnCard,
      placeCard,
      liftCard,
      revealCard,
      setReading,
      addFollowUp,
      completeSession,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

/** 供页面读取牌阵定义的便捷函数（放这里避免各页面重复判空） */
export function spreadOf(session: TarotSession | null) {
  return session?.spreadId ? getSpread(session.spreadId) : null
}

export type { InteractionEntropy }
