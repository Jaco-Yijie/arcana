/**
 * 服务端 i18n —— 与前端共用同一份语言资源
 *
 * 【为什么不给服务端单独写一份文案】
 * 牌位名、牌阵名、牌名这三样会同时出现在**界面**和**模型输出**里。
 * 两侧各写一份的后果不是"多维护一处"，而是解读里写着 "Path A"、
 * 界面上写着 "Branch A" —— 用户会以为模型在讲另一张牌。
 *
 * 所以这里直接引用 `src/i18n/locales/*.json`。
 *
 * 【为什么是静态 import 而不是 readFileSync】
 * 这个模块被 `server/context/rebuild.ts` 引用，而 rebuild.ts **也跑在浏览器里** ——
 * Streamlit 形态下整条解读流水线（重建上下文 → 组装 Prompt → 校验）
 * 都在前端执行（见 src/features/reading/streamlitReading.ts）。
 * 一旦这里出现 `node:fs`，Streamlit 那个产物就直接打不出来。
 *
 * 代价是两份 JSON 会被静态打进解读那个 chunk（约 4 KB gz）。
 * 解读页本来就是懒加载的，首屏不受影响；而 `src/i18n/boot.ts` 那条
 * 按需加载的路径仍然成立 —— 中文用户的**首屏**不会为英文资源付费。
 */

import type { LanguageCode, Locale } from '../src/i18n/types.ts'
import zhCN from '../src/i18n/locales/zh-CN.json'
import enUS from '../src/i18n/locales/en-US.json'

/* 【英文牌义覆盖层不在这里注册】
   它有 90 KB 源码，而这个模块会被 rebuild.ts 拖进浏览器包
   （Streamlit 形态），静态 import 会让中文用户也下载整份英文牌义。
   注册点分两处，各自只在真正需要时发生：
     Node 服务端  → server/index.ts 启动时同步注册
     浏览器       → src/i18n/boot.ts 切到英文时随 en-US.json 一起动态取回 */

type Tree = { [key: string]: unknown }

const MESSAGES: Record<LanguageCode, Tree> = {
  zh: zhCN as unknown as Tree,
  en: enUS as unknown as Tree,
}

export const LOCALE_OF: Record<LanguageCode, Locale> = {
  zh: 'zh-CN',
  en: 'en-US',
}

/** 取一条文案。找不到时返回 key —— 与前端 `translate()` 的行为一致。 */
export function t(language: LanguageCode, path: string): string {
  let node: unknown = MESSAGES[language] ?? MESSAGES.zh
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return path
    node = (node as Record<string, unknown>)[key]
  }
  return typeof node === 'string' ? node : path
}

export function spreadName(language: LanguageCode, spreadId: string): string {
  return t(language, `spread.name.${spreadId}`)
}

export function spreadDescription(language: LanguageCode, spreadId: string): string {
  return t(language, `spread.description.${spreadId}`)
}

export function positionLabel(
  language: LanguageCode,
  spreadId: string,
  positionId: string,
): string {
  return t(language, `spread.position.${spreadId}.${positionId}.label`)
}

export function positionMeaning(
  language: LanguageCode,
  spreadId: string,
  positionId: string,
): string {
  return t(language, `spread.position.${spreadId}.${positionId}.meaning`)
}

/** 请求里的 language 字段收敛成 'zh' | 'en'，缺省中文（老客户端不带这个字段） */
export function normalizeLanguage(value: unknown): LanguageCode {
  if (typeof value !== 'string') return 'zh'
  const tag = value.trim().toLowerCase()
  if (tag.startsWith('en')) return 'en'
  return 'zh'
}
