import { useCallback, useMemo } from 'react'
import { useSettings } from './useSettings'
import { playSound, vibrate } from '@/utils/audio'
import type { SoundName } from '@/utils/audio'

/** 触觉强度：只允许「轻微」。禁止强烈震动（Guardrail G-08）。 */
const HAPTIC_PATTERN: Record<SoundName, number | number[]> = {
  riffle: 6,
  place: 12,
  flip: [8, 30, 10],
  tap: 4,
}

/**
 * 统一的轻量反馈入口：音效 + 触觉。
 * 两者都受用户设置控制，默认开启但可关闭。
 */
export function useFeedback() {
  const { settings } = useSettings()

  const feedback = useCallback(
    (name: SoundName) => {
      if (settings.soundEnabled) playSound(name)
      if (settings.hapticsEnabled) vibrate(HAPTIC_PATTERN[name])
    },
    [settings.soundEnabled, settings.hapticsEnabled],
  )

  return useMemo(
    () => ({
      riffle: () => feedback('riffle'),
      place: () => feedback('place'),
      flip: () => feedback('flip'),
      tap: () => feedback('tap'),
    }),
    [feedback],
  )
}
