/**
 * 极轻量音效。
 * 不加载任何音频文件 —— 全部用 WebAudio 现场合成，保证包体积与"安静"的调性。
 * 只有三种声音：纸牌摩擦 / 放牌 / 翻牌。没有背景音乐（简报 §18）。
 */

export type SoundName = 'riffle' | 'place' | 'flip' | 'tap'

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** 生成一段短噪声 buffer，用来模拟纸张摩擦 */
function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ac.sampleRate * seconds))
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    // 轻微衰减的白噪声
    data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  }
  return buffer
}

function playNoise(
  ac: AudioContext,
  { duration, gain, filterHz, q }: { duration: number; gain: number; filterHz: number; q: number },
) {
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac, duration)

  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterHz
  filter.Q.value = q

  const amp = ac.createGain()
  const now = ac.currentTime
  amp.gain.setValueAtTime(0, now)
  amp.gain.linearRampToValueAtTime(gain, now + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  src.connect(filter).connect(amp).connect(ac.destination)
  src.start(now)
  src.stop(now + duration)
}

export function playSound(name: SoundName): void {
  const ac = getContext()
  if (!ac) return
  switch (name) {
    case 'riffle':
      playNoise(ac, { duration: 0.22, gain: 0.05, filterHz: 2600, q: 0.7 })
      break
    case 'place':
      playNoise(ac, { duration: 0.11, gain: 0.07, filterHz: 900, q: 1.1 })
      break
    case 'flip':
      playNoise(ac, { duration: 0.3, gain: 0.06, filterHz: 1700, q: 0.5 })
      break
    case 'tap':
      playNoise(ac, { duration: 0.06, gain: 0.035, filterHz: 3200, q: 1.4 })
      break
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* noop */
  }
}
