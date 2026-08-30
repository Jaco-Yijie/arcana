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

interface Props {
  value: ReadingMode
  onChange: (mode: ReadingMode) => void
  onStart: () => void
}

interface Option {
  id: ReadingMode
  title: string
  desc: string
  /** 这个模式**多做**了什么，用一句话说清差别 */
  gives: string
  /** 等待时间要说实话 */
  wait: string
  motif: 'single' | 'woven'
}

const OPTIONS: Option[] = [
  {
    id: 'standard',
    title: '标准解读',
    desc: '逐张读牌，给出完整的牌面分析和对你问题的回应。',
    gives: '每张牌 · 整体叙事 · 回应你的问题',
    wait: '通常半分钟左右。',
    motif: 'single',
  },
  {
    id: 'deep',
    title: '深度解读',
    desc: '在此之上，再去看牌与牌之间的呼应、矛盾和转折点。',
    gives: '以上全部 · 牌阵内部的关系 · 另一种可能的读法',
    wait: '通常需要等待更长时间。',
    motif: 'woven',
  },
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

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex flex-col gap-1">
        <p className="font-serif text-title text-text-hi">牌已经在这里了。</p>
        <p className="text-caption text-text-faint">选择你想要的解读方式。</p>
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
                <span className="font-serif text-title text-text-hi">{o.title}</span>
                <span className="text-caption leading-relaxed text-text-low">{o.desc}</span>
                <span className="mt-1 text-[11px] leading-relaxed text-text-faint">{o.gives}</span>
                <span
                  className={['text-[11px]', o.id === 'deep' ? 'text-silver-dim' : 'text-text-faint'].join(' ')}
                >
                  {o.wait}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>

      <Button size="lg" variant="primary" block onClick={onStart} className="mt-1">
        开始解读
      </Button>

      <p className="text-center text-[11px] text-text-faint">
        两种方式读的都是你抽出的这几张牌。
      </p>
    </div>
  )
}

export default ReadingModePicker
