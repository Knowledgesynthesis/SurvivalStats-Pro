import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router'
import { Shell } from '@/components/layout/Shell'
import { HomePage } from '@/pages/HomePage'

const modulePages: Record<string, React.LazyExoticComponent<ComponentType>> = {
  foundations: lazy(() => import('@/pages/modules/Foundations')),
  'kaplan-meier': lazy(() => import('@/pages/modules/KaplanMeier')),
  'comparing-groups': lazy(() => import('@/pages/modules/ComparingGroups')),
  cox: lazy(() => import('@/pages/modules/Cox')),
  'ph-assumption': lazy(() => import('@/pages/modules/PHAssumption')),
  parametric: lazy(() => import('@/pages/modules/Parametric')),
  'competing-risks': lazy(() => import('@/pages/modules/CompetingRisks')),
  'time-dependent': lazy(() => import('@/pages/modules/TimeDependent')),
  'recurrent-events': lazy(() => import('@/pages/modules/RecurrentEvents')),
  'multi-state': lazy(() => import('@/pages/modules/MultiState')),
  prediction: lazy(() => import('@/pages/modules/Prediction')),
  'machine-learning': lazy(() => import('@/pages/modules/MachineLearning')),
}
const ChoosePage = lazy(() => import('@/pages/ChoosePage'))
const ExamPage = lazy(() => import('@/pages/ExamPage'))
const GlossaryPage = lazy(() => import('@/pages/GlossaryPage'))
const ReferencesPage = lazy(() => import('@/pages/ReferencesPage'))
const ProgressPage = lazy(() => import('@/pages/ProgressPage'))

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted" role="status">
      Loading…
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-ink-2">That address does not match a module.</p>
      <Link to="/" className="mt-6 inline-block text-accent-ink underline">
        Back to the course
      </Link>
    </div>
  )
}

function ModuleRoute() {
  const { id = '' } = useParams()
  const Page = modulePages[id]
  return Page ? <Page /> : <NotFound />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="learn/:id" element={<ModuleRoute />} />
            <Route path="choose" element={<ChoosePage />} />
            <Route path="exam" element={<ExamPage />} />
            <Route path="glossary" element={<GlossaryPage />} />
            <Route path="references" element={<ReferencesPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
