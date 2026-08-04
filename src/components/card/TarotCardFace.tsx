import type { Orientation, TarotCard } from '@/types/tarot'
import { CardArt } from './CardArt'
import type { CardSize } from './CardFrame'

interface TarotCardFaceProps {
  card: TarotCard
  orientation: Orientation
  size?: CardSize
  /** 牌名是否画在牌面内（牌阵中的小牌不画，避免拥挤） */
  showName?: boolean
}

const NAME_CLASS: Record<CardSize, string> = {
  sm: 'text-[9px]',
  md: 'text-caption',
  lg: 'text-note',
}

/**
 * 牌面内容层（放进 CardFrame 里）。
 * 逆位在**数据层**即 rotate(180deg) 呈现，翻开后直接就是那个朝向 ——
 * 刻意不做「翻开后再转过来」的二次动画，那会让人觉得是系统在当场决定方向。
 */
export function TarotCardFace({
  card,
  orientation,
  size = 'md',
  showName = true,
}: TarotCardFaceProps) {
  const reversed = orientation === 'reversed'
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{ transform: reversed ? 'rotate(180deg)' : undefined }}
      >
        <CardArt motif={card.art.motif} hue={card.art.hue} tier={card.art.tier} />
      </div>

      {showName && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 bg-gradient-to-t from-bg-void/85 to-transparent px-1 pt-4 pb-1.5">
          <span
            className={`font-serif text-text-hi ${NAME_CLASS[size]} leading-tight text-center`}
          >
            {card.nameZh}
          </span>
          {reversed && (
            <span className="text-[9px] tracking-wide-caps text-gold-dim">逆位</span>
          )}
        </div>
      )}
    </div>
  )
}

export default TarotCardFace
