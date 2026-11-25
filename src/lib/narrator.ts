/**
 * Read-aloud narration. Plays a recorded clip (public/voice) when one exists for
 * the line, otherwise uses the device's built-in voice.
 */
import { speakableText, voiceKey } from './voiceKey'

const KEY = 'atlas-daily-voice'
const QUIZ_VOICE_KEY = 'atlas-daily-quiz-voice'
const BASE = import.meta.env.BASE_URL

let recorded: Set<string> | null = null
let current: HTMLAudioElement | null = null

/** Loads the list of recorded clips; call once at startup. */
export function loadRecordedVoice(): Promise<void> {
  return fetch(`${BASE}voice/manifest.json`)
    .then((r) => (r.ok ? r.json() : { clips: [] }))
    .then((m: { clips?: string[] }) => {
      recorded = new Set(m.clips ?? [])
    })
    .catch(() => {
      recorded = new Set()
    })
}

export function recordedClipKeys(): string[] {
  return recorded ? [...recorded] : []
}

function hasDeviceVoice() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function canSpeak(): boolean {
  return hasDeviceVoice() || Boolean(recorded?.size)
}

export function loadVoicePref(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function saveVoicePref(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* private mode: the preference just won't stick */
  }
}

export function loadQuizVoicePref(): boolean {
  try {
    return localStorage.getItem(QUIZ_VOICE_KEY) === 'on'
  } catch {
    return false
  }
}

export function saveQuizVoicePref(on: boolean) {
  try {
    localStorage.setItem(QUIZ_VOICE_KEY, on ? 'on' : 'off')
  } catch {
    /* private mode */
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return (
    english.find((v) => /samantha|jenny|aria|google us english/i.test(v.name)) ??
    english.find((v) => v.lang.toLowerCase() === 'en-us') ??
    english[0]
  )
}

export function stopSpeech() {
  if (current) {
    current.onended = null
    current.onerror = null
    current.pause()
    current = null
  }
  if (hasDeviceVoice()) window.speechSynthesis.cancel()
}

function speakWithDevice(text: string, done: () => void) {
  if (!hasDeviceVoice()) {
    done()
    return
  }
  const utterance = new SpeechSynthesisUtterance(speakableText(text))
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'en-US'
  utterance.rate = 0.92
  utterance.pitch = 1.05
  utterance.onend = done
  utterance.onerror = done
  window.speechSynthesis.speak(utterance)
}

/** Speak `text`; `onEnd` fires when it finishes or cannot play. Returns a stop function. */
export function speak(text: string, onEnd: () => void): () => void {
  let finished = false
  const done = () => {
    if (finished) return
    finished = true
    onEnd()
  }
  stopSpeech()

  const key = voiceKey(text)
  if (recorded?.has(key)) {
    const audio = new Audio(`${BASE}voice/${key}.mp3`)
    current = audio
    audio.onended = done
    // If the clip can't play (e.g. offline and never cached), use the device voice.
    audio.onerror = () => speakWithDevice(text, done)
    audio.play().catch(() => speakWithDevice(text, done))
  } else {
    speakWithDevice(text, done)
  }

  return () => {
    finished = true
    stopSpeech()
  }
}

/** Fire-and-forget pronunciation helper for quiz prompts and place/capital names. */
export function pronounce(text: string) {
  speak(text, () => undefined)
}

/** Warm the browser cache for an upcoming recorded clip if it exists. */
export function preloadVoiceLine(text: string) {
  const key = voiceKey(text)
  if (!recorded?.has(key)) return
  const audio = new Audio(`${BASE}voice/${key}.mp3`)
  audio.preload = 'auto'
}

export function pauseSpeech() {
  if (current) current.pause()
  else if (hasDeviceVoice()) window.speechSynthesis.pause()
}

export function resumeSpeech() {
  if (current) current.play().catch(() => undefined)
  else if (hasDeviceVoice()) window.speechSynthesis.resume()
}
