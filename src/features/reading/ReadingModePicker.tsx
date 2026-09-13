/**
 * 解读模式选择 —— 两张牌，让用户自己挑。
 *
 * 【界面上不出现任何技术参数】
 * 没有 thinking on/off、没有模型名、没有 token、没有 reasoning。
 * 用户要决定的是「我愿不愿意多等一会儿换更深的解读」，
 * 不是「要不要开启推理」。这是产品选择，不是设置项。
 *
 * 【为什么等待时间要说实话】
 * 实测深度解读要 60–130 秒。把这件事写在选择的那一刻，
 * 比让用户选完之后干等、再怀疑页面挂了要好得多。
 * 「通常需要等待更长时间」不是免责声明，是让他做出真实的选择。
 *
 * 【为什么默认是标准】
 * 默认值应该是大多数人当下想要的那个，而不是我们觉得最厉害的那个。
 */

import { motion, useReducedMotion } from 'framer-motion'
import type { ReadingMode } from '@/types/reading'
import { Button } from '@/components/atoms/Button'
import { useI18n } from '@/i18n'

interface Props {
  value: ReadingMode
  onChange: (mode: ReadingMode) => void
  onStart: () => void
}

interface Option {
  id: ReadingMode
  /** 图形母题：一条线 vs 交织的线。设计决定，不随语言变化 */
  motif: 'single' | 'woven'
}

/* 文案在 i18n 资源里（reading.mode.<id>.*）。这里只留 id 与图形母题 ——
   母题是设计决定，不随语言变化。 */
const OPTIONS: Option[] = [
  { id: 'standard', motif: 'single' },
  { id: 'deep', motif: 'woven' },
]

/** 两个模式的图形隐喻：一条线 vs 交织的线。纯装饰。 */
function Motif({ kind, active }: { kind: Option['motif']; active: boolean }) {
  const o = active ? 0.55 : 0.24
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="13" fill="none" stroke="var(--color-silver)" strokeOpacity={o * 0.5} strokeWidth="0.8" />
      {kind === 'single' ? (
        <line x1="20" y1="7" x2="20" y2="33" stroke="var(--color-silver)" strokeOpacity={o} strokeWidth="1" />
      ) : (
        [0, 60, 120].map((a) => (
          <line
            key={a}
            x1={20 + 13 * Math.cos(((a - 90) * Math.PI) / 180)}
            y1={20 + 13 * Math.sin(((a - 90) * Math.PI) / 180)}
            x2={20 + 13 * Math.cos(((a + 90) * Math.PI) / 180)}
            y2={20 + 13 * Math.sin(((a + 90) * Math.PI) / 180)}
            stroke="var(--color-silver)"
            strokeOpacity={o}
            strokeWidth="1"
          />
        ))
      )}
      <circle cx="20" cy="20" r="2.2" fill="var(--color-gold)" fillOpacity={o + 0.15} />
    </svg>
  )
}

export function ReadingModePicker({ value, onChange, onStart }: Props) {
  const reduceMotion = useReducedMotion()
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex flex-col gap-1">
        <p className="ritual-heading">{t('reading.mode.lead')}</p>
        <p className="text-caption text-text-faint">{t('reading.mode.sub')}</p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((o) => {
          const active = value === o.id
          return (
            <motion.button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              animate={reduceMotion ? undefined : { scale: active ? 1 : 0.985 }}
              transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              className={[
                'relative flex gap-4 overflow-hidden rounded-lg border px-5 py-4 text-left',
                'transition-colors duration-[var(--duration-base)]',
                active ? 'border-silver/55 bg-surface-1/60' : 'border-line-hairline bg-bg-void/40',
              ].join(' ')}
            >
              {/* 选中时左侧亮起一道细边，比整块变色安静 */}
              {active && (
                <motion.span
                  layoutId="reading-mode-edge"
                  className="absolute inset-y-3 left-0 w-px bg-gold/70"
                  transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                />
              )}

              <Motif kind={o.motif} active={active} />

              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="ritual-heading" style={{ fontSize: '1.15rem' }}>
                  {t(`reading.mode.${o.id}.title`)}
                </span>
                <span className="text-caption leading-relaxed text-text-low">
                  {t(`reading.mode.${o.id}.desc`)}
                </span>
                <span className="mt-1 text-[11px] leading-relaxed text-text-faint">
                  {t(`reading.mode.${o.id}.gives`)}
                </span>
                <span
                  className={['text-[11px]', o.id === 'deep' ? 'text-silver-dim' : 'text-text-faint'].join(' ')}
                >
                  {t(`reading.mode.${o.id}.wait`)}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>

      <Button size="lg" variant="primary" display block onClick={onStart} className="mt-1">
        {t('reading.mode.start')}
      </Button>

      <p className="text-center text-[11px] text-text-faint">{t('reading.mode.note')}</p>
    </div>
  )
}

export default ReadingModePicker
