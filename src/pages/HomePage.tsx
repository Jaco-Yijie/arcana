import { deckVisualScope } from '@/atmosphere/visualScope'
import { RitualScene } from '@/components/immersive/RitualScene'
import { useHeroDepth } from '@/components/immersive/useHeroDepth'
import { needsOnboarding } from '@/features/onboarding/state'
import { CinematicWorld } from '@/atmosphere/cinematic/CinematicWorld'
import { cinematicVars } from '@/atmosphere/cinematic/variables'
import { cinematicProfile } from '@/atmosphere/cinematic/profiles'
import { useCinematicTransition } from '@/atmosphere/cinematic/useCinematicTransition'
import { DeckAtmosphereSwitcher } from '@/atmosphere/cinematic/DeckAtmosphereSwitcher'
import { SiteNavigation } from '@/components/layout/SiteNavigation'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Panel } from '@/components/atoms/Panel'
import { Button } from '@/components/atoms/Button'
import { CardFrame } from '@/components/card/CardFrame'
import { TarotCardFace } from '@/components/card/TarotCardFace'
import { DeckSigil } from '@/components/deck/DeckSigil'
import { getCard } from '@/data/deck'
import { useDeck } from '@/hooks/useDeck'
import { useSession } from '@/hooks/useSession'
import { useI18n } from '@/i18n'
import { deckName, deckTagline, spreadName } from '@/i18n/domain'
import IntroCover, { shouldShowCover } from './IntroCover'
import { getSpread } from '@/data/spreads'
import { truncate } from '@/utils/format'
import type { SessionStage } from '@/types/session'

/** Hero 里展示哪三张。构图差异最大的三张：人物 / 对称 / 关系 */
// Each world chooses its own three real cards; no cross-deck artwork substitution.

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

/** Hero 里的三张牌。用 thumb 档 —— 首屏不该为了三张展示牌去拉 3×295KB 的原图 */
function HeroCards({ deckId }: { deckId: ReturnType<typeof useDeck>['deckId'] }) {
  const profile = cinematicProfile(deckId)
  return (
    <div className="hero-card-stage" aria-hidden="true" data-motion={profile.motion} style={{ ...deckVisualScope(deckId), ...cinematicVars(profile) }}>
      <RitualScene deckId={deckId} />
      <div className="hero-depth-plane">
      {profile.cards.map((id, i) => (
        <div
          key={id}
          className="shrink-0"
          style={{
            marginLeft: i === 0 ? 0 : 'calc(var(--hero-card-w) * -0.38)',
            zIndex: i === 1 ? 3 : 2,
            /* 极轻微错落与倾斜：像随手放在桌面上，而不是对齐的素材列表。
               角度刻意都很小 —— 大角度会立刻变成「游戏抽卡界面」。 */
            transform: `translate3d(0, ${i === 1 ? -12 : 26}px, ${i === 1 ? profile.pose.centerZ : 0}px) rotateY(${(1-i)*profile.pose.tilt}deg) rotateZ(${(i-1)*profile.pose.fan}deg)`,
          }}
        >
          <div className="hero-card-entry" style={{ '--card-index': i } as CSSProperties}>
          <div className="hero-card-float">
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
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { session, hasUnfinished, discardSession } = useSession()
  const { deckId, previous, phase, isTransitioning, failed, select } = useCinematicTransition()
  const { t } = useI18n()
  /* 封面只挡「打开这个网站」这一下。深链（/reading、/journal/xxx）不经过本页，
     所以不会被挡住 —— 那正是不把它做成独立路由的原因。
     初值用惰性求值：读一次存储就够，不必每次渲染都读。 */
  const [covered, setCovered] = useState(() => needsOnboarding() && shouldShowCover())
  const depthRef = useHeroDepth(!covered)
  if (covered) return <IntroCover onEnter={() => setCovered(false)} />

  const spread = session?.spreadId ? getSpread(session.spreadId) : null
  const progress =
    session && spread
      ? t('home.unfinished.progress', {
          done: session.placements.length,
          total: spread.cardCount,
        })
      : null

  return (
    <div ref={depthRef} data-transition={phase} className="identity-home cinematic-home relative isolate mx-auto flex min-h-[100dvh] w-full flex-col px-5"
      /* 双栏 Hero 使用独立的展示宽度，正文仍使用阅读宽度令牌。 */
      style={{ ...deckVisualScope(deckId), ...cinematicVars(cinematicProfile(deckId)) }}>
      <div className="cinema-worlds">
        {previous && <CinematicWorld key={previous} deckId={previous} className="cinema-outgoing" />}
        <CinematicWorld key={deckId} deckId={deckId} className={previous ? 'cinema-incoming' : ''} />
      </div>

      {/* 介绍页入口与语言切换共用主导航，移动端收进 Menu。 */}
      <SiteNavigation />

      {/* 未完成 Session：写清楚问题 + 牌阵 + 进度，用户才敢点「继续」 */}
      {hasUnfinished && session && (
        <Panel tone="veil" pad="sm" className="mt-4 flex flex-col gap-2">
          <p className="text-caption text-text-low">{t('home.unfinished.title')}</p>
          <p className="text-note text-text-mid">
            {session.question ? truncate(session.question, 24) : t('home.unfinished.randomDraw')}
            {spread ? ` · ${spreadName(t, spread.id)}` : ''}
            {progress ? ` · ${progress}` : ''}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <Button
              size="md"
              variant="primary"
              onClick={() => navigate(STAGE_ROUTE[session.stage])}
            >
              {t('home.unfinished.resume', { stage: t(`home.stage.${session.stage}`) })}
            </Button>
            <Button size="md" variant="quiet" onClick={discardSession}>
              {t('home.unfinished.restart')}
            </Button>
          </div>
        </Panel>
      )}

      <div className="home-hero grid flex-1 items-center gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14 md:py-12">
        {/* ── 左栏：真牌 ──
            首页原本一张牌都没有，只有两个文字按钮。这里放的是**当前牌组的真实牌面**，
            换牌组时它跟着换 —— 用户第一眼看到的就是他将要抽的那副牌。

            三张而不是五张：错落叠压才读作「一副牌」，而三张是能同时看清
            每张主体的上限。第四张开始，露出的竖带就只剩边框了。 */}
        <div className="cinema-card-stack">
          {previous && <div className="cinema-card-layer cinema-outgoing" key={previous}><HeroCards deckId={previous} /></div>}
          <div className={`cinema-card-layer ${previous ? 'cinema-incoming' : ''}`} key={deckId}><HeroCards deckId={deckId} /></div>
        </div>

        {/* ── 右栏：徽记 + 品牌 + CTA ── */}
        <header className="hero-copy flex flex-col items-start">
          <span className="eyebrow">
            {deckName(t, deckId)}
          </span>
          <span className="hero-sigil"><DeckSigil deckId={deckId} size="2.5rem" opacity={0.7} /></span>
          <h1 className="oracle oracle-brand hero-brand mt-5" aria-label={t('app.brand')} style={{ fontSize: 'var(--text-brand)' }}>
            <span aria-hidden="true">{Array.from(t('app.brand')).map((letter, index) => (
              <span key={index} className="hero-brand-letter" style={{ '--letter-index': index } as CSSProperties}>{letter}</span>
            ))}</span>
          </h1>
          <p className="hero-tagline">{t('home.tagline')}</p>
          <p className="rule-gold hero-rule" aria-hidden="true">
            <span className="rule-node" />
          </p>
          <p
            className="mt-4 text-note text-text-low"
            /* 牌组 tagline 是写死的文案，在展示字体子集覆盖范围之内 */
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}
          >
            {deckTagline(t, deckId)}
            <span className="sr-only"> — {deckName(t, deckId)}</span>
          </p>
          <p className="mt-2 text-caption text-text-low">{t('home.handHint')}</p>

          <div className="hero-actions mt-9 flex w-full flex-col gap-3">
            <Button size="lg" variant="primary" display block onClick={() => navigate(needsOnboarding() ? '/guide' : '/decks')}>
              {t('home.begin')}
            </Button>
            <Button
              size="md"
              variant="quiet"
              block
              onClick={() => navigate(needsOnboarding() ? '/guide?mode=random' : '/question?mode=random')}
            >
              {t('home.random')}
            </Button>
          </div>
        </header>
      </div>

      <DeckAtmosphereSwitcher deckId={deckId} busy={isTransitioning} failed={failed} select={select} />

      <footer
        className="flex items-center justify-center gap-6 pb-6 text-caption text-text-low"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Link to="/journal" className="flex items-center">
          {t('home.nav.journal')}
        </Link>
        <Link to="/decks" className="flex items-center">
          {t('home.nav.decks')}
        </Link>
        <Link to="/settings" className="flex items-center">
          {t('home.nav.settings')}
        </Link>
      </footer>
    </div>
  )
}
