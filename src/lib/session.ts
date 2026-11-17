import { FACTS, factsForUnit, distractorsFor, type GeoFact } from '../data/curriculum'
import { ISO2 } from '../data/flags'
import { GEO_FACTS } from '../data/geo/geoFacts'
import { ensureCard, type Explorer } from './storage'
import { isDue, type CardState } from './srs'

/**
 * Question types, from easiest to hardest.
 * Which ones a place gets depends on how well it is known (see `tierFor`).
 */
export type QuestionKind =
  | 'name' // clue → pick the place
  | 'capital' // place → pick its capital
  | 'reverse' // capital → pick the place
  | 'map' // tap the place on a labelled map
  | 'flag' // flag → pick the country
  | 'neighbor' // which of these shares a border with it?
  | 'bigger' // which of two places is bigger?
  | 'type' // type the capital from memory
  | 'blankmap' // tap the place on a map with no names

export type StepKind = 'teach' | QuestionKind

export type LessonStep = {
  id: string
  kind: StepKind
  fact: GeoFact
  prompt: string
  /** Correct answer text */
  answer: string
  choices?: string[]
  /** For map steps: the places that can be tapped */
  mapOptions?: GeoFact[]
  phaseLabel: string
  /** Shown after answering, to teach something whether right or wrong */
  explain?: string
  /** A second try at a place missed earlier in the same lesson */
  retry?: boolean
  /** True for places learned in an earlier unit */
  fromEarlierUnit?: boolean
}

const MINUTES_HINT = 10
const MAX_NEW = 3
const MAX_REVIEWS = 18
const MIN_REVIEWS = 4
const DAY = 24 * 60 * 60 * 1000

export function sessionMeta() {
  return { minutes: MINUTES_HINT, newPerDay: MAX_NEW }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uid(prefix: string, fact: GeoFact) {
  return `${prefix}-${fact.id}-${Math.random().toString(36).slice(2, 7)}`
}

/** 1 = just learned, 2 = getting there, 3 = knows it well. */
export function tierFor(card: CardState | undefined): 1 | 2 | 3 {
  const reps = card?.repetitions ?? 0
  if (reps <= 1) return 1
  if (reps <= 3) return 2
  return 3
}

const TIER_LABEL = ['', 'Review', 'Review · Level 2', 'Review · Level 3']

function neighborFacts(fact: GeoFact): GeoFact[] {
  return (GEO_FACTS[fact.id]?.neighbors ?? [])
    .map((id) => FACTS.find((f) => f.id === id))
    .filter(Boolean) as GeoFact[]
}

/** Which question types suit this place at this level. */
export function modesFor(fact: GeoFact, tier: 1 | 2 | 3): QuestionKind[] {
  const hasCapital = Boolean(fact.capital)
  const hasFlag = Boolean(ISO2[fact.id])
  const hasNeighbors = neighborFacts(fact).length > 0
  const hasArea = Boolean(GEO_FACTS[fact.id]?.areaSqMi)
  const modes: QuestionKind[] = []
  if (tier === 1) {
    modes.push('name')
    if (hasCapital) modes.push('capital')
    modes.push('map')
  } else if (tier === 2) {
    modes.push('map')
    if (hasCapital) modes.push('reverse', 'capital')
    if (hasFlag) modes.push('flag')
    if (hasNeighbors) modes.push('neighbor')
    if (!hasCapital) modes.push('name')
  } else {
    modes.push('blankmap')
    if (hasCapital) modes.push('type', 'type')
    if (hasFlag) modes.push('flag')
    if (hasNeighbors) modes.push('neighbor')
    if (hasArea) modes.push('bigger')
  }
  return modes
}

// ── Question builders ────────────────────────────────────────────

function makeTeach(fact: GeoFact): LessonStep {
  return {
    id: uid('teach', fact),
    kind: 'teach',
    fact,
    prompt: fact.name,
    answer: fact.name,
    phaseLabel: 'New place — watch the tour',
  }
}

export function makeQuestion(
  fact: GeoFact,
  kind: QuestionKind,
  phaseLabel: string,
): LessonStep {
  const base = { id: uid(kind, fact), kind, fact, phaseLabel }
  const sizeWord = (f: GeoFact) => (f.kind === 'state' ? 'state' : 'country')

  switch (kind) {
    case 'name':
      return {
        ...base,
        prompt: fact.clue,
        answer: fact.name,
        choices: shuffle([fact.name, ...distractorsFor(fact, 'name', 3)]),
      }
    case 'capital':
      return {
        ...base,
        prompt: `What is the capital of ${fact.name}?`,
        answer: fact.capital!,
        choices: shuffle([fact.capital!, ...distractorsFor(fact, 'capital', 3)]),
      }
    case 'reverse':
      return {
        ...base,
        prompt: `${fact.capital} is the capital of which ${sizeWord(fact)}?`,
        answer: fact.name,
        choices: shuffle([fact.name, ...distractorsFor(fact, 'name', 3)]),
      }
    case 'type':
      return {
        ...base,
        prompt: `Type the capital of ${fact.name}`,
        answer: fact.capital!,
      }
    case 'flag':
      return {
        ...base,
        prompt: 'Which country has this flag?',
        answer: fact.name,
        choices: shuffle([fact.name, ...distractorsFor(fact, 'name', 3)]),
      }
    case 'neighbor': {
      const near = neighborFacts(fact)
      const answer = pick(near)
      const nearIds = new Set(near.map((f) => f.id))
      const pool = shuffle(
        FACTS.filter(
          (f) =>
            f.kind === fact.kind &&
            f.id !== fact.id &&
            !nearIds.has(f.id) &&
            (f.region === fact.region || f.unitId === fact.unitId),
        ),
      )
      const names = GEO_FACTS[fact.id]?.borderNames ?? near.map((f) => f.name)
      return {
        ...base,
        prompt: `Which of these shares a border with ${fact.name}?`,
        answer: answer.name,
        choices: shuffle([answer.name, ...pool.slice(0, 3).map((f) => f.name)]),
        explain: `${fact.name} borders ${listNames(names)}.`,
      }
    }
    case 'bigger': {
      const mine = GEO_FACTS[fact.id].areaSqMi
      const others = FACTS.filter((f) => {
        const a = GEO_FACTS[f.id]?.areaSqMi
        if (!a || f.id === fact.id || f.kind !== fact.kind) return false
        const ratio = Math.max(a, mine) / Math.min(a, mine)
        return ratio >= 1.5 && ratio <= 12
      })
      const sameRegion = others.filter((f) => f.region === fact.region)
      const other = pick(sameRegion.length ? sameRegion : others) ?? fact
      const theirs = GEO_FACTS[other.id]?.areaSqMi ?? mine
      const [big, small] = mine >= theirs ? [fact, other] : [other, fact]
      const ratio = Math.max(mine, theirs) / Math.min(mine, theirs)
      return {
        ...base,
        prompt: 'Which one is bigger?',
        answer: big.name,
        choices: shuffle([fact.name, other.name]),
        explain: `${big.name} is about ${timesWord(ratio)} as big as ${small.name}.`,
      }
    }
    case 'map':
    case 'blankmap': {
      const own = factsForUnit(fact.unitId).filter((f) => f.id !== fact.id)
      const options = shuffle([fact, ...shuffle(own).slice(0, 5)])
      return {
        ...base,
        prompt:
          kind === 'blankmap'
            ? `No names this time! Tap ${fact.name}`
            : `Tap ${fact.name} on the map`,
        answer: fact.name,
        mapOptions: options,
      }
    }
  }
}

function timesWord(ratio: number) {
  if (ratio < 1.75) return 'one and a half times'
  const n = Math.round(ratio)
  const words = ['', '', 'twice', 'three times', 'four times', 'five times', 'six times']
  return words[n] ?? `${n} times`
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/** A question about a place someone has already met, at the right difficulty. */
export function makeReview(explorer: Explorer, fact: GeoFact, minTier: 1 | 2 | 3 = 1): LessonStep {
  const tier = Math.max(minTier, tierFor(explorer.cards[fact.id])) as 1 | 2 | 3
  const step = makeQuestion(fact, pick(modesFor(fact, tier)), TIER_LABEL[tier])
  step.fromEarlierUnit = fact.unitId !== explorer.currentUnitId
  return step
}

/** An easy second try at a place missed earlier in the lesson. */
export function makeRetry(fact: GeoFact, missed: QuestionKind): LessonStep {
  const options = modesFor(fact, 1).filter((m) => m !== missed)
  const step = makeQuestion(fact, pick(options.length ? options : modesFor(fact, 1)), 'Try again')
  step.retry = true
  return step
}

// ── Sessions ─────────────────────────────────────────────────────

/** Most overdue first, compared to how long the gap was meant to be. */
function overdueScore(card: CardState, now: number) {
  return (now - card.dueAt) / (Math.max(card.interval, 0.25) * DAY)
}

export function dueFacts(explorer: Explorer, now = Date.now()): GeoFact[] {
  // Shuffle first so places that are equally overdue come up in a mixed order.
  return shuffle(FACTS.filter((f) => explorer.introduced.includes(f.id)))
    .filter((f) => isDue(ensureCard(explorer, f.id), now))
    .sort(
      (a, b) =>
        overdueScore(explorer.cards[b.id], now) - overdueScore(explorer.cards[a.id], now),
    )
}

export function buildDailySession(explorer: Explorer): LessonStep[] {
  const now = Date.now()
  const due = dueFacts(explorer, now)

  // Fewer new places on days with lots to review, so lessons stay ~10 minutes.
  const newCount =
    due.length >= 25 ? 0 : due.length >= 15 ? 1 : due.length >= 8 ? 2 : MAX_NEW
  const newFacts = factsForUnit(explorer.currentUnitId)
    .filter((f) => !explorer.introduced.includes(f.id))
    .slice(0, newCount)

  let reviewFacts = due.slice(0, MAX_REVIEWS)
  if (reviewFacts.length < MIN_REVIEWS) {
    const extra = shuffle(
      FACTS.filter(
        (f) =>
          explorer.introduced.includes(f.id) &&
          !reviewFacts.some((r) => r.id === f.id) &&
          f.unitId === explorer.currentUnitId,
      ),
    )
    reviewFacts = [...reviewFacts, ...extra].slice(0, MIN_REVIEWS)
  }

  const reviews = shuffle(reviewFacts.map((f) => makeReview(explorer, f)))
  const blocks = newFacts.map((fact) => [
    makeTeach(fact),
    { ...makeQuestion(fact, 'name', 'Practice'), explain: fact.capital ? `Its capital is ${fact.capital}.` : undefined },
    makeQuestion(fact, fact.capital ? 'capital' : 'map', 'Practice'),
  ])

  // Warm up with a couple of reviews, then mix new places in between reviews.
  const steps: LessonStep[] = reviews.splice(0, 2)
  for (const block of blocks) {
    steps.push(...block, ...reviews.splice(0, 3))
  }
  steps.push(...reviews)
  return steps
}

/** Weekly challenge: a mixed, harder quiz across everything learned so far. */
export function buildBossSession(explorer: Explorer, count = 15): LessonStep[] {
  const learned = FACTS.filter((f) => explorer.introduced.includes(f.id))
  // Favour places that have been missed before or are less practised.
  const weighted = learned
    .map((f) => {
      const c = explorer.cards[f.id]
      const weight = (1 + (c?.lapses ?? 0)) / (1 + Math.min(c?.repetitions ?? 0, 6) * 0.4)
      return { f, key: Math.random() ** (1 / weight) }
    })
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((x) => x.f)
  return shuffle(weighted).map((f) => {
    const step = makeReview(explorer, f, 2)
    step.phaseLabel = 'Weekly challenge'
    return step
  })
}

/** Questions for head-to-head play (no typing, so turns stay quick). */
export function makeDuelQuestion(pool: GeoFact[], used: Set<string>): LessonStep {
  const fresh = pool.filter((f) => !used.has(f.id))
  const fact = pick(fresh.length ? fresh : pool)
  used.add(fact.id)
  const modes = [...modesFor(fact, 1), ...modesFor(fact, 2)].filter(
    (m) => m !== 'type' && m !== 'blankmap',
  )
  return makeQuestion(fact, pick(modes), 'Head-to-head')
}
