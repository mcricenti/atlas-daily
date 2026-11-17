import type { Trophy } from '../lib/storage'

const COLORS: Record<Exclude<Trophy, null>, [string, string]> = {
  gold: ['#ffd23f', '#c99a06'],
  silver: ['#e3e8ec', '#9aa7b1'],
  bronze: ['#e8a46a', '#a8622c'],
}

/** A trophy cup; a plain medal outline when no trophy was earned. */
export function TrophyIcon({ kind, size = 40 }: { kind: Trophy; size?: number }) {
  if (!kind) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8" fill="none" stroke="#9aa7b1" strokeWidth="2" strokeDasharray="3 2" />
      </svg>
    )
  }
  const [fill, edge] = COLORS[kind]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M7 3h10v4a5 5 0 01-10 0z" fill={fill} stroke={edge} strokeWidth="1.2" />
      <path d="M7 5H4a3 3 0 003 4M17 5h3a3 3 0 01-3 4" fill="none" stroke={edge} strokeWidth="1.4" />
      <path d="M10.5 12h3l.5 4h-4z" fill={fill} stroke={edge} strokeWidth="1" />
      <rect x="8" y="16" width="8" height="3" rx="1" fill={fill} stroke={edge} strokeWidth="1.2" />
      <path d="M10 5.5l1.2 1.1L13.5 4.4" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}
