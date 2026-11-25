/**
 * Subtle synthesized Web Audio sound effects (no external audio files needed).
 * All sounds fail silently if audio is muted or unavailable.
 */

const SFX_KEY = 'atlas-daily-sfx'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!loadSfxPref()) return null
  if (!ctx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    try {
      ctx = new AudioCtx()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined)
  }
  return ctx
}

export function loadSfxPref(): boolean {
  try {
    return localStorage.getItem(SFX_KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveSfxPref(on: boolean) {
  try {
    localStorage.setItem(SFX_KEY, on ? 'on' : 'off')
  } catch {
    /* private mode */
  }
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  volume = 0.12,
  type: OscillatorType = 'sine',
) {
  const c = getCtx()
  if (!c) return
  try {
    const t0 = c.currentTime + startOffset
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
  } catch {
    /* ignore audio errors */
  }
}

/** Cheerful two-note chime for a right answer. */
export function playCorrect() {
  tone(523.25, 0, 0.14, 0.11, 'triangle') // C5
  tone(659.25, 0.09, 0.22, 0.13, 'triangle') // E5
}

/** Warm, gentle low boop for a miss (never harsh). */
export function playWrong() {
  tone(260, 0, 0.14, 0.09, 'sine')
  tone(220, 0.1, 0.2, 0.08, 'sine')
}

/** Tactile stamp thunk + tiny sparkle for passport stamps & map placement. */
export function playStamp() {
  tone(150, 0, 0.09, 0.14, 'triangle')
  tone(587.33, 0.07, 0.16, 0.1, 'sine') // D5
  tone(880, 0.13, 0.2, 0.09, 'sine') // A5
}

/** Joyful completion arpeggio for finishing a lesson, challenge, or placement. */
export function playFanfare() {
  tone(523.25, 0, 0.14, 0.11, 'triangle') // C5
  tone(659.25, 0.1, 0.14, 0.11, 'triangle') // E5
  tone(783.99, 0.2, 0.16, 0.12, 'triangle') // G5
  tone(1046.5, 0.31, 0.35, 0.13, 'triangle') // C6
}

/** Sparkly coin sound when buying/unlocking in the Explorer Shop. */
export function playCoin() {
  tone(987.77, 0, 0.08, 0.1, 'sine') // B5
  tone(1318.51, 0.07, 0.22, 0.11, 'sine') // E6
}

/** Soft UI tap. */
export function playTap() {
  tone(420, 0, 0.04, 0.04, 'sine')
}
