/**
 * Explorer Shop catalog — kids spend Trail Coins earned from lessons,
 * placement challenges, and weekly trophies to personalize their atlas.
 */

export type ShopCategory = 'avatar' | 'map' | 'passport' | 'confetti'

export type ShopItem = {
  id: string
  category: ShopCategory
  name: string
  description: string
  cost: number
  preview: string
}

export type MapThemePalette = {
  id: string
  sea: string
  seaLight: string
  landNew: string
  landOther: string
  stroke: string
  learning: string
  strong: string
  mastered: string
}

export type PassportPalette = {
  id: string
  bg: string
  border: string
  heading: string
  stampBorder: string
}

export const SHOP_ITEMS: ShopItem[] = [
  // Explorer avatars
  { id: 'av-compass', category: 'avatar', name: 'Compass', description: 'Classic trail finder', cost: 0, preview: '🧭' },
  { id: 'av-rocket', category: 'avatar', name: 'Space Scout', description: 'Zoom around Earth', cost: 15, preview: '🚀' },
  { id: 'av-dino', category: 'avatar', name: 'Dino Explorer', description: 'Stomping through continents', cost: 20, preview: '🦖' },
  { id: 'av-lion', category: 'avatar', name: 'Safari Guide', description: 'King of the trail', cost: 25, preview: '🦁' },
  { id: 'av-pirate', category: 'avatar', name: 'Map Captain', description: 'Sailing all five oceans', cost: 30, preview: '🏴‍☠️' },
  { id: 'av-owl', category: 'avatar', name: 'Wise Owl', description: 'Remembers every capital', cost: 35, preview: '🦉' },
  { id: 'av-dragon', category: 'avatar', name: 'World Dragon', description: 'Flies over every mountain', cost: 50, preview: '🐉' },
  { id: 'av-crown', category: 'avatar', name: 'Atlas Monarch', description: 'Master of the map', cost: 75, preview: '👑' },

  // Map themes
  { id: 'map-classic', category: 'map', name: 'Ocean Teal', description: 'Classic Atlas Daily sea & sand', cost: 0, preview: '🌊' },
  { id: 'map-parchment', category: 'map', name: 'Vintage Parchment', description: 'Warm antique explorer map', cost: 25, preview: '📜' },
  { id: 'map-night', category: 'map', name: 'Starry Night Globe', description: 'Deep midnight sky & glowing lands', cost: 35, preview: '🌌' },
  { id: 'map-pirate', category: 'map', name: 'Treasure Map', description: 'Sunken gold & deep cobalt waters', cost: 45, preview: '🗺️' },
  { id: 'map-emerald', category: 'map', name: 'Rainforest Atlas', description: 'Lush lagoon & canopy greens', cost: 50, preview: '🌿' },

  // Passport covers
  { id: 'pass-cream', category: 'passport', name: 'Classic Cream', description: 'Crisp field-notebook pages', cost: 0, preview: '📒' },
  { id: 'pass-navy', category: 'passport', name: 'Royal Navy', description: 'Official globe-trotter blue', cost: 20, preview: '📘' },
  { id: 'pass-crimson', category: 'passport', name: 'Explorer Red', description: 'Bold crimson expedition book', cost: 25, preview: '📕' },
  { id: 'pass-gold', category: 'passport', name: 'Golden Compass', description: 'Shimmering gold-trimmed pages', cost: 40, preview: '✨' },

  // Confetti styles
  { id: 'conf-classic', category: 'confetti', name: 'Paper Confetti', description: 'Bright colorful strips', cost: 0, preview: '🎉' },
  { id: 'conf-stars', category: 'confetti', name: 'Golden Stars', description: 'Shimmering gold & amber burst', cost: 20, preview: '⭐' },
  { id: 'conf-rainbow', category: 'confetti', name: 'World Rainbow', description: 'Flag-bright celebration shower', cost: 30, preview: '🌈' },
]

export const MAP_THEMES: Record<string, MapThemePalette> = {
  'map-classic': {
    id: 'map-classic',
    sea: '#0f5363',
    seaLight: '#1f8494',
    landNew: '#ddd0ba',
    landOther: '#b9ab94',
    stroke: '#5b4a35',
    learning: '#f6c453',
    strong: '#8fd3b0',
    mastered: '#2f9e6e',
  },
  'map-parchment': {
    id: 'map-parchment',
    sea: '#d7c8a8',
    seaLight: '#e6dabf',
    landNew: '#f4ead2',
    landOther: '#e2d4b7',
    stroke: '#6c5234',
    learning: '#e7a94e',
    strong: '#9ab973',
    mastered: '#4c7c48',
  },
  'map-night': {
    id: 'map-night',
    sea: '#0e1730',
    seaLight: '#1b2c59',
    landNew: '#33415c',
    landOther: '#232f47',
    stroke: '#6c84b0',
    learning: '#f7c948',
    strong: '#56cfe1',
    mastered: '#64dfdf',
  },
  'map-pirate': {
    id: 'map-pirate',
    sea: '#153243',
    seaLight: '#284b63',
    landNew: '#e8cfa6',
    landOther: '#c9ad7f',
    stroke: '#5a3a1a',
    learning: '#f4a261',
    strong: '#e9c46a',
    mastered: '#2a9d8f',
  },
  'map-emerald': {
    id: 'map-emerald',
    sea: '#0c4a46',
    seaLight: '#15706a',
    landNew: '#d9e3c8',
    landOther: '#b7c7a5',
    stroke: '#2d4a36',
    learning: '#f4c95d',
    strong: '#6ecb9e',
    mastered: '#1f8a5b',
  },
}

export const PASSPORT_THEMES: Record<string, PassportPalette> = {
  'pass-cream': {
    id: 'pass-cream',
    bg: '#fbf6ea',
    border: 'rgba(11, 61, 74, 0.16)',
    heading: '#06262f',
    stampBorder: 'rgba(224, 122, 95, 0.7)',
  },
  'pass-navy': {
    id: 'pass-navy',
    bg: '#e8f0fa',
    border: 'rgba(24, 58, 118, 0.35)',
    heading: '#102a5c',
    stampBorder: 'rgba(29, 78, 216, 0.6)',
  },
  'pass-crimson': {
    id: 'pass-crimson',
    bg: '#fdf0ed',
    border: 'rgba(180, 50, 45, 0.35)',
    heading: '#6b1815',
    stampBorder: 'rgba(190, 45, 40, 0.65)',
  },
  'pass-gold': {
    id: 'pass-gold',
    bg: '#fef8e1',
    border: 'rgba(180, 128, 18, 0.45)',
    heading: '#5e3d05',
    stampBorder: 'rgba(202, 138, 4, 0.75)',
  },
}

export const CONFETTI_PALETTES: Record<string, string[]> = {
  'conf-classic': ['#e07a5f', '#f4a261', '#7ed6c1', '#ffd23f', '#8cc7f0', '#c9a7ea'],
  'conf-stars': ['#ffd23f', '#f4a261', '#ffe999', '#f59e0b', '#fff3c4'],
  'conf-rainbow': ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
}

export function getMapTheme(id?: string): MapThemePalette {
  return MAP_THEMES[id ?? 'map-classic'] ?? MAP_THEMES['map-classic']
}

export function getPassportTheme(id?: string): PassportPalette {
  return PASSPORT_THEMES[id ?? 'pass-cream'] ?? PASSPORT_THEMES['pass-cream']
}

export function getAvatarEmoji(id?: string): string {
  const item = SHOP_ITEMS.find((i) => i.id === id && i.category === 'avatar')
  return item?.preview ?? '🧭'
}

export function isItemOwned(ownedItems: string[] | undefined, item: ShopItem): boolean {
  return item.cost === 0 || Boolean(ownedItems?.includes(item.id))
}
