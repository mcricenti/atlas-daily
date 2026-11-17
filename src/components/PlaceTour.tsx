import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'
import type { GeoFact } from '../data/curriculum'
import { RUSSIA_SPLIT_LON, WORLD_PLACES } from '../data/geo/worldCoords'
import {
  FULL_CAMERA,
  US_TRUE_LAYOUT,
  MAP_H,
  MAP_W,
  boundsAround,
  boundsForBox,
  buildAtlas,
  cameraFor,
  cameraToViewBox,
  centerLonFor,
  isUsFact,
  linePath,
  loadTopo,
  pointForFact,
  shapeForFact,
  toScreen,
  type Atlas,
  type Camera,
  type Shape,
} from '../lib/geoData'
import {
  canSpeak,
  loadVoicePref,
  pauseSpeech,
  resumeSpeech,
  saveVoicePref,
  speak,
} from '../lib/narrator'
import { buildTour, sceneDuration, type TourCameraName } from '../lib/tour'

type Props = {
  fact: GeoFact
  /** Called once, when the tour reaches its last scene */
  onFinished?: () => void
}

const LAND = '#efe3cc'
const LAND_EDGE = '#a8926f'
const TARGET = '#e07a5f'
const NEIGHBOR_COLORS = [
  '#f6c453',
  '#8fd3b0',
  '#c9a7ea',
  '#8cc7f0',
  '#f3a6bb',
  '#b8d96b',
]

const LINE_STYLE: Record<string, { color: string; label: string }> = {
  river: { color: '#4fb4f5', label: 'river' },
  landmark: { color: '#ff8fb1', label: 'landmark' },
}

/** The U.S. map only draws the states, so name what surrounds them. */
const US_CONTEXT: { text: string; at: [number, number]; water?: boolean }[] = [
  { text: 'Canada', at: [-110, 50.2] },
  { text: 'Canada', at: [-84.5, 49.6] },
  { text: 'Canada', at: [-71.2, 47.6] },
  { text: 'Mexico', at: [-106.6, 30.2] },
  { text: 'Atlantic Ocean', at: [-72.5, 35.5], water: true },
  { text: 'Pacific Ocean', at: [-126.2, 37.5], water: true },
  { text: 'Gulf of Mexico', at: [-90.5, 27.6], water: true },
]

/** Labels for the Alaska and Hawaii tours, which show the states' real positions. */
const US_TRUE_CONTEXT: typeof US_CONTEXT = [
  { text: 'Canada', at: [-112, 58] },
  { text: 'Pacific Ocean', at: [-148, 40], water: true },
]

type Geo = {
  atlas: Atlas
  shape: Shape | null
  targetKeys: Set<string>
  neighbors: Shape[]
  /** Capital for states/countries; the place itself for everything else */
  point: [number, number] | null
  /** Where to hang the name label */
  anchor: [number, number] | null
  line: string
  cameras: Record<TourCameraName, Camera>
  russiaClip: { x: number; w: number }[] | null
}

function buildGeo(atlas: Atlas, fact: GeoFact): Geo {
  const us = atlas.kind === 'us'
  const shape = shapeForFact(atlas, fact)
  const point = pointForFact(atlas, fact)
  const place = WORLD_PLACES[fact.id]
  const targetKeys = new Set<string>()
  let russiaClip: Geo['russiaClip'] = null

  if (shape) targetKeys.add(shape.key)
  if (fact.kind === 'continent') {
    for (const s of atlas.shapes) {
      if (s.continent === fact.name) targetKeys.add(s.key)
    }
    const split = atlas.project(RUSSIA_SPLIT_LON, 0)?.[0]
    const west = atlas.project(0, 0)?.[0]
    if (split != null && west != null) {
      if (fact.name === 'Europe') russiaClip = [{ x: west, w: split - west }]
      if (fact.name === 'Asia') {
        russiaClip = [
          { x: split, w: MAP_W - split },
          { x: 0, w: 40 },
        ]
      }
    }
  }

  const neighbors = shape
    ? ((atlas.neighbors.get(shape.key) ?? [])
        .map((k) => atlas.byKey.get(k))
        .filter(Boolean) as Shape[]).sort((a, b) => b.area - a.area)
    : []

  let region: Camera
  let close: Camera
  const boxBounds = place?.box ? boundsForBox(atlas, place.box) : null
  if (shape && (fact.kind === 'state' || fact.kind === 'country')) {
    region =
      us && centerLonFor(fact) === US_TRUE_LAYOUT
        ? cameraFor(shape.bounds, 1.1, 560)
        : cameraFor(shape.bounds, 0.75, us ? 300 : 150)
    close = cameraFor(shape.bounds, 0.28, us ? 130 : 48)
  } else if (boxBounds) {
    region = cameraFor(boxBounds, 0.04, 120)
    close = region
  } else if (point) {
    region = cameraFor(boundsAround(point, us ? 150 : 85), 0, 120)
    close = cameraFor(boundsAround(point, us ? 70 : 38), 0, 60)
  } else {
    region = FULL_CAMERA
    close = FULL_CAMERA
  }

  return {
    atlas,
    shape,
    targetKeys,
    neighbors,
    point,
    anchor: shape ? [shape.cx, shape.cy] : point,
    line: place?.line ? linePath(atlas, place.line) : '',
    cameras: { wide: FULL_CAMERA, region, close },
    russiaClip,
  }
}

const MAX_NEIGHBOR_LABELS = 6

/** Spread name tags out so they do not sit on top of each other. */
function placeLabels(
  cam: Camera,
  fixed: { p: [number, number]; text: string } | null,
  items: { p: [number, number]; text: string }[],
) {
  type Box = { x: number; y: number; w: number; h: number }
  const boxFor = (p: [number, number], text: string, big = false): Box => {
    const [sx, sy] = toScreen(cam, p)
    const w = text.length * (big ? 1.5 : 1.15) + 4
    return {
      x: Math.min(Math.max((sx / MAP_W) * 100, w / 2 + 1), 99 - w / 2),
      y: Math.min(Math.max((sy / MAP_H) * 100, 14), 90),
      w,
      h: big ? 9 : 7,
    }
  }
  const hit = (a: Box, b: Box) =>
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
  const placed: Box[] = fixed ? [boxFor(fixed.p, fixed.text, true)] : []
  return items.map((item) => {
    const box = boxFor(item.p, item.text)
    const home = box.y
    for (let step = 1; step <= 12 && placed.some((b) => hit(box, b)); step++) {
      // Try a little below, then a little above, moving further each time.
      const offset = Math.ceil(step / 2) * 7.5 * (step % 2 ? 1 : -1)
      box.y = Math.min(Math.max(home + offset, 14), 90)
    }
    placed.push(box)
    return { left: `${box.x}%`, top: `${box.y}%` }
  })
}

function pct(cam: Camera, p: [number, number], clamp = true) {
  const [sx, sy] = toScreen(cam, p)
  let x = (sx / MAP_W) * 100
  let y = (sy / MAP_H) * 100
  if (clamp) {
    x = Math.min(Math.max(x, 9), 91)
    y = Math.min(Math.max(y, 9), 88)
  }
  return { left: `${x}%`, top: `${y}%` }
}

export function PlaceTour({ fact, onFinished }: Props) {
  const gradId = useId()
  const reducedMotion = useReducedMotion()
  const kind = isUsFact(fact) ? 'us' : 'world'
  const trueLayout = kind === 'us' && centerLonFor(fact) === US_TRUE_LAYOUT
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadTopo(kind)
      .then((topo) => {
        if (!cancelled) setAtlas(buildAtlas(topo, kind, centerLonFor(fact)))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [kind, fact])

  const geo = useMemo(() => (atlas ? buildGeo(atlas, fact) : null), [atlas, fact])

  const scenes = useMemo(
    () =>
      buildTour(fact, {
        neighborNames: geo?.neighbors.map((n) => n.label) ?? [],
        hasShape: Boolean(geo?.shape) || fact.kind !== 'country',
      }),
    [fact, geo],
  )

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [voiceOn, setVoiceOn] = useState(() => loadVoicePref() && canSpeak())
  const [arrived, setArrived] = useState(true)
  const [runId, setRunId] = useState(0)

  const elapsedRef = useRef(0)
  const speechEndAt = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const camRef = useRef<Camera>(FULL_CAMERA)

  const ready = Boolean(geo)
  const scene = scenes[Math.min(index, scenes.length - 1)]
  const isLast = index >= scenes.length - 1
  const duration = sceneDuration(scene)
  const targetCam = geo ? geo.cameras[scene.camera] : FULL_CAMERA

  // Narration + clock reset whenever the scene changes.
  useEffect(() => {
    if (!ready) return
    elapsedRef.current = 0
    setElapsed(0)
    if (!voiceOn) {
      speechEndAt.current = null
      return
    }
    speechEndAt.current = Infinity
    const stop = speak(scene.say ?? scene.caption, () => {
      // An instant "end" means the voice could not play: fall back to the timer.
      speechEndAt.current = elapsedRef.current < 800 ? null : elapsedRef.current
    })
    return stop
    // `scene` is derived from index + scenes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, voiceOn, ready, runId])

  useEffect(() => {
    if (!voiceOn) return
    if (playing) resumeSpeech()
    else pauseSpeech()
  }, [playing, voiceOn])

  // The clock.
  useEffect(() => {
    if (!playing || !ready) return
    const t = window.setInterval(() => {
      elapsedRef.current += 100
      setElapsed(elapsedRef.current)
    }, 100)
    return () => window.clearInterval(t)
  }, [playing, ready, index, runId])

  // Move on when the narration (or the timer) is done.
  useEffect(() => {
    if (!ready) return
    if (isLast) {
      if (elapsed >= 800 && !finishedRef.current) {
        finishedRef.current = true
        onFinished?.()
      }
      return
    }
    const end = speechEndAt.current
    const spoken =
      end === null
        ? elapsed >= duration
        : elapsed >= Math.max(3600, end + 900) || elapsed >= duration * 2.5
    if (spoken) setIndex((i) => Math.min(i + 1, scenes.length - 1))
  }, [elapsed, duration, isLast, ready, scenes.length, onFinished])

  // Fly the camera.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !ready) return
    const from = camRef.current
    const to = targetCam
    const apply = (c: Camera) => {
      camRef.current = c
      svg.setAttribute('viewBox', cameraToViewBox(c))
    }
    const same =
      Math.abs(from.x - to.x) < 0.5 &&
      Math.abs(from.y - to.y) < 0.5 &&
      Math.abs(from.w - to.w) < 0.5
    if (same || reducedMotion) {
      apply(to)
      setArrived(true)
      return
    }
    setArrived(false)
    const controls = animate(0, 1, {
      duration: 1.4,
      ease: [0.45, 0, 0.2, 1],
      onUpdate: (t) =>
        apply({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          w: from.w + (to.w - from.w) * t,
          h: from.h + (to.h - from.h) * t,
        }),
      onComplete: () => setArrived(true),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCam.x, targetCam.y, targetCam.w, targetCam.h, ready, reducedMotion])

  function goTo(i: number) {
    setIndex(Math.min(Math.max(i, 0), scenes.length - 1))
    setPlaying(true)
  }

  function replay() {
    setIndex(0)
    setRunId((n) => n + 1)
    setPlaying(true)
  }

  function toggleVoice() {
    setVoiceOn((on) => {
      saveVoicePref(!on)
      return !on
    })
  }

  if (failed) {
    return (
      <div className="rounded-3xl bg-sea-200/40 p-5 text-ocean-900">
        <p className="text-lg font-bold">{scenes[1]?.caption ?? fact.clue}</p>
        <p className="mt-2 text-sm font-semibold text-ocean-700">
          The map could not load, so the tour is taking a break.
        </p>
      </div>
    )
  }

  const sceneIndexOf = (id: string) => scenes.findIndex((s) => s.id === id)
  const neighborsFrom = sceneIndexOf('neighbors')
  const showNeighborTint =
    neighborsFrom >= 0 && index >= neighborsFrom && scene.id !== 'recap'
  const neighborColor = new Map<string, string>()
  if (geo && showNeighborTint) {
    geo.neighbors.forEach((n, i) =>
      neighborColor.set(n.key, NEIGHBOR_COLORS[i % NEIGHBOR_COLORS.length]),
    )
  }
  const lineStyle = LINE_STYLE[fact.kind]
  const lineColor =
    fact.id === 'lm-great-wall' ? '#b0703a' : lineStyle?.color ?? '#4fb4f5'
  const overlayKey = `${runId}-${index}`
  /** Too small to see at this zoom, so it needs a ring around it. */
  const tiny =
    geo?.shape != null &&
    (fact.kind === 'state' || fact.kind === 'country') &&
    ((geo.shape.bounds[1][0] - geo.shape.bounds[0][0]) * MAP_W) / targetCam.w < 48 &&
    ((geo.shape.bounds[1][1] - geo.shape.bounds[0][1]) * MAP_H) / targetCam.h < 48
  const showPointMarker =
    geo?.point && !geo.shape && fact.kind !== 'continent' && !scene.showBeacon
  const russia = geo?.atlas.byKey.get('russia')
  const activeCard = scene.cards
    ? scene.cards[
        Math.min(
          scene.cards.length - 1,
          Math.floor((elapsed / duration) * scene.cards.length),
        )
      ]
    : null
  const labelled = geo ? geo.neighbors.slice(0, MAX_NEIGHBOR_LABELS) : []
  const neighborSpots =
    geo && scene.showNeighbors
      ? placeLabels(
          targetCam,
          geo.anchor ? { p: geo.anchor, text: fact.name } : null,
          labelled.map((n) => ({
            p: [n.cx, n.cy] as [number, number],
            text: n.label.replace(/^the /, ''),
          })),
        )
      : []

  return (
    <div className="mx-auto select-none" style={{ maxWidth: 'max(20rem, 86.4vh)' }}>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-ocean-900/15 bg-ocean-900 shadow-lg">
        {!geo ? (
          <div className="flex h-full items-center justify-center text-sm font-bold text-sea-200">
            Unrolling the map…
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              viewBox={cameraToViewBox(FULL_CAMERA)}
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 h-full w-full"
              role="img"
              aria-label={`Map tour of ${fact.name}`}
            >
              <defs>
                <radialGradient id={`${gradId}-sea`} cx="50%" cy="45%" r="75%">
                  <stop offset="0%" stopColor="#1f8494" />
                  <stop offset="100%" stopColor="#0b3d4a" />
                </radialGradient>
                {geo.russiaClip && (
                  <clipPath id={`${gradId}-ru`}>
                    {geo.russiaClip.map((r) => (
                      <rect key={r.x} x={r.x} y={0} width={r.w} height={MAP_H} />
                    ))}
                  </clipPath>
                )}
              </defs>
              <rect width={MAP_W} height={MAP_H} fill={`url(#${gradId}-sea)`} />

              {geo.atlas.shapes.map((s) => {
                const isTarget = geo.targetKeys.has(s.key)
                const tint = neighborColor.get(s.key)
                return (
                  <path
                    key={s.key}
                    d={s.d}
                    fill={isTarget ? TARGET : tint ?? LAND}
                    stroke={isTarget ? '#fff8ee' : LAND_EDGE}
                    strokeWidth={isTarget ? 1.6 : 0.7}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: 'fill 0.6s ease' }}
                  />
                )
              })}

              {geo.russiaClip && russia && (
                <path
                  d={russia.d}
                  fill={TARGET}
                  stroke="#fff8ee"
                  strokeWidth={1.2}
                  vectorEffect="non-scaling-stroke"
                  clipPath={`url(#${gradId}-ru)`}
                />
              )}

              {geo.shape && (
                <path
                  d={geo.shape.d}
                  fill="none"
                  stroke="#fff3d6"
                  strokeWidth={5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="tour-glow"
                />
              )}

              {geo.line && index >= 1 && (
                <>
                  <path
                    d={geo.line}
                    fill="none"
                    stroke="rgba(6,38,47,0.35)"
                    strokeWidth={7}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <motion.path
                    key={`line-${runId}`}
                    d={geo.line}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={4}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: reducedMotion ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.6, delay: 1.3, ease: 'easeInOut' }}
                  />
                </>
              )}
            </svg>

            {/* Labels, pins and the capital star (screen space, so they stay readable) */}
            <AnimatePresence>
              {arrived && (
                <motion.div
                  key={overlayKey}
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.3 }}
                >
                  {kind === 'us' &&
                    !scene.cards &&
                    (trueLayout ? US_TRUE_CONTEXT : US_CONTEXT).map((c) => {
                      const p = geo.atlas.project(c.at[0], c.at[1])
                      if (!p) return null
                      if (c.text === 'Mexico' && targetCam.w > 800) return null
                      const [sx, sy] = toScreen(targetCam, p)
                      if (sx < 70 || sx > MAP_W - 70 || sy < 70 || sy > MAP_H - 40) {
                        return null
                      }
                      return (
                        <span
                          key={`${c.text}-${c.at[0]}`}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.18em] sm:text-xs ${
                            c.water ? 'italic text-sea-200/80' : 'text-sand-100/85'
                          }`}
                          style={pct(targetCam, p, false)}
                        >
                          {c.text}
                        </span>
                      )
                    })}

                  {scene.showBeacon && geo.anchor && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={pct(targetCam, fact.kind === 'continent' || !geo.shape ? geo.point ?? geo.anchor : geo.anchor)}
                    >
                      <span className="tour-ping absolute -inset-6 rounded-full border-4 border-amber" />
                      <span className="tour-ping absolute -inset-6 rounded-full border-4 border-amber [animation-delay:0.7s]" />
                      <span className="relative block h-5 w-5 rounded-full border-[3px] border-white bg-coral shadow-lg" />
                      <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-sm font-extrabold text-ocean-950 shadow-lg sm:text-base">
                        {fact.name}
                      </span>
                    </div>
                  )}

                  {scene.showNeighbors &&
                    labelled.map((n, i) => (
                      <motion.span
                        key={n.key}
                        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-white/80 px-2.5 py-0.5 text-xs font-extrabold text-ocean-950 shadow-md sm:text-sm"
                        style={{
                          ...neighborSpots[i],
                          backgroundColor:
                            NEIGHBOR_COLORS[i % NEIGHBOR_COLORS.length],
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: 0.35 + i * 0.3,
                          type: 'spring',
                          stiffness: 320,
                          damping: 18,
                        }}
                      >
                        {n.label.replace(/^the /, '')}
                      </motion.span>
                    ))}

                  {scene.showLabel && geo.anchor && (
                    <motion.span
                      className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-ocean-950 px-3.5 py-1 text-sm font-extrabold text-sand-100 shadow-lg ring-2 ring-white/70 sm:text-lg"
                      style={pct(targetCam, geo.anchor)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: geo.shape && !tiny ? 0 : 34 }}
                      transition={{ delay: 0.1 }}
                    >
                      {fact.name}
                    </motion.span>
                  )}

                  {tiny && !scene.showBeacon && !scene.cards && geo.anchor && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={pct(targetCam, geo.anchor)}
                    >
                      <span className="tour-ping absolute -inset-5 rounded-full border-4 border-amber" />
                      <span className="block h-9 w-9 rounded-full border-[3px] border-amber" />
                    </div>
                  )}

                  {showPointMarker && geo.point && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={pct(targetCam, geo.point)}
                    >
                      {fact.kind === 'mountain' ? (
                        <svg width="34" height="30" viewBox="0 0 34 30" className="drop-shadow-lg">
                          <path d="M17 2 32 28H2Z" fill="#7a8f99" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
                          <path d="M17 2l5 9-3-2-2 3-2-3-3 2z" fill="#fff" />
                        </svg>
                      ) : (
                        <span className="block h-4 w-4 rounded-full border-[3px] border-white bg-coral shadow-lg" />
                      )}
                    </div>
                  )}

                  {scene.showCapital && geo.point && fact.capital && (
                    <motion.div
                      className="absolute"
                      style={pct(targetCam, geo.point)}
                      initial={{ opacity: 0, y: -70, scale: 1.6 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.25,
                        type: 'spring',
                        stiffness: 260,
                        damping: 14,
                      }}
                    >
                      <svg
                        width="38"
                        height="38"
                        viewBox="0 0 24 24"
                        className="-translate-x-1/2 -translate-y-1/2 drop-shadow-lg"
                      >
                        <path
                          d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.8 9.2l7.1-.9z"
                          fill="#ffd23f"
                          stroke="#06262f"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {!scene.recap && (
                        <span className="absolute left-0 top-5 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white px-3 py-1 text-center text-sm font-extrabold leading-tight text-ocean-950 shadow-lg sm:text-lg">
                          {fact.capital}
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-coral sm:text-xs">
                            capital
                          </span>
                        </span>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Key fact cards */}
            <AnimatePresence>
              {scene.cards && arrived && (
                <motion.div
                  key={`cards-${overlayKey}`}
                  className="absolute inset-0 hidden flex-col justify-center gap-3 bg-ocean-950/60 px-10 pb-3 pt-12 backdrop-blur-[2px] sm:flex"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {scene.cards.map((card, i) => (
                    <motion.div
                      key={card.label}
                      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-xl sm:px-5 sm:py-3.5"
                      initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.2 + i * 0.55,
                        type: 'spring',
                        stiffness: 220,
                        damping: 20,
                      }}
                    >
                      <span className="text-2xl sm:text-4xl" aria-hidden>
                        {card.icon}
                      </span>
                      <span>
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-coral sm:text-xs">
                          {card.label}
                        </span>
                        <span className="block text-sm font-bold leading-snug text-ocean-950 sm:text-lg">
                          {card.text}
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* On phones there is only room for one card at a time */}
            <AnimatePresence>
              {scene.cards && arrived && activeCard && (
                <motion.div
                  key={`card-${overlayKey}`}
                  className="absolute inset-0 flex flex-col items-stretch justify-center bg-ocean-950/60 px-3 pb-2 pt-9 backdrop-blur-[2px] sm:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCard.label}
                      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-xl"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className="text-3xl" aria-hidden>
                        {activeCard.icon}
                      </span>
                      <span>
                        <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-coral">
                          {activeCard.label}
                        </span>
                        <span className="block text-[15px] font-bold leading-snug text-ocean-950">
                          {activeCard.text}
                        </span>
                      </span>
                    </motion.div>
                  </AnimatePresence>
                  <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
                    {scene.cards.map((c) => (
                      <span
                        key={c.label}
                        className={`h-1.5 w-1.5 rounded-full ${
                          c === activeCard ? 'bg-amber' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Say-it-together card */}
            <AnimatePresence>
              {scene.recap && arrived && (
                <motion.div
                  key={`recap-${overlayKey}`}
                  className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-ocean-950/85 via-ocean-950/50 to-transparent px-4 pb-4 pt-16"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center">
                    <p className="font-brand text-3xl font-bold text-white drop-shadow sm:text-5xl">
                      {scene.recap.headline}
                      {scene.recap.sub && (
                        <span className="text-amber"> → {scene.recap.sub}</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm font-extrabold uppercase tracking-[0.14em] text-sea-200 sm:text-base">
                      {scene.recap.prompt}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chapter strip */}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-ocean-950/70 to-transparent px-3 pb-6 pt-3">
              <div className="flex gap-1.5">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to part ${i + 1}: ${s.title}`}
                    className="pointer-events-auto h-4 flex-1 cursor-pointer py-[5px]"
                  >
                    <span className="block h-full overflow-hidden rounded-full bg-white/30">
                      <span
                        className="block h-full rounded-full bg-amber"
                        style={{
                          width:
                            i < index
                              ? '100%'
                              : i === index
                                ? `${Math.min(100, (elapsed / duration) * 100)}%`
                                : '0%',
                          transition: 'width 0.1s linear',
                        }}
                      />
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-white/90 drop-shadow">
                {index + 1} · {scene.title}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      <div className="mt-3 flex min-h-[6.75rem] items-start gap-3 rounded-2xl bg-sea-200/45 px-4 py-3 sm:min-h-[6.25rem]">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-900 text-sand-100 ${
            voiceOn && playing && !isLast ? 'animate-pulse-ring' : ''
          }`}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path
              d="M16 8.5a5 5 0 010 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={overlayKey}
            className="text-base font-bold leading-snug text-ocean-950 sm:text-xl"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            {scene.caption}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <TourButton label="Watch again from the start" onClick={replay}>
          <path d="M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z" />
        </TourButton>
        <TourButton label="Back" onClick={() => goTo(index - 1)} disabled={index === 0}>
          <path d="M15 5l-7 7 7 7V5z" />
        </TourButton>
        <button
          type="button"
          onClick={() => (isLast ? replay() : setPlaying((p) => !p))}
          aria-label={isLast ? 'Watch again' : playing ? 'Pause' : 'Play'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white shadow-md transition hover:brightness-105 active:scale-95"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            {isLast ? (
              <path d="M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z" />
            ) : playing ? (
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>
        <TourButton label="Next" onClick={() => goTo(index + 1)} disabled={isLast}>
          <path d="M9 5l7 7-7 7V5z" />
        </TourButton>
        {canSpeak() && (
          <TourButton
            label={voiceOn ? 'Turn the voice off' : 'Turn the voice on'}
            onClick={toggleVoice}
            active={voiceOn}
          >
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            {voiceOn ? (
              <path
                d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M16 9l5 6M21 9l-5 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </TourButton>
        )}
      </div>
    </div>
  )
}

function TourButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-30 ${
        active
          ? 'bg-ocean-900 text-sand-100'
          : 'bg-ocean-900/10 text-ocean-900 hover:bg-ocean-900/20'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        {children}
      </svg>
    </button>
  )
}
