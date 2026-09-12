import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Panel } from '@/components/atoms/Panel'
import { Button } from '@/components/atoms/Button'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { DeckSigil } from '@/components/deck/DeckSigil'
import { getCard } from '@/data/deck'
import { getDeck } from '@/decks/registry'
import { useDeck } from '@/hooks/useDeck'
import { useSession } from '@/hooks/useSession'
import IntroCover, { shouldShowCover } from './IntroCover'
import { getSpread } from '@/data/spreads'
import { truncate } from '@/utils/format'
import type { SessionStage } from '@/types/session'
import { WIDTH_STYLE } from '@/components/layout/AppShell'

/** Hero 里展示哪三张。构图差异最大的三张：人物 / 对称 / 关系 */
const HERO_CARD_IDS = ['major-00', 'major-02', 'major-06'] as const

/** Session 中断时停在哪一步 → 回到哪个路由 */
const STAGE_ROUTE: Record<SessionStage, string> = {
  question: '/question',
  spread: '/spread',
  prepare: '/focus',
  shuffle: '/table/shuffle',
  cut: '/table/cut',
  draw: '/table/draw',
  reveal: '/table/reveal',
  reading: '/reading',
  done: '/journal',
}

const STAGE_LABEL: Record<SessionStage, string> = {
  question: '输入问题',
  spread: '选牌阵',
  prepare: '准备',
  shuffle: '洗牌',
  cut: '切牌',
  draw: '摆牌',
  reveal: '翻牌',
  reading: '解读',
  done: '已完成',
}


/** Hero 里的三张牌。用 thumb 档 —— 首屏不该为了三张展示牌去拉 3×295KB 的原图 */
function HeroCards({ deckId }: { deckId: ReturnType<typeof useDeck>['deckId'] }) {
  return (
    <div className="flex items-center justify-center md:justify-start" aria-hidden="true">
      {HERO_CARD_IDS.map((id, i) => (
        <div
          key={id}
          className="shrink-0"
          style={{
            marginLeft: i === 0 ? 0 : 'calc(var(--hero-card-w) * -0.28)',
            zIndex: i,
            /* 极轻微错落与倾斜：像随手放在桌面上，而不是对齐的素材列表。
               角度刻意都很小 —— 大角度会立刻变成「游戏抽卡界面」。 */
            transform: `translateY(${[10, 0, 6][i]}px) rotate(${[-4, 0, 3.5][i]}deg)`,
          }}
        >
          <CardFrame width="var(--hero-card-w)" size="md" state="resting" hoverLift deckId={deckId}>
            <TarotCardFace
              card={getCard(id)}
              orientation="upright"
              deckId={deckId}
              size="sm"
              /* 显式 thumb：13KB/张，不是 295KB/张 */
              variant="thumb"
              showName={false}
            />
          </CardFrame>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { session, hasUnfinished, discardSession } = useSession()
  const { deckId } = useDeck()
  const deck = getDeck(deckId)
  /* 封面只挡「打开这个网站」这一下。深链（/reading、/journal/xxx）不经过本页，
     所以不会被挡住 —— 那正是不把它做成独立路由的原因。
     初值用惰性求值：读一次存储就够，不必每次渲染都读。 */
  const [covered, setCovered] = useState(shouldShowCover)
  if (covered) return <IntroCover onEnter={() => setCovered(false)} />

  const spread = session?.spreadId ? getSpread(session.spreadId) : null
  const progress = session && spread ? `${session.placements.length}/${spread.cardCount}` : null

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full flex-col px-5"
      /* 与 AppShell 的 column 用同一个连续宽度令牌 —— 这两页有自己的根容器，
         不经过 AppShell，但内容列宽度必须和全站一致 */
      /* Hero 是左右分栏，需要比正文列宽。窄屏时 gallery 仍然是 94vw，
         所以手机端不会因此变宽 —— 它只是解开了桌面端 40rem 的上限。 */
      style={{ maxWidth: WIDTH_STYLE.gallery }}>
      {/* 未完成 Session：写清楚问题 + 牌阵 + 进度，用户才敢点「继续」 */}
      {hasUnfinished && session && (
        <Panel tone="veil" pad="sm" className="mt-4 flex flex-col gap-2">
          <p className="text-caption text-text-low">你有一次未完成的抽牌</p>
          <p className="text-note text-text-mid">
            {session.question ? truncate(session.question, 24) : '随缘抽一张'}
            {spread ? ` · ${spread.name}` : ''}
            {progress ? ` · 已摆 ${progress}` : ''}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <Button
              size="md"
              variant="primary"
              onClick={() => navigate(STAGE_ROUTE[session.stage])}
            >
              继续（{STAGE_LABEL[session.stage]}）
            </Button>
            <Button size="md" variant="quiet" onClick={discardSession}>
              重新开始
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid flex-1 items-center gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14 md:py-12">
        {/* ── 左栏：真牌 ──
            首页原本一张牌都没有，只有两个文字按钮。这里放的是**当前牌组的真实牌面**，
            换牌组时它跟着换 —— 用户第一眼看到的就是他将要抽的那副牌。

            三张而不是五张：错落叠压才读作「一副牌」，而三张是能同时看清
            每张主体的上限。第四张开始，露出的竖带就只剩边框了。 */}
        <HeroCards deckId={deckId} />

        {/* ── 右栏：徽记 + 品牌 + CTA ── */}
        <header className="flex flex-col items-start">
          <DeckSigil deckId={deckId} size="clamp(3.5rem, 9vw, 6rem)" opacity={0.45} />
          <h1
            className="mt-5 text-hero text-text-hi"
            /* 品牌名是全站唯一必须一眼认出的字 —— 用 Display 档 */
            style={{ fontFamily: 'var(--font-display)', fontWeight: 300, letterSpacing: '0.045em' }}
          >
            Arcana
          </h1>
          <p
            className="mt-2 text-note text-text-low"
            /* 牌组 tagline 是写死的文案，在子集字体的 223 字之内 */
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {deck.tagline}
          </p>
          <p className="mt-1 text-caption text-text-faint">
            亲手洗牌、切牌、摊牌、翻牌 —— 牌由你自己抽出。
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button size="lg" variant="primary" block onClick={() => navigate('/decks')}>
              开始一次解读
            </Button>
            <Button size="md" variant="quiet" block onClick={() => navigate('/question?mode=random')}>
              随缘抽一张
            </Button>
          </div>
        </header>
      </div>

      <footer
        className="flex items-center justify-center gap-6 pb-6 text-caption text-text-faint"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Link to="/journal" className="flex items-center">塔罗日记</Link>
        <Link to="/decks" className="flex items-center">牌组</Link>
        <Link to="/settings" className="flex items-center">设置</Link>
      </footer>
    </div>
  )
}
