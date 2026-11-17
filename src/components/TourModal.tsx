import type { GeoFact } from '../data/curriculum'
import { PlaceTour } from './PlaceTour'

/** A place tour in a pop-up, for rewatching from the Trail map or My Atlas. */
export function TourModal({ fact, onClose }: { fact: GeoFact; onClose: () => void }) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ocean-950/70 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${fact.name} tour`}
      onClick={onClose}
    >
      <div
        className="animate-pop my-auto w-full max-w-3xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ocean-950">{fact.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-ocean-900/10 px-3 py-2 text-sm font-bold text-ocean-900"
          >
            Close
          </button>
        </div>
        <PlaceTour fact={fact} />
      </div>
    </div>
  )
}
