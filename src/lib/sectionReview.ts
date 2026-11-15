import { factsForUnit, getUnit, type GeoFact, type Unit } from '../data/curriculum'

export type ReviewBlankKind = 'name' | 'capital'

export type ReviewItem = {
  id: string
  factId: string
  clue: string
  /** Shown label for the place type, e.g. State / Country / River */
  placeLabel: string
  nameAnswer: string
  capitalAnswer?: string
  /** Which fields the learner must fill */
  blanks: ReviewBlankKind[]
}

export type ReviewBankWord = {
  id: string
  text: string
  kind: ReviewBlankKind
  factId: string
}

export type SectionReviewSheet = {
  unit: Unit
  placeLabel: string
  capitalLabel: string
  items: ReviewItem[]
  bank: ReviewBankWord[]
  hasCapitals: boolean
}

function placeLabelFor(facts: GeoFact[]): string {
  const kinds = new Set(facts.map((f) => f.kind))
  if (kinds.has('state')) return 'State'
  if (kinds.has('country')) return 'Country'
  if (kinds.has('continent')) return 'Continent'
  if (kinds.has('ocean')) return 'Ocean'
  if (kinds.has('river')) return 'River'
  return 'Place'
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function buildSectionReview(unitId: string): SectionReviewSheet | null {
  const unit = getUnit(unitId)
  if (!unit) return null
  const facts = factsForUnit(unitId)
  if (!facts.length) return null

  const placeLabel = placeLabelFor(facts)
  const hasCapitals = facts.some((f) => Boolean(f.capital))
  const capitalLabel = 'Capital'

  const items: ReviewItem[] = facts.map((fact) => {
    const blanks: ReviewBlankKind[] = ['name']
    if (fact.capital) blanks.push('capital')
    return {
      id: `item-${fact.id}`,
      factId: fact.id,
      clue: fact.clue,
      placeLabel,
      nameAnswer: fact.name,
      capitalAnswer: fact.capital,
      blanks,
    }
  })

  const bank: ReviewBankWord[] = []
  for (const fact of facts) {
    bank.push({
      id: `bank-name-${fact.id}`,
      text: fact.name,
      kind: 'name',
      factId: fact.id,
    })
    if (fact.capital) {
      bank.push({
        id: `bank-cap-${fact.id}`,
        text: fact.capital,
        kind: 'capital',
        factId: fact.id,
      })
    }
  }

  return {
    unit,
    placeLabel,
    capitalLabel,
    items: shuffle(items),
    bank: shuffle(bank),
    hasCapitals,
  }
}

export function scoreSectionReview(
  sheet: SectionReviewSheet,
  answers: Record<string, { name?: string; capital?: string }>,
): { correct: number; total: number; byItem: Record<string, boolean> } {
  let correct = 0
  let total = 0
  const byItem: Record<string, boolean> = {}

  for (const item of sheet.items) {
    const a = answers[item.factId] ?? {}
    let ok = true
    if (item.blanks.includes('name')) {
      total += 1
      const match =
        (a.name ?? '').trim().toLowerCase() === item.nameAnswer.toLowerCase()
      if (!match) ok = false
      else correct += 1
    }
    if (item.blanks.includes('capital') && item.capitalAnswer) {
      total += 1
      const match =
        (a.capital ?? '').trim().toLowerCase() ===
        item.capitalAnswer.toLowerCase()
      if (!match) ok = false
      else correct += 1
    }
    byItem[item.factId] = ok
  }

  return { correct, total, byItem }
}
