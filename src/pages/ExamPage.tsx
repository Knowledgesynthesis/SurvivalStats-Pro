import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, GraduationCap, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Segmented } from '@/components/ui/controls'
import { QuestionCard } from '@/components/learn/Checkpoint'
import { shuffleQ } from '@/components/learn/shuffle'
import { BANK, type BankQ } from '@/content/questions'
import { MODULES, moduleById } from '@/content/curriculum'
import { useProgress } from '@/store/progress'
import { mulberry32, shuffle } from '@/lib/stats/random'
import { cn } from '@/lib/utils'

type Phase = 'setup' | 'run' | 'done'

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [topics, setTopics] = useState<string[]>(MODULES.map((m) => m.id))
  const [count, setCount] = useState<'10' | '20' | '40' | 'all'>('20')
  const [mode, setMode] = useState<'exam' | 'practice'>('exam')
  const [qs, setQs] = useState<BankQ[]>([])
  const [i, setI] = useState(0)
  const [ans, setAns] = useState<Record<string, number>>({})
  const addExam = useProgress((s) => s.addExam)
  const pool = useMemo(() => BANK.filter((q) => topics.includes(q.module)), [topics])

  const start = () => {
    const seed = Date.now() % 2147483647
    const rng = mulberry32(seed)
    const n = count === 'all' ? pool.length : Math.min(pool.length, +count)
    setQs(shuffle(rng, pool).slice(0, n).map((q) => ({ ...(shuffleQ(q, seed) as BankQ), module: q.module })))
    setAns({})
    setI(0)
    setPhase('run')
  }
  const finish = () => {
    const byTopic: Record<string, [number, number]> = {}
    let score = 0
    for (const q of qs) {
      const ok = ans[q.id] === q.answer
      if (ok) score++
      const t = byTopic[q.module] ?? [0, 0]
      byTopic[q.module] = [t[0] + (ok ? 1 : 0), t[1] + 1]
    }
    addExam({ at: Date.now(), score, total: qs.length, byTopic })
    setPhase('done')
  }

  if (phase === 'setup')
    return (
      <div className="mx-auto max-w-[860px] px-4 pb-24 pt-8 sm:px-6">
        <PageHeader kicker="Assessment" title="Final exam">
          Questions are drawn at random from the {BANK.length}-item bank behind the module checkpoints, with answer options reshuffled every time. Aim for at least 80% before calling a topic mastered.
        </PageHeader>
        <div className="space-y-5 rounded-2xl border border-line bg-surface p-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">Topics</span>
              <span className="space-x-3 text-xs">
                <button type="button" className="text-accent-ink hover:underline" onClick={() => setTopics(MODULES.map((m) => m.id))}>
                  All
                </button>
                <button type="button" className="text-accent-ink hover:underline" onClick={() => setTopics([])}>
                  None
                </button>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODULES.map((m) => {
                const on = topics.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTopics((t) => (on ? t.filter((x) => x !== m.id) : [...t, m.id]))}
                    className={cn('rounded-full border px-3 py-1 text-sm', on ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-2 hover:text-ink')}
                  >
                    {m.n}. {m.short}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Segmented label="Number of questions" value={count} onChange={setCount} options={[{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '40', label: '40' }, { value: 'all', label: `All (${pool.length})` }]} wide={false} />
            <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: 'exam', label: 'Exam: feedback at end' }, { value: 'practice', label: 'Practice: feedback now' }]} />
          </div>
          <Button onClick={start} disabled={pool.length === 0}>
            <GraduationCap size={15} /> Start ({count === 'all' ? pool.length : Math.min(+count, pool.length)} questions)
          </Button>
        </div>
      </div>
    )

  if (phase === 'run') {
    const q = qs[i]
    const answered = ans[q.id] !== undefined
    const m = moduleById(q.module)
    return (
      <div className="mx-auto max-w-[760px] px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-3 flex items-center gap-3 text-sm text-ink-2">
          <span className="tabular">
            {i + 1} / {qs.length}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-grid">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((i + 1) / qs.length) * 100}%` }} />
          </div>
          <span className="text-xs">{m?.short}</span>
        </div>
        <QuestionCard q={q} n={i + 1} choice={ans[q.id]} onChoose={(c) => setAns((a) => (mode === 'practice' && a[q.id] !== undefined ? a : { ...a, [q.id]: c }))} reveal={mode === 'practice' && answered} />
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="outline" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
            <ArrowLeft size={14} /> Previous
          </Button>
          {i < qs.length - 1 ? (
            <Button onClick={() => setI((v) => v + 1)} disabled={!answered}>
              Next <ArrowRight size={14} />
            </Button>
          ) : (
            <Button onClick={finish} disabled={Object.keys(ans).length < qs.length}>
              Finish and score
            </Button>
          )}
        </div>
      </div>
    )
  }

  const score = qs.filter((q) => ans[q.id] === q.answer).length
  const pct = Math.round((score / qs.length) * 100)
  const byModule = MODULES.map((m) => {
    const mine = qs.filter((q) => q.module === m.id)
    return { m, n: mine.length, right: mine.filter((q) => ans[q.id] === q.answer).length }
  }).filter((r) => r.n > 0)
  return (
    <div className="mx-auto max-w-[860px] px-4 pb-24 pt-8 sm:px-6">
      <PageHeader kicker="Result" title={`${score} / ${qs.length} (${pct}%)`}>
        {pct >= 80 ? 'Strong command of the material. Review any misses below.' : 'Review the explanations below, then revisit the modules flagged in orange.'}
      </PageHeader>
      <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface">
        {byModule.map(({ m, n, right }) => {
          const p = right / n
          return (
            <Link key={m.id} to={`/learn/${m.id}`} className="flex items-center gap-3 border-b border-grid px-4 py-2.5 text-sm last:border-b-0 hover:bg-surface-2/60">
              <span className="min-w-0 flex-1 truncate text-ink">
                {m.n}. {m.title}
              </span>
              <span className="w-28">
                <span className="block h-1.5 overflow-hidden rounded-full bg-grid">
                  <span className={cn('block h-full rounded-full', p >= 0.8 ? 'bg-good' : 'bg-warn')} style={{ width: `${p * 100}%` }} />
                </span>
              </span>
              <span className="w-12 text-right text-ink-2 tabular">
                {right}/{n}
              </span>
            </Link>
          )
        })}
      </div>
      <div className="space-y-3">
        {qs.map((q, k) => (
          <QuestionCard key={q.id} q={q} n={k + 1} choice={ans[q.id]} onChoose={() => {}} reveal />
        ))}
      </div>
      <div className="mt-6">
        <Button onClick={() => setPhase('setup')}>
          <RotateCcw size={14} /> New exam
        </Button>
      </div>
    </div>
  )
}
