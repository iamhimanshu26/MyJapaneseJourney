import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { useAuth } from './context/AuthContext'

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Vocab = lazy(() => import('./pages/Vocab').then((m) => ({ default: m.Vocab })))
const Grammar = lazy(() => import('./pages/Grammar').then((m) => ({ default: m.Grammar })))
const Lookup = lazy(() => import('./pages/Lookup').then((m) => ({ default: m.Lookup })))
const MyDiscovered = lazy(() => import('./pages/MyDiscovered').then((m) => ({ default: m.MyDiscovered })))
const ReviewMode = lazy(() => import('./pages/ReviewMode').then((m) => ({ default: m.ReviewMode })))
const DokkaiAnalyzer = lazy(() => import('./pages/DokkaiAnalyzer').then((m) => ({ default: m.DokkaiAnalyzer })))
const InterviewCoach = lazy(() => import('./pages/InterviewCoach').then((m) => ({ default: m.InterviewCoach })))
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })))
const LearningIntelligence = lazy(() => import('./pages/LearningIntelligence').then((m) => ({ default: m.LearningIntelligence })))
const LearningPlan = lazy(() => import('./pages/LearningPlan').then((m) => ({ default: m.LearningPlan })))
const LearningTimeline = lazy(() => import('./pages/LearningTimeline').then((m) => ({ default: m.LearningTimeline })))
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph').then((m) => ({ default: m.KnowledgeGraph })))
const KotobaSensei = lazy(() => import('./pages/KotobaSensei').then((m) => ({ default: m.KotobaSensei })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Kanji = lazy(() => import('./pages/Kanji').then((m) => ({ default: m.Kanji })))
const AnyIdea = lazy(() => import('./pages/AnyIdea').then((m) => ({ default: m.AnyIdea })))
const GuidedChapters = lazy(() => import('./pages/GuidedChapters').then((m) => ({ default: m.GuidedChapters })))
const LearnFromText = lazy(() => import('./pages/LearnFromText').then((m) => ({ default: m.LearnFromText })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })))
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })))

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="animate-pulse text-[var(--color-text-muted)]">Loading…</div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageFallback />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageFallback />
  if (user) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route
          path="/login"
          element={(
            <PublicOnly>
              <Login />
            </PublicOnly>
          )}
        />
        <Route
          path="/signup"
          element={(
            <PublicOnly>
              <Signup />
            </PublicOnly>
          )}
        />
        <Route
          path="/onboarding"
          element={(
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          )}
        />

        <Route
          path="/"
          element={(
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          )}
        >
          <Route index element={<Dashboard />} />
          <Route path="vocab" element={<Vocab />} />
          <Route path="grammar" element={<Grammar />} />
          <Route path="lookup" element={<Lookup />} />
          <Route path="discovered" element={<MyDiscovered />} />
          <Route path="review-mode" element={<ReviewMode />} />
          <Route path="dokkai-analyzer" element={<DokkaiAnalyzer />} />
          <Route path="interview-coach" element={<InterviewCoach />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="learning-intelligence" element={<LearningIntelligence />} />
          <Route path="learning-plan" element={<LearningPlan />} />
          <Route path="learning-timeline" element={<LearningTimeline />} />
          <Route path="knowledge-graph" element={<KnowledgeGraph />} />
          <Route path="kotoba-sensei" element={<KotobaSensei />} />
          <Route path="settings" element={<Settings />} />
          <Route path="kanji" element={<Kanji />} />
          <Route path="any-idea" element={<AnyIdea />} />
          <Route path="chapters" element={<GuidedChapters />} />
          <Route path="learn-from-text" element={<LearnFromText />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
