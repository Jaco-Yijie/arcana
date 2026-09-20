import { TransitionLock } from './TransitionLock'
import { useEffect, useRef, useState } from 'react'
import { useDeck } from '@/hooks/useDeck'
import type { DeckId } from '@/decks/ids'
import { isDeckPlayable, resolveCardArtwork } from '@/decks/artwork/resolver'
import { cinematicAssetUrl, cinematicProfile, crossfadeDuration } from './profiles'

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { void image.decode().then(resolve, reject) }
    image.onerror = () => reject(new Error('Cinematic artwork unavailable'))
    image.src = cinematicAssetUrl(src)
  })
}
export async function prepareCinematicDeck(id: DeckId): Promise<boolean> {
  const profile = cinematicProfile(id)
  const media = profile.background
  const tasks: Promise<unknown>[] = [preloadImage(profile.artOverlay)]
  if (media.type !== 'procedural') tasks.push(preloadImage(media.type === 'video' ? media.poster : media.src))
  for (const card of profile.cards) {
    const plan = resolveCardArtwork(id, card)
    if (plan.kind === 'missing') return false
    if (plan.kind === 'raster') tasks.push(plan.load('thumb'))
  }
  const results = await Promise.allSettled(tasks)
  return results.every(result => result.status === 'fulfilled')
}

export function useCinematicTransition() {
  const { deckId, setDeckId } = useDeck()
  const [previous, setPrevious] = useState<DeckId | null>(null)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'fading'>('idle')
  const [failed, setFailed] = useState(false)
  const lock = useRef(new TransitionLock())
  const generation = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => { generation.current++; clearTimeout(timer.current); lock.current.release() }, [])
  async function select(id: DeckId) {
    if (id === deckId || !isDeckPlayable(id) || !lock.current.acquire()) return
    const request = ++generation.current
    setPhase('loading'); setFailed(false)
    // A slow request keeps the old scene intact. Timeout aborts the change, never reveals empty cards.
    let timeout: ReturnType<typeof setTimeout> | undefined
    const ready = await Promise.race([
      prepareCinematicDeck(id),
      new Promise<false>(resolve => { timeout = setTimeout(() => resolve(false), 8000) }),
    ])
    clearTimeout(timeout)
    if (request !== generation.current) return
    if (!ready) { setFailed(true); setPhase('idle'); lock.current.release(); return }
    setPrevious(deckId); setDeckId(id); setPhase('fading')
    timer.current = setTimeout(() => {
      setPrevious(null); setPhase('idle'); lock.current.release()
    }, crossfadeDuration(matchMedia('(prefers-reduced-motion: reduce)').matches))
  }
  return { deckId, previous, phase, isTransitioning: phase !== 'idle', failed, select }
}
