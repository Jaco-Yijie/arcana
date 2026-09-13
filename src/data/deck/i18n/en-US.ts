/**
 * English card text · 78 张齐全的覆盖层。
 *
 * 【为什么这个模块只做拼装】
 * 四个花色各自成文件，是为了让每一次内容修订的 diff 停在一个花色里 ——
 * 牌义是本产品最不该被无声改动的东西（见 fingerprint.ts）。
 *
 * 【它不会进主 bundle】
 * 唯一的引用点是 `src/i18n/boot.ts` 里的 `import('@/data/deck/i18n/en-US')`，
 * 所以 Vite 会把它单独切成一个 chunk，只在切到英文时下载。
 */

import type { CardTextMap } from '../localized'
import { majorEn } from './en/major'
import { wandsEn } from './en/wands'
import { cupsEn } from './en/cups'
import { swordsEn } from './en/swords'
import { pentaclesEn } from './en/pentacles'

export const cardTextEn: CardTextMap = {
  ...majorEn,
  ...wandsEn,
  ...cupsEn,
  ...swordsEn,
  ...pentaclesEn,
}

export default cardTextEn
