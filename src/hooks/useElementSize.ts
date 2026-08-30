import { useLayoutEffect, useRef, useState } from 'react'

export interface ElementSize {
  w: number
  h: number
}

/**
 * 观测一个元素的实际尺寸。
 *
 * 【为什么牌桌需要它】
 * Phase C0 之前牌桌高度写死 288px，牌位尺寸写死 64×110 —— 三个常量一相除
 * 就锁死了「哪些牌阵必然重叠」。现在卡牌尺寸由牌桌实际尺寸反解，
 * 所以必须真的知道牌桌有多大，而不是假设它有多大。
 *
 * 【用 useLayoutEffect 而不是 useEffect】
 * 首帧要么拿到真实尺寸，要么拿到 fallback。用 useEffect 会先用 fallback 画一帧
 * 再跳到真实尺寸，牌阵会在用户眼前抖一下 —— 那正是 L-06 禁止的结构性跳动。
 */
export function useElementSize<T extends HTMLElement>(
  fallback: ElementSize = { w: 0, h: 0 },
): [React.RefObject<T | null>, ElementSize] {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<ElementSize>(fallback)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const read = () => {
      const r = el.getBoundingClientRect()
      /* 只在真的变了的时候 setState —— ResizeObserver 在移动端地址栏收放时
         会连发多次同尺寸回调，不做这层判断会造成无谓重渲染。 */
      setSize((prev) =>
        Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
          ? prev
          : { w: r.width, h: r.height },
      )
    }

    read()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, size]
}

export default useElementSize
