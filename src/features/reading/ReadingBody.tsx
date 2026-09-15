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

import { extractKeyQuote } from './extractKeyQuote'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Panel } from '@/components/atoms/Panel'
import { useI18n } from '@/i18n'
import type { I18nContextValue } from '@/i18n'
import type { StructuredReading } from '@/types/reading'

/**
 * 本地兜底必须如实标注，绝不能让 Mock 文案被当成真解读。
 * 原因也必须准确 —— 说错原因会把人引到错误的排查方向。
 */
export function fallbackNotice(
  reading: StructuredReading,
  localFallback: boolean,
  t: I18nContextValue['t'],
): string | null {
  if (!localFallback && reading.meta.provider !== 'mock') return null
  const reason = reading.meta.fallbackReason ?? (localFallback ? 'unreachable' : 'no-api-key')
  switch (reason) {
    case 'unreachable':
      return t('reading.notice.unreachable')
    case 'tone-guard':
      return t('reading.notice.toneGuard')
    default:
      return t('reading.notice.noApiKey')
  }
}

/** 一段解读内容。`streaming` 时段落边写边出现，因此默认展开。 */
function Section({
  titleKey,
  children,
  defaultOpen,
}: {
  /** i18n key 的最后一段，例如 'cards' → reading.section.cards */
  titleKey: string
  children: ReactNode
  defaultOpen: boolean
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="reading-section">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
        aria-controls={id}
      >
        <span className="ritual-heading ritual-heading-marked">
          {t(`reading.section.${titleKey}`)}
        </span>
        <span className="reading-toggle shrink-0">
          {open ? t('common.collapse') : t('common.expand')}
        </span>
      </button>
      <div id={id} hidden={!open} className="reading-section-content">
        {children}
      </div>
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
  const { t } = useI18n()
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
        <header className="reading-theme">
          <p className="rule-gold" aria-hidden="true">
            <span className="rule-node" />
          </p>
          <span className="flex items-center gap-3">
            <span className="eyebrow">{t('reading.section.theme')}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-line-hairline" />
          </span>
          {/* 动态主题的 Oracle 字体链不含中文子集，避免缺字混排。 */}
          <h2 className="reading-chapter">{theme}</h2>
        </header>
      ) : (
        <Pending />
      )}

      {energy && (
        <div className="reading-opening mt-5 flex flex-col gap-3">
          <Paragraphs text={energy} className="text-read text-text-hi" />
        </div>
      )}
      {theme && !energy && streaming && <Pending />}

      {/* ── 每张牌 ── */}
      {cards.length > 0 && (
        <div className="mt-10">
          <Section titleKey="cards" defaultOpen={open}>
            {cards.map((c, i) => (
              <div key={`${c.cardName}-${i}`} className="reading-card-analysis flex flex-col gap-3">
                <div className="reading-card-heading">
                  <span className="reading-number" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    {/* 牌位名与牌名都来自服务端，已经是输出语言的那一份 */}
                    <span className="eyebrow">{c.position}</span>
                    <h3>{c.cardName}</h3>
                  </div>
                </div>
                <p className="reading-lead">{t('reading.cardLead')}</p>
                <Paragraphs text={c.interpretation} />
                {c.connection && <p className="text-read text-text-low">{c.connection}</p>}
              </div>
            ))}
            {streaming && <Pending />}
          </Section>
        </div>
      )}

      {relationships.length > 0 && (
        <Section titleKey="relationships" defaultOpen={open}>
          {relationships.map((r, i) => (
            <Paragraphs key={i} text={r} />
          ))}
        </Section>
      )}

      {narrative && (
        <Section titleKey="pattern" defaultOpen={open}>
          <Paragraphs text={narrative} />
        </Section>
      )}

      {/* ── 回到你的问题：全篇最重要的一段，给它自己的容器 ── */}
      {answer && (
        <section className="reading-answer mt-9 flex flex-col gap-3">
          <span className="ritual-heading ritual-heading-marked">{t('reading.section.answer')}</span>
          <Paragraphs text={answer} className="text-read text-text-hi" />
        </section>
      )}

      {quote && (
        <aside className="reading-pullquote">
          <span className="eyebrow">{t('reading.section.insight')}</span>
          <blockquote>{quote}</blockquote>
          <span aria-hidden="true" className="reading-ornament">✦</span>
        </aside>
      )}

      {reflections.length > 0 && (
        <div className="mt-9">
          <Section titleKey="reflection" defaultOpen={open}>
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
