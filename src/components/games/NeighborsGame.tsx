import { useMemo, useState, type ReactNode } from 'react'
import type { GeoFact } from '../../data/curriculum'
import {
  bordersOf,
  centerFor,
  mapKindFor,
  neighborCamera,
  shapeAtTap,
  theName,
  type GameResult,
  type Tap,
} from '../../lib/mapGames'
import { shapeForFact } from '../../lib/geoData'
import { GameMap, MapLoading } from './GameMap'
import { COLORS, NEIGHBOR_ROUND, useAtlas } from './gameKit'

/** Highlight a place; tap every place that shares a border with it. */
export function NeighborsGame({
  facts,
  onExit,
  onFinish,
}: {
  facts: GeoFact[]
  onExit: () => void
  onFinish: (results: GameResult[]) => void
}) {
  const fact0 = facts[0]
  const atlas = useAtlas(mapKindFor(fact0), centerFor(fact0))
  // Keep only places that actually have neighbors on this map.
  const round = useMemo(
    () => (atlas ? facts.filter((f) => bordersOf(atlas, f).length > 0).slice(0, NEIGHBOR_ROUND) : []),
    [atlas, facts],
  )
  const [idx, setIdx] = useState(0)
  const [found, setFound] = useState<string[]>([])
  const [misses, setMisses] = useState(0)
  const [gaveUp, setGaveUp] = useState(false)
  const [flash, setFlash] = useState<{ key: string; color: string; n: number } | null>(null)
  const [note, setNote] = useState('')
  const [results, setResults] = useState<GameResult[]>([])

  if (!atlas) return <Shell onExit={onExit}><MapLoading /></Shell>
  if (round.length === 0) {
    return (
      <Shell onExit={onExit}>
        <p className="rounded-3xl bg-white/90 p-6 text-center font-bold text-ocean-900">
          None of these places has a land neighbor. Try another map!
        </p>
      </Shell>
    )
  }

  const fact = round[idx]
  const target = shapeForFact(atlas, fact)!
  const borders = bordersOf(atlas, fact)
  const kindWord = fact.kind === 'state' ? 'state' : 'country'
  const done = gaveUp || found.length === borders.length
  const camera = neighborCamera(atlas, fact)!
  const stars = gaveUp ? 0 : misses <= 1 ? 2 : 1

  function onTap(tap: Tap) {
    if (done) return
    const remaining = borders.filter((b) => !found.includes(b.key))
    const hit = shapeAtTap(tap, remaining)
    if (hit) {
      setFound((f) => [...f, hit.key])
      setNote(`Yes — ${hit.label}!`)
      return
    }
    if (tap.shape && found.includes(tap.shape.key)) {
      setNote(`You already found ${tap.shape.label}.`)
      return
    }
    if (tap.shape?.key === target.key) {
      setNote(`That’s ${theName(fact)} itself — tap the places around it.`)
      return
    }
    setMisses((m) => m + 1)
    if (tap.shape) {
      setFlash((f) => ({ key: tap.shape!.key, color: COLORS.wrong, n: (f?.n ?? 0) + 1 }))
      setNote(`${tap.shape.label} doesn’t touch ${theName(fact)}.`)
    } else setNote('That’s water — look for land that touches it.')
  }

  function next() {
    const all = [...results, { fact, stars }]
    if (idx + 1 >= round.length) {
      onFinish(all)
      return
    }
    setResults(all)
    setIdx((i) => i + 1)
    setFound([])
    setMisses(0)
    setGaveUp(false)
    setNote('')
    setFlash(null)
  }

  const fills: Record<string, string> = { [target.key]: COLORS.target }
  for (const b of borders) {
    if (found.includes(b.key)) fills[b.key] = COLORS.right
    else if (gaveUp) fills[b.key] = '#9ec5d6'
  }
  const labels = borders
    .filter((b) => found.includes(b.key) || gaveUp)
    .map((b) => ({ p: [b.cx, b.cy] as [number, number], text: b.label }))
  labels.push({ p: [target.cx, target.cy], text: target.label })

  return (
    <Shell onExit={onExit} counter={`${idx + 1} / ${round.length}`}>
      <div className="mb-3 rounded-3xl bg-white/90 px-5 py-4 text-center shadow-sm">
        <h1 className="font-display text-2xl text-ocean-950 sm:text-3xl">
          Tap every {kindWord} that touches {theName(fact)}!
        </h1>
        <p className="mt-1 text-lg font-extrabold text-coral">
          {found.length} of {borders.length} found
        </p>
      </div>
      <GameMap
        atlas={atlas}
        camera={camera}
        onTap={done ? undefined : onTap}
        fills={fills}
        labels={labels}
        flash={flash}
      />
      <div className="mt-3 min-h-[3rem]">
        {note && !done && (
          <p className="rounded-2xl bg-white/85 px-4 py-3 text-center text-lg font-extrabold text-ocean-950">{note}</p>
        )}
        {done && (
          <div className="rounded-3xl bg-white/90 p-4 text-center shadow-sm">
            <p className="text-lg font-extrabold text-ocean-950">
              {gaveUp
                ? `${theName(fact)} has ${borders.length} neighbor${borders.length === 1 ? '' : 's'} — the blue ones are the ones you missed.`
                : `You found all ${borders.length}! ${'⭐'.repeat(stars)}`}
            </p>
            <button
              type="button"
              onClick={next}
              className="mt-3 w-full rounded-2xl bg-ocean-900 py-3 text-lg font-extrabold text-sand-100"
            >
              {idx + 1 >= round.length ? 'See my stars' : 'Next place'}
            </button>
          </div>
        )}
        {!done && (
          <button
            type="button"
            onClick={() => setGaveUp(true)}
            className="mt-2 w-full rounded-2xl bg-white/60 py-2.5 text-sm font-extrabold text-ocean-800"
          >
            Show me the rest
          </button>
        )}
      </div>
    </Shell>
  )
}

export function Shell({
  onExit,
  counter,
  children,
}: {
  onExit: () => void
  counter?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onExit} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
          ← Games
        </button>
        {counter && <span className="text-sm font-extrabold text-ocean-900">{counter}</span>}
      </div>
      {children}
    </div>
  )
}
