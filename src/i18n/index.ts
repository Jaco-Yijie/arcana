/** i18n 对外入口。组件一律从这里 import，不要直接摸 store / boot。 */
export { I18nProvider } from './I18nProvider'
export type { I18nContextValue } from './I18nProvider'
export { useI18n, useT } from './useI18n'
export { bootI18n, loadLocale, resolveInitialLocale } from './boot'
export {
  LANGUAGE_STORAGE_KEY,
  getLocale,
  getMessages,
  translate,
  translateList,
} from './store'
export {
  DEFAULT_LOCALE,
  LOCALES,
  languageCode,
  localeFromLanguageCode,
  normalizeLocale,
} from './types'
export type { LanguageCode, Locale, Messages, TParams } from './types'
