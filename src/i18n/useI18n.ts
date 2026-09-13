import { useContext } from 'react'
import { I18nContext } from './I18nProvider'
import type { I18nContextValue } from './I18nProvider'

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n 必须在 I18nProvider 内使用')
  return ctx
}

/** 只要取词函数时用它 —— 少解构一层，调用点更短：`const t = useT()` */
export function useT(): I18nContextValue['t'] {
  return useI18n().t
}
