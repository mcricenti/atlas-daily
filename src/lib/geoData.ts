import { feature, neighbors as topoNeighbors } from 'topojson-client'
import {
  geoAlbers,
  geoAlbersUsa,
  geoCentroid,
  geoDistance,
  geoEquirectangular,
  geoPath,
  type GeoProjection,
} from 'd3-geo'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson'
import type { GeoFact } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'
import { CONTINENT_OF, WORLD_PLACES } from '../data/geo/worldCoords'

export const MAP_W = 960
export const MAP_H = 600

export type MapKind = 'us' | 'world'
export type Camera = { x: number; y: number; w: number; h: number }
export type Bounds = [[number, number], [number, number]]

export type Shape = {
  key: string
  /** Name as written in the map file */
  name: string
  /** Friendly name for captions */
  label: string
  d: string
  /** Bounds and centre of the largest piece (ignores far-away islands) */
  bounds: Bounds
  cx: number
  cy: number
  area: number
  continent?: string
}

export type Atlas = {
  kind: MapKind
  shapes: Shape[]
  byKey: Map<string, Shape>
  /** key → keys of shapes that share a border */
  neighbors: Map<string, string[]>
  project: (lon: number, lat: number) => [number, number] | null
  /** Map coordinates → [longitude, latitude] */
  invert: (x: number, y: number) => [number, number] | null
}

export const FULL_CAMERA: Camera = { x: 0, y: 0, w: MAP_W, h: MAP_H }

const BASE = import.meta.env?.BASE_URL ?? '/'

const TOPO_URL: Record<MapKind, string> = {
  us: `${BASE}geo/states-10m.json`,
  world: `${BASE}geo/countries-50m.json`,
}

const topoCache = new Map<MapKind, Promise<Topology>>()

export function loadTopo(kind: MapKind): Promise<Topology> {
  let p = topoCache.get(kind)
  if (!p) {
    p = fetch(TOPO_URL[kind]).then((r) => {
      if (!r.ok) throw new Error('map fetch failed')
      return r.json() as Promise<Topology>
    })
    p.catch(() => topoCache.delete(kind))
    topoCache.set(kind, p)
  }
  return p
}

// ── Names ────────────────────────────────────────────────────────

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
  micronesia: 'federated states of micronesia',
  'marshall is': 'marshall islands',
}

export function countryMatchKey(name: string) {
  const n = normalizeCountryName(name)
  return COUNTRY_ALIASES[n] ?? n
}

const DISPLAY_NAMES: Record<string, string> = {
  'United States of America': 'the United States',
  'Dem. Rep. Congo': 'DR Congo',
  Congo: 'the Republic of the Congo',
  'Dominican Rep.': 'the Dominican Republic',
  'Central African Rep.': 'the Central African Republic',
  "Côte d'Ivoire": 'Ivory Coast',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  Macedonia: 'North Macedonia',
  eSwatini: 'Eswatini',
  'United Arab Emirates': 'the United Arab Emirates',
  Netherlands: 'the Netherlands',
  Philippines: 'the Philippines',
  'United Kingdom': 'the United Kingdom',
}

/** Shapes that are not suitable to name as a "neighbor" for kids. */
const SKIP_AS_NEIGHBOR = new Set([
  'N. Cyprus',
  'Somaliland',
  'Antarctica',
  'Siachen Glacier',
  'Hong Kong',
  'Macao',
])

const US_STATE_NAMES = new Set(
  Object.values(CAPITAL_COORDS).map((c) => c.state),
)

export function isUsFact(fact: GeoFact) {
  return fact.kind === 'state' && fact.region === 'United States'
}

export function shapeKeyForFact(fact: GeoFact): string | null {
  if (isUsFact(fact)) return fact.name
  if (fact.kind === 'country') return countryMatchKey(fact.name)
  return null
}

/** U.S. map variant that shows Alaska and Hawaii where they really are. */
export const US_TRUE_LAYOUT = 1

/**
 * Map variant for this fact. World: the longitude to centre on (0 = Greenwich).
 * U.S.: 0 for the usual layout with Alaska and Hawaii tucked in the corner,
 * or US_TRUE_LAYOUT for those two states' own tours.
 */
export function centerLonFor(fact: GeoFact): number {
  if (fact.id === 'us-ak' || fact.id === 'us-hi') return US_TRUE_LAYOUT
  return WORLD_PLACES[fact.id]?.center ?? 0
}

// ── Atlas building ───────────────────────────────────────────────

const atlasCache = new Map<string, Atlas>()

function mainPiece(f: Feature<Geometry>, path: ReturnType<typeof geoPath>) {
  const g = f.geometry
  if (g.type !== 'MultiPolygon') return f
  let best: Feature<Polygon> | null = null
  let bestArea = -1
  for (const coords of (g as MultiPolygon).coordinates) {
    const piece: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: coords },
    }
    const a = path.area(piece)
    if (a > bestArea) {
      bestArea = a
      best = piece
    }
  }
  return best ?? f
}

export function buildAtlas(topo: Topology, kind: MapKind, centerLon = 0): Atlas {
  const cacheKey = `${kind}:${centerLon}`
  const cached = atlasCache.get(cacheKey)
  if (cached) return cached

  const objectName = kind === 'us' ? 'states' : 'countries'
  const collection = topo.objects[objectName] as GeometryCollection
  const features = (
    feature(topo, collection) as unknown as { features: Feature<Geometry>[] }
  ).features

  let projection: GeoProjection
  if (kind === 'us') {
    const base = centerLon === US_TRUE_LAYOUT ? geoAlbers() : geoAlbersUsa()
    projection = base.fitExtent(
      [
        [20, 20],
        [MAP_W - 20, MAP_H - 20],
      ],
      { type: 'FeatureCollection', features } as never,
    )
  } else {
    projection = geoEquirectangular()
      .rotate([-centerLon, 0])
      .fitSize([MAP_W, MAP_H], { type: 'Sphere' } as never)
  }
  const path = geoPath(projection)

  const shapes: Shape[] = []
  const indexToKey: (string | null)[] = []
  const geoCenters = new Map<string, [number, number]>()

  features.forEach((f) => {
    const name = (f.properties as { name?: string } | null)?.name ?? String(f.id)
    if (kind === 'us' && !US_STATE_NAMES.has(name)) {
      indexToKey.push(null)
      return
    }
    const d = path(f)
    if (!d) {
      indexToKey.push(null)
      return
    }
    const piece = mainPiece(f, path)
    const bounds = path.bounds(piece) as Bounds
    const [cx, cy] = path.centroid(piece)
    const key = kind === 'us' ? name : countryMatchKey(name)
    shapes.push({
      key,
      name,
      label: DISPLAY_NAMES[name] ?? name,
      d,
      bounds,
      cx,
      cy,
      area: path.area(piece),
      continent: kind === 'world' ? CONTINENT_OF[name] : undefined,
    })
    indexToKey.push(key)
    geoCenters.set(key, geoCentroid(piece) as [number, number])
  })

  const neighbors = new Map<string, string[]>()
  const adjacency = topoNeighbors(collection.geometries)
  adjacency.forEach((list, i) => {
    const key = indexToKey[i]
    if (!key) return
    const here = geoCenters.get(key)!
    const out: string[] = []
    for (const j of list) {
      const other = indexToKey[j]
      if (!other || other === key) continue
      const name = features[j].properties
        ? (features[j].properties as { name?: string }).name ?? ''
        : ''
      if (SKIP_AS_NEIGHBOR.has(name)) continue
      // Ignore borders made by far-away territories (e.g. France ↔ Brazil).
      if (geoDistance(here, geoCenters.get(other)!) > 0.96) continue
      if (!out.includes(other)) out.push(other)
    }
    neighbors.set(key, out)
  })

  const atlas: Atlas = {
    kind,
    shapes,
    byKey: new Map(shapes.map((s) => [s.key, s])),
    neighbors,
    project: (lon, lat) => projection([lon, lat]) as [number, number] | null,
    invert: (x, y) => (projection.invert?.([x, y]) as [number, number] | null) ?? null,
  }
  atlasCache.set(cacheKey, atlas)
  return atlas
}

/** Shapes that share a border with this place, biggest first. */
export function neighborShapes(atlas: Atlas, fact: GeoFact): Shape[] {
  const shape = shapeForFact(atlas, fact)
  if (!shape) return []
  return (
    (atlas.neighbors.get(shape.key) ?? [])
      .map((k) => atlas.byKey.get(k))
      .filter(Boolean) as Shape[]
  ).sort((a, b) => b.area - a.area)
}

// ── Places ───────────────────────────────────────────────────────

/** Where the capital (or the place itself, for non-countries) sits on the map. */
export function pointForFact(atlas: Atlas, fact: GeoFact): [number, number] | null {
  if (isUsFact(fact)) {
    const c = CAPITAL_COORDS[fact.id]
    return c ? atlas.project(c.lon, c.lat) : null
  }
  const place = WORLD_PLACES[fact.id]
  return place ? atlas.project(place.at[0], place.at[1]) : null
}

export function shapeForFact(atlas: Atlas, fact: GeoFact): Shape | null {
  const key = shapeKeyForFact(fact)
  return key ? atlas.byKey.get(key) ?? null : null
}

/** A good spot to tap or label this fact on the map. */
export function anchorForFact(atlas: Atlas, fact: GeoFact): [number, number] | null {
  const shape = shapeForFact(atlas, fact)
  if (shape) return [shape.cx, shape.cy]
  return pointForFact(atlas, fact)
}

export function boundsForBox(
  atlas: Atlas,
  box: [number, number, number, number],
): Bounds | null {
  const [west, north, east, south] = box
  const a = atlas.project(west, north)
  const b = atlas.project(east, south)
  if (!a || !b) return null
  // A full-width box wraps to the same x on both sides.
  if (Math.abs(a[0] - b[0]) < 1) return [[0, a[1]], [MAP_W, b[1]]]
  return [
    [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
    [Math.max(a[0], b[0]), Math.max(a[1], b[1])],
  ]
}

export function unionBounds(list: Bounds[]): Bounds {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [[a, b], [c, d]] of list) {
    x0 = Math.min(x0, a)
    y0 = Math.min(y0, b)
    x1 = Math.max(x1, c)
    y1 = Math.max(y1, d)
  }
  return [[x0, y0], [x1, y1]]
}

export function boundsAround(p: [number, number], half: number): Bounds {
  return [[p[0] - half, p[1] - half * 0.625], [p[0] + half, p[1] + half * 0.625]]
}

/** Frame some bounds with padding, keeping the map's 16:10 shape. */
export function cameraFor(bounds: Bounds, pad = 0.2, minW = 90): Camera {
  const [[x0, y0], [x1, y1]] = bounds
  const aspect = MAP_W / MAP_H
  let w = Math.max((x1 - x0) * (1 + pad * 2), minW)
  let h = Math.max((y1 - y0) * (1 + pad * 2), minW / aspect)
  if (w / h < aspect) w = h * aspect
  else h = w / aspect
  if (w >= MAP_W) return FULL_CAMERA
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const x = Math.min(Math.max(cx - w / 2, 0), MAP_W - w)
  const y = Math.min(Math.max(cy - h / 2, 0), MAP_H - h)
  return { x, y, w, h }
}

export function cameraToViewBox(c: Camera) {
  return `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.h.toFixed(2)}`
}

/** Map coordinates → position on a 960×600 overlay for the given camera. */
export function toScreen(c: Camera, p: [number, number]): [number, number] {
  return [((p[0] - c.x) * MAP_W) / c.w, ((p[1] - c.y) * MAP_H) / c.h]
}

export function linePath(atlas: Atlas, line: [number, number][]): string {
  const pts = line
    .map(([lon, lat]) => atlas.project(lon, lat))
    .filter(Boolean) as [number, number][]
  if (pts.length < 2) return ''
  // Smooth the course with a Catmull-Rom spline.
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}
