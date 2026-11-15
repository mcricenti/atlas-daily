import { useState } from 'react'
import { motion } from 'framer-motion'
import { UNITS, getUnit } from '../data/curriculum'
import { useApp } from '../state/AppContext'
import {
  isUnitUnlocked,
  overallMastery,
  unitProgress,
} from '../lib/storage'
import { sessionMeta } from '../lib/session'

type Props = {
  onStartLesson: () => void
  onOpenProgress: () => void
}

export function Home({ onStartLesson, onOpenProgress }: Props) {
  const { state, active, addExplorer, setActiveExplorer } = useApp()
  const [name, setName] = useState('')
  const meta = sessionMeta()

  if (!active) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 animate-float items-center justify-center rounded-full bg-ocean-900 shadow-lg">
            <GlobeMark />
          </div>
          <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-coral">
            Atlas Daily
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-ocean-950 sm:text-5xl">
            Ten minutes to master the map
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-ocean-800/85">
            Direct instruction plus spaced repetition — states, capitals,
            continents, oceans, rivers, Europe, and Africa.
          </p>
        </motion.div>

        <form
          className="mt-10 rounded-3xl bg-white/80 p-6 shadow-md backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault()
            addExplorer(name)
          }}
        >
          <label className="block text-left text-sm font-bold text-ocean-900">
            Explorer name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya"
              className="mt-2 w-full rounded-2xl border-2 border-ocean-900/10 bg-sand-100 px-4 py-3 text-lg font-semibold outline-none focus:border-sea-300"
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white shadow-md"
          >
            Start exploring
          </button>
        </form>
      </div>
    )
  }

  const unit = getUnit(active.currentUnitId)!
  const progress = unitProgress(active, active.currentUnitId)
  const overall = overallMastery(active)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-coral">
            Atlas Daily
          </p>
          <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl">
            Hi, {active.name}
          </h1>
          <p className="mt-1 text-ocean-800/80">
            Today&apos;s trail: {unit.title}
          </p>
        </div>
        {state.explorers.length > 1 && (
          <select
            value={active.id}
            onChange={(e) => setActiveExplorer(e.target.value)}
            className="rounded-xl border border-ocean-900/15 bg-white/80 px-3 py-2 text-sm font-bold"
          >
            {state.explorers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 overflow-hidden rounded-[2rem] border border-ocean-900/10 bg-ocean-900 text-sand-100 shadow-xl"
      >
        <div className="relative p-6 sm:p-8">
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-sea-300/20 blur-2xl" />
          <div className="absolute -bottom-12 left-10 h-36 w-36 rounded-full bg-amber/20 blur-2xl" />
          <p className="relative text-sm font-bold uppercase tracking-[0.18em] text-sea-300">
            Daily lesson · ~{meta.minutes} min
          </p>
          <h2 className="relative mt-2 font-display text-3xl sm:text-4xl">
            {unit.subtitle}
          </h2>
          <p className="relative mt-3 max-w-lg text-sand-200/90">
            Learn a few new places (I do), practice together (we do), then locate
            and recall on your own — with spaced review of what you already know.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onStartLesson()}
              className="relative z-20 rounded-2xl bg-[#e07a5f] px-6 py-3.5 text-lg font-extrabold text-white shadow-lg transition hover:brightness-105"
              style={{ touchAction: 'manipulation' }}
            >
              Start today&apos;s lesson
            </button>
            <button
              type="button"
              onClick={() => onOpenProgress()}
              className="relative z-20 rounded-2xl bg-white/10 px-5 py-3.5 font-bold text-sand-100 ring-1 ring-white/20 backdrop-blur"
              style={{ touchAction: 'manipulation' }}
            >
              Trail map
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/10 bg-ocean-950/40">
          <MiniStat label="Unit" value={`${progress.pct}%`} />
          <MiniStat label="Mastered" value={`${overall.mastered}`} />
          <MiniStat label="Coins" value={`${active.trailCoins}`} />
        </div>
      </motion.section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="font-display text-2xl text-ocean-950">Learning path</h3>
          <p className="text-sm font-semibold text-ocean-700">
            {overall.introduced}/{overall.total} introduced
          </p>
        </div>
        <div className="space-y-3">
          {UNITS.map((u, i) => {
            const unlocked = isUnitUnlocked(active, u.id)
            const p = unitProgress(active, u.id)
            const current = u.id === active.currentUnitId
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${
                  current
                    ? 'border-amber bg-amber/15'
                    : unlocked
                      ? 'border-ocean-900/10 bg-white/70'
                      : 'border-transparent bg-white/40 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-ocean-700">
                      {u.theme}
                      {!unlocked && ' · locked'}
                      {current && ' · current'}
                    </p>
                    <p className="font-extrabold text-ocean-950">{u.title}</p>
                  </div>
                  <div className="text-right text-sm font-bold text-ocean-800">
                    {unlocked ? `${p.strong}/${p.total} strong` : 'Complete prior unit'}
                  </div>
                </div>
                {unlocked && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ocean-900/10">
                    <div
                      className="h-full rounded-full bg-sea-300"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      <AddExplorer />
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="font-display text-xl">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-sea-200/80">
        {label}
      </div>
    </div>
  )
}

function AddExplorer() {
  const { addExplorer } = useApp()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 text-sm font-bold text-ocean-700 underline-offset-2 hover:underline"
      >
        Add another explorer
      </button>
    )
  }
  return (
    <form
      className="mt-8 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        addExplorer(name)
        setName('')
        setOpen(false)
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sibling name"
        className="rounded-xl border border-ocean-900/15 bg-white px-3 py-2 text-sm font-semibold"
      />
      <button
        type="submit"
        className="rounded-xl bg-ocean-900 px-4 py-2 text-sm font-bold text-sand-100"
      >
        Add
      </button>
    </form>
  )
}

function GlobeMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="32" cy="32" rx="18" ry="30" stroke="#7ED6C1" strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="30" ry="12" stroke="#F4A261" strokeWidth="3" />
      <circle cx="32" cy="32" r="3.5" fill="#F4A261" />
    </svg>
  )
}
