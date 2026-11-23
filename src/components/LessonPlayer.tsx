import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ensureCard,
  logAnswer,
  recordSessionComplete,
  trophyFor,
  unitReadyForPlacement,
  type Explorer,
} from '../lib/storage'
import {
  buildBossSession,
  buildDailySession,
  makeRetry,
  sessionMeta,
  type LessonStep,
  type QuestionKind,
} from '../lib/session'
import { reviewCard, type Grade } from '../lib/srs'
import { Confetti } from './Confetti'
import { PlaceTour } from './PlaceTour'
import { QuestionView } from './QuestionView'
import { TrophyIcon } from './Trophy'
import { QuizRound } from './games/QuizRound'
import { applyGameResults, shuffle, type Deck } from '../lib/mapGames'
import type { GeoFact } from '../data/curriculum'

/** Places from today's lesson for the 3-question "Find it!" map bonus at the end. */
const BONUS_SIZE = 3

function bonusFacts(steps: LessonStep[], explorer: Explorer): GeoFact[] {
  const seen = new Map<string, GeoFact>()
  for (const s of steps) if (explorer.introduced.includes(s.fact.id)) seen.set(s.fact.id, s.fact)
  return shuffle([...seen.values()]).slice(0, BONUS_SIZE)
}

const MAX_RETRIES = 5

type Props = {
  explorer: Explorer
  onUpdate: (explorer: Explorer) => void
  onExit: () => void
  onStartPlacement?: (unitId: string) => void
  /** 'boss' runs the weekly challenge instead of the daily lesson */
  mode?: 'daily' | 'boss'
}

/** Copy enough of an explorer that changing it won't touch the saved one. */
function cloneExplorer(e: Explorer): Explorer {
  return { ...e, cards: { ...e.cards }, introduced: [...e.introduced] }
}

export function LessonPlayer({
  explorer,
  onUpdate,
  onExit,
  onStartPlacement,
  mode = 'daily',
}: Props) {
  const boss = mode === 'boss'
  const [steps, setSteps] = useState<LessonStep[]>(() =>
    boss ? buildBossSession(explorer) : buildDailySession(explorer),
  )
  const meta = sessionMeta()
  const [index, setIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [earlier, setEarlier] = useState(0)
  const [retried] = useState(() => new Set<string>())
  const [done, setDone] = useState(false)
  const [working, setWorking] = useState(explorer)
  const [tourDone, setTourDone] = useState(false)
  const [bonus, setBonus] = useState<{ deck: Deck; next: Explorer; correct: number; total: number } | null>(null)

  const step = steps[index]
  const progress = steps.length ? ((index + (done ? 1 : 0)) / steps.length) * 100 : 0

  function markIntroduced(next: Explorer, factId: string) {
    if (!next.introduced.includes(factId)) {
      next.introduced = [...next.introduced, factId]
      const card = ensureCard(next, factId)
      card.introducedAt = Date.now()
    }
  }

  function finish(next: Explorer, correct: number, total: number) {
    let finished = recordSessionComplete(next)
    if (boss) {
      const trophy = trophyFor(correct, total)
      finished = {
        ...finished,
        bosses: [...(finished.bosses ?? []), { t: Date.now(), correct, total }],
        trailCoins:
          finished.trailCoins +
          (trophy === 'gold' ? 20 : trophy === 'silver' ? 12 : trophy === 'bronze' ? 6 : 0),
      }
    }
    setWorking(finished)
    onUpdate(finished)
    setDone(true)
  }

  function advance(next: Explorer, correct = correctCount, total = answered) {
    if (index + 1 < steps.length) {
      setIndex((i) => i + 1)
      return
    }
    // Daily lessons end with a quick "Find it!" on the map.
    const facts = boss ? [] : bonusFacts(steps, next)
    if (facts.length > 0) {
      setBonus({
        deck: { id: 'bonus', title: 'Map bonus', facts, total: facts.length, unlocked: true },
        next,
        correct,
        total,
      })
      return
    }
    finish(next, correct, total)
  }

  function onAnswer(correct: boolean) {
    const next = cloneExplorer(working)
    markIntroduced(next, step.fact.id)
    const card = ensureCard(next, step.fact.id)
    const grade: Grade = !correct ? 0 : step.retry ? 1 : 2
    next.cards[step.fact.id] = reviewCard({ ...card }, grade)
    next.totalAnswered += 1
    if (correct) next.totalCorrect += 1
    next.log = logAnswer(next, {
      t: Date.now(),
      f: step.fact.id,
      ok: correct,
      q: step.kind,
    })
    setWorking(next)
    onUpdate(next)
    setAnswered((n) => n + 1)
    if (correct) setCorrectCount((n) => n + 1)
    if (step.fromEarlierUnit) setEarlier((n) => n + 1)

    // A missed place comes back a few questions later, in an easier form.
    if (!correct && !boss && !step.retry && !retried.has(step.fact.id) && retried.size < MAX_RETRIES) {
      retried.add(step.fact.id)
      const retry = makeRetry(step.fact, step.kind as QuestionKind)
      setSteps((s) => {
        const at = Math.min(index + 4, s.length)
        return [...s.slice(0, at), retry, ...s.slice(at)]
      })
    }
  }

  function onNext() {
    advance(working, correctCount, answered)
  }

  function onTeachContinue() {
    const next = cloneExplorer(working)
    markIntroduced(next, step.fact.id)
    setWorking(next)
    onUpdate(next)
    setTourDone(false)
    advance(next)
  }

  if (bonus && !done) {
    return (
      <QuizRound
        mode="find"
        deck={bonus.deck}
        facts={bonus.deck.facts}
        player="🗺️ Map bonus"
        exitLabel="Skip"
        onExit={() => finish(bonus.next, bonus.correct, bonus.total)}
        onFinish={(results) => finish(applyGameResults(bonus.next, results, 'bonus'), bonus.correct, bonus.total)}
      />
    )
  }

  if (!step && !done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white/80 p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl text-ocean-900">All caught up!</h2>
        <p className="mt-2 text-ocean-800/80">
          Nothing is due right now. Come back tomorrow for fresh practice.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-6 rounded-2xl bg-ocean-900 px-5 py-3 font-bold text-sand-100"
        >
          Back home
        </button>
      </div>
    )
  }

  if (done) {
    const accuracy = answered ? Math.round((correctCount / answered) * 100) : 100
    const needsPlacement = !boss && unitReadyForPlacement(working)
    const trophy = boss ? trophyFor(correctCount, answered) : null
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg rounded-3xl bg-white/90 p-8 text-center shadow-lg"
      >
        {(!boss || trophy) && <Confetti />}
        <motion.div
          className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-amber/25"
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.15 }}
          aria-hidden
        >
          {boss ? (
            <TrophyIcon kind={trophy} size={60} />
          ) : (
            <svg width="50" height="50" viewBox="0 0 24 24">
              <path
                d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.8 9.2l7.1-.9z"
                fill="#ffd23f"
                stroke="#06262f"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-coral">
          {boss ? 'Weekly challenge complete' : 'Trail complete'}
        </p>
        <h2 className="mt-2 font-display text-3xl text-ocean-900">
          {boss
            ? trophy
              ? `${trophy[0].toUpperCase()}${trophy.slice(1)} trophy, ${explorer.name}!`
              : `Good effort, ${explorer.name}!`
            : `Great exploring, ${explorer.name}!`}
        </h2>
        <p className="mt-3 text-ocean-800/80">
          {boss
            ? trophy
              ? 'Your trophy is in your Atlas. The next challenge opens in a week.'
              : 'Keep doing your daily lessons and try again next week.'
            : `That’s today’s ${meta.minutes} minutes done. Come back tomorrow to keep these places in your memory.`}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Answered" value={String(answered)} />
          <Stat label="Correct" value={`${accuracy}%`} />
          {boss ? (
            <Stat label="Score" value={`${correctCount}/${answered}`} />
          ) : (
            <Stat label="Old favorites" value={String(earlier)} />
          )}
        </div>
        {needsPlacement && onStartPlacement ? (
          <>
            <p className="mt-6 text-sm font-semibold text-ocean-800">
              This section is ready — drag each state and capital onto the map
              to unlock the next one.
            </p>
            <button
              type="button"
              onClick={() => onStartPlacement(working.currentUnitId)}
              className="mt-4 w-full rounded-2xl bg-coral px-5 py-3.5 text-lg font-extrabold text-white shadow-md transition hover:brightness-105"
            >
              Place states &amp; capitals
            </button>
            <button
              type="button"
              onClick={onExit}
              className="mt-3 w-full rounded-2xl bg-ocean-900/10 px-5 py-3 text-sm font-bold text-ocean-900"
            >
              Later
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-coral px-5 py-3.5 text-lg font-extrabold text-white shadow-md transition hover:brightness-105"
          >
            Back home
          </button>
        )}
      </motion.div>
    )
  }

  const wide = step.kind === 'teach' || step.kind === 'map' || step.kind === 'blankmap'

  return (
    <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
        >
          Exit
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-ocean-900/10">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${
              boss ? 'from-amber to-coral' : 'from-sea-300 to-amber'
            }`}
            animate={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-bold text-ocean-900">
          {index + 1}/{steps.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-ocean-900/8 bg-white/85 p-5 shadow-lg backdrop-blur sm:p-8"
        >
          {step.kind === 'teach' ? (
            <>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ocean-700">
                {step.phaseLabel}
              </p>
              <h2 className="mt-2 font-display text-2xl text-ocean-950 sm:text-3xl">
                {step.fact.name}
              </h2>
              <div className="mt-4 space-y-4">
                <PlaceTour
                  key={step.id}
                  fact={step.fact}
                  onFinished={() => setTourDone(true)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    onTeachContinue()
                  }}
                  className={`w-full rounded-2xl py-3.5 font-extrabold transition ${
                    tourDone
                      ? 'animate-pop bg-[#0b3d4a] text-lg text-[#f3efe6] shadow-md'
                      : 'bg-[#0b3d4a]/10 text-base text-[#0b3d4a]'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {tourDone ? 'Got it — let’s practice!' : 'Skip the tour'}
                </button>
              </div>
            </>
          ) : (
            <QuestionView
              key={step.id}
              step={step}
              onAnswer={onAnswer}
              onNext={onNext}
              cheerIndex={index}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand-100 px-3 py-4">
      <div className="font-display text-2xl text-ocean-900">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-ocean-700">
        {label}
      </div>
    </div>
  )
}
