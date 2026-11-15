import { useMemo, useId } from 'react'
import { feature } from 'topojson-client'
import { geoAlbersUsa, geoPath, geoEquirectangular } from 'd3-geo'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoFact } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'
import statesTopo from '../data/geo/states-10m.json'

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

const WIDTH = 960
const HEIGHT = 600

type Pin = {
  fact: GeoFact
  x: number
  y: number
  labelPrimary: string
  labelSecondary?: string
}

function isUsState(fact: GeoFact) {
  return fact.kind === 'state' && fact.region === 'United States'
}

export function AtlasMap(props: Props) {
  const usMode = props.options.some(isUsState) || isUsState(
    props.options.find((o) => o.id === props.targetId) ?? props.options[0],
  )

  if (usMode) {
    return <UsStatesMap {...props} />
  }
  return <SimpleWorldMap {...props} />
}

function UsStatesMap({
  options,
  targetId,
  highlightId,
  disabled,
  interactive = true,
  onSelect,
  feedback,
  selectedId,
}: Props) {
  const gradId = useId()
  const canTap = interactive && !disabled

  const { landPath, pins } = useMemo(() => {
    const topo = statesTopo as unknown as Topology
    const states = feature(
      topo,
      topo.objects.states,
    ) as FeatureCollection<Geometry>

    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], states)
    const path = geoPath(projection)

    const land = states.features
      .map((f) => path(f))
      .filter(Boolean)
      .join(' ')

    const sourceFacts = interactive
      ? options
      : options.filter((f) => f.id === targetId || f.id === highlightId)

    const nextPins: Pin[] = []
    for (const fact of sourceFacts) {
      const coord = CAPITAL_COORDS[fact.id]
      if (!coord) continue
      const projected = projection([coord.lon, coord.lat])
      if (!projected) continue
      const [x, y] = projected
      nextPins.push({
        fact,
        x,
        y,
        labelPrimary: fact.name,
        labelSecondary: fact.capital ?? coord.capital,
      })
    }

    return { landPath: land, pins: nextPins }
  }, [options, interactive, targetId, highlightId])

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15 shadow-inner">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full max-h-[380px] bg-[#0b3d4a]"
        role="img"
        aria-label="United States map"
      >
        <defs>
          <filter id={`${gradId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Water */}
        <rect width={WIDTH} height={HEIGHT} fill="#0b3d4a" />

        {/* Land */}
        <path d={landPath} fill="#d8c3a5" stroke="#8d7355" strokeWidth={0.8} />

        {pins.map((pin) => {
          const isTarget = pin.fact.id === targetId
          const isHighlight =
            pin.fact.id === highlightId || (isTarget && !selectedId)
          const isSelected = pin.fact.id === selectedId
          const wrong =
            feedback === 'wrong' && isSelected && pin.fact.id !== targetId
          const correct =
            feedback === 'correct' &&
            (isSelected || pin.fact.id === targetId)

          const fill = correct
            ? '#2f6f4e'
            : wrong
              ? '#e07a5f'
              : isHighlight || !canTap
                ? '#e07a5f'
                : '#0f5363'

          const showLabel =
            !canTap || isHighlight || isSelected || correct || wrong

          const labelX = Math.min(Math.max(pin.x, 80), WIDTH - 80)
          const labelAbove = pin.y > 100
          const labelY = labelAbove ? pin.y - 22 : pin.y + 34

          return (
            <g key={pin.fact.id} filter={`url(#${gradId}-shadow)`}>
              {(isHighlight || correct || !canTap) && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={18}
                  fill={correct ? 'rgba(47,111,78,0.25)' : 'rgba(224,122,95,0.28)'}
                />
              )}
              <circle
                cx={pin.x}
                cy={pin.y}
                r={9}
                fill={fill}
                stroke="#f7f4ee"
                strokeWidth={2.5}
              />
              <circle cx={pin.x} cy={pin.y} r={3} fill="#f7f4ee" />

              {/* State + capital at the geographic capital location */}
              {showLabel && (
                <g transform={`translate(${labelX}, ${labelY})`}>
                  <rect
                    x={-72}
                    y={-24}
                    width={144}
                    height={pin.labelSecondary ? 44 : 28}
                    rx={8}
                    fill="rgba(247,244,238,0.97)"
                    stroke="rgba(11,61,74,0.2)"
                  />
                  <text
                    textAnchor="middle"
                    y={pin.labelSecondary ? -5 : 2}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 13,
                      fontWeight: 800,
                      fill: '#0b3d4a',
                    }}
                  >
                    {pin.labelPrimary}
                  </text>
                  {pin.labelSecondary ? (
                    <text
                      textAnchor="middle"
                      y={14}
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: 12,
                        fontWeight: 700,
                        fill: '#176b7a',
                      }}
                    >
                      {pin.labelSecondary}
                    </text>
                  ) : null}
                </g>
              )}

              {canTap && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={28}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onPointerUp={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(pin.fact)
                  }}
                >
                  <title>
                    {pin.labelPrimary}
                    {pin.labelSecondary ? ` — ${pin.labelSecondary}` : ''}
                  </title>
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06262f]/55 to-transparent px-4 pb-3 pt-10">
        <p className="text-center text-xs font-semibold tracking-wide text-[#b8ebe0]">
          {canTap
            ? 'Tap the pin at the capital on the map'
            : 'Capital marked on the United States'}
        </p>
      </div>
    </div>
  )
}

/** Fallback map for non-US units using fact.pin percentages */
function SimpleWorldMap({
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
  const projection = useMemo(
    () =>
      geoEquirectangular()
        .scale(140)
        .translate([WIDTH / 2, HEIGHT / 2]),
    [],
  )

  const pins: Pin[] = options
    .filter((f) => f.pin)
    .filter((f) =>
      interactive ? true : f.id === targetId || f.id === highlightId,
    )
    .map((fact) => {
      // Prefer capital coords if somehow present; else map pin % into lon/lat-ish space
      const lon = -180 + ((fact.pin!.x / 100) * 360)
      const lat = 90 - ((fact.pin!.y / 100) * 180)
      const projected = projection([lon, lat]) ?? [
        (fact.pin!.x / 100) * WIDTH,
        (fact.pin!.y / 100) * HEIGHT,
      ]
      return {
        fact,
        x: projected[0],
        y: projected[1],
        labelPrimary: fact.name,
        labelSecondary: fact.capital,
      }
    })

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15"
      style={{
        background:
          'linear-gradient(145deg, #0b3d4a 0%, #0f5363 45%, #176b7a 100%)',
      }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full max-h-[340px]">
        {pins.map((pin) => {
          const isSelected = pin.fact.id === selectedId
          const wrong =
            feedback === 'wrong' && isSelected && pin.fact.id !== targetId
          const correct =
            feedback === 'correct' &&
            (isSelected || pin.fact.id === targetId)
          return (
            <g key={pin.fact.id}>
              <circle
                cx={pin.x}
                cy={pin.y}
                r={10}
                fill={correct ? '#7ed6c1' : wrong ? '#e07a5f' : '#f4a261'}
                stroke="#06262f"
                strokeWidth={2}
              />
              <g transform={`translate(${pin.x}, ${pin.y - 22})`}>
                <rect
                  x={-70}
                  y={-20}
                  width={140}
                  height={pin.labelSecondary ? 38 : 24}
                  rx={8}
                  fill="rgba(247,244,238,0.95)"
                />
                <text
                  textAnchor="middle"
                  y={pin.labelSecondary ? -3 : 2}
                  style={{
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: 13,
                    fontWeight: 800,
                    fill: '#0b3d4a',
                  }}
                >
                  {pin.labelPrimary}
                </text>
                {pin.labelSecondary ? (
                  <text
                    textAnchor="middle"
                    y={14}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 12,
                      fontWeight: 700,
                      fill: '#176b7a',
                    }}
                  >
                    {pin.labelSecondary}
                  </text>
                ) : null}
              </g>
              {canTap && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={28}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onPointerUp={(e) => {
                    e.preventDefault()
                    onSelect(pin.fact)
                  }}
                />
              )}
            </g>
          )
        })}
      </svg>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-[#b8ebe0]">
        {canTap ? 'Tap a pin on the map' : 'Location on the atlas'}
      </p>
    </div>
  )
}
