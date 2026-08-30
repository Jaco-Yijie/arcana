import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { Panel } from '@/components/atoms/Panel'
import { QuestionField } from '@/features/question/QuestionField'
import { QuestionFocusMoment } from '@/features/question/QuestionFocusMoment'
import { GENERAL_READING_QUESTION } from '@/features/question/questionInspiration'
import { useSession } from '@/hooks/useSession'
import { optimizeQuestion, detectRisk } from '@/features/reading'
import { lightThemes } from '@/data/randomThemes'
import type { RandomThemeId } from '@/types/session'

const MAX_LEN = 200

/**
 * 问题输入（mode=question）与轻主题选择（mode=random）共用一个路由。
 * 「优化问题」只是建议 —— 用户始终可以保留原问题（AC：不强制改写）。
 */
export default function QuestionPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'random' ? 'random' : 'question'
  const navigate = useNavigate()
  const { startSession } = useSession()

  const [text, setText] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [riskAcknowledged, setRiskAcknowledged] = useState(false)
  /** 提交后的轻仪式：问题移到中央停 1.6 秒，然后才进下一步 */
  const [focusQuestion, setFocusQuestion] = useState<string | null>(null)

  const optimized = useMemo(() => (text.trim() ? optimizeQuestion(text) : null), [text])
  const risk = useMemo(() => detectRisk(text), [text])
  const needsRiskNotice = risk.level !== 'none' && !riskAcknowledged

  /** 原问题始终保留在 session.question；usedOptimized 只记录用户选了哪个版本 */
  const startWithQuestion = (usedOptimized: boolean, override?: string) => {
    const finalQuestion = override ?? text.trim()
    startSession({
      mode: 'question',
      question: finalQuestion,
      optimizedQuestion: override ? null : (optimized?.optimized ?? null),
      usedOptimized: override ? false : usedOptimized,
      theme: null,
      spreadId: null,
      stage: 'spread',
    })
    setSheetOpen(false)
    // 先停一下再走，让问题落地
    setFocusQuestion(
      usedOptimized && optimized ? optimized.optimized : finalQuestion,
    )
  }

  const startRandom = (theme: RandomThemeId) => {
    startSession({
      mode: 'random',
      question: '',
      optimizedQuestion: null,
      usedOptimized: false,
      theme,
      spreadId: 'single',
      stage: 'prepare',
    })
    navigate('/focus')
  }

  if (mode === 'random') {
    return (
      <AppShell back="/" title="随缘抽一张" centered>
        <div className="flex flex-col gap-6 pt-6">
          <Button size="lg" variant="primary" block onClick={() => startRandom('free')}>
            直接随缘
          </Button>

          <div className="flex items-center gap-3 text-caption text-text-faint">
            <span className="h-px flex-1 bg-line-hairline" />
            或者挑一个方向
            <span className="h-px flex-1 bg-line-hairline" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {lightThemes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => startRandom(t.id)}
                className="flex h-16 flex-col items-start justify-center gap-0.5 rounded-lg border border-line-hairline bg-bg-void/40 px-4 text-left transition-transform duration-[var(--duration-quick)] active:scale-[0.98]"
              >
                <span className="text-note text-text-hi">{t.label}</span>
                <span className="text-[11px] text-text-faint">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  const canContinue = text.trim().length > 0

  return (
    <AppShell back="/" title="带着问题来" centered>
      <div className="flex min-h-[70dvh] flex-col justify-center gap-8 pt-2 pb-6">
        <QuestionField
          value={text}
          onChange={setText}
          maxLength={MAX_LEN}
          onSubmit={() => {
            if (!canContinue || needsRiskNotice) return
            if (optimized) setSheetOpen(true)
            else startWithQuestion(false)
          }}
        />

        {/* 安全边界：信息条而不是弹窗、不阻断（AC-11 / G-14） */}
        {needsRiskNotice && risk.notice && (
          <Panel tone="caution" pad="sm" className="flex flex-col gap-3">
            <p className="text-note text-text-mid">{risk.notice}</p>
            <div className="flex gap-3">
              <Button size="md" variant="ghost" onClick={() => setRiskAcknowledged(true)}>
                我知道了，继续
              </Button>
              <Button size="md" variant="quiet" onClick={() => setText('')}>
                换个问题
              </Button>
            </div>
          </Panel>
        )}

        <div className="flex flex-col gap-4">
          <Button
            size="lg"
            variant="primary"
            block
            disabled={!canContinue}
            onClick={() => {
              if (needsRiskNotice) return
              if (optimized) setSheetOpen(true)
              else startWithQuestion(false)
            }}
          >
            继续
          </Button>

          {/* 塔罗不一定必须有很具体的问题 —— 不填也能走 */}
          <button
            type="button"
            onClick={() => startWithQuestion(false, GENERAL_READING_QUESTION)}
            className="self-center text-caption text-text-faint"
          >
            我暂时没有具体问题
          </button>
        </div>
      </div>

      <AnimatePresence>
        {focusQuestion && (
          <QuestionFocusMoment
            question={focusQuestion}
            onDone={() => navigate('/spread')}
          />
        )}
      </AnimatePresence>

      {/* 问题优化 Bottom Sheet：内容层，不是打断层 */}
      {sheetOpen && optimized && (
        <div className="fixed inset-0 z-50 flex items-end bg-bg-void/60">
          <div
            className="surface-veil mx-auto w-full rounded-t-xl p-5 pb-8"
            /* 这层是 fixed 浮层，不在 AppShell 的内容列里，宽度要自己收 */
            style={{ maxWidth: 'min(92vw, 40rem)' }}
          >
            <h3 className="font-serif text-title text-text-hi">换个说法试试？</h3>
            <p className="mt-1 text-caption text-text-faint">{optimized.rationale}</p>

            <Panel tone="inset" pad="sm" className="mt-4">
              <p className="text-read text-text-hi">{optimized.optimized}</p>
            </Panel>
            <p className="mt-3 text-caption text-text-faint">你原来的问题：{text}</p>

            <div className="mt-5 flex gap-3">
              <Button
                size="lg"
                variant="primary"
                block
                onClick={() => startWithQuestion(true)}
              >
                用优化后的
              </Button>
              <Button size="lg" variant="ghost" block onClick={() => startWithQuestion(false)}>
                保留我的问题
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-3 w-full text-caption text-text-faint"
            >
              再改一下
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
