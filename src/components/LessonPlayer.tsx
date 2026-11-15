import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ensureCard, recordSessionComplete, type Explorer } from '../lib/storage'
import { buildDailySession, sessionMeta } from '../lib/session'
import { reviewCard, type Grade } from '../lib/srs'
import { formatPopulation } from '../data/curriculum'
import { AtlasMap } from './AtlasMap'

type Props = {
  explorer: Explorer
  onUpdate: (explorer: Explorer) => void
  onExit: () => void
}

export function LessonPlayer({ explorer, onUpdate, onExit }: Props) {
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
    }, wasCorrect ? 700 : 1100)
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg rounded-3xl bg-white/90 p-8 text-center shadow-lg"
      >
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-coral">
          Trail complete
        </p>
        <h2 className="mt-2 font-display text-3xl text-ocean-900">
          Great exploring, {explorer.name}!
        </h2>
        <p className="mt-3 text-ocean-800/80">
          About {meta.minutes} minutes of geography locked in with spaced review.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Answered" value={String(answered)} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Coins" value={`+5`} />
        </div>
        <button
          type="button"
          onClick={onExit}
          className="mt-8 w-full rounded-2xl bg-coral px-5 py-3.5 text-lg font-extrabold text-white shadow-md transition hover:brightness-105"
        >
          See my progress
        </button>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
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
            <div className="mt-5 space-y-4">
              <p className="text-lg leading-relaxed text-ocean-800">
                {step.prompt}
              </p>
              {typeof step.fact.population === 'number' && (
                <p className="text-base font-bold text-ocean-900">
                  Population: about {formatPopulation(step.fact.population)} people
                </p>
              )}
              <p className="rounded-2xl bg-sea-200/40 px-4 py-3 text-sm font-semibold text-ocean-900">
                {step.fact.clue}
              </p>
              {step.fact.pin && (
                <AtlasMap
                  options={[step.fact]}
                  targetId={step.fact.id}
                  highlightId={step.fact.id}
                  interactive={false}
                  disabled
                  onSelect={() => undefined}
                />
              )}
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
                className="relative z-20 w-full rounded-2xl bg-[#0b3d4a] py-3.5 text-lg font-extrabold text-[#f3efe6]"
                style={{ touchAction: 'manipulation' }}
              >
                Got it — practice next
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
                      {choice}
                    </button>
                  )
                })}
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
