/**
 * i18n · 类型与常量
 *
 * 【一条规矩】
 * 语言资源的**唯一来源**是 `src/i18n/locales/*.json`。
 * 组件里不允许再出现任何面向用户的字面量 —— 包括 aria-label 与 placeholder。
 * `scripts/i18n-check.ts` 会按 zh-CN 的键树逐条比对 en-US，缺一个就红。
 *
 * 【为什么 zh-CN 是静态导入、en-US 是动态导入】
 * 默认语言必须在首帧就能渲染，动态 import 会多一个网络往返；
 * 而英文资源对中文用户永远用不到，静态打进主包等于让所有人替少数人付流量。
 * 所以：zh-CN 进主 chunk，en-US 与英文牌义一起走独立 chunk，
 * 只有真正切到英文（或上次就是英文）的人才会下载。见 `boot.ts`。
 */

import type zhCN from './locales/zh-CN.json'

/** 支持的语言。加一门语言 = 加一个 tag + 一份 JSON + 一份牌义覆盖层。 */
export type Locale = 'zh-CN' | 'en-US'

export const LOCALES: readonly Locale[] = ['zh-CN', 'en-US'] as const

export const DEFAULT_LOCALE: Locale = 'zh-CN'

/**
 * 消息树的形状由 zh-CN.json 定义 —— 它是基准语言。
 * en-US.json 必须与它结构完全一致（由 i18n:check 断言）。
 */
export type Messages = typeof zhCN

/** 插值参数。只支持 `{name}` 这一种占位符，不支持复数规则 —— 需要时再加。 */
export type TParams = Record<string, string | number>

/**
 * 把任意输入收敛成一个受支持的 Locale。
 * 接受 'en' / 'en-US' / 'en-GB' / 'zh' / 'zh-CN' / 'zh-Hans-CN' 等写法 ——
 * localStorage 里可能是旧值，navigator.language 更是什么都有。
 */
export function normalizeLocale(input: string | null | undefined): Locale | null {
  if (!input) return null
  const tag = input.trim().toLowerCase()
  if (tag.startsWith('zh')) return 'zh-CN'
  if (tag.startsWith('en')) return 'en-US'
  return null
}

/** 语言的 API 短码。发给解读服务的就是这个（`language: 'zh' | 'en'`）。 */
export type LanguageCode = 'zh' | 'en'

export function languageCode(locale: Locale): LanguageCode {
  return locale === 'en-US' ? 'en' : 'zh'
}

export function localeFromLanguageCode(code: string | null | undefined): Locale {
  return normalizeLocale(code) ?? DEFAULT_LOCALE
}
