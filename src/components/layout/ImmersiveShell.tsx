import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/** 四点式进度：空间定位，而不是任务清单（UX Spec §7 第 6 条） */
export const IMMERSIVE_STEPS = [
  { key: 'shuffle', label: '洗' },
  { key: 'cut', label: '切' },
  { key: 'draw', label: '抽' },
  { key: 'reveal', label: '翻' },
] as const

export type ImmersiveStep = (typeof IMMERSIVE_STEPS)[number]['key']

interface ImmersiveShellProps {
  step: ImmersiveStep | null
  children: ReactNode
  /** 退出去向。默认返回首页（Session 已持续持久化，无需确认框） */
  onExit?: () => void
  exitLabel?: string
  /** 沉浸条右侧的进度，例如「2/5」 */
  counter?: string
  /** 拖拽进行中：沉浸条屏蔽点击并压暗，避免误触（UX Spec §6.3） */
  interacting?: boolean
}

/**
 * 沉浸区外壳（/focus + /table/*）。
 * 关键约束：`position: fixed` + `100dvh` + `overflow: hidden` + `overscroll-behavior: none`
 * —— 从物理上消灭页面纵向滚动，这是手势冲突四道防线中的第一道（UX Spec §6.2）。
 */
export function ImmersiveShell({
  step,
  children,
  onExit,
  exitLabel = '退出',
  counter,
  interacting = false,
}: ImmersiveShellProps) {
  const navigate = useNavigate()
  const handleExit = () => {
    if (onExit) onExit()
    else navigate('/')
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-bg-deep"
      style={{ height: '100dvh', overscrollBehavior: 'none' }}
    >
      <div className="mx-auto flex h-full w-full max-w-[420px] flex-col">
        <header
          className={[
            'flex h-11 shrink-0 items-center px-1.5 transition-opacity duration-[var(--duration-base)]',
            interacting ? 'pointer-events-none opacity-40' : 'opacity-100',
          ].join(' ')}
          style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={handleExit}
            // min-w 而不是固定 w：「退出专注」比「退出」长，固定 44px 会把它折成两行
            className="flex h-11 min-w-11 items-center justify-center whitespace-nowrap px-2 text-caption text-text-faint transition-colors duration-[var(--duration-quick)] active:text-text-mid"
          >
            {exitLabel}
          </button>

          <div className="flex flex-1 items-center justify-center gap-3">
            {IMMERSIVE_STEPS.map((s) => {
              const active = s.key === step
              return (
                <span
                  key={s.key}
                  className={[
                    'text-caption transition-all duration-[var(--duration-base)]',
                    active ? 'text-silver' : 'text-text-faint/45',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              )
            })}
          </div>

          <span className="flex h-11 w-11 items-center justify-center text-caption text-text-faint tabular-nums">
            {counter}
          </span>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}

export default ImmersiveShell
