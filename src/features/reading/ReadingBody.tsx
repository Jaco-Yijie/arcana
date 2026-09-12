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

import { Bilingual } from '@/components/identity/Bilingual'
import { positionEnglish, type IdentityKey } from '@/components/identity/copy'
import { extractKeyQuote } from './extractKeyQuote'
import { useId, useState } from 'react'
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
  title: IdentityKey
  children: ReactNode
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="reading-section">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
        aria-controls={id}
      >
        <Bilingual name={title} className="ritual-heading" />
        <span className="text-caption text-text-faint">{open ? '收起' : '展开'}</span>
      </button>
      <div id={id} hidden={!open} className="reading-section-content">{children}</div>
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
  // 完成态与流式态均默认展开，用户仍可主动收起。
  const open = true
  const quote = extractKeyQuote(answer ?? '')

  return (
    <article className="reading-editorial">
      {safetyNotice && (
        <Panel tone="caution" pad="sm" className="mb-4">
          <p className="text-note text-text-mid">{safetyNotice}</p>
        </Panel>
      )}
      {notice && <p className="mb-4 text-caption text-text-faint">{notice}</p>}

      {/* ── 核心主题：最先到，也最先上屏（实测 P50 1.9 秒） ──

          【为什么要做成"章节标题"而不是加大字号】
          改造前它就是一个 `font-serif text-heading` 的 h2 ——
          在页面上读起来和一篇博客的小标题没有区别。
          问题不在字号，在**它没有被当成一个章节的开头来排**。

          现在给它三样东西，都不依赖字体：
            · 一行全大写的眉标（THE READING）+ 一条发丝线，先声明"这里开始了"
            · 更大的字号、更松的行高、Ritual 档字体
            · 下方一条与眉标呼应的短分隔线，把它和后面的正文断开
          去掉任何一样，它就会退回成"一个用了衬线字体的标题"。 */}
      {theme ? (
        <header className="reading-theme flex flex-col gap-3">
          <span className="flex items-center gap-3">
            <Bilingual name="theme" className="ritual-heading reading-eyebrow" />
            <span aria-hidden="true" className="h-px flex-1 bg-line-hairline" />
          </span>
          <h2
            className="text-text-hi"
            style={{
              fontFamily: 'var(--font-ritual)',
              /* 比 --text-heading（原来的档）大约一档半。中文标题在
                 26–34px 之间才读得出"这是一章的开头"而不是"一个小标题" */
              fontSize: 'clamp(1.8rem, 2vw + 1.2rem, 2.65rem)',
              lineHeight: 1.6,
              letterSpacing: 'var(--tracking-ritual)',
            }}
          >
            {theme}
          </h2>
        </header>
      ) : (
        <Pending />
      )}

      {energy && (
        <div className="mt-5 flex flex-col gap-3">
          <Paragraphs text={energy} className="text-read text-text-hi" />
        </div>
      )}
      {theme && !energy && streaming && <Pending />}

      {/* ── 每张牌 ── */}
      {cards.length > 0 && (
        <div className="mt-10">
          <Section title="cards" defaultOpen={open}>
            {cards.map((c, i) => (
              <div key={`${c.cardName}-${i}`} className="reading-card-analysis flex flex-col gap-3">
                <div className="reading-card-heading"><span className="reading-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><div><Bilingual zh={c.position} en={positionEnglish(c.position)} /><h3>{c.cardName}</h3></div></div>
                <p className="reading-lead">这张牌的启示 <span lang="en">The invitation</span></p>
                <Paragraphs text={c.interpretation} />
                {c.connection && <p className="text-read text-text-low">{c.connection}</p>}
              </div>
            ))}
            {streaming && <Pending />}
          </Section>
        </div>
      )}

      {relationships.length > 0 && (
        <Section title="relationships" defaultOpen={open}>
          {relationships.map((r, i) => (
            <Paragraphs key={i} text={r} />
          ))}
        </Section>
      )}

      {narrative && (
        <Section title="pattern" defaultOpen={open}>
          <Paragraphs text={narrative} />
        </Section>
      )}

      {/* ── 回到你的问题：全篇最重要的一段，给它自己的容器 ── */}
      {answer && (
        <Panel tone="inset" pad="md" className="mt-9 flex flex-col gap-2">
          <Bilingual name="answer" className="ritual-heading" />
          <Paragraphs text={answer} className="text-read text-text-hi" />
        </Panel>
      )}

      {quote && (
        <aside className="reading-pullquote">
          <Bilingual name="insight" className="ritual-heading reading-eyebrow" />
          <blockquote>{quote}</blockquote>
          <span aria-hidden="true" className="reading-ornament">✦</span>
        </aside>
      )}

      {reflections.length > 0 && (
        <div className="mt-9">
          <Section title="reflection" defaultOpen={open}>
            {reflections.map((q, i) => (
              <p key={i} className="text-read text-text-mid">
                · {q}
              </p>
            ))}
          </Section>
        </div>
      )}
    </article>
  )
}

export default ReadingBody
