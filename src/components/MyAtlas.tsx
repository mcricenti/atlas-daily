import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FACTS, type GeoFact } from '../data/curriculum'
import { flagUrl } from '../data/flags'
import {
  MAP_H,
  MAP_W,
  buildAtlas,
  isUsFact,
  loadTopo,
  shapeKeyForFact,
  type Atlas,
} from '../lib/geoData'
import { masteryLabel } from '../lib/srs'
import { trophyFor, type Explorer } from '../lib/storage'
import { TourModal } from './TourModal'
import { TrophyIcon } from './Trophy'

type Tab = 'us' | 'world' | 'passport' | 'trophies'

type Level = 'new' | 'learning' | 'strong' | 'mastered'

const LEVEL_COLOR: Record<Level, string> = {
  new: '#ddd0ba',
  learning: '#f6c453',
  strong: '#8fd3b0',
  mastered: '#2f9e6e',
}

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

type Props = { explorer: Explorer; onBack: () => void }

export function MyAtlas({ explorer, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('us')
  const [tourFact, setTourFact] = useState<GeoFact | null>(null)

  const states = FACTS.filter(isUsFact)
  const countries = FACTS.filter((f) => f.kind === 'country')
  const coloredStates = states.filter((f) => levelOf(explorer, f.id) !== 'new').length
  const stamps = countries.filter((f) => stamped(explorer, f.id)).length
  const trophies = (explorer.bosses ?? []).filter((b) => trophyFor(b.correct, b.total)).length

  const tabs: { id: Tab; label: string; count: string }[] = [
    { id: 'us', label: 'U.S. map', count: `${coloredStates}/50` },
    { id: 'world', label: 'World map', count: `${countries.filter((f) => levelOf(explorer, f.id) !== 'new').length}/${countries.length}` },
    { id: 'passport', label: 'Passport', count: `${stamps} stamps` },
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
          {explorer.name}&apos;s world
        </h1>
        <p className="mt-2 text-ocean-800/80">
          Every place you learn gets colored in. Keep practicing to turn it dark green!
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist">
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
            <MasteryMap key={tab} kind={tab} explorer={explorer} onPick={setTourFact} />
            <Legend />
            {tab === 'world' && <WorldExtras explorer={explorer} onPick={setTourFact} />}
          </>
        )}
        {tab === 'passport' && <Passport explorer={explorer} onPick={setTourFact} />}
        {tab === 'trophies' && <Trophies explorer={explorer} />}
      </div>

      {tourFact && <TourModal fact={tourFact} onClose={() => setTourFact(null)} />}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-ocean-800">
      {(Object.keys(LEVEL_COLOR) as Level[]).map((l) => (
        <span key={l} className="flex items-center gap-1.5">
          <span
            className="h-4 w-4 rounded border border-ocean-900/20"
            style={{ backgroundColor: LEVEL_COLOR[l] }}
          />
          {LEVEL_NAME[l]}
        </span>
      ))}
      <span className="text-xs font-semibold text-ocean-700">Tap a colored place to rewatch its tour</span>
    </div>
  )
}

function MasteryMap({
  kind,
  explorer,
  onPick,
}: {
  kind: 'us' | 'world'
  explorer: Explorer
  onPick: (f: GeoFact) => void
}) {
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
    <div className="overflow-hidden rounded-3xl border border-ocean-900/15 bg-ocean-900 shadow-lg">
      <svg viewBox={`0 ${kind === 'world' ? 40 : 0} ${MAP_W} ${kind === 'world' ? MAP_H - 120 : MAP_H}`} className="h-auto w-full" role="img" aria-label="Map colored by what you know">
        <rect width={MAP_W} height={MAP_H} fill="#0f5363" />
        {atlas.shapes.map((s) => {
          const fact = factByKey.get(s.key)
          const level = fact ? levelOf(explorer, fact.id) : null
          const tappable = fact && level !== 'new'
          return (
            <path
              key={s.key}
              d={s.d}
              fill={level ? LEVEL_COLOR[level] : '#b9ab94'}
              stroke="#5b4a35"
              strokeWidth={0.5}
              strokeOpacity={0.6}
              vectorEffect="non-scaling-stroke"
              style={tappable ? { cursor: 'pointer' } : undefined}
              onClick={() => tappable && onPick(fact)}
            >
              <title>
                {fact ? `${fact.name}: ${LEVEL_NAME[level!]}` : s.label}
              </title>
            </path>
          )
        })}
      </svg>
    </div>
  )
}

function WorldExtras({ explorer, onPick }: { explorer: Explorer; onPick: (f: GeoFact) => void }) {
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
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={level === 'new'}
                  onClick={() => onPick(f)}
                  className="rounded-full border-2 px-3 py-1 text-sm font-bold text-ocean-950 disabled:opacity-50"
                  style={{
                    backgroundColor: LEVEL_COLOR[level] + (level === 'new' ? '' : '55'),
                    borderColor: LEVEL_COLOR[level],
                  }}
                >
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

function Passport({ explorer, onPick }: { explorer: Explorer; onPick: (f: GeoFact) => void }) {
  return (
    <div className="space-y-5">
      {CONTINENT_ORDER.map((region) => {
        const list = FACTS.filter((f) => f.kind === 'country' && f.region === region)
        const got = list.filter((f) => stamped(explorer, f.id)).length
        const complete = got === list.length
        return (
          <section key={region} className="rounded-3xl border-2 border-dashed border-ocean-900/15 bg-[#fbf6ea] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl text-ocean-950">{region}</h3>
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
                    className="flex flex-col items-center rounded-2xl border-[3px] border-coral/70 bg-white p-2 text-center shadow-sm"
                    style={{ rotate: `${((i * 37) % 9) - 4}deg` }}
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
