import { useMemo, useState } from 'react'
import {
  buildSectionReview,
  scoreSectionReview,
  type ReviewBlankKind,
  type ReviewBankWord,
} from '../lib/sectionReview'

type Props = {
  unitId: string
  onBack: () => void
}

type Answers = Record<string, { name?: string; capital?: string }>

export function SectionReview({ unitId, onBack }: Props) {
  const [seed, setSeed] = useState(0)
  const sheet = useMemo(() => buildSectionReview(unitId), [unitId, seed])
  const [answers, setAnswers] = useState<Answers>({})
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [showKey, setShowKey] = useState(false)

  if (!sheet) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <button type="button" onClick={onBack} className="font-bold text-ocean-900">
          ← Back
        </button>
        <p className="mt-6">No review sheet for this section.</p>
      </div>
    )
  }

  const usedBankIds = new Set<string>()
  for (const item of sheet.items) {
    const a = answers[item.factId]
    if (a?.name) {
      const w = sheet.bank.find(
        (b) => b.kind === 'name' && b.text === a.name && b.factId === item.factId,
      )
      if (w) usedBankIds.add(w.id)
      else {
        const any = sheet.bank.find((b) => b.kind === 'name' && b.text === a.name)
        if (any) usedBankIds.add(any.id)
      }
    }
    if (a?.capital) {
      const w = sheet.bank.find(
        (b) =>
          b.kind === 'capital' &&
          b.text === a.capital &&
          b.factId === item.factId,
      )
      if (w) usedBankIds.add(w.id)
      else {
        const any = sheet.bank.find(
          (b) => b.kind === 'capital' && b.text === a.capital,
        )
        if (any) usedBankIds.add(any.id)
      }
    }
  }

  const score = checked ? scoreSectionReview(sheet, answers) : null

  function placeWord(factId: string, blank: ReviewBlankKind) {
    if (!selectedBankId || checked) return
    const word = sheet!.bank.find((b) => b.id === selectedBankId)
    if (!word || word.kind !== blank) return

    setAnswers((prev) => {
      const next = { ...prev }
      const cur = { ...(next[factId] ?? {}) }
      // free previous bank word if replacing
      cur[blank] = word.text
      next[factId] = cur
      return next
    })
    setSelectedBankId(null)
  }

  function clearBlank(factId: string, blank: ReviewBlankKind) {
    if (checked) return
    setAnswers((prev) => {
      const next = { ...prev }
      const cur = { ...(next[factId] ?? {}) }
      delete cur[blank]
      next[factId] = cur
      return next
    })
  }

  function resetSheet() {
    setAnswers({})
    setSelectedBankId(null)
    setChecked(false)
    setShowKey(false)
    setSeed((s) => s + 1)
  }

  function onPrint() {
    setShowKey(false)
    window.setTimeout(() => window.print(), 50)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="no-print flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-900"
        >
          ← Trail map
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-xl bg-ocean-900 px-3 py-2 text-sm font-bold text-sand-100"
        >
          Print worksheet
        </button>
        <button
          type="button"
          onClick={resetSheet}
          className="rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-ocean-800"
        >
          Shuffle new sheet
        </button>
      </div>

      <header className="mt-6 print:mt-0">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-coral print:text-black">
          Final section review
        </p>
        <h1 className="mt-1 font-display text-3xl text-ocean-950 sm:text-4xl print:text-2xl">
          {sheet.unit.title}
        </h1>
        <p className="mt-2 text-ocean-800/85 print:text-sm print:text-black">
          Fill each blank using the word bank. Name the{' '}
          {sheet.placeLabel.toLowerCase()}
          {sheet.hasCapitals ? ' and its capital' : ''}.
        </p>
        <p className="mt-1 hidden text-xs text-black print:block">
          Atlas Daily · {sheet.unit.subtitle} · Name: ______________ Date: ________
        </p>
      </header>

      <section className="mt-6 rounded-3xl border border-ocean-900/10 bg-white/80 p-4 print:mt-4 print:rounded-none print:border print:border-black print:bg-white print:p-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-ocean-800 print:text-black">
          Word bank
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {sheet.bank.map((word) => (
            <BankChip
              key={word.id}
              word={word}
              used={usedBankIds.has(word.id)}
              selected={selectedBankId === word.id}
              disabled={checked}
              onSelect={() => {
                if (usedBankIds.has(word.id) || checked) return
                setSelectedBankId((id) => (id === word.id ? null : word.id))
              }}
            />
          ))}
        </div>
        <p className="no-print mt-3 text-xs font-semibold text-ocean-700">
          {selectedBankId
            ? 'Now tap a matching blank below.'
            : 'Tap a word, then tap a blank.'}
        </p>
      </section>

      <ol className="mt-6 space-y-4 print:mt-4 print:space-y-3">
        {sheet.items.map((item, index) => {
          const a = answers[item.factId] ?? {}
          const itemOk = score?.byItem[item.factId]
          return (
            <li
              key={item.id}
              className={`rounded-2xl border bg-white/75 p-4 print:rounded-none print:border-0 print:border-b print:border-dashed print:border-black print:bg-white print:p-2 ${
                checked
                  ? itemOk
                    ? 'border-sea-300'
                    : 'border-coral'
                  : 'border-ocean-900/10'
              }`}
            >
              <div className="flex gap-3">
                <span className="font-display text-lg text-ocean-800 print:text-black">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ocean-700 print:text-black">
                    {item.clue}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
                    {item.blanks.includes('name') && (
                      <BlankField
                        label={sheet.placeLabel}
                        value={showKey ? item.nameAnswer : a.name}
                        active={Boolean(selectedBankId) && !checked}
                        locked={checked || showKey}
                        onFill={() => placeWord(item.factId, 'name')}
                        onClear={() => clearBlank(item.factId, 'name')}
                      />
                    )}
                    {item.blanks.includes('capital') && (
                      <BlankField
                        label={sheet.capitalLabel}
                        value={showKey ? item.capitalAnswer : a.capital}
                        active={Boolean(selectedBankId) && !checked}
                        locked={checked || showKey}
                        onFill={() => placeWord(item.factId, 'capital')}
                        onClear={() => clearBlank(item.factId, 'capital')}
                      />
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="no-print mt-8 flex flex-wrap gap-3">
        {!checked ? (
          <button
            type="button"
            onClick={() => setChecked(true)}
            className="rounded-2xl bg-coral px-5 py-3 font-extrabold text-white"
          >
            Check answers
          </button>
        ) : (
          <>
            <p className="w-full text-lg font-extrabold text-ocean-950">
              Score: {score!.correct}/{score!.total}
              {score!.correct === score!.total
                ? ' — Section mastered!'
                : ' — Fix the coral ones and try again.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setChecked(false)
                setShowKey(false)
              }}
              className="rounded-2xl bg-ocean-900 px-5 py-3 font-extrabold text-sand-100"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={resetSheet}
              className="rounded-2xl bg-coral px-5 py-3 font-extrabold text-white"
            >
              New shuffled review
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-ocean-800"
        >
          {showKey ? 'Hide answer key' : 'Show answer key'}
        </button>
      </div>

      <p className="mt-8 hidden text-xs text-black print:block">
        Answer key (fold under or check after):{' '}
        {sheet.items
          .map(
            (item, i) =>
              `${i + 1}. ${item.nameAnswer}${
                item.capitalAnswer ? ` / ${item.capitalAnswer}` : ''
              }`,
          )
          .join(' · ')}
      </p>
    </div>
  )
}

function BankChip({
  word,
  used,
  selected,
  disabled,
  onSelect,
}: {
  word: ReviewBankWord
  used: boolean
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || used}
      onClick={onSelect}
      className={`rounded-xl px-3 py-1.5 text-sm font-bold transition print:rounded print:border print:border-black print:bg-white print:px-2 print:py-1 print:text-xs print:text-black ${
        used
          ? 'bg-ocean-900/10 text-ocean-700/50 line-through print:no-underline print:opacity-100'
          : selected
            ? 'bg-amber text-ocean-950 ring-2 ring-ocean-900/30'
            : 'bg-sand-100 text-ocean-950 hover:bg-sea-200/50'
      }`}
    >
      {word.text}
      <span className="ml-1 text-[10px] font-extrabold uppercase tracking-wide opacity-60 print:hidden">
        {word.kind === 'name' ? 'name' : 'cap'}
      </span>
    </button>
  )
}

function BlankField({
  label,
  value,
  active,
  locked,
  onFill,
  onClear,
}: {
  label: string
  value?: string
  active: boolean
  locked: boolean
  onFill: () => void
  onClear: () => void
}) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-ocean-700 print:text-black">
        {label}
      </p>
      <button
        type="button"
        disabled={locked && !value}
        onClick={() => {
          if (locked) return
          if (value) onClear()
          else if (active) onFill()
        }}
        className={`mt-1 flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-dashed px-3 py-2 text-center text-base font-bold print:min-h-[28px] print:rounded-none print:border-0 print:border-b-2 print:border-solid print:border-black print:px-1 print:py-0 ${
          value
            ? 'border-ocean-700/40 bg-sea-200/30 text-ocean-950 print:bg-transparent'
            : active
              ? 'border-amber bg-amber/10 text-ocean-700'
              : 'border-ocean-900/20 bg-sand-100 text-ocean-700/50'
        }`}
      >
        {value ?? (active ? 'Tap to place' : '________')}
      </button>
    </div>
  )
}
