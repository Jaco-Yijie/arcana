/**
 * Reading Feature Module —— Mock 解读相关的统一出口
 *
 * 本模块只处理「牌已经翻开之后」的事：
 * 问题优化建议、安全边界提示、综合解读、追问回答。
 * 它不产生、不读取、也不修改任何牌序或正逆位（G-12）。
 */

export { detectRisk, shouldSoftenTone, GENERAL_SAFETY_NOTICE, HARM_SAFETY_NOTICE } from './safety'
export type { RiskCategory, RiskLevel, RiskResult } from './safety'

export { optimizeQuestion } from './questionOptimizer'
export type { OptimizedQuestion } from './questionOptimizer'

export { generateReading, FORBIDDEN_PHRASES } from './mockReading'
export type { ReadingInput, ReadingPlacement } from './mockReading'

export { answerFollowUp } from './followUp'
export type { FollowUpContext } from './followUp'
