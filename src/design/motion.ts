type MotionRole = 'quick' | 'flip' | 'reveal' | 'card-idle'

/** CSS tokens are the source for both CSS and Framer transitions. */
export function designTransition(role: MotionRole): { duration: number; ease: [number, number, number, number] } {
  if (typeof document === 'undefined') return { duration: 0, ease: [0, 0, 1, 1] }
  const style = getComputedStyle(document.documentElement)
  const raw = style.getPropertyValue(`--duration-${role}`).trim()
  const duration = Number.parseFloat(raw) / (raw.endsWith('ms') ? 1000 : 1)
  const easing = role === 'flip' ? 'settle' : role === 'card-idle' ? 'veil' : 'enter'
  const parts = style.getPropertyValue(`--ease-${easing}`).match(/[\d.]+/g)?.map(Number)
  return {
    duration: Number.isFinite(duration) ? duration : 0,
    ease: parts?.length === 4 ? [parts[0]!, parts[1]!, parts[2]!, parts[3]!] : [0, 0, 1, 1],
  }
}
