/** Read-aloud narration using the device's built-in voice (no downloads). */

const KEY = 'atlas-daily-voice'

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
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

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  return (
    english.find((v) => /samantha|jenny|aria|google us english/i.test(v.name)) ??
    english.find((v) => v.lang.toLowerCase() === 'en-us') ??
    english[0]
  )
}

/** Speak `text`; `onEnd` fires when it finishes or cannot play. Returns a stop function. */
export function speak(text: string, onEnd: () => void): () => void {
  if (!canSpeak()) {
    onEnd()
    return () => undefined
  }
  const synth = window.speechSynthesis
  let finished = false
  const done = () => {
    if (finished) return
    finished = true
    onEnd()
  }
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(
    text.replace(/[“”]/g, '').replace(/…/g, ','),
  )
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'en-US'
  utterance.rate = 0.92
  utterance.pitch = 1.05
  utterance.onend = done
  utterance.onerror = done
  synth.speak(utterance)
  return () => {
    finished = true
    synth.cancel()
  }
}

export function pauseSpeech() {
  if (canSpeak()) window.speechSynthesis.pause()
}

export function resumeSpeech() {
  if (canSpeak()) window.speechSynthesis.resume()
}
