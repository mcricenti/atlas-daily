/**
 * Recorded narration is stored as public/voice/<key>.mp3, where the key comes
 * from the exact words spoken. Change a line and it simply gets a new key, so
 * the recording script knows to make a fresh clip.
 */
export function voiceKey(text: string): string {
  // FNV-1a, 32-bit, written out twice with different seeds for a 64-bit-ish key.
  let a = 0x811c9dc5
  let b = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
}

/** The text actually sent to a voice: no curly quotes, pauses instead of ellipses/arrows. */
export function speakableText(text: string): string {
  return text
    .replace(/[“”]/g, '')
    .replace(/…/g, ',')
    .replace(/\s*→\s*/g, ', ')
}
