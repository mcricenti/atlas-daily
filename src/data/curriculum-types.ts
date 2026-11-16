export type FactKind =
  | 'state'
  | 'country'
  | 'continent'
  | 'ocean'
  | 'river'
  | 'mountain'
  | 'landmark'

export type GeoFact = {
  id: string
  kind: FactKind
  name: string
  capital?: string
  /** Approximate total population (people) */
  population?: number
  region: string
  unitId: string
  clue: string
  neighbors?: string[]
  /** Approximate map pin for stylized atlas (0–100 x/y) */
  pin?: { x: number; y: number }
}

export type Unit = {
  id: string
  title: string
  subtitle: string
  order: number
  theme: string
  unlockAfter?: string
}

export const UNITS: Unit[] = [
  {
    id: 'us-northeast',
    title: 'U.S. Northeast',
    subtitle: 'States & capitals near the Atlantic',
    order: 1,
    theme: 'United States',
  },
  {
    id: 'us-southeast',
    title: 'U.S. Southeast',
    subtitle: 'Warm coasts and Appalachian foothills',
    order: 2,
    theme: 'United States',
    unlockAfter: 'us-northeast',
  },
  {
    id: 'us-midwest',
    title: 'U.S. Midwest',
    subtitle: 'Great Lakes and prairie states',
    order: 3,
    theme: 'United States',
    unlockAfter: 'us-southeast',
  },
  {
    id: 'us-southwest',
    title: 'U.S. Southwest',
    subtitle: 'Deserts, canyons, and borderlands',
    order: 4,
    theme: 'United States',
    unlockAfter: 'us-midwest',
  },
  {
    id: 'us-west',
    title: 'U.S. West',
    subtitle: 'Pacific coast and mountain states',
    order: 5,
    theme: 'United States',
    unlockAfter: 'us-southwest',
  },
  {
    id: 'world-basics',
    title: 'Continents & Oceans',
    subtitle: 'The seven continents and five oceans',
    order: 6,
    theme: 'World',
    unlockAfter: 'us-west',
  },
  {
    id: 'north-america',
    title: 'North America',
    subtitle: 'Countries & capitals of our continent',
    order: 7,
    theme: 'Continents',
    unlockAfter: 'world-basics',
  },
  {
    id: 'south-america',
    title: 'South America',
    subtitle: 'Andes, Amazon, and Atlantic coasts',
    order: 8,
    theme: 'Continents',
    unlockAfter: 'north-america',
  },
  {
    id: 'europe',
    title: 'Europe',
    subtitle: 'Countries & capitals across Europe',
    order: 9,
    theme: 'Continents',
    unlockAfter: 'south-america',
  },
  {
    id: 'africa',
    title: 'Africa',
    subtitle: 'Countries & capitals across Africa',
    order: 10,
    theme: 'Continents',
    unlockAfter: 'europe',
  },
  {
    id: 'asia',
    title: 'Asia',
    subtitle: 'Countries & capitals across Asia',
    order: 11,
    theme: 'Continents',
    unlockAfter: 'africa',
  },
  {
    id: 'world-rest',
    title: 'Oceania & Beyond',
    subtitle: 'Australia, Pacific islands, and more capitals',
    order: 12,
    theme: 'World',
    unlockAfter: 'asia',
  },
  {
    id: 'major-rivers',
    title: 'Rivers, Mountains & Landmarks',
    subtitle: 'Great rivers, peaks, and famous places on Earth',
    order: 13,
    theme: 'World',
    unlockAfter: 'world-rest',
  },
]

export function formatPopulation(n: number): string {
  if (n >= 1_000_000) {
    const millions = n / 1_000_000
    return `${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)} million`
  }
  return n.toLocaleString('en-US')
}

export const state = (
  abbr: string,
  name: string,
  capital: string,
  unitId: string,
  clue: string,
  pin: { x: number; y: number },
  neighbors: string[],
  population: number,
): GeoFact => ({
  id: `us-${abbr.toLowerCase()}`,
  kind: 'state',
  name,
  capital,
  population,
  region: 'United States',
  unitId,
  clue,
  pin,
  neighbors,
})
