import { useEffect, useMemo } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Award, CheckCircle2, Clock, Compass, FlaskConical, ListChecks, ShieldCheck, Target } from 'lucide-react'
import { MODULES, PARTS } from '@/content/curriculum'
import { useProgress } from '@/store/progress'
import { Plot } from '@/components/charts/Plot'
import { kmSeries, SERIES, atRisk } from '@/components/charts/survival'
import { kaplanMeier, medianSurvival } from '@/lib/stats/km'
import { logRankTest } from '@/lib/stats/logrank'
import { coxph } from '@/lib/stats/cox'
import { LEUK, leukCombined } from '@/content/datasets'
import { cn, fmt, fmtP } from '@/lib/utils'

export function HomePage() {
  const mastery = useProgress((s) => s.mastery)
  const visited = useProgress((s) => s.visited)
  useEffect(() => {
    document.title = 'SurvivalStats Pro — Learn survival analysis by doing it'
  }, [])
  const nextModule = MODULES.find((m) => !mastery[m.id]?.passed) ?? MODULES[0]
  const started = Object.keys(visited).length > 0

  const demo = useMemo(() => {
    const mp = kaplanMeier(LEUK.mp, { ciType: 'log-log' })
    const pl = kaplanMeier(LEUK.placebo, { ciType: 'log-log' })
    const all = leukCombined()
    const lr = logRankTest(all)
    const cox = coxph({ time: all.time, status: all.status, x: all.group.map((g) => [1 - g]) })
    return { mp, pl, lr, cox, medMp: medianSurvival(mp), medPl: medianSurvival(pl) }
  }, [])
  const times = [0, 5, 10, 15, 20, 25, 30, 35]

  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 fade-up">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2">
            <ShieldCheck size={14} className="shrink-0 text-good" /> Numbers checked against R <span className="font-mono">survival</span>
          </div>
          <h1 className="text-[2.3rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3rem]">
            Learn survival analysis
            <br />
            by doing it.
          </h1>
          <p className="mt-4 max-w-xl text-[1.1rem] leading-relaxed text-ink-2">
            Twelve modules take you from censoring to machine learning. Every curve, test and model on screen is computed live from simulated data. You change the inputs, predict what happens, check it, and prove mastery at each checkpoint.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/learn/${nextModule.id}`} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm hover:brightness-110">
              {started ? `Continue: ${nextModule.n}. ${nextModule.short}` : 'Start with Module 1'} <ArrowRight size={16} />
            </Link>
            <Link to="/choose" className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-2">
              <Compass size={16} /> Which method do I need?
            </Link>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-sm fade-up">
          <div className="mb-1 text-sm font-semibold text-ink">6-MP vs placebo in acute leukaemia (Freireich 1963)</div>
          <div className="mb-3 text-xs text-ink-2">Kaplan–Meier estimates with 95% log-log CIs · hover for values</div>
          <Plot
            ariaLabel="Kaplan–Meier curves for 6-MP and placebo"
            series={[...kmSeries(demo.pl, { id: 'pl', label: 'Placebo', color: SERIES[1], ci: true }), ...kmSeries(demo.mp, { id: 'mp', label: '6-MP', color: SERIES[0], ci: true, extendTo: 35 })]}
            xLabel="Weeks in remission"
            yLabel="Remission probability"
            yDomain={[0, 1]}
            xDomain={[0, 35]}
            height={220}
            riskTable={{ times, rows: [{ label: '6-MP', color: SERIES[0], counts: atRisk(demo.mp, times) }, { label: 'Placebo', color: SERIES[1], counts: atRisk(demo.pl, times) }] }}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-surface-2 px-2 py-2">
              <div className="text-muted">Median</div>
              <div className="font-semibold text-ink">
                {demo.medMp.median} vs {demo.medPl.median} wk
              </div>
            </div>
            <div className="rounded-lg bg-surface-2 px-2 py-2">
              <div className="text-muted">Log-rank</div>
              <div className="font-semibold text-ink">
                χ² {fmt(demo.lr.chisq, 1)}, p {fmtP(demo.lr.p)}
              </div>
            </div>
            <div className="rounded-lg bg-surface-2 px-2 py-2">
              <div className="text-muted">Cox HR (6-MP)</div>
              <div className="font-semibold text-ink">
                {fmt(demo.cox.coefs[0].hr, 2)} ({fmt(demo.cox.coefs[0].lower, 2)}–{fmt(demo.cox.coefs[0].upper, 2)})
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <Target size={18} />, t: 'One idea at a time', d: 'Each section states the concept, the formula and the precise question it answers.' },
          { icon: <FlaskConical size={18} />, t: 'Live labs', d: 'Simulations with known truth, so you can see bias, variance and coverage rather than take them on faith.' },
          { icon: <ListChecks size={18} />, t: 'Predict, then check', d: '“Try this” prompts ask you to commit to a guess before revealing what happens and why.' },
          { icon: <Award size={18} />, t: 'Mastery, not clicks', d: 'A module counts as mastered only when you pass its checkpoint at 80%.' },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 inline-flex rounded-lg bg-accent/10 p-2 text-accent-ink">{c.icon}</div>
            <div className="font-semibold text-ink">{c.t}</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{c.d}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">The course</h2>
        <p className="mt-1 text-ink-2">About 9 hours end to end. Modules build on each other, but each states its prerequisites.</p>
        <div className="mt-6 space-y-8">
          {PARTS.map((part) => (
            <div key={part}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Part {part}</div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {MODULES.filter((m) => m.part === part).map((m) => {
                  const done = mastery[m.id]?.passed
                  return (
                    <Link key={m.id} to={`/learn/${m.id}`} className={cn('group flex flex-col rounded-2xl border bg-surface p-4 transition-colors hover:border-accent/50', done ? 'border-good/40' : 'border-line')}>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="tabular">Module {m.n}</span>
                        <span className="inline-flex items-center gap-1">
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-good-ink">
                              <CheckCircle2 size={13} /> Mastered
                            </span>
                          ) : (
                            <>
                              <Clock size={12} /> {m.minutes} min
                            </>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 font-semibold leading-snug text-ink group-hover:text-accent-ink">{m.title}</div>
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-2">{m.why}</p>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What “checked against R” means</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          The browser engine reproduces R <span className="font-mono">survival</span> 3.5.8 output for the same data, typically to 7 or more significant digits. That covers Kaplan–Meier estimates and their log, log-log and plain confidence intervals; medians, RMST and left truncation; weighted and stratified log-rank tests; Cox models with Efron or Breslow ties, strata, (start, stop] data, robust variance and ridge penalties; Schoenfeld and martingale residuals; the Grambsch–Therneau test; Aalen–Johansen estimates; Fine–Gray models; and Weibull, log-normal, log-logistic, exponential and Gompertz maximum-likelihood fits. The fixtures and tests ship with the source code.
        </p>
      </section>
    </div>
  )
}
