/**
 * Photos for the after-answer reveal, from Wikipedia's page summaries.
 * States and countries show their capital city (usually a skyline photo);
 * rivers, mountains and landmarks show the place itself.
 * Works only when online; the reveal shows the fun fact either way.
 */
import type { GeoFact } from '../data/curriculum'

export type PlacePhoto = { src: string; caption: string; page: string }

const CACHE_KEY = 'atlas-photos-v1'
const memory = new Map<string, PlacePhoto | null>()

function loadCache(): Record<string, PlacePhoto | null> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveCache(id: string, photo: PlacePhoto | null) {
  try {
    const all = loadCache()
    all[id] = photo
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch {
    // Storage full or blocked: keep the in-memory copy only.
  }
}

function candidates(fact: GeoFact): { title: string; caption: string }[] {
  const list: { title: string; caption: string }[] = []
  if (fact.capital && (fact.kind === 'state' || fact.kind === 'country')) {
    const caption = `${fact.capital}, the capital of ${fact.name}`
    list.push({ title: `${fact.capital}, ${fact.name}`, caption })
    list.push({ title: fact.capital, caption })
  }
  if (fact.kind !== 'state' && fact.kind !== 'country') {
    list.push({ title: fact.name, caption: fact.name })
  }
  return list
}

type Summary = {
  type?: string
  title?: string
  thumbnail?: { source: string; width: number; height: number }
  content_urls?: { desktop?: { page?: string } }
}

async function summary(title: string): Promise<Summary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return (await res.json()) as Summary
  } catch {
    return null
  }
}

/** Looks like a flag, seal or map rather than a photo. */
function looksLikeArtwork(src: string) {
  return /flag|seal|coat_of_arms|emblem|locator|location_map|_map|\.svg/i.test(src)
}

export async function photoFor(fact: GeoFact): Promise<PlacePhoto | null> {
  if (memory.has(fact.id)) return memory.get(fact.id) ?? null
  const cached = loadCache()
  if (fact.id in cached) {
    memory.set(fact.id, cached[fact.id])
    return cached[fact.id]
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null

  let found: PlacePhoto | null = null
  for (const c of candidates(fact)) {
    const s = await summary(c.title)
    if (!s || s.type === 'disambiguation' || !s.thumbnail) continue
    if (looksLikeArtwork(s.thumbnail.source)) continue
    found = {
      src: s.thumbnail.source,
      caption: c.caption,
      page: s.content_urls?.desktop?.page ?? '',
    }
    break
  }
  memory.set(fact.id, found)
  if (found) saveCache(fact.id, found)
  return found
}
