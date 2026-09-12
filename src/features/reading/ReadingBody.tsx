/**
 * 解读正文 —— **流式与完成态共用同一套渲染**。
 *
 * 【为什么必须共用】
 * 改造前这里是两个互斥分支：`status==='loading'` 渲染一版挤在 border-l 里的
 * 片段，`done` 之后整块换成另一版。后果有两个，都是实测出来的：
 *
 *   1. 换版的那一刻整页布局跳一次 —— 用户正在读的那段文字会位移。
 *   2. 更严重的是「牌之后」的死窗口：最后一张牌解释 10.4 秒就写完上屏了，
 *      而解读要到 19.3 秒才被标记完成。中间 9.6 秒（占总时长 48%）
 *      屏幕上一个新字都没有 —— 因为 relationships / narrative /
 *      answerToQuestion / reflectionQuestions 全被扣在折叠区里等 done。
 *      传输一直是流式的，体验却退回成「等完整结果」。
 *
 * 现在只有一套结构：字段写完一个就出现一个，done 只是补上最后那几段。
 * 没有替换，没有跳变，也没有死窗口。
 *
 * 【段落顺序 = 模型的输出顺序】
 * 刻意与输出契约的字段顺序一致，所以新内容永远**追加在底部**，
 * 不会插到用户正在读的段落上方去。把「回到你的问题」挪到顶部会更符合
 * 直觉，但它在流里是倒数第二个到的 —— 那样每次都会在 17 秒左右
 * 把已经读过的内容整体推下去。
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/atoms/Panel'
import type { StructuredReading } from '@/types/reading'

/**
 * 本地兜底必须如实标注，绝不能让 Mock 文案被当成真解读。
 * 原因也必须准确 —— 说错原因会把人引到错误的排查方向。
 */
export function fallbackNotice(reading: StructuredReading, localFallback: boolean): string | null {
  if (!localFallback && reading.meta.provider !== 'mock') return null
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

/** 一段解读内容。`streaming` 时段落边写边出现，因此默认展开。 */
function Section({
  title,
  children,
  defaultOpen,
}: {
  title: string
  children: ReactNode
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="text-title text-text-hi">{title}</span>
        <span className="text-caption text-text-faint">{open ? '收起' : '展开'}</span>
      </button>
      {open && <div className="flex flex-col gap-4 pb-5">{children}</div>}
    </div>
  )
}

/** 把多段文字按空行拆成段落，避免一大坨 */
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

/** 还没到的那一段：一条呼吸的细线，宽度递减。**不占满**，暗示「还有，但不多了」 */
function Pending() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5 py-2">
      {['92%', '78%', '54%'].map((w) => (
        <span
          key={w}
          className="h-3 animate-pulse rounded-hair bg-surface-1 motion-reduce:animate-none"
          style={{ width: w }}
        />
      ))}
    </div>
  )
}

export interface ReadingBodyData {
  theme: string | null
  energy: string | null
  cards: { position: string; cardName: string; interpretation: string; connection?: string }[]
  relationships: string[]
  narrative: string | null
  answer: string | null
  reflections: string[]
}

interface Props {
  data: ReadingBodyData
  /** 还在流式生成中 —— 决定要不要显示「下一段正在写」的占位 */
  streaming: boolean
  /** 本地兜底解读，必须如实标注 */
  notice?: string | null
  safetyNotice?: string | null
}

export function ReadingBody({ data, streaming, notice, safetyNotice }: Props) {
  const { theme, energy, cards, relationships, narrative, answer, reflections } = data
  /* 刚看着它写出来的，保持展开；从日记回看的旧解读折叠（AC-10 先短后长）。
     流式过程中如果默认折叠，内容写完也等于没出现 —— 那这轮改造就白做了。 */
  const open = streaming

  return (
    <>
      {safetyNotice && (
        <Panel tone="caution" pad="sm" className="mb-4">
          <p className="text-note text-text-mid">{safetyNotice}</p>
        </Panel>
      )}
      {notice && <p className="mb-4 text-caption text-text-faint">{notice}</p>}

      {/* ── 核心主题：最先到，也最先上屏（实测 P50 1.9 秒） ── */}
      {theme ? (
        <h2 className="font-serif text-heading text-text-hi">{theme}</h2>
      ) : (
        <Pending />
      )}

      {energy && (
        <div className="mt-3 flex flex-col gap-3">
          <Paragraphs text={energy} className="text-read text-text-hi" />
        </div>
      )}
      {theme && !energy && streaming && <Pending />}

      {/* ── 每张牌 ── */}
      {cards.length > 0 && (
        <div className="mt-7">
          <Section title="每张牌的分析" defaultOpen={open}>
            {cards.map((c, i) => (
              <div key={`${c.cardName}-${i}`} className="flex flex-col gap-1.5">
                <span className="text-caption tracking-wide-caps text-text-faint">
                  {c.position} · {c.cardName}
                </span>
                <Paragraphs text={c.interpretation} />
                {c.connection && <p className="text-read text-text-low">{c.connection}</p>}
              </div>
            ))}
            {streaming && <Pending />}
          </Section>
        </div>
      )}

      {relationships.length > 0 && (
        <Section title="牌与牌之间的关系" defaultOpen={open}>
          {relationships.map((r, i) => (
            <Paragraphs key={i} text={r} />
          ))}
        </Section>
      )}

      {narrative && (
        <Section title="整体走向" defaultOpen={open}>
          <Paragraphs text={narrative} />
        </Section>
      )}

      {/* ── 回到你的问题：全篇最重要的一段，给它自己的容器 ── */}
      {answer && (
        <Panel tone="inset" pad="md" className="mt-6 flex flex-col gap-2">
          <span className="text-caption tracking-wide-caps text-text-faint">回到你的问题</span>
          <Paragraphs text={answer} className="text-read text-text-hi" />
        </Panel>
      )}

      {reflections.length > 0 && (
        <div className="mt-6">
          <Section title="可以再想想的问题" defaultOpen={open}>
            {reflections.map((q, i) => (
              <p key={i} className="text-read text-text-mid">
                · {q}
              </p>
            ))}
          </Section>
        </div>
      )}
    </>
  )
}

export default ReadingBody
