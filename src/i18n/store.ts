/**
 * i18n · 运行时（框架无关的一层）
 *
 * 【为什么不是纯 React Context】
 * 有三处需要在组件之外读语言：
 *   · `buildReadingRequest`（把 language 放进解读请求）
 *   · `utils/format`（日期与相对时间）
 *   · `data/deck/localized`（牌义覆盖层）
 * 让它们全部改成 hook 会把语言这件事扩散成一堆 prop 钻透。
 * 所以真值放在这个模块级 store 里，React 侧只是订阅它（见 I18nProvider）。
 *
 * 【语言切换不重载页面】
 * `setLocale` 换掉消息树后通知订阅者，React 整棵树重渲染。
 * 会话、已抽的牌、日记一律不动 —— 换语言是换一层皮，不是重开一局。
 */

import { DEFAULT_LOCALE, normalizeLocale } from './types'
import type { Locale, Messages, TParams } from './types'
import zhCN from './locales/zh-CN.json'

/** localStorage 键。值形如 `zh-CN` / `en-US`，也容忍历史上的 `zh` / `en`。 */
export const LANGUAGE_STORAGE_KEY = 'arcana:language'

const BUNDLES: Partial<Record<Locale, Messages>> = { 'zh-CN': zhCN }

let currentLocale: Locale = DEFAULT_LOCALE
let currentMessages: Messages = zhCN

type Listener = () => void
const listeners = new Set<Listener>()

/** 版本号只用于让 useSyncExternalStore 感知变化 —— 消息树是同一个对象引用时也能触发 */
let version = 0
let snapshot = { locale: currentLocale, messages: currentMessages, version }

function emit(): void {
  version += 1
  snapshot = { locale: currentLocale, messages: currentMessages, version }
  for (const l of listeners) l()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): { locale: Locale; messages: Messages; version: number } {
  return snapshot
}

export function getLocale(): Locale {
  return currentLocale
}

export function getMessages(): Messages {
  return currentMessages
}

export function isLoaded(locale: Locale): boolean {
  return BUNDLES[locale] !== undefined
}

export function registerBundle(locale: Locale, messages: Messages): void {
  BUNDLES[locale] = messages
}

/**
 * 应用一个**已经加载好**的语言。加载由 `boot.ts` 负责 ——
 * 这里刻意是同步的，因为 React 侧不该出现「切了语言但界面还是旧的」这个中间态。
 */
export function applyLocale(locale: Locale): void {
  const bundle = BUNDLES[locale]
  if (!bundle) return
  if (currentLocale === locale) return
  currentLocale = locale
  currentMessages = bundle
  syncDocumentLang()
  emit()
}

/** 首次启动时用（此时 currentLocale 还是默认值，applyLocale 的短路判断会挡住它） */
export function initLocale(locale: Locale): void {
  const bundle = BUNDLES[locale]
  if (!bundle) return
  currentLocale = locale
  currentMessages = bundle
  syncDocumentLang()
  emit()
}

/* ── 为什么这里不直接写 `document` / `window` ──
   这个模块被服务端也间接引用（safety.ts / format.ts 那条链上有它），
   而 tsconfig.server.json 的 lib 是 `["ES2023"]` —— 刻意不含 DOM，
   那条边界本身是有意义的：服务端代码不该能碰到浏览器 API。
   所以这里通过 globalThis 做一次窄化访问：运行期行为不变，
   类型上也不需要为一个可选依赖把整个服务端项目拉进 DOM。 */
interface BrowserGlobals {
  document?: {
    documentElement: { lang: string; dataset: Record<string, string> }
  }
  localStorage?: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  }
}
const browser = globalThis as unknown as BrowserGlobals

/**
 * `<html lang>` 与语言保持一致。
 * 不只是语义标注：CJK 与拉丁的断行、字距、字体回退都受它影响，
 * 而且屏幕阅读器换不换发音全看这一个属性。
 * `data-locale` 供 CSS 用 —— 中英文的字距与行高规则不一样（见 theme.css）。
 */
function syncDocumentLang(): void {
  const root = browser.document?.documentElement
  if (!root) return
  root.lang = currentMessages.meta.htmlLang
  root.dataset.locale = currentLocale
}

export function readStoredLocale(): Locale | null {
  try {
    return normalizeLocale(browser.localStorage?.getItem(LANGUAGE_STORAGE_KEY) ?? null)
  } catch {
    return null
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    browser.localStorage?.setItem(LANGUAGE_STORAGE_KEY, locale)
  } catch {
    /* 无痕模式 / 配额满：这次会话仍然是新语言，只是下次打开记不住 */
  }
}

/* ══════════════════════════════════════════════════════════════
 * 取词
 * ══════════════════════════════════════════════════════════ */

function lookup(messages: Messages, path: string): unknown {
  let node: unknown = messages
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

function interpolate(text: string, params?: TParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  )
}

/**
 * 取一条文案。
 *
 * 【找不到时返回 key 本身，不抛错】
 * 抛错会让一个漏翻的标签炸掉整页。返回 key 反而醒目 ——
 * 屏幕上出现 `reading.section.pattern` 一眼就知道漏了哪一条，
 * 而 i18n:check 在构建期本来就应该先拦住它。
 */
export function translate(path: string, params?: TParams, messages = currentMessages): string {
  const value = lookup(messages, path)
  if (typeof value === 'string') return interpolate(value, params)
  if (typeof value === 'number') return String(value)
  return path
}

/** 取一个字符串数组（例如 reading.phase 的四段状态文案） */
export function translateList(path: string, messages = currentMessages): string[] {
  const value = lookup(messages, path)
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

/** 这条 key 存在吗。用于「有英文就渲染、没有就整段不渲染」的场景 */
export function hasKey(path: string, messages = currentMessages): boolean {
  return typeof lookup(messages, path) === 'string'
}

export function getMessagesForLocale(locale: Locale): Messages {
  const messages = BUNDLES[locale]
  if (!messages) throw new Error('Language resources not loaded')
  return messages
}
