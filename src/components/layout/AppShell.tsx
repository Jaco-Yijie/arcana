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
}

/**
 * 常规区外壳。桌面端把内容收在 420px 的列里 —— 布局与移动端完全一致，
 * 不做桌面专属布局（UX Spec §6.5）。
 */
export function AppShell({ back, title, action, children, footer }: AppShellProps) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'function') back()
    else if (typeof back === 'string') navigate(back)
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col">
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

      <main className="flex-1 px-5 pb-8">{children}</main>

      {footer && (
        <div
          className="sticky bottom-0 px-5 pt-3"
          style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

export default AppShell
