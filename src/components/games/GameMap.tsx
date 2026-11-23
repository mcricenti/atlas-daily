import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { COLORS } from './gameKit'
import type { GeoFact } from '../../data/curriculum'
import { MAP_W, anchorForFact, cameraToViewBox, type Atlas, type Camera } from '../../lib/geoData'
import { highlightFor, type Highlight, type Tap } from '../../lib/mapGames'

export type MarkedFact = { fact: GeoFact; color: string; pulse: boolean }
export type Pin = { p: [number, number]; color: string; text?: string }
export type MapLabel = { p: [number, number]; text: string }

export function MapLoading() {
  return (
    <div className="flex aspect-[16/10] items-center justify-center rounded-3xl bg-ocean-900 text-sm font-bold text-sea-200">
      Unrolling the map…
    </div>
  )
}

export function GameMap({
  atlas,
  camera,
  onTap,
  highlights = [],
  fills = {},
  labels = [],
  pins = [],
  hint = null,
  wrongTap = null,
  dots = true,
  flash = null,
}: {
  atlas: Atlas
  camera: Camera
  onTap?: (tap: Tap) => void
  /** Places drawn the way the games show them (shape, line, marker) */
  highlights?: MarkedFact[]
  /** Extra shape fills by shape key */
  fills?: Record<string, string>
  labels?: MapLabel[]
  pins?: Pin[]
  hint?: { fact: GeoFact; jitter: [number, number] } | null
  wrongTap?: [number, number] | null
  /** Draw tiny islands as dots (off for the expert map) */
  dots?: boolean
  /** Briefly flash one shape (wrong taps in fill-in and neighbors) */
  flash?: { key: string; color: string; n: number } | null
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [unitsPerPx, setUnitsPerPx] = useState(camera.w / MAP_W)
  const clipId = `russia-${atlas.kind}`

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const measure = () => {
      const ctm = svg.getScreenCTM()
      if (ctm && ctm.a) setUnitsPerPx(1 / ctm.a)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    return () => ro.disconnect()
  }, [camera])

  const u = unitsPerPx
  const drawn = highlights.map((h) => ({ ...h, hl: highlightFor(atlas, h.fact, u) }))
  const filled = new Map<string, { color: string; hl?: Highlight }>()
  for (const [k, color] of Object.entries(fills)) filled.set(k, { color })
  for (const d of drawn) for (const k of d.hl.keys) filled.set(k, { color: d.color, hl: d.hl })

  const russia = atlas.shapes.find((s) => s.name === 'Russia')
  const russiaHalf = russia ? filled.get(russia.key)?.hl?.russiaHalf : undefined
  const split = atlas.project(60, 0)?.[0] ?? MAP_W / 2
  const west = atlas.project(0, 0)?.[0] ?? 0

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    if (!onTap) return
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    const el = (e.target as Element).closest('[data-key]')
    const key = el?.getAttribute('data-key')
    onTap({ p: [p.x, p.y], shape: key ? atlas.byKey.get(key) ?? null : null, unitsPerPx: 1 / ctm.a })
  }

  const hintPoint = hint ? anchorForFact(atlas, hint.fact) : null
  const hintR = 70 * u

  return (
    <div className="overflow-hidden rounded-3xl border border-ocean-900/15 bg-[#0f5363] shadow-lg">
      <svg
        ref={svgRef}
        viewBox={cameraToViewBox(camera)}
        className={`block h-auto max-h-[62vh] w-full select-none ${onTap ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label="Map"
        onClick={handleClick}
        style={{ touchAction: 'manipulation' }}
      >
        <defs>
          <clipPath id={clipId}>
            {russiaHalf === 'Europe' ? (
              <rect x={west} y={-1000} width={split - west} height={3000} />
            ) : (
              <>
                <rect x={split} y={-1000} width={4000} height={3000} />
                <rect x={-4000} y={-1000} width={4000 + 40} height={3000} />
              </>
            )}
          </clipPath>
        </defs>
        <rect x={-4000} y={-4000} width={9000} height={9000} fill={COLORS.water} />
        {atlas.shapes.map((s) => {
          const f = filled.get(s.key)
          const half = f?.hl?.russiaHalf && s.name === 'Russia'
          const flashing = flash?.key === s.key
          return (
            <g key={s.key}>
              <path
                d={s.d}
                data-key={s.key}
                fill={f && !half ? f.color : COLORS.land}
                stroke="#6b5a42"
                strokeWidth={0.6}
                strokeOpacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
              {half && <path d={s.d} data-key={s.key} fill={f!.color} clipPath={`url(#${clipId})`} stroke="none" />}
              {flashing && (
                <path
                  key={flash!.n}
                  d={s.d}
                  fill={flash!.color}
                  stroke="none"
                  className="game-flash"
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}
        {dots &&
          atlas.shapes
            .filter((s) => s.area < 6)
            .map((s) => (
              <circle
                key={`dot-${s.key}`}
                data-key={s.key}
                cx={s.cx}
                cy={s.cy}
                r={4 * u}
                fill={filled.get(s.key)?.color ?? COLORS.land}
                stroke="#6b5a42"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}

        {drawn.map((d, i) => (
          <Mark key={i} hl={d.hl} color={d.color} pulse={d.pulse} u={u} />
        ))}

        {hint && hintPoint && (
          <circle
            cx={hintPoint[0] + hint.jitter[0] * hintR * 0.8}
            cy={hintPoint[1] + hint.jitter[1] * hintR * 0.8}
            r={hintR}
            fill="#ffffff"
            fillOpacity={0.14}
            stroke={COLORS.target}
            strokeWidth={3}
            strokeDasharray="8 6"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {labels.map((l, i) => (
          <text
            key={`${l.text}-${i}`}
            x={l.p[0]}
            y={l.p[1]}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11 * u}
            fontWeight={800}
            fill="#06262f"
            stroke="#fff"
            strokeWidth={3 * u}
            paintOrder="stroke"
            pointerEvents="none"
          >
            {l.text}
          </text>
        ))}

        {pins.map((pin, i) => (
          <g key={i} pointerEvents="none">
            <circle cx={pin.p[0]} cy={pin.p[1]} r={11 * u} fill={pin.color} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            {pin.text && (
              <text
                x={pin.p[0]}
                y={pin.p[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11 * u}
                fontWeight={900}
                fill="#fff"
              >
                {pin.text}
              </text>
            )}
          </g>
        ))}

        {wrongTap && (
          <g pointerEvents="none" stroke={COLORS.wrong} strokeWidth={4} strokeLinecap="round">
            <line x1={wrongTap[0] - 7 * u} y1={wrongTap[1] - 7 * u} x2={wrongTap[0] + 7 * u} y2={wrongTap[1] + 7 * u} vectorEffect="non-scaling-stroke" />
            <line x1={wrongTap[0] + 7 * u} y1={wrongTap[1] - 7 * u} x2={wrongTap[0] - 7 * u} y2={wrongTap[1] + 7 * u} vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
    </div>
  )
}

function Mark({ hl, color, pulse, u }: { hl: Highlight; color: string; pulse: boolean; u: number }): ReactNode {
  const parts: ReactNode[] = []
  if (hl.line) {
    parts.push(
      <path key="glow" d={hl.line} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />,
      <path key="line" d={hl.line} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className={pulse ? 'game-blink' : undefined} />,
    )
  }
  if (hl.point) {
    const [x, y] = hl.point
    if (hl.marker === 'ocean') {
      parts.push(<circle key="sea" cx={x} cy={y} r={60 * u} fill={color} fillOpacity={0.35} />)
    }
    if (hl.marker === 'mountain') {
      const s = 16 * u
      parts.push(
        <path key="mt" d={`M${x},${y - s} L${x + s},${y + s * 0.7} L${x - s},${y + s * 0.7} Z`} fill={color} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />,
      )
    } else if (hl.marker === 'star') {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = (i % 2 ? 7 : 17) * u
        const a = (Math.PI / 5) * i - Math.PI / 2
        return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
      }).join(' ')
      parts.push(<polygon key="star" points={pts} fill={color} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />)
    } else if (hl.marker !== 'ocean') {
      parts.push(<circle key="dot" cx={x} cy={y} r={6 * u} fill={color} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />)
    }
    if (pulse) {
      parts.push(
        <circle key="halo" cx={x} cy={y} r={16 * u} fill="none" stroke="#fff" strokeWidth={3} strokeOpacity={0.9} vectorEffect="non-scaling-stroke" />,
        <circle key="ring" cx={x} cy={y} r={24 * u} fill="none" stroke={color} strokeWidth={5} vectorEffect="non-scaling-stroke" className="game-ring" />,
      )
    }
  }
  return <g pointerEvents="none">{parts}</g>
}
