import { FACTS, formatPopulation, type GeoFact } from '../data/curriculum'
import { FUN_FACTS } from '../data/funFacts'
import { flagUrl } from '../data/flags'
import { MEMORY_HOOKS } from '../data/memoryHooks'

export type TourCameraName = 'wide' | 'region' | 'close'

export type TourCard = { icon: string; label: string; text: string; image?: string }

export type TourScene = {
  id: 'find' | 'fly' | 'neighbors' | 'capital' | 'trick' | 'facts' | 'recap'
  /** Short chapter name shown on the progress strip */
  title: string
  /** Caption shown under the map */
  caption: string
  /** What the narrator says, when it differs from the caption */
  say?: string
  camera: TourCameraName
  showBeacon?: boolean
  showLabel?: boolean
  showNeighbors?: boolean
  showCapital?: boolean
  cards?: TourCard[]
  recap?: { headline: string; sub?: string; prompt: string }
}

const THE_PLACES = new Set([
  'United States',
  'United Kingdom',
  'Netherlands',
  'Philippines',
  'Bahamas',
  'Dominican Republic',
  'Democratic Republic of the Congo',
  'United Arab Emirates',
  'Solomon Islands',
  'Marshall Islands',
  'Federated States of Micronesia',
  'Matterhorn',
  'Grand Canyon',
  'Great Barrier Reef',
  'Sahara Desert',
  'Amazon Rainforest',
  'Great Wall of China',
])

/** "the Netherlands", "the Nile River", "Maine" */
export function withThe(fact: GeoFact): string {
  if (fact.kind === 'river' || fact.kind === 'ocean') return `the ${fact.name}`
  return THE_PLACES.has(fact.name) ? `the ${fact.name}` : fact.name
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function listNames(names: string[], max = 5): string {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  if (extra > 0) return `${shown.join(', ')}, and ${extra} more`
  if (shown.length <= 1) return shown.join('')
  if (shown.length === 2) return `${shown[0]} and ${shown[1]}`
  return `${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]}`
}

const US_REGION: Record<string, string> = {
  'us-northeast': 'the Northeast',
  'us-southeast': 'the Southeast',
  'us-midwest': 'the Midwest',
  'us-southwest': 'the Southwest',
  'us-west': 'the West',
}

const FIND_OVERRIDE: Record<string, string> = {
  'wr-greenland': 'It is a giant island in North America that belongs to Denmark.',
}

const COUNT_WORDS = ['', 'One thing', 'Two things', 'Three things', 'Four things']

const STATES_BY_POPULATION = FACTS.filter(
  (f) => f.kind === 'state' && typeof f.population === 'number',
).sort((a, b) => b.population! - a.population!)

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

function populationCard(fact: GeoFact): TourCard | null {
  if (typeof fact.population !== 'number') return null
  const people = `About ${formatPopulation(fact.population)} people live here.`
  if (fact.kind !== 'state') return { icon: '👪', label: 'People', text: people }
  const rank = STATES_BY_POPULATION.findIndex((f) => f.id === fact.id) + 1
  const total = STATES_BY_POPULATION.length
  const note =
    rank === 1
      ? ' That is more than any other state!'
      : rank === total
        ? ' That is fewer than any other state!'
        : rank > 0
          ? ` It has the ${ordinal(rank)} most people of the ${total} states.`
          : ''
  return { icon: '👪', label: 'People', text: people + note }
}

export type TourContext = {
  /** Friendly names of places that share a border (from the map itself) */
  neighborNames: string[]
  /** True when the place has its own outline on the map */
  hasShape: boolean
}

export function buildTour(fact: GeoFact, ctx: TourContext): TourScene[] {
  const fun = FUN_FACTS[fact.id]
  const name = fact.name
  const theName = withThe(fact)
  const TheName = capitalize(theName)
  const scenes: TourScene[] = []

  const funCard: TourCard | null = fun
    ? { icon: '💡', label: 'Fun fact', text: fun.fact }
    : null

  if (fact.kind === 'state' || fact.kind === 'country') {
    const isState = fact.kind === 'state'
    const where =
      FIND_OVERRIDE[fact.id] ??
      (isState
        ? `It is in ${US_REGION[fact.unitId] ?? 'the United States'} of the United States.`
        : `It is a country in ${fact.region}.`)

    scenes.push({
      id: 'find',
      title: 'Find it',
      caption: `Meet ${theName}! ${where} Can you spot it glowing on the map?`,
      camera: 'wide',
      showBeacon: true,
    })

    scenes.push({
      id: 'fly',
      title: 'Fly in',
      caption: `Let’s fly in closer. ${fact.clue}`,
      camera: 'region',
      showLabel: true,
    })

    const n = ctx.neighborNames
    const kindWord = isState ? 'state' : 'country'
    let neighborCaption: string
    if (!ctx.hasShape) {
      neighborCaption = `${TheName} is so small that it is just a dot on our map. The ocean is all around it.`
    } else if (n.length === 0) {
      neighborCaption =
        fact.id === 'us-ak'
          ? 'Alaska does not touch any other state. Its only neighbor is Canada!'
          : fact.id === 'us-hi'
            ? 'Hawaii has no neighbors at all. It is a chain of islands in the Pacific Ocean.'
            : `${TheName} has no neighbors on land. The sea is all around it.`
    } else if (n.length === 1) {
      neighborCaption = `${TheName} touches just one other ${kindWord}: ${n[0]}.`
    } else {
      neighborCaption = `${TheName} has ${n.length} neighbors: ${listNames(n)}.`
    }
    scenes.push({
      id: 'neighbors',
      title: 'Neighbors',
      caption: neighborCaption,
      camera: 'region',
      showLabel: true,
      showNeighbors: true,
    })

    if (fact.capital) {
      const same = fact.capital === fact.name
      scenes.push({
        id: 'capital',
        title: 'Capital',
        caption: same
          ? `Here is a surprise. The capital of ${name} is… ${fact.capital}! The city and the country share a name.`
          : isState
            ? `The star marks the capital. The capital of ${name} is ${fact.capital}. That is where the state’s leaders meet.`
            : `The star marks the capital. The capital of ${theName} is ${fact.capital}.`,
        camera: 'close',
        showCapital: true,
      })
    }

    const hook = MEMORY_HOOKS[fact.id]
    if (hook) {
      scenes.push({
        id: 'trick',
        title: 'Memory trick',
        caption: 'Here’s a silly trick to remember the capital.',
        say: `Here’s a silly trick to remember the capital. ${hook}`,
        camera: 'close',
        showCapital: true,
        cards: [{ icon: '🧠', label: 'Memory trick', text: hook }],
      })
    }

    const cards: TourCard[] = []
    if (fun?.nick) cards.push({ icon: '🏷️', label: 'Nickname', text: fun.nick })
    if (!isState) {
      cards.push({ icon: '🌍', label: 'Continent', text: fact.region })
    }
    const flag = flagUrl(fact.id)
    if (flag) {
      cards.push({ icon: '', image: flag, label: 'Flag', text: `This is the flag of ${theName}.` })
    }
    const pop = populationCard(fact)
    if (pop && !flag) cards.push(pop)
    if (funCard) cards.push(funCard)
    if (cards.length) {
      scenes.push({
        id: 'facts',
        title: 'Key facts',
        caption: `${COUNT_WORDS[cards.length] ?? 'Some things'} to remember about ${theName}.`,
        say: `${COUNT_WORDS[cards.length] ?? 'Some things'} to remember about ${theName}. ${cards
          .map((c) => `${c.label}: ${c.text}`)
          .join(' ')}`,
        camera: 'close',
        cards,
      })
    }

    scenes.push({
      id: 'recap',
      title: 'Say it',
      caption: fact.capital
        ? `Now say it with me: ${name}, capital ${fact.capital}!`
        : `Now say it with me: ${name}!`,
      camera: 'region',
      showCapital: Boolean(fact.capital),
      recap: {
        headline: name,
        sub: fact.capital,
        prompt: 'Say it out loud three times!',
      },
    })
    return scenes
  }

  // Continents, oceans, rivers, mountains and landmarks
  const intro: Record<string, string> = {
    continent: `This is ${name}. It is one of the seven continents. Watch it light up on the map.`,
    ocean: `This is ${theName}. It is one of the five oceans. Look for the glowing spot.`,
    river: `Let’s find ${theName}. It is in ${fact.region}.`,
    mountain: `Let’s find ${theName}. It is a mountain in ${fact.region}.`,
    landmark: `Let’s find ${theName}. It is in ${fact.region}.`,
  }
  scenes.push({
    id: 'find',
    title: 'Find it',
    caption: intro[fact.kind] ?? `Let’s find ${theName}.`,
    camera: 'wide',
    showBeacon: true,
  })
  scenes.push({
    id: 'fly',
    title: 'Fly in',
    caption: `Let’s fly in closer. ${fact.clue}`,
    camera: 'region',
    showLabel: true,
  })

  const cards: TourCard[] = [
    { icon: '📍', label: 'Where', text: fact.region === 'World' ? fact.clue : fact.region },
  ]
  if (funCard) cards.push(funCard)
  scenes.push({
    id: 'facts',
    title: 'Key facts',
    caption: `Good to know about ${theName}.`,
    say: `Good to know about ${theName}. ${funCard ? funCard.text : fact.clue}`,
    camera: 'region',
    cards,
  })
  scenes.push({
    id: 'recap',
    title: 'Say it',
    caption: `Point to it and say its name: ${name}!`,
    camera: 'region',
    showLabel: false,
    recap: { headline: name, prompt: 'Point to it and say its name!' },
  })
  return scenes
}

/** How long a scene stays up when nobody is reading it aloud (ms). */
export function sceneDuration(scene: TourScene): number {
  const words = (scene.say ?? scene.caption).split(/\s+/).length
  return Math.max(4200, 1800 + words * 340)
}
