import { useEffect, useRef, useState } from 'react'
import type { DeckId } from '@/decks/ids'
import { SignatureArt } from '../SignatureArt'
import { cinematicVars } from './variables'
import { cinematicAssetUrl, cinematicProfile, type CinematicMode, type DeckCinematicProfile } from './profiles'

function WorldMedia({ profile }: { profile: DeckCinematicProfile }) {
  const [failed, setFailed] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const media = profile.background
  useEffect(() => {
    const element = video.current
    if (!element) return
    const query = matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)')
    const sync = () => {
      if (query.matches || document.hidden) element.pause()
      else void element.play().catch(() => setFailed(true))
    }
    sync()
    query.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => { element.pause(); query.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync) }
  }, [])
  if (media.type === 'procedural') return null
  if (media.type === 'video' && !failed) return <video ref={video} className="cinema-media" src={cinematicAssetUrl(media.src)} poster={cinematicAssetUrl(media.poster)} autoPlay muted loop playsInline preload="metadata" onError={() => setFailed(true)} />
  if ((media.type === 'image' && failed) || posterFailed) return null
  return <img className="cinema-media" src={cinematicAssetUrl(media.type === 'video' ? media.poster : media.src)} alt="" decoding="async" onError={() => { if (media.type === 'video') setPosterFailed(true); else setFailed(true) }} />
}
export function CinematicWorld({ deckId, mode = 'hero', className = '' }: { deckId: DeckId; mode?: CinematicMode; className?: string }) {
  const profile = cinematicProfile(deckId)
  return <div aria-hidden="true" className={`cinematic-world ${className}`} data-cinematic-deck={deckId} data-mode={mode} data-motion={profile.motion} data-texture={profile.texture} style={cinematicVars(profile)}>
    <div className="cinema-fallback"><SignatureArt deckId={deckId} /></div>
    <div className="cinema-background"><WorldMedia key={deckId} profile={profile} /></div>
    <div className="cinema-light" />
    <div className="cinema-foreground"><img key={deckId} className="cinema-overlay" src={cinematicAssetUrl(profile.artOverlay)} alt="" decoding="async" onError={event => { event.currentTarget.style.visibility = 'hidden' }} /></div>
    <div className="cinema-texture" />
    <div className="cinema-shade" />
  </div>
}
