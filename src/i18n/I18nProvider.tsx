/**
 * i18n · React 绑定
 *
 * Provider 本身不持有语言 —— 真值在 `store.ts`（原因见那里的注释）。
 * 这里只做两件事：把 store 的变化接进 React 的渲染循环，
 * 以及提供一个会 await 资源加载的 `setLocale`。
 */

import { createContext, useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { loadLocale } from './boot'
import { applyLocale, getSnapshot, subscribe, translate, translateList, writeStoredLocale } from './store'
import type { Locale, Messages, TParams } from './types'

export interface I18nContextValue {
  locale: Locale
  messages: Messages
  /** 取一条文案。`t('reading.section.answer')` */
  t: (path: string, params?: TParams) => string
  /** 取一个字符串数组。`tList('reading.phase')` */
  tList: (path: string) => string[]
  /** 切换语言。资源没到位时先下载，期间 `switching` 为 true。 */
  setLocale: (next: Locale) => void
  switching: boolean
  error: boolean
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState(false)

  const setLocale = useCallback((next: Locale) => {
    // Browsers cache failed module graphs; an explicit retry reloads that graph.
    if (error) { writeStoredLocale(next); window.location.reload(); return }
    setError(false)
    /* 已加载过就同步切，连一帧的中间态都不给 */
    setSwitching(true)
    void loadLocale(next)
      .then(() => { applyLocale(next); writeStoredLocale(next) })
      .catch(() => setError(true))
      .finally(() => setSwitching(false))
  }, [error])

  const translators = useMemo(() => ({
    t: (path: string, params?: TParams) => translate(path, params, snap.messages),
    tList: (path: string) => translateList(path, snap.messages),
  }), [snap.messages])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale: snap.locale,
      messages: snap.messages,
      /* 显式传 messages：闭包捕获当前快照，避免并发渲染下读到下一门语言 */
      ...translators,
      setLocale,
      switching,
      error,
    }),
    [snap.locale, snap.messages, setLocale, switching, error, translators],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
