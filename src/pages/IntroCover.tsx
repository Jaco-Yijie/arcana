import { ArtBackdrop } from '@/components/identity/ArtBackdrop'
import { Bilingual } from '@/components/identity/Bilingual'
import { Button } from '@/components/atoms/Button'
/**
 * Intro Cover —— 进入项目之前的那一层。
 *
 * 【它不是 loading screen】
 * loading screen 的语义是「请等一下」，用户对它只有耐心没有兴趣。
 * 这一层的语义是「你正要进来」—— 像一本塔罗书的封面，
 * 翻开它是一个动作，不是一次等待。所以它不显示进度、不自动消失，
 * 只等用户自己按下那个按钮。
 *
 * 【它不替代 Home】
 * Cover → Enter → 原本的 Card First Home。首页的左右分栏 Hero 一行没动。
 *
 * 【为什么不做成一条路由】
 * 做成 `/cover` 会带来两个真问题：用户刷新会停在封面而不是他原本在的地方；
 * 深链（比如别人发来的 `/journal/xxx`）会被强行拐去封面。
 * 现在它只是 `/` 这一条路由内部的一个前置状态 ——
 * 深链一律直达，只有真正「打开这个网站」的人才会看到它。
 */

import { useState } from 'react'
import { DeckSigil } from '@/components/deck/DeckSigil'
import { useDeck } from '@/hooks/useDeck'

/**
 * 什么时候显示封面。**改这一个常量即可**，不需要动组件。
 *
 *   session  每次新开标签页/新访问显示一次；站内跳转与刷新不再打扰（默认）
 *   always   每次进首页都显示 —— 仪式感最强，但回头客会烦
 *   once     只在这台设备上显示一次，之后永不再出现
 *   off      完全关闭
 *
 * 默认选 `session`：封面是「进门」这个动作，一次访问进一次门是对的；
 * 而在站内点来点去时反复关门开门，就变成了阻碍。
 */
export type CoverMode = 'session' | 'always' | 'once' | 'off'
export const COVER_MODE: CoverMode = 'session'

const KEY = 'arcana:entered'

/** 读一次「这次访问是否已经进过门」。存储不可用时（无痕、禁用）一律放行 —— 封面不该挡住任何人 */
export function shouldShowCover(): boolean {
  if (COVER_MODE === 'off') return false
  if (COVER_MODE === 'always') return true
  try {
    const store = COVER_MODE === 'once' ? window.localStorage : window.sessionStorage
    return store.getItem(KEY) !== '1'
  } catch {
    return false
  }
}

export function markEntered(): void {
  if (COVER_MODE === 'always' || COVER_MODE === 'off') return
  try {
    const store = COVER_MODE === 'once' ? window.localStorage : window.sessionStorage
    store.setItem(KEY, '1')
  } catch {
    /* 存不下就每次都显示，不影响可用性 */
  }
}

interface Props {
  onEnter: () => void
}

export default function IntroCover({ onEnter }: Props) {
  const { deckId } = useDeck()
  const [leaving, setLeaving] = useState(false)

  const enter = () => {
    if (leaving) return
    setLeaving(true)
    markEntered()
    /* 【为什么不只用一个 setTimeout】
       后台标签页会把定时器节流到 1 秒以上。用户点完 Enter 立刻切走、
       过一会儿再回来，这一层就还挂在那里 —— 它此时 opacity 已经是 0，
       看不见，但 z-50 的全屏容器仍然吃掉所有点击，首页整个点不动。
       所以：以 transitionend 为主（过渡真的结束了才交棒），
       定时器只作兜底；离场期间同时挂 pointer-events-none，
       即便两条都没跑到，它也挡不住任何东西。 */
    window.setTimeout(onEnter, 400)
  }

  return (
    <div
      className={[
        'identity-cover isolate fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center px-6',
        /* 入场走 CSS 动画（后台标签页里 rAF 会被挂起，JS 触发的过渡可能永远不跑）；
           离场是用户点出来的，那一刻标签页一定在前台，用 state 切没问题。 */
        'cover-in motion-reduce:animate-none',
        'transition-opacity duration-[var(--duration-page)] ease-[var(--ease-veil)]',
        'motion-reduce:transition-none',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
      onTransitionEnd={(e) => {
        if (leaving && e.propertyName === 'opacity') onEnter()
      }}
    >
      <ArtBackdrop cover />
      {/* 视觉中心：牌组徽记。不另造一个纹章 —— 这个记号在氛围层与首页
          已经出现过，用同一个才成得了「这个项目的标记」。 */}
      <DeckSigil deckId={deckId} size="clamp(5.5rem, 22vw, 9rem)" opacity={0.55} />

      <h1
        className="mt-10 text-center text-text-hi"
        style={{
          fontFamily: 'var(--font-oracle)',
          fontSize: 'var(--text-brand-cover)',
          /* Cinzel 的 400 已经很有分量，再加重会变成"厚"而不是"刻" */
          fontWeight: 400,
          letterSpacing: 'var(--tracking-oracle)',
          lineHeight: 1.04,
        }}
      >
        Arcana
      </h1>

      <p
        className="mt-6 max-w-[24rem] text-center text-text-low"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(0.95rem, 3.6vw, 1.125rem)',
          lineHeight: 2,
          letterSpacing: '0.05em',
        }}
      >
        <Bilingual name="cover" />
      </p>

      <Button onClick={enter} autoFocus size="lg" variant="primary" subtitle="Enter the Reading" className="mt-10">
        开始占卜
      </Button>

      {/* 用 text-low 而不是 text-faint：实测 faint 在这个底色上只有 3.11:1，
          13px 的小字达不到 WCAG AA 的 4.5:1。low 是 5.55:1。
          封面上一共就四行字，没有一行可以是「看不清也无所谓」的。 */}
      <p
        className="mt-7 text-center text-caption text-text-low"
        style={{ letterSpacing: '0.04em' }}
      >
        亲手洗牌、切牌、摊牌、翻牌
      </p>
    </div>
  )
}
