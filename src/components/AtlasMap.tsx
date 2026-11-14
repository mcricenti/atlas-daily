import { motion } from 'framer-motion'
import type { GeoFact } from '../data/curriculum'

type Props = {
  options: GeoFact[]
  targetId: string
  highlightId?: string
  disabled?: boolean
  onSelect: (fact: GeoFact) => void
  feedback?: 'correct' | 'wrong' | null
  selectedId?: string | null
}

export function AtlasMap({
  options,
  targetId,
  highlightId,
  disabled,
  onSelect,
  feedback,
  selectedId,
}: Props) {
  return (
    <div className="atlas-grid relative overflow-hidden rounded-3xl border border-ocean-900/10 bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-700 shadow-inner">
      <svg viewBox="0 0 100 100" className="h-auto w-full max-h-[340px]">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7ed6c1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ed6c1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="50" rx="46" ry="42" fill="url(#glow)" />
        {/* Decorative latitude lines */}
        {[20, 40, 60, 80].map((y) => (
          <ellipse
            key={y}
            cx="50"
            cy={y}
            rx="42"
            ry={6 + (y === 50 ? 2 : 0)}
            fill="none"
            stroke="rgba(184,235,224,0.15)"
            strokeWidth="0.4"
          />
        ))}
        {[25, 50, 75].map((x) => (
          <ellipse
            key={x}
            cx={x}
            cy="50"
            rx={4}
            ry="38"
            fill="none"
            stroke="rgba(184,235,224,0.12)"
            strokeWidth="0.4"
          />
        ))}

        {options.map((fact) => {
          if (!fact.pin) return null
          const isTarget = fact.id === targetId
          const isHighlight = fact.id === highlightId || (isTarget && !selectedId)
          const isSelected = fact.id === selectedId
          const wrong =
            feedback === 'wrong' && isSelected && fact.id !== targetId
          const correct =
            feedback === 'correct' && (isSelected || fact.id === targetId)

          return (
            <g key={fact.id}>
              {(isHighlight || correct) && (
                <circle
                  cx={fact.pin.x}
                  cy={fact.pin.y}
                  r="6"
                  fill="rgba(126,214,193,0.25)"
                  className={isHighlight && !feedback ? 'animate-pulse-ring' : ''}
                />
              )}
              <motion.circle
                cx={fact.pin.x}
                cy={fact.pin.y}
                r={correct ? 4.2 : 3.4}
                fill={
                  correct
                    ? '#7ed6c1'
                    : wrong
                      ? '#e07a5f'
                      : isHighlight
                        ? '#f4a261'
                        : '#b8ebe0'
                }
                stroke="#06262f"
                strokeWidth="0.6"
                whileHover={disabled ? undefined : { scale: 1.25 }}
                whileTap={disabled ? undefined : { scale: 0.9 }}
                style={{ cursor: disabled ? 'default' : 'pointer' }}
                onClick={() => !disabled && onSelect(fact)}
              />
              <text
                x={fact.pin.x}
                y={fact.pin.y + 7.5}
                textAnchor="middle"
                fontSize="2.6"
                fill="rgba(243,239,230,0.85)"
                style={{ pointerEvents: 'none', fontFamily: 'Nunito, sans-serif' }}
              >
                {fact.name.length > 12 ? fact.name.slice(0, 11) + '…' : fact.name}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950/40 to-transparent px-4 pb-3 pt-8">
        <p className="text-center text-xs font-semibold tracking-wide text-sea-200/90">
          Stylized atlas · tap a glowing pin
        </p>
      </div>
    </div>
  )
}
