import { DEFAULT_DECK_ID, type DeckId } from '../../decks/ids'

export type BackgroundMedia =
  | { type: 'image'; src: string }
  | { type: 'video'; src: string; poster: string }
  | { type: 'procedural' }
export type CinematicMode = 'hero' | 'table' | 'reading'
export interface DeckCinematicProfile {
  background: BackgroundMedia
  artOverlay: string
  palette: { base: string; light: string; accent: string }
  motif: string
  texture: 'grain' | 'engraving' | 'water' | 'fibres'
  motion: 'float' | 'orbit' | 'tide' | 'sway' | 'still' | 'breathe'
  duration: number
  depth: { background: number; cards: number; foreground: number }
  cards: readonly [string, string, string]
  pose: { tilt: number; fan: number; centerZ: number }
}
function profile(id: DeckId, base: string, light: string, accent: string, motif: string,
  texture: DeckCinematicProfile['texture'], motion: DeckCinematicProfile['motion'], duration: number,
  cards: DeckCinematicProfile['cards'], fan: number, centerZ: number): DeckCinematicProfile {
  return { background: { type: 'image', src: `assets/cinematic/${id}.svg` }, artOverlay: `assets/cinematic/${id}-overlay.svg`,
    palette: { base, light, accent }, motif, texture, motion, duration, cards,
    depth: { background: 3, cards: motion === 'orbit' ? 8 : 10, foreground: motion === 'sway' ? 18 : 15 },
    pose: { tilt: motion === 'still' ? 4 : 8, fan, centerZ } }
}
export const CINEMATIC_PROFILES: Record<DeckId, DeckCinematicProfile> = {
  ethereal: profile('ethereal','#0c1722','#718b98','#d6e2da','moon-veils','grain','float',18,['major-02','major-17','major-18'],7,55),
  elysian: profile('elysian','#121810','#6c7047','#c5b47a','eclipse-temple','engraving','orbit',24,['major-04','major-13','major-20'],5,45),
  opaline: profile('opaline','#101b25','#7b668c','#aed6d3','pearl-tides','water','tide',14,['cups-01','major-17','cups-02'],9,60),
  wonderland: profile('wonderland','#181225','#735173','#a293b0','thorn-portal','fibres','sway',19,['major-00','major-18','major-01'],11,50),
  classic: profile('classic','#20150f','#7c5835','#c5a778','lamplit-folio','fibres','still',22,['major-01','major-05','major-09'],6,35),
  'legacy-moonlight': profile('legacy-moonlight','#0b1422','#344d71','#9fbddc','lunar-stair','grain','float',16,['major-02','major-18','major-17'],8,65),
  'legacy-classic': profile('legacy-classic','#211b12','#79623d','#ccba86','solar-engraving','engraving','orbit',28,['major-01','major-19','major-05'],5,40),
  'legacy-forest': profile('legacy-forest','#101d17','#365e43','#b3b578','fern-cathedral','fibres','sway',20,['major-03','major-09','pentacles-01'],10,55),
  'legacy-celestial': profile('legacy-celestial','#101427','#484279','#a7a4d6','stellar-polyhedron','grain','breathe',22,['major-10','major-21','major-17'],7,70),
  'legacy-shadow': profile('legacy-shadow','#13121a','#3f354f','#a09aac','mirror-threshold','engraving','breathe',26,['major-12','major-13','major-15'],4,45),
}
export function cinematicProfile(id: string): DeckCinematicProfile {
  return Object.hasOwn(CINEMATIC_PROFILES, id) ? CINEMATIC_PROFILES[id as DeckId] : CINEMATIC_PROFILES[DEFAULT_DECK_ID]
}
export function cinematicAssetUrl(path: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  return `${base}${path}`
}
export function cinematicMode(path: string): CinematicMode {
  return path === '/reading' || path.startsWith('/journal/') ? 'reading' : 'table'
}
export function crossfadeDuration(reduced: boolean): number { return reduced ? 180 : 1000 }
