import { useEffect, useId, useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import {
  geoAlbersUsa,
  geoCentroid,
  geoEquirectangular,
  geoPath,
} from 'd3-geo'
import type { Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeoFact } from '../data/curriculum'
import { FACTS } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'

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
const STATES_TOPO_URL = '/geo/states-10m.json'
const WORLD_TOPO_URL = '/geo/countries-110m.json'

type Pin = {
  fact: GeoFact
  x: number
  y: number
  labelPrimary: string
  labelSecondary?: string
}

type CountryLabel = {
  id: string
  name: string
  x: number
  y: number
  area: number
  fact?: GeoFact
}

function isUsState(fact: GeoFact) {
  return fact.kind === 'state' && fact.region === 'United States'
}

function factFromCapitalId(id: string): GeoFact | undefined {
  return FACTS.find((f) => f.id === id)
}

function normalizeCountryName(name: string) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim()
}

const COUNTRY_ALIASES: Record<string, string> = {
  'united states of america': 'united states',
  usa: 'united states',
  'dem rep congo': 'democratic republic of the congo',
  congo: 'republic of the congo',
  'dominican rep': 'dominican republic',
  'central african rep': 'central african republic',
  "cote d'ivoire": 'ivory coast',
  "côte d'ivoire": 'ivory coast',
  czechia: 'czech republic',
  'bosnia and herz': 'bosnia and herzegovina',
  'eq guinea': 'equatorial guinea',
  's sudan': 'south sudan',
  'solomon is': 'solomon islands',
  'falkland is': 'falkland islands',
}

function countryMatchKey(name: string) {
  const n = normalizeCountryName(name)
  return COUNTRY_ALIASES[n] ?? n
}

function findCountryFact(name: string): GeoFact | undefined {
  const key = countryMatchKey(name)
  return FACTS.find(
    (f) => f.kind === 'country' && countryMatchKey(f.name) === key,
  )
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
}: Props) {
  const gradId = useId()
  const canTap = interactive && !disabled
  const [topo, setTopo] = useState<Topology | null>(null)
  const [loadError, setLoadError] = useState(false)

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

  const optionIds = useMemo(() => new Set(options.map((o) => o.id)), [options])

  const { landPath, statePaths, pins } = useMemo(() => {
    if (!topo) {
      return {
        landPath: '',
        statePaths: [] as { id: string; d: string; name: string }[],
        pins: [] as Pin[],
      }
    }

    const states = feature(
      topo,
      (topo.objects as { states: Topology['objects'][string] }).states,
    ) as FeatureCollection<Geometry>

    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], states)
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
        return { id: String(f.id), d, name }
      })
      .filter(Boolean) as { id: string; d: string; name: string }[]

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
  }, [topo])

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
      <div className="flex h-[280px] items-center justify-center rounded-3xl bg-[#0b3d4a] text-sm font-bold text-[#b8ebe0]">
        Loading United States map…
      </div>
    )
  }

  const targetFact = pins.find((p) => p.fact.id === targetId)?.fact
  const targetStateName = targetFact?.name

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15 shadow-inner">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full max-h-[440px] bg-[#0b3d4a]"
        role="img"
        aria-label="United States map with all state names and capitals"
      >
        <defs>
          <filter id={`${gradId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3" />
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="#0b3d4a" />
        {statePaths.map((s) => {
          const isTarget = targetStateName === s.name
          return (
            <path
              key={s.id}
              d={s.d}
              fill={isTarget ? '#e8d4b8' : '#d8c3a5'}
              stroke="#8d7355"
              strokeWidth={0.7}
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
              ? pin.y - 26
              : pin.y + 36
            : labelAbove
              ? pin.y - 16
              : pin.y + 18

          return (
            <g key={pin.fact.id} filter={`url(#${gradId}-shadow)`}>
              {emphasize && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={16}
                  fill={
                    correct ? 'rgba(47,111,78,0.28)' : 'rgba(224,122,95,0.3)'
                  }
                />
              )}
              <circle
                cx={pin.x}
                cy={pin.y}
                r={emphasize ? 8 : 4.5}
                fill={fill}
                stroke="#f7f4ee"
                strokeWidth={emphasize ? 2.2 : 1.2}
              />
              {emphasize && (
                <circle cx={pin.x} cy={pin.y} r={2.5} fill="#f7f4ee" />
              )}

              {emphasize ? (
                <g transform={`translate(${labelX}, ${labelY})`}>
                  <rect
                    x={-70}
                    y={-22}
                    width={140}
                    height={40}
                    rx={8}
                    fill="rgba(247,244,238,0.97)"
                    stroke="rgba(11,61,74,0.22)"
                  />
                  <text
                    textAnchor="middle"
                    y={-4}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 12,
                      fontWeight: 800,
                      fill: '#0b3d4a',
                    }}
                  >
                    {pin.labelPrimary}
                  </text>
                  <text
                    textAnchor="middle"
                    y={12}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 11,
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
                      fontSize: 8.5,
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
                    y={10}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 7.5,
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
              )}

              {canTap && isOption && (
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={26}
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
        <p className="text-center text-xs font-semibold tracking-wide text-[#b8ebe0]">
          {canTap
            ? 'All 50 states & capitals shown — tap the correct capital pin'
            : 'All 50 states and capitals on the United States'}
        </p>
      </div>
    </div>
  )
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
}: Props) {
  const gradId = useId()
  const canTap = interactive && !disabled
  const [topo, setTopo] = useState<Topology | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(WORLD_TOPO_URL)
      .then((r) => {
        if (!r.ok) throw new Error('world map fetch failed')
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

  const optionById = useMemo(() => {
    const map = new Map(options.map((o) => [o.id, o]))
    return map
  }, [options])

  const { countryPaths, labels, pins, projectionReady } = useMemo(() => {
    if (!topo) {
      return {
        countryPaths: [] as {
          id: string
          d: string
          name: string
          fact?: GeoFact
        }[],
        labels: [] as CountryLabel[],
        pins: [] as Pin[],
        projectionReady: false,
      }
    }

    const countries = feature(
      topo,
      (topo.objects as { countries: Topology['objects'][string] }).countries,
    ) as FeatureCollection<Geometry>

    const projection = geoEquirectangular().fitExtent(
      [
        [12, 24],
        [WIDTH - 12, HEIGHT - 36],
      ],
      countries,
    )
    const path = geoPath(projection)

    const nextPaths: {
      id: string
      d: string
      name: string
      fact?: GeoFact
    }[] = []
    const nextLabels: CountryLabel[] = []

    for (const f of countries.features) {
      const d = path(f)
      if (!d) continue
      const name =
        (f.properties as { name?: string } | null)?.name ?? String(f.id)
      if (name === 'Antarctica') continue
      const fact = findCountryFact(name)
      const id = String(f.id ?? name)
      nextPaths.push({ id, d, name, fact })

      const [cx, cy] = geoCentroid(f as Feature<Geometry>)
      const projected = projection([cx, cy])
      if (!projected) continue
      const area = Math.abs(path.area(f as Feature<Geometry>))
      nextLabels.push({
        id,
        name,
        x: projected[0],
        y: projected[1],
        area,
        fact,
      })
    }

    nextLabels.sort((a, b) => b.area - a.area)

    const nextPins: Pin[] = []
    for (const fact of options) {
      if (!fact.pin) continue
      if (
        !interactive &&
        fact.id !== targetId &&
        fact.id !== highlightId
      ) {
        continue
      }
      const lon = -180 + (fact.pin.x / 100) * 360
      const lat = 90 - (fact.pin.y / 100) * 180
      const projected = projection([lon, lat])
      if (!projected) continue
      nextPins.push({
        fact,
        x: projected[0],
        y: projected[1],
        labelPrimary: fact.name,
        labelSecondary: fact.capital,
      })
    }

    return {
      countryPaths: nextPaths,
      labels: nextLabels,
      pins: nextPins,
      projectionReady: true,
    }
  }, [topo, options, interactive, targetId, highlightId])

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

  if (!topo || !projectionReady) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-3xl bg-[#0b3d4a] text-sm font-bold text-[#b8ebe0]">
        Loading world map…
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#0b3d4a]/15 shadow-inner">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full max-h-[460px] bg-[#0b3d4a]"
        role="img"
        aria-label="World map with country names"
      >
        <defs>
          <filter id={`${gradId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.28" />
          </filter>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="#0b3d4a" />

        {countryPaths.map((c) => {
          const isTarget =
            c.fact?.id === targetId ||
            (highlightId && c.fact?.id === highlightId) ||
            countryMatchKey(c.name) ===
              countryMatchKey(optionById.get(targetId)?.name ?? '')
          return (
            <path
              key={c.id}
              d={c.d}
              fill={isTarget ? '#e8d4b8' : '#c9b396'}
              stroke="#6f5840"
              strokeWidth={0.45}
            />
          )
        })}

        {labels.map((label) => {
          const fontSize =
            label.area > 9000
              ? 11
              : label.area > 3500
                ? 9
                : label.area > 1200
                  ? 7.5
                  : 6.5
          const isLesson =
            label.fact &&
            (label.fact.id === targetId ||
              label.fact.id === highlightId ||
              optionById.has(label.fact.id))
          return (
            <text
              key={`lbl-${label.id}`}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: isLesson ? fontSize + 1.5 : fontSize,
                fontWeight: isLesson ? 800 : 700,
                fill: isLesson ? '#06262f' : '#f3efe6',
                paintOrder: 'stroke',
                stroke: isLesson
                  ? 'rgba(247,244,238,0.92)'
                  : 'rgba(6,38,47,0.75)',
                strokeWidth: isLesson ? 3 : 2.2,
                pointerEvents: 'none',
              }}
            >
              {label.name}
            </text>
          )
        })}

        {pins.map((pin) => {
          const isSelected = pin.fact.id === selectedId
          const wrong =
            feedback === 'wrong' && isSelected && pin.fact.id !== targetId
          const correct =
            feedback === 'correct' &&
            (isSelected || pin.fact.id === targetId)
          const isTarget = pin.fact.id === targetId
          const emphasize = isTarget || isSelected || correct || wrong

          if (!emphasize && pin.fact.kind === 'country') {
            return canTap ? (
              <circle
                key={pin.fact.id}
                cx={pin.x}
                cy={pin.y}
                r={22}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerUp={(e) => {
                  e.preventDefault()
                  onSelect(pin.fact)
                }}
              />
            ) : null
          }

          return (
            <g key={pin.fact.id} filter={`url(#${gradId}-glow)`}>
              <circle
                cx={pin.x}
                cy={pin.y}
                r={emphasize ? 9 : 6}
                fill={correct ? '#2f6f4e' : wrong ? '#e07a5f' : '#e07a5f'}
                stroke="#f7f4ee"
                strokeWidth={2}
              />
              {emphasize && (
                <g transform={`translate(${pin.x}, ${pin.y - 24})`}>
                  <rect
                    x={-72}
                    y={-20}
                    width={144}
                    height={pin.labelSecondary ? 38 : 24}
                    rx={8}
                    fill="rgba(247,244,238,0.97)"
                  />
                  <text
                    textAnchor="middle"
                    y={pin.labelSecondary ? -3 : 2}
                    style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: 12,
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
                        fontSize: 11,
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
                  r={26}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06262f]/55 to-transparent px-4 pb-3 pt-10">
        <p className="text-center text-xs font-semibold tracking-wide text-[#b8ebe0]">
          {canTap
            ? 'World map with country names — tap the correct place'
            : 'World map with country names'}
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
