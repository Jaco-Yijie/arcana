import { AppShell } from '@/components/layout/AppShell'
import { Panel } from '@/components/atoms/Panel'
import { useSettings } from '@/hooks/useSettings'

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

  return (
    <AppShell back="/" title="设置">
      <div className="flex flex-col gap-6 pt-2">
        <Panel tone="veil" pad="md" className="flex flex-col divide-y divide-line-hairline">
          <Toggle
            label="新手引导"
            hint="第一次会给出明显提示，之后自动弱化"
            checked={settings.guidanceEnabled}
            onChange={(v) => {
              updateSettings({ guidanceEnabled: v })
              if (v) resetGuidance()
            }}
          />
          <Toggle
            label="轻微音效"
            hint="纸牌摩擦、放牌、翻牌"
            checked={settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
          <Toggle
            label="轻微震动"
            hint="浏览器支持时生效"
            checked={settings.hapticsEnabled}
            onChange={(v) => updateSettings({ hapticsEnabled: v })}
          />
        </Panel>

        <Panel tone="veil" pad="md" className="flex flex-col gap-3">
          <span className="text-caption tracking-wide-caps text-text-faint">摊牌模式</span>
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
              扇形
            </button>
            <button
              type="button"
              disabled
              className="flex-1 rounded-sm border border-line-hairline px-4 py-3 text-note text-text-faint opacity-40"
            >
              自由桌面（即将推出）
            </button>
          </div>
        </Panel>

        <p className="px-1 text-caption text-text-faint">
          所有记录只保存在这台设备的浏览器里，不会上传。
        </p>
      </div>
    </AppShell>
  )
}
