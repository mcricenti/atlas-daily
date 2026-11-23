import { useMemo, useState } from 'react'
import { FACTS, type GeoFact } from '../data/curriculum'
import { UNIT_ICONS } from '../data/unitIcons'
import {
  EXPERT_UNLOCK,
  STAMP_AT,
  applyGameResults,
  bestKey,
  buildModeRound,
  decksFor,
  factsForMode,
  lockReason,
  newStamps,
  saveBest,
  shuffle,
  type Deck,
  type GameMode,
  type GameResult,
} from '../lib/mapGames'
import type { Explorer } from '../lib/storage'
import { Confetti } from './Confetti'
import { DuelGame } from './games/DuelGame'
import { FillGame } from './games/FillGame'
import { DUEL_ROUND, formatTime } from './games/gameKit'
import { NeighborsGame } from './games/NeighborsGame'
import { StickerBook, Sticker } from './games/StickerBook'
import { QuizRound, type QuizMode } from './games/QuizRound'

type Props = {
  explorer: Explorer
  explorers: Explorer[]
  onUpdate: (e: Explorer) => void
  onBack: () => void
}

const MODES: { id: GameMode; title: string; sub: string; icon: string }[] = [
  { id: 'find', title: 'Find it!', sub: 'See a name, tap the place', icon: '👆' },
  { id: 'name', title: 'What’s this?', sub: 'A place lights up — name it', icon: '🔍' },
  { id: 'capitals', title: 'Capitals', sub: 'Match places and capitals', icon: '🏛️' },
  { id: 'neighbors', title: 'Neighbors', sub: 'Tap everything that touches it', icon: '🤝' },
  { id: 'fill', title: 'Fill the map', sub: 'Race the clock', icon: '⏱️' },
  { id: 'blank', title: 'Expert map', sub: 'No dots, no hints, one try', icon: '🎯' },
  { id: 'duel', title: 'Duel', sub: 'Pass the tablet — closest tap wins', icon: '⚔️' },
]

const MODE_TITLE = Object.fromEntries(MODES.map((m) => [m.id, m.title])) as Record<GameMode, string>
const QUIZ_MODES = new Set<GameMode>(['find', 'name', 'capitals', 'blank'])

type Ended = {
  mode: GameMode
  deck: Deck
  facts: GeoFact[]
  results: GameResult[]
  seconds?: number
  coins: number
  stamps: GeoFact[]
  newBest: boolean
  expertUnlocked: boolean
  best?: number
}

type View =
  | { type: 'picker' }
  | { type: 'stickers' }
  | { type: 'play'; mode: GameMode; deck: Deck; facts: GeoFact[]; n: number }
  | { type: 'duel-setup'; deck: Deck }
  | { type: 'duel'; deck: Deck; players: [string, string]; facts: GeoFact[]; n: number }
  | { type: 'end'; ended: Ended }
  | { type: 'parent'; ended: Ended }
  | { type: 'compare'; ended: Ended; parent: GameResult[]; parentSeconds?: number }

export function MapGames({ explorer, explorers, onUpdate, onBack }: Props) {
  const [mode, setMode] = useState<GameMode>('find')
  const [view, setView] = useState<View>({ type: 'picker' })
  const decks = useMemo(() => decksFor(explorer), [explorer])
  const toPicker = () => setView({ type: 'picker' })

  function start(m: GameMode, deck: Deck) {
    if (m === 'duel') {
      setView({ type: 'duel-setup', deck })
      return
    }
    const facts =
      m === 'fill'
        ? factsForMode(m, deck)
        : m === 'neighbors'
          ? shuffle(factsForMode(m, deck))
          : buildModeRound(explorer, m, deck)
    setView({ type: 'play', mode: m, deck, facts, n: Date.now() })
  }

  function finished(m: GameMode, deck: Deck, facts: GeoFact[], results: GameResult[], seconds?: number) {
    let next = applyGameResults(explorer, results, m)
    const stars = results.reduce((s, r) => s + r.stars, 0)
    const max = results.length * 2
    const key = bestKey(m, deck.id)
    const oldBest = explorer.gameBests?.[key]
    let newBest = false
    let coins = 3
    if (m === 'fill' && seconds !== undefined) {
      newBest = oldBest === undefined || seconds < oldBest
      next = saveBest(next, key, seconds, true)
      if (newBest && oldBest !== undefined) coins += 2
    } else {
      const pct = max ? Math.round((stars / max) * 100) : 0
      newBest = oldBest === undefined || pct > oldBest
      next = saveBest(next, key, pct)
      if (stars === max) coins += 2
    }
    const findBefore = explorer.gameBests?.[bestKey('find', deck.id)] ?? 0
    const findAfter = next.gameBests?.[bestKey('find', deck.id)] ?? 0
    next.trailCoins += coins
    const stamped = newStamps(explorer, next)
      .map((id) => FACTS.find((f) => f.id === id))
      .filter(Boolean) as GeoFact[]
    onUpdate(next)
    setView({
      type: 'end',
      ended: {
        mode: m,
        deck,
        facts,
        results,
        seconds,
        coins,
        stamps: stamped,
        newBest: newBest && oldBest !== undefined,
        expertUnlocked: m === 'find' && findBefore < EXPERT_UNLOCK && findAfter >= EXPERT_UNLOCK,
        best: m === 'fill' ? next.gameBests?.[key] : undefined,
      },
    })
  }

  // ── Screens ──

  if (view.type === 'stickers') return <StickerBook explorer={explorer} onBack={toPicker} />

  if (view.type === 'play') {
    const { mode: m, deck, facts } = view
    if (QUIZ_MODES.has(m)) {
      return (
        <QuizRound
          key={view.n}
          mode={m as QuizMode}
          deck={deck}
          facts={facts}
          onExit={toPicker}
          onFinish={(r) => finished(m, deck, facts, r)}
        />
      )
    }
    if (m === 'neighbors') {
      return <NeighborsGame key={view.n} facts={facts} onExit={toPicker} onFinish={(r) => finished(m, deck, facts, r)} />
    }
    return (
      <FillGame
        key={view.n}
        facts={facts}
        best={explorer.gameBests?.[bestKey('fill', deck.id)]}
        onExit={toPicker}
        onFinish={(r, s) => finished(m, deck, facts, r, s)}
      />
    )
  }

  if (view.type === 'duel-setup') {
    const deck = view.deck
    return (
      <DuelSetup
        explorer={explorer}
        explorers={explorers}
        deck={deck}
        onExit={toPicker}
        onStart={(players) =>
          setView({ type: 'duel', deck, players, facts: buildModeRound(explorer, 'find', deck, DUEL_ROUND), n: Date.now() })
        }
      />
    )
  }

  if (view.type === 'duel') {
    return (
      <DuelGame
        key={view.n}
        players={view.players}
        facts={view.facts}
        onExit={toPicker}
        onAgain={() => setView({ ...view, facts: buildModeRound(explorer, 'find', view.deck, DUEL_ROUND), n: Date.now() })}
      />
    )
  }

  if (view.type === 'end') {
    const { ended } = view
    return (
      <RoundEnd
        ended={ended}
        onAgain={() => start(ended.mode, ended.deck)}
        onExit={toPicker}
        onParent={
          QUIZ_MODES.has(ended.mode) || ended.mode === 'fill' ? () => setView({ type: 'parent', ended }) : undefined
        }
      />
    )
  }

  if (view.type === 'parent') {
    const { ended } = view
    if (ended.mode === 'fill') {
      return (
        <FillGame
          facts={ended.facts}
          onExit={() => setView({ type: 'end', ended })}
          onFinish={(r, s) => setView({ type: 'compare', ended, parent: r, parentSeconds: s })}
        />
      )
    }
    return (
      <QuizRound
        mode={ended.mode as QuizMode}
        deck={ended.deck}
        facts={ended.results.map((r) => r.fact)}
        player="Grown-up’s turn"
        exitLabel="← Back"
        onExit={() => setView({ type: 'end', ended })}
        onFinish={(r) => setView({ type: 'compare', ended, parent: r })}
      />
    )
  }

  if (view.type === 'compare') {
    return (
      <Compare
        kidName={explorer.name}
        ended={view.ended}
        parent={view.parent}
        parentSeconds={view.parentSeconds}
        onExit={toPicker}
      />
    )
  }

  // Picker
  const stampCount = Object.values(explorer.stamps ?? {}).filter((n) => n >= STAMP_AT).length
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
          ← Home
        </button>
        <button
          type="button"
          onClick={() => setView({ type: 'stickers' })}
          className="rounded-xl bg-[#1d3557] px-3 py-2 text-sm font-extrabold text-sand-100"
        >
          🏷️ Sticker book · {stampCount}
        </button>
      </div>
      <header className="mt-6">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Map games</p>
        <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl">Pick a game</h1>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MODES.map((m) => {
          const on = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-3 rounded-3xl border-4 px-3 py-3 text-left transition ${
                on ? 'border-amber bg-white shadow-md' : 'border-transparent bg-white/60 hover:bg-white/80'
              }`}
            >
              <span className="text-3xl" aria-hidden>
                {m.icon}
              </span>
              <span>
                <span className="block font-display text-lg leading-tight text-ocean-950 sm:text-xl">{m.title}</span>
                <span className="text-xs font-semibold text-ocean-800/80">{m.sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      <h2 className="mt-8 font-display text-2xl text-ocean-950">Which map?</h2>
      <p className="text-sm font-semibold text-ocean-700">New maps open up as you learn more places in your daily lessons.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {decks.map((d) => {
          const reason = lockReason(mode, d, explorer)
          const ok = reason === null
          const icon = d.id === 'mix' ? '⭐' : UNIT_ICONS[d.id] ?? '🗺️'
          const best = explorer.gameBests?.[bestKey(mode, d.id)]
          const count = factsForMode(mode, d).length
          return (
            <button
              key={d.id}
              type="button"
              disabled={!ok}
              onClick={() => start(mode, d)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                ok ? 'bg-white/85 shadow-sm hover:bg-white' : 'bg-white/35 opacity-60'
              } ${d.id === 'mix' ? 'sm:col-span-2' : ''}`}
            >
              <span className={`text-2xl ${ok ? '' : 'grayscale'}`} aria-hidden>
                {ok ? icon : '🔒'}
              </span>
              <span className="flex-1">
                <span className="block font-extrabold text-ocean-950">
                  {d.id === 'mix' && (mode === 'fill' || mode === 'neighbors') ? 'All my U.S. states' : d.title}
                </span>
                <span className="text-xs font-bold text-ocean-700">
                  {reason ?? `${count} place${count === 1 ? '' : 's'}`}
                  {ok && best !== undefined && (mode === 'fill' ? ` · best ${formatTime(best)}` : mode !== 'duel' ? ` · best ${best}%` : '')}
                </span>
              </span>
              {ok && <span className="font-extrabold text-coral">Play ›</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Round end ────────────────────────────────────────────────────

function RoundEnd({
  ended,
  onAgain,
  onExit,
  onParent,
}: {
  ended: Ended
  onAgain: () => void
  onExit: () => void
  onParent?: () => void
}) {
  const stars = ended.results.reduce((s, r) => s + r.stars, 0)
  const max = ended.results.length * 2
  const pct = max ? stars / max : 0
  const missed = ended.results.filter((r) => r.stars < 2).map((r) => r.fact)
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {(pct >= 0.7 || ended.stamps.length > 0 || ended.newBest) && <Confetti />}
      <div className="rounded-3xl bg-white/90 p-6 text-center shadow-lg sm:p-8">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">
          {MODE_TITLE[ended.mode]} · {ended.deck.title}
        </p>
        <h1 className="mt-2 font-display text-4xl text-ocean-950">
          {pct === 1 ? 'Perfect round!' : pct >= 0.7 ? 'Great job!' : pct >= 0.4 ? 'Nice work!' : 'Good practice!'}
        </h1>
        {ended.seconds !== undefined ? (
          <p className="mt-3 font-display text-5xl text-ocean-950">⏱️ {formatTime(ended.seconds)}</p>
        ) : (
          <p className="mt-3 text-5xl" aria-label={`${stars} of ${max} stars`}>
            ⭐ <span className="font-display text-ocean-950">{stars}</span>
            <span className="text-2xl text-ocean-700"> / {max}</span>
          </p>
        )}
        {ended.newBest && <p className="mt-2 text-lg font-extrabold text-coral">New personal best!</p>}
        {ended.seconds !== undefined && ended.best !== undefined && !ended.newBest && (
          <p className="mt-1 text-sm font-bold text-ocean-700">Best: {formatTime(ended.best)}</p>
        )}
        <p className="mt-2 text-sm font-bold text-ocean-700">+{ended.coins} coins</p>

        {ended.expertUnlocked && (
          <p className="mt-4 rounded-2xl bg-amber/25 p-3 font-extrabold text-ocean-950">
            🎯 You unlocked the Expert map for {ended.deck.title}!
          </p>
        )}

        {ended.stamps.length > 0 && (
          <div className="mt-5 rounded-2xl bg-[#fbf6ea] p-4">
            <p className="font-extrabold text-ocean-950">New sticker{ended.stamps.length > 1 ? 's' : ''} for your sticker book!</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {ended.stamps.map((f) => (
                <Sticker key={f.id} fact={f} earned />
              ))}
            </div>
          </div>
        )}

        {missed.length > 0 && (
          <div className="mt-5 rounded-2xl bg-sand-100 p-4 text-left">
            <p className="text-sm font-extrabold text-ocean-900">Places to look at again:</p>
            <p className="mt-1 text-sm font-semibold text-ocean-800">{missed.map((f) => f.name).join(', ')}</p>
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onAgain} className="rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white">
            Play again
          </button>
          <button type="button" onClick={onExit} className="rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100">
            Other games
          </button>
          {onParent && (
            <button
              type="button"
              onClick={onParent}
              className="rounded-2xl border-4 border-amber bg-amber/15 py-3 text-lg font-extrabold text-ocean-950 sm:col-span-2"
            >
              🧑‍🧒 Grown-up, beat that!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Compare({
  kidName,
  ended,
  parent,
  parentSeconds,
  onExit,
}: {
  kidName: string
  ended: Ended
  parent: GameResult[]
  parentSeconds?: number
  onExit: () => void
}) {
  const timed = ended.seconds !== undefined && parentSeconds !== undefined
  const kid = timed ? ended.seconds! : ended.results.reduce((s, r) => s + r.stars, 0)
  const grown = timed ? parentSeconds! : parent.reduce((s, r) => s + r.stars, 0)
  const kidWins = timed ? kid < grown : kid > grown
  const tie = kid === grown
  const show = (v: number) => (timed ? formatTime(v) : `⭐ ${v}`)
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {(kidWins || tie) && <Confetti />}
      <div className="rounded-3xl bg-white/90 p-6 text-center shadow-lg sm:p-8">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Grown-up challenge</p>
        <h1 className="mt-2 font-display text-4xl text-ocean-950">
          {tie ? 'It’s a tie!' : kidWins ? `${kidName} wins!` : 'The grown-up wins this time!'}
        </h1>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#3a86ff] p-4 text-white">
            <p className="text-lg font-extrabold">{kidName}</p>
            <p className="font-display text-3xl">{show(kid)}</p>
          </div>
          <div className="rounded-2xl bg-[#d63384] p-4 text-white">
            <p className="text-lg font-extrabold">Grown-up</p>
            <p className="font-display text-3xl">{show(grown)}</p>
          </div>
        </div>
        <button type="button" onClick={onExit} className="mt-6 w-full rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100">
          Other games
        </button>
      </div>
    </div>
  )
}

// ── Duel setup ───────────────────────────────────────────────────

function DuelSetup({
  explorer,
  explorers,
  deck,
  onExit,
  onStart,
}: {
  explorer: Explorer
  explorers: Explorer[]
  deck: Deck
  onExit: () => void
  onStart: (players: [string, string]) => void
}) {
  const others = explorers.filter((e) => e.id !== explorer.id).map((e) => e.name)
  const options = [...others, 'Grown-up', 'Friend']
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <button type="button" onClick={onExit} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
        ← Games
      </button>
      <div className="mt-6 rounded-3xl bg-white/90 p-6 text-center shadow-lg">
        <p className="text-5xl" aria-hidden>
          ⚔️
        </p>
        <h1 className="mt-2 font-display text-3xl text-ocean-950">Who is playing {explorer.name}?</h1>
        <p className="mt-1 text-sm font-semibold text-ocean-700">
          {deck.title} · {DUEL_ROUND} places. Take turns tapping — a right tap is 3 points, the closer miss is 1.
        </p>
        <div className="mt-5 grid gap-2">
          {options.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onStart([explorer.name, name])}
              className="rounded-2xl bg-[#d63384] py-3.5 text-lg font-extrabold text-white"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
