import { Link } from 'react-router'
import { Award, Download, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, StatTile } from '@/components/ui/controls'
import { MODULES } from '@/content/curriculum'
import { useProgress } from '@/store/progress'
import { cn } from '@/lib/utils'

export default function ProgressPage() {
  const { mastery, visited, exams, answers, reset } = useProgress()
  const mastered = MODULES.filter((m) => mastery[m.id]?.passed).length
  const inline = Object.values(answers)
  const lastExam = exams.at(-1)
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), mastery, visited, exams, answers }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `survivalstats-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="mx-auto max-w-[860px] px-4 pb-24 pt-8 sm:px-6">
      <PageHeader kicker="You" title="Your progress">
        Stored only in this browser. A module is mastered when its checkpoint is passed at 80% or more.
      </PageHeader>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Modules mastered" value={`${mastered} / ${MODULES.length}`} tone={mastered === MODULES.length ? 'good' : undefined} />
        <StatTile label="Modules opened" value={`${Object.keys(visited).filter((k) => MODULES.some((m) => m.id === k)).length} / ${MODULES.length}`} />
        <StatTile label="Inline questions right first time" value={inline.length ? `${inline.filter((a) => a.correct).length} / ${inline.length}` : '—'} />
        <StatTile label="Last exam" value={lastExam ? `${Math.round((lastExam.score / lastExam.total) * 100)}%` : '—'} sub={lastExam ? new Date(lastExam.at).toLocaleDateString() : undefined} />
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
        {MODULES.map((m) => {
          const ms = mastery[m.id]
          const pct = ms ? Math.round((ms.score / ms.total) * 100) : 0
          return (
            <Link key={m.id} to={`/learn/${m.id}`} className="flex items-center gap-3 border-b border-grid px-4 py-3 last:border-b-0 hover:bg-surface-2/60">
              <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] tabular', ms?.passed ? 'border-good bg-good text-white' : 'border-line text-ink-2')}>{ms?.passed ? <Award size={13} /> : m.n}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{m.title}</span>
              <span className="hidden w-32 sm:block">
                <span className="block h-1.5 overflow-hidden rounded-full bg-grid">
                  <span className={cn('block h-full rounded-full', ms?.passed ? 'bg-good' : 'bg-accent')} style={{ width: `${pct}%` }} />
                </span>
              </span>
              <span className="w-16 text-right text-xs text-ink-2 tabular">{ms ? `${ms.score}/${ms.total}` : visited[m.id] ? 'opened' : '—'}</span>
            </Link>
          )
        })}
      </div>
      {exams.length > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 text-sm font-semibold text-ink">Exam history</div>
          <ul className="space-y-1 text-sm text-ink-2">
            {exams.slice(-8).reverse().map((e) => (
              <li key={e.at} className="flex justify-between tabular">
                <span>{new Date(e.at).toLocaleString()}</span>
                <span className="text-ink">
                  {e.score}/{e.total} ({Math.round((e.score / e.total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportData}>
          <Download size={14} /> Export progress (JSON)
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm('Reset all progress, checkpoint scores and exam history? This cannot be undone.')) reset()
          }}
        >
          <RotateCcw size={14} /> Reset progress
        </Button>
      </div>
    </div>
  )
}
