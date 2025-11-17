import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, Book, Activity, BarChart3, Layers, GitBranch,
  TrendingUp, Workflow, Brain, CheckCircle, BookOpen, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProgressStore } from '@/store/progressStore'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  moduleId?: string
}

const navItems: NavItem[] = [
  { to: '/', icon: <Home size={20} />, label: 'Home' },
  { to: '/foundations', icon: <Book size={20} />, label: 'Foundations', moduleId: 'foundations' },
  { to: '/kaplan-meier', icon: <Activity size={20} />, label: 'Kaplan-Meier', moduleId: 'kaplan-meier' },
  { to: '/cox-ph', icon: <BarChart3 size={20} />, label: 'Cox PH Model', moduleId: 'cox-ph' },
  { to: '/parametric', icon: <TrendingUp size={20} />, label: 'Parametric Models', moduleId: 'parametric' },
  { to: '/competing-risks', icon: <GitBranch size={20} />, label: 'Competing Risks', moduleId: 'competing-risks' },
  { to: '/landmark', icon: <Layers size={20} />, label: 'Landmark Analysis', moduleId: 'landmark' },
  { to: '/multi-state', icon: <Workflow size={20} />, label: 'Multi-State Models', moduleId: 'multi-state' },
  { to: '/ml-concepts', icon: <Brain size={20} />, label: 'ML Concepts', moduleId: 'ml-concepts' },
  { to: '/assessment', icon: <CheckCircle size={20} />, label: 'Assessment Hub' },
  { to: '/glossary', icon: <BookOpen size={20} />, label: 'Glossary' },
  { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { getModuleProgress } = useProgressStore()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-background z-40',
          'transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex flex-col gap-1 p-4 overflow-y-auto h-full">
          {navItems.map((item) => {
            const progress = item.moduleId ? getModuleProgress(item.moduleId) : null
            const isCompleted = progress?.completed || false

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                    'transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {isCompleted && (
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
