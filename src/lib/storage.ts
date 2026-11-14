import { FACTS, UNITS, factsForUnit } from '../data/curriculum'
import { newCard, type CardState } from './srs'

export type Explorer = {
  id: string
  name: string
  createdAt: number
  currentUnitId: string
  cards: Record<string, CardState>
  /** Fact ids introduced via Teach step */
  introduced: string[]
  /** Units marked complete for unlock progression */
  completedUnits: string[]
  sessionsCompleted: number
  totalCorrect: number
  totalAnswered: number
  lastSessionDate?: string
  gentleStreak: number
  trailCoins: number
}

export type AppState = {
  explorers: Explorer[]
  activeExplorerId: string | null
}

const KEY = 'atlas-daily-v1'

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { explorers: [], activeExplorerId: null }
    return JSON.parse(raw) as AppState
  } catch {
    return { explorers: [], activeExplorerId: null }
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function createExplorer(name: string): Explorer {
  const id = crypto.randomUUID()
  return {
    id,
    name: name.trim() || 'Explorer',
    createdAt: Date.now(),
    currentUnitId: UNITS[0].id,
    cards: {},
    introduced: [],
    completedUnits: [],
    sessionsCompleted: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    gentleStreak: 0,
    trailCoins: 0,
  }
}

export function ensureCard(explorer: Explorer, factId: string): CardState {
  if (!explorer.cards[factId]) {
    explorer.cards[factId] = newCard(factId)
  }
  return explorer.cards[factId]
}

export function unitProgress(explorer: Explorer, unitId: string) {
  const facts = factsForUnit(unitId)
  const introduced = facts.filter((f) => explorer.introduced.includes(f.id))
  const mastered = facts.filter((f) => explorer.cards[f.id]?.mastered)
  const strong = facts.filter(
    (f) => (explorer.cards[f.id]?.repetitions ?? 0) >= 3,
  )
  return {
    total: facts.length,
    introduced: introduced.length,
    mastered: mastered.length,
    strong: strong.length,
    pct: facts.length
      ? Math.round((strong.length / facts.length) * 100)
      : 0,
  }
}

export function isUnitUnlocked(explorer: Explorer, unitId: string): boolean {
  const unit = UNITS.find((u) => u.id === unitId)
  if (!unit) return false
  if (!unit.unlockAfter) return true
  if (explorer.completedUnits.includes(unit.unlockAfter)) return true
  // Also unlock if previous unit is mostly strong
  const prev = unitProgress(explorer, unit.unlockAfter)
  return prev.pct >= 70 && prev.introduced >= prev.total
}

export function maybeAdvanceUnit(explorer: Explorer): Explorer {
  const next = { ...explorer }
  const progress = unitProgress(next, next.currentUnitId)
  if (
    progress.introduced >= progress.total &&
    progress.pct >= 70 &&
    !next.completedUnits.includes(next.currentUnitId)
  ) {
    next.completedUnits = [...next.completedUnits, next.currentUnitId]
    const current = UNITS.find((u) => u.id === next.currentUnitId)
    const following = UNITS.find((u) => u.unlockAfter === next.currentUnitId)
    if (following && current) {
      next.currentUnitId = following.id
    }
  }
  return next
}

export function recordSessionComplete(explorer: Explorer): Explorer {
  const next = { ...explorer }
  const today = todayKey()
  if (next.lastSessionDate !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (next.lastSessionDate === todayKey(yesterday)) {
      next.gentleStreak += 1
    } else {
      next.gentleStreak = 1
    }
    next.lastSessionDate = today
  }
  next.sessionsCompleted += 1
  next.trailCoins += 5
  return maybeAdvanceUnit(next)
}

export function overallMastery(explorer: Explorer) {
  const total = FACTS.length
  const introduced = explorer.introduced.length
  const mastered = FACTS.filter((f) => explorer.cards[f.id]?.mastered).length
  const learning = FACTS.filter(
    (f) => explorer.introduced.includes(f.id) && !explorer.cards[f.id]?.mastered,
  ).length
  return { total, introduced, mastered, learning }
}
