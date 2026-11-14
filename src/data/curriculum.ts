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

const state = (
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

export const FACTS: GeoFact[] = [
  // Northeast
  state('ME', 'Maine', 'Augusta', 'us-northeast', 'Northeastern tip of the U.S., famous for lobsters and rocky coast.', { x: 92, y: 18 }, ['New Hampshire']),
  state('NH', 'New Hampshire', 'Concord', 'us-northeast', 'Small New England state between Maine and Vermont.', { x: 88, y: 22 }, ['Maine', 'Vermont', 'Massachusetts']),
  state('VT', 'Vermont', 'Montpelier', 'us-northeast', 'Green Mountain state on Canada’s border.', { x: 84, y: 20 }, ['New Hampshire', 'New York', 'Massachusetts']),
  state('MA', 'Massachusetts', 'Boston', 'us-northeast', 'Home of the Boston Tea Party and Cape Cod.', { x: 90, y: 28 }, ['New Hampshire', 'Vermont', 'New York', 'Connecticut', 'Rhode Island']),
  state('RI', 'Rhode Island', 'Providence', 'us-northeast', 'The smallest U.S. state.', { x: 92, y: 32 }, ['Massachusetts', 'Connecticut']),
  state('CT', 'Connecticut', 'Hartford', 'us-northeast', 'Between New York and Rhode Island on Long Island Sound.', { x: 88, y: 34 }, ['New York', 'Massachusetts', 'Rhode Island']),
  state('NY', 'New York', 'Albany', 'us-northeast', 'Empire State — Niagara Falls and New York City.', { x: 80, y: 28 }, ['Pennsylvania', 'New Jersey', 'Connecticut', 'Massachusetts', 'Vermont']),
  state('NJ', 'New Jersey', 'Trenton', 'us-northeast', 'Between New York City and Philadelphia.', { x: 84, y: 38 }, ['New York', 'Pennsylvania', 'Delaware']),
  state('PA', 'Pennsylvania', 'Harrisburg', 'us-northeast', 'Keystone State — Philadelphia and Pittsburgh.', { x: 76, y: 36 }, ['New York', 'New Jersey', 'Delaware', 'Maryland', 'West Virginia', 'Ohio']),
  state('DE', 'Delaware', 'Dover', 'us-northeast', 'First state to ratify the Constitution.', { x: 82, y: 42 }, ['Maryland', 'New Jersey', 'Pennsylvania']),
  state('MD', 'Maryland', 'Annapolis', 'us-northeast', 'Wraps around Chesapeake Bay.', { x: 78, y: 44 }, ['Pennsylvania', 'Delaware', 'Virginia', 'West Virginia']),

  // Southeast
  state('VA', 'Virginia', 'Richmond', 'us-southeast', 'Home to Colonial Williamsburg and the Blue Ridge.', { x: 76, y: 48 }, ['Maryland', 'West Virginia', 'Kentucky', 'Tennessee', 'North Carolina']),
  state('WV', 'West Virginia', 'Charleston', 'us-southeast', 'Mountain state carved from Virginia.', { x: 72, y: 44 }, ['Pennsylvania', 'Maryland', 'Virginia', 'Kentucky', 'Ohio']),
  state('NC', 'North Carolina', 'Raleigh', 'us-southeast', 'Outer Banks and Great Smoky Mountains.', { x: 78, y: 54 }, ['Virginia', 'Tennessee', 'South Carolina', 'Georgia']),
  state('SC', 'South Carolina', 'Columbia', 'us-southeast', 'Palmetto State on the Atlantic.', { x: 76, y: 60 }, ['North Carolina', 'Georgia']),
  state('GA', 'Georgia', 'Atlanta', 'us-southeast', 'Peach State — Atlanta is a major hub.', { x: 72, y: 64 }, ['South Carolina', 'North Carolina', 'Tennessee', 'Alabama', 'Florida']),
  state('FL', 'Florida', 'Tallahassee', 'us-southeast', 'Peninsula pointing into the Caribbean.', { x: 74, y: 78 }, ['Georgia', 'Alabama']),
  state('AL', 'Alabama', 'Montgomery', 'us-southeast', 'Heart of Dixie between Mississippi and Georgia.', { x: 66, y: 66 }, ['Mississippi', 'Tennessee', 'Georgia', 'Florida']),
  state('MS', 'Mississippi', 'Jackson', 'us-southeast', 'Named for the mighty Mississippi River.', { x: 60, y: 66 }, ['Louisiana', 'Arkansas', 'Tennessee', 'Alabama']),
  state('LA', 'Louisiana', 'Baton Rouge', 'us-southeast', 'Mississippi River delta and New Orleans.', { x: 56, y: 72 }, ['Texas', 'Arkansas', 'Mississippi']),
  state('AR', 'Arkansas', 'Little Rock', 'us-southeast', 'Natural State between Missouri and Louisiana.', { x: 56, y: 60 }, ['Missouri', 'Tennessee', 'Mississippi', 'Louisiana', 'Texas', 'Oklahoma']),
  state('TN', 'Tennessee', 'Nashville', 'us-southeast', 'Long east–west state — Music City.', { x: 64, y: 56 }, ['Kentucky', 'Virginia', 'North Carolina', 'Georgia', 'Alabama', 'Mississippi', 'Arkansas', 'Missouri']),
  state('KY', 'Kentucky', 'Frankfort', 'us-southeast', 'Bluegrass State north of Tennessee.', { x: 66, y: 50 }, ['Indiana', 'Ohio', 'West Virginia', 'Virginia', 'Tennessee', 'Missouri', 'Illinois']),

  // Midwest
  state('OH', 'Ohio', 'Columbus', 'us-midwest', 'Buckeye State on Lake Erie.', { x: 70, y: 40 }, ['Pennsylvania', 'West Virginia', 'Kentucky', 'Indiana', 'Michigan']),
  state('MI', 'Michigan', 'Lansing', 'us-midwest', 'Shaped like a mitten, surrounded by Great Lakes.', { x: 66, y: 28 }, ['Ohio', 'Indiana', 'Wisconsin']),
  state('IN', 'Indiana', 'Indianapolis', 'us-midwest', 'Hoosier State between Ohio and Illinois.', { x: 64, y: 42 }, ['Michigan', 'Ohio', 'Kentucky', 'Illinois']),
  state('IL', 'Illinois', 'Springfield', 'us-midwest', 'Lincoln’s state — Chicago on Lake Michigan.', { x: 58, y: 42 }, ['Wisconsin', 'Indiana', 'Kentucky', 'Missouri', 'Iowa']),
  state('WI', 'Wisconsin', 'Madison', 'us-midwest', 'Dairy State north of Illinois.', { x: 56, y: 28 }, ['Michigan', 'Illinois', 'Iowa', 'Minnesota']),
  state('MN', 'Minnesota', 'Saint Paul', 'us-midwest', 'Land of 10,000 Lakes — Twin Cities.', { x: 50, y: 22 }, ['Wisconsin', 'Iowa', 'South Dakota', 'North Dakota']),
  state('IA', 'Iowa', 'Des Moines', 'us-midwest', 'Corn Belt state between Missouri rivers.', { x: 52, y: 38 }, ['Minnesota', 'Wisconsin', 'Illinois', 'Missouri', 'Nebraska', 'South Dakota']),
  state('MO', 'Missouri', 'Jefferson City', 'us-midwest', 'Gateway Arch in St. Louis.', { x: 54, y: 48 }, ['Iowa', 'Illinois', 'Kentucky', 'Tennessee', 'Arkansas', 'Oklahoma', 'Kansas', 'Nebraska']),
  state('ND', 'North Dakota', 'Bismarck', 'us-midwest', 'Northern plains on Canada’s border.', { x: 42, y: 18 }, ['Minnesota', 'South Dakota', 'Montana']),
  state('SD', 'South Dakota', 'Pierre', 'us-midwest', 'Home of Mount Rushmore.', { x: 42, y: 30 }, ['North Dakota', 'Minnesota', 'Iowa', 'Nebraska', 'Wyoming', 'Montana']),
  state('NE', 'Nebraska', 'Lincoln', 'us-midwest', 'Cornhusker State across the Great Plains.', { x: 44, y: 40 }, ['South Dakota', 'Iowa', 'Missouri', 'Kansas', 'Colorado', 'Wyoming']),
  state('KS', 'Kansas', 'Topeka', 'us-midwest', 'Sunflower State in the center of the Lower 48.', { x: 46, y: 50 }, ['Nebraska', 'Missouri', 'Oklahoma', 'Colorado']),

  // Southwest
  state('OK', 'Oklahoma', 'Oklahoma City', 'us-southwest', 'Panhandle state north of Texas.', { x: 48, y: 58 }, ['Kansas', 'Missouri', 'Arkansas', 'Texas', 'New Mexico', 'Colorado']),
  state('TX', 'Texas', 'Austin', 'us-southwest', 'Largest state in the Lower 48.', { x: 44, y: 70 }, ['New Mexico', 'Oklahoma', 'Arkansas', 'Louisiana']),
  state('NM', 'New Mexico', 'Santa Fe', 'us-southwest', 'Land of Enchantment — high desert and pueblos.', { x: 34, y: 62 }, ['Arizona', 'Colorado', 'Oklahoma', 'Texas', 'Utah']),
  state('AZ', 'Arizona', 'Phoenix', 'us-southwest', 'Grand Canyon State.', { x: 26, y: 62 }, ['California', 'Nevada', 'Utah', 'New Mexico']),
  state('NV', 'Nevada', 'Carson City', 'us-southwest', 'Silver State — Las Vegas and the Sierra edge.', { x: 18, y: 48 }, ['Oregon', 'Idaho', 'Utah', 'Arizona', 'California']),
  state('UT', 'Utah', 'Salt Lake City', 'us-southwest', 'Great Salt Lake and red-rock parks.', { x: 28, y: 48 }, ['Idaho', 'Wyoming', 'Colorado', 'Arizona', 'Nevada']),
  state('CO', 'Colorado', 'Denver', 'us-southwest', 'Rocky Mountain State — Mile High City.', { x: 36, y: 48 }, ['Wyoming', 'Nebraska', 'Kansas', 'Oklahoma', 'New Mexico', 'Utah']),

  // West
  state('WY', 'Wyoming', 'Cheyenne', 'us-west', 'Least populated state — Yellowstone.', { x: 34, y: 36 }, ['Montana', 'South Dakota', 'Nebraska', 'Colorado', 'Utah', 'Idaho']),
  state('MT', 'Montana', 'Helena', 'us-west', 'Big Sky Country on Canada’s border.', { x: 32, y: 20 }, ['Idaho', 'North Dakota', 'South Dakota', 'Wyoming']),
  state('ID', 'Idaho', 'Boise', 'us-west', 'Potato State with a distinctive panhandle.', { x: 24, y: 28 }, ['Washington', 'Montana', 'Wyoming', 'Utah', 'Nevada', 'Oregon']),
  state('WA', 'Washington', 'Olympia', 'us-west', 'Pacific Northwest — Seattle and rain forests.', { x: 14, y: 14 }, ['Oregon', 'Idaho']),
  state('OR', 'Oregon', 'Salem', 'us-west', 'Between Washington and California on the Pacific.', { x: 12, y: 28 }, ['Washington', 'Idaho', 'Nevada', 'California']),
  state('CA', 'California', 'Sacramento', 'us-west', 'Golden State — longest Pacific coastline in the U.S.', { x: 10, y: 48 }, ['Oregon', 'Nevada', 'Arizona']),
  state('AK', 'Alaska', 'Juneau', 'us-west', 'Largest U.S. state — far northwest.', { x: 8, y: 8 }, []),
  state('HI', 'Hawaii', 'Honolulu', 'us-west', 'Island state in the central Pacific.', { x: 22, y: 86 }, []),

  // CONTINUED_IN_NEXT_PUSH - PLACEHOLDER_PARTIAL
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
  return []
}
