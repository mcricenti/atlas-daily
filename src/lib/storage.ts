import { FACTS, UNITS, factsForUnit } from '../data/curriculum'
import { CAPITAL_COORDS } from '../data/geo/capitalCoords'
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
  /** Units where the child finished the drag placement gate */
  placementClearedUnits: string[]
  sessionsCompleted: number
  totalCorrect: number
  totalAnswered: number
  lastSessionDate?: string
  gentleStreak: number
  trailCoins: number
  /** Every answer, newest last (capped), for the grown-ups page */
  log: AnswerLog[]
  /** Weekly challenge results */
  bosses: BossResult[]
}

export type AnswerLog = { t: number; f: string; ok: boolean; q: string }
export type BossResult = { t: number; correct: number; total: number }

const LOG_CAP = 5000

export type AppState = {
  explorers: Explorer[]
  activeExplorerId: string | null
}

const KEY = 'atlas-daily-v1'

/** Local calendar date (not UTC), so evening lessons count for the right day. */
export function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { explorers: [], activeExplorerId: null }
    const parsed = JSON.parse(raw) as AppState
    parsed.explorers = (parsed.explorers ?? []).map((e) => ({
      ...e,
      placementClearedUnits: e.placementClearedUnits ?? [],
      completedUnits: e.completedUnits ?? [],
      introduced: e.introduced ?? [],
      cards: e.cards ?? {},
      log: e.log ?? [],
      bosses: e.bosses ?? [],
    }))
    return parsed
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
    placementClearedUnits: [],
    sessionsCompleted: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    gentleStreak: 0,
    trailCoins: 0,
    log: [],
    bosses: [],
  }
}

export function logAnswer(explorer: Explorer, entry: AnswerLog): AnswerLog[] {
  const log = [...(explorer.log ?? []), entry]
  return log.length > LOG_CAP ? log.slice(log.length - LOG_CAP) : log
}

const BOSS_GAP_DAYS = 6
const BOSS_MIN_LEARNED = 10

/** The weekly challenge opens once enough places are learned, about once a week. */
export function bossAvailable(explorer: Explorer, now = Date.now()): boolean {
  if (explorer.introduced.length < BOSS_MIN_LEARNED) return false
  const last = explorer.bosses?.[explorer.bosses.length - 1]
  if (!last) return true
  return now - last.t >= BOSS_GAP_DAYS * 24 * 60 * 60 * 1000
}

export function daysUntilBoss(explorer: Explorer, now = Date.now()): number {
  const last = explorer.bosses?.[explorer.bosses.length - 1]
  if (!last) return 0
  return Math.max(0, Math.ceil((last.t + BOSS_GAP_DAYS * 864e5 - now) / 864e5))
}

export type Trophy = 'gold' | 'silver' | 'bronze' | null

export function trophyFor(correct: number, total: number): Trophy {
  const pct = total ? correct / total : 0
  if (pct >= 0.9) return 'gold'
  if (pct >= 0.75) return 'silver'
  if (pct >= 0.5) return 'bronze'
  return null
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

export function unitNeedsPlacementGate(unitId: string) {
  return factsForUnit(unitId).some(
    (f) => f.kind === 'state' && Boolean(f.capital) && Boolean(CAPITAL_COORDS[f.id]),
  )
}

export function unitReadyForPlacement(explorer: Explorer, unitId?: string) {
  const id = unitId ?? explorer.currentUnitId
  if (!unitNeedsPlacementGate(id)) return false
  const progress = unitProgress(explorer, id)
  const cleared = explorer.placementClearedUnits?.includes(id)
  return (
    progress.introduced >= progress.total &&
    progress.pct >= 70 &&
    !cleared &&
    !explorer.completedUnits.includes(id)
  )
}

export function markPlacementCleared(
  explorer: Explorer,
  unitId: string,
): Explorer {
  const next = {
    ...explorer,
    placementClearedUnits: [
      ...new Set([...(explorer.placementClearedUnits ?? []), unitId]),
    ],
    completedUnits: [...explorer.completedUnits],
  }
  if (!next.completedUnits.includes(unitId)) {
    next.completedUnits = [...next.completedUnits, unitId]
  }
  const following = UNITS.find((u) => u.unlockAfter === unitId)
  if (following) {
    next.currentUnitId = following.id
  }
  next.trailCoins += 10
  return next
}

export function maybeAdvanceUnit(explorer: Explorer): Explorer {
  const next = {
    ...explorer,
    placementClearedUnits: [...(explorer.placementClearedUnits ?? [])],
  }
  const progress = unitProgress(next, next.currentUnitId)
  const needsGate = unitNeedsPlacementGate(next.currentUnitId)
  const gateOk =
    !needsGate || next.placementClearedUnits.includes(next.currentUnitId)
  if (
    progress.introduced >= progress.total &&
    progress.pct >= 70 &&
    gateOk &&
    !next.completedUnits.includes(next.currentUnitId)
  ) {
    next.completedUnits = [...next.completedUnits, next.currentUnitId]
    const following = UNITS.find((u) => u.unlockAfter === next.currentUnitId)
    if (following) {
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
