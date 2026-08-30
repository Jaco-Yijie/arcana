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
  /**
   * 底部被浮层占用的高度（px）。内容列会让出这么多空间。
   *
   * 【为什么用内边距而不是给牌桌加位移】
   * 上一版是给牌桌单独加 translateY。两个问题：
   * 一、底部 CTA 不跟着动，抽屉照样把「开始完整解读」盖住（实测 360×740 复现）；
   * 二、位移量需要在渲染期读 getBoundingClientRect 才能算，而牌桌自己正在做
   *     位移动画 —— 每帧读到的值都不同，于是每帧重渲染，
   *     把抽屉的入场动画反复打断，实测卡在 translateY(127.77px) 再也没落下去。
   * 改成内边距之后，flex 列自然把牌桌与 CTA 一起顶上去，且不需要读 DOM。
   */
  bottomInset?: number
  /**
   * 内容宽度变体。**这是结构性区分，不是断点**：
   *
   * `table`  牌桌（抽牌 / 翻牌）—— 牌阵与扇形要吃满可用空间
   * `column` 一屏一个决定（专注 / 洗牌 / 切牌）—— 内容是一句话加一个按钮，
   *          拉到 1440px 只会让按钮变成一条横杠
   *
   * 两者各自都是**连续**的（min() 求解），只是上限不同。
   */
  variant?: 'table' | 'column'
}

const VARIANT_WIDTH = {
  table: 'min(96vw, 90rem)',
  column: 'min(92vw, 40rem)',
} as const

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
  bottomInset = 0,
  variant = 'column',
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
      {/* 【连续响应式，不用断点做宽度】
          旧版是 `max-w-[420px] md:max-w-[720px] lg:max-w-[1120px]` ——
          767→768 内容列瞬间从 420 跳到 720（+71%），1023→1024 再跳到 1120（+56%）。
          那不是响应式，是三套写死的宽度。

          现在用 `min(96vw, 90rem)`：320px 上是 307px，1500px 起稳定在 1440px，
          中间每一个像素都是连续的，且 1920 屏能真正用满。
          断点从此只做**结构性**切换（底部抽屉 ↔ 右侧栏）。 */}
      <div
        className="mx-auto flex h-full w-full flex-col"
        style={{ maxWidth: VARIANT_WIDTH[variant] }}
      >
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

        <div
          className="relative flex min-h-0 flex-1 flex-col transition-[padding] duration-[var(--duration-base)] ease-[var(--ease-settle)] motion-reduce:transition-none"
          style={{ paddingBottom: bottomInset || undefined }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default ImmersiveShell
