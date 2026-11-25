import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createExplorer,
  loadState,
  normalizeState,
  saveState,
  type AppState,
  type DuelRecord,
  type Explorer,
} from '../lib/storage'

type AppContextValue = {
  state: AppState
  active: Explorer | null
  setActiveExplorer: (id: string) => void
  addExplorer: (name: string) => void
  updateExplorer: (explorer: Explorer) => void
  renameExplorer: (id: string, name: string) => void
  deleteExplorer: (id: string) => void
  resetProgress: (id?: string) => void
  recordDuel: (record: DuelRecord) => void
  importState: (raw: unknown) => boolean
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const active = useMemo(
    () => state.explorers.find((e) => e.id === state.activeExplorerId) ?? null,
    [state],
  )

  const setActiveExplorer = useCallback((id: string) => {
    setState((s) => ({ ...s, activeExplorerId: id }))
  }, [])

  const addExplorer = useCallback((name: string) => {
    const explorer = createExplorer(name)
    setState((s) => ({
      ...s,
      explorers: [...s.explorers, explorer],
      activeExplorerId: explorer.id,
    }))
  }, [])

  const updateExplorer = useCallback((explorer: Explorer) => {
    setState((s) => ({
      ...s,
      explorers: s.explorers.map((e) => (e.id === explorer.id ? explorer : e)),
    }))
  }, [])

  const renameExplorer = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((s) => ({
      ...s,
      explorers: s.explorers.map((e) => (e.id === id ? { ...e, name: trimmed } : e)),
    }))
  }, [])

  const deleteExplorer = useCallback((id: string) => {
    setState((s) => {
      const remaining = s.explorers.filter((e) => e.id !== id)
      return {
        ...s,
        explorers: remaining,
        activeExplorerId:
          s.activeExplorerId === id ? remaining[0]?.id ?? null : s.activeExplorerId,
      }
    })
  }, [])

  const resetProgress = useCallback(
    (id?: string) => {
      const targetId = id ?? state.activeExplorerId
      if (!targetId) return
      setState((s) => {
        const existing = s.explorers.find((e) => e.id === targetId)
        const fresh = createExplorer(existing?.name ?? 'Explorer')
        fresh.id = targetId
        fresh.avatar = existing?.avatar
        fresh.mapTheme = existing?.mapTheme
        fresh.passportTheme = existing?.passportTheme
        fresh.confettiTheme = existing?.confettiTheme
        fresh.ownedItems = existing?.ownedItems ?? []
        fresh.visited = existing?.visited ?? {}
        return {
          ...s,
          explorers: s.explorers.map((e) => (e.id === targetId ? fresh : e)),
        }
      })
    },
    [state.activeExplorerId],
  )

  const recordDuel = useCallback((record: DuelRecord) => {
    setState((s) => ({
      ...s,
      duelHistory: [...(s.duelHistory ?? []), record].slice(-30),
    }))
  }, [])

  const importState = useCallback((raw: unknown): boolean => {
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as AppState).explorers)) {
      return false
    }
    const next = normalizeState(raw)
    setState(next)
    return true
  }, [])

  const value = useMemo(
    () => ({
      state,
      active,
      setActiveExplorer,
      addExplorer,
      updateExplorer,
      renameExplorer,
      deleteExplorer,
      resetProgress,
      recordDuel,
      importState,
    }),
    [
      state,
      active,
      setActiveExplorer,
      addExplorer,
      updateExplorer,
      renameExplorer,
      deleteExplorer,
      resetProgress,
      recordDuel,
      importState,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
