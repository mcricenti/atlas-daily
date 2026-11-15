import { useState } from 'react'
import { AppProvider, useApp } from './state/AppContext'
import { Home } from './components/Home'
import { LessonPlayer } from './components/LessonPlayer'
import { Progress } from './components/Progress'
import { SectionReview } from './components/SectionReview'
import { UnitPlacementChallenge } from './components/UnitPlacementChallenge'
import { markPlacementCleared } from './lib/storage'

type Screen = 'home' | 'lesson' | 'progress' | 'review' | 'placement'

function Shell() {
  const [screen, setScreen] = useState<Screen>('home')
  const [reviewUnitId, setReviewUnitId] = useState<string | null>(null)
  const [placementUnitId, setPlacementUnitId] = useState<string | null>(null)
  const { active, updateExplorer } = useApp()

  const welcome = screen === 'home' && !active

  return (
    <main
      className={`min-h-screen print:bg-white print:pb-0 ${
        welcome ? 'pb-0' : 'pb-16'
      }`}
    >
      {screen === 'home' && (
        <Home
          onStartLesson={() => setScreen('lesson')}
          onOpenProgress={() => setScreen('progress')}
        />
      )}
      {screen === 'lesson' && active && (
        <div className="px-4 py-8">
          <LessonPlayer
            explorer={active}
            onUpdate={updateExplorer}
            onExit={() => setScreen('progress')}
            onStartPlacement={(unitId) => {
              setPlacementUnitId(unitId)
              setScreen('placement')
            }}
          />
        </div>
      )}
      {screen === 'lesson' && !active && (
        <Home
          onStartLesson={() => setScreen('lesson')}
          onOpenProgress={() => setScreen('progress')}
        />
      )}
      {screen === 'progress' && (
        <Progress
          onBack={() => setScreen('home')}
          onStartLesson={() => setScreen('lesson')}
          onOpenReview={(unitId) => {
            setReviewUnitId(unitId)
            setScreen('review')
          }}
          onOpenPlacement={(unitId) => {
            setPlacementUnitId(unitId)
            setScreen('placement')
          }}
        />
      )}
      {screen === 'review' && reviewUnitId && (
        <SectionReview
          unitId={reviewUnitId}
          onBack={() => setScreen('progress')}
        />
      )}
      {screen === 'placement' && placementUnitId && active && (
        <div className="px-2 py-8 sm:px-4">
          <UnitPlacementChallenge
            unitId={placementUnitId}
            explorerName={active.name}
            onExit={() => setScreen('progress')}
            onComplete={() => {
              updateExplorer(markPlacementCleared(active, placementUnitId))
              setPlacementUnitId(null)
              setScreen('progress')
            }}
          />
        </div>
      )}
    </main>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
