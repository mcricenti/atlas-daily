import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Topology } from 'topojson-specification'
import { factsForUnit, getUnit, type GeoFact } from '../data/curriculum'
import { WORLD_PLACES } from '../data/geo/worldCoords'
import {
  FULL_CAMERA,
  MAP_H,
  MAP_W,
  anchorForFact,
  boundsAround,
  buildAtlas,
  cameraFor,
  cameraToViewBox,
  isUsFact,
  linePath,
  loadTopo,
  pointForFact,
  shapeForFact,
  shapeKeyForFact,
  unionBounds,
} from '../lib/geoData'
import { playFanfare, playStamp, playWrong } from '../lib/sfx'

type Props = {
  unitId: string
  explorerName: string
  onComplete: () => void
  onExit: () => void
}

const CAPITAL_HIT_RADIUS_SCREEN = 52
const MAX_CHALLENGE_ITEMS = 12

type Phase = 'place' | 'capital'

type DragState = {
  active: boolean
  x: number
  y: number
  pointerId: number | null
}

function centerLonForFacts(facts: GeoFact[]): number {
  let sx = 0
  let sy = 0
  let n = 0
  for (const fact of facts) {
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

function pickChallengeFacts(unitId: string): GeoFact[] {
  const all = factsForUnit(unitId)
  if (all.length <= MAX_CHALLENGE_ITEMS) return all
  const copy = [...all]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, MAX_CHALLENGE_ITEMS)
}

export function UnitPlacementChallenge({
  unitId,
  explorerName,
  onComplete,
  onExit,
}: Props) {
  const unit = getUnit(unitId)
  const [facts] = useState<GeoFact[]>(() => pickChallengeFacts(unitId))
  const mapKind = facts.some(isUsFact) ? 'us' : 'world'

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('place')
  const [placedIds, setPlacedIds] = useState<string[]>([])
  const [topo, setTopo] = useState<Topology | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState>({
    active: false,
    x: 0,
    y: 0,
    pointerId: null,
  })
  const svgRef = useRef<SVGSVGElement | null>(null)
  const timerRef = useRef<number | null>(null)

  const fact = facts[index]

  useEffect(() => {
    let cancelled = false
    loadTopo(mapKind)
      .then((data) => {
        if (!cancelled) setTopo(data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [mapKind])

  const view = useMemo(() => {
    if (!topo || !facts.length) return null
    const centerLon = mapKind === 'world' ? centerLonForFacts(facts) : 0
    const atlas = buildAtlas(topo, mapKind, centerLon)

    const unitItems = facts.map((f) => {
      const shape = shapeForFact(atlas, f)
      const anchor = anchorForFact(atlas, f)
      const point = pointForFact(atlas, f)
      const place = WORLD_PLACES[f.id]
      const line = place?.line ? linePath(atlas, place.line) : ''
      return { fact: f, shape, anchor, point, line }
    })

    const hasGlobalItems = facts.some(
      (f) => f.kind === 'continent' || f.kind === 'ocean' || f.kind === 'river' || f.kind === 'mountain' || f.kind === 'landmark',
    )

    const boundsList = unitItems
      .map((item) => {
        if (item.shape) return item.shape.bounds
        if (item.anchor) return boundsAround(item.anchor, mapKind === 'us' ? 40 : 28)
        return null
      })
      .filter((b): b is NonNullable<typeof b> => Boolean(b))

    const cam =
      hasGlobalItems || !boundsList.length
        ? FULL_CAMERA
        : cameraFor(unionBounds(boundsList), 0.14, mapKind === 'us' ? 280 : 220)

    const byShapeKey = new Map<string, GeoFact>()
    for (const f of facts) {
      const key = shapeKeyForFact(f)
      if (key) byShapeKey.set(key, f)
    }

    const byContinent = new Map<string, GeoFact>()
    for (const f of facts) {
      if (f.kind === 'continent') byContinent.set(f.name, f)
    }

    return { atlas, unitItems, cam, byShapeKey, byContinent }
  }, [topo, facts, mapKind])

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

  /**
   * Look through every DOM element under (clientX, clientY) — never blocked by
   * a floating chip — and also fall back to SVG proximity for tiny states,
   * island nations, oceans, rivers, and landmarks.
   */
  function hitTestPlace(clientX: number, clientY: number): string | null {
    if (!view || !fact) return null
    const k = view.cam.w / MAP_W

    // 1. Direct DOM hit across all stacked elements (ignores pointer-events-none ghost)
    const stack = document.elementsFromPoint(clientX, clientY)
    for (const el of stack) {
      const id = el.getAttribute('data-place-id')
      if (id) return id
      const cont = el.getAttribute('data-continent-id')
      if (cont && fact.kind === 'continent') return cont
    }

    // 2. Proximity fallback in SVG coordinates for small shapes / non-polygon places
    const svgPt = clientToSvg(clientX, clientY)
    if (!svgPt) return null

    const snapRadius =
      (fact.kind === 'continent' || fact.kind === 'ocean'
        ? 85
        : fact.kind === 'river' || fact.kind === 'mountain' || fact.kind === 'landmark'
          ? 56
          : 34) * k

    let bestId: string | null = null
    let bestDist = snapRadius
    for (const item of view.unitItems) {
      const pt = item.anchor ?? item.point
      if (!pt) continue
      const d = Math.hypot(svgPt.x - pt[0], svgPt.y - pt[1])
      if (d <= bestDist) {
        bestDist = d
        bestId = item.fact.id
      }
    }
    return bestId
  }

  function evaluateAttempt(clientX: number, clientY: number, directId?: string) {
    if (feedback || !fact || !view) return
    const k = view.cam.w / MAP_W
    const svgPt = clientToSvg(clientX, clientY)

    let ok = false
    if (phase === 'place') {
      if (directId) {
        ok = directId === fact.id
      } else {
        const hitId = hitTestPlace(clientX, clientY)
        ok = hitId === fact.id
        // Extra forgiveness: check direct distance to the target's anchor/capital
        if (!ok && svgPt) {
          const item = view.unitItems.find((u) => u.fact.id === fact.id)
          const pt = item?.anchor ?? item?.point
          const generous =
            (fact.kind === 'ocean' || fact.kind === 'continent' ? 95 : 42) * k
          if (pt && Math.hypot(svgPt.x - pt[0], svgPt.y - pt[1]) <= generous) {
            ok = true
          }
        }
      }
    } else {
      const item = view.unitItems.find((u) => u.fact.id === fact.id)
      const capPt = item?.point ?? item?.anchor
      if (svgPt && capPt) {
        const dist = Math.hypot(svgPt.x - capPt[0], svgPt.y - capPt[1])
        ok = dist <= CAPITAL_HIT_RADIUS_SCREEN * k
      }
    }

    setFeedback(ok ? 'correct' : 'wrong')
    setHoveredId(null)
    if (ok) playStamp()
    else playWrong()

    const hasCapitalStep =
      phase === 'place' &&
      Boolean(fact.capital) &&
      Boolean(view.unitItems.find((u) => u.fact.id === fact.id)?.point)

    timerRef.current = window.setTimeout(() => {
      setFeedback(null)
      if (!ok) return
      if (hasCapitalStep) {
        setPhase('capital')
        return
      }
      setPlacedIds((prev) => (prev.includes(fact.id) ? prev : [...prev, fact.id]))
      if (index + 1 >= facts.length) {
        playFanfare()
        onComplete()
      } else {
        setIndex((i) => i + 1)
        setPhase('place')
      }
    }, ok ? 650 : 950)
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
    if (phase === 'place') {
      setHoveredId(hitTestPlace(e.clientX, e.clientY))
    }
  }

  function endDrag(e: React.PointerEvent) {
    if (!drag.active || drag.pointerId !== e.pointerId || !fact) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    setDrag({ active: false, x: 0, y: 0, pointerId: null })
    evaluateAttempt(e.clientX, e.clientY)
  }

  if (!unit || !facts.length) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white/90 p-8 text-center shadow-lg">
        <h2 className="font-display text-2xl text-ocean-900">Placement challenge</h2>
        <p className="mt-2 text-ocean-800/80">Nothing to place in this section yet.</p>
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
    phase === 'place'
      ? fact.name
      : `${fact.capital} · capital of ${fact.name}`

  const k = view ? view.cam.w / MAP_W : 1
  const currentItem = view?.unitItems.find((u) => u.fact.id === fact.id)

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
        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-extrabold text-ocean-900">
          {index + 1}/{facts.length}
        </span>
      </div>

      <div className="rounded-3xl border border-ocean-900/8 bg-white/90 p-4 shadow-lg sm:p-6">
        <p className="text-base font-bold text-ocean-900 sm:text-lg">
          {phase === 'place'
            ? `Drag ${fact.name} onto its spot on the map (or tap the spot).`
            : `Now drag the capital pin to ${fact.capital} (or tap the glowing ring).`}
        </p>
        <p className="mt-1 text-sm font-semibold text-ocean-700">
          {fact.capital
            ? 'Place both the location and its capital to light it up green.'
            : 'Match each place on the map to unlock the next trail stop.'}
        </p>

        <div className="relative mt-4 overflow-hidden rounded-3xl border border-[#0b3d4a]/15 bg-[#0b3d4a]">
          {!view ? (
            <div className="flex h-[min(66vh,620px)] items-center justify-center text-sm font-bold text-[#b8ebe0]">
              Loading map…
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={cameraToViewBox(view.cam)}
              className="h-auto w-full max-h-[min(68vh,680px)] select-none"
              role="img"
              aria-label={`${unit.title} placement map`}
              onClick={(e) => {
                if (drag.active || feedback) return
                evaluateAttempt(e.clientX, e.clientY)
              }}
            >
              <rect width={MAP_W} height={MAP_H} fill="#0b3d4a" />
              {view.atlas.shapes.map((s) => {
                const placeFact = view.byShapeKey.get(s.key)
                const continentFact = s.continent ? view.byContinent.get(s.continent) : undefined
                const matchFact = placeFact ?? continentFact
                const inUnit = Boolean(matchFact)
                const isPlaced = Boolean(matchFact && placedIds.includes(matchFact.id))
                const isCurrent = matchFact?.id === fact.id
                const isHovered = Boolean(matchFact && hoveredId === matchFact.id && phase === 'place')
                return (
                  <path
                    key={s.key}
                    d={s.d}
                    data-place-id={placeFact?.id}
                    data-continent-id={continentFact?.id}
                    fill={
                      isCurrent && feedback === 'correct' && phase === 'place'
                        ? '#7ed6c1'
                        : isPlaced
                          ? '#8fd3b0'
                          : isHovered
                            ? '#f4a261'
                            : inUnit
                              ? '#e8d7bc'
                              : '#7a6b58'
                    }
                    stroke={inUnit ? '#0b3d4a' : '#5c5043'}
                    strokeWidth={inUnit ? 1.4 : 0.5}
                    vectorEffect="non-scaling-stroke"
                    opacity={inUnit ? 1 : 0.3}
                    style={inUnit ? { cursor: 'pointer' } : undefined}
                    onClick={(e) => {
                      if (!inUnit || !matchFact || drag.active || feedback) return
                      e.stopPropagation()
                      if (phase === 'place') {
                        evaluateAttempt(e.clientX, e.clientY, matchFact.id)
                      } else {
                        evaluateAttempt(e.clientX, e.clientY)
                      }
                    }}
                  />
                )
              })}

              {/* Non-polygon spots (oceans, rivers, mountains, landmarks) & tiny island markers */}
              {view.unitItems.map((item) => {
                const pt = item.anchor ?? item.point
                if (!pt) return null
                const isTiny = !item.shape || item.shape.area < 450 * k * k
                const needsSpot = item.fact.kind !== 'state' && isTiny
                const isPlaced = placedIds.includes(item.fact.id)
                const isCurrent = item.fact.id === fact.id
                const isHovered = hoveredId === item.fact.id && phase === 'place'

                return (
                  <g key={item.fact.id}>
                    {item.line && (isPlaced || (isCurrent && feedback === 'correct')) && (
                      <path
                        d={item.line}
                        fill="none"
                        stroke={item.fact.kind === 'river' ? '#4fb4f5' : '#ff8fb1'}
                        strokeWidth={4 * k}
                        strokeLinecap="round"
                        pointerEvents="none"
                      />
                    )}
                    {needsSpot && (
                      <g
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          if (drag.active || feedback) return
                          e.stopPropagation()
                          evaluateAttempt(
                            e.clientX,
                            e.clientY,
                            phase === 'place' ? item.fact.id : undefined,
                          )
                        }}
                      >
                        <circle
                          cx={pt[0]}
                          cy={pt[1]}
                          r={(item.fact.kind === 'ocean' ? 22 : 13) * k}
                          data-place-id={item.fact.id}
                          fill={
                            isPlaced || (isCurrent && feedback === 'correct')
                              ? 'rgba(143,211,176,0.65)'
                              : isHovered
                                ? 'rgba(244,162,97,0.65)'
                                : 'rgba(247,236,214,0.35)'
                          }
                          stroke={isPlaced ? '#2f6f4e' : '#f7f4ee'}
                          strokeWidth={1.8 * k}
                        />
                        <circle
                          cx={pt[0]}
                          cy={pt[1]}
                          r={4.5 * k}
                          data-place-id={item.fact.id}
                          fill={isPlaced ? '#2f6f4e' : '#e07a5f'}
                        />
                      </g>
                    )}
                    {isPlaced && (
                      <text
                        x={pt[0]}
                        y={pt[1] + 4 * k}
                        textAnchor="middle"
                        pointerEvents="none"
                        style={{
                          fontFamily: 'Nunito, sans-serif',
                          fontSize: 11 * k,
                          fontWeight: 800,
                          fill: '#06262f',
                          paintOrder: 'stroke',
                          stroke: 'rgba(255,250,240,0.9)',
                          strokeWidth: 3 * k,
                        }}
                      >
                        {item.fact.name}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Capital drop ring in Phase 2 */}
              {phase === 'capital' && currentItem?.point && (
                <g
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    if (drag.active || feedback) return
                    e.stopPropagation()
                    evaluateAttempt(e.clientX, e.clientY)
                  }}
                >
                  <circle
                    cx={currentItem.point[0]}
                    cy={currentItem.point[1]}
                    r={CAPITAL_HIT_RADIUS_SCREEN * k}
                    fill={
                      feedback === 'correct'
                        ? 'rgba(126,214,193,0.4)'
                        : 'rgba(244,162,97,0.28)'
                    }
                    stroke={feedback === 'correct' ? '#7ed6c1' : '#f4a261'}
                    strokeWidth={2.5 * k}
                    strokeDasharray={`${6 * k} ${4 * k}`}
                  />
                  <circle
                    cx={currentItem.point[0]}
                    cy={currentItem.point[1]}
                    r={6 * k}
                    fill="#f4a261"
                    stroke="#ffffff"
                    strokeWidth={2 * k}
                  />
                </g>
              )}
            </svg>
          )}
        </div>

        <div className="mt-4 flex min-h-[4.5rem] items-center justify-center rounded-2xl border-2 border-dashed border-ocean-900/20 bg-sand-100/80 p-3">
          {!feedback && (
            <motion.button
              type="button"
              className="select-none rounded-2xl bg-coral px-5 py-3 text-base font-extrabold text-white shadow-md touch-none sm:text-lg"
              style={{
                opacity: drag.active ? 0.35 : 1,
                touchAction: 'none',
                cursor: drag.active ? 'grabbing' : 'grab',
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
            <p className="animate-pop font-extrabold text-moss">
              {phase === 'place' && fact.capital
                ? `Nice! Now place ${fact.capital}.`
                : `Spot on — ${fact.name}!`}
            </p>
          )}
          {feedback === 'wrong' && (
            <p className="animate-pop font-extrabold text-coral">
              Not quite — try dragging or tapping {phase === 'place' ? fact.name : fact.capital} again.
            </p>
          )}
        </div>
      </div>

      {/* Floating drag ghost: pointer-events-none ensures it NEVER blocks elementFromPoint! */}
      {drag.active && (
        <div
          className="pointer-events-none fixed z-50 select-none rounded-2xl bg-coral px-5 py-3 text-base font-extrabold text-white shadow-xl ring-4 ring-white/80 sm:text-lg"
          style={{
            left: drag.x,
            top: drag.y,
            transform: 'translate(-50%, -50%) scale(1.06)',
          }}
        >
          {chipLabel}
        </div>
      )}
    </div>
  )
}
