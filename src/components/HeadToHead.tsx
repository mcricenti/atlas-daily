import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FACTS, factsForUnit, UNITS } from '../data/curriculum'
import { makeDuelQuestion, type LessonStep } from '../lib/session'
import type { Explorer } from '../lib/storage'
import { Confetti } from './Confetti'
import { QuestionView } from './QuestionView'

const ROUNDS_EACH = 5
const PLAYER_COLORS = ['#e07a5f', '#2f9e6e']

type Props = { explorers: Explorer[]; onBack: () => void }

/** Places both players have met; falls back to what either knows, then the first unit. */
function sharedPool(a: Explorer, b: Explorer) {
  const both = FACTS.filter((f) => a.introduced.includes(f.id) && b.introduced.includes(f.id))
  if (both.length >= 8) return both
  const either = FACTS.filter((f) => a.introduced.includes(f.id) || b.introduced.includes(f.id))
  if (either.length >= 8) return either
  return factsForUnit(UNITS[0].id)
}

export function HeadToHead({ explorers, onBack }: Props) {
  const [players, setPlayers] = useState<[Explorer, Explorer] | null>(
    explorers.length === 2 ? [explorers[0], explorers[1]] : null,
  )
  const [picked, setPicked] = useState<string[]>([])

  if (!players) {
    return (
      <Shell onBack={onBack}>
        <h1 className="font-display text-3xl text-ocean-950">Who’s playing?</h1>
        <p className="mt-1 text-ocean-800/80">Pick two explorers.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {explorers.map((e) => {
            const on = picked.includes(e.id)
            return (
              <button
                key={e.id}
                type="button"
                onClick={() =>
                  setPicked((p) =>
                    on ? p.filter((x) => x !== e.id) : [...p, e.id].slice(-2),
                  )
                }
                className={`rounded-2xl border-4 px-4 py-4 text-left text-lg font-extrabold ${
                  on ? 'border-amber bg-amber/15' : 'border-transparent bg-white/80'
                }`}
              >
                {e.name}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          disabled={picked.length !== 2}
          onClick={() => {
            const [a, b] = picked.map((id) => explorers.find((e) => e.id === id)!)
            setPlayers([a, b])
          }}
          className="mt-5 w-full rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white disabled:opacity-40"
        >
          Start the match
        </button>
      </Shell>
    )
  }

  return <Match players={players} onBack={onBack} />
}

function Match({ players, onBack }: { players: [Explorer, Explorer]; onBack: () => void }) {
  const [pool] = useState(() => sharedPool(players[0], players[1]))
  const [used] = useState(() => new Set<string>())
  const [turn, setTurn] = useState(0)
  const [scores, setScores] = useState([0, 0])
  const [step, setStep] = useState<LessonStep>(() => makeDuelQuestion(pool, used))
  const [ready, setReady] = useState(false)

  const total = ROUNDS_EACH * 2
  const over = turn >= total
  const who = turn % 2

  if (over) {
    const [a, b] = scores
    const winner = a === b ? null : a > b ? players[0] : players[1]
    return (
      <Shell onBack={onBack}>
        <Confetti />
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Match over</p>
          <h1 className="mt-2 font-display text-4xl text-ocean-950">
            {winner ? `${winner.name} wins!` : 'It’s a tie!'}
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {players.map((p, i) => (
              <div key={p.id} className="rounded-2xl bg-white/85 py-5" style={{ borderTop: `6px solid ${PLAYER_COLORS[i]}` }}>
                <div className="font-display text-4xl text-ocean-950">{scores[i]}</div>
                <div className="font-extrabold text-ocean-800">{p.name}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 w-full rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100"
          >
            Back home
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onBack={onBack} wide={step.kind === 'map' || step.kind === 'blankmap'}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`rounded-2xl px-4 py-2 transition ${who === i ? 'bg-white shadow-md' : 'bg-white/40 opacity-60'}`}
            style={{ borderBottom: `5px solid ${PLAYER_COLORS[i]}` }}
          >
            <div className="text-sm font-extrabold text-ocean-800">{p.name}</div>
            <div className="font-display text-2xl text-ocean-950">{scores[i]}</div>
          </div>
        ))}
      </div>
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-ocean-700">
        Round {Math.floor(turn / 2) + 1} of {ROUNDS_EACH}
      </p>

      <AnimatePresence mode="wait">
        {!ready ? (
          <motion.div
            key={`pass-${turn}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl p-8 text-center text-white shadow-lg"
            style={{ backgroundColor: PLAYER_COLORS[who] }}
          >
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] opacity-90">Pass the tablet to</p>
            <p className="mt-1 font-brand text-5xl font-bold">{players[who].name}</p>
            <button
              type="button"
              onClick={() => setReady(true)}
              className="mt-6 rounded-2xl bg-white px-8 py-3 text-lg font-extrabold text-ocean-950"
            >
              I’m ready!
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="rounded-3xl bg-white/90 p-5 shadow-lg sm:p-8"
          >
            <QuestionView
              step={step}
              cheerIndex={turn}
              onAnswer={(ok) => {
                if (ok) setScores((s) => s.map((v, i) => (i === who ? v + 1 : v)))
              }}
              onNext={() => {
                setTurn((t) => t + 1)
                setStep(makeDuelQuestion(pool, used))
                setReady(false)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}

function Shell({
  onBack,
  wide,
  children,
}: {
  onBack: () => void
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`mx-auto px-4 py-8 ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
      >
        ← Home
      </button>
      {children}
    </div>
  )
}
