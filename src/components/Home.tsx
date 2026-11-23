import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { UNITS, getUnit } from '../data/curriculum'
import { useApp } from '../state/AppContext'
import {
  bossAvailable,
  daysUntilBoss,
  isUnitUnlocked,
  overallMastery,
  unitProgress,
} from '../lib/storage'
import { dueFacts, sessionMeta } from '../lib/session'
import { TrophyIcon } from './Trophy'
import { UNIT_ICONS } from '../data/unitIcons'

type Props = {
  onStartLesson: () => void
  onOpenProgress: () => void
  onOpenAtlas: () => void
  onStartBoss: () => void
  onOpenDuel: () => void
  onOpenGames: () => void
  onOpenGrownUps: () => void
}

export function Home({
  onStartLesson,
  onOpenProgress,
  onOpenAtlas,
  onStartBoss,
  onOpenDuel,
  onOpenGames,
  onOpenGrownUps,
}: Props) {
  const { state, active, addExplorer, setActiveExplorer } = useApp()
  const [name, setName] = useState('')
  const meta = sessionMeta()

  if (!active) {
    return (
      <section className="relative isolate h-[100svh] max-h-[100svh] overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}world-hero.jpg`}
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
  const due = dueFacts(active).length
  const canBoss = bossAvailable(active)
  const bossWait = daysUntilBoss(active)

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
          <p className="relative mt-3 max-w-lg text-lg text-sand-200/90">
            Watch a few quick map tours, then play to remember them. Places you
            already know come back so they stick.
          </p>
          {due > 0 && (
            <p className="relative mt-3 inline-block rounded-full bg-white/10 px-3 py-1 text-sm font-extrabold text-amber ring-1 ring-white/20">
              {due} {due === 1 ? 'place is' : 'places are'} ready for review
            </p>
          )}
          <div className="relative mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onStartLesson()
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') return
                e.preventDefault()
                onStartLesson()
              }}
              className="relative z-20 rounded-2xl bg-[#e07a5f] px-6 py-3.5 text-lg font-extrabold text-white shadow-lg transition hover:brightness-105"
              style={{ touchAction: 'manipulation' }}
            >
              Start today&apos;s lesson
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                onOpenProgress()
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') return
                e.preventDefault()
                onOpenProgress()
              }}
              className="relative z-20 rounded-2xl bg-white/10 px-5 py-3.5 font-bold text-sand-100 ring-1 ring-white/20 backdrop-blur"
              style={{ touchAction: 'manipulation' }}
            >
              Trail map
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 border-t border-white/10 bg-ocean-950/40">
          <MiniStat label="Streak" value={`${active.gentleStreak}d`} />
          <MiniStat label="Unit" value={`${progress.pct}%`} />
          <MiniStat label="Mastered" value={`${overall.mastered}`} />
          <MiniStat label="Coins" value={`${active.trailCoins}`} />
        </div>
      </motion.section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <HomeTile
          title="Map games"
          sub="7 games and a sticker book"
          onClick={onOpenGames}
          icon={<span className="text-3xl">📍</span>}
        />
        <HomeTile
          title="My Atlas"
          sub="Your map, passport & trophies"
          onClick={onOpenAtlas}
          icon={<span className="text-3xl">🗺️</span>}
        />
        <HomeTile
          title="Weekly challenge"
          sub={
            canBoss
              ? 'Ready! Win a trophy'
              : active.introduced.length < 10
                ? `Opens after 10 places (${active.introduced.length}/10)`
                : `Next one in ${bossWait} day${bossWait === 1 ? '' : 's'}`
          }
          onClick={onStartBoss}
          disabled={!canBoss}
          highlight={canBoss}
          icon={<TrophyIcon kind="gold" size={34} />}
        />
        <HomeTile
          title="Head-to-head"
          sub={state.explorers.length > 1 ? 'Play against a sibling' : 'Add a second explorer to play'}
          onClick={onOpenDuel}
          disabled={state.explorers.length < 2}
          icon={<span className="text-3xl">⚔️</span>}
        />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="font-display text-2xl text-ocean-950">Learning path</h3>
          <p className="text-sm font-semibold text-ocean-700">
            {overall.introduced}/{overall.total} introduced
          </p>
        </div>
        <ol className="relative space-y-3">
          <span
            className="absolute bottom-6 left-[1.6rem] top-6 border-l-[3px] border-dashed border-ocean-900/20"
            aria-hidden
          />
          {UNITS.map((u, i) => {
            const unlocked = isUnitUnlocked(active, u.id)
            const p = unitProgress(active, u.id)
            const current = u.id === active.currentUnitId
            const complete = active.completedUnits.includes(u.id)
            return (
              <motion.li
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative flex items-stretch gap-3"
              >
                <span
                  className={`z-10 mt-1.5 flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border-4 text-2xl shadow-sm ${
                    current
                      ? 'animate-pulse-ring border-amber bg-white'
                      : complete
                        ? 'border-sea-300 bg-white'
                        : unlocked
                          ? 'border-white bg-white'
                          : 'border-white/70 bg-sand-200 grayscale'
                  }`}
                  aria-hidden
                >
                  {unlocked ? UNIT_ICONS[u.id] ?? '🗺️' : '🔒'}
                </span>
                <div
                  className={`flex-1 rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${
                    current
                      ? 'border-amber bg-amber/15 shadow-sm'
                      : unlocked
                        ? 'border-ocean-900/10 bg-white/70'
                        : 'border-transparent bg-white/40 opacity-70'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ocean-700">
                        Stop {i + 1} · {u.theme}
                        {current && ' · you are here'}
                      </p>
                      <p className="font-extrabold text-ocean-950">{u.title}</p>
                      <p className="text-sm text-ocean-800/80">{u.subtitle}</p>
                    </div>
                    <div className="text-right text-sm font-bold text-ocean-800">
                      {complete
                        ? 'Complete ✓'
                        : unlocked
                          ? `${p.strong}/${p.total} strong`
                          : 'Locked'}
                    </div>
                  </div>
                  {unlocked && (
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ocean-900/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sea-300 to-amber"
                        style={{ width: `${complete ? 100 : p.pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </motion.li>
            )
          })}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <AddExplorer />
        <button
          type="button"
          onClick={onOpenGrownUps}
          className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-700"
        >
          Grown-ups
        </button>
      </div>
    </div>
  )
}


function HomeTile({
  title,
  sub,
  icon,
  onClick,
  disabled,
  highlight,
}: {
  title: string
  sub: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 ${
        highlight
          ? 'animate-pulse-ring border-amber bg-amber/20'
          : 'border-ocean-900/10 bg-white/75 hover:bg-white'
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">{icon}</span>
      <span>
        <span className="block font-extrabold text-ocean-950">{title}</span>
        <span className="block text-sm font-semibold text-ocean-700">{sub}</span>
      </span>
    </button>
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
        className="text-sm font-bold text-ocean-700 underline-offset-2 hover:underline"
      >
        Add another explorer
      </button>
    )
  }
  return (
    <form
      className="flex flex-wrap gap-2"
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

