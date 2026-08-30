import { useContext } from 'react'
import { DeckContext } from '@/store/DeckContext'

export function useDeck() {
  const ctx = useContext(DeckContext)
  if (!ctx) throw new Error('useDeck 必须在 DeckProvider 内使用')
  return ctx
}
