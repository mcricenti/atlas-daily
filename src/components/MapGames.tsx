import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FACTS, type GeoFact } from '../data/curriculum'
import { UNIT_ICONS } from '../data/unitIcons'
import { buildAtlas, cameraToViewBox, loadTopo, anchorForFact, MAP_W, type Atlas, type Camera } from '../lib/geoData'
import {
  ROUND_SIZE,
  MIN_DECK,
  buildRound,
  centerFor,
  choicesFor,
  deckPlayable,
  decksFor,
  describeTap,
  findPrompt,
  highlightFor,
  kindHint,
  mapKindFor,
  namePrompt,
  tapFinds,
  theName,
  viewFor,
  type Deck,
  type GameMode,
  type Highlight,
  type Tap,
} from '../lib/mapGames'
import { loadVoicePref, speak } from '../lib/narrator'
import { logAnswer, type AnswerLog, type Explorer } from '../lib/storage'
import { Confetti } from './Confetti'

type Props = {
  explorer: Explorer
  onUpdate: (e: Explorer) => void
  onBack: () => void
}

const MODES: { id: GameMode; title: string; sub: string; icon: string }[] = [
  { id: 'find', title: 'Find it!', sub: 'See a name, tap the place on the map', icon: '👆' },
  { id: 'name', title: 'What’s this?', sub: 'A place lights up — pick its name', icon: '🔍' },
]

export function MapGames({ explorer, onUpdate, onBack }: Props) {
  const [mode, setMode] = useState<GameMode>('find')
  const [deck, setDeck] = useState<Deck | null>(null)
  const [roundKey, setRoundKey] = useState(0)
  const decks = useMemo(() => decksFor(explorer), [explorer])

  if (deck) {
    return (
      <Round
        key={roundKey}
        explorer={explorer}
        mode={mode}
        deck={deck}
        onUpdate={onUpdate}
        onAgain={() => setRoundKey((k) => k + 1)}
        onExit={() => setDeck(null)}
      />
    )
  }

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
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Map games</p>
        <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl">Pick a game</h1>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const on = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-4 rounded-3xl border-4 px-5 py-4 text-left transition ${
                on ? 'border-amber bg-white shadow-md' : 'border-transparent bg-white/60 hover:bg-white/80'
              }`}
            >
              <span className="text-4xl" aria-hidden>
                {m.icon}
              </span>
              <span>
                <span className="block font-display text-2xl text-ocean-950">{m.title}</span>
                <span className="text-sm font-semibold text-ocean-800/80">{m.sub}</span>
              </span>
            </button>
          )
        })}
      </div>

      <h2 className="mt-8 font-display text-2xl text-ocean-950">Which places?</h2>
      <p className="text-sm font-semibold text-ocean-700">
        New maps open up as you learn more places in your daily lessons.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {decks.map((d) => {
          const ok = deckPlayable(d)
          const icon = d.id === 'mix' ? '⭐' : UNIT_ICONS[d.id] ?? '🗺️'
          return (
            <button
              key={d.id}
              type="button"
              disabled={!ok}
              onClick={() => setDeck(d)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                ok ? 'bg-white/85 shadow-sm hover:bg-white' : 'bg-white/35 opacity-60'
              } ${d.id === 'mix' ? 'sm:col-span-2' : ''}`}
            >
              <span className={`text-2xl ${ok ? '' : 'grayscale'}`} aria-hidden>
                {ok ? icon : '🔒'}
              </span>
              <span className="flex-1">
                <span className="block font-extrabold text-ocean-950">{d.title}</span>
                <span className="text-xs font-bold text-ocean-700">
                  {!d.unlocked
                    ? 'Locked — keep going on the learning path'
                    : d.facts.length < MIN_DECK
                      ? `Learn ${MIN_DECK - d.facts.length} more place${MIN_DECK - d.facts.length === 1 ? '' : 's'} to play`
                      : d.id === 'mix'
                        ? `${d.facts.length} places`
                        : `${d.facts.length} of ${d.total} places`}
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

// ── One round ────────────────────────────────────────────────────

type Phase = 'ask' | 'retry' | 'right' | 'reveal'

type Result = { fact: GeoFact; stars: number }

function Round({
  explorer,
  mode,
  deck,
  onUpdate,
  onAgain,
  onExit,
}: {
  explorer: Explorer
  mode: GameMode
  deck: Deck
  onUpdate: (e: Explorer) => void
  onAgain: () => void
  onExit: () => void
}) {
  const [facts] = useState(() => buildRound(explorer, deck))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [results, setResults] = useState<Result[]>([])
  const [message, setMessage] = useState<string>('')
  const [wrongTap, setWrongTap] = useState<[number, number] | null>(null)
  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const saved = useRef(false)

  const fact = facts[idx] as GeoFact | undefined
  const done = idx >= facts.length
  const kind = fact ? mapKindFor(fact) : 'us'
  const centerLon = fact ? centerFor(fact) : 0
  const atlas = useAtlas(kind, centerLon)
  const choices = useMemo(() => (fact ? choicesFor(fact, deck) : []), [fact, deck])
  const camera = useMemo(() => (atlas && fact ? viewFor(atlas, fact, mode) : null), [atlas, fact, mode])
  // Hint circle sits near (not exactly on) the place.
  const [hintJitter, setHintJitter] = useState<[number, number]>([0, 0])

  // Read the question aloud.
  useEffect(() => {
    if (!fact || !loadVoicePref()) return
    const text = mode === 'find' ? findPrompt(fact) : namePrompt(fact)
    return speak(text, () => undefined)
  }, [fact, mode])

  // Save the round when it ends.
  useEffect(() => {
    if (!done || saved.current) return
    saved.current = true
    const now = Date.now()
    const next: Explorer = { ...explorer, cards: { ...explorer.cards } }
    let log = explorer.log ?? []
    for (const r of results) {
      const entry: AnswerLog = { t: now, f: r.fact.id, ok: r.stars === 2, q: `game-${mode}` }
      log = logAnswer({ ...next, log }, entry)
      // A miss brings the place back in the next daily lesson.
      const card = next.cards[r.fact.id]
      if (r.stars < 2 && card && card.dueAt > now) next.cards[r.fact.id] = { ...card, dueAt: now }
    }
    next.log = log
    const stars = results.reduce((s, r) => s + r.stars, 0)
    next.trailCoins += 3 + (stars === results.length * 2 ? 2 : 0)
    onUpdate(next)
  }, [done, explorer, results, mode, onUpdate])

  function finish(stars: number, text: string) {
    if (!fact) return
    setResults((r) => [...r, { fact, stars }])
    setMessage(text)
    setPhase(stars > 0 ? 'right' : 'reveal')
  }

  function next() {
    setIdx((i) => i + 1)
    setPhase('ask')
    setMessage('')
    setWrongTap(null)
    setWrongPick(null)
  }

  // Move on by itself after a correct answer.
  useEffect(() => {
    if (phase !== 'right') return
    const t = window.setTimeout(next, 1700)
    return () => window.clearTimeout(t)
  }, [phase])

  function capitalLine(f: GeoFact) {
    return f.capital ? ` Its capital is ${f.capital}.` : ''
  }

  function onTap(tap: Tap) {
    if (!atlas || !fact || (phase !== 'ask' && phase !== 'retry')) return
    if (tapFinds(atlas, fact, tap)) {
      setWrongTap(null)
      finish(phase === 'ask' ? 2 : 1, `Yes! That’s ${theName(fact)}.${capitalLine(fact)}`)
      return
    }
    const what = describeTap(atlas, fact, tap)
    setWrongTap(tap.p)
    if (phase === 'ask') {
      setHintJitter([Math.random() - 0.5, Math.random() - 0.5])
      setMessage(`${what ? `That’s ${what}. ` : 'Not quite. '}Try again — look inside the circle!`)
      setPhase('retry')
    } else {
      finish(0, `${what ? `That’s ${what}. ` : ''}Here’s ${theName(fact)}!${capitalLine(fact)}`)
    }
  }

  function onPick(name: string) {
    if (!fact || phase !== 'ask') return
    if (name === fact.name) {
      finish(2, `Yes! It’s ${theName(fact)}.${capitalLine(fact)}`)
    } else {
      setWrongPick(name)
      finish(0, `It’s ${theName(fact)}.${capitalLine(fact)}`)
    }
  }

  if (done) {
    const stars = results.reduce((s, r) => s + r.stars, 0)
    const max = results.length * 2
    const pct = max ? stars / max : 0
    const missed = results.filter((r) => r.stars < 2).map((r) => r.fact)
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {pct >= 0.7 && <Confetti />}
        <div className="rounded-3xl bg-white/90 p-6 text-center shadow-lg sm:p-8">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">
            {mode === 'find' ? 'Find it!' : 'What’s this?'} · {deck.title}
          </p>
          <h1 className="mt-2 font-display text-4xl text-ocean-950">
            {pct === 1 ? 'Perfect round!' : pct >= 0.7 ? 'Great job!' : pct >= 0.4 ? 'Nice work!' : 'Good practice!'}
          </h1>
          <p className="mt-3 text-5xl" aria-label={`${stars} of ${max} stars`}>
            ⭐ <span className="font-display text-ocean-950">{stars}</span>
            <span className="text-2xl text-ocean-700"> / {max}</span>
          </p>
          <p className="mt-2 text-sm font-bold text-ocean-700">
            +{3 + (pct === 1 ? 2 : 0)} coins
          </p>
          {missed.length > 0 && (
            <div className="mt-5 rounded-2xl bg-sand-100 p-4 text-left">
              <p className="text-sm font-extrabold text-ocean-900">Places to look at again:</p>
              <p className="mt-1 text-sm font-semibold text-ocean-800">
                {missed.map((f) => f.name).join(', ')}
              </p>
            </div>
          )}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onAgain}
              className="rounded-2xl bg-coral py-3.5 text-lg font-extrabold text-white"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100"
            >
              Other games
            </button>
          </div>
        </div>
      </div>
    )
  }

  const answered = phase === 'right' || phase === 'reveal'
  const wrongFact = wrongPick ? FACTS.find((f) => f.name === wrongPick && f.kind === fact!.kind) : undefined
  const starsSoFar = results.reduce((s, r) => s + r.stars, 0)

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
        >
          ← Games
        </button>
        <div className="flex items-center gap-3 text-sm font-extrabold text-ocean-900">
          <span>
            {idx + 1} / {Math.min(ROUND_SIZE, facts.length)}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1">⭐ {starsSoFar}</span>
        </div>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/60">
        <div
          className="h-full rounded-full bg-sea-300 transition-all"
          style={{ width: `${(idx / facts.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={fact!.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-3 rounded-3xl bg-white/90 px-5 py-4 text-center shadow-sm"
        >
          <h1 className="font-display text-3xl text-ocean-950 sm:text-4xl">
            {mode === 'find' ? findPrompt(fact!) : namePrompt(fact!)}
          </h1>
          {mode === 'find' && kindHint(fact!) && (
            <p className="mt-1 text-sm font-bold text-ocean-700">{kindHint(fact!)}</p>
          )}
        </motion.div>
      </AnimatePresence>

      {atlas && camera ? (
        <GameMap
          atlas={atlas}
          camera={camera}
          tappable={mode === 'find' && !answered}
          onTap={onTap}
          highlights={[
            ...(mode === 'name' || answered
              ? [{ fact: fact!, color: phase === 'right' ? '#2f9e6e' : '#f4a261', pulse: true }]
              : []),
            ...(wrongFact && answered ? [{ fact: wrongFact, color: '#e07a5f', pulse: false }] : []),
          ]}
          hint={phase === 'retry' && fact!.kind !== 'continent' ? { fact: fact!, jitter: hintJitter } : null}
          wrongTap={wrongTap}
        />
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center rounded-3xl bg-ocean-900 text-sm font-bold text-sea-200">
          Unrolling the map…
        </div>
      )}

      <div className="mt-3 min-h-[3.5rem]">
        {message && (
          <motion.p
            key={message}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl px-4 py-3 text-center text-lg font-extrabold ${
              phase === 'right'
                ? 'bg-sea-300/40 text-ocean-950'
                : phase === 'retry'
                  ? 'bg-amber/25 text-ocean-950'
                  : 'bg-coral/15 text-ocean-950'
            }`}
          >
            {message}
            {wrongFact && answered && (
              <span className="block text-sm font-bold text-coral">{wrongFact.name} is the red one.</span>
            )}
          </motion.p>
        )}
      </div>

      {mode === 'name' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {choices.map((c) => {
            const isAnswer = answered && c === fact!.name
            const isWrong = answered && c === wrongPick
            return (
              <button
                key={c}
                type="button"
                disabled={answered}
                onClick={() => onPick(c)}
                className={`rounded-2xl border-4 px-3 py-4 text-lg font-extrabold transition ${
                  isAnswer
                    ? 'border-[#2f9e6e] bg-[#2f9e6e] text-white'
                    : isWrong
                      ? 'border-coral bg-coral/15 text-ocean-950'
                      : 'border-transparent bg-white/90 text-ocean-950 shadow-sm hover:bg-white disabled:opacity-60'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      )}

      {phase === 'reveal' && (
        <button
          type="button"
          onClick={next}
          className="mt-3 w-full rounded-2xl bg-ocean-900 py-3.5 text-lg font-extrabold text-sand-100"
        >
          {idx + 1 >= facts.length ? 'See my stars' : 'Next'}
        </button>
      )}
    </div>
  )
}

function useAtlas(kind: 'us' | 'world', centerLon: number): Atlas | null {
  const [state, setState] = useState<{ key: string; atlas: Atlas } | null>(null)
  const key = `${kind}:${centerLon}`
  useEffect(() => {
    let cancelled = false
    loadTopo(kind).then((t) => {
      if (!cancelled) setState({ key, atlas: buildAtlas(t, kind, centerLon) })
    })
    return () => {
      cancelled = true
    }
  }, [kind, centerLon, key])
  return state?.key === key ? state.atlas : null
}

// ── The map ──────────────────────────────────────────────────────

type MarkedFact = { fact: GeoFact; color: string; pulse: boolean }

function GameMap({
  atlas,
  camera,
  tappable,
  onTap,
  highlights,
  hint,
  wrongTap,
}: {
  atlas: Atlas
  camera: Camera
  tappable: boolean
  onTap: (tap: Tap) => void
  highlights: MarkedFact[]
  hint: { fact: GeoFact; jitter: [number, number] } | null
  wrongTap: [number, number] | null
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [unitsPerPx, setUnitsPerPx] = useState(camera.w / MAP_W)
  const clipId = `russia-${atlas.kind}`

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const measure = () => {
      const ctm = svg.getScreenCTM()
      if (ctm && ctm.a) setUnitsPerPx(1 / ctm.a)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(svg)
    return () => ro.disconnect()
  }, [camera])

  const u = unitsPerPx
  const drawn = highlights.map((h) => ({ ...h, hl: highlightFor(atlas, h.fact, u) }))
  const filled = new Map<string, { color: string; hl: Highlight }>()
  for (const d of drawn) for (const k of d.hl.keys) filled.set(k, { color: d.color, hl: d.hl })

  const split = atlas.project(60, 0)?.[0] ?? MAP_W / 2
  const west = atlas.project(0, 0)?.[0] ?? 0

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    if (!tappable) return
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    const el = (e.target as Element).closest('[data-key]')
    const key = el?.getAttribute('data-key')
    onTap({ p: [p.x, p.y], shape: key ? atlas.byKey.get(key) ?? null : null, unitsPerPx: 1 / ctm.a })
  }

  const hintPoint = hint ? anchorForFact(atlas, hint.fact) : null
  const hintR = 70 * u

  return (
    <div className="overflow-hidden rounded-3xl border border-ocean-900/15 bg-[#0f5363] shadow-lg">
      <svg
        ref={svgRef}
        viewBox={cameraToViewBox(camera)}
        className={`block h-auto max-h-[62vh] w-full select-none ${tappable ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label="Map"
        onClick={handleClick}
        style={{ touchAction: 'manipulation' }}
      >
        <defs>
          <clipPath id={clipId}>
            {filled.get(atlas.shapes.find((s) => s.name === 'Russia')?.key ?? '')?.hl.russiaHalf === 'Europe' ? (
              <rect x={west} y={-1000} width={split - west} height={3000} />
            ) : (
              <>
                <rect x={split} y={-1000} width={4000} height={3000} />
                <rect x={-4000} y={-1000} width={4000 + 40} height={3000} />
              </>
            )}
          </clipPath>
        </defs>
        <rect x={-4000} y={-4000} width={9000} height={9000} fill="#0f5363" />
        {atlas.shapes.map((s) => {
          const f = filled.get(s.key)
          const halfRussia = f?.hl.russiaHalf && s.name === 'Russia'
          return (
            <g key={s.key}>
              <path
                d={s.d}
                data-key={s.key}
                fill={f && !halfRussia ? f.color : '#efe4cd'}
                stroke="#6b5a42"
                strokeWidth={0.6}
                strokeOpacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
              {halfRussia && (
                <path d={s.d} data-key={s.key} fill={f!.color} clipPath={`url(#${clipId})`} stroke="none" />
              )}
            </g>
          )
        })}
        {/* Dots so tiny islands can be seen and tapped */}
        {atlas.shapes
          .filter((s) => s.area < 6)
          .map((s) => (
            <circle
              key={`dot-${s.key}`}
              data-key={s.key}
              cx={s.cx}
              cy={s.cy}
              r={4 * u}
              fill={filled.get(s.key)?.color ?? '#efe4cd'}
              stroke="#6b5a42"
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}

        {drawn.map((d, i) => (
          <Mark key={i} hl={d.hl} color={d.color} pulse={d.pulse} u={u} />
        ))}

        {hint && hintPoint && (
          <circle
            cx={hintPoint[0] + hint.jitter[0] * hintR * 0.8}
            cy={hintPoint[1] + hint.jitter[1] * hintR * 0.8}
            r={hintR}
            fill="#ffffff"
            fillOpacity={0.14}
            stroke="#f4a261"
            strokeWidth={3}
            strokeDasharray="8 6"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {wrongTap && (
          <g pointerEvents="none" stroke="#e07a5f" strokeWidth={4} strokeLinecap="round">
            <line x1={wrongTap[0] - 7 * u} y1={wrongTap[1] - 7 * u} x2={wrongTap[0] + 7 * u} y2={wrongTap[1] + 7 * u} vectorEffect="non-scaling-stroke" />
            <line x1={wrongTap[0] + 7 * u} y1={wrongTap[1] - 7 * u} x2={wrongTap[0] - 7 * u} y2={wrongTap[1] + 7 * u} vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
    </div>
  )
}

function Mark({ hl, color, pulse, u }: { hl: Highlight; color: string; pulse: boolean; u: number }): ReactNode {
  const parts: ReactNode[] = []
  if (hl.line) {
    parts.push(
      <path key="glow" d={hl.line} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />,
      <path key="line" d={hl.line} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className={pulse ? 'game-blink' : undefined} />,
    )
  }
  if (hl.point) {
    const [x, y] = hl.point
    if (hl.marker === 'ocean') {
      parts.push(<circle key="sea" cx={x} cy={y} r={60 * u} fill={color} fillOpacity={0.35} />)
    }
    if (hl.marker === 'mountain') {
      const s = 16 * u
      parts.push(
        <path key="mt" d={`M${x},${y - s} L${x + s},${y + s * 0.7} L${x - s},${y + s * 0.7} Z`} fill={color} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />,
      )
    } else if (hl.marker === 'star') {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = (i % 2 ? 7 : 17) * u
        const a = (Math.PI / 5) * i - Math.PI / 2
        return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`
      }).join(' ')
      parts.push(<polygon key="star" points={pts} fill={color} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />)
    } else if (hl.marker !== 'ocean') {
      parts.push(<circle key="dot" cx={x} cy={y} r={6 * u} fill={color} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />)
    }
    if (pulse) {
      parts.push(
        <circle key="halo" cx={x} cy={y} r={16 * u} fill="none" stroke="#fff" strokeWidth={3} strokeOpacity={0.9} vectorEffect="non-scaling-stroke" />,
        <circle key="ring" cx={x} cy={y} r={24 * u} fill="none" stroke={color} strokeWidth={5} vectorEffect="non-scaling-stroke" className="game-ring" />,
      )
    }
  }
  return <g pointerEvents="none">{parts}</g>
}
