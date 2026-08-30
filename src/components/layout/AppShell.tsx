import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface AppShellProps {
  /** 顶部返回按钮的去向。不传则不渲染返回 */
  back?: string | (() => void)
  title?: ReactNode
  /** 右上角次级操作（常规区才允许） */
  action?: ReactNode
  children: ReactNode
  /** 底部固定操作区（主 CTA） */
  footer?: ReactNode
  /**
   * 内容列宽度。
   *
   * `column`（默认）= 420px，与移动端完全一致，不做桌面专属布局（UX Spec §6.5）。
   * 这条规矩对**流程页**是对的：抽牌是一件专注的事，宽屏只会把注意力摊薄。
   *
   * `gallery` = 880px，**只给 /decks 用**。牌组画廊是全站唯一一个
   * 「同时看很多东西并比较」的页面：8 套牌 × (封面 + 卡背 + 5 张画风示例)。
   * 把它塞进 420px 的柱子里，在 1440 屏上只占 26% 宽度，两侧 74% 全是空背景 ——
   * 那不是克制，是把画廊做成了列表。
   */
  width?: 'column' | 'gallery'
  /**
   * 「一屏一个决定」的仪式页（输入问题 / 选牌阵 / 专注）设为 true。
   *
   * 这类页面旧版把内容顶在屏幕上方，下面留 40% 空白 —— 既不是居中也不是填满。
   * 垂直居中对它们是对的：它让人停下来，而不是让人往下找。
   */
  centered?: boolean
}

/**
 * 内容列宽度。**连续函数，不用断点。**
 *
 * 旧版是 `max-w-[420px] md:max-w-[560px] lg:max-w-[640px]` ——
 * 断点两侧宽度直接阶跃，拖动窗口时内容会「啪」地跳一下。
 *
 * `column`  = min(92vw, 40rem)：320px 上 294px，696px 起稳定 640px。
 *             上限 640 是阅读行宽的考虑，不是屏幕的考虑 ——
 *             输入问题、选牌阵这类页面行宽再宽反而更难读。
 * `gallery` = min(94vw, 68rem)：只给 /decks，那是全站唯一需要横向比较的页面。
 */
export const WIDTH_STYLE = {
  column: 'min(92vw, 40rem)',
  gallery: 'min(94vw, 68rem)',
} as const

export function AppShell({
  back,
  title,
  action,
  children,
  footer,
  width = 'column',
  centered = false,
}: AppShellProps) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'function') back()
    else if (typeof back === 'string') navigate(back)
  }

  return (
    <div
      className="relative mx-auto flex min-h-[100dvh] w-full flex-col"
      style={{ maxWidth: WIDTH_STYLE[width] }}
    >
      {(back || title || action) && (
        <header
          className="flex items-center gap-2 px-2"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          {back ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="返回"
              className="flex h-11 w-11 items-center justify-center rounded-sm text-text-low transition-colors duration-[var(--duration-quick)] active:text-text-hi"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M12.5 4 6.5 10l6 6"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <span className="h-11 w-11" />
          )}
          <span className="flex-1 truncate text-center text-note text-text-low">{title}</span>
          <span className="flex h-11 min-w-11 items-center justify-end pr-1">{action}</span>
        </header>
      )}

      {/* `centered` 的页面在内容不足一屏时垂直居中。
          不用 `h-screen + items-center` 那种写法 —— 浏览器窗口矮时它会把内容
          顶出可视区且无法滚动。这里用 justify-center + min-h-0，
          内容超高时自然退回顶部对齐并正常滚动。 */}
      <main
        className={[
          'flex flex-1 flex-col px-5 pb-8',
          centered ? 'justify-center' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>

      {/* 底部渐隐：长列表页（如 /decks）的内容会从 footer 底下穿过去，
          没有这层遮罩时 CTA 会和牌组卡片糊在一起，读不出层级。
          用渐变而不是实色块，避免在深色氛围里切出一条硬边。 */}
      {footer && (
        <div
          className="sticky bottom-0 px-5 pt-8"
          style={{
            paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
            /* 直接画在容器背景上，不用伪元素 + 负 z-index ——
               sticky 会建立自己的层叠上下文，负 z-index 的伪元素会掉到
               容器背景后面去，在页面上完全看不见。 */
            backgroundImage:
              'linear-gradient(to top, var(--color-bg-void) 45%, color-mix(in oklab, var(--color-bg-void) 82%, transparent) 72%, transparent 100%)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export default AppShell
