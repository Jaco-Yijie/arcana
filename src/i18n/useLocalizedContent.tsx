import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './useI18n'
import { languageCode } from './types'
import { IS_STREAMLIT, requestViaStreamlit } from '@/features/reading/streamlitTransport'
import { parseTranslation, translationMessages } from './translation'

const fields = new Set(['question', 'optimizedQuestion', 'headline', 'readingTheme', 'overallEnergy', 'interpretation', 'connectionToQuestion', 'narrative', 'answerToQuestion', 'reflectionQuestions', 'safetyNotice', 'position', 'cardName', 'positionLabel', 'text', 'relations', 'trend', 'watchOut', 'actions', 'content', 'mood', 'note', 'outcome', 'insight'])
const cache = new Map<string, string[]>()
const textCache = new Map<string, string>()
function needsTranslation(text: string, language: 'zh' | 'en') {
  return language === 'en' ? /[\u3400-\u9fff]/.test(text) : /[a-z]{3,}/i.test(text) && !/[\u3400-\u9fff]/.test(text)
}
const pending = new Map<string, Promise<string[]>>()
function collect(value: unknown, texts: string[], key = ''): unknown {
  if (typeof value === 'string' && fields.has(key) && value.trim()) { texts.push(value); return value }
  if (Array.isArray(value)) return value.map(v => collect(v, texts, key))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,collect(v,texts,k)]))
  return value
}
function replace(value: unknown, texts: string[], cursor: { n: number }, key = ''): unknown {
  if (typeof value === 'string' && fields.has(key) && value.trim()) return texts[cursor.n++]
  if (Array.isArray(value)) return value.map(v => replace(v,texts,cursor,key))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,replace(v,texts,cursor,k)]))
  return value
}
async function translateContent(key: string, language: 'zh' | 'en', texts: string[]) {
  const cached = cache.get(key)
  if (cached) return cached
  const existing = pending.get(key)
  if (existing) return existing
  const job = (async () => {
    const needed = [...new Set(texts.filter(text => needsTranslation(text, language) && !textCache.has(JSON.stringify([language, text]))))]
    if (!needed.length) return texts.map(text => textCache.get(JSON.stringify([language, text])) ?? text)
    const input = { language, texts: needed }
    let translated: string[]
    if (IS_STREAMLIT) {
      const response = await requestViaStreamlit(translationMessages(input), { sessionId: 'translation' })
      if (!response.ok || !response.content) throw new Error('translation-unavailable')
      translated = parseTranslation(response.content, needed.length)
    } else {
      const response = await fetch('/api/tarot/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(200000) })
      if (!response.ok) throw new Error('translation-unavailable')
      const result = await response.json() as { texts: string[] }
      translated = parseTranslation(JSON.stringify(result), needed.length)
    }
    needed.forEach((text, i) => textCache.set(JSON.stringify([language, text]), translated[i]!))
    const all = texts.map(text => textCache.get(JSON.stringify([language, text])) ?? text)
    while (textCache.size > 500) textCache.delete(textCache.keys().next().value!)
    cache.set(key, all)
    if (cache.size > 20) cache.delete(cache.keys().next().value!)
    return all
  })().finally(() => pending.delete(key))
  pending.set(key, job)
  return job
}

/** Read-only translated view. Session/journal source is never overwritten. */
export function useLocalizedContent<T>(source: T, enabled = true) {
  const { locale } = useI18n()
  const language = languageCode(locale)
  const texts = useMemo(() => { const all: string[] = []; collect(source, all); return all }, [source])
  const key = JSON.stringify([language, texts])
  // User-authored English in an otherwise Chinese record is translated too.
  const needs = enabled && texts.some(text => needsTranslation(text, language))
  const [result, setResult] = useState<{ key: string; texts?: string[]; error?: boolean }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!needs) return
    let live = true
    void translateContent(key, language, texts).then(texts => { if (live) setResult({ key, texts }) }).catch(() => { if (live) setResult({ key, error: true }) })
    return () => { live = false }
  }, [key, language, needs, attempt, texts]) // key contains the exact source strings; late results cannot replace another language.
  const translated = cache.get(key) ?? (result.key === key ? result.texts : undefined)
  return {
    value: needs && translated ? replace(source, translated, { n: 0 }) as T : source,
    pending: needs && !translated,
    error: needs && result.key === key && !!result.error,
    retry: () => { setResult({ key: '' }); setAttempt(n => n + 1) },
  }
}

export function TranslationStatus({ error, retry }: { error: boolean; retry: () => void }) {
  const { t } = useI18n()
  return <div role={error ? 'alert' : 'status'} className="p-5 text-read text-text-mid"><p>{t(error ? 'language.translationError' : 'language.translating')}</p>{error && <button className="ritual-button mt-4" onClick={retry}>{t('common.retry')}</button>}</div>
}
