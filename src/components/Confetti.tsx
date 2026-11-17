import { useState } from 'react'

const COLORS = ['#e07a5f', '#f4a261', '#7ed6c1', '#ffd23f', '#8cc7f0', '#c9a7ea']

/** A short burst of paper confetti for finishing a lesson. */
export function Confetti({ count = 44 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
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
            backgroundColor: p.color,
            width: p.wide ? 14 : 9,
            height: p.wide ? 9 : 15,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ['--drift' as string]: p.drift,
          }}
        />
      ))}
    </div>
  )
}
