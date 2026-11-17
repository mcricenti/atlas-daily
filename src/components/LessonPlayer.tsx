import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ensureCard,
  recordSessionComplete,
  unitReadyForPlacement,
  type Explorer,
} from '../lib/storage'
import { buildDailySession, sessionMeta } from '../lib/session'
import { reviewCard, type Grade } from '../lib/srs'
import { AtlasMap } from './AtlasMap'
import { Confetti } from './Confetti'
import { PlaceTour } from './PlaceTour'

const CHEERS = ['Yes!', 'You got it!', 'Nice work!', 'Exactly right!', 'Great memory!']

type Props = {
  explorer: Explorer
  onUpdate: (explorer: Explorer) => void
  onExit: () => void
  onStartPlacement?: (unitId: string) => void
}

export function LessonPlayer({
  explorer,
  onUpdate,
  onExit,
  onStartPlacement,
}: Props) {
  const steps = useMemo(() => buildDailySession(explorer), [explorer.id])
  const meta = sessionMeta()
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [done, setDone] = useState(false)
  const [working, setWorking] = useState(explorer)
  const [tourDone, setTourDone] = useState(false)

  const step = steps[index]
  const progress = steps.length ? ((index + (done ? 1 : 0)) / steps.length) * 100 : 0

  function markIntroduced(next: Explorer, factId: string) {
    if (!next.introduced.includes(factId)) {
      next.introduced = [...next.introduced, factId]
      const card = ensureCard(next, factId)
      card.introducedAt = Date.now()
    }
  }

  function gradeAndAdvance(grade: Grade, wasCorrect: boolean) {
    const next = {
      ...working,
      cards: { ...working.cards },
      introduced: [...working.introduced],
    }
    markIntroduced(next, step.fact.id)
    const card = ensureCard(next, step.fact.id)
    next.cards[step.fact.id] = reviewCard({ ...card }, grade)
    next.totalAnswered += 1
    if (wasCorrect) next.totalCorrect += 1

    setWorking(next)
    onUpdate(next)
    setAnswered((n) => n + 1)
    if (wasCorrect) setCorrectCount((n) => n + 1)

    window.setTimeout(() => {
      setFeedback(null)
      setSelectedId(null)
      setSelectedChoice(null)
      if (index + 1 >= steps.length) {
        const finished = recordSessionComplete(next)
        setWorking(finished)
        onUpdate(finished)
        setDone(true)
      } else {
        setIndex((i) => i + 1)
      }
    }, wasCorrect ? 1000 : 2200)
  }

  function onTeachContinue() {
    const next = {
      ...working,
      cards: { ...working.cards },
      introduced: [...working.introduced],
    }
    markIntroduced(next, step.fact.id)
    ensureCard(next, step.fact.id)
    setWorking(next)
    onUpdate(next)
    setTourDone(false)
    if (index + 1 >= steps.length) {
      const finished = recordSessionComplete(next)
      onUpdate(finished)
      setDone(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  function onChoice(choice: string) {
    if (feedback) return
    setSelectedChoice(choice)
    const correct = choice === step.answer
    setFeedback(correct ? 'correct' : 'wrong')
    gradeAndAdvance(correct ? 2 : 0, correct)
  }

  function onMapSelect(fact: { id: string; name: string }) {
    if (feedback) return
    setSelectedId(fact.id)
    const correct = fact.id === step.fact.id
    setFeedback(correct ? 'correct' : 'wrong')
    gradeAndAdvance(correct ? 2 : 0, correct)
  }

  if (!step && !done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white/80 p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl text-ocean-900">All caught up!</h2>
        <p className="mt-2 text-ocean-800/80">
          No cards are due. Come back tomorrow for fresh practice.
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
    const needsPlacement = unitReadyForPlacement(working)
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg rounded-3xl bg-white/90 p-8 text-center shadow-lg"
      >
        <Confetti />
        <motion.div
          className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-amber/25"
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.15 }}
          aria-hidden
        >
          <svg width="46" height="46" viewBox="0 0 24 24">
            <path
              d="M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.8 9.2l7.1-.9z"
              fill="#ffd23f"
              stroke="#06262f"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-coral">
          Trail complete
        </p>
        <h2 className="mt-2 font-display text-3xl text-ocean-900">
          Great exploring, {explorer.name}!
        </h2>
        <p className="mt-3 text-ocean-800/80">
          That&apos;s today&apos;s {meta.minutes} minutes done. Come back tomorrow to
          keep these places in your memory.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Answered" value={String(answered)} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Coins" value={`+5`} />
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
              Later — see progress
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-coral px-5 py-3.5 text-lg font-extrabold text-white shadow-md transition hover:brightness-105"
          >
            See my progress
          </button>
        )}
      </motion.div>
    )
  }

  const mapWide = step.kind === 'map' || step.kind === 'teach'

  return (
    <div className={`mx-auto ${mapWide ? 'max-w-5xl' : 'max-w-2xl'}`}>
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
            className="h-full rounded-full bg-gradient-to-r from-sea-300 to-amber"
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
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ocean-700">
            {step.phaseLabel}
          </p>
          <h2 className="mt-2 font-display text-2xl text-ocean-950 sm:text-3xl">
            {step.kind === 'teach'
              ? step.fact.name
              : step.kind === 'map'
                ? step.prompt
                : step.prompt}
          </h2>

          {step.kind === 'teach' && (
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
                onPointerUp={(e) => {
                  if (e.pointerType !== 'touch') return
                  e.preventDefault()
                  onTeachContinue()
                }}
                className={`relative z-20 w-full rounded-2xl py-3.5 font-extrabold transition ${
                  tourDone
                    ? 'animate-pop bg-[#0b3d4a] text-lg text-[#f3efe6] shadow-md'
                    : 'bg-[#0b3d4a]/10 text-base text-[#0b3d4a]'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {tourDone ? 'Got it — let’s practice!' : 'Skip the tour'}
              </button>
            </div>
          )}

          {(step.kind === 'guided' ||
            step.kind === 'capital' ||
            step.kind === 'review') &&
            step.choices && (
              <div className="mt-6 grid gap-3">
                {step.fact.capital && step.kind === 'guided' && (
                  <p className="text-sm font-semibold text-ocean-700">
                    Capital: {step.fact.capital}
                  </p>
                )}
                {step.choices.map((choice) => {
                  const isSelected = selectedChoice === choice
                  const showCorrect = feedback && choice === step.answer
                  const showWrong =
                    feedback === 'wrong' && isSelected && choice !== step.answer
                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={(e) => {
                        e.preventDefault()
                        if (!feedback) onChoice(choice)
                      }}
                      onPointerUp={(e) => {
                        if (e.pointerType !== 'touch') return
                        e.preventDefault()
                        if (!feedback) onChoice(choice)
                      }}
                      className={`relative z-20 rounded-2xl border-2 px-4 py-3.5 text-left text-base font-bold transition sm:text-lg ${
                        showCorrect
                          ? 'border-sea-300 bg-sea-200/60 text-ocean-950'
                          : showWrong
                            ? 'border-coral bg-coral/15 text-ocean-950'
                            : 'border-ocean-900/10 bg-sand-100 hover:border-ocean-700/40'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span className="flex items-center justify-between gap-3">
                        {choice}
                        {showCorrect && (
                          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                            <circle cx="12" cy="12" r="11" fill="#2f6f4e" />
                            <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {showWrong && (
                          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                            <circle cx="12" cy="12" r="11" fill="#e07a5f" />
                            <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  )
                })}
                <p
                  className={`min-h-[1.75rem] text-center text-base font-extrabold ${
                    feedback === 'correct' ? 'text-moss' : 'text-coral'
                  }`}
                  aria-live="polite"
                >
                  {feedback === 'correct' &&
                    `${CHEERS[index % CHEERS.length]} ${
                      step.kind === 'capital'
                        ? `${step.answer} is the capital of ${step.fact.name}.`
                        : `That’s ${step.fact.name}.`
                    }`}
                  {feedback === 'wrong' &&
                    (step.kind === 'capital'
                      ? `Not quite. The capital of ${step.fact.name} is ${step.answer}.`
                      : `Not quite. The answer is ${step.answer}.`)}
                </p>
              </div>
            )}

          {step.kind === 'map' && step.mapOptions && (
            <div className="mt-5">
              <AtlasMap
                options={step.mapOptions}
                targetId={step.fact.id}
                disabled={Boolean(feedback)}
                onSelect={onMapSelect}
                feedback={feedback}
                selectedId={selectedId}
                large
                labelMode="options"
                focusNames={step.mapOptions.map((f) => f.name)}
              />
              {feedback === 'wrong' && (
                <p className="mt-3 text-center font-bold text-coral">
                  Not quite — look for {step.fact.name}.
                </p>
              )}
              {feedback === 'correct' && (
                <p className="mt-3 text-center font-bold text-moss">
                  Yes! That&apos;s {step.fact.name}.
                </p>
              )}
            </div>
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
