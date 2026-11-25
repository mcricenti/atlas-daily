import { useState } from 'react'
import { CONFETTI_PALETTES } from '../data/shop'

/** A short burst of paper confetti for finishing a lesson. */
export function Confetti({
  count = 44,
  theme = 'conf-classic',
}: {
  count?: number
  theme?: string
}) {
  const colors = CONFETTI_PALETTES[theme] ?? CONFETTI_PALETTES['conf-classic']
  const isStars = theme === 'conf-stars'

  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[i % colors.length],
      duration: 2.4 + Math.random() * 1.8,
      delay: Math.random() * 0.9,
      drift: `${Math.round((Math.random() - 0.5) * 30)}vw`,
      wide: i % 3 === 0,
    })),
  )

  return (
    <div className="no-print" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: isStars ? 'transparent' : p.color,
            color: p.color,
            width: isStars ? 18 : p.wide ? 14 : 9,
            height: isStars ? 18 : p.wide ? 9 : 15,
            fontSize: isStars ? 16 : undefined,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ['--drift' as string]: p.drift,
          }}
        >
          {isStars ? '★' : null}
        </span>
      ))}
    </div>
  )
}
