import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { useThemeStore } from './store/themeStore'

// Pages
import { HomePage } from './pages/HomePage'
import { FoundationsPage } from './pages/FoundationsPage'
import { KaplanMeierPage } from './pages/KaplanMeierPage'
import { CoxPHPage } from './pages/CoxPHPage'
import { ParametricModelsPage } from './pages/ParametricModelsPage'
import { CompetingRisksPage } from './pages/CompetingRisksPage'
import { LandmarkPage } from './pages/LandmarkPage'
import { MultiStatePage } from './pages/MultiStatePage'
import { MLConceptsPage } from './pages/MLConceptsPage'
import { AssessmentPage } from './pages/AssessmentPage'
import { GlossaryPage } from './pages/GlossaryPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const { isDarkMode, setTheme } = useThemeStore()

  useEffect(() => {
    // Initialize theme on mount
    setTheme(isDarkMode)
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="foundations" element={<FoundationsPage />} />
          <Route path="kaplan-meier" element={<KaplanMeierPage />} />
          <Route path="cox-ph" element={<CoxPHPage />} />
          <Route path="parametric" element={<ParametricModelsPage />} />
          <Route path="competing-risks" element={<CompetingRisksPage />} />
          <Route path="landmark" element={<LandmarkPage />} />
          <Route path="multi-state" element={<MultiStatePage />} />
          <Route path="ml-concepts" element={<MLConceptsPage />} />
          <Route path="assessment" element={<AssessmentPage />} />
          <Route path="glossary" element={<GlossaryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
