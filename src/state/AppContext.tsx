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
  saveState,
  type AppState,
  type Explorer,
} from '../lib/storage'

type AppContextValue = {
  state: AppState
  active: Explorer | null
  setActiveExplorer: (id: string) => void
  addExplorer: (name: string) => void
  updateExplorer: (explorer: Explorer) => void
  resetProgress: () => void
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

  const resetProgress = useCallback(() => {
    if (!state.activeExplorerId) return
    const fresh = createExplorer(active?.name ?? 'Explorer')
    fresh.id = state.activeExplorerId
    setState((s) => ({
      ...s,
      explorers: s.explorers.map((e) =>
        e.id === state.activeExplorerId ? fresh : e,
      ),
    }))
  }, [active?.name, state.activeExplorerId])

  const value = useMemo(
    () => ({
      state,
      active,
      setActiveExplorer,
      addExplorer,
      updateExplorer,
      resetProgress,
    }),
    [
      state,
      active,
      setActiveExplorer,
      addExplorer,
      updateExplorer,
      resetProgress,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
