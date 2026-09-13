/**
 * i18n · 按需加载
 *
 * 【一次语言切换要拿三样东西】
 *   1. UI 文案      src/i18n/locales/<locale>.json
 *   2. 牌义覆盖层    src/data/deck/i18n/<locale>.ts（只有非默认语言才有）
 *   3. 字体          中文展示字体是 62.8KB 的子集，英文界面一个字都用不到
 *
 * 三样都只在**真正需要时**才下载。中文用户永远不会请求 en-US.json，
 * 英文用户永远不会请求那份中文子集字体（见 `ensureFonts`）。
 *
 * 【为什么在 render 之前 await】
 * 如果先渲染中文再异步换成英文，上次选了英文的用户每次打开都会看到
 * 一帧中文然后跳变。首屏多等一个 chunk（gzip 后约 4KB）比闪一下便宜。
 * 默认语言（zh-CN）走静态导入，这条 await 立即 resolve，一次网络都不发。
 */

import { DEFAULT_LOCALE, normalizeLocale } from './types'
import type { Locale, Messages } from './types'
import { initLocale, isLoaded, readStoredLocale, registerBundle } from './store'
import { registerCardText } from '@/data/deck/localized'

/**
 * 中文展示字体（LXGW 文楷子集）的 @font-face 不写在 theme.css 里，
 * 由这里按语言注入 —— CSS 里的 @font-face 只要被引用就会下载，
 * 而英文界面下没有任何一个汉字需要它。
 *
 * unicode-range 是第二道保险：即便某处混进了汉字（例如中文牌组名），
 * 浏览器也只在真的要画那些字时才取字体，不会因为声明了就下载。
 */
const displayFontUrl = `${import.meta.env.BASE_URL}fonts/lxgw-wenkai-light-subset.woff2`
const CJK_DISPLAY_FONT_CSS = `
@font-face{
  font-family:'LXGW WenKai Light';
  font-weight:300;font-style:normal;font-display:swap;
  src:url('${displayFontUrl}') format('woff2');
  unicode-range:U+2E80-303F,U+3200-33FF,U+3400-4DBF,U+4E00-9FFF,U+F900-FAFF,U+FE30-FE4F,U+FF00-FFEF;
}`

let fontsInjected = false

function ensureFonts(locale: Locale): void {
  if (typeof document === 'undefined') return
  if (locale !== 'zh-CN' || fontsInjected) return
  fontsInjected = true
  const style = document.createElement('style')
  style.dataset.arcanaFonts = 'cjk-display'
  style.textContent = CJK_DISPLAY_FONT_CSS
  document.head.appendChild(style)

  /* 预载：这条只在中文形态下出现，英文用户的 HTML 里没有它 */
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = 'font/woff2'
  link.crossOrigin = 'anonymous'
  link.href = displayFontUrl
  document.head.appendChild(link)
}

const inFlight = new Map<Locale, Promise<void>>()

async function fetchBundle(locale: Locale): Promise<void> {
  if (isLoaded(locale)) return
  if (locale === 'en-US') {
    /* 文案与牌义覆盖层同一批取回 —— 少一个瀑布，且两者必须同时到位，
       否则会出现「界面英文、牌名中文」的半截状态。 */
    const [messages, cards] = await Promise.all([
      import('./locales/en-US.json'),
      import('@/data/deck/i18n/en-US'),
    ])
    registerBundle(locale, messages.default as unknown as Messages)
    registerCardText(locale, cards.cardTextEn)
    return
  }
  /* zh-CN 是静态导入，走不到这里 */
}

/** 保证某个语言的全部资源都在内存里。重复调用共享同一个 Promise。 */
export function loadLocale(locale: Locale): Promise<void> {
  if (isLoaded(locale)) {
    ensureFonts(locale)
    return Promise.resolve()
  }
  let p = inFlight.get(locale)
  if (!p) {
    p = fetchBundle(locale).then(() => ensureFonts(locale)).finally(() => inFlight.delete(locale))
    inFlight.set(locale, p)
  }
  return p
}

/**
 * 决定这次打开用哪门语言：
 *   1. 用户上次的选择（localStorage）—— 显式选择优先于一切
 *   2. 浏览器语言
 *   3. 默认中文
 */
export function resolveInitialLocale(): Locale {
  const stored = readStoredLocale()
  if (stored) return stored
  if (typeof navigator !== 'undefined') {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const hit = normalizeLocale(tag)
      if (hit) return hit
    }
  }
  return DEFAULT_LOCALE
}

/** 在 React 挂载**之前**调用一次。resolve 之后首帧就是正确的语言。 */
export async function bootI18n(): Promise<Locale> {
  const locale = resolveInitialLocale()
  try {
    await loadLocale(locale)
  } catch {
    /* 英文资源没取到（离线、CDN 挂了）：退回中文，界面仍然完整可用 */
    await loadLocale(DEFAULT_LOCALE)
    initLocale(DEFAULT_LOCALE)
    return DEFAULT_LOCALE
  }
  initLocale(locale)
  return locale
}
