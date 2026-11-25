import { useEffect, useMemo, useRef, useState } from 'react'
import { geoDistance } from 'd3-geo'
import type { Topology } from 'topojson-specification'
import type { GeoFact } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'
import { WORLD_PLACES } from '../data/geo/worldCoords'
import { getMapTheme } from '../data/shop'
import {
  FULL_CAMERA,
  MAP_H,
  MAP_W,
  anchorForFact,
  boundsAround,
  buildAtlas,
  cameraFor,
  cameraToViewBox,
  centerLonFor,
  isUsFact,
  loadTopo,
  pointForFact,
  shapeForFact,
  shapeKeyForFact,
  unionBounds,
} from '../lib/geoData'

const EARTH_RADIUS_MILES = 3958.8

type Props = {
  fact: GeoFact
  regionFacts: GeoFact[]
  disabled?: boolean
  mapThemeId?: string
  onDrop: (result: { correct: boolean; close: boolean; miles: number }) => void
}

function trueLonLat(fact: GeoFact): [number, number] | null {
  if (isUsFact(fact)) {
    const c = CAPITAL_COORDS[fact.id]
    return c ? [c.lon, c.lat] : null
  }
  const p = WORLD_PLACES[fact.id]
  return p ? p.at : null
}

/** Interactive "Pin the spot" map: tap where the capital/place is and see miles off! */
export function PinDropMap({
  fact,
  regionFacts,
  disabled,
  mapThemeId,
  onDrop,
}: Props) {
  const kind = isUsFact(fact) ? 'us' : 'world'
  const theme = getMapTheme(mapThemeId)
  const [topo, setTopo] = useState<Topology | null>(null)
  const [pin, setPin] = useState<[number, number] | null>(null)
  const [miles, setMiles] = useState<number | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    let cancelled = false
    loadTopo(kind)
      .then((t) => {
        if (!cancelled) setTopo(t)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [kind])

  const view = useMemo(() => {
    if (!topo) return null
    const center = kind === 'world' ? centerLonFor(fact) : 0
    const atlas = buildAtlas(topo, kind, center)
    const targetPt = pointForFact(atlas, fact) ?? anchorForFact(atlas, fact)
    const targetShape = shapeForFact(atlas, fact)

    const boundsList = regionFacts
      .map((f) => {
        const s = shapeForFact(atlas, f)
        if (s) return s.bounds
        const a = anchorForFact(atlas, f)
        return a ? boundsAround(a, kind === 'us' ? 40 : 30) : null
      })
      .filter((b): b is NonNullable<typeof b> => Boolean(b))

    const cam =
      fact.kind === 'continent' || fact.kind === 'ocean' || !boundsList.length
        ? FULL_CAMERA
        : cameraFor(unionBounds(boundsList), 0.16, kind === 'us' ? 320 : 240)

    return { atlas, targetPt, targetShape, cam }
  }, [topo, kind, fact, regionFacts])

  if (!view || !view.targetPt) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-3xl bg-ocean-900 text-sm font-bold text-sea-200">
        Loading map…
      </div>
    )
  }

  const { atlas, targetPt, cam } = view
  const k = cam.w / MAP_W
  const targetShapeKey = shapeKeyForFact(fact)
  const bullseyeMiles = kind === 'us' ? 90 : 180
  const passMiles = kind === 'us' ? 230 : 440

  function handleTap(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled || pin) return
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const local = pt.matrixTransform(ctm.inverse())
    const dropped: [number, number] = [local.x, local.y]
    setPin(dropped)

    // Check if the user tapped inside the target shape directly
    const stack = document.elementsFromPoint(e.clientX, e.clientY)
    const insideShape = Boolean(
      targetShapeKey &&
        stack.some((el) => el.getAttribute('data-shape-key') === targetShapeKey),
    )

    const trueLL = trueLonLat(fact)
    const dropLL = atlas.invert(dropped[0], dropped[1])
    let distMiles: number
    if (trueLL && dropLL) {
      distMiles = Math.round(geoDistance(trueLL, dropLL) * EARTH_RADIUS_MILES)
    } else {
      const px = Math.hypot(dropped[0] - targetPt![0], dropped[1] - targetPt![1]) / k
      distMiles = Math.round(px * (kind === 'us' ? 6 : 22))
    }

    const ok = distMiles <= passMiles || insideShape
    const close = ok && distMiles > bullseyeMiles
    setMiles(distMiles)
    setPassed(ok)
    onDrop({ correct: ok, close, miles: distMiles })
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ocean-900/15 shadow-inner">
      <svg
        ref={svgRef}
        viewBox={cameraToViewBox(cam)}
        className="h-auto w-full max-h-[min(68vh,680px)] cursor-crosshair select-none"
        style={{ backgroundColor: theme.sea, touchAction: 'manipulation' }}
        role="img"
        aria-label="Tap to drop a pin"
        onPointerUp={handleTap}
      >
        <rect width={MAP_W} height={MAP_H} fill={theme.sea} />
        {atlas.shapes.map((s) => {
          const isTarget = Boolean(targetShapeKey && s.key === targetShapeKey)
          return (
            <path
              key={s.key}
              d={s.d}
              data-shape-key={s.key}
              fill={
                pin && isTarget
                  ? passed
                    ? theme.strong
                    : '#f2b5a3'
                  : theme.landNew
              }
              stroke={theme.stroke}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {pin && (
          <>
            <line
              x1={pin[0]}
              y1={pin[1]}
              x2={targetPt[0]}
              y2={targetPt[1]}
              stroke="#ffffff"
              strokeWidth={2.5 * k}
              strokeDasharray={`${6 * k} ${4 * k}`}
            />
            {/* User's dropped pin */}
            <circle
              cx={pin[0]}
              cy={pin[1]}
              r={8 * k}
              fill={passed ? '#2f6f4e' : '#e07a5f'}
              stroke="#ffffff"
              strokeWidth={2.2 * k}
            />
            {/* True location star */}
            <circle
              cx={targetPt[0]}
              cy={targetPt[1]}
              r={10 * k}
              fill="#ffd23f"
              stroke="#06262f"
              strokeWidth={2 * k}
            />
            <text
              x={targetPt[0]}
              y={targetPt[1] - 15 * k}
              textAnchor="middle"
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 13 * k,
                fontWeight: 800,
                fill: '#06262f',
                paintOrder: 'stroke',
                stroke: 'rgba(255,250,240,0.95)',
                strokeWidth: 4 * k,
              }}
            >
              {fact.capital ?? fact.name}
            </text>
          </>
        )}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06262f]/65 to-transparent px-4 pb-3 pt-8">
        <p className="text-center text-xs font-bold tracking-wide text-sand-100 sm:text-sm">
          {miles === null
            ? 'Tap anywhere on the map to drop your pin!'
            : miles <= bullseyeMiles
              ? `🎯 Bullseye! Only ${miles.toLocaleString()} miles away!`
              : passed
                ? `📍 Nice aim! ${miles.toLocaleString()} miles away.`
                : `📍 ${miles.toLocaleString()} miles away — the gold star marks the spot!`}
        </p>
      </div>
    </div>
  )
}
