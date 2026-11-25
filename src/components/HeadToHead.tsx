import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FACTS, factsForUnit, UNITS } from '../data/curriculum'
import { getAvatarEmoji } from '../data/shop'
import { makeDuelQuestion, type LessonStep } from '../lib/session'
import { playFanfare } from '../lib/sfx'
import type { DuelRecord, Explorer } from '../lib/storage'
import { Confetti } from './Confetti'
import { QuestionView } from './QuestionView'

const ROUNDS_EACH = 5
const COOP_TARGET = 8
const PLAYER_COLORS = ['#e07a5f', '#2f9e6e']

type Mode = 'duel' | 'grownup' | 'coop'

type Player = {
  id: string
  name: string
  avatar: string
  explorer?: Explorer
}

type Props = {
  explorers: Explorer[]
  activeExplorer: Explorer
  duelHistory: DuelRecord[]
  onRecordDuel: (record: DuelRecord) => void
  onBack: () => void
}

/** Places both players have met; falls back to what either knows, then the first unit. */
function sharedPool(a?: Explorer, b?: Explorer) {
  if (a && b) {
    const both = FACTS.filter((f) => a.introduced.includes(f.id) && b.introduced.includes(f.id))
    if (both.length >= 8) return both
    const either = FACTS.filter((f) => a.introduced.includes(f.id) || b.introduced.includes(f.id))
    if (either.length >= 8) return either
  } else if (a) {
    const known = FACTS.filter((f) => a.introduced.includes(f.id))
    if (known.length >= 8) return known
  }
  return factsForUnit(UNITS[0].id)
}

export function HeadToHead({
  explorers,
  activeExplorer,
  duelHistory,
  onRecordDuel,
  onBack,
}: Props) {
  const [mode, setMode] = useState<Mode>(explorers.length >= 2 ? 'duel' : 'grownup')
  const [picked, setPicked] = useState<string[]>(() =>
    explorers.length >= 2 ? [explorers[0].id, explorers[1].id] : [activeExplorer.id],
  )
  const [grownupName, setGrownupName] = useState('Grown-up')
  const [matchKey, setMatchKey] = useState(0)
  const [players, setPlayers] = useState<[Player, Player] | null>(null)

  function startMatch() {
    if (mode === 'grownup') {
      const kid = explorers.find((e) => e.id === picked[0]) ?? activeExplorer
      setPlayers([
        { id: kid.id, name: kid.name, avatar: getAvatarEmoji(kid.avatar), explorer: kid },
        { id: 'grownup', name: grownupName.trim() || 'Grown-up', avatar: '🧑‍🏫' },
      ])
    } else if (picked.length >= 2) {
      const [a, b] = picked.map((id) => explorers.find((e) => e.id === id)!)
      setPlayers([
        { id: a.id, name: a.name, avatar: getAvatarEmoji(a.avatar), explorer: a },
        { id: b.id, name: b.name, avatar: getAvatarEmoji(b.avatar), explorer: b },
      ])
    } else {
      const kid = explorers.find((e) => e.id === picked[0]) ?? activeExplorer
      setPlayers([
        { id: kid.id, name: kid.name, avatar: getAvatarEmoji(kid.avatar), explorer: kid },
        { id: 'partner', name: grownupName.trim() || 'Grown-up', avatar: '🤝' },
      ])
    }
    setMatchKey((k) => k + 1)
  }

  if (!players) {
    const canSibling = explorers.length >= 2
    const recent = [...duelHistory].reverse().slice(0, 6)
    return (
      <Shell onBack={onBack}>
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">
          Play together
        </p>
        <h1 className="mt-1 font-display text-3xl text-ocean-950">Head-to-head &amp; Co-op</h1>
        <p className="mt-1 text-ocean-800/80">
          Pass one tablet back and forth — 5 quick questions each.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <ModeButton
            active={mode === 'duel'}
            disabled={!canSibling}
            onClick={() => {
              setMode('duel')
              if (explorers.length >= 2) setPicked([explorers[0].id, explorers[1].id])
            }}
            icon="⚔️"
            title="Sibling Duel"
            sub={canSibling ? 'Two explorers face off' : 'Add a 2nd explorer'}
          />
          <ModeButton
            active={mode === 'grownup'}
            onClick={() => {
              setMode('grownup')
              setPicked([activeExplorer.id])
            }}
            icon="🧑‍🏫"
            title="Kid vs. Grown-up"
            sub="Challenge Mom or Dad"
          />
          <ModeButton
            active={mode === 'coop'}
            onClick={() => {
              setMode('coop')
              setPicked(
                explorers.length >= 2
                  ? [explorers[0].id, explorers[1].id]
                  : [activeExplorer.id],
              )
            }}
            icon="🤝"
            title="Team Co-op"
            sub={`Team up to score ${COOP_TARGET}/10`}
          />
        </div>

        <div className="mt-5 rounded-3xl bg-white/80 p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ocean-700">
            {mode === 'grownup'
              ? 'Pick explorer & partner name'
              : mode === 'coop' && !canSibling
                ? 'Team up with a grown-up'
                : 'Pick two explorers'}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {explorers.map((e) => {
              const on = picked.includes(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    if (mode === 'grownup' || (mode === 'coop' && !canSibling)) {
                      setPicked([e.id])
                    } else {
                      setPicked((p) =>
                        on ? p.filter((x) => x !== e.id) : [...p, e.id].slice(-2),
                      )
                    }
                  }}
                  className={`flex items-center gap-2 rounded-2xl border-4 px-4 py-3 text-left text-lg font-extrabold ${
                    on ? 'border-amber bg-amber/15' : 'border-transparent bg-sand-100'
                  }`}
                >
                  <span>{getAvatarEmoji(e.avatar)}</span>
                  <span>{e.name}</span>
                </button>
              )
            })}
          </div>

          {(mode === 'grownup' || (mode === 'coop' && picked.length < 2)) && (
            <label className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-ocean-700">
              Player 2 name
              <input
                value={grownupName}
                onChange={(e) => setGrownupName(e.target.value)}
                placeholder="Dad, Mom, Grandma…"
                className="mt-1.5 w-full rounded-2xl border-2 border-ocean-900/10 bg-sand-100 px-4 py-2.5 text-base font-bold text-ocean-950 outline-none focus:border-sea-300"
              />
            </label>
          )}

          <button
            type="button"
            disabled={mode === 'duel' ? picked.length !== 2 : picked.length < 1}
            onClick={startMatch}
            className="mt-5 w-full rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white shadow-md transition hover:brightness-105 disabled:opacity-40"
          >
            {mode === 'coop' ? 'Start team challenge' : 'Start the match'}
          </button>
        </div>

        {recent.length > 0 && (
          <section className="mt-6 rounded-3xl bg-white/75 p-5 shadow-sm">
            <h2 className="font-display text-lg text-ocean-950">Recent matches</h2>
            <ul className="mt-2 divide-y divide-ocean-900/10 text-sm">
              {recent.map((r) => (
                <li key={r.t} className="flex flex-wrap items-center justify-between gap-2 py-2 font-bold text-ocean-900">
                  <span>
                    {r.mode === 'coop' ? '🤝 ' : '⚔️ '}
                    {r.p1} &amp; {r.p2}
                  </span>
                  <span className="text-ocean-700">
                    {r.mode === 'coop'
                      ? `Team ${r.s1 + r.s2}/${r.total}`
                      : `${r.s1} – ${r.s2}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Shell>
    )
  }

  return (
    <Match
      key={matchKey}
      mode={mode}
      players={players}
      confettiTheme={activeExplorer.confettiTheme}
      onRecordDuel={onRecordDuel}
      onRematch={() => setMatchKey((k) => k + 1)}
      onChangeSetup={() => setPlayers(null)}
      onBack={onBack}
    />
  )
}

function ModeButton({
  active,
  disabled,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: string
  title: string
  sub: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border-2 p-3.5 text-left transition disabled:opacity-50 ${
        active
          ? 'border-ocean-900 bg-ocean-900 text-sand-100 shadow-md'
          : 'border-ocean-900/10 bg-white/80 text-ocean-950 hover:bg-white'
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 font-extrabold">{title}</div>
      <div className={`text-xs font-semibold ${active ? 'text-sea-200' : 'text-ocean-700'}`}>
        {sub}
      </div>
    </button>
  )
}

function Match({
  mode,
  players,
  confettiTheme,
  onRecordDuel,
  onRematch,
  onChangeSetup,
  onBack,
}: {
  mode: Mode
  players: [Player, Player]
  confettiTheme?: string
  onRecordDuel: (record: DuelRecord) => void
  onRematch: () => void
  onChangeSetup: () => void
  onBack: () => void
}) {
  const [pool] = useState(() => sharedPool(players[0].explorer, players[1].explorer))
  const [used] = useState(() => new Set<string>())
  const [turn, setTurn] = useState(0)
  const [scores, setScores] = useState([0, 0])
  const [step, setStep] = useState<LessonStep>(() => makeDuelQuestion(pool, used))
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)

  const total = ROUNDS_EACH * 2
  const over = turn >= total
  const who = turn % 2

  if (over) {
    const [a, b] = scores
    const teamTotal = a + b
    const coopWon = teamTotal >= COOP_TARGET
    const winner = a === b ? null : a > b ? players[0] : players[1]
    return (
      <Shell onBack={onBack}>
        {(mode !== 'coop' || coopWon) && <Confetti theme={confettiTheme} />}
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">
            {mode === 'coop' ? 'Team challenge complete' : 'Match over'}
          </p>
          <h1 className="mt-2 font-display text-4xl text-ocean-950">
            {mode === 'coop'
              ? coopWon
                ? `Team victory! ${teamTotal}/${total}!`
                : `Great teamwork! ${teamTotal}/${total}`
              : winner
                ? `${winner.avatar} ${winner.name} wins!`
                : 'It’s a tie!'}
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {players.map((p, i) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white/85 py-5"
                style={{ borderTop: `6px solid ${PLAYER_COLORS[i]}` }}
              >
                <div className="text-2xl">{p.avatar}</div>
                <div className="font-display text-4xl text-ocean-950">{scores[i]}</div>
                <div className="font-extrabold text-ocean-800">{p.name}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onRematch}
              className="rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white shadow-md"
            >
              Play again 🔁
            </button>
            <button
              type="button"
              onClick={onChangeSetup}
              className="rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100"
            >
              Change mode
            </button>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 w-full rounded-2xl bg-white/80 py-3 text-sm font-bold text-ocean-900"
          >
            Back home
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onBack={onBack} wide={step.kind === 'map' || step.kind === 'blankmap'}>
      {mode === 'coop' ? (
        <div className="mb-4 rounded-2xl bg-white/85 px-4 py-3 text-center shadow-sm">
          <div className="text-xs font-extrabold uppercase tracking-wider text-ocean-700">
            Team score · Goal: {COOP_TARGET}/{total}
          </div>
          <div className="font-display text-3xl text-ocean-950">
            🤝 {scores[0] + scores[1]} / {total}
          </div>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-2xl px-4 py-2 transition ${who === i ? 'bg-white shadow-md' : 'bg-white/40 opacity-60'}`}
              style={{ borderBottom: `5px solid ${PLAYER_COLORS[i]}` }}
            >
              <div className="text-sm font-extrabold text-ocean-800">
                {p.avatar} {p.name}
              </div>
              <div className="font-display text-2xl text-ocean-950">{scores[i]}</div>
            </div>
          ))}
        </div>
      )}
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
            <p className="mt-1 font-brand text-5xl font-bold">
              {players[who].avatar} {players[who].name}
            </p>
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
                if (ok) {
                  setScores((s) => s.map((v, i) => (i === who ? v + 1 : v)))
                }
              }}
              onNext={() => {
                const nextTurn = turn + 1
                if (nextTurn >= total && !saved) {
                  setSaved(true)
                  playFanfare()
                  onRecordDuel({
                    t: Date.now(),
                    mode,
                    p1: players[0].name,
                    p2: players[1].name,
                    s1: scores[0],
                    s2: scores[1],
                    total,
                  })
                }
                setTurn(nextTurn)
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
