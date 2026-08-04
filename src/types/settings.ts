/** 设置与新手引导状态 */

/** 摊牌模式。free（自由桌面）在 MVP 中只保留入口与说明，不实现完整物理桌面。 */
export type SpreadMode = 'fan' | 'free'

export interface AppSettings {
  /** 新手引导开关 */
  guidanceEnabled: boolean
  /** 轻微音效 */
  soundEnabled: boolean
  /** 轻微震动（浏览器支持时） */
  hapticsEnabled: boolean
  spreadMode: SpreadMode
}

/** 需要被引导的流程步骤 */
export type GuidanceStep = 'shuffle' | 'cut' | 'draw' | 'place' | 'reveal'

export interface GuidanceState {
  /** 已经完整看过引导的步骤 —— 第二次以后自动弱化 */
  seen: GuidanceStep[]
  /** 是否已经完成过至少一次完整占卜 */
  completedOnce: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  guidanceEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  spreadMode: 'fan',
}

export const DEFAULT_GUIDANCE: GuidanceState = {
  seen: [],
  completedOnce: false,
}
