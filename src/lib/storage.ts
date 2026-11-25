import { FACTS, UNITS, factsForUnit } from '../data/curriculum'
import { newCard, type CardState } from './srs'

export type VisitedPin = {
  status: 'visited' | 'wishlist'
  note?: string
}

export type DuelRecord = {
  t: number
  mode: 'duel' | 'grownup' | 'coop'
  p1: string
  p2: string
  s1: number
  s2: number
  total: number
}

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
  /** Map games: best score (percent) or best time (seconds) per game and map, e.g. "find:europe" */
  gameBests?: Record<string, number>
  /** Map games: first-try answers per place; 3 earns a sticker */
  stamps?: Record<string, number>
  /** Explorer Shop personalization */
  avatar?: string
  mapTheme?: string
  passportTheme?: string
  confettiTheme?: string
  ownedItems?: string[]
  /** Family travel pins on My Atlas */
  visited?: Record<string, VisitedPin>
  /** Parent-configurable daily new places (1–5, default 3) */
  dailyNewLimit?: number
}

export type AnswerLog = { t: number; f: string; ok: boolean; q: string }
export type BossResult = { t: number; correct: number; total: number }

const LOG_CAP = 5000

export type AppState = {
  explorers: Explorer[]
  activeExplorerId: string | null
  duelHistory?: DuelRecord[]
}

const KEY = 'atlas-daily-v1'

/** Local calendar date (not UTC), so evening lessons count for the right day. */
export function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    return { explorers: [], activeExplorerId: null, duelHistory: [] }
  }
  const parsed = raw as Partial<AppState>
  const explorers = (Array.isArray(parsed.explorers) ? parsed.explorers : []).map((e) => ({
    ...e,
    placementClearedUnits: e.placementClearedUnits ?? [],
    completedUnits: e.completedUnits ?? [],
    introduced: e.introduced ?? [],
    cards: e.cards ?? {},
    log: e.log ?? [],
    bosses: e.bosses ?? [],
    gameBests: e.gameBests ?? {},
    stamps: e.stamps ?? {},
    ownedItems: e.ownedItems ?? [],
    visited: e.visited ?? {},
  }))
  const activeExplorerId =
    parsed.activeExplorerId && explorers.some((e) => e.id === parsed.activeExplorerId)
      ? parsed.activeExplorerId
      : explorers[0]?.id ?? null
  return {
    explorers,
    activeExplorerId,
    duelHistory: Array.isArray(parsed.duelHistory) ? parsed.duelHistory.slice(-30) : [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { explorers: [], activeExplorerId: null, duelHistory: [] }
    return normalizeState(JSON.parse(raw))
  } catch {
    return { explorers: [], activeExplorerId: null, duelHistory: [] }
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
    avatar: 'av-compass',
    mapTheme: 'map-classic',
    passportTheme: 'pass-cream',
    confettiTheme: 'conf-classic',
    ownedItems: [],
    visited: {},
    dailyNewLimit: 3,
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
  if (explorer.currentUnitId === unitId) return true
  if (!unit.unlockAfter) return true
  if (explorer.completedUnits.includes(unit.unlockAfter)) return true
  // Also unlock any unit earlier in the trail than the explorer's current unit
  const currentOrder = UNITS.find((u) => u.id === explorer.currentUnitId)?.order ?? 1
  if (unit.order <= currentOrder) return true
  // Also unlock if previous unit is mostly strong
  const prev = unitProgress(explorer, unit.unlockAfter)
  return prev.pct >= 70 && prev.introduced >= prev.total
}

/** Every unit with places supports the drag/tap map placement gate. */
export function unitNeedsPlacementGate(unitId: string) {
  return factsForUnit(unitId).length > 0
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
  if (following && next.currentUnitId === unitId) {
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

/** Places missed at least once (or struggling), sorted by lapses descending. */
export function trickyFacts(explorer: Explorer) {
  return FACTS.filter((f) => {
    if (!explorer.introduced.includes(f.id)) return false
    const c = explorer.cards[f.id]
    return Boolean(c && (c.lapses >= 1 || c.ease < 2.2))
  }).sort((a, b) => {
    const ca = explorer.cards[a.id]
    const cb = explorer.cards[b.id]
    return (cb?.lapses ?? 0) - (ca?.lapses ?? 0) || (ca?.ease ?? 2.5) - (cb?.ease ?? 2.5)
  })
}
