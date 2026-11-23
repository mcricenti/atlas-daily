import { useEffect, useState } from 'react'
import { buildAtlas, loadTopo, type Atlas, type MapKind } from '../../lib/geoData'

export const COLORS = {
  right: '#2f9e6e',
  target: '#f4a261',
  wrong: '#e07a5f',
  land: '#efe4cd',
  water: '#0f5363',
  p1: '#3a86ff',
  p2: '#d63384',
}

/** Loads and projects the U.S. or world map. */
export function useAtlas(kind: MapKind, centerLon: number): Atlas | null {
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


export function formatTime(seconds: number) {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}


export const NEIGHBOR_ROUND = 5
export const DUEL_ROUND = 8
