import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { ContextQuestionCard } from '@/features/context-intake/ContextQuestionCard'
import { prepareContextQuestions } from '@/features/reading/contextIntakeClient'
import { effectiveQuestion } from '@/features/reading/buildReadingInput'
import { useSession } from '@/hooks/useSession'
import { useI18n } from '@/i18n'
import { languageCode } from '@/i18n/types'
import type { ContextIntakeAnswer, ContextIntakeQuestion } from '@/types/reading'

/** 题目在这么短的时间内到达时，不闪一下加载文案 */
const LOADING_TEXT_DELAY_MS = 350

/**
 * 解读前动态背景提问 —— 「在翻开牌之前」
 *
 * 位于「问题落定」与「选择牌阵」之间。**完全自愿**：
 *   · 全答、答几题、一题不答都可以按「继续」；
 *   · 「跳过，直接开始」始终可见，点了立即进入牌阵，不二次确认；
 *   · 没有题目（问题已足够具体、生成失败、超时）时这一页不出现，直接替换成牌阵页。
 * 只有实际选中的答案会被写进会话，进而进入这一次解读。
 */
export default function ContextIntakePage() {
  const navigate = useNavigate()
  const { session, patchSession } = useSession()
  const { t, locale } = useI18n()
  const language = languageCode(locale)

  const [questions, setQuestions] = useState<ContextIntakeQuestion[] | null>(null)
  const [showLoadingText, setShowLoadingText] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})

  const sessionId = session?.id ?? null
  const question = session && session.mode === 'question' ? effectiveQuestion(session) : ''

  useEffect(() => {
    if (!sessionId) return
    let live = true
    setQuestions(null)
    setSelected({})
    const timer = window.setTimeout(() => live && setShowLoadingText(true), LOADING_TEXT_DELAY_MS)
    void prepareContextQuestions(sessionId, question, language).then((result) => {
      if (!live) return
      window.clearTimeout(timer)
      if (result.length === 0) {
        navigate('/spread', { replace: true })
        return
      }
      setQuestions(result)
    })
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [sessionId, question, language, navigate])

  const answers = useMemo<ContextIntakeAnswer[]>(
    () =>
      (questions ?? []).flatMap((q) => {
        const option = q.options.find((o) => o.id === selected[q.id])
        return option
          ? [{ questionId: q.id, question: q.question, selectedOptionId: option.id, selectedOptionLabel: option.label }]
          : []
      }),
    [questions, selected],
  )

  if (!session) return <Navigate to="/" replace />
  /* 随缘模式没有问题可补充背景 */
  if (session.mode !== 'question') return <Navigate to="/spread" replace />

  const proceed = (skipped: boolean) => {
    patchSession({ userContext: { skipped, answers: skipped ? [] : answers } })
    navigate('/spread')
  }

  if (!questions) {
    return (
      <AppShell back="/question" centered>
        <p className="min-h-6 text-center text-note text-text-low" role="status" aria-live="polite">
          {showLoadingText ? t('contextIntake.preparing') : ''}
        </p>
      </AppShell>
    )
  }

  return (
    <AppShell back="/question">
      <div className="flex flex-col gap-8 pt-4 pb-8">
        <header className="flex flex-col gap-3">
          <h1 className="ritual-heading" style={{ fontSize: 'clamp(1.35rem, 1.1vw + 1.05rem, 1.7rem)', lineHeight: 1.5 }}>
            {t('contextIntake.title')}
          </h1>
          <p className="text-note leading-relaxed text-text-low">
            {t('contextIntake.lead1')}
            <br />
            {t('contextIntake.lead2')}
          </p>
        </header>

        <div className="flex flex-col gap-7">
          {questions.map((item, index) => (
            <ContextQuestionCard
              key={item.id}
              item={item}
              index={index}
              selectedOptionId={selected[item.id] ?? null}
              onSelect={(optionId) =>
                setSelected((prev) => {
                  const next = { ...prev }
                  if (optionId) next[item.id] = optionId
                  else delete next[item.id]
                  return next
                })
              }
            />
          ))}
        </div>

        {/* 两个按钮同样清楚可见。「继续」不要求答完 —— 一题不答也可以继续 */}
        <div className="flex flex-col gap-3">
          <Button size="lg" variant="primary" display block onClick={() => proceed(false)}>
            {t('contextIntake.continue')}
          </Button>
          <Button size="lg" variant="ghost" block onClick={() => proceed(true)}>
            {t('contextIntake.skip')}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
