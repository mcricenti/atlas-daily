import type { GeoFact } from '../data/curriculum'

type Props = {
  options: GeoFact[]
  targetId: string
  highlightId?: string
  disabled?: boolean
  interactive?: boolean
  onSelect: (fact: GeoFact) => void
  feedback?: 'correct' | 'wrong' | null
  selectedId?: string | null
}

export function AtlasMap({
  options,
  targetId,
  highlightId,
  disabled,
  interactive = true,
  onSelect,
  feedback,
  selectedId,
}: Props) {
  const canTap = interactive && !disabled

  return (
    <div
      className="atlas-grid relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15 shadow-inner"
      style={{
        background:
          'linear-gradient(145deg, #0b3d4a 0%, #0f5363 45%, #176b7a 100%)',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none h-auto w-full max-h-[340px]"
        aria-hidden
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7ed6c1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ed6c1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="50" rx="46" ry="42" fill="url(#glow)" />
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
          const isHighlight =
            fact.id === highlightId || (isTarget && !selectedId && canTap)
          const showPin = interactive || fact.id === targetId || fact.id === highlightId
          if (!showPin && !interactive) return null

          const isSelected = fact.id === selectedId
          const wrong =
            feedback === 'wrong' && isSelected && fact.id !== targetId
          const correct =
            feedback === 'correct' && (isSelected || fact.id === targetId)

          return (
            <g key={fact.id}>
              {(isHighlight || correct || (!interactive && fact.id === targetId)) && (
                <circle
                  cx={fact.pin.x}
                  cy={fact.pin.y}
                  r="7"
                  fill="rgba(126,214,193,0.28)"
                />
              )}
              <circle
                cx={fact.pin.x}
                cy={fact.pin.y}
                r={correct ? 4.4 : 3.6}
                fill={
                  correct
                    ? '#7ed6c1'
                    : wrong
                      ? '#e07a5f'
                      : isHighlight || (!interactive && fact.id === targetId)
                        ? '#f4a261'
                        : '#b8ebe0'
                }
                stroke="#06262f"
                strokeWidth="0.6"
              />
              <text
                x={fact.pin.x}
                y={fact.pin.y + 8}
                textAnchor="middle"
                fontSize="2.8"
                fill="rgba(243,239,230,0.9)"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {fact.name.length > 12 ? fact.name.slice(0, 11) + '…' : fact.name}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Large HTML hit targets — more reliable than tiny SVG circles on touch */}
      {canTap &&
        options.map((fact) => {
          if (!fact.pin) return null
          return (
            <button
              key={`hit-${fact.id}`}
              type="button"
              aria-label={`Select ${fact.name}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4a261]"
              style={{
                left: `${fact.pin.x}%`,
                top: `${fact.pin.y}%`,
                width: '14%',
                height: '14%',
                minWidth: 44,
                minHeight: 44,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
              onPointerUp={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect(fact)
              }}
            />
          )
        })}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06262f]/50 to-transparent px-4 pb-3 pt-8">
        <p className="text-center text-xs font-semibold tracking-wide text-[#b8ebe0]">
          {canTap
            ? 'Tap a glowing pin on the atlas'
            : 'Find this place on the atlas'}
        </p>
      </div>
    </div>
  )
}
