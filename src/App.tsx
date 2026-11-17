import { useState } from 'react'
import { AppProvider, useApp } from './state/AppContext'
import { Home } from './components/Home'
import { LessonPlayer } from './components/LessonPlayer'
import { Progress } from './components/Progress'
import { SectionReview } from './components/SectionReview'
import { UnitPlacementChallenge } from './components/UnitPlacementChallenge'
import { MyAtlas } from './components/MyAtlas'
import { HeadToHead } from './components/HeadToHead'
import { GrownUps } from './components/GrownUps'
import { markPlacementCleared } from './lib/storage'

type Screen =
  | 'home'
  | 'lesson'
  | 'boss'
  | 'progress'
  | 'review'
  | 'placement'
  | 'atlas'
  | 'duel'
  | 'grownups'

function Shell() {
  const [screen, setScreenRaw] = useState<Screen>('home')
  const [reviewUnitId, setReviewUnitId] = useState<string | null>(null)
  const [placementUnitId, setPlacementUnitId] = useState<string | null>(null)
  const { state, active, updateExplorer } = useApp()

  function setScreen(next: Screen) {
    setScreenRaw(next)
    window.scrollTo(0, 0)
  }

  const welcome = screen === 'home' && !active
  const home = (
    <Home
      onStartLesson={() => setScreen('lesson')}
      onOpenProgress={() => setScreen('progress')}
      onOpenAtlas={() => setScreen('atlas')}
      onStartBoss={() => setScreen('boss')}
      onOpenDuel={() => setScreen('duel')}
      onOpenGrownUps={() => setScreen('grownups')}
    />
  )

  return (
    <main
      className={`min-h-screen print:bg-white print:pb-0 ${
        welcome ? 'pb-0' : 'pb-16'
      }`}
    >
      {(screen === 'home' || !active) && screen !== 'grownups' && home}
      {(screen === 'lesson' || screen === 'boss') && active && (
        <div className="px-4 py-8">
          <LessonPlayer
            key={screen}
            explorer={active}
            mode={screen === 'boss' ? 'boss' : 'daily'}
            onUpdate={updateExplorer}
            onExit={() => setScreen('home')}
            onStartPlacement={(unitId) => {
              setPlacementUnitId(unitId)
              setScreen('placement')
            }}
          />
        </div>
      )}
      {screen === 'progress' && active && (
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
      {screen === 'review' && reviewUnitId && active && (
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
      {screen === 'atlas' && active && (
        <MyAtlas explorer={active} onBack={() => setScreen('home')} />
      )}
      {screen === 'duel' && active && (
        <HeadToHead explorers={state.explorers} onBack={() => setScreen('home')} />
      )}
      {screen === 'grownups' && (
        <GrownUps explorers={state.explorers} onBack={() => setScreen('home')} />
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
