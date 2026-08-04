import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/atoms/Button'
import { CardFrame } from '@/components/card/CardFrame'
import { CardBack } from '@/components/card/CardBack'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { dreamlikeDeck, allCards } from '@/data/deck'

/** 代表性牌：只展示 signature 档，其余 78 张在抽牌时才出现 */
const showcase = allCards.filter((c) => c.art.tier === 'signature')

export default function DeckPage() {
  const navigate = useNavigate()

  return (
    <AppShell back="/" title="牌组">
      <div className="flex flex-col gap-6 pt-2">
        <section className="flex items-center gap-5">
          <CardFrame size="md" state="resting">
            <CardBack />
          </CardFrame>
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-title text-text-hi">{dreamlikeDeck.name}</h2>
            <p className="text-caption text-text-low">{dreamlikeDeck.description}</p>
            <p className="mt-1 text-caption text-text-faint">
              标准 78 张体系 · 当前唯一牌组
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <span className="text-caption tracking-wide-caps text-text-faint">代表性牌面</span>
          <div className="grid grid-cols-3 gap-3">
            {showcase.map((card) => (
              <div key={card.id} className="flex flex-col items-center gap-1.5">
                <CardFrame size="sm" fluid state="resting">
                  <TarotCardFace card={card} orientation="upright" size="sm" showName={false} />
                </CardFrame>
                <span className="text-[11px] text-text-low">{card.nameZh}</span>
              </div>
            ))}
          </div>
          <p className="text-caption text-text-faint">
            其余牌面使用同一视觉语言的占位构图，牌背完全一致 —— 抽牌前不会泄露任何牌面。
          </p>
        </section>

        <Button size="lg" variant="primary" block onClick={() => navigate(-1)}>
          就用这副
        </Button>
      </div>
    </AppShell>
  )
}
