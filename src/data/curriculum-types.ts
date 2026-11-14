export type FactKind =
  | 'state'
  | 'country'
  | 'continent'
  | 'ocean'
  | 'river'

export type GeoFact = {
  id: string
  kind: FactKind
  name: string
  capital?: string
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
    id: 'north-america',
    title: 'North America',
    subtitle: 'Countries & capitals of our continent',
    order: 6,
    theme: 'Continents',
    unlockAfter: 'us-west',
  },
  {
    id: 'south-america',
    title: 'South America',
    subtitle: 'Andes, Amazon, and Atlantic coasts',
    order: 7,
    theme: 'Continents',
    unlockAfter: 'north-america',
  },
  {
    id: 'world-basics',
    title: 'Continents & Oceans',
    subtitle: 'The seven continents and five oceans',
    order: 8,
    theme: 'World',
    unlockAfter: 'south-america',
  },
  {
    id: 'major-rivers',
    title: 'Major Rivers',
    subtitle: 'The waterways that shaped nations',
    order: 9,
    theme: 'World',
    unlockAfter: 'world-basics',
  },
  {
    id: 'europe',
    title: 'Europe',
    subtitle: 'Countries & capitals across Europe',
    order: 10,
    theme: 'Continents',
    unlockAfter: 'major-rivers',
  },
  {
    id: 'africa',
    title: 'Africa',
    subtitle: 'Countries & capitals across Africa',
    order: 11,
    theme: 'Continents',
    unlockAfter: 'europe',
  },
]

export const state = (
  abbr: string,
  name: string,
  capital: string,
  unitId: string,
  clue: string,
  pin: { x: number; y: number },
  neighbors: string[],
): GeoFact => ({
  id: `us-${abbr.toLowerCase()}`,
  kind: 'state',
  name,
  capital,
  region: 'United States',
  unitId,
  clue,
  pin,
  neighbors,
})

