import type { CSSProperties } from 'react'
import type { DeckCinematicProfile } from './profiles'

export function cinematicVars(profile: DeckCinematicProfile): CSSProperties {
  return {
    '--cinema-base': profile.palette.base, '--cinema-light': profile.palette.light, '--cinema-accent': profile.palette.accent,
    '--motion-atmosphere': `${profile.duration}s`, '--motion-card-float': `${profile.duration / 2}s`,
    '--cinema-background-depth': `${profile.depth.background}px`, '--cinema-card-depth': `${profile.depth.cards}px`,
    '--cinema-foreground-depth': `${profile.depth.foreground}px`,
  } as CSSProperties
}
