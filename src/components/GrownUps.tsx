import { useMemo, useState, type ReactNode } from 'react'
import { FACTS, UNITS, getUnit } from '../data/curriculum'
import { dueFacts } from '../lib/session'
import { masteryLabel } from '../lib/srs'
import { todayKey, type Explorer } from '../lib/storage'

const DAY = 24 * 60 * 60 * 1000

type Props = { explorers: Explorer[]; onBack: () => void }

/**
 * Chance of remembering a place right now. Intervals are set so that a place
 * comes due at roughly a 90% chance, and memory fades smoothly in between.
 */
function recallChance(explorer: Explorer, factId: string, now: number) {
  const c = explorer.cards[factId]
  if (!c || !c.introducedAt) return null
  const interval = Math.max(c.interval, 0.25) * DAY
  const lastSeen = c.dueAt - interval
  const elapsed = Math.max(0, now - lastSeen)
  return Math.pow(0.9, elapsed / interval)
}

export function GrownUps({ explorers, onBack }: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [puzzle] = useState(() => {
    const a = 6 + Math.floor(Math.random() * 4)
    const b = 6 + Math.floor(Math.random() * 4)
    return { a, b }
  })
  const [guess, setGuess] = useState('')
  const [who, setWho] = useState(explorers[0]?.id)

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <button type="button" onClick={onBack} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
          ← Home
        </button>
        <div className="mt-6 rounded-3xl bg-white/90 p-6 shadow-lg">
          <h1 className="font-display text-2xl text-ocean-950">Grown-ups only</h1>
          <p className="mt-2 text-ocean-800/80">
            What is {puzzle.a} × {puzzle.b}?
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (Number(guess) === puzzle.a * puzzle.b) setUnlocked(true)
              else setGuess('')
            }}
          >
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              inputMode="numeric"
              className="flex-1 rounded-2xl border-2 border-ocean-900/10 bg-sand-100 px-4 py-3 text-lg font-bold outline-none focus:border-sea-300"
              autoFocus
            />
            <button type="submit" className="rounded-2xl bg-ocean-900 px-5 font-extrabold text-sand-100">
              Open
            </button>
          </form>
        </div>
      </div>
    )
  }

  const explorer = explorers.find((e) => e.id === who) ?? explorers[0]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button type="button" onClick={onBack} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
        ← Home
      </button>
      <header className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Grown-ups</p>
          <h1 className="mt-1 font-display text-3xl text-ocean-950">How it’s going</h1>
        </div>
        {explorers.length > 1 && (
          <div className="flex gap-1 rounded-2xl bg-white/70 p-1">
            {explorers.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setWho(e.id)}
                className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                  e.id === explorer.id ? 'bg-ocean-900 text-sand-100' : 'text-ocean-900'
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </header>
      {explorer ? <Report explorer={explorer} /> : <p className="mt-6">No explorers yet.</p>}
      <InstallHelp />
    </div>
  )
}

function Report({ explorer }: { explorer: Explorer }) {
  const [now] = useState(() => Date.now())
  const data = useMemo(() => {
    const learned = FACTS.filter((f) => explorer.introduced.includes(f.id))
    const chances = learned
      .map((f) => recallChance(explorer, f.id, now))
      .filter((x): x is number => x !== null)
    const memory = chances.length ? chances.reduce((a, b) => a + b, 0) / chances.length : null
    const mastered = learned.filter((f) => masteryLabel(explorer.cards[f.id]) === 'Mastered').length
    const dueNow = dueFacts(explorer, now).length

    // Column 0 is what is due now; column d is what comes due within d days.
    const forecast = Array.from({ length: 14 }, (_, d) => {
      const start = d === 0 ? -Infinity : now + (d - 1) * DAY
      const end = d === 0 ? now : now + d * DAY
      return learned.filter((f) => {
        const due = explorer.cards[f.id]?.dueAt ?? 0
        return due >= start && due < end
      }).length
    })

    const log = explorer.log ?? []
    const recent = log.filter((l) => l.t >= now - 30 * DAY)
    const accuracy = recent.length ? recent.filter((l) => l.ok).length / recent.length : null

    const activity = Array.from({ length: 28 }, (_, i) => {
      const day = new Date(now - (27 - i) * DAY)
      const key = todayKey(day)
      return {
        key,
        label: day.toLocaleDateString(undefined, { weekday: 'narrow' }),
        count: log.filter((l) => todayKey(new Date(l.t)) === key).length,
      }
    })

    const trouble = learned
      .map((f) => ({ f, c: explorer.cards[f.id] }))
      .filter(({ c }) => c && c.lapses >= 2)
      .sort((a, b) => b.c.lapses - a.c.lapses)
      .slice(0, 10)

    const units = UNITS.map((u) => {
      const facts = FACTS.filter((f) => f.unitId === u.id)
      const strong = facts.filter((f) => (explorer.cards[f.id]?.repetitions ?? 0) >= 3).length
      const met = facts.filter((f) => explorer.introduced.includes(f.id)).length
      return { u, total: facts.length, strong, met }
    }).filter((x) => x.met > 0)

    return { learned, memory, mastered, dueNow, forecast, accuracy, activity, trouble, units, recentCount: recent.length }
  }, [explorer, now])

  const maxForecast = Math.max(1, ...data.forecast)
  const maxActivity = Math.max(1, ...data.activity.map((a) => a.count))
  const unit = getUnit(explorer.currentUnitId)

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Places learned" value={`${data.learned.length}`} sub={`of ${FACTS.length}`} />
        <Tile label="Mastered" value={`${data.mastered}`} sub="long-term" />
        <Tile
          label="Memory today"
          value={data.memory === null ? '—' : `${Math.round(data.memory * 100)}%`}
          sub="estimated recall"
        />
        <Tile
          label="Last 30 days"
          value={data.accuracy === null ? '—' : `${Math.round(data.accuracy * 100)}%`}
          sub={`${data.recentCount} answers`}
        />
      </div>

      <Card title="Coming up for review" note={`${data.dueNow} due now · now working on ${unit?.title ?? '—'}`}>
        <div className="flex h-32 items-end gap-1.5">
          {data.forecast.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold text-ocean-700">{n || ''}</span>
              <div
                className="w-full rounded-t-md bg-sea-300"
                style={{ height: `${(n / maxForecast) * 90}px`, minHeight: n ? 4 : 0 }}
              />
              <span className="text-[10px] font-bold text-ocean-700">{i === 0 ? 'Now' : `+${i}`}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-ocean-700">
          Days from today. Each place comes back just before it would be forgotten, with longer gaps each
          time it’s remembered.
        </p>
      </Card>

      <Card title="Practice over the last 4 weeks" note={`Daily streak: ${explorer.gentleStreak} days`}>
        <div className="flex h-24 items-end gap-1">
          {data.activity.map((a) => (
            <div key={a.key} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${a.key}: ${a.count} answers`}>
              <div
                className={`w-full rounded-t ${a.count ? 'bg-amber' : 'bg-ocean-900/10'}`}
                style={{ height: a.count ? `${(a.count / maxActivity) * 70 + 6}px` : '4px' }}
              />
              <span className="text-[9px] font-bold text-ocean-700">{a.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="Tricky places" note="Missed two or more times">
          {data.trouble.length === 0 ? (
            <p className="text-sm text-ocean-800/80">Nothing stands out yet. 🎉</p>
          ) : (
            <ul className="divide-y divide-ocean-900/10 text-sm">
              {data.trouble.map(({ f, c }) => (
                <li key={f.id} className="flex justify-between py-1.5 font-bold text-ocean-900">
                  <span>
                    {f.name}
                    {f.capital && <span className="font-semibold text-ocean-700"> · {f.capital}</span>}
                  </span>
                  <span className="text-coral">missed {c.lapses}×</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="By unit" note="Strong = remembered 3+ times in a row">
          <ul className="space-y-2 text-sm">
            {data.units.map(({ u, total, strong }) => (
              <li key={u.id}>
                <div className="flex justify-between font-bold text-ocean-900">
                  <span>{u.title}</span>
                  <span>
                    {strong}/{total}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ocean-900/10">
                  <div className="h-full rounded-full bg-sea-300" style={{ width: `${(strong / total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function InstallHelp() {
  return (
    <Card title="Put Atlas Daily on a tablet’s home screen" note="It works offline once installed">
      <ul className="space-y-1.5 text-sm font-semibold text-ocean-900">
        <li>
          <b>iPad / iPhone (Safari):</b> tap the Share button, then “Add to Home Screen”.
        </li>
        <li>
          <b>Android (Chrome):</b> tap the ⋮ menu, then “Install app” or “Add to Home screen”.
        </li>
        <li>
          <b>Computer (Chrome or Edge):</b> click the install icon at the right end of the address bar.
        </li>
      </ul>
      <p className="mt-2 text-xs font-semibold text-ocean-700">
        Progress is saved on each device separately, so have each child use the same tablet.
      </p>
    </Card>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-ocean-900 px-3 py-4 text-center text-sand-100">
      <div className="font-display text-3xl">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-sea-200/90">{label}</div>
      <div className="text-[11px] font-semibold text-sand-200/70">{sub}</div>
    </div>
  )
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/80 p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl text-ocean-950">{title}</h2>
        {note && <span className="text-xs font-bold text-ocean-700">{note}</span>}
      </div>
      {children}
    </section>
  )
}
