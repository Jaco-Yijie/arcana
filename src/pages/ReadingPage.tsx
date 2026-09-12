import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Panel } from '@/components/atoms/Panel'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { useSession } from '@/hooks/useSession'
import { useSettings } from '@/hooks/useSettings'
import { getSpread } from '@/data/spreads'
import { getCard } from '@/data/deck'
import { resolveDeckId } from '@/decks/ids'
import { buildFollowUpContext } from '@/features/reading/buildReadingInput'
import { requestFollowUp } from '@/features/reading/followUpClient'
import { FollowUpSection } from '@/features/reading/FollowUpSection'
import { ReadingBody, fallbackNotice, type ReadingBodyData } from '@/features/reading/ReadingBody'
import { DEEP_THINKING_HINT, READING_PHASES, useReading } from '@/hooks/useReading'
import { ReadingModePicker } from '@/features/reading/ReadingModePicker'
import type { ReadingMode } from '@/types/reading'
import { WIDTH_STYLE } from '@/components/layout/AppShell'

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
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
      {open && <div className="flex flex-col gap-3 pb-4">{children}</div>}
    </div>
  )
}

/**
 * AI 综合解读。先短后长：顶部核心结论常驻，其余默认折叠。
 *
 * V2：解读来自服务端（DeepSeek 或 Mock Provider），异步生成。
 * 无论加载中、失败还是重试，**牌都原样不动** —— 本页没有任何路径能改写 session 的牌。
 * 老日记只有 V1 结构，自动回落到 V1 渲染分支。
 */
export default function ReadingPage() {
  const navigate = useNavigate()
  const { session, patchSession, addFollowUp, completeSession } = useSession()
  const { markCompletedOnce } = useSettings()
  const [followUpBusy, setFollowUpBusy] = useState(false)
  const [followUpError, setFollowUpError] = useState<string | null>(null)
  const [finishedId, setFinishedId] = useState<string | null>(null)

  // 用户先选模式再开始 —— 不替他决定要不要多等一分钟。
  // 老记录已有解读时直接跳过选择。
  const [mode, setMode] = useState<ReadingMode>(
    (session?.readingMode as ReadingMode | undefined) ?? 'standard',
  )
  const [started, setStarted] = useState(false)

  const spread = session?.spreadId ? getSpread(session.spreadId) : null
  const hasReading = !!session?.structuredReading || !!session?.reading
  const shouldAsk = !hasReading && !started

  // 解读由 hook 负责发起 / 重试 / 降级；它只读已冻结的牌，不写任何牌相关状态
  const { status, phase, structured, error, localFallback, slow, elapsedSec, partial, streamPhase, retry } =
    useReading(shouldAsk ? null : session, shouldAsk ? null : spread, mode)

  useEffect(() => {
    if (status === 'success') markCompletedOnce()
  }, [status, markCompletedOnce])

  const followUpContext = useMemo(
    () => (session && spread ? buildFollowUpContext(session, spread) : null),
    [session, spread],
  )

  // completeSession() 会把 active session 清空，随后本页的守卫会把用户弹回首页。
  // 所以「已完成」要有自己的出口，且优先级高于守卫。
  if (finishedId !== null) {
    return <Navigate to={finishedId ? `/journal/${finishedId}` : '/journal'} replace />
  }
  if (!session || !spread) return <Navigate to="/" replace />

  const reading = session.reading
  const cards = spread.positions
    .map((pos) => {
      const placed = session.placements.find((p) => p.positionId === pos.id)
      if (!placed) return null
      const entry = session.deck[placed.deckIndex]
      return { pos, card: getCard(entry.cardId), orientation: entry.orientation }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  /* ── 牌的尺寸与间距按牌数决定 ──
     留白本身是设计元素，但它不能挤掉牌：3 张时给足横向间距，
     5 张以上必须收紧，否则 375px 上每张牌会小到看不清画面。
     两者都用 min()/clamp() 收在视口比例里，不写死像素。 */
  const n = cards.length
  /* 【数值是算出来的，不是试出来的】
     可用内容宽 = min(92vw, 40rem) − 32px 的左右内边距。
     375px 时只有 313px，所有组合必须在这个数以内：
       3 张：3 × min(24vw,160) + 2 × min(4vw,64) = 270 + 30 = 300 ≤ 313 ✓
       5 张：5 × min(14vw,112) + 4 × min(2vw,28) = 262 + 30 = 292 ≤ 313 ✓
     桌面 1440px 可用 608px：3 张 = 480 + 115 = 595 ≤ 608 ✓，
     此时牌间距 57.6px，正好落在「3 张牌 48–72px」这一档里。
     第一版用的是 26vw / 5vw，5 张时算出来 380px —— 375 屏上会横向溢出。 */
  const cardWidth =
    n <= 1 ? 'min(44vw, var(--card-w-lg))'
    : n <= 3 ? 'min(24vw, var(--card-w-md))'
    : 'min(14vw, var(--card-w-sm))'
  const cardGap = n <= 3 ? 'min(4vw, 4rem)' : 'min(2vw, 1.75rem)'

  /* ── 正文数据源：完成态优先，否则用流式片段 ──
     两者映射到**同一个形状**，所以下面只有一套渲染。
     这正是「done 时整块替换」这个问题的根因所在：形状不同就必然要两套分支。 */
  const bodyData: ReadingBodyData = structured
    ? {
        theme: structured.readingTheme,
        energy: structured.overallEnergy,
        cards: structured.cards.map((c) => ({
          position: c.position,
          cardName: `${c.cardName}${c.orientation === 'reversed' ? '（逆位）' : ''}`,
          interpretation: c.interpretation,
          connection: c.connectionToQuestion,
        })),
        relationships: structured.relationships.map((r) => r.interpretation),
        narrative: structured.narrative,
        answer: structured.answerToQuestion,
        reflections: structured.reflectionQuestions,
      }
    : {
        theme: partial.theme,
        energy: partial.energy,
        cards: partial.cards.map((c) => ({
          position: c.position,
          cardName: c.cardName,
          interpretation: c.interpretation,
        })),
        relationships: partial.relationships,
        narrative: partial.narrative,
        answer: partial.answer,
        reflections: partial.reflections,
      }
  const structuredNotice = structured ? fallbackNotice(structured, localFallback) : null

  /* 追问：单轮，不累积。每次都用**同一份**上下文重新发送 ——
     界面上的历史只是阅读顺序，不进 Prompt（G-13 在类型与载荷两层都不给它机会）。 */
  const send = async (text: string) => {
    if (!followUpContext || !session || followUpBusy) return
    setFollowUpBusy(true)
    setFollowUpError(null)
    addFollowUp({ role: 'user', content: text })

    /* digest 优先取结构化解读 —— 它才是用户屏幕上真正读到的那一份。
       取不到才回落到 V1 结构（老日记恢复出来的会话）。 */
    const digest = structured
      ? {
          headline: structured.readingTheme,
          summary: structured.overallEnergy,
          answer: structured.answerToQuestion,
        }
      : undefined

    try {
      const result = await requestFollowUp(session.id, followUpContext, text, digest)
      addFollowUp({ role: 'assistant', content: result.answer })
      if (result.degradedReason) setFollowUpError(`${result.degradedReason}（下面是本地回答）`)
    } finally {
      setFollowUpBusy(false)
    }
  }

  const finish = () => {
    const id = completeSession()
    setFinishedId(id ?? '')
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full flex-col"
      style={{ maxWidth: WIDTH_STYLE.column }}>
      <header
        className="flex items-center justify-between px-4 py-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => navigate('/table/reveal')}
          className="flex h-11 items-center text-caption text-text-faint"
        >
          看牌阵
        </button>
        <button type="button" onClick={finish} className="flex h-11 items-center text-caption text-text-faint">
          存入日记
        </button>
      </header>

      {/* ── 问题 → 牌阵 → 牌。这三者是这一页的主体，永远在解读正文之上 ──

          改造前这里只有一条卡牌缩略条，**用户自己写的问题一个字都没有出现**。
          解读是对那句话的回应，标题却不是那句话，页面因此缺一个锚点。

          另外那条缩略条写的是 `<CardFrame size="sm" className="w-10">` ——
          className 上的宽度会被 CardFrame 的 inline style 静默覆盖
          （它自己的文档里专门警告过这个陷阱），所以牌从来没有 40px，
          一直是 sm 档。现在改走 `width` 这个唯一出口。 */}
      <section className="px-5 pb-1 pt-1">
        {session.question ? (
          <>
            <p className="text-caption tracking-wide-caps text-text-faint">你的问题</p>
            <h1
              className="mt-2.5 text-text-hi"
              /* 用户自己写下的那句话是这一页的锚点，用 Ritual 档并给足行高。
                 它不能用 Oracle（碑刻体）—— 那是给品牌名的，一段完整的句子
                 用全大写字形会读不下去。 */
              style={{
                fontFamily: 'var(--font-ritual)',
                fontSize: 'clamp(1.375rem, 1.2vw + 1.1rem, 1.875rem)',
                lineHeight: 1.45,
                letterSpacing: 'var(--tracking-ritual)',
              }}
            >
              {session.question}
            </h1>
          </>
        ) : (
          <h1
            className="text-text-hi"
            style={{
              fontFamily: 'var(--font-ritual)',
              fontSize: 'clamp(1.375rem, 1.2vw + 1.1rem, 1.875rem)',
              letterSpacing: 'var(--tracking-ritual)',
            }}
          >
            随缘抽一张
          </h1>
        )}
        <p className="mt-3 text-caption tracking-wide-caps text-text-low">{spread.name}</p>
      </section>

      <div
        className="flex items-start justify-center px-4 pb-5 pt-4"
        style={{ gap: cardGap }}
      >
        {cards.map(({ pos, card, orientation }) => (
          <div key={pos.id} className="flex min-w-0 flex-col items-center gap-2">
            <CardFrame
              size="md"
              state="locked"
              width={cardWidth}
              deckId={resolveDeckId(session.deckId, session.deckSchema)}
            >
              <TarotCardFace
                card={card}
                orientation={orientation}
                /* 本次会话冻结的牌组 */
                deckId={resolveDeckId(session.deckId, session.deckSchema)}
                size="sm"
                showName={false}
              />
            </CardFrame>
            <span className="text-caption tracking-wide-caps text-text-faint">{pos.label}</span>
          </div>
        ))}
      </div>

      <main className="flex-1 px-5 pb-4">
        {shouldAsk ? (
          <ReadingModePicker
            value={mode}
            onChange={setMode}
            onStart={() => {
              patchSession({ readingMode: mode })
              setStarted(true)
            }}
          />
        ) : status === 'loading' || structured ? (
          /* ── 流式与完成态共用同一套渲染 ──
             改造前这里是两个互斥分支，done 的瞬间整块替换，用户正在读的段落会位移；
             更要紧的是 relationships / narrative / answerToQuestion /
             reflectionQuestions 全被扣到 done 才出现 —— 实测最后一张牌 10.4 秒
             上屏，解读 19.3 秒完成，中间 9.6 秒（48%）屏上没有任何新内容。
             现在写完一段放一段，没有替换，也没有死窗口。 */
          <>
            <ReadingBody
              data={bodyData}
              streaming={status === 'loading'}
              notice={structuredNotice}
              safetyNotice={structured?.safetyNotice ?? null}
            />

            {/* 状态行放在正文**下方**，不遮挡任何已经出现的内容。
                写的是「我们这一侧在等什么」，不是假装直播模型的思维链。 */}
            {status === 'loading' && (
              <p className="mt-6 flex items-center gap-2 text-caption text-text-faint" role="status">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-silver-dim motion-reduce:animate-none"
                />
                {streamPhase === 'thinking' ? DEEP_THINKING_HINT : READING_PHASES[phase]}
                {slow &&
                  (mode === 'deep'
                    ? ` · 深度解读通常需要 1–2 分钟 · 已等待 ${elapsedSec} 秒`
                    : ` · 这次比平时久一些 · 已等待 ${elapsedSec} 秒`)}
              </p>
            )}

            {structured && (
              <FollowUpSection
                messages={session.followUps}
                busy={followUpBusy}
                error={followUpError}
                onSend={send}
              />
            )}
          </>
        ) : status === 'error' ? (
          /* 失败：牌一定还在，页面绝不白屏。
             后端已经自动重试过一次了，走到这里说明两次都没成 ——
             接下来给什么选项，由用户决定，我们不替他降级。 */
          <div className="flex flex-col gap-4 pt-10">
            <Panel tone="caution" pad="md">
              <p className="text-read text-text-mid">
                {mode === 'deep'
                  ? '这次深度解读没有完整生成，你抽出的牌已经保留。'
                  : error?.message}
              </p>
              {mode === 'deep' && error?.message && (
                <p className="mt-2 text-caption text-text-faint">{error.message}</p>
              )}
            </Panel>

            <Button size="lg" variant="primary" block onClick={retry}>
              {mode === 'deep' ? '再次尝试深度解读' : '重新尝试解读'}
            </Button>

            {/* 换成标准解读是**用户主动**做的选择，不是我们背着他偷偷降级。
                牌一张都不动，只是换一种读法。 */}
            {mode === 'deep' && (
              <Button
                size="lg"
                variant="ghost"
                block
                onClick={() => {
                  setMode('standard')
                  patchSession({ readingMode: 'standard' })
                }}
              >
                改用标准解读
              </Button>
            )}

            <button
              type="button"
              onClick={() => navigate('/table/reveal')}
              className="text-caption text-text-faint"
            >
              先回去看牌阵
            </button>
          </div>
        ) : !reading ? (
          <div className="flex flex-col gap-3 pt-6">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-4 w-full animate-pulse rounded-hair bg-surface-1" />
            ))}
          </div>
        ) : (
          /* 老日记只有 V1 结构，走这条兼容分支 */
          <>
            {reading.safetyNotice && (
              <Panel tone="caution" pad="sm" className="mb-4">
                <p className="text-note text-text-mid">{reading.safetyNotice}</p>
              </Panel>
            )}

            <div className="flex flex-col gap-3 pb-5">
              {reading.headline.map((p, i) => (
                <p key={i} className="text-read text-text-hi">
                  {p}
                </p>
              ))}
            </div>

            <Accordion title="每张牌的分析">
              {reading.cardAnalyses.map((a) => (
                <div key={a.positionId} className="flex flex-col gap-1">
                  <span className="text-caption tracking-wide-caps text-text-faint">
                    {a.positionLabel} · {getCard(a.cardId).nameZh}
                    {a.orientation === 'reversed' ? '（逆位）' : ''}
                  </span>
                  <p className="text-read text-text-mid">{a.text}</p>
                </div>
              ))}
            </Accordion>

            <Accordion title="卡牌之间的关系">
              {reading.relations.map((r, i) => (
                <p key={i} className="text-read text-text-mid">
                  {r}
                </p>
              ))}
            </Accordion>

            <Accordion title="综合趋势">
              <p className="text-read text-text-mid">{reading.trend}</p>
            </Accordion>

            <Accordion title="值得注意的问题">
              {reading.watchOut.map((r, i) => (
                <p key={i} className="text-read text-text-mid">
                  {r}
                </p>
              ))}
            </Accordion>

            <Accordion title="可以考虑的行动方向">
              {reading.actions.map((r, i) => (
                <p key={i} className="text-read text-text-mid">
                  {r}
                </p>
              ))}
            </Accordion>

            <FollowUpSection
              messages={session.followUps}
              busy={followUpBusy}
              error={followUpError}
              onSend={send}
            />

            <div className="mt-8">
              <Button size="lg" variant="ghost" block onClick={finish}>
                完成并存入日记
              </Button>
            </div>
          </>
        )}
      </main>

    </div>
  )
}
