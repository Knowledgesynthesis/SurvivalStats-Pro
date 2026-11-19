import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Award, Clock, GraduationCap, ListTree } from 'lucide-react'
import { MODULES, moduleById } from '@/content/curriculum'
import { useProgress } from '@/store/progress'
import { Checkpoint } from './Checkpoint'
import { RefList, Section } from './blocks'
import { cn } from '@/lib/utils'

function useToc(dep: string) {
  const [items, setItems] = useState<{ id: string; title: string }[]>([])
  const [active, setActive] = useState<string>('')
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('section[data-section]'))
    setItems(els.map((e) => ({ id: e.id, title: e.dataset.section ?? e.id })))
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-80px 0px -65% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [dep])
  return { items, active }
}

export function ModuleLayout({ id, children }: { id: string; children: ReactNode }) {
  const meta = moduleById(id)!
  const visit = useProgress((s) => s.visit)
  const mastery = useProgress((s) => s.mastery[id])
  const { items, active } = useToc(id)
  useEffect(() => {
    visit(id)
    document.title = `${meta.n}. ${meta.title} — SurvivalStats Pro`
  }, [id, visit, meta])
  const idx = MODULES.findIndex((m) => m.id === id)
  const prev = MODULES[idx - 1]
  const next = MODULES[idx + 1]

  return (
    <div className="mx-auto flex max-w-[1180px] gap-10 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <article className="min-w-0 flex-1 max-w-[760px]">
        <header className="mb-10 fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
            <span className="uppercase tracking-[0.14em] text-accent-ink">Module {meta.n}</span>
            <span>Part {meta.part}</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> ~{meta.minutes} min
            </span>
            {mastery?.passed && (
              <span className="inline-flex items-center gap-1 text-good-ink">
                <Award size={12} /> Mastered
              </span>
            )}
          </div>
          <h1 className="text-[2rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.4rem]">{meta.title}</h1>
          <p className="mt-3 text-[1.08rem] leading-relaxed text-ink-2">{meta.why}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <GraduationCap size={15} className="text-accent-ink" /> By the end you can
              </div>
              <ul className="space-y-1 text-sm text-ink">
                {meta.objectives.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm sm:max-w-[220px]">
              <div className="mb-1 font-semibold text-ink">You should know</div>
              <ul className="space-y-0.5 text-ink-2">
                {meta.prereqs.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <div className="space-y-12">
          {children}
          <Section id="checkpoint" title="Checkpoint" kicker="Prove it">
            <p>Answer every question, then submit. Each explanation names the idea it tests. Pass at 80% to mark the module mastered.</p>
            <Checkpoint moduleId={id} />
          </Section>
          <Section id="references" title="Sources and further reading" kicker="Evidence">
            <RefList keys={meta.refs} />
          </Section>
        </div>

        <nav className="mt-16 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="Module navigation">
          {prev ? (
            <Link to={`/learn/${prev.id}`} className="group rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/50">
              <div className="flex items-center gap-1 text-xs text-muted">
                <ArrowLeft size={12} /> Previous
              </div>
              <div className="font-medium text-ink group-hover:text-accent-ink">
                {prev.n}. {prev.title}
              </div>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={`/learn/${next.id}`} className="group rounded-xl border border-line bg-surface px-4 py-3 text-right hover:border-accent/50">
              <div className="flex items-center justify-end gap-1 text-xs text-muted">
                Next <ArrowRight size={12} />
              </div>
              <div className="font-medium text-ink group-hover:text-accent-ink">
                {next.n}. {next.title}
              </div>
            </Link>
          ) : (
            <Link to="/exam" className="group rounded-xl border border-line bg-surface px-4 py-3 text-right hover:border-accent/50">
              <div className="flex items-center justify-end gap-1 text-xs text-muted">
                Finish <ArrowRight size={12} />
              </div>
              <div className="font-medium text-ink group-hover:text-accent-ink">Final exam</div>
            </Link>
          )}
        </nav>
      </article>

      <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto xl:block" aria-label="On this page">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <ListTree size={13} /> On this page
        </div>
        <ul className="space-y-0.5 border-l border-line">
          {items.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`} className={cn('-ml-px block border-l-2 py-1 pl-3 text-[0.82rem] leading-snug', active === it.id ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink')}>
                {it.title}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
