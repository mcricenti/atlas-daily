import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FACTS, type GeoFact } from '../data/curriculum'
import { flagUrl } from '../data/flags'
import { getAvatarEmoji, getMapTheme, getPassportTheme } from '../data/shop'
import {
  MAP_H,
  MAP_W,
  buildAtlas,
  isUsFact,
  loadTopo,
  shapeKeyForFact,
  type Atlas,
} from '../lib/geoData'
import { playStamp } from '../lib/sfx'
import { masteryLabel } from '../lib/srs'
import { trophyFor, type Explorer, type VisitedPin } from '../lib/storage'
import { TourModal } from './TourModal'
import { TrophyIcon } from './Trophy'

type Tab = 'us' | 'world' | 'passport' | 'trips' | 'trophies'

type Level = 'new' | 'learning' | 'strong' | 'mastered'

const LEVEL_NAME: Record<Level, string> = {
  new: 'Not yet',
  learning: 'Learning',
  strong: 'Strong',
  mastered: 'Mastered',
}

function levelOf(explorer: Explorer, factId: string): Level {
  if (!explorer.introduced.includes(factId)) return 'new'
  const label = masteryLabel(explorer.cards[factId])
  if (label === 'Mastered') return 'mastered'
  if (label === 'Strong') return 'strong'
  return 'learning'
}

/** A place earns its passport stamp once it is Strong. */
function stamped(explorer: Explorer, factId: string) {
  const l = levelOf(explorer, factId)
  return l === 'strong' || l === 'mastered'
}

const CONTINENT_ORDER = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania']

type Props = {
  explorer: Explorer
  onUpdate: (explorer: Explorer) => void
  onBack: () => void
}

export function MyAtlas({ explorer, onUpdate, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('us')
  const [tourFact, setTourFact] = useState<GeoFact | null>(null)
  const [selectedFact, setSelectedFact] = useState<GeoFact | null>(null)

  const theme = getMapTheme(explorer.mapTheme)
  const levelColor: Record<Level, string> = {
    new: theme.landNew,
    learning: theme.learning,
    strong: theme.strong,
    mastered: theme.mastered,
  }

  const states = FACTS.filter(isUsFact)
  const countries = FACTS.filter((f) => f.kind === 'country')
  const coloredStates = states.filter((f) => levelOf(explorer, f.id) !== 'new').length
  const stamps = countries.filter((f) => stamped(explorer, f.id)).length
  const visitedMap = explorer.visited ?? {}
  const visitedCount = Object.values(visitedMap).filter((v) => v.status === 'visited').length
  const trophies = (explorer.bosses ?? []).filter((b) => trophyFor(b.correct, b.total)).length

  function setPlacePin(factId: string, pin: VisitedPin | null) {
    const nextVisited = { ...(explorer.visited ?? {}) }
    if (!pin) {
      delete nextVisited[factId]
    } else {
      nextVisited[factId] = pin
      playStamp()
    }
    onUpdate({ ...explorer, visited: nextVisited })
  }

  const tabs: { id: Tab; label: string; count: string }[] = [
    { id: 'us', label: 'U.S. map', count: `${coloredStates}/50` },
    {
      id: 'world',
      label: 'World map',
      count: `${countries.filter((f) => levelOf(explorer, f.id) !== 'new').length}/${countries.length}`,
    },
    { id: 'passport', label: 'Passport', count: `${stamps} stamps` },
    { id: 'trips', label: 'My Trips', count: `${visitedCount} visited` },
    { id: 'trophies', label: 'Trophies', count: String(trophies) },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
      >
        ← Home
      </button>
      <header className="mt-6">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">My Atlas</p>
        <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl">
          {getAvatarEmoji(explorer.avatar)} {explorer.name}&apos;s world
        </h1>
        <p className="mt-2 text-ocean-800/80">
          Every place you learn colors in — tap any state or country to watch its tour or pin family trips!
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-2xl px-3 py-3 text-left transition ${
              tab === t.id
                ? 'bg-ocean-900 text-sand-100 shadow-md'
                : 'bg-white/70 text-ocean-900 hover:bg-white'
            }`}
          >
            <span className="block font-extrabold">{t.label}</span>
            <span className={`text-xs font-bold ${tab === t.id ? 'text-sea-200' : 'text-ocean-700'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {(tab === 'us' || tab === 'world') && (
          <>
            <MasteryMap
              key={`${tab}-${theme.id}`}
              kind={tab}
              explorer={explorer}
              levelColor={levelColor}
              onPick={setSelectedFact}
            />
            <Legend levelColor={levelColor} />
            {tab === 'world' && (
              <WorldExtras
                explorer={explorer}
                levelColor={levelColor}
                onPick={setSelectedFact}
              />
            )}
          </>
        )}
        {tab === 'passport' && <Passport explorer={explorer} onPick={setTourFact} />}
        {tab === 'trips' && (
          <FamilyTrips
            explorer={explorer}
            onPickPlace={setSelectedFact}
            onSetPin={setPlacePin}
          />
        )}
        {tab === 'trophies' && <Trophies explorer={explorer} />}
      </div>

      {selectedFact && (
        <PlaceActionModal
          fact={selectedFact}
          level={levelOf(explorer, selectedFact.id)}
          pin={visitedMap[selectedFact.id]}
          onClose={() => setSelectedFact(null)}
          onWatchTour={() => {
            const f = selectedFact
            setSelectedFact(null)
            setTourFact(f)
          }}
          onSavePin={(pin) => setPlacePin(selectedFact.id, pin)}
        />
      )}

      {tourFact && <TourModal fact={tourFact} onClose={() => setTourFact(null)} />}
    </div>
  )
}

function Legend({ levelColor }: { levelColor: Record<Level, string> }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-ocean-800">
      {(Object.keys(levelColor) as Level[]).map((l) => (
        <span key={l} className="flex items-center gap-1.5">
          <span
            className="h-4 w-4 rounded border border-ocean-900/20"
            style={{ backgroundColor: levelColor[l] }}
          />
          {LEVEL_NAME[l]}
        </span>
      ))}
      <span className="flex items-center gap-1 text-xs font-extrabold text-amber">
        ★ Visited
      </span>
      <span className="flex items-center gap-1 text-xs font-extrabold text-coral">
        ♡ Wish list
      </span>
      <span className="text-xs font-semibold text-ocean-700">Tap any place to pin trips or watch its tour</span>
    </div>
  )
}

function MasteryMap({
  kind,
  explorer,
  levelColor,
  onPick,
}: {
  kind: 'us' | 'world'
  explorer: Explorer
  levelColor: Record<Level, string>
  onPick: (f: GeoFact) => void
}) {
  const theme = getMapTheme(explorer.mapTheme)
  const visited = explorer.visited ?? {}
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  useEffect(() => {
    let cancelled = false
    loadTopo(kind).then((t) => {
      if (!cancelled) setAtlas(buildAtlas(t, kind))
    })
    return () => {
      cancelled = true
    }
  }, [kind])

  const factByKey = useMemo(() => {
    const m = new Map<string, GeoFact>()
    for (const f of FACTS) {
      if ((kind === 'us') !== isUsFact(f)) continue
      const k = shapeKeyForFact(f)
      if (k) m.set(k, f)
    }
    return m
  }, [kind])

  if (!atlas) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-3xl bg-ocean-900 text-sm font-bold text-sea-200">
        Unrolling the map…
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-3xl border border-ocean-900/15 shadow-lg"
      style={{ backgroundColor: theme.sea }}
    >
      <svg
        viewBox={`0 ${kind === 'world' ? 40 : 0} ${MAP_W} ${kind === 'world' ? MAP_H - 120 : MAP_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Map colored by what you know"
      >
        <rect width={MAP_W} height={MAP_H} fill={theme.sea} />
        {atlas.shapes.map((s) => {
          const fact = factByKey.get(s.key)
          const level = fact ? levelOf(explorer, fact.id) : null
          return (
            <path
              key={s.key}
              d={s.d}
              fill={level ? levelColor[level] : theme.landOther}
              stroke={theme.stroke}
              strokeWidth={0.5}
              strokeOpacity={0.65}
              vectorEffect="non-scaling-stroke"
              style={fact ? { cursor: 'pointer' } : undefined}
              onClick={() => fact && onPick(fact)}
            >
              <title>
                {fact
                  ? `${fact.name}: ${LEVEL_NAME[level!]}${
                      visited[fact.id]
                        ? visited[fact.id].status === 'visited'
                          ? ' ★ Visited'
                          : ' ♡ Wish list'
                        : ''
                    }`
                  : s.label}
              </title>
            </path>
          )
        })}

        {/* Family trip pins overlaid on visited & wish-list places */}
        {atlas.shapes.map((s) => {
          const fact = factByKey.get(s.key)
          if (!fact) return null
          const pin = visited[fact.id]
          if (!pin) return null
          return (
            <g
              key={`pin-${s.key}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onPick(fact)}
            >
              <circle
                cx={s.cx}
                cy={s.cy}
                r={kind === 'us' ? 10 : 7}
                fill={pin.status === 'visited' ? '#ffd23f' : '#e07a5f'}
                stroke="#06262f"
                strokeWidth={1.6}
              />
              <text
                x={s.cx}
                y={s.cy + (kind === 'us' ? 4 : 3)}
                textAnchor="middle"
                style={{
                  fontSize: kind === 'us' ? 11 : 8,
                  fontWeight: 900,
                  fill: pin.status === 'visited' ? '#06262f' : '#ffffff',
                  pointerEvents: 'none',
                }}
              >
                {pin.status === 'visited' ? '★' : '♡'}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function WorldExtras({
  explorer,
  levelColor,
  onPick,
}: {
  explorer: Explorer
  levelColor: Record<Level, string>
  onPick: (f: GeoFact) => void
}) {
  const visited = explorer.visited ?? {}
  const groups: { title: string; kinds: GeoFact['kind'][] }[] = [
    { title: 'Continents & oceans', kinds: ['continent', 'ocean'] },
    { title: 'Rivers, mountains & landmarks', kinds: ['river', 'mountain', 'landmark'] },
  ]
  return (
    <div className="mt-6 space-y-4">
      {groups.map((g) => (
        <section key={g.title} className="rounded-3xl bg-white/75 p-4">
          <h3 className="font-display text-lg text-ocean-950">{g.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {FACTS.filter((f) => g.kinds.includes(f.kind)).map((f) => {
              const level = levelOf(explorer, f.id)
              const pin = visited[f.id]
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onPick(f)}
                  className="rounded-full border-2 px-3 py-1 text-sm font-bold text-ocean-950 transition hover:scale-[1.03]"
                  style={{
                    backgroundColor: levelColor[level] + (level === 'new' ? '' : '55'),
                    borderColor: levelColor[level],
                  }}
                >
                  {pin?.status === 'visited' ? '★ ' : pin?.status === 'wishlist' ? '♡ ' : ''}
                  {f.name}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function PlaceActionModal({
  fact,
  level,
  pin,
  onClose,
  onWatchTour,
  onSavePin,
}: {
  fact: GeoFact
  level: Level
  pin?: VisitedPin
  onClose: () => void
  onWatchTour: () => void
  onSavePin: (pin: VisitedPin | null) => void
}) {
  const [status, setStatus] = useState<'visited' | 'wishlist' | null>(pin?.status ?? null)
  const [note, setNote] = useState(pin?.note ?? '')
  const flag = flagUrl(fact.id)

  function applyStatus(next: 'visited' | 'wishlist' | null) {
    setStatus(next)
    if (!next) {
      setNote('')
      onSavePin(null)
    } else {
      onSavePin({ status: next, note: note.trim() || undefined })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {flag && (
              <img
                src={flag}
                alt=""
                className="h-9 w-auto rounded border border-ocean-900/15"
              />
            )}
            <div>
              <h2 className="font-display text-2xl text-ocean-950">{fact.name}</h2>
              <p className="text-sm font-bold text-ocean-700">
                {fact.capital ? `Capital: ${fact.capital} · ` : ''}
                {LEVEL_NAME[level]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-sand-100 px-3 py-1.5 text-sm font-bold text-ocean-900"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={onWatchTour}
          className="mt-4 w-full rounded-2xl bg-ocean-900 py-3 text-base font-extrabold text-sand-100 shadow-sm transition hover:brightness-110"
        >
          ▶ Watch map tour
        </button>

        <div className="mt-5 rounded-2xl bg-sand-100/90 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ocean-700">
            Family travel pin
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyStatus('visited')}
              className={`rounded-xl px-2 py-2 text-xs font-extrabold transition ${
                status === 'visited'
                  ? 'bg-amber text-ocean-950 shadow-sm'
                  : 'bg-white text-ocean-800'
              }`}
            >
              ★ We visited!
            </button>
            <button
              type="button"
              onClick={() => applyStatus('wishlist')}
              className={`rounded-xl px-2 py-2 text-xs font-extrabold transition ${
                status === 'wishlist'
                  ? 'bg-coral text-white shadow-sm'
                  : 'bg-white text-ocean-800'
              }`}
            >
              ♡ Want to go
            </button>
            <button
              type="button"
              onClick={() => applyStatus(null)}
              disabled={!status}
              className="rounded-xl bg-white px-2 py-2 text-xs font-bold text-ocean-700 disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          {status && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                onSavePin({ status, note: note.trim() || undefined })
                onClose()
              }}
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (e.g. Grandma lives here!)"
                className="flex-1 rounded-xl border border-ocean-900/15 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-sea-300"
              />
              <button
                type="submit"
                className="rounded-xl bg-ocean-900 px-3 py-2 text-sm font-extrabold text-sand-100"
              >
                Save
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function FamilyTrips({
  explorer,
  onPickPlace,
  onSetPin,
}: {
  explorer: Explorer
  onPickPlace: (f: GeoFact) => void
  onSetPin: (id: string, pin: VisitedPin | null) => void
}) {
  const [query, setQuery] = useState('')
  const visited = explorer.visited ?? {}

  const visitedPlaces = FACTS.filter((f) => visited[f.id]?.status === 'visited')
  const wishPlaces = FACTS.filter((f) => visited[f.id]?.status === 'wishlist')
  const visitedStates = visitedPlaces.filter(isUsFact).length
  const visitedCountries = visitedPlaces.filter((f) => f.kind === 'country').length

  const matches = query.trim()
    ? FACTS.filter((f) =>
        `${f.name} ${f.capital ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
      ).slice(0, 6)
    : []

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white/85 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ocean-950">Places our family has explored</h2>
            <p className="text-sm font-semibold text-ocean-700">
              {visitedStates} U.S. {visitedStates === 1 ? 'state' : 'states'} · {visitedCountries}{' '}
              {visitedCountries === 1 ? 'country' : 'countries'} visited · {wishPlaces.length} on wish list
            </p>
          </div>
        </div>
        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any state, country, or landmark to pin a trip…"
            className="w-full rounded-2xl border-2 border-ocean-900/10 bg-sand-100 px-4 py-2.5 text-sm font-semibold outline-none focus:border-sea-300"
          />
          {matches.length > 0 && (
            <div className="mt-2 divide-y divide-ocean-900/10 rounded-2xl border border-ocean-900/10 bg-white">
              {matches.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-bold text-ocean-950">
                    {f.name}
                    {f.capital ? <span className="text-ocean-700"> · {f.capital}</span> : null}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSetPin(f.id, { status: 'visited', note: visited[f.id]?.note })
                        setQuery('')
                      }}
                      className="rounded-lg bg-amber px-2.5 py-1 text-xs font-extrabold text-ocean-950"
                    >
                      ★ Visited
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSetPin(f.id, { status: 'wishlist', note: visited[f.id]?.note })
                        setQuery('')
                      }}
                      className="rounded-lg bg-coral/15 px-2.5 py-1 text-xs font-extrabold text-coral"
                    >
                      ♡ Wish list
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
        <h3 className="font-display text-lg text-ocean-950">★ Places we&apos;ve visited ({visitedPlaces.length})</h3>
        {visitedPlaces.length === 0 ? (
          <p className="mt-2 text-sm text-ocean-800/80">
            Tap any state or country on the map (or search above) to mark where your family has traveled!
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {visitedPlaces.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPickPlace(f)}
                className="flex items-start justify-between gap-2 rounded-2xl border border-amber/50 bg-amber/10 px-4 py-3 text-left transition hover:bg-amber/20"
              >
                <div>
                  <p className="font-extrabold text-ocean-950">★ {f.name}</p>
                  {visited[f.id]?.note && (
                    <p className="mt-0.5 text-xs font-semibold text-ocean-800">
                      “{visited[f.id].note}”
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-ocean-700">Edit</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {wishPlaces.length > 0 && (
        <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
          <h3 className="font-display text-lg text-ocean-950">♡ Places we want to visit ({wishPlaces.length})</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {wishPlaces.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPickPlace(f)}
                className="flex items-start justify-between gap-2 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3 text-left transition hover:bg-coral/15"
              >
                <div>
                  <p className="font-extrabold text-ocean-950">♡ {f.name}</p>
                  {visited[f.id]?.note && (
                    <p className="mt-0.5 text-xs font-semibold text-ocean-800">
                      “{visited[f.id].note}”
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold text-ocean-700">Edit</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Passport({ explorer, onPick }: { explorer: Explorer; onPick: (f: GeoFact) => void }) {
  const passTheme = getPassportTheme(explorer.passportTheme)
  return (
    <div className="space-y-5">
      {CONTINENT_ORDER.map((region) => {
        const list = FACTS.filter((f) => f.kind === 'country' && f.region === region)
        const got = list.filter((f) => stamped(explorer, f.id)).length
        const complete = got === list.length
        return (
          <section
            key={region}
            className="rounded-3xl border-2 border-dashed p-4 sm:p-5"
            style={{ backgroundColor: passTheme.bg, borderColor: passTheme.border }}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl" style={{ color: passTheme.heading }}>
                {region}
              </h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                  complete ? 'bg-amber text-ocean-950' : 'bg-ocean-900/10 text-ocean-800'
                }`}
              >
                {complete ? '🏅 Continent complete' : `${got}/${list.length} stamps`}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {list.map((f, i) => {
                const has = stamped(explorer, f.id)
                const flag = flagUrl(f.id)
                return has ? (
                  <motion.button
                    key={f.id}
                    type="button"
                    onClick={() => onPick(f)}
                    className="flex flex-col items-center rounded-2xl border-[3px] bg-white p-2 text-center shadow-sm"
                    style={{
                      rotate: `${((i * 37) % 9) - 4}deg`,
                      borderColor: passTheme.stampBorder,
                    }}
                    whileHover={{ scale: 1.05, rotate: 0 }}
                  >
                    {flag && <img src={flag} alt="" className="h-8 w-auto rounded-sm border border-ocean-900/10" />}
                    <span className="mt-1 text-xs font-extrabold leading-tight text-ocean-950">{f.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-coral">{f.capital}</span>
                  </motion.button>
                ) : (
                  <div
                    key={f.id}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ocean-900/15 p-2 text-center"
                  >
                    <span className="flex h-8 w-11 items-center justify-center rounded-sm bg-ocean-900/5 text-lg text-ocean-900/30">?</span>
                    <span className="mt-1 text-xs font-bold leading-tight text-ocean-900/40">
                      {explorer.introduced.includes(f.id) ? f.name : '???'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
      <p className="text-center text-sm font-semibold text-ocean-700">
        A country gets its stamp once you know it well (Strong). Keep up the daily lessons!
      </p>
    </div>
  )
}

function Trophies({ explorer }: { explorer: Explorer }) {
  const results = [...(explorer.bosses ?? [])].reverse()
  const count = (k: 'gold' | 'silver' | 'bronze') =>
    results.filter((r) => trophyFor(r.correct, r.total) === k).length
  return (
    <div className="rounded-3xl bg-white/75 p-5">
      <div className="grid grid-cols-3 gap-3 text-center">
        {(['gold', 'silver', 'bronze'] as const).map((k) => (
          <div key={k} className="rounded-2xl bg-sand-100 py-4">
            <div className="flex justify-center">
              <TrophyIcon kind={k} size={52} />
            </div>
            <div className="font-display text-2xl text-ocean-950">{count(k)}</div>
            <div className="text-xs font-bold uppercase tracking-wide text-ocean-700">{k}</div>
          </div>
        ))}
      </div>
      <h3 className="mt-6 font-display text-lg text-ocean-950">Weekly challenges</h3>
      {results.length === 0 ? (
        <p className="mt-2 text-ocean-800/80">
          No challenges yet. The weekly challenge opens on the home screen once you’ve learned 10 places.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-ocean-900/10">
          {results.map((r) => (
            <li key={r.t} className="flex items-center justify-between py-2 text-sm font-bold text-ocean-900">
              <span className="flex items-center gap-2">
                <TrophyIcon kind={trophyFor(r.correct, r.total)} size={26} />
                {new Date(r.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span>
                {r.correct}/{r.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
