/**
 * V2 结构化解读的渲染块。
 *
 * 保持 V1 AC-10 的「先短后长」：顶部核心结论常驻，其余默认折叠。
 * 这里**不做任何 Markdown 解析** —— 模型返回的是结构化字段，
 * 每个字段直接进对应的区块，页面上不会出现花括号、`**`、`##` 之类的痕迹。
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/atoms/Panel'
import type { StructuredReading } from '@/types/reading'

export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="text-title text-text-hi">{title}</span>
        <span className="text-caption text-text-faint">{open ? '收起' : '展开'}</span>
      </button>
      {open && <div className="flex flex-col gap-4 pb-4">{children}</div>}
    </div>
  )
}

/** 把多段文字按空行拆成段落渲染，避免一大坨 */
function Paragraphs({ text, className = 'text-read text-text-mid' }: { text: string; className?: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={className}>
            {p}
          </p>
        ))}
    </>
  )
}

function fallbackNotice(reading: StructuredReading, localFallback: boolean): string {
  const reason = reading.meta.fallbackReason ?? (localFallback ? 'unreachable' : 'no-api-key')
  switch (reason) {
    case 'unreachable':
      return '当前使用本地示例解读（未连接解读服务）'
    case 'tone-guard':
      return '这次模型的措辞没有通过语气检查，已改用本地示例解读。你可以重新生成一次。'
    default:
      return '当前使用本地示例解读（解读服务未配置 API Key）'
  }
}

interface Props {
  reading: StructuredReading
  localFallback: boolean
}

export function StructuredReadingView({ reading, localFallback }: Props) {
  return (
    <>
      {reading.safetyNotice && (
        <Panel tone="caution" pad="sm" className="mb-4">
          <p className="text-note text-text-mid">{reading.safetyNotice}</p>
        </Panel>
      )}

      {/* 本地兜底必须如实标注，绝不能让 Mock 文案被当成真解读。
          原因也必须准确 —— 说错原因会把人引到错误的排查方向。 */}
      {(localFallback || reading.meta.provider === 'mock') && (
        <p className="mb-4 text-caption text-text-faint">{fallbackNotice(reading, localFallback)}</p>
      )}

      {/* PART 1 · 整体 —— 常驻，不折叠 */}
      <section className="flex flex-col gap-3 pb-5">
        <h2 className="font-serif text-heading text-text-hi">{reading.readingTheme}</h2>
        <Paragraphs text={reading.overallEnergy} className="text-read text-text-hi" />
      </section>

      {/* PART 5 · 回到问题 —— 用户最想看的，同样常驻 */}
      {reading.answerToQuestion && (
        <Panel tone="inset" pad="md" className="mb-5 flex flex-col gap-2">
          <span className="text-caption tracking-wide-caps text-text-faint">回到你的问题</span>
          <Paragraphs text={reading.answerToQuestion} className="text-read text-text-hi" />
        </Panel>
      )}

      {/* PART 2 · 每张牌 */}
      <Accordion title="每张牌的分析">
        {reading.cards.map((c) => (
          <div key={c.cardId} className="flex flex-col gap-1.5">
            <span className="text-caption tracking-wide-caps text-text-faint">
              {c.position} · {c.cardName}
              {c.orientation === 'reversed' ? '（逆位）' : ''}
            </span>
            <Paragraphs text={c.interpretation} />
            {c.connectionToQuestion && (
              <p className="text-read text-text-low">{c.connectionToQuestion}</p>
            )}
          </div>
        ))}
      </Accordion>

      {/* PART 3 · 牌与牌的关系 —— 这是 V2 相对 V1 最核心的增量 */}
      {reading.relationships.length > 0 && (
        <Accordion title="牌与牌之间的关系">
          {reading.relationships.map((r, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Paragraphs text={r.interpretation} />
            </div>
          ))}
        </Accordion>
      )}

      {/* PART 4 · 整体叙事 */}
      <Accordion title="整体走向">
        <Paragraphs text={reading.narrative} />
      </Accordion>

      {/* PART 6 · 反思 */}
      {reading.reflectionQuestions.length > 0 && (
        <Accordion title="可以再想想的问题">
          {reading.reflectionQuestions.map((q, i) => (
            <p key={i} className="text-read text-text-mid">
              · {q}
            </p>
          ))}
        </Accordion>
      )}
    </>
  )
}
