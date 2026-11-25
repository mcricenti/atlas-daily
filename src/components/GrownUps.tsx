import { useMemo, useRef, useState, type ReactNode } from 'react'
import { FACTS, UNITS, getUnit } from '../data/curriculum'
import { ISO2 } from '../data/flags'
import {
  loadQuizVoicePref,
  saveQuizVoicePref,
} from '../lib/narrator'
import { dueFacts } from '../lib/session'
import { loadSfxPref, saveSfxPref } from '../lib/sfx'
import { masteryLabel } from '../lib/srs'
import { todayKey, type Explorer } from '../lib/storage'
import { useApp } from '../state/AppContext'

const DAY = 24 * 60 * 60 * 1000
const CACHE_NAME = 'atlas-daily-v2'
const BASE = import.meta.env.BASE_URL

type Props = {
  explorers: Explorer[]
  onBack: () => void
  onPracticeTricky: (explorerId: string) => void
}

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

function encodeTransfer(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function decodeTransfer(code: string): unknown {
  const binary = atob(code.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function GrownUps({ explorers, onBack, onPracticeTricky }: Props) {
  const {
    state,
    updateExplorer,
    renameExplorer,
    deleteExplorer,
    resetProgress,
    importState,
  } = useApp()

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
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <button type="button" onClick={onBack} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900">
        ← Home
      </button>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral">Grown-ups</p>
          <h1 className="mt-1 font-display text-3xl text-ocean-950">Dashboard &amp; Controls</h1>
        </div>
        {explorers.length > 1 && (
          <div className="flex flex-wrap gap-1 rounded-2xl bg-white/70 p-1">
            {explorers.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setWho(e.id)}
                className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                  e.id === explorer?.id ? 'bg-ocean-900 text-sand-100' : 'text-ocean-900'
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {explorer ? (
        <>
          <Report
            explorer={explorer}
            onPracticeTricky={() => onPracticeTricky(explorer.id)}
          />
          <ExplorerControls
            explorer={explorer}
            onUpdate={updateExplorer}
            onRename={(name) => renameExplorer(explorer.id, name)}
            onReset={() => resetProgress(explorer.id)}
            onDelete={() => deleteExplorer(explorer.id)}
          />
        </>
      ) : (
        <p className="mt-6">No explorers yet.</p>
      )}

      <AudioControls />
      <BackupRestore state={state} onImport={importState} />
      <OfflinePack />
      <InstallHelp />
    </div>
  )
}

function Report({
  explorer,
  onPracticeTricky,
}: {
  explorer: Explorer
  onPracticeTricky: () => void
}) {
  const [now] = useState(() => Date.now())
  const data = useMemo(() => {
    const learned = FACTS.filter((f) => explorer.introduced.includes(f.id))
    const chances = learned
      .map((f) => recallChance(explorer, f.id, now))
      .filter((x): x is number => x !== null)
    const memory = chances.length ? chances.reduce((a, b) => a + b, 0) / chances.length : null
    const mastered = learned.filter((f) => masteryLabel(explorer.cards[f.id]) === 'Mastered').length
    const dueNow = dueFacts(explorer, now).length

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
    <div className="space-y-5">
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
            <>
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
              <button
                type="button"
                onClick={onPracticeTricky}
                className="mt-4 w-full rounded-2xl bg-coral py-2.5 text-sm font-extrabold text-white shadow-sm"
              >
                Practice tricky places now
              </button>
            </>
          )}
        </Card>
        <Card title="By unit" note="Strong = remembered 3+ times in a row">
          {data.units.length === 0 ? (
            <p className="text-sm text-ocean-800/80">Start a daily lesson to see progress here.</p>
          ) : (
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
          )}
        </Card>
      </div>
    </div>
  )
}

function ExplorerControls({
  explorer,
  onUpdate,
  onRename,
  onReset,
  onDelete,
}: {
  explorer: Explorer
  onUpdate: (e: Explorer) => void
  onRename: (name: string) => void
  onReset: () => void
  onDelete: () => void
}) {
  const [nameInput, setNameInput] = useState(explorer.name)
  const [savedNotice, setSavedNotice] = useState('')
  const limit = explorer.dailyNewLimit ?? 3

  function flash(msg: string) {
    setSavedNotice(msg)
    window.setTimeout(() => setSavedNotice(''), 2000)
  }

  return (
    <Card title={`Settings for ${explorer.name}`} note={savedNotice || 'Pace, trail jump & profile'}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-ocean-950">New places per daily lesson</p>
            <p className="text-xs font-semibold text-ocean-700">
              Adjust lesson length (default 3 ≈ 10 minutes).
            </p>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onUpdate({ ...explorer, dailyNewLimit: n })
                  flash(`Set to ${n} new places/day`)
                }}
                className={`h-9 w-9 rounded-xl text-sm font-extrabold transition ${
                  limit === n
                    ? 'bg-ocean-900 text-sand-100'
                    : 'bg-sand-100 text-ocean-900 hover:bg-sea-200/60'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ocean-900/10 pt-4">
          <div>
            <p className="text-sm font-extrabold text-ocean-950">Current trail unit (jump / unlock)</p>
            <p className="text-xs font-semibold text-ocean-700">
              Match what your child is learning in school this week.
            </p>
          </div>
          <select
            value={explorer.currentUnitId}
            onChange={(e) => {
              onUpdate({ ...explorer, currentUnitId: e.target.value })
              flash('Current unit updated')
            }}
            className="rounded-xl border border-ocean-900/15 bg-sand-100 px-3 py-2 text-sm font-bold text-ocean-950"
          >
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.order}. {u.title}
              </option>
            ))}
          </select>
        </div>

        <form
          className="flex flex-wrap items-center gap-2 border-t border-ocean-900/10 pt-4"
          onSubmit={(e) => {
            e.preventDefault()
            onRename(nameInput)
            flash('Renamed')
          }}
        >
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="flex-1 rounded-xl border border-ocean-900/15 bg-sand-100 px-3 py-2 text-sm font-bold text-ocean-950"
          />
          <button
            type="submit"
            className="rounded-xl bg-ocean-900 px-4 py-2 text-sm font-extrabold text-sand-100"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Reset learning progress for ${explorer.name}? (Shop items and visited pins are kept.)`)) {
                onReset()
                flash('Progress reset')
              }
            }}
            className="rounded-xl bg-amber/25 px-3 py-2 text-sm font-bold text-ocean-950"
          >
            Reset progress
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete explorer "${explorer.name}" permanently?`)) {
                onDelete()
              }
            }}
            className="rounded-xl bg-coral/15 px-3 py-2 text-sm font-bold text-coral"
          >
            Delete
          </button>
        </form>
      </div>
    </Card>
  )
}

function AudioControls() {
  const [sfx, setSfx] = useState(() => loadSfxPref())
  const [quizVoice, setQuizVoice] = useState(() => loadQuizVoicePref())

  return (
    <Card title="Sound & reading helpers">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            const next = !sfx
            setSfx(next)
            saveSfxPref(next)
          }}
          className={`rounded-2xl px-4 py-2.5 text-sm font-extrabold transition ${
            sfx ? 'bg-ocean-900 text-sand-100' : 'bg-sand-100 text-ocean-800'
          }`}
        >
          {sfx ? '🔔 Sound effects: ON' : '🔕 Sound effects: OFF'}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !quizVoice
            setQuizVoice(next)
            saveQuizVoicePref(next)
          }}
          className={`rounded-2xl px-4 py-2.5 text-sm font-extrabold transition ${
            quizVoice ? 'bg-ocean-900 text-sand-100' : 'bg-sand-100 text-ocean-800'
          }`}
        >
          {quizVoice ? '🔊 Auto-read quiz prompts: ON' : '🔈 Auto-read quiz prompts: OFF'}
        </button>
      </div>
    </Card>
  )
}

function BackupRestore({
  state,
  onImport,
}: {
  state: unknown
  onImport: (raw: unknown) => boolean
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [transferCode, setTransferCode] = useState('')
  const [status, setStatus] = useState('')

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-daily-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Backup file downloaded!')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((txt) => {
      try {
        const parsed = JSON.parse(txt)
        if (confirm('Replace all explorers on this device with this backup?')) {
          setStatus(onImport(parsed) ? 'Backup restored!' : 'Invalid backup file.')
        }
      } catch {
        setStatus('Could not read that JSON file.')
      }
    })
  }

  function copyCode() {
    try {
      const code = encodeTransfer(state)
      navigator.clipboard.writeText(code).then(
        () => setStatus('Transfer code copied! Paste it on another tablet.'),
        () => {
          setTransferCode(code)
          setStatus('Copy the code from the box below.')
        },
      )
    } catch {
      setStatus('Could not create transfer code.')
    }
  }

  function restoreFromCode() {
    if (!transferCode.trim()) return
    try {
      const parsed = decodeTransfer(transferCode)
      if (confirm('Replace all explorers on this device with the pasted transfer code?')) {
        if (onImport(parsed)) {
          setTransferCode('')
          setStatus('Progress transferred successfully!')
        } else {
          setStatus('That transfer code is not valid.')
        }
      }
    } catch {
      setStatus('Could not decode that transfer code.')
    }
  }

  return (
    <Card title="Backup & transfer between devices" note={status || 'Keep streaks safe across tablets'}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadBackup}
          className="rounded-2xl bg-ocean-900 px-4 py-2.5 text-sm font-extrabold text-sand-100"
        >
          ⬇ Download backup (.json)
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl bg-sand-100 px-4 py-2.5 text-sm font-extrabold text-ocean-900"
        >
          ⬆ Restore from file
        </button>
        <button
          type="button"
          onClick={copyCode}
          className="rounded-2xl bg-amber/30 px-4 py-2.5 text-sm font-extrabold text-ocean-950"
        >
          📋 Copy transfer code
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={transferCode}
          onChange={(e) => setTransferCode(e.target.value)}
          placeholder="Paste a transfer code from another tablet…"
          className="flex-1 rounded-xl border border-ocean-900/15 bg-sand-100 px-3 py-2 text-xs font-mono text-ocean-950"
        />
        <button
          type="button"
          onClick={restoreFromCode}
          disabled={!transferCode.trim()}
          className="rounded-xl bg-coral px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
        >
          Import code
        </button>
      </div>
    </Card>
  )
}

function OfflinePack() {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  async function downloadOfflinePack() {
    if (!('caches' in window)) {
      setProgress('Offline caching is not supported in this browser.')
      return
    }
    setBusy(true)
    setProgress('Preparing offline assets…')
    try {
      const cache = await caches.open(CACHE_NAME)
      const urls = new Set<string>([
        `${BASE}`,
        `${BASE}geo/states-10m.json`,
        `${BASE}geo/countries-50m.json`,
        `${BASE}voice/manifest.json`,
      ])
      for (const code of Object.values(ISO2)) {
        urls.add(`${BASE}flags/${code}.svg`)
      }
      try {
        const res = await fetch(`${BASE}voice/manifest.json`)
        if (res.ok) {
          const manifest = (await res.json()) as { clips?: string[] }
          for (const clip of manifest.clips ?? []) {
            urls.add(`${BASE}voice/${clip}.mp3`)
          }
        }
      } catch {
        /* ignore */
      }

      const list = [...urls]
      let done = 0
      const BATCH = 12
      for (let i = 0; i < list.length; i += BATCH) {
        const slice = list.slice(i, i + BATCH)
        await Promise.all(
          slice.map(async (u) => {
            try {
              const r = await fetch(u)
              if (r.ok) await cache.put(u, r)
            } catch {
              /* ignore individual failure */
            } finally {
              done++
            }
          }),
        )
        setProgress(`Cached ${done} of ${list.length} files…`)
      }
      setProgress(`Ready for offline travel! (${done} files cached)`)
    } catch {
      setProgress('Could not finish offline download.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Offline travel pack" note="Great before flights & road trips">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ocean-800">
          Pre-download all maps, flags, and recorded voice clips onto this tablet.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={downloadOfflinePack}
          className="rounded-2xl bg-ocean-900 px-4 py-2.5 text-sm font-extrabold text-sand-100 disabled:opacity-50"
        >
          {busy ? 'Downloading…' : '✈ Download for offline'}
        </button>
      </div>
      {progress && <p className="mt-2 text-xs font-extrabold text-moss">{progress}</p>}
    </Card>
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
        Use Backup &amp; Transfer above anytime you want to move progress to another device.
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
