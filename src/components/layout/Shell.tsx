import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Award, BookOpenText, CheckCircle2, Compass, GraduationCap, Library, Menu, Moon, Sun, TrendingUp, X } from 'lucide-react'
import { MODULES, PARTS } from '@/content/curriculum'
import { useProgress, useTheme } from '@/store/progress'
import { cn } from '@/lib/utils'

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M6 8 H11 V12 H15 V17 H20 V21 H26" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M13 12 v-2.6 M22 21 v-2.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const mastery = useProgress((s) => s.mastery)
  const visited = useProgress((s) => s.visited)
  const tool = (to: string, label: string, icon: React.ReactNode) => (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => cn('flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm', isActive ? 'bg-surface-2 font-medium text-ink' : 'text-ink-2 hover:bg-surface-2/70 hover:text-ink')}
    >
      {icon}
      {label}
    </NavLink>
  )
  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5" aria-label="Course">
      {PARTS.map((part) => (
        <div key={part}>
          <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{part}</div>
          <ul className="space-y-0.5">
            {MODULES.filter((m) => m.part === part).map((m) => {
              const done = mastery[m.id]?.passed
              const seen = visited[m.id]
              return (
                <li key={m.id}>
                  <NavLink
                    to={`/learn/${m.id}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn('group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm', isActive ? 'bg-surface-2 font-medium text-ink' : 'text-ink-2 hover:bg-surface-2/70 hover:text-ink')
                    }
                  >
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular',
                        done ? 'border-good bg-good text-white' : seen ? 'border-accent/60 text-accent-ink' : 'border-line text-muted',
                      )}
                    >
                      {done ? <CheckCircle2 size={12} /> : m.n}
                    </span>
                    <span className="truncate">{m.short}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <div>
        <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Tools</div>
        <div className="space-y-0.5">
          {tool('/choose', 'Which method?', <Compass size={16} />)}
          {tool('/exam', 'Final exam', <GraduationCap size={16} />)}
          {tool('/glossary', 'Glossary', <BookOpenText size={16} />)}
          {tool('/references', 'References', <Library size={16} />)}
          {tool('/progress', 'Your progress', <TrendingUp size={16} />)}
        </div>
      </div>
    </nav>
  )
}

export function Shell() {
  const [open, setOpen] = useState(false)
  const { isDarkMode, toggle } = useTheme()
  const mastery = useProgress((s) => s.mastery)
  const mastered = MODULES.filter((m) => mastery[m.id]?.passed).length
  const loc = useLocation()

  useEffect(() => {
    if (!loc.hash) window.scrollTo({ top: 0 })
    else {
      const el = document.getElementById(loc.hash.slice(1))
      if (el) setTimeout(() => el.scrollIntoView(), 50)
    }
  }, [loc.pathname, loc.hash])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <div className="min-h-screen bg-page">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 h-14 border-b border-line bg-page/85 backdrop-blur">
        <div className="flex h-full items-center gap-3 px-3 sm:px-5">
          <button type="button" className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open course menu">
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              SurvivalStats<span className="text-accent-ink"> Pro</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <Link to="/progress" className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 hover:text-ink sm:inline-flex" title="Modules mastered">
              <Award size={13} className={mastered ? 'text-good' : ''} />
              <span className="tabular">
                {mastered}/{MODULES.length}
              </span>{' '}
              mastered
            </Link>
            <button type="button" onClick={toggle} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-64 border-r border-line bg-page lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Course menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 top-0 w-[82%] max-w-xs border-r border-line bg-page shadow-xl fade-up">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <span className="text-sm font-semibold text-ink">Course</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main id="main" className="lg:pl-64">
        <Outlet />
        <footer className="border-t border-line px-4 py-6 text-center text-xs leading-relaxed text-muted sm:px-6">
          Simulated data throughout, plus the published Freireich 6-MP teaching dataset. Calculations are checked against R <code className="font-mono">survival</code> 3.5.8. For learning, not for clinical decisions.
        </footer>
      </main>
    </div>
  )
}
