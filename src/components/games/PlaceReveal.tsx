import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GeoFact } from '../../data/curriculum'
import { flagUrl } from '../../data/flags'
import { FUN_FACTS } from '../../data/funFacts'
import { photoFor, type PlacePhoto } from '../../lib/placePhoto'

/** After an answer: a photo (when online), the flag, and one fun fact. */
export function PlaceReveal({
  fact,
  tone,
  message,
  onNext,
  nextLabel = 'Next',
}: {
  fact: GeoFact
  tone: 'right' | 'wrong'
  message: string
  onNext: () => void
  nextLabel?: string
}) {
  const [photo, setPhoto] = useState<{ id: string; photo: PlacePhoto | null } | null>(null)
  useEffect(() => {
    let live = true
    photoFor(fact).then((p) => live && setPhoto({ id: fact.id, photo: p }))
    return () => {
      live = false
    }
  }, [fact])
  const shown = photo?.id === fact.id ? photo.photo : null
  const [imgOk, setImgOk] = useState(true)
  const fun = FUN_FACTS[fact.id]
  const flag = flagUrl(fact.id)
  const funText = fun?.fact ?? fact.clue

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-3xl shadow-md ${tone === 'right' ? 'bg-[#e3f4ea]' : 'bg-[#fdebe5]'}`}
    >
      <div className="flex flex-col sm:flex-row">
        {shown && imgOk && (
          <figure className="relative h-40 w-full shrink-0 bg-ocean-900 sm:h-auto sm:w-56">
            <img
              src={shown.src}
              alt={shown.caption}
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] font-bold text-white">
              {shown.caption}
            </figcaption>
          </figure>
        )}
        <div className="flex-1 p-4">
          <p className="flex items-center gap-2 text-lg font-extrabold text-ocean-950">
            {flag && <img src={flag} alt="" className="h-6 w-auto rounded border border-ocean-900/15" />}
            <span>{message}</span>
          </p>
          {fun?.nick && <p className="mt-1 text-sm font-bold text-ocean-700">{fun.nick}</p>}
          {funText && (
            <p className="mt-2 text-base font-semibold text-ocean-900">
              <span aria-hidden>💡 </span>
              {funText}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="mt-3 w-full rounded-2xl bg-ocean-900 py-3 text-lg font-extrabold text-sand-100"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
