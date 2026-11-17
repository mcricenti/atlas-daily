import { useEffect, useId, useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import { geoAlbersUsa, geoEquirectangular, geoPath } from 'd3-geo'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoFact } from '../data/curriculum'
import { FACTS } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'
import { WORLD_PLACES } from '../data/geo/worldCoords'
import {
  FULL_CAMERA,
  MAP_W,
  anchorForFact,
  boundsAround,
  buildAtlas,
  cameraFor,
  cameraToViewBox,
  loadTopo,
  shapeForFact,
  unionBounds,
} from '../lib/geoData'

type Props = {
  options: GeoFact[]
  targetId: string
  highlightId?: string
  disabled?: boolean
  interactive?: boolean
  onSelect: (fact: GeoFact) => void
  feedback?: 'correct' | 'wrong' | null
  selectedId?: string | null
  /** Taller map for kid-friendly tapping */
  large?: boolean
  /** Zoom Albers USA to these state names (e.g. unit options) */
  focusNames?: string[]
  /** Which capital/state labels to draw */
  labelMode?: 'all' | 'options' | 'target' | 'none'
}

const WIDTH = 960
const HEIGHT = 600
const STATES_TOPO_URL = `${import.meta.env.BASE_URL}geo/states-10m.json`

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

function factFromCapitalId(id: string): GeoFact | undefined {
  return FACTS.find((f) => f.id === id)
}

export function AtlasMap(props: Props) {
  const sample =
    props.options.find((o) => o.id === props.targetId) ?? props.options[0]
  const usMode = props.options.some(isUsState) || (sample ? isUsState(sample) : false)

  if (usMode) {
    return <UsStatesMap {...props} />
  }
  return <WorldAtlasMap {...props} />
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
  large = false,
  focusNames,
  labelMode,
}: Props) {
  const gradId = useId()
  const canTap = interactive && !disabled
  const [topo, setTopo] = useState<Topology | null>(null)
  const [loadError, setLoadError] = useState(false)

  const optionIds = useMemo(() => new Set(options.map((o) => o.id)), [options])
  const optionNames = useMemo(
    () => new Set(options.map((o) => o.name)),
    [options],
  )
  const resolvedFocus = useMemo(() => {
    if (focusNames?.length) return focusNames
    if (interactive && options.length) return options.map((o) => o.name)
    const target = options.find((o) => o.id === targetId) ?? options[0]
    return target ? [target.name] : []
  }, [focusNames, interactive, options, targetId])
  const resolvedLabels =
    labelMode ?? (interactive ? 'options' : large ? 'target' : 'all')

  useEffect(() => {
    let cancelled = false
    fetch(STATES_TOPO_URL)
      .then((r) => {
        if (!r.ok) throw new Error('map fetch failed')
        return r.json()
      })
      .then((data: Topology) => {
        if (!cancelled) setTopo(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { landPath, statePaths, pins } = useMemo(() => {
    if (!topo) {
      return {
        landPath: '',
        statePaths: [] as {
          id: string
          d: string
          name: string
          isFocus: boolean
        }[],
        pins: [] as Pin[],
      }
    }

    const states = feature(
      topo,
      (topo.objects as { states: Topology['objects'][string] }).states,
    ) as FeatureCollection<Geometry>

    const focusSet = new Set(resolvedFocus)
    const focusFeatures = states.features.filter((f) => {
      const name =
        (f.properties as { name?: string } | null)?.name ?? String(f.id)
      return focusSet.has(name)
    })

    const projection = geoAlbersUsa()
    if (focusFeatures.length >= 1) {
      projection.fitExtent(
        [
          [36, 28],
          [WIDTH - 36, HEIGHT - 48],
        ],
        {
          type: 'FeatureCollection',
          features: focusFeatures,
        } as FeatureCollection<Geometry>,
      )
    } else {
      projection.fitSize([WIDTH, HEIGHT], states)
    }

    const path = geoPath(projection)
    const land = states.features
      .map((f) => path(f))
      .filter(Boolean)
      .join(' ')

    const paths = states.features
      .map((f) => {
        const d = path(f)
        if (!d) return null
        const name =
          (f.properties as { name?: string } | null)?.name ?? String(f.id)
        return {
          id: String(f.id),
          d,
          name,
          isFocus: focusSet.size === 0 || focusSet.has(name),
        }
      })
      .filter(Boolean) as {
      id: string
      d: string
      name: string
      isFocus: boolean
    }[]

    const nextPins: Pin[] = []
    for (const [id, coord] of Object.entries(CAPITAL_COORDS)) {
      const projected = projection([coord.lon, coord.lat])
      if (!projected) continue
      const fact =
        factFromCapitalId(id) ??
        ({
          id,
          kind: 'state',
          name: coord.state,
          capital: coord.capital,
          region: 'United States',
          unitId: 'us-west',
          clue: '',
        } satisfies GeoFact)
      nextPins.push({
        fact,
        x: projected[0],
        y: projected[1],
        labelPrimary: coord.state,
        labelSecondary: coord.capital,
      })
    }

    return { landPath: land, statePaths: paths, pins: nextPins }
  }, [topo, resolvedFocus])

  const nameToFact = useMemo(() => {
    const map = new Map<string, GeoFact>()
    for (const pin of pins) map.set(pin.fact.name, pin.fact)
    for (const fact of options) map.set(fact.name, fact)
    return map
  }, [pins, options])

  if (loadError) {
    return (
      <WorldAtlasMap
        options={options}
        targetId={targetId}
        highlightId={highlightId}
        disabled={disabled}
        interactive={interactive}
        onSelect={onSelect}
        feedback={feedback}
        selectedId={selectedId}
      />
    )
  }

  if (!topo) {
    return (
      <div
        className={`flex items-center justify-center rounded-3xl bg-[#0b3d4a] text-sm font-bold text-[#b8ebe0] ${
          large ? 'h-[min(72vh,720px)]' : 'h-[280px]'
        }`}
      >
        Loading United States map…
      </div>
    )
  }

  const targetFact = pins.find((p) => p.fact.id === targetId)?.fact
  const targetStateName = targetFact?.name

  function shouldShowLabel(pin: Pin) {
    if (resolvedLabels === 'none') return false
    if (resolvedLabels === 'all') return true
    if (resolvedLabels === 'target') {
      return pin.fact.id === targetId || pin.fact.id === highlightId
    }
    return optionIds.has(pin.fact.id)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15 shadow-inner">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`h-auto w-full bg-[#0b3d4a] ${
          large ? 'max-h-[min(72vh,760px)]' : 'max-h-[440px]'
        }`}
        role="img"
        aria-label="United States map"
      >
        <defs>
          <filter id={`${gradId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="#0b3d4a" />
        {statePaths.map((s) => {
          const isTarget = targetStateName === s.name
          const isOption = optionNames.has(s.name)
          const optionFact = nameToFact.get(s.name)
          const dimmed = resolvedFocus.length > 0 && !s.isFocus
          return (
            <path
              key={s.id}
              d={s.d}
              fill={
                isTarget
                  ? '#e8d4b8'
                  : isOption && canTap
                    ? '#efe0c8'
                    : dimmed
                      ? '#8a7a66'
                      : '#d8c3a5'
              }
              stroke={isOption && canTap ? '#0b3d4a' : '#8d7355'}
              strokeWidth={isOption && canTap ? 1.6 : dimmed ? 0.4 : 0.7}
              opacity={dimmed ? 0.35 : 1}
              style={
                canTap && isOption && optionFact
                  ? { cursor: 'pointer', touchAction: 'manipulation' }
                  : undefined
              }
              onPointerUp={(e) => {
                if (!canTap || !isOption || !optionFact) return
                e.preventDefault()
                e.stopPropagation()
                onSelect(optionFact)
              }}
            />
          )
        })}
        {!statePaths.length && (
          <path d={landPath} fill="#d8c3a5" stroke="#8d7355" strokeWidth={0.8} />
        )}

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
          const isOption = optionIds.has(pin.fact.id)
          const emphasize = isHighlight || isSelected || correct || wrong
          const showLabel = shouldShowLabel(pin)
          if (!showLabel && !isOption && !emphasize) return null

          const fill = correct
            ? '#2f6f4e'
            : wrong
              ? '#e07a5f'
              : emphasize
                ? '#e07a5f'
                : '#0f5363'

          const labelX = Math.min(Math.max(pin.x, 54), WIDTH - 54)
          const labelAbove = pin.y > 90
          const labelY = emphasize
            ? labelAbove
              ? pin.y - 28
              : pin.y + 38
            : labelAbove
              ? pin.y - 18
              : pin.y + 20

          return (
            <g key={pin.fact.id} filter={`url(#${gradId}-shadow)`}>
              {(emphasize || isOption) && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={emphasize ? 18 : 12}
                  fill={
                    correct
                      ? 'rgba(47,111,78,0.28)'
                      : isOption
                        ? 'rgba(126,214,193,0.22)'
                        : 'rgba(224,122,95,0.3)'
                  }
                />
              )}
              <circle
                cx={pin.x}
                cy={pin.y}
                r={emphasize ? 9 : isOption ? 7 : 4.5}
                fill={fill}
                stroke="#f7f4ee"
                strokeWidth={emphasize ? 2.2 : 1.2}
              />
              {emphasize && (
                <circle cx={pin.x} cy={pin.y} r={2.5} fill="#f7f4ee" />
              )}

              {showLabel &&
                (emphasize ? (
                  <g transform={`translate(${labelX}, ${labelY})`}>
                    <rect
                      x={-74}
                      y={-22}
                      width={148}
                      height={42}
                      rx={8}
                      fill="rgba(247,244,238,0.97)"
                      stroke="rgba(11,61,74,0.22)"
                    />
                    <text
                      textAnchor="middle"
                      y={-4}
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: large ? 14 : 12,
                        fontWeight: 800,
                        fill: '#0b3d4a',
                      }}
                    >
                      {pin.labelPrimary}
                    </text>
                    <text
                      textAnchor="middle"
                      y={14}
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: large ? 12 : 11,
                        fontWeight: 700,
                        fill: '#176b7a',
                      }}
                    >
                      {pin.labelSecondary}
                    </text>
                  </g>
                ) : (
                  <g transform={`translate(${labelX}, ${labelY})`}>
                    <text
                      textAnchor="middle"
                      y={0}
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: large ? 12 : 9.5,
                        fontWeight: 800,
                        fill: '#f7f4ee',
                        paintOrder: 'stroke',
                        stroke: 'rgba(6,38,47,0.85)',
                        strokeWidth: 2.5,
                      }}
                    >
                      {pin.labelPrimary}
                    </text>
                    <text
                      textAnchor="middle"
                      y={12}
                      style={{
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: large ? 11 : 8.5,
                        fontWeight: 700,
                        fill: '#b8ebe0',
                        paintOrder: 'stroke',
                        stroke: 'rgba(6,38,47,0.8)',
                        strokeWidth: 2.2,
                      }}
                    >
                      {pin.labelSecondary}
                    </text>
                  </g>
                ))}

              {canTap && isOption && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={large ? 36 : 28}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onPointerUp={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(pin.fact)
                  }}
                >
                  <title>
                    {pin.labelPrimary} — {pin.labelSecondary}
                  </title>
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06262f]/55 to-transparent px-4 pb-3 pt-10">
        <p className="text-center text-xs font-semibold tracking-wide text-[#b8ebe0] sm:text-sm">
          {canTap
            ? 'Zoomed region — tap the correct state or capital pin'
            : 'United States map'}
        </p>
      </div>
    </div>
  )
}

/** Pick a map centre so far-apart Pacific places are not split across the edges. */
function centerLonForOptions(options: GeoFact[]): number {
  let sx = 0
  let sy = 0
  let n = 0
  for (const fact of options) {
    const place = WORLD_PLACES[fact.id]
    if (!place) continue
    const rad = (place.at[0] * Math.PI) / 180
    sx += Math.cos(rad)
    sy += Math.sin(rad)
    n += 1
  }
  if (!n) return 0
  const spread = Math.hypot(sx, sy) / n
  const mean = (Math.atan2(sy, sx) * 180) / Math.PI
  if (spread < 0.6 || Math.abs(mean) < 75) return 0
  return Math.round(mean / 30) * 30
}

function WorldAtlasMap({
  options,
  targetId,
  highlightId,
  disabled,
  interactive = true,
  onSelect,
  feedback,
  selectedId,
  large = false,
}: Props) {
  const gradId = useId()
  const canTap = interactive && !disabled
  const [topo, setTopo] = useState<Topology | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadTopo('world')
      .then((data) => {
        if (!cancelled) setTopo(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const view = useMemo(() => {
    if (!topo) return null
    const atlas = buildAtlas(topo, 'world', centerLonForOptions(options))
    const spots = options
      .map((fact) => ({
        fact,
        shape: shapeForFact(atlas, fact),
        anchor: anchorForFact(atlas, fact),
      }))
      .filter(
        (s): s is typeof s & { anchor: [number, number] } => Boolean(s.anchor),
      )
    const cam = spots.length
      ? cameraFor(
          unionBounds(
            spots.map((s) =>
              s.shape && s.fact.kind === 'country'
                ? s.shape.bounds
                : boundsAround(s.anchor, s.fact.kind === 'country' ? 24 : 70),
            ),
          ),
          0.16,
          240,
        )
      : FULL_CAMERA
    const factByShape = new Map(
      spots.filter((s) => s.shape).map((s) => [s.shape!.key, s.fact]),
    )
    return { atlas, spots, cam, factByShape }
  }, [topo, options])

  if (loadError) {
    return (
      <FallbackPinMap
        options={options}
        targetId={targetId}
        highlightId={highlightId}
        disabled={disabled}
        interactive={interactive}
        onSelect={onSelect}
        feedback={feedback}
        selectedId={selectedId}
      />
    )
  }

  if (!view) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-3xl bg-[#0b3d4a] text-sm font-bold text-[#b8ebe0]">
        Loading world map…
      </div>
    )
  }

  const { atlas, spots, cam, factByShape } = view
  /** Map units per screen unit, so pins and labels keep their size when zoomed. */
  const k = cam.w / MAP_W

  function stateOf(fact: GeoFact) {
    const isSelected = fact.id === selectedId
    const isTarget = fact.id === targetId
    const wrong = feedback === 'wrong' && isSelected && !isTarget
    const correct = Boolean(feedback) && isTarget
    const highlighted = !interactive && (isTarget || fact.id === highlightId)
    return { wrong, correct, highlighted }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15 shadow-inner">
      <svg
        viewBox={cameraToViewBox(cam)}
        className={`h-auto w-full bg-[#0b3d4a] ${
          large ? 'max-h-[min(72vh,760px)]' : 'max-h-[460px]'
        }`}
        role="img"
        aria-label="World map"
      >
        <defs>
          <radialGradient id={`${gradId}-sea`} cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#1f8494" />
            <stop offset="100%" stopColor="#0b3d4a" />
          </radialGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${gradId}-sea)`} />

        {atlas.shapes.map((shape) => {
          const fact = factByShape.get(shape.key)
          const st = fact ? stateOf(fact) : null
          const tappable = Boolean(fact) && canTap
          return (
            <path
              key={shape.key}
              d={shape.d}
              fill={
                st?.correct
                  ? '#8fd3b0'
                  : st?.wrong
                    ? '#e07a5f'
                    : st?.highlighted
                      ? '#f4a261'
                      : fact && interactive
                        ? '#f7ecd6'
                        : '#d8c3a5'
              }
              stroke={fact && interactive ? '#0b3d4a' : '#8d7355'}
              strokeWidth={fact && interactive ? 1.5 : 0.6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={
                tappable
                  ? { cursor: 'pointer', touchAction: 'manipulation' }
                  : undefined
              }
              onPointerUp={(e) => {
                if (!tappable || !fact) return
                e.preventDefault()
                e.stopPropagation()
                onSelect(fact)
              }}
            />
          )
        })}

        {spots.map(({ fact, shape, anchor }) => {
          const st = stateOf(fact)
          const emphasize = st.correct || st.wrong || st.highlighted
          if (!interactive && !emphasize) return null
          const [x, y] = anchor
          const showDot = !shape || shape.area < 900 * k * k || emphasize
          const fill = st.correct ? '#2f6f4e' : st.wrong ? '#e07a5f' : '#0f5363'
          const fontSize = (emphasize ? 16 : 13) * k
          const halfText = fact.name.length * fontSize * 0.3 + 6 * k
          const labelX = Math.min(
            Math.max(x, cam.x + halfText),
            cam.x + cam.w - halfText,
          )
          return (
            <g key={fact.id}>
              {showDot && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={(emphasize ? 15 : 11) * k}
                    fill={
                      st.correct
                        ? 'rgba(47,111,78,0.3)'
                        : 'rgba(126,214,193,0.3)'
                    }
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={(emphasize ? 8 : 6) * k}
                    fill={fill}
                    stroke="#f7f4ee"
                    strokeWidth={1.8 * k}
                  />
                </>
              )}
              <text
                x={labelX}
                y={y + (showDot ? 26 : 5) * k}
                textAnchor="middle"
                style={{
                  fontFamily: 'Nunito, sans-serif',
                  fontSize,
                  fontWeight: 800,
                  fill: '#06262f',
                  paintOrder: 'stroke',
                  stroke: 'rgba(255,250,240,0.95)',
                  strokeWidth: 4 * k,
                  strokeLinejoin: 'round',
                  pointerEvents: 'none',
                }}
              >
                {fact.name}
              </text>
              {canTap && (
                <circle
                  cx={x}
                  cy={y}
                  r={(large ? 30 : 24) * k}
                  fill="transparent"
                  style={{ cursor: 'pointer', touchAction: 'manipulation' }}
                  onPointerUp={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(fact)
                  }}
                >
                  <title>{fact.name}</title>
                </circle>
              )}
            </g>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06262f]/55 to-transparent px-4 pb-3 pt-10">
        <p className="text-center text-xs font-semibold tracking-wide text-[#b8ebe0] sm:text-sm">
          {canTap ? 'Tap the correct place' : 'World map'}
        </p>
      </div>
    </div>
  )
}

function FallbackPinMap({
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
      const lon = -180 + (fact.pin!.x / 100) * 360
      const lat = 90 - (fact.pin!.y / 100) * 180
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
