/**
 * 解读模式选择。
 *
 * 界面上**不出现任何技术参数**（thinking on/off、模型名、token）——
 * 用户要决定的是「我愿不愿意多等一会儿换更深的解读」，
 * 而不是「要不要开启推理」。
 */

import type { ReadingMode } from '@/types/reading'
import { Button } from '@/components/atoms/Button'

interface Props {
  value: ReadingMode
  onChange: (mode: ReadingMode) => void
  onStart: () => void
}

const OPTIONS: { id: ReadingMode; title: string; desc: string }[] = [
  {
    id: 'standard',
    title: '标准解读',
    desc: '更快获得完整的牌面分析。',
  },
  {
    id: 'deep',
    title: '深度解读',
    desc: '花更多时间综合牌与牌之间的关系、矛盾和隐藏线索。',
  },
]

export function ReadingModePicker({ value, onChange, onStart }: Props) {
  return (
    <div className="flex flex-col gap-4 pt-8">
      <p className="text-caption text-text-faint">选择解读方式</p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={[
                'flex flex-col gap-1 rounded-lg border px-5 py-4 text-left transition-colors duration-[var(--duration-quick)]',
                active
                  ? 'border-silver/55 bg-surface-1/60'
                  : 'border-line-hairline bg-bg-void/40',
              ].join(' ')}
            >
              <span className="font-serif text-title text-text-hi">{o.title}</span>
              <span className="text-caption text-text-low">{o.desc}</span>
            </button>
          )
        })}
      </div>

      <Button size="lg" variant="primary" block onClick={onStart} className="mt-2">
        开始解读
      </Button>
    </div>
  )
}

export default ReadingModePicker
