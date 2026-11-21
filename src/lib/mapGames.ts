/**
 * Map games: "Find it!" (see a name, tap the place) and "What's this?"
 * (see a place light up, pick its name). Decks grow as units are learned.
 */
import { FACTS, UNITS, factsForUnit, type GeoFact } from '../data/curriculum'
import { RUSSIA_SPLIT_LON, WORLD_PLACES } from '../data/geo/worldCoords'
import {
  FULL_CAMERA,
  MAP_W,
  anchorForFact,
  boundsAround,
  cameraFor,
  isUsFact,
  linePath,
  pointForFact,
  shapeForFact,
  unionBounds,
  type Atlas,
  type Bounds,
  type Camera,
  type MapKind,
  type Shape,
} from './geoData'
import { isUnitUnlocked, type Explorer } from './storage'

export type GameMode = 'find' | 'name'

export const ROUND_SIZE = 10
export const MIN_DECK = 3

export type Deck = {
  id: string
  title: string
  facts: GeoFact[]
  /** Total places in the unit, for "4 of 9 ready" */
  total: number
  unlocked: boolean
}

/** Places the explorer has met in a unit (all of them once the unit is complete). */
function readyFacts(explorer: Explorer, unitId: string) {
  const facts = factsForUnit(unitId)
  if (explorer.completedUnits.includes(unitId)) return facts
  return facts.filter((f) => explorer.introduced.includes(f.id))
}

export function decksFor(explorer: Explorer): Deck[] {
  const units = UNITS.map((u) => ({
    id: u.id,
    title: u.title,
    facts: readyFacts(explorer, u.id),
    total: factsForUnit(u.id).length,
    unlocked: isUnitUnlocked(explorer, u.id),
  }))
  const all = units.flatMap((d) => d.facts)
  return [
    {
      id: 'mix',
      title: 'Everything I’ve learned',
      facts: all,
      total: FACTS.length,
      unlocked: true,
    },
    ...units,
  ]
}

export function deckPlayable(deck: Deck) {
  return deck.unlocked && deck.facts.length >= MIN_DECK
}

/** A round of up to 10 places, favouring weaker ones, in random order. */
export function buildRound(explorer: Explorer, deck: Deck): GeoFact[] {
  const strength = (f: GeoFact) => explorer.cards[f.id]?.repetitions ?? 0
  const ranked = [...deck.facts]
    .map((f) => ({ f, w: strength(f) + Math.random() * 3 }))
    .sort((a, b) => a.w - b.w)
    .slice(0, ROUND_SIZE)
    .map((x) => x.f)
  return ranked.sort(() => Math.random() - 0.5)
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Four names to choose from: the answer plus three of the same kind, nearby ones first. */
export function choicesFor(fact: GeoFact, deck: Deck): string[] {
  const sameKind = (f: GeoFact) =>
    f.id !== fact.id && (f.kind === fact.kind || (isUsFact(f) && isUsFact(fact)))
  const pools = [
    deck.facts.filter((f) => sameKind(f) && f.unitId === fact.unitId),
    deck.facts.filter(sameKind),
    FACTS.filter((f) => sameKind(f) && f.unitId === fact.unitId),
    FACTS.filter(sameKind),
  ]
  const picks: string[] = []
  for (const pool of pools) {
    for (const f of shuffle(pool)) {
      if (picks.length >= 3) break
      if (!picks.includes(f.name)) picks.push(f.name)
    }
  }
  return shuffle([fact.name, ...picks.slice(0, 3)])
}

// ── What map to show ─────────────────────────────────────────────

const CONTINENT_UNITS = new Set(['north-america', 'south-america', 'europe', 'africa', 'asia'])

export type View = { kind: MapKind; centerLon: number; camera: Camera }

export function mapKindFor(fact: GeoFact): MapKind {
  return isUsFact(fact) ? 'us' : 'world'
}

export function centerFor(fact: GeoFact): number {
  if (isUsFact(fact)) return 0
  if (fact.unitId === 'world-rest') return WORLD_PLACES[fact.id]?.center ?? 0
  return 0
}

/** Camera for a question: the whole U.S., the fact's continent, or the whole world. */
export function viewFor(atlas: Atlas, fact: GeoFact, mode: GameMode = 'find'): Camera {
  if (atlas.kind === 'us') return FULL_CAMERA
  // In "What's this?", tiny countries far from their unit's map get a closer look.
  if (mode === 'name' && fact.kind === 'country' && !CONTINENT_UNITS.has(fact.unitId)) {
    const shape = shapeForFact(atlas, fact)
    const anchor = anchorForFact(atlas, fact)
    const [[x0, y0], [x1, y1]] = shape?.bounds ?? [[0, 0], [0, 0]]
    if (anchor && Math.max(x1 - x0, y1 - y0) < 40) return cameraFor(boundsAround(anchor, 150), 0, 200)
  }
  if (CONTINENT_UNITS.has(fact.unitId)) {
    const list: Bounds[] = []
    for (const f of factsForUnit(fact.unitId)) {
      const s = shapeForFact(atlas, f)
      if (!s) continue
      const [[x0], [x1]] = s.bounds
      // Very wide countries (Russia, Canada's far north) would zoom out too far.
      if (x1 - x0 > 260) {
        const p = pointForFact(atlas, f)
        if (p) list.push(boundsAround(p, 60))
      } else list.push(s.bounds)
    }
    if (list.length) return cameraFor(unionBounds(list), 0.08, 200)
  }
  if (fact.kind === 'continent' || fact.kind === 'ocean') return FULL_CAMERA
  // Most of the world without the poles.
  return { x: 0, y: 40, w: MAP_W, h: 480 }
}

// ── What a tap means ─────────────────────────────────────────────

export type Tap = {
  /** Map coordinates */
  p: [number, number]
  /** Shape under the finger, if any */
  shape: Shape | null
  /** Map units per screen pixel */
  unitsPerPx: number
}

function dist(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

function distToPolyline(p: [number, number], pts: [number, number][]) {
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy
    const t = len ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len)) : 0
    best = Math.min(best, dist(p, [ax + t * dx, ay + t * dy]))
  }
  return best
}

function projectedLine(atlas: Atlas, fact: GeoFact): [number, number][] | null {
  const line = WORLD_PLACES[fact.id]?.line
  if (!line) return null
  return line.map(([lon, lat]) => atlas.project(lon, lat)).filter(Boolean) as [number, number][]
}

/** Which continent a shape (or the tapped half of Russia) belongs to. */
export function continentAt(atlas: Atlas, tap: Tap): string | null {
  const s = tap.shape
  if (!s) return null
  if (s.name === 'Russia') {
    const split = atlas.project(RUSSIA_SPLIT_LON, 0)?.[0] ?? MAP_W / 2
    const west = atlas.project(0, 0)?.[0] ?? 0
    return tap.p[0] >= west && tap.p[0] < split ? 'Europe' : 'Asia'
  }
  return s.continent ?? null
}

/** Rough ocean boundaries for kids, in degrees. */
export function oceanAt(lon: number, lat: number): string {
  if (lat >= 66) return 'Arctic Ocean'
  if (lat <= -60) return 'Southern Ocean'
  const L = ((lon + 540) % 360) - 180
  if (L >= 20 && L <= 147 && lat <= 30) return 'Indian Ocean'
  // Gulf of Mexico and the Caribbean count as Atlantic.
  if (lat >= 17 && L >= -98 && L <= -70) return 'Atlantic Ocean'
  if (lat >= 8 && lat < 17 && L >= -84 && L <= -60) return 'Atlantic Ocean'
  if (lat < 8 && L >= -68 && L <= 20) return 'Atlantic Ocean'
  if (lat >= 8 && L > -70 && L <= 40) return 'Atlantic Ocean'
  return 'Pacific Ocean'
}

/** Big areas you can tap anywhere inside: [west, north, east, south]. */
const AREA_BOXES: Record<string, [number, number, number, number]> = {
  'lm-sahara': [-17, 33, 35, 15],
  'lm-amazon-rainforest': [-78, 5, -45, -15],
}

const POINT_TOLERANCE_PX = 34
const LINE_TOLERANCE_PX = 24
const SMALL_SHAPE_PX = 30

/** Did this tap find the place? */
export function tapFinds(atlas: Atlas, fact: GeoFact, tap: Tap): boolean {
  const tolPoint = POINT_TOLERANCE_PX * tap.unitsPerPx

  if (fact.kind === 'state' || fact.kind === 'country') {
    const target = shapeForFact(atlas, fact)
    if (target && tap.shape?.key === target.key) return true
    // Tiny places (Rhode Island, Malta, Pacific islands) count if you tap close.
    const [[x0, y0], [x1, y1]] = target?.bounds ?? [[0, 0], [0, 0]]
    const smallPx = Math.max(x1 - x0, y1 - y0) / tap.unitsPerPx
    const anchor = anchorForFact(atlas, fact)
    if ((!target || smallPx < SMALL_SHAPE_PX) && anchor) {
      return dist(tap.p, anchor) <= tolPoint
    }
    return false
  }

  if (fact.kind === 'continent') return continentAt(atlas, tap) === fact.name

  if (fact.kind === 'ocean') {
    if (tap.shape) return false
    const ll = atlas.invert(tap.p[0], tap.p[1])
    return ll ? oceanAt(ll[0], ll[1]) === fact.name : false
  }

  const box = AREA_BOXES[fact.id]
  if (box) {
    const ll = atlas.invert(tap.p[0], tap.p[1])
    if (!ll) return false
    const [w, n, e, s] = box
    return ll[0] >= w && ll[0] <= e && ll[1] <= n && ll[1] >= s
  }

  const line = projectedLine(atlas, fact)
  if (line && line.length > 1) {
    return distToPolyline(tap.p, line) <= LINE_TOLERANCE_PX * tap.unitsPerPx
  }
  const point = pointForFact(atlas, fact)
  return point ? dist(tap.p, point) <= tolPoint : false
}

/** A friendly name for whatever was tapped, for "That's Oklahoma." */
export function describeTap(atlas: Atlas, fact: GeoFact, tap: Tap): string | null {
  if (fact.kind === 'continent') {
    const c = continentAt(atlas, tap)
    return c ? (c === 'Australia' ? 'Australia' : c) : tap.shape ? null : 'the ocean'
  }
  if (tap.shape) return tap.shape.label
  const ll = atlas.invert(tap.p[0], tap.p[1])
  if (fact.kind === 'ocean' && ll) return `the ${oceanAt(ll[0], ll[1])}`
  return 'the water'
}

// ── Drawing a place ─────────────────────────────────────────────

export type Highlight = {
  /** Shape keys to fill */
  keys: string[]
  /** Clip Russia to its European or Asian half */
  russiaHalf?: 'Europe' | 'Asia'
  /** Draw a line along a course (rivers, the Great Wall, the reef) */
  line?: string
  /** Where to put a marker or pulsing ring */
  point?: [number, number]
  marker?: 'ring' | 'mountain' | 'star' | 'ocean'
}

export function highlightFor(atlas: Atlas, fact: GeoFact, unitsPerPx: number): Highlight {
  if (fact.kind === 'continent') {
    const keys = atlas.shapes.filter((s) => s.continent === fact.name).map((s) => s.key)
    const russia = atlas.shapes.find((s) => s.name === 'Russia')
    const half = fact.name === 'Europe' || fact.name === 'Asia' ? fact.name : undefined
    if (russia && half) keys.push(russia.key)
    return { keys, russiaHalf: half }
  }
  if (fact.kind === 'state' || fact.kind === 'country') {
    const shape = shapeForFact(atlas, fact)
    const keys = shape ? [shape.key] : []
    const [[x0, y0], [x1, y1]] = shape?.bounds ?? [[0, 0], [0, 0]]
    const small = !shape || Math.max(x1 - x0, y1 - y0) / unitsPerPx < SMALL_SHAPE_PX
    return { keys, point: small ? anchorForFact(atlas, fact) ?? undefined : undefined, marker: 'ring' }
  }
  const point = pointForFact(atlas, fact) ?? undefined
  const course = WORLD_PLACES[fact.id]?.line
  const line = course ? linePath(atlas, course) : undefined
  if (fact.kind === 'ocean') return { keys: [], point, marker: 'ocean' }
  if (fact.kind === 'river') return { keys: [], line, point: line ? undefined : point, marker: 'ring' }
  if (fact.kind === 'mountain') return { keys: [], point, marker: 'mountain' }
  return { keys: [], line, point: line ? undefined : point, marker: line ? undefined : 'star' }
}

/** "Find Texas!" / "Find the Nile River!" */
export function findPrompt(fact: GeoFact): string {
  return `Find ${theName(fact)}!`
}

/** "the Nile River", "the United Kingdom", "Texas" */
export function theName(fact: GeoFact): string {
  const needsThe =
    /^(United|Netherlands|Dominican|Democratic|Central African|Bahamas|Philippines|Marshall|Solomon|Grand|Great|Sahara|Amazon|Matterhorn)|(Ocean|River)$/.test(
      fact.name,
    )
  return needsThe ? `the ${fact.name}` : fact.name
}

export function namePrompt(fact: GeoFact): string {
  const what: Record<GeoFact['kind'], string> = {
    state: 'state',
    country: 'country',
    continent: 'continent',
    ocean: 'ocean',
    river: 'river',
    mountain: 'mountain',
    landmark: 'place',
  }
  return `What ${what[fact.kind]} is this?`
}

export function kindHint(fact: GeoFact): string {
  if (fact.kind === 'river') return 'Tap along the river.'
  if (fact.kind === 'ocean') return 'Tap the water.'
  if (fact.kind === 'mountain') return 'Tap where the mountain is.'
  if (fact.kind === 'landmark') return 'Tap where it is.'
  return ''
}
