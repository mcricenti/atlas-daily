import { factsForUnit, distractorsFor, type GeoFact } from '../data/curriculum'
import { ensureCard, type Explorer } from './storage'
import { isDue } from './srs'

export type StepKind =
  | 'teach'
  | 'guided'
  | 'map'
  | 'capital'
  | 'review'

export type LessonStep = {
  id: string
  kind: StepKind
  fact: GeoFact
  prompt: string
  /** Correct answer text */
  answer: string
  choices?: string[]
  /** For map steps: pin targets among unit facts */
  mapOptions?: GeoFact[]
  phaseLabel: string
}

const SESSION_TARGET = 12
const NEW_PER_DAY = 3
const MINUTES_HINT = 10

export function sessionMeta() {
  return { targetSteps: SESSION_TARGET, minutes: MINUTES_HINT, newPerDay: NEW_PER_DAY }
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function uniqueFacts(facts: GeoFact[]): GeoFact[] {
  const seen = new Set<string>()
  return facts.filter((f) => {
    if (seen.has(f.id)) return false
    seen.add(f.id)
    return true
  })
}

export function buildDailySession(explorer: Explorer): LessonStep[] {
  const unitFacts = factsForUnit(explorer.currentUnitId)
  const now = Date.now()

  const notIntroduced = unitFacts.filter(
    (f) => !explorer.introduced.includes(f.id),
  )
  const newFacts = notIntroduced.slice(0, NEW_PER_DAY)

  const due = unitFacts
    .filter((f) => explorer.introduced.includes(f.id))
    .filter((f) => {
      const card = ensureCard(explorer, f.id)
      return isDue(card, now)
    })

  const reviewPool = uniqueFacts([
    ...due,
    ...unitFacts.filter(
      (f) =>
        explorer.introduced.includes(f.id) &&
        !newFacts.some((n) => n.id === f.id),
    ),
  ])

  const steps: LessonStep[] = []

  // Direct instruction: Teach → Guided → You Do for each new fact
  for (const fact of newFacts) {
    steps.push(makeTeach(fact))
    steps.push(makeGuided(fact))
    if (fact.capital) {
      steps.push(makeCapital(fact))
    } else {
      steps.push(makeMap(fact, unitFacts))
    }
  }

  // Spaced review mix
  const reviewsNeeded = Math.max(0, SESSION_TARGET - steps.length)
  const reviewFacts = shuffle(reviewPool).slice(0, reviewsNeeded)

  for (const fact of reviewFacts) {
    const modes: Array<() => LessonStep> = []
    if (fact.capital) modes.push(() => makeCapital(fact))
    modes.push(() => makeMap(fact, unitFacts))
    modes.push(() => makeGuided(fact, true))
    const pick = modes[Math.floor(Math.random() * modes.length)]
    steps.push(pick())
  }

  // If brand-new explorer with empty unit progress and no review, pad with first facts teach
  if (steps.length === 0 && unitFacts.length) {
    const first = unitFacts.slice(0, NEW_PER_DAY)
    for (const fact of first) {
      steps.push(makeTeach(fact))
      steps.push(makeGuided(fact))
      if (fact.capital) steps.push(makeCapital(fact))
      else steps.push(makeMap(fact, unitFacts))
    }
  }

  return steps.slice(0, SESSION_TARGET + 2)
}

function makeTeach(fact: GeoFact): LessonStep {
  const detail = fact.capital
    ? `The capital of ${fact.name} is ${fact.capital}.`
    : `${fact.name} is a ${fact.kind} in ${fact.region}.`
  return {
    id: `teach-${fact.id}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'teach',
    fact,
    prompt: detail,
    answer: fact.name,
    phaseLabel: 'I Do — Learn',
  }
}

function makeGuided(fact: GeoFact, isReview = false): LessonStep {
  const choices = shuffle([
    fact.name,
    ...distractorsFor(fact, 'name', 3),
  ])
  return {
    id: `guided-${fact.id}-${Math.random().toString(36).slice(2, 7)}`,
    kind: isReview ? 'review' : 'guided',
    fact,
    prompt: fact.clue,
    answer: fact.name,
    choices,
    phaseLabel: isReview ? 'Review' : 'We Do — Practice',
  }
}

function makeCapital(fact: GeoFact): LessonStep {
  const answer = fact.capital!
  const choices = shuffle([answer, ...distractorsFor(fact, 'capital', 3)])
  return {
    id: `cap-${fact.id}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'capital',
    fact,
    prompt: `What is the capital of ${fact.name}?`,
    answer,
    choices,
    phaseLabel: 'You Do — Capital',
  }
}

function makeMap(fact: GeoFact, unitFacts: GeoFact[]): LessonStep {
  const withPins = unitFacts.filter((f) => f.pin)
  const options = shuffle(
    uniqueFacts([
      fact,
      ...withPins.filter((f) => f.id !== fact.id),
    ]),
  ).slice(0, Math.min(6, Math.max(4, withPins.length)))

  if (!options.find((o) => o.id === fact.id)) {
    options[0] = fact
  }

  return {
    id: `map-${fact.id}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'map',
    fact,
    prompt: `Tap ${fact.name} on the map`,
    answer: fact.name,
    mapOptions: shuffle(options),
    phaseLabel: 'You Do — Locate',
  }
}
