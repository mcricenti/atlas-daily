import { UNITS, factsForUnit } from '../data/curriculum'
import { useApp } from '../state/AppContext'
import { masteryLabel } from '../lib/srs'
import { isUnitUnlocked, overallMastery, unitProgress } from '../lib/storage'

type Props = {
  onBack: () => void
  onStartLesson: () => void
}

export function Progress({ onBack, onStartLesson }: Props) {
  const { active, resetProgress } = useApp()
  if (!active) return null

  const overall = overallMastery(active)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
      >
        ← Home
      </button>

      <header className="mt-6">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">
          Trail map
        </p>
        <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl">
          {active.name}&apos;s atlas
        </h1>
        <p className="mt-2 text-ocean-800/80">
          Spaced repetition keeps places returning until they stick — no rush,
          just a steady trail.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Sessions" value={String(active.sessionsCompleted)} />
        <Tile label="Gentle streak" value={`${active.gentleStreak}d`} />
        <Tile label="Mastered" value={`${overall.mastered}`} />
        <Tile label="Trail coins" value={String(active.trailCoins)} />
      </div>

      <div className="mt-8 space-y-6">
        {UNITS.map((unit) => {
          const unlocked = isUnitUnlocked(active, unit.id)
          const p = unitProgress(active, unit.id)
          const facts = factsForUnit(unit.id)
          return (
            <section
              key={unit.id}
              className={`rounded-3xl border bg-white/75 p-5 ${
                unlocked ? 'border-ocean-900/10' : 'border-transparent opacity-55'
              }`}
            >
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl text-ocean-950">
                    {unit.title}
                  </h2>
                  <p className="text-sm text-ocean-700">{unit.subtitle}</p>
                </div>
                <p className="text-sm font-bold text-ocean-800">
                  {unlocked ? `${p.pct}% strong` : 'Locked'}
                </p>
              </div>
              {unlocked && (
                <>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-ocean-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sea-300 to-amber"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {facts.map((fact) => {
                      const card = active.cards[fact.id]
                      const label = masteryLabel(
                        active.introduced.includes(fact.id) ? card : undefined,
                      )
                      return (
                        <li
                          key={fact.id}
                          className="flex items-center justify-between rounded-xl bg-sand-100 px-3 py-2 text-sm"
                        >
                          <span className="font-bold text-ocean-950">
                            {fact.name}
                            {fact.capital ? (
                              <span className="font-semibold text-ocean-700">
                                {' '}
                                · {fact.capital}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={`ml-2 shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                              label === 'Mastered'
                                ? 'bg-sea-300/40 text-ocean-900'
                                : label === 'Strong'
                                  ? 'bg-amber/30 text-ocean-900'
                                  : label === 'Learning' || label === 'Introduced'
                                    ? 'bg-ocean-900/10 text-ocean-800'
                                    : 'bg-white text-ocean-700'
                            }`}
                          >
                            {label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </section>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStartLesson}
          className="rounded-2xl bg-coral px-5 py-3 font-extrabold text-white"
        >
          Practice today
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                `Reset all progress for ${active.name}? This cannot be undone.`,
              )
            ) {
              resetProgress()
              onBack()
            }
          }}
          className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-ocean-700"
        >
          Reset this explorer
        </button>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ocean-900 px-3 py-4 text-center text-sand-100">
      <div className="font-display text-2xl">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-sea-200/80">
        {label}
      </div>
    </div>
  )
}
