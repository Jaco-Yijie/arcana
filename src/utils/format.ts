/** 展示层格式化工具 */

const DATE_FMT = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const TIME_FMT = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(ts: number): string {
  return DATE_FMT.format(new Date(ts))
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return `${DATE_FMT.format(d)} ${TIME_FMT.format(d)}`
}

/** 「3 天前」这类相对时间，日记列表用 */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = now - ts
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return formatDate(ts)
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
