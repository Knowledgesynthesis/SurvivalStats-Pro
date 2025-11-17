import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useThemeStore } from '@/store/themeStore'
import { useProgressStore } from '@/store/progressStore'
import { Moon, Sun, Trash2, Download, Award } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore()
  const { modules, getTotalProgress } = useProgressStore()

  const totalProgress = getTotalProgress()

  const handleResetProgress = () => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      // Clear progress from localStorage
      localStorage.removeItem('progress-storage')
      window.location.reload()
    }
  }

  const handleExportData = () => {
    const data = {
      modules,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `survivalstats-pro-progress-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const completedModules = Object.values(modules).filter(m => m.completed).length
  const totalModules = Object.keys(modules).length

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your preferences and progress
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Track your learning journey</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Completion</span>
                <span className="font-medium">{Math.round(totalProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{completedModules}</p>
              <p className="text-sm text-muted-foreground">Modules Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{totalModules}</p>
              <p className="text-sm text-muted-foreground">Total Modules</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  {isDarkMode ? 'Dark mode is enabled' : 'Light mode is enabled'}
                </p>
              </div>
            </div>
            <Button onClick={toggleTheme} variant="outline">
              {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export or reset your learning data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Export Progress</p>
                <p className="text-sm text-muted-foreground">
                  Download your progress as JSON
                </p>
              </div>
            </div>
            <Button onClick={handleExportData} variant="outline">
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">Reset Progress</p>
                <p className="text-sm text-muted-foreground">
                  Clear all learning progress and start over
                </p>
              </div>
            </div>
            <Button onClick={handleResetProgress} variant="destructive">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About SurvivalStats Pro</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            <strong>Version:</strong> 1.0.0
          </p>
          <p>
            SurvivalStats Pro is a comprehensive educational platform for learning survival analysis
            and time-to-event methods. All data used in this application is completely synthetic and
            generated for educational purposes only.
          </p>

          <h3>Educational Use Only</h3>
          <p className="text-sm">
            This application is designed for learning and education. It is not intended for clinical
            decision support, real-world predictions, or any form of medical diagnosis or treatment.
            All statistical methods are implemented following canonical textbook formulations.
          </p>

          <h3>Data Privacy</h3>
          <p className="text-sm">
            All your progress data is stored locally in your browser. No data is transmitted to
            external servers. Your learning progress is private and remains on your device.
          </p>

          <h3>Offline Capability</h3>
          <p className="text-sm">
            This app is designed to work offline once loaded. You can continue learning even without
            an internet connection.
          </p>

          <div className="p-4 rounded-lg bg-muted not-prose mt-4">
            <p className="text-xs text-muted-foreground">
              Built with React, TypeScript, Tailwind CSS, and statistical rigor.
              All survival analysis algorithms follow evidence-based methodologies from canonical textbooks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
