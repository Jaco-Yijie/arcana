/**
 * 日期与文本格式化。
 *
 * 【为什么要接受 locale 而不是读全局】
 * 这几个函数被 journalStore 的纯数据路径也调用过，那里没有 React 上下文。
 * 传参让它们保持纯函数，同时默认值仍然是当前语言 —— 调用点忘了传也不会出错。
 */

import { DEFAULT_LOCALE } from '@/i18n/types'
import type { Locale } from '@/i18n/types'
import { getLocale, translate } from '@/i18n/store'

/* Intl.DateTimeFormat 实例化不便宜（每次约 0.1ms），日记列表一次要格式化
   几十条。按 locale 缓存，两门语言各建一次。 */
const DATE_FMT = new Map<Locale, Intl.DateTimeFormat>()
const TIME_FMT = new Map<Locale, Intl.DateTimeFormat>()

function dateFmt(locale: Locale): Intl.DateTimeFormat {
  let f = DATE_FMT.get(locale)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    DATE_FMT.set(locale, f)
  }
  return f
}

function timeFmt(locale: Locale): Intl.DateTimeFormat {
  let f = TIME_FMT.get(locale)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
    TIME_FMT.set(locale, f)
  }
  return f
}

/** 2025/03/14（zh-CN）/ 03/14/2025（en-US） */
export function formatDate(ts: number, locale: Locale = getLocale() ?? DEFAULT_LOCALE): string {
  return dateFmt(locale).format(new Date(ts))
}

/** 日期 + 时分 */
export function formatDateTime(ts: number, locale: Locale = getLocale() ?? DEFAULT_LOCALE): string {
  const d = new Date(ts)
  return `${dateFmt(locale).format(d)} ${timeFmt(locale).format(d)}`
}

/**
 * 「刚刚 / 12 分钟前 / 3 天前」。超过 7 天退回绝对日期。
 *
 * 刻意不用 `Intl.RelativeTimeFormat`：它在中文下给出的是「3天前」（无空格）
 * 与「1周前」，与本站其他数值排版的空格规则不一致，而这几条文案本来就
 * 在 i18n 资源里，直接取词更可控。
 */
export function formatRelative(
  ts: number,
  locale: Locale = getLocale() ?? DEFAULT_LOCALE,
  now = Date.now(),
): string {
  const diff = now - ts
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour

  if (diff < min) return translate('time.justNow')
  if (diff < hour) return translate('time.minutesAgo', { n: Math.floor(diff / min) })
  if (diff < day) return translate('time.hoursAgo', { n: Math.floor(diff / hour) })
  if (diff < 7 * day) return translate('time.daysAgo', { n: Math.floor(diff / day) })
  return formatDate(ts, locale)
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
