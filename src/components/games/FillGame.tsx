import { useEffect, useMemo, useState } from 'react'
import type { GeoFact } from '../../data/curriculum'
import { shapeForFact } from '../../lib/geoData'
import { centerFor, fillCamera, mapKindFor, shuffle, tapFinds, theName, type GameResult, type Tap } from '../../lib/mapGames'
import { loadVoicePref, speak } from '../../lib/narrator'
import { GameMap, MapLoading } from './GameMap'
import { COLORS, formatTime, useAtlas } from './gameKit'
import { Shell } from './NeighborsGame'

const WRONG_PENALTY = 3
const SKIP_PENALTY = 10
const MAX_MISSES = 3

/** Race the clock to fill in every place on a map. */
export function FillGame({
  facts,
  best,
  onExit,
  onFinish,
}: {
  facts: GeoFact[]
  /** Best time so far, in seconds */
  best?: number
  onExit: () => void
  onFinish: (results: GameResult[], seconds: number) => void
}) {
  const [order] = useState(() => shuffle(facts))
  const atlas = useAtlas(mapKindFor(order[0]), centerFor(order[0]))
  const camera = useMemo(() => (atlas ? fillCamera(atlas, order) : null), [atlas, order])
  const [idx, setIdx] = useState(0)
  const [misses, setMisses] = useState(0)
  const [results, setResults] = useState<GameResult[]>([])
  const [penalty, setPenalty] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [flash, setFlash] = useState<{ key: string; color: string; n: number } | null>(null)
  const [wrongNote, setWrongNote] = useState('')

  const fact = order[idx]
  const done = idx >= order.length


  useEffect(() => {
    if (done || !atlas) return
    const t = window.setInterval(() => {
      const t0 = Date.now()
      // The clock starts once the map is on screen.
      setStartedAt((s) => s ?? t0)
      setNow(t0)
    }, 250)
    return () => window.clearInterval(t)
  }, [done, atlas])

  useEffect(() => {
    if (!fact || !loadVoicePref()) return
    return speak(fact.name, () => undefined)
  }, [fact])

  const elapsed = startedAt ? (now - startedAt) / 1000 + penalty : 0

  function advance(stars: number, extra = 0) {
    const all = [...results, { fact, stars }]
    setResults(all)
    setMisses(0)
    setWrongNote('')
    if (idx + 1 >= order.length) {
      const total = (Date.now() - (startedAt ?? Date.now())) / 1000 + penalty + extra
      setNow(Date.now())
      setIdx((i) => i + 1)
      onFinish(all, Math.round(total))
      return
    }
    setIdx((i) => i + 1)
  }

  function onTap(tap: Tap) {
    if (!atlas || done) return
    if (tapFinds(atlas, fact, tap)) {
      advance(misses === 0 ? 2 : 1)
      return
    }
    if (tap.shape) setFlash((f) => ({ key: tap.shape!.key, color: COLORS.wrong, n: (f?.n ?? 0) + 1 }))
    setPenalty((p) => p + WRONG_PENALTY)
    setWrongNote(tap.shape ? `That’s ${tap.shape.label}. +${WRONG_PENALTY} seconds` : `+${WRONG_PENALTY} seconds`)
    if (misses + 1 >= MAX_MISSES) advance(0, WRONG_PENALTY)
    else setMisses((m) => m + 1)
  }

  function skip() {
    setPenalty((p) => p + SKIP_PENALTY)
    advance(0, SKIP_PENALTY)
  }

  if (!atlas || !camera) return <Shell onExit={onExit}><MapLoading /></Shell>

  const deckKeys = new Set(order.map((f) => shapeForFact(atlas, f)?.key).filter(Boolean) as string[])
  const fills: Record<string, string> = {}
  for (const s of atlas.shapes) if (!deckKeys.has(s.key)) fills[s.key] = '#cdbfa3'
  const labels: { p: [number, number]; text: string }[] = []
  results.forEach((r) => {
    const s = shapeForFact(atlas, r.fact)
    if (!s) return
    fills[s.key] = r.stars === 2 ? COLORS.right : r.stars === 1 ? '#7cc49a' : COLORS.target
    labels.push({ p: [s.cx, s.cy], text: r.fact.name })
  })

  return (
    <Shell onExit={onExit} counter={`${Math.min(idx + 1, order.length)} / ${order.length}`}>
      <div className="mb-3 flex items-center gap-3 rounded-3xl bg-white/90 px-5 py-3 shadow-sm">
        <div className="flex-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-coral">Fill the map</p>
          <h1 className="font-display text-2xl text-ocean-950 sm:text-3xl">
            {done ? 'All filled in!' : `Tap ${theName(fact)}`}
          </h1>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl tabular-nums text-ocean-950">{formatTime(elapsed)}</p>
          {best !== undefined && <p className="text-xs font-bold text-ocean-700">Best {formatTime(best)}</p>}
        </div>
      </div>
      <GameMap atlas={atlas} camera={camera} onTap={done ? undefined : onTap} fills={fills} labels={labels} flash={flash} />
      <div className="mt-3 flex items-center gap-2">
        <p className="min-h-[2.5rem] flex-1 rounded-2xl bg-white/70 px-4 py-2 text-center font-extrabold text-coral">
          {wrongNote || `Wrong taps add ${WRONG_PENALTY} seconds`}
        </p>
        {!done && (
          <button type="button" onClick={skip} className="rounded-2xl bg-white/80 px-4 py-2 text-sm font-extrabold text-ocean-800">
            Skip (+{SKIP_PENALTY}s)
          </button>
        )}
      </div>
    </Shell>
  )
}
