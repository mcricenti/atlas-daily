import { useState } from 'react'
import { AppProvider, useApp } from './state/AppContext'
import { Home } from './components/Home'
import { LessonPlayer, type LessonMode } from './components/LessonPlayer'
import { Progress } from './components/Progress'
import { SectionReview } from './components/SectionReview'
import { UnitPlacementChallenge } from './components/UnitPlacementChallenge'
import { MyAtlas } from './components/MyAtlas'
import { HeadToHead } from './components/HeadToHead'
import { GrownUps } from './components/GrownUps'
import { ExplorerShop } from './components/ExplorerShop'
import { MapGames } from './components/MapGames'
import { markPlacementCleared } from './lib/storage'

type Screen =
  | 'home'
  | 'lesson'
  | 'boss'
  | 'tricky'
  | 'unit-drill'
  | 'progress'
  | 'review'
  | 'placement'
  | 'atlas'
  | 'games'
  | 'duel'
  | 'shop'
  | 'grownups'

function Shell() {
  const [screen, setScreenRaw] = useState<Screen>('home')
  const [reviewUnitId, setReviewUnitId] = useState<string | null>(null)
  const [placementUnitId, setPlacementUnitId] = useState<string | null>(null)
  const [drillUnitId, setDrillUnitId] = useState<string | null>(null)
  const { state, active, setActiveExplorer, updateExplorer, recordDuel } = useApp()

  function setScreen(next: Screen) {
    setScreenRaw(next)
    window.scrollTo(0, 0)
  }

  const welcome = screen === 'home' && !active
  const home = (
    <Home
      onStartLesson={() => setScreen('lesson')}
      onStartTricky={() => setScreen('tricky')}
      onOpenProgress={() => setScreen('progress')}
      onOpenAtlas={() => setScreen('atlas')}
      onOpenGames={() => setScreen('games')}
      onStartBoss={() => setScreen('boss')}
      onOpenDuel={() => setScreen('duel')}
      onOpenShop={() => setScreen('shop')}
      onOpenGrownUps={() => setScreen('grownups')}
    />
  )

  const isLessonScreen =
    screen === 'lesson' ||
    screen === 'boss' ||
    screen === 'tricky' ||
    screen === 'unit-drill'

  const lessonMode: LessonMode =
    screen === 'boss'
      ? 'boss'
      : screen === 'tricky'
        ? 'tricky'
        : screen === 'unit-drill'
          ? 'unit'
          : 'daily'

  return (
    <main
      className={`min-h-screen print:bg-white print:pb-0 ${
        welcome ? 'pb-0' : 'pb-16'
      }`}
    >
      {(screen === 'home' || !active) && screen !== 'grownups' && home}
      {isLessonScreen && active && (
        <div className="px-4 py-8">
          <LessonPlayer
            key={`${screen}-${drillUnitId ?? ''}`}
            explorer={active}
            mode={lessonMode}
            drillUnitId={drillUnitId ?? undefined}
            onUpdate={updateExplorer}
            onExit={() => setScreen(screen === 'unit-drill' ? 'progress' : 'home')}
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
          onStartUnitDrill={(unitId) => {
            setDrillUnitId(unitId)
            setScreen('unit-drill')
          }}
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
        <MyAtlas
          explorer={active}
          onUpdate={updateExplorer}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'games' && active && (
        <MapGames
          explorer={active}
          explorers={state.explorers}
          onUpdate={updateExplorer}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'shop' && active && (
        <ExplorerShop
          explorer={active}
          onUpdate={updateExplorer}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'duel' && active && (
        <HeadToHead
          explorers={state.explorers}
          activeExplorer={active}
          duelHistory={state.duelHistory ?? []}
          onRecordDuel={recordDuel}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'grownups' && (
        <GrownUps
          explorers={state.explorers}
          onBack={() => setScreen('home')}
          onPracticeTricky={(explorerId) => {
            setActiveExplorer(explorerId)
            setScreen('tricky')
          }}
        />
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
