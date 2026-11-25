import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  SHOP_ITEMS,
  getAvatarEmoji,
  isItemOwned,
  type ShopCategory,
  type ShopItem,
} from '../data/shop'
import { playCoin, playTap } from '../lib/sfx'
import type { Explorer } from '../lib/storage'

type Props = {
  explorer: Explorer
  onUpdate: (explorer: Explorer) => void
  onBack: () => void
}

const CATEGORIES: { id: ShopCategory; label: string; icon: string }[] = [
  { id: 'avatar', label: 'Avatars', icon: '🧭' },
  { id: 'map', label: 'Map Themes', icon: '🗺️' },
  { id: 'passport', label: 'Passports', icon: '📘' },
  { id: 'confetti', label: 'Confetti', icon: '🎉' },
]

function equippedIdFor(explorer: Explorer, category: ShopCategory): string {
  switch (category) {
    case 'avatar':
      return explorer.avatar ?? 'av-compass'
    case 'map':
      return explorer.mapTheme ?? 'map-classic'
    case 'passport':
      return explorer.passportTheme ?? 'pass-cream'
    case 'confetti':
      return explorer.confettiTheme ?? 'conf-classic'
  }
}

function withEquipped(explorer: Explorer, item: ShopItem): Explorer {
  switch (item.category) {
    case 'avatar':
      return { ...explorer, avatar: item.id }
    case 'map':
      return { ...explorer, mapTheme: item.id }
    case 'passport':
      return { ...explorer, passportTheme: item.id }
    case 'confetti':
      return { ...explorer, confettiTheme: item.id }
  }
}

export function ExplorerShop({ explorer, onUpdate, onBack }: Props) {
  const [tab, setTab] = useState<ShopCategory>('avatar')
  const [justBought, setJustBought] = useState<string | null>(null)

  const items = SHOP_ITEMS.filter((i) => i.category === tab)
  const equipped = equippedIdFor(explorer, tab)

  function handleSelect(item: ShopItem) {
    const owned = isItemOwned(explorer.ownedItems, item)
    if (owned) {
      playTap()
      onUpdate(withEquipped(explorer, item))
      return
    }
    if (explorer.trailCoins < item.cost) return
    playCoin()
    const ownedItems = [...new Set([...(explorer.ownedItems ?? []), item.id])]
    const updated = withEquipped(
      {
        ...explorer,
        trailCoins: explorer.trailCoins - item.cost,
        ownedItems,
      },
      item,
    )
    onUpdate(updated)
    setJustBought(item.id)
    window.setTimeout(() => setJustBought((cur) => (cur === item.id ? null : cur)), 1400)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
      >
        ← Home
      </button>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">
            Explorer Shop
          </p>
          <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl">
            {getAvatarEmoji(explorer.avatar)} {explorer.name}&apos;s gear
          </h1>
          <p className="mt-1 text-ocean-800/80">
            Spend Trail Coins from daily lessons, drills, and trophies!
          </p>
        </div>
        <div className="rounded-2xl bg-ocean-900 px-5 py-3 text-right text-sand-100 shadow-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sea-200/90">
            Trail Coins
          </div>
          <div className="font-display text-3xl text-amber">
            🪙 {explorer.trailCoins}
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={tab === c.id}
            onClick={() => setTab(c.id)}
            className={`rounded-2xl px-3 py-3 text-left transition ${
              tab === c.id
                ? 'bg-ocean-900 text-sand-100 shadow-md'
                : 'bg-white/75 text-ocean-900 hover:bg-white'
            }`}
          >
            <span className="text-xl">{c.icon}</span>
            <span className="ml-2 font-extrabold">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const owned = isItemOwned(explorer.ownedItems, item)
          const active = equipped === item.id
          const canAfford = explorer.trailCoins >= item.cost
          const bought = justBought === item.id
          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={owned || canAfford ? { y: -2 } : undefined}
              disabled={!owned && !canAfford}
              onClick={() => handleSelect(item)}
              className={`flex flex-col justify-between rounded-3xl border-2 p-5 text-left transition disabled:opacity-55 ${
                active
                  ? 'border-sea-300 bg-white shadow-md ring-2 ring-sea-300/50'
                  : owned
                    ? 'border-ocean-900/10 bg-white/85 hover:bg-white'
                    : canAfford
                      ? 'border-amber/60 bg-white/85 hover:bg-white'
                      : 'border-transparent bg-white/55'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand-100 text-3xl">
                    {item.preview}
                  </span>
                  {active ? (
                    <span className="rounded-full bg-sea-300/40 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-ocean-950">
                      Equipped ✓
                    </span>
                  ) : owned ? (
                    <span className="rounded-full bg-ocean-900/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-ocean-800">
                      Owned
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber/25 px-3 py-1 text-xs font-extrabold text-ocean-950">
                      🪙 {item.cost}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-display text-xl text-ocean-950">
                  {item.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-ocean-700">
                  {item.description}
                </p>
              </div>
              <div className="mt-4">
                <span
                  className={`inline-block w-full rounded-xl py-2 text-center text-sm font-extrabold ${
                    bought
                      ? 'bg-moss text-white'
                      : active
                        ? 'bg-sand-100 text-ocean-800'
                        : owned
                          ? 'bg-ocean-900 text-sand-100'
                          : canAfford
                            ? 'bg-coral text-white'
                            : 'bg-ocean-900/10 text-ocean-700'
                  }`}
                >
                  {bought
                    ? 'Unlocked! 🎉'
                    : active
                      ? 'Currently using'
                      : owned
                        ? 'Equip'
                        : canAfford
                          ? `Unlock for ${item.cost} coins`
                          : `Need ${item.cost - explorer.trailCoins} more coins`}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
