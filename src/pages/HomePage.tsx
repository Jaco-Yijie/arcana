import { Link, useNavigate } from 'react-router-dom'
import { Panel } from '@/components/atoms/Panel'
import { Button } from '@/components/atoms/Button'
import { useSession } from '@/hooks/useSession'
import { getSpread } from '@/data/spreads'
import { truncate } from '@/utils/format'
import type { SessionStage } from '@/types/session'

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

export default function HomePage() {
  const navigate = useNavigate()
  const { session, hasUnfinished, discardSession } = useSession()

  const spread = session?.spreadId ? getSpread(session.spreadId) : null
  const progress = session && spread ? `${session.placements.length}/${spread.cardCount}` : null

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col px-5">
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

      <div className="flex flex-1 flex-col justify-center py-10">
        <header className="mb-10">
          <h1 className="text-glow-soft font-serif text-hero text-text-hi">Arcana</h1>
          <p className="mt-2 text-note text-text-low">
            亲手洗牌、切牌、摊牌、翻牌 —— 牌由你自己抽出。
          </p>
        </header>

        <nav className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/question?mode=question')}
            className="surface-veil flex h-24 flex-col justify-center gap-1 rounded-lg px-5 text-left transition-transform duration-[var(--duration-quick)] active:scale-[0.985]"
          >
            <span className="font-serif text-title text-text-hi">带着问题来</span>
            <span className="text-caption text-text-low">有想问的事，让牌帮你把它摊开</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/question?mode=random')}
            className="flex h-24 flex-col justify-center gap-1 rounded-lg border border-line-hairline bg-bg-void/40 px-5 text-left transition-transform duration-[var(--duration-quick)] active:scale-[0.985]"
          >
            <span className="font-serif text-title text-text-hi">随缘抽一张</span>
            <span className="text-caption text-text-low">没有具体问题，看看今天会遇到什么</span>
          </button>
        </nav>
      </div>

      <footer
        className="flex items-center justify-center gap-6 pb-6 text-caption text-text-faint"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Link to="/journal" className="flex items-center">塔罗日记</Link>
        <Link to="/deck" className="flex items-center">牌组</Link>
        <Link to="/settings" className="flex items-center">设置</Link>
      </footer>
    </div>
  )
}
