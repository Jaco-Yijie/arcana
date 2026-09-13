import { AppShell } from '@/components/layout/AppShell'
import { Panel } from '@/components/atoms/Panel'
import { LanguageSwitcher } from '@/components/identity/LanguageSwitcher'
import { useSettings } from '@/hooks/useSettings'
import { useI18n } from '@/i18n'

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3.5 text-left disabled:opacity-40"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-body text-text-hi">{label}</span>
        {hint && <span className="text-caption text-text-faint">{hint}</span>}
      </span>
      <span
        className={[
          'relative h-6 w-11 shrink-0 rounded-pill border transition-colors duration-[var(--duration-quick)]',
          checked ? 'border-silver/50 bg-surface-3' : 'border-line-hairline bg-bg-void/60',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-pill transition-all duration-[var(--duration-quick)]',
            checked ? 'left-6 bg-silver' : 'left-1 bg-text-faint',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, resetGuidance } = useSettings()
  const { t } = useI18n()

  return (
    <AppShell back="/" title={t('settings.title')}>
      <div className="flex flex-col gap-6 pt-2">
        {/* ── 语言 ──
            放在设置页第一项，而且在**手机上这是唯一的入口**
            （桌面右上角那枚铭牌在 ≤767px 下被 .language-corner 隐藏 ——
            那个位置在小屏上会压住返回按钮与页面标题）。
            排在第一是因为：找不到语言开关的人，找不到的通常就是这一屏。 */}
        <Panel tone="veil" pad="md" className="flex flex-col gap-3">
          <span className="eyebrow">{t('settings.language')}</span>
          <div className="flex items-center justify-between gap-4">
            <span className="text-caption leading-relaxed text-text-faint">
              {t('settings.languageHint')}
            </span>
            <LanguageSwitcher size="md" className="shrink-0" />
          </div>
        </Panel>

        <Panel tone="veil" pad="md" className="flex flex-col divide-y divide-line-hairline">
          <Toggle
            label={t('settings.guidance')}
            hint={t('settings.guidanceHint')}
            checked={settings.guidanceEnabled}
            onChange={(v) => {
              updateSettings({ guidanceEnabled: v })
              if (v) resetGuidance()
            }}
          />
          <Toggle
            label={t('settings.sound')}
            hint={t('settings.soundHint')}
            checked={settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
          <Toggle
            label={t('settings.haptics')}
            hint={t('settings.hapticsHint')}
            checked={settings.hapticsEnabled}
            onChange={(v) => updateSettings({ hapticsEnabled: v })}
          />
        </Panel>

        <Panel tone="veil" pad="md" className="flex flex-col gap-3">
          <span className="eyebrow">{t('settings.spreadMode')}</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateSettings({ spreadMode: 'fan' })}
              className={[
                'flex-1 rounded-sm border px-4 py-3 text-note',
                settings.spreadMode === 'fan'
                  ? 'border-silver/50 text-text-hi'
                  : 'border-line-hairline text-text-low',
              ].join(' ')}
            >
              {t('settings.fan')}
            </button>
            <button
              type="button"
              disabled
              className="flex-1 rounded-sm border border-line-hairline px-4 py-3 text-note text-text-faint opacity-40"
            >
              {t('settings.free')}
            </button>
          </div>
        </Panel>

        <p className="px-1 text-caption text-text-faint">{t('settings.privacy')}</p>
      </div>
    </AppShell>
  )
}
