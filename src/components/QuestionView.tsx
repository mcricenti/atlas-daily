import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flagUrl } from '../data/flags'
import { MEMORY_HOOKS } from '../data/memoryHooks'
import { checkTyped } from '../lib/answers'
import type { LessonStep } from '../lib/session'
import { AtlasMap } from './AtlasMap'

const CHEERS = ['Yes!', 'You got it!', 'Nice work!', 'Exactly right!', 'Great memory!']

type Props = {
  step: LessonStep
  /** Called once, the moment the question is answered */
  onAnswer: (correct: boolean) => void
  /** Called when it is time to move on */
  onNext: () => void
  /** Number used to vary the cheer */
  cheerIndex?: number
}

type Feedback = 'correct' | 'close' | 'wrong' | null

function Tap({
  onTap,
  disabled,
  className,
  children,
}: {
  onTap: () => void
  disabled?: boolean
  className: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault()
        if (!disabled) onTap()
      }}
      className={className}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </button>
  )
}

export function QuestionView({ step, onAnswer, onNext, cheerIndex = 0 }: Props) {
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const nextRef = useRef(onNext)
  useEffect(() => {
    nextRef.current = onNext
  })

  const isMap = step.kind === 'map' || step.kind === 'blankmap'
  const capitalQuestion =
    step.kind === 'capital' || step.kind === 'type' || step.kind === 'reverse'
  const hook = capitalQuestion ? MEMORY_HOOKS[step.fact.id] : undefined

  useEffect(() => {
    if (step.kind === 'type') inputRef.current?.focus()
  }, [step.kind])

  // Right answers move on by themselves; misses wait so there is time to read.
  useEffect(() => {
    if (feedback !== 'correct' && feedback !== 'close') return
    const t = window.setTimeout(
      () => nextRef.current(),
      step.explain || feedback === 'close' ? 2600 : 1200,
    )
    return () => window.clearTimeout(t)
  }, [feedback, step.explain])

  function answer(correct: boolean, close = false) {
    if (feedback) return
    setFeedback(correct ? (close ? 'close' : 'correct') : 'wrong')
    onAnswer(correct)
  }

  function submitTyped() {
    if (feedback || !typed.trim()) return
    const result = checkTyped(typed, step.answer)
    answer(result !== 'wrong', result === 'close')
  }

  const right = feedback === 'correct' || feedback === 'close'
  const flag = step.kind === 'flag' ? flagUrl(step.fact.id) : null

  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ocean-700">
        {step.phaseLabel}
      </p>
      <h2 className="mt-2 font-display text-2xl text-ocean-950 sm:text-3xl">
        {step.prompt}
      </h2>

      {flag && (
        <img
          src={flag}
          alt="A country's flag"
          className="mx-auto mt-5 h-36 w-auto rounded-lg border border-ocean-900/15 shadow-md sm:h-44"
        />
      )}

      {step.choices && step.kind === 'bigger' && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {step.choices.map((choice) => {
            const isRight = choice === step.answer
            const picked = selectedChoice === choice
            return (
              <Tap
                key={choice}
                disabled={Boolean(feedback)}
                onTap={() => {
                  setSelectedChoice(choice)
                  answer(isRight)
                }}
                className={`flex min-h-28 items-center justify-center rounded-3xl border-4 px-3 py-6 text-center text-xl font-extrabold transition sm:text-2xl ${
                  feedback && isRight
                    ? 'border-sea-300 bg-sea-200/60'
                    : feedback === 'wrong' && picked
                      ? 'border-coral bg-coral/15'
                      : 'border-ocean-900/10 bg-sand-100 hover:border-ocean-700/40'
                }`}
              >
                {choice}
              </Tap>
            )
          })}
        </div>
      )}

      {step.choices && step.kind !== 'bigger' && (
        <div className="mt-6 grid gap-3">
          {step.kind === 'name' && step.explain && !feedback && (
            <p className="text-sm font-semibold text-ocean-700">{step.explain}</p>
          )}
          {step.choices.map((choice) => {
            const isRight = choice === step.answer
            const picked = selectedChoice === choice
            const showCorrect = feedback && isRight
            const showWrong = feedback === 'wrong' && picked && !isRight
            return (
              <Tap
                key={choice}
                disabled={Boolean(feedback)}
                onTap={() => {
                  setSelectedChoice(choice)
                  answer(isRight)
                }}
                className={`rounded-2xl border-2 px-4 py-3.5 text-left text-base font-bold transition sm:text-lg ${
                  showCorrect
                    ? 'border-sea-300 bg-sea-200/60 text-ocean-950'
                    : showWrong
                      ? 'border-coral bg-coral/15 text-ocean-950'
                      : 'border-ocean-900/10 bg-sand-100 hover:border-ocean-700/40'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  {choice}
                  {showCorrect && <Mark ok />}
                  {showWrong && <Mark />}
                </span>
              </Tap>
            )
          })}
        </div>
      )}

      {step.kind === 'type' && (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            submitTyped()
          }}
        >
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={Boolean(feedback)}
            placeholder="Type the city…"
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            className={`w-full rounded-2xl border-4 bg-sand-100 px-4 py-3.5 text-xl font-bold text-ocean-950 outline-none ${
              right ? 'border-sea-300' : feedback === 'wrong' ? 'border-coral' : 'border-ocean-900/10 focus:border-sea-300'
            }`}
          />
          {!feedback && (
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={!typed.trim()}
                className="flex-1 rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100 disabled:opacity-40"
              >
                Check
              </button>
              <button
                type="button"
                onClick={() => answer(false)}
                className="rounded-2xl bg-ocean-900/10 px-4 py-3.5 text-sm font-bold text-ocean-900"
              >
                I don’t know
              </button>
            </div>
          )}
        </form>
      )}

      {isMap && step.mapOptions && (
        <div className="mt-5">
          <AtlasMap
            options={step.mapOptions}
            targetId={step.fact.id}
            disabled={Boolean(feedback)}
            onSelect={(f) => {
              setSelectedId(f.id)
              answer(f.id === step.fact.id)
            }}
            feedback={feedback ? (right ? 'correct' : 'wrong') : null}
            selectedId={selectedId}
            large
            labelMode={step.kind === 'blankmap' ? 'none' : 'options'}
            focusNames={step.mapOptions.map((f) => f.name)}
          />
        </div>
      )}

      <div className="mt-4 min-h-[1.75rem]" aria-live="polite">
        {right && (
          <div className="animate-pop text-center">
            <p className="text-lg font-extrabold text-moss">
              {feedback === 'close'
                ? `Close enough! It’s spelled ${step.answer}.`
                : `${CHEERS[cheerIndex % CHEERS.length]} ${correctLine(step)}`}
            </p>
            {step.explain && (
              <p className="mt-1 font-semibold text-ocean-800">{step.explain}</p>
            )}
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="animate-pop rounded-2xl bg-coral/10 px-4 py-3 text-center">
            <p className="text-lg font-extrabold text-coral">{wrongLine(step)}</p>
            {step.explain && (
              <p className="mt-1 font-semibold text-ocean-800">{step.explain}</p>
            )}
            {hook && (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-ocean-900">
                🧠 Memory trick: {hook}
              </p>
            )}
            <button
              type="button"
              onClick={onNext}
              className="mt-3 w-full rounded-2xl bg-ocean-900 py-3 text-lg font-extrabold text-sand-100"
              autoFocus
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function correctLine(step: LessonStep) {
  switch (step.kind) {
    case 'capital':
    case 'type':
      return `${step.answer} is the capital of ${step.fact.name}.`
    case 'reverse':
      return `${step.fact.capital} is the capital of ${step.fact.name}.`
    case 'flag':
      return `That’s the flag of ${step.fact.name}.`
    case 'neighbor':
    case 'bigger':
      return ''
    default:
      return `That’s ${step.fact.name}.`
  }
}

function wrongLine(step: LessonStep) {
  switch (step.kind) {
    case 'capital':
    case 'type':
      return `The capital of ${step.fact.name} is ${step.answer}.`
    case 'reverse':
      return `${step.fact.capital} is the capital of ${step.fact.name}.`
    case 'flag':
      return `That was the flag of ${step.fact.name}.`
    case 'map':
    case 'blankmap':
      return `Not quite. ${step.fact.name} is the one marked on the map.`
    case 'neighbor':
      return `Not quite. The answer is ${step.answer}.`
    case 'bigger':
      return `Not quite. ${step.answer} is bigger.`
    default:
      return `Not quite. The answer is ${step.answer}.`
  }
}

function Mark({ ok = false }: { ok?: boolean }) {
  return ok ? (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#2f6f4e" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#e07a5f" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
