/**
 * Language Switcher —— 两个字的铭牌，不是一个下拉框
 *
 * 【为什么不做 <select>】
 * 只有两门语言，下拉框要点两次才能换，而且系统原生弹层的样式
 * 在这套深色仪式感的界面里是唯一一个"后台系统"的东西。
 * 这里做成一枚横向铭牌：两个语言并排，当前那个亮着冷金，
 * 中间一条竖发丝线 —— 与牌面装帧、章节分隔线是同一套语言。
 *
 * 【两个语言名各自用自己的文字写】
 * 「中文」永远写作「中文」，English 永远写作 English。
 * 不做「Simplified Chinese」这种翻译 —— 找语言的人是按字形认的，
 * 而这也是唯一允许两种文字同屏的地方（它是语言选择器本身，不是内容）。
 */

import { LOCALES } from '@/i18n'
import { useI18n } from '@/i18n'
import type { Locale } from '@/i18n'

/** 铭牌上永远用该语言自己的写法，不随界面语言变化 */
const ENDONYM: Record<Locale, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
}

export function LanguageSwitcher({
  className = '',
  size = 'sm',
}: {
  className?: string
  /** sm = 页面右上角的铭牌；md = 设置页里那一排 */
  size?: 'sm' | 'md'
}) {
  const { locale, setLocale, t, switching, error } = useI18n()

  return (
    <>
    <div
      role="group"
      aria-label={t('language.ariaLabel')}
      className={`language-plate language-plate-${size} ${className}`}
      data-switching={switching || undefined}
    >
      <span aria-hidden="true" className="language-plate-mark">
        {/* 地球仪太像后台设置。用一枚双环记号 —— 与 DeckSigil 同一族的抽象刻记 */}
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
          <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="0.9" />
          <ellipse cx="8" cy="8" rx="2.6" ry="6.2" stroke="currentColor" strokeWidth="0.7" />
          <path d="M2 8h12" stroke="currentColor" strokeWidth="0.7" />
        </svg>
      </span>
      {error && <span role="alert" className="text-caption">{t('language.loadError')}</span>}
      {LOCALES.map((code, i) => {
        const active = code === locale
        return (
          <span key={code} className="contents">
            {i > 0 && <span aria-hidden="true" className="language-plate-rule" />}
            <button
              type="button"
              aria-pressed={active}
              lang={code}
              disabled={switching}
              onClick={() => !active && setLocale(code)}
              className="language-plate-option"
              data-active={active || undefined}
            >
              {ENDONYM[code]}
            </button>
          </span>
        )
      })}
    </div>
    {className === 'language-corner' && <details className="mobile-language-menu">
      <summary>{t('language.label')}</summary>
      <LanguageSwitcher size="md" />
    </details>}
    </>
  )
}

export default LanguageSwitcher
