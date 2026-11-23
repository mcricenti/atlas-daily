import { UNITS, factsForUnit, type GeoFact } from '../../data/curriculum'
import { flagUrl } from '../../data/flags'
import { UNIT_ICONS } from '../../data/unitIcons'
import { STAMP_AT } from '../../lib/mapGames'
import { isUnitUnlocked, type Explorer } from '../../lib/storage'

const KIND_ICON: Record<GeoFact['kind'], string> = {
  state: '',
  country: '🏳️',
  continent: '🌍',
  ocean: '🌊',
  river: '〰️',
  mountain: '⛰️',
  landmark: '🏛️',
}

const STAMP_COLORS = ['#c0392b', '#2b6cb0', '#2f855a', '#6b46c1', '#b7791f', '#c05621']

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function Sticker({ fact, earned, size = 68 }: { fact: GeoFact; earned: boolean; size?: number }) {
  const h = hash(fact.id)
  const color = STAMP_COLORS[h % STAMP_COLORS.length]
  const flag = flagUrl(fact.id)
  const label = fact.kind === 'state' ? fact.id.slice(3).toUpperCase() : null
  return (
    <div
      className="flex flex-col items-center justify-center rounded-full border-[3px] border-dashed text-center"
      style={{
        width: size,
        height: size,
        borderColor: earned ? color : '#b8ad97',
        color: earned ? color : '#b8ad97',
        transform: `rotate(${(h % 21) - 10}deg)`,
        background: earned ? `${color}12` : 'transparent',
        opacity: earned ? 1 : 0.55,
      }}
    >
      {flag ? (
        <img src={flag} alt="" className={`h-5 w-auto rounded-sm ${earned ? '' : 'grayscale'}`} />
      ) : label ? (
        <span className="font-display text-xl leading-none">{label}</span>
      ) : (
        <span className={`text-xl ${earned ? '' : 'grayscale'}`}>{KIND_ICON[fact.kind]}</span>
      )}
      <span className="mt-0.5 max-w-[90%] truncate text-[9px] font-extrabold uppercase leading-tight">{fact.name}</span>
    </div>
  )
}

/** Sticker book: a sticker for each place answered right on the first try 3 times in map games. */
export function StickerBook({ explorer, onBack }: { explorer: Explorer; onBack: () => void }) {
  const stamps = explorer.stamps ?? {}
  const total = Object.values(stamps).filter((n) => n >= STAMP_AT).length
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button type="button" onClick={onBack} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
        ← Games
      </button>
      <div className="mt-6 rounded-3xl bg-[#1d3557] p-6 text-center text-sand-100 shadow-lg">
        <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-amber">Sticker book</p>
        <h1 className="mt-1 font-display text-4xl">{explorer.name}</h1>
        <p className="mt-2 text-lg font-bold">
          {total} sticker{total === 1 ? '' : 's'} collected
        </p>
        <p className="mt-1 text-sm text-sand-100/80">
          Get a place right on the first try {STAMP_AT} times in any map game to earn its sticker.
        </p>
      </div>

      {UNITS.map((u) => {
        const facts = factsForUnit(u.id)
        const unlocked = isUnitUnlocked(explorer, u.id)
        const got = facts.filter((f) => (stamps[f.id] ?? 0) >= STAMP_AT).length
        return (
          <section key={u.id} className="mt-6 rounded-3xl bg-[#fbf6ea] p-4 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-xl text-ocean-950">
              <span aria-hidden>{unlocked ? UNIT_ICONS[u.id] ?? '🗺️' : '🔒'}</span>
              {u.title}
              <span className="ml-auto text-sm font-extrabold text-ocean-700">
                {got} / {facts.length}
              </span>
            </h2>
            {unlocked ? (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {facts.map((f) => {
                  const n = stamps[f.id] ?? 0
                  return (
                    <div key={f.id} className="flex flex-col items-center">
                      <Sticker fact={f} earned={n >= STAMP_AT} />
                      {n > 0 && n < STAMP_AT && (
                        <span className="mt-1 text-[10px] font-extrabold text-ocean-700">
                          {'●'.repeat(n)}
                          {'○'.repeat(STAMP_AT - n)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-ocean-700">Unlocks on the learning path.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
