import { useCallback } from 'react'
import { useI18n } from '@/i18n'
import { localizeCard, localizeCardName } from '@/data/deck/localized'
import type { CardText } from '@/data/deck/localized'
import type { Orientation, TarotCard } from '@/types/tarot'

/**
 * 当前语言下的牌义取用器。
 * 组件不要直接读 `card.nameZh` / `card.meaningUpright` —— 那是中文母版，
 * 在英文界面下会造成中英混排（本轮明确要避免的东西）。
 */
export function useCardText(): (card: TarotCard) => CardText {
  const { locale } = useI18n()
  return useCallback((card: TarotCard) => localizeCard(card, locale), [locale])
}

/** 只要牌名时用它 —— 全站用得最多的一个字段 */
export function useCardName(): (card: TarotCard, orientation?: Orientation) => string {
  const { locale, t } = useI18n()
  return useCallback(
    (card: TarotCard, orientation?: Orientation) => {
      const name = localizeCardName(card, locale)
      if (orientation !== 'reversed') return name
      /* 中文写「（逆位）」贴在名字后面，英文用逗号分隔的后缀 —— 两种排法都由文案表决定 */
      return t('card.nameReversed', { name })
    },
    [locale, t],
  )
}
