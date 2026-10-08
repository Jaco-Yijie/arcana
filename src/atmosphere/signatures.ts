import type { DeckId } from '@/decks/ids'

export interface VisualSignature {
  motif: 'veil' | 'heraldry' | 'tide' | 'thicket' | 'archive' | 'lunar' | 'engraving' | 'canopy' | 'constellation' | 'eclipse'
  texture: 'grain' | 'damask' | 'water' | 'botanical' | 'ruled'
  silhouette: string
  motion: 'drift' | 'turn' | 'still'
  paper: string
  raised: string
  text: string
  secondary: string
  accent: string
}

/** Presentation only: this registry does not decide which decks are playable. */
export const DECK_SIGNATURES = {
  ethereal: { motif: 'veil', texture: 'grain', silhouette: 'open veils and diffuse halo', motion: 'drift', paper: '#29343c', raised: '#333f48', text: '#edf1f2', secondary: '#c5d0d6', accent: '#c9dce4' },
  elysian: { motif: 'heraldry', texture: 'damask', silhouette: 'ordered diamond seal and columns', motion: 'turn', paper: '#252d24', raised: '#30392e', text: '#eeeade', secondary: '#c9cbb9', accent: '#d6c292' },
  opaline: { motif: 'tide', texture: 'water', silhouette: 'shell ribs and horizontal tides', motion: 'drift', paper: '#24343a', raised: '#2e4048', text: '#e8f1f0', secondary: '#c1d3d4', accent: '#c3dddf' },
  wonderland: { motif: 'thicket', texture: 'botanical', silhouette: 'crooked arch and flowering branches', motion: 'drift', paper: '#302b38', raised: '#3d3546', text: '#eee9f0', secondary: '#d0c4d7', accent: '#d9c3db' },
  classic: { motif: 'archive', texture: 'ruled', silhouette: 'illuminated folio and carved corners', motion: 'still', paper: '#322c25', raised: '#40372d', text: '#f1eade', secondary: '#d4c8b6', accent: '#dfc59b' },
  'legacy-moonlight': { motif: 'lunar', texture: 'grain', silhouette: 'crescent and concentric moon halos', motion: 'drift', paper: '#252d3b', raised: '#303b4c', text: '#edf0f4', secondary: '#c7d0df', accent: '#d0dbec' },
  'legacy-classic': { motif: 'engraving', texture: 'damask', silhouette: 'engraved sun and symmetrical rays', motion: 'turn', paper: '#302b24', raised: '#3e372b', text: '#f0eade', secondary: '#d1c7b5', accent: '#ddc38e' },
  'legacy-forest': { motif: 'canopy', texture: 'botanical', silhouette: 'overlapping leaves and woodland trunks', motion: 'drift', paper: '#233129', raised: '#2e4034', text: '#e9eee4', secondary: '#c1d1bd', accent: '#c6d5ae' },
  'legacy-celestial': { motif: 'constellation', texture: 'grain', silhouette: 'angular star paths and celestial compass', motion: 'turn', paper: '#292b3d', raised: '#35384c', text: '#eeeef5', secondary: '#cacbe0', accent: '#d7cce9' },
  'legacy-shadow': { motif: 'eclipse', texture: 'ruled', silhouette: 'eclipsed disc and vertical curtains', motion: 'still', paper: '#29272e', raised: '#36333c', text: '#eeeaf0', secondary: '#cbc4d2', accent: '#d6c6d9' },
} as const satisfies Record<DeckId, VisualSignature>

export function readingVars(deckId: DeckId) {
  const s = DECK_SIGNATURES[deckId]
  return {
    '--reading-paper': s.paper, '--reading-raised': s.raised,
    '--reading-text': s.text, '--reading-secondary': s.secondary,
    '--reading-accent': s.accent,
  }
}
