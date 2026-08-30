import { useEffect, useState } from 'react'

/**
 * 订阅一条 media query。
 *
 * 【断点约定 —— Phase C0】
 *   mobile   < 768
 *   tablet   768–1023
 *   desktop  ≥ 1024
 *
 * 用它做**结构性**切换（底部抽屉 vs 右侧栏），不用它做尺寸微调 ——
 * 尺寸交给布局引擎按实测容器算，那条路不需要知道断点。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** ≥1024px：牌义走右侧常驻栏，而不是底部抽屉 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

export default useMediaQuery
