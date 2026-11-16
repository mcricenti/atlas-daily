export type { FactKind, GeoFact, Unit } from './curriculum-types'
export { UNITS, formatPopulation } from './curriculum-types'
import { UNITS, type GeoFact, type Unit } from './curriculum-types'
import { FACTS_US } from './curriculum-facts-us'
import { FACTS_INTL_A } from './curriculum-facts-intl-a'
import { FACTS_INTL_B } from './curriculum-facts-intl-b'
import { FACTS_ASIA_WORLD } from './curriculum-facts-asia-world'

export const FACTS: GeoFact[] = [
  ...FACTS_US,
  ...FACTS_INTL_A,
  ...FACTS_INTL_B,
  ...FACTS_ASIA_WORLD,
]

export function factsForUnit(unitId: string): GeoFact[] {
  return FACTS.filter((f) => f.unitId === unitId)
}

export function getFact(id: string): GeoFact | undefined {
  return FACTS.find((f) => f.id === id)
}

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id)
}

export function distractorsFor(
  fact: GeoFact,
  field: 'name' | 'capital',
  count = 3,
): string[] {
  const pool = FACTS.filter(
    (f) =>
      f.id !== fact.id &&
      f.kind === fact.kind &&
      (field === 'capital' ? Boolean(f.capital) : true) &&
      (f.unitId === fact.unitId || f.region === fact.region),
  )
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const values = shuffled
    .map((f) => (field === 'capital' ? f.capital! : f.name))
    .filter((v, i, arr) => arr.indexOf(v) === i)
  while (values.length < count) {
    const extra = FACTS.filter(
      (f) => f.id !== fact.id && (field === 'capital' ? f.capital : true),
    )
    const pick = extra[Math.floor(Math.random() * extra.length)]
    const val = field === 'capital' ? pick.capital! : pick.name
    if (!values.includes(val) && val !== (field === 'capital' ? fact.capital : fact.name)) {
      values.push(val)
    }
    if (values.length >= count) break
  }
  return values.slice(0, count)
}
