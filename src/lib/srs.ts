/** SM-2 inspired spaced repetition for geography facts. */

export type CardState = {
  factId: string
  /** Ease factor (min 1.3) */
  ease: number
  /** Interval in days */
  interval: number
  repetitions: number
  dueAt: number
  /** Consecutive correct in a row across sessions */
  streak: number
  lapses: number
  introducedAt?: number
  mastered: boolean
}

export type Grade = 0 | 1 | 2 | 3
/** 0 = miss, 1 = hard, 2 = good, 3 = easy */

const DAY = 24 * 60 * 60 * 1000

export function newCard(factId: string, now = Date.now()): CardState {
  return {
    factId,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    dueAt: now,
    streak: 0,
    lapses: 0,
    mastered: false,
  }
}

export function isDue(card: CardState, now = Date.now()): boolean {
  return card.dueAt <= now
}

export function reviewCard(
  card: CardState,
  grade: Grade,
  now = Date.now(),
): CardState {
  const next = { ...card }

  if (grade === 0) {
    next.repetitions = 0
    next.interval = 0
    next.dueAt = now + 10 * 60 * 1000 // re-ask later today
    next.streak = 0
    next.lapses += 1
    next.ease = Math.max(1.3, next.ease - 0.2)
    next.mastered = false
    return next
  }

  if (next.repetitions === 0) {
    next.interval = grade === 1 ? 0.25 : grade === 2 ? 1 : 2
  } else if (next.repetitions === 1) {
    next.interval = grade === 1 ? 1 : grade === 2 ? 3 : 5
  } else {
    const mult = grade === 1 ? 1.2 : grade === 2 ? next.ease : next.ease * 1.3
    next.interval = Math.max(1, Math.round(next.interval * mult * 10) / 10)
  }

  next.repetitions += 1
  next.streak += 1
  next.ease =
    grade === 1
      ? Math.max(1.3, next.ease - 0.15)
      : grade === 3
        ? next.ease + 0.1
        : next.ease
  next.dueAt = now + next.interval * DAY
  next.mastered = next.repetitions >= 4 && next.interval >= 14 && next.streak >= 3
  return next
}

export function masteryLabel(card: CardState | undefined): string {
  if (!card || !card.introducedAt) return 'New'
  if (card.mastered) return 'Mastered'
  if (card.repetitions >= 3) return 'Strong'
  if (card.repetitions >= 1) return 'Learning'
  return 'Introduced'
}
