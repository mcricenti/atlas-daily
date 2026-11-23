import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { GeoFact } from '../../data/curriculum'
import {
  centerFor,
  findPrompt,
  kindHint,
  mapKindFor,
  tapDistancePx,
  theName,
  viewFor,
  type Tap,
} from '../../lib/mapGames'
import { Confetti } from '../Confetti'
import { GameMap, MapLoading } from './GameMap'
import { COLORS, useAtlas } from './gameKit'
import { Shell } from './NeighborsGame'

type Turn = { tap: Tap; dist: number }
type Step = 'tap-first' | 'pass' | 'tap-second' | 'result'

/** Two players take turns on the same places; the right tap (or the closer miss) scores. */
export function DuelGame({
  players,
  facts,
  onExit,
  onAgain,
}: {
  players: [string, string]
  facts: GeoFact[]
  onExit: () => void
  onAgain: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [step, setStep] = useState<Step>('tap-first')
  const [taps, setTaps] = useState<(Turn | null)[]>([null, null])
  const [score, setScore] = useState<[number, number]>([0, 0])
  const [lastPoints, setLastPoints] = useState<[number, number]>([0, 0])

  const done = idx >= facts.length
  const fact = facts[Math.min(idx, facts.length - 1)]
  const atlas = useAtlas(mapKindFor(fact), centerFor(fact))
  const camera = useMemo(() => (atlas ? viewFor(atlas, fact) : null), [atlas, fact])

  // Players take turns going first.
  const first = idx % 2
  const second = 1 - first
  const current = step === 'tap-first' ? first : second

  function onTap(tap: Tap) {
    if (!atlas) return
    const turn = { tap, dist: tapDistancePx(atlas, fact, tap) }
    const next = [...taps]
    next[current] = turn
    setTaps(next)
    if (step === 'tap-first') {
      setStep('pass')
      return
    }
    const [a, b] = next as [Turn, Turn]
    const pts: [number, number] = [a.dist === 0 ? 3 : 0, b.dist === 0 ? 3 : 0]
    if (a.dist > 0 && b.dist > 0) {
      if (a.dist <= b.dist) pts[0] = 1
      if (b.dist <= a.dist) pts[1] = 1
    }
    setLastPoints(pts)
    setScore((s) => [s[0] + pts[0], s[1] + pts[1]])
    setStep('result')
  }

  function nextQuestion() {
    setIdx((i) => i + 1)
    setTaps([null, null])
    setStep('tap-first')
  }

  if (done) {
    const [s0, s1] = score
    const winner = s0 === s1 ? null : s0 > s1 ? players[0] : players[1]
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Confetti />
        <div className="rounded-3xl bg-white/90 p-6 text-center shadow-lg sm:p-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Map duel</p>
          <h1 className="mt-2 font-display text-4xl text-ocean-950">{winner ? `${winner} wins!` : 'It’s a tie!'}</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {players.map((p, i) => (
              <div key={i} className="rounded-2xl p-4 text-white" style={{ background: i === 0 ? COLORS.p1 : COLORS.p2 }}>
                <p className="text-lg font-extrabold">{p}</p>
                <p className="font-display text-4xl">{score[i]}</p>
                <p className="text-xs font-bold">points</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onAgain} className="rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white">
              Rematch
            </button>
            <button type="button" onClick={onExit} className="rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100">
              Other games
            </button>
          </div>
        </div>
      </div>
    )
  }

  const color = (i: number) => (i === 0 ? COLORS.p1 : COLORS.p2)
  const scoreBar = (
    <div className="mb-3 grid grid-cols-2 gap-2">
      {players.map((p, i) => (
        <div
          key={i}
          className={`rounded-2xl px-3 py-2 text-white transition ${step !== 'result' && step !== 'pass' && current === i ? 'ring-4 ring-amber' : 'opacity-80'}`}
          style={{ background: color(i) }}
        >
          <span className="font-extrabold">{p}</span>
          <span className="float-right font-display text-xl">{score[i]}</span>
        </div>
      ))}
    </div>
  )

  if (step === 'pass') {
    return (
      <Shell onExit={onExit} counter={`${idx + 1} / ${facts.length}`}>
        {scoreBar}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl p-8 text-center text-white shadow-lg"
          style={{ background: color(second) }}
        >
          <p className="text-6xl" aria-hidden>🙈</p>
          <h1 className="mt-3 font-display text-4xl">Pass the tablet to {players[second]}!</h1>
          <p className="mt-2 text-lg font-bold">{players[first]}, no peeking at the answer.</p>
          <button
            type="button"
            onClick={() => setStep('tap-second')}
            className="mt-6 w-full rounded-2xl bg-white py-3.5 text-lg font-extrabold text-ocean-950"
          >
            I’m {players[second]} — ready!
          </button>
        </motion.div>
      </Shell>
    )
  }

  const pins =
    step === 'result'
      ? ([0, 1] as const).map((i) => ({ p: taps[i]!.tap.p, color: color(i), text: players[i][0].toUpperCase() }))
      : []

  return (
    <Shell onExit={onExit} counter={`${idx + 1} / ${facts.length}`}>
      {scoreBar}
      <div className="mb-3 rounded-3xl bg-white/90 px-5 py-4 text-center shadow-sm">
        {step !== 'result' && (
          <p className="text-sm font-extrabold uppercase tracking-widest" style={{ color: color(current) }}>
            {players[current]}’s turn
          </p>
        )}
        <h1 className="font-display text-2xl text-ocean-950 sm:text-4xl">{findPrompt(fact)}</h1>
        {step !== 'result' && kindHint(fact) && <p className="mt-1 text-sm font-bold text-ocean-700">{kindHint(fact)}</p>}
      </div>
      {atlas && camera ? (
        <GameMap
          atlas={atlas}
          camera={camera}
          onTap={step === 'result' ? undefined : onTap}
          highlights={step === 'result' ? [{ fact, color: COLORS.right, pulse: true }] : []}
          pins={pins}
        />
      ) : (
        <MapLoading />
      )}
      {step === 'result' && (
        <div className="mt-3 rounded-3xl bg-white/90 p-4 text-center shadow-sm">
          <p className="text-lg font-extrabold text-ocean-950">Here’s {theName(fact)}!</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-extrabold">
            {players.map((p, i) => (
              <p key={i} style={{ color: color(i) }}>
                {p}:{' '}
                {taps[i]!.dist === 0
                  ? 'Right on it! +3'
                  : lastPoints[i]
                    ? 'Closest! +1'
                    : 'Not this time'}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={nextQuestion}
            className="mt-3 w-full rounded-2xl bg-ocean-900 py-3 text-lg font-extrabold text-sand-100"
          >
            {idx + 1 >= facts.length ? 'See who won' : 'Next place'}
          </button>
        </div>
      )}
    </Shell>
  )
}
