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
      <section className="relative isolate h-[100svh] max-h-[100svh] overflow-hidden">
        <img
          src="/world-hero.jpg"
          alt="Illustrated Earth from space"
          className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_35%]"
          decoding="async"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-ocean-950/30 via-ocean-900/50 to-ocean-950/92"
          aria-hidden
        />
        <div
          className="animate-drift-glow absolute -left-16 top-24 h-56 w-56 rounded-full bg-sea-300/30 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-drift-glow absolute -right-10 bottom-28 h-64 w-64 rounded-full bg-amber/25 blur-3xl [animation-delay:1.5s]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex h-full max-w-2xl flex-col justify-end px-4 pb-10 pt-14 sm:justify-center sm:pb-16 sm:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="text-center"
          >
            <motion.p
              className="brand-title animate-title-bounce mx-auto text-[clamp(3.4rem,14vw,6rem)]"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 160, damping: 14 }}
            >
              Atlas Daily
            </motion.p>
            <h1 className="mt-4 font-display text-2xl leading-snug text-sand-100 sm:text-3xl">
              Ten minutes to master the map
            </h1>
            <p className="mx-auto mt-3 max-w-md text-base font-semibold text-sand-200/90 sm:text-lg">
              States, capitals, continents, oceans, and more — one short
              adventure a day.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.45 }}
            className="mt-8 rounded-[1.75rem] border border-white/25 bg-white/95 p-5 shadow-xl backdrop-blur-md sm:p-6"
            onSubmit={(e) => {
              e.preventDefault()
              addExplorer(name)
            }}
          >
            <label className="block text-left text-sm font-extrabold text-ocean-900">
              Explorer name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya"
                className="mt-2 w-full rounded-2xl border-2 border-ocean-900/10 bg-sand-100 px-4 py-3 text-lg font-semibold text-ocean-950 outline-none focus:border-sea-300"
                autoFocus
              />
            </label>
            <button
              type="submit"
              className="mt-4 w-full rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white shadow-md transition hover:brightness-105"
            >
              Start exploring
            </button>
          </motion.form>
        </div>
      </section>
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
              onClick={onStartLesson}
              onPointerDown={(e) => {
                if (e.pointerType === 'touch') e.preventDefault()
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') return
                onStartLesson()
              }}
              className="relative z-20 rounded-2xl bg-[#e07a5f] px-6 py-3.5 text-lg font-extrabold text-white shadow-lg transition hover:brightness-105"
              style={{ touchAction: 'manipulation' }}
            >
              Start today&apos;s lesson
            </button>
            <button
              type="button"
              onClick={onOpenProgress}
              onPointerDown={(e) => {
                if (e.pointerType === 'touch') e.preventDefault()
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') return
                onOpenProgress()
              }}
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

