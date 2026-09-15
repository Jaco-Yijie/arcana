import { useEffect, useRef } from 'react'

/** Event-driven parallax, limited to fine pointers. No idle animation loop. */
export function useHeroDepth(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || !enabled) return
    const media = matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let x = 0
    let y = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      frame = 0
      node.style.setProperty('--depth-x', '0deg')
      node.style.setProperty('--depth-y', '0deg')
    }
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return
      x = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1))
      y = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1))
      if (!frame) frame = requestAnimationFrame(() => {
        node.style.setProperty('--depth-x', `${-y * 5}deg`)
        node.style.setProperty('--depth-y', `${x * 8}deg`)
        frame = 0
      })
    }
    node.addEventListener('pointermove', move, { passive: true })
    node.addEventListener('pointerleave', reset)
    media.addEventListener('change', reset)
    return () => {
      reset()
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerleave', reset)
      media.removeEventListener('change', reset)
    }
  }, [enabled])
  return ref
}
