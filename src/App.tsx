import { useState } from 'react'
import { AppProvider, useApp } from './state/AppContext'
import { Home } from './components/Home'
import { LessonPlayer } from './components/LessonPlayer'
import { Progress } from './components/Progress'
import { SectionReview } from './components/SectionReview'

type Screen = 'home' | 'lesson' | 'progress' | 'review'

function Shell() {
  const [screen, setScreen] = useState<Screen>('home')
  const [reviewUnitId, setReviewUnitId] = useState<string | null>(null)
  const { active, updateExplorer } = useApp()

  return (
    <main className="min-h-screen pb-16 print:bg-white print:pb-0">
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
        />
      )}
      {screen === 'review' && reviewUnitId && (
        <SectionReview
          unitId={reviewUnitId}
          onBack={() => setScreen('progress')}
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
