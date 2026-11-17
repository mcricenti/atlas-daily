import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { feature } from 'topojson-client'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import type { Topology } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import { factsForUnit, getUnit, type GeoFact } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'

type Props = {
  unitId: string
  explorerName: string
  onComplete: () => void
  onExit: () => void
}

const WIDTH = 960
const HEIGHT = 620
const STATES_TOPO_URL = `${import.meta.env.BASE_URL}geo/states-10m.json`
const CAPITAL_HIT_RADIUS = 48

type Phase = 'state' | 'capital'

type DragState = {
  active: boolean
  x: number
  y: number
  pointerId: number | null
}

export function UnitPlacementChallenge({
  unitId,
  explorerName,
  onComplete,
  onExit,
}: Props) {
  const unit = getUnit(unitId)
  const facts = useMemo(
    () =>
      factsForUnit(unitId).filter(
        (f) => f.kind === 'state' && f.capital && CAPITAL_COORDS[f.id],
      ),
    [unitId],
  )

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('state')
  const [topo, setTopo] = useState<Topology | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [drag, setDrag] = useState<DragState>({
    active: false,
    x: 0,
    y: 0,
    pointerId: null,
  })
  const svgRef = useRef<SVGSVGElement | null>(null)
  const trayRef = useRef<HTMLDivElement | null>(null)

  const fact = facts[index]

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
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const focusNames = useMemo(() => facts.map((f) => f.name), [facts])

  const { statePaths, capitals } = useMemo(() => {
    if (!topo || !facts.length) {
      return {
        statePaths: [] as { id: string; d: string; name: string; fact?: GeoFact }[],
        capitals: [] as { fact: GeoFact; x: number; y: number }[],
      }
    }

    const states = feature(
      topo,
      (topo.objects as { states: Topology['objects'][string] }).states,
    ) as FeatureCollection<Geometry>

    const focusSet = new Set(focusNames)
    const focusFeatures = states.features.filter((f) => {
      const name =
        (f.properties as { name?: string } | null)?.name ?? String(f.id)
      return focusSet.has(name)
    })

    const projection = geoAlbersUsa().fitExtent(
      [
        [28, 24],
        [WIDTH - 28, HEIGHT - 40],
      ],
      {
        type: 'FeatureCollection',
        features: focusFeatures.length ? focusFeatures : states.features,
      } as FeatureCollection<Geometry>,
    )
    const path = geoPath(projection)
    const byName = new Map(facts.map((f) => [f.name, f]))

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
          fact: byName.get(name),
        }
      })
      .filter(Boolean) as {
      id: string
      d: string
      name: string
      fact?: GeoFact
    }[]

    const caps: { fact: GeoFact; x: number; y: number }[] = []
    for (const f of facts) {
      const coord = CAPITAL_COORDS[f.id]
      if (!coord) continue
      const projected = projection([coord.lon, coord.lat])
      if (!projected) continue
      caps.push({ fact: f, x: projected[0], y: projected[1] })
    }

    return { statePaths: paths, capitals: caps }
  }, [topo, facts, focusNames])

  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  function beginDrag(e: React.PointerEvent) {
    if (feedback || !fact) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({
      active: true,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    })
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag.active || drag.pointerId !== e.pointerId) return
    setDrag((d) => ({ ...d, x: e.clientX, y: e.clientY }))
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag.active || drag.pointerId !== e.pointerId || !fact) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }

    const svgPoint = clientToSvg(e.clientX, e.clientY)
    setDrag({ active: false, x: 0, y: 0, pointerId: null })
    if (!svgPoint) {
      setFeedback('wrong')
      window.setTimeout(() => setFeedback(null), 900)
      return
    }

    let ok = false
    if (phase === 'state') {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const stateName = el?.getAttribute('data-state-name')
      ok = stateName === fact.name
    } else {
      const target = capitals.find((c) => c.fact.id === fact.id)
      if (target) {
        const dx = svgPoint.x - target.x
        const dy = svgPoint.y - target.y
        ok = Math.hypot(dx, dy) <= CAPITAL_HIT_RADIUS
      }
    }

    setFeedback(ok ? 'correct' : 'wrong')
    window.setTimeout(() => {
      setFeedback(null)
      if (!ok) return
      if (phase === 'state') {
        setPhase('capital')
        return
      }
      if (index + 1 >= facts.length) {
        onComplete()
      } else {
        setIndex((i) => i + 1)
        setPhase('state')
      }
    }, ok ? 650 : 950)
  }

  if (!unit || !facts.length) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white/90 p-8 text-center shadow-lg">
        <h2 className="font-display text-2xl text-ocean-900">
          Placement challenge
        </h2>
        <p className="mt-2 text-ocean-800/80">
          This section doesn&apos;t use state drag placement yet.
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 rounded-2xl bg-coral px-5 py-3 font-extrabold text-white"
        >
          Continue
        </button>
      </div>
    )
  }

  const chipLabel =
    phase === 'state'
      ? fact.name
      : `${fact.capital} · capital of ${fact.name}`

  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
        >
          Exit
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ocean-700">
            Section unlock · place on map
          </p>
          <h2 className="font-display text-xl text-ocean-950 sm:text-2xl">
            {unit.title} for {explorerName}
          </h2>
        </div>
        <span className="text-sm font-bold text-ocean-900">
          {index + 1}/{facts.length}
        </span>
      </div>

      <div className="rounded-3xl border border-ocean-900/8 bg-white/90 p-4 shadow-lg sm:p-6">
        <p className="text-base font-bold text-ocean-900 sm:text-lg">
          {phase === 'state'
            ? `Drag ${fact.name} onto its place on the map.`
            : `Now drag the capital pin to ${fact.capital}.`}
        </p>
        <p className="mt-1 text-sm font-semibold text-ocean-700">
          Drop carefully — you need both the state and the capital to move on.
        </p>

        <div className="relative mt-4 overflow-hidden rounded-3xl border border-[#0b3d4a]/15 bg-[#0b3d4a]">
          {!topo ? (
            <div className="flex h-[min(70vh,680px)] items-center justify-center text-sm font-bold text-[#b8ebe0]">
              Loading map…
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-auto w-full max-h-[min(70vh,720px)]"
              role="img"
              aria-label={`${unit.title} placement map`}
            >
              <rect width={WIDTH} height={HEIGHT} fill="#0b3d4a" />
              {statePaths.map((s) => {
                const inUnit = Boolean(s.fact)
                const isCurrent = s.fact?.id === fact.id
                return (
                  <path
                    key={s.id}
                    d={s.d}
                    data-state-name={s.name}
                    fill={
                      isCurrent && feedback === 'correct' && phase === 'state'
                        ? '#7ed6c1'
                        : inUnit
                          ? '#d8c3a5'
                          : '#7a6b58'
                    }
                    stroke={inUnit ? '#0b3d4a' : '#5c5043'}
                    strokeWidth={inUnit ? 1.4 : 0.5}
                    opacity={inUnit ? 1 : 0.28}
                  />
                )
              })}
              {phase === 'capital' &&
                capitals.map((c) => (
                  <circle
                    key={c.fact.id}
                    cx={c.x}
                    cy={c.y}
                    r={c.fact.id === fact.id ? CAPITAL_HIT_RADIUS : 6}
                    fill={
                      c.fact.id === fact.id
                        ? feedback === 'correct'
                          ? 'rgba(126,214,193,0.35)'
                          : 'rgba(244,162,97,0.25)'
                        : 'transparent'
                    }
                    stroke={
                      c.fact.id === fact.id ? '#f4a261' : 'transparent'
                    }
                    strokeWidth={2}
                    strokeDasharray={c.fact.id === fact.id ? '6 4' : undefined}
                    pointerEvents="none"
                  />
                ))}
            </svg>
          )}
        </div>

        <div
          ref={trayRef}
          className="mt-4 flex min-h-[4.5rem] items-center justify-center rounded-2xl border-2 border-dashed border-ocean-900/20 bg-sand-100/80 p-3"
        >
          {!feedback && (
            <motion.button
              type="button"
              className="select-none rounded-2xl bg-coral px-5 py-3 text-base font-extrabold text-white shadow-md touch-none sm:text-lg"
              style={{
                position: drag.active ? 'fixed' : 'relative',
                left: drag.active ? drag.x : undefined,
                top: drag.active ? drag.y : undefined,
                transform: drag.active
                  ? 'translate(-50%, -50%)'
                  : undefined,
                zIndex: drag.active ? 50 : undefined,
                touchAction: 'none',
              }}
              onPointerDown={beginDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {chipLabel}
            </motion.button>
          )}
          {feedback === 'correct' && (
            <p className="font-extrabold text-moss">Nice placement!</p>
          )}
          {feedback === 'wrong' && (
            <p className="font-extrabold text-coral">
              Try again — drag onto the right spot.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
