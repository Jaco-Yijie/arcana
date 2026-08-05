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
import { answerFollowUp } from '@/features/reading'
import { buildFollowUpContext } from '@/features/reading/buildReadingInput'
import { StructuredReadingView } from '@/features/reading/ReadingSections'
import { DEEP_THINKING_HINT, READING_PHASES, useReading } from '@/hooks/useReading'
import { ReadingModePicker } from '@/features/reading/ReadingModePicker'
import type { ReadingMode } from '@/types/reading'

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
  const [pending, setPending] = useState('')
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

  const send = () => {
    const text = pending.trim()
    if (!text || !followUpContext) return
    addFollowUp({ role: 'user', content: text })
    addFollowUp({ role: 'assistant', content: answerFollowUp(text, followUpContext) })
    setPending('')
  }

  const finish = () => {
    const id = completeSession()
    setFinishedId(id ?? '')
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col">
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

      {/* 牌阵缩略条 */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
        {cards.map(({ pos, card, orientation }) => (
          <div key={pos.id} className="flex shrink-0 flex-col items-center gap-1">
            <CardFrame size="sm" state="locked" className="w-10">
              <TarotCardFace card={card} orientation={orientation} size="sm" showName={false} />
            </CardFrame>
            <span className="text-[10px] text-text-faint">{pos.label}</span>
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
        ) : status === 'loading' ? (
          /* 分阶段加载文案。注意：这是我们这一侧的等待状态，
             不是模型的思维链 —— 我们没有也不会去伪造模型的内部过程。 */
          <div className="flex flex-col gap-4 pt-10">
            <p className="text-read text-text-mid">正在解读牌面……</p>
            <p className="text-note text-text-low">
              {streamPhase === 'thinking' ? DEEP_THINKING_HINT : READING_PHASES[phase]}
            </p>

            {/* 流式：已经写好的字段提前上屏。校验失败时这些会被清掉。 */}
            {(partial.theme || partial.energy) && (
              <div className="mt-2 flex flex-col gap-3 border-l border-line-hairline pl-4">
                {partial.theme && (
                  <p className="font-serif text-title text-text-hi">{partial.theme}</p>
                )}
                {partial.energy && <p className="text-read text-text-mid">{partial.energy}</p>}
              </div>
            )}
            {/* 实测真实解读要 60–130s。与其让用户怀疑页面挂了，不如如实告诉他要等多久。 */}
            {slow && (
              <p className="text-caption text-text-faint">
                这次解读比较完整，通常需要 1–2 分钟 · 已等待 {elapsedSec} 秒
              </p>
            )}
            <div className="mt-2 flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-4 w-full animate-pulse rounded-hair bg-surface-1" />
              ))}
            </div>
          </div>
        ) : status === 'error' ? (
          /* 失败：牌一定还在，页面绝不白屏 */
          <div className="flex flex-col gap-4 pt-10">
            <Panel tone="caution" pad="md">
              <p className="text-read text-text-mid">{error?.message}</p>
            </Panel>
            <Button size="lg" variant="primary" block onClick={retry}>
              重新尝试解读
            </Button>
            <button
              type="button"
              onClick={() => navigate('/table/reveal')}
              className="text-caption text-text-faint"
            >
              先回去看牌阵
            </button>
          </div>
        ) : structured ? (
          <>
            <StructuredReadingView reading={structured} localFallback={localFallback} />
          </>
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

            {session.followUps.length > 0 && (
              <div className="mt-6 flex flex-col gap-3">
                {session.followUps.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === 'user'
                        ? 'self-end rounded-lg bg-surface-2 px-3.5 py-2 text-note text-text-hi'
                        : 'text-read text-text-mid'
                    }
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <Button size="lg" variant="ghost" block onClick={finish}>
                完成并存入日记
              </Button>
            </div>
          </>
        )}
      </main>

      {/* 追问：Context 只限于本次抽牌，不是通用 Chatbot */}
      <div
        className="sticky bottom-0 flex items-end gap-2 border-t border-line-hairline bg-bg-deep/90 px-4 pt-2 backdrop-blur"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <input
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="关于这次抽牌继续问…"
          className="h-11 flex-1 rounded-sm border border-line-hairline bg-bg-void/50 px-3 text-read text-text-hi outline-none placeholder:text-text-faint"
        />
        <Button size="md" variant="quiet" onClick={send} disabled={!pending.trim()}>
          发送
        </Button>
      </div>
    </div>
  )
}
