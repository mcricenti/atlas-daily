import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FACTS, type GeoFact } from '../../data/curriculum'
import {
  capitalChoicesFor,
  centerFor,
  choicesFor,
  describeTap,
  kindHint,
  mapKindFor,
  qTypesFor,
  questionText,
  tapFinds,
  theName,
  viewFor,
  type Deck,
  type GameMode,
  type GameResult,
  type Tap,
} from '../../lib/mapGames'
import { loadVoicePref, speak } from '../../lib/narrator'
import { GameMap, MapLoading, type MarkedFact } from './GameMap'
import { COLORS, useAtlas } from './gameKit'
import { PlaceReveal } from './PlaceReveal'

type Phase = 'ask' | 'retry' | 'right' | 'reveal'

export type QuizMode = Extract<GameMode, 'find' | 'name' | 'capitals' | 'blank'>

/**
 * A round of map questions: Find it!, What's this?, Capitals, or the expert blank map.
 * Also used for the grown-up challenge and the daily-lesson map bonus.
 */
export function QuizRound({
  mode,
  deck,
  facts,
  player,
  exitLabel = '← Games',
  onExit,
  onFinish,
}: {
  mode: QuizMode
  deck: Deck
  facts: GeoFact[]
  /** Whose turn, shown at the top ("Grown-up's turn") */
  player?: string
  exitLabel?: string
  onExit?: () => void
  onFinish: (results: GameResult[]) => void
}) {
  const [qtypes] = useState(() => qTypesFor(mode, facts.length))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [results, setResults] = useState<GameResult[]>([])
  const [message, setMessage] = useState('')
  const [wrongTap, setWrongTap] = useState<[number, number] | null>(null)
  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const [hintJitter, setHintJitter] = useState<[number, number]>([0, 0])

  const fact = facts[idx]
  const q = qtypes[idx]
  const tapping = q === 'find' || q === 'capital-find'
  const blank = mode === 'blank'
  const atlas = useAtlas(mapKindFor(fact), centerFor(fact))
  const camera = useMemo(() => (atlas ? viewFor(atlas, fact, q) : null), [atlas, fact, q])
  const choices = useMemo(
    () => (q === 'name' ? choicesFor(fact, deck) : q === 'capital-name' ? capitalChoicesFor(fact, deck) : []),
    [fact, deck, q],
  )
  const answer = q === 'capital-name' ? fact.capital! : fact.name

  useEffect(() => {
    if (!loadVoicePref()) return
    return speak(questionText(q, fact), () => undefined)
  }, [fact, q])

  const answered = phase === 'right' || phase === 'reveal'

  function capitalLine(f: GeoFact) {
    return f.capital ? ` Its capital is ${f.capital}.` : ''
  }

  function finish(stars: number, text: string) {
    setResults((r) => [...r, { fact, stars }])
    setMessage(text)
    setPhase(stars > 0 ? 'right' : 'reveal')
  }

  function next() {
    if (idx + 1 >= facts.length) {
      onFinish(results)
      return
    }
    setIdx((i) => i + 1)
    setPhase('ask')
    setMessage('')
    setWrongTap(null)
    setWrongPick(null)
  }

  function onTap(tap: Tap) {
    if (!atlas || answered) return
    if (tapFinds(atlas, fact, tap)) {
      setWrongTap(null)
      finish(phase === 'ask' ? 2 : 1, `Yes! That’s ${theName(fact)}.${capitalLine(fact)}`)
      return
    }
    const what = describeTap(atlas, fact, tap)
    setWrongTap(tap.p)
    if (phase === 'ask' && !blank) {
      setHintJitter([Math.random() - 0.5, Math.random() - 0.5])
      setMessage(`${what ? `That’s ${what}. ` : 'Not quite. '}Try again — look inside the circle!`)
      setPhase('retry')
    } else {
      finish(0, `${what ? `That’s ${what}. ` : ''}Here’s ${theName(fact)}!${capitalLine(fact)}`)
    }
  }

  function onPick(name: string) {
    if (phase !== 'ask') return
    if (name === answer) {
      finish(
        2,
        q === 'capital-name'
          ? `Yes! ${fact.capital} is the capital of ${theName(fact)}.`
          : `Yes! It’s ${theName(fact)}.${capitalLine(fact)}`,
      )
    } else {
      setWrongPick(name)
      finish(
        0,
        q === 'capital-name'
          ? `The capital of ${theName(fact)} is ${fact.capital}.`
          : `It’s ${theName(fact)}.${capitalLine(fact)}`,
      )
    }
  }

  // The wrong pick in "What's this?" is shown in red on the map too.
  const wrongFact =
    q === 'name' && wrongPick ? FACTS.find((f) => f.name === wrongPick && f.kind === fact.kind) : undefined
  const highlights: MarkedFact[] = []
  if (!tapping || answered) {
    highlights.push({ fact, color: phase === 'right' ? COLORS.right : COLORS.target, pulse: true })
  }
  if (wrongFact && answered) highlights.push({ fact: wrongFact, color: COLORS.wrong, pulse: false })
  const starsSoFar = results.reduce((s, r) => s + r.stars, 0)

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
          >
            {exitLabel}
          </button>
        ) : (
          <span />
        )}
        {player && (
          <span className="rounded-full bg-coral px-3 py-1 text-sm font-extrabold text-white">{player}</span>
        )}
        <div className="flex items-center gap-3 text-sm font-extrabold text-ocean-900">
          <span>
            {idx + 1} / {facts.length}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1">⭐ {starsSoFar}</span>
        </div>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/60">
        <div className="h-full rounded-full bg-sea-300 transition-all" style={{ width: `${(idx / facts.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${fact.id}-${idx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-3 rounded-3xl bg-white/90 px-5 py-4 text-center shadow-sm"
        >
          <h1 className="font-display text-2xl text-ocean-950 sm:text-4xl">{questionText(q, fact)}</h1>
          {q === 'find' && kindHint(fact) && <p className="mt-1 text-sm font-bold text-ocean-700">{kindHint(fact)}</p>}
          {blank && <p className="mt-1 text-xs font-extrabold uppercase tracking-widest text-coral">Expert map · one try</p>}
        </motion.div>
      </AnimatePresence>

      {atlas && camera ? (
        <GameMap
          atlas={atlas}
          camera={camera}
          onTap={tapping && !answered ? onTap : undefined}
          highlights={highlights}
          hint={phase === 'retry' && fact.kind !== 'continent' ? { fact, jitter: hintJitter } : null}
          wrongTap={wrongTap}
          dots={!blank}
        />
      ) : (
        <MapLoading />
      )}

      {phase === 'retry' && (
        <p className="mt-3 rounded-2xl bg-amber/25 px-4 py-3 text-center text-lg font-extrabold text-ocean-950">
          {message}
        </p>
      )}

      {!tapping && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {choices.map((c) => {
            const isAnswer = answered && c === answer
            const isWrong = answered && c === wrongPick
            return (
              <button
                key={c}
                type="button"
                disabled={answered}
                onClick={() => onPick(c)}
                className={`rounded-2xl border-4 px-3 py-4 text-lg font-extrabold transition ${
                  isAnswer
                    ? 'border-[#2f9e6e] bg-[#2f9e6e] text-white'
                    : isWrong
                      ? 'border-coral bg-coral/15 text-ocean-950'
                      : 'border-transparent bg-white/90 text-ocean-950 shadow-sm hover:bg-white disabled:opacity-60'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      )}

      {answered && (
        <div className="mt-3">
          <PlaceReveal
            key={`${fact.id}-${idx}`}
            fact={fact}
            tone={phase === 'right' ? 'right' : 'wrong'}
            message={message + (wrongFact ? ` ${wrongFact.name} is the red one.` : '')}
            onNext={next}
            nextLabel={idx + 1 >= facts.length ? 'See my stars' : 'Next'}
          />
        </div>
      )}
    </div>
  )
}
