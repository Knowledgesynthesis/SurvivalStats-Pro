import { useMemo, useState } from 'react'
import { Check, Eye } from 'lucide-react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Figure, Lab, MythFact, Quiz, Section, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot } from '@/components/charts/Plot'
import { SERIES, atRisk, fnSeries, kmSeries } from '@/components/charts/survival'
import { Button, Resample, Segmented, Slider, StatTile } from '@/components/ui/controls'
import { kaplanMeier, medianSurvival, reverseKM, survAt, type CIType } from '@/lib/stats/km'
import { simDelayedEntry, simSingle } from '@/lib/scenarios'
import { LEUK } from '@/content/datasets'
import { cn, fmt } from '@/lib/utils'

// ---------- hand calculation ----------
function HandCalc() {
  const fit = useMemo(() => kaplanMeier(LEUK.mp), [])
  const rows = fit.rows.filter((r) => r.nEvent > 0)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [reveal, setReveal] = useState(false)
  const ok = (key: string, truth: number, tol: number) => {
    const v = parseFloat((vals[key] ?? '').replace(',', '.'))
    return Number.isFinite(v) && Math.abs(v - truth) <= tol
  }
  const cells = rows.flatMap((r, i) => [ok(`n${i}`, r.nRisk, 0), ok(`d${i}`, r.nEvent, 0), ok(`s${i}`, r.surv, 0.0025)])
  const score = cells.filter(Boolean).length
  const input = (key: string, truth: number, tol: number, digits: number) => {
    const good = ok(key, truth, tol)
    return (
      <div className="relative">
        <input
          inputMode="decimal"
          aria-label={key}
          className={cn(
            'w-full min-w-[3.5rem] rounded-md border bg-surface px-2 py-1 text-sm tabular text-ink outline-none focus:border-accent',
            checked && (good ? 'border-good/70 bg-good/[0.06]' : 'border-bad/60 bg-bad/[0.05]'),
            !checked && 'border-line',
          )}
          value={reveal ? truth.toFixed(digits) : (vals[key] ?? '')}
          readOnly={reveal}
          onChange={(e) => {
            setVals((v) => ({ ...v, [key]: e.target.value }))
            setChecked(false)
          }}
        />
      </div>
    )
  }
  return (
    <Lab
      title="Compute a Kaplan–Meier curve by hand"
      goal={
        <>
          The 6-MP arm of the Freireich trial <Cite k="freireich" />: weeks in remission for 21 patients. Fill in the number at risk <M>n_j</M>, the relapses <M>d_j</M> and <M>{'\\hat S(t_j)'}</M> (3 decimals) at each relapse time.
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setChecked(true)}>
            <Check size={14} /> Check
          </Button>
          <Button variant="outline" onClick={() => setReveal((r) => !r)}>
            <Eye size={14} /> {reveal ? 'Hide answers' : 'Show answers'}
          </Button>
          {checked && !reveal && (
            <span className={cn('text-sm', score === cells.length ? 'text-good-ink' : 'text-ink-2')}>
              {score}/{cells.length} cells correct{score === cells.length ? ' — exactly what R and every textbook report.' : ''}
            </span>
          )}
        </div>
      }
    >
      <div className="mb-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-ink">
        6, 6, 6, 6+, 7, 9+, 10, 10+, 11+, 13, 16, 17+, 19+, 20+, 22, 23, 25+, 32+, 32+, 34+, 35+
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-2">
              <th className="py-1.5 pr-3 font-medium">
                Week <M>t_j</M>
              </th>
              <th className="py-1.5 pr-3 font-medium">
                At risk <M>n_j</M>
              </th>
              <th className="py-1.5 pr-3 font-medium">
                Relapses <M>d_j</M>
              </th>
              <th className="py-1.5 pr-3 font-medium">
                <M>{'1-d_j/n_j'}</M>
              </th>
              <th className="py-1.5 font-medium">
                <M>{'\\hat S(t_j)'}</M>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.time} className="border-t border-grid">
                <td className="py-1.5 pr-3 font-semibold text-ink tabular">{r.time}</td>
                <td className="py-1.5 pr-3">{input(`n${i}`, r.nRisk, 0, 0)}</td>
                <td className="py-1.5 pr-3">{input(`d${i}`, r.nEvent, 0, 0)}</td>
                <td className="py-1.5 pr-3 text-ink-2 tabular">{reveal ? `${r.nRisk - r.nEvent}/${r.nRisk}` : '—'}</td>
                <td className="py-1.5">{input(`s${i}`, r.surv, 0.0025, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Rules: a patient is at risk at <M>t_j</M> if their time is ≥ <M>t_j</M>. A patient censored <em>at</em> an event time (here 6+ and 10+) counts as at risk, by the convention that events precede censorings. Censored times change the next risk set, not <M>{'\\hat S'}</M>.
      </p>
    </Lab>
  )
}

// ---------- KM simulator ----------
function KMLab() {
  const [n, setN] = useState(60)
  const [median, setMedian] = useState(12)
  const [share, setShare] = useState(0.3)
  const [ci, setCi] = useState<CIType>('log-log')
  const [seed, setSeed] = useState(7)
  const followUp = 36
  const d = useMemo(() => simSingle(seed, n, median, share, followUp), [seed, n, median, share])
  const fit = useMemo(() => kaplanMeier(d, { ciType: ci }), [d, ci])
  const med = medianSurvival(fit)
  const fu = medianSurvival(reverseKM(d)).median
  const obsMedian = d.time.slice().sort((a, b) => a - b)[Math.floor(d.time.length / 2)]
  const s12 = fit.rows.filter((r) => r.time <= 12).at(-1)
  const times = [0, 6, 12, 18, 24, 30, 36]
  const fmtMed = (v: number) => (Number.isFinite(v) ? fmt(v, 1) : 'NR')
  return (
    <Lab
      title="Kaplan–Meier simulator"
      goal="Simulated patients with exponential survival and a known median. Change the sample size, censoring and interval type, and compare with the dashed truth."
      controls={
        <>
          <Slider label="Patients" value={n} onChange={setN} min={15} max={500} step={5} />
          <Slider label="True median (months)" value={median} onChange={setMedian} min={4} max={40} step={1} />
          <Slider label="Loss to follow-up (target)" value={share} onChange={setShare} min={0} max={0.7} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
          <Segmented label="95% CI scale" value={ci} onChange={setCi} options={[{ value: 'log-log', label: 'log-log' }, { value: 'log', label: 'log' }, { value: 'plain', label: 'plain' }]} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <Plot
        ariaLabel="Kaplan–Meier estimate with confidence band"
        series={[fnSeries(d.trueSurv, 0, followUp, 150, { id: 'truth', label: 'Truth', color: 'var(--ink-2)', dashed: true }), ...kmSeries(fit, { id: 'km', label: 'Kaplan–Meier (95% CI)', color: SERIES[0], ci: true, extendTo: Math.max(...d.time) })]}
        xLabel="Months"
        yLabel="Survival probability"
        yDomain={[0, 1]}
        xDomain={[0, followUp]}
        height={260}
        refLines={[{ y: 0.5 }]}
        riskTable={{ times, rows: [{ label: 'At risk', color: SERIES[0], counts: atRisk(fit, times) }] }}
      />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Median (95% CI)" value={fmtMed(med.median)} sub={`${fmtMed(med.lower)} to ${fmtMed(med.upper)} · truth ${median}`} />
        <StatTile label="S(12) (95% CI)" value={s12 ? fmt(s12.surv, 2) : '1.00'} sub={s12 ? `${fmt(s12.lower, 2)} to ${fmt(s12.upper, 2)} · truth ${fmt(d.trueSurv(12), 2)}` : ''} />
        <StatTile label="Events / censored" value={`${fit.events} / ${n - fit.events}`} />
        <StatTile label="Median follow-up" value={`${fmtMed(fu)} mo`} sub={`reverse KM · naive median time ${fmt(obsMedian, 1)}`} />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Set 15 patients and the “plain” interval. Look near the end of follow-up.', see: 'The plain interval S ± 1.96·SE is symmetric and has to be truncated at 0 and 1. The log-log interval stays inside [0, 1] naturally and is asymmetric, wider toward the middle. Its coverage is closer to 95% in small samples.' },
            { do: 'Hover over the tail of the curve with 70% loss to follow-up. How many are at risk, and how wide is the band?', see: 'A handful at risk produces big steps and a wide band. That region carries little information, which is why guidelines ask for numbers at risk and suggest not extending the plot once very few remain.' },
            { do: 'Increase the true median to 40. What happens to the estimated median?', see: 'It becomes “NR” (not reached): with 36 months of follow-up the curve may never cross 0.5. Report a milestone survival (for example 24-month survival) or the RMST instead.' },
            { do: 'Compare the reverse-KM median follow-up with the naive median of observed times.', see: 'The naive median is much shorter, dragged down by early events. Reverse KM asks how long patients would have been followed had they not had the event, which is what readers mean by “follow-up”.' },
          ]}
        />
      </div>
    </Lab>
  )
}

// ---------- delayed entry ----------
function DelayedEntryLab() {
  const [maxEntry, setMaxEntry] = useState(24)
  const [seed, setSeed] = useState(11)
  const d = useMemo(() => simDelayedEntry(seed, 500, maxEntry), [seed, maxEntry])
  const right = useMemo(() => kaplanMeier(d), [d])
  const naive = useMemo(() => kaplanMeier({ time: d.time, status: d.status }), [d])
  const t = 30
  return (
    <Lab
      title="Delayed entry: counting people as at risk before they were observable"
      goal="Survival is measured from diagnosis, but patients enrol up to X months after diagnosis, and only if still alive. Compare the naive curve with the left-truncated one."
      controls={
        <>
          <Slider label="Latest enrolment after diagnosis (months)" value={maxEntry} onChange={setMaxEntry} min={0} max={48} step={2} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <Plot
        ariaLabel="Naive and left-truncated Kaplan–Meier versus truth"
        series={[
          fnSeries(d.trueSurv, 0, 72, 150, { id: 'truth', label: 'Truth (all diagnosed patients)', color: 'var(--ink-2)', dashed: true }),
          ...kmSeries(naive, { id: 'naive', label: 'Ignores delayed entry', color: SERIES[1], censorMarks: false }),
          ...kmSeries(right, { id: 'lt', label: 'Risk sets start at entry', color: SERIES[0], censorMarks: false }),
        ]}
        xLabel="Months since diagnosis"
        yLabel="Survival probability"
        yDomain={[0, 1]}
        xDomain={[0, 72]}
        height={240}
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="True S(30)" value={fmt(d.trueSurv(t), 2)} />
        <StatTile label="Left-truncated KM" value={fmt(survAt(right, t), 2)} tone="good" />
        <StatTile label="Naive KM" value={fmt(survAt(naive, t), 2)} tone={maxEntry > 0 ? 'bad' : undefined} />
        <StatTile label="Died before enrolling" value={`${d.screened - d.time.length}`} sub={`of ${d.screened} diagnosed — never seen`} />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        The correction uses risk sets <M>{'\\{i : \\text{entry}_i < t \\le T_i\\}'}</M>. When very few patients have entered at small <M>t</M>, the early estimate is unstable. That is a feature of the data, not of the method.
      </p>
    </Lab>
  )
}

function LeukPlot() {
  const mp = useMemo(() => kaplanMeier(LEUK.mp, { ciType: 'log-log' }), [])
  const pl = useMemo(() => kaplanMeier(LEUK.placebo, { ciType: 'log-log' }), [])
  const times = [0, 5, 10, 15, 20, 25, 30, 35]
  const cumCens = (fit: typeof mp) => times.map((t) => fit.rows.filter((r) => r.time <= t).reduce((s, r) => s + r.nCensor, 0))
  const cumEv = (fit: typeof mp) => times.map((t) => fit.rows.filter((r) => r.time <= t).reduce((s, r) => s + r.nEvent, 0))
  const m1 = medianSurvival(mp)
  const m0 = medianSurvival(pl)
  const f = (v: number) => (Number.isFinite(v) ? String(v) : 'NR')
  return (
    <Figure
      caption={
        <>
          A plot in the style recommended by KMunicate <Cite k="kmunicate" />: CIs shown, and numbers at risk, cumulative censored and cumulative events under the axis. The y-axis spans 0 to 1. Medians (log-log CIs): {f(m1.median)} weeks ({f(m1.lower)} to {f(m1.upper)}) on 6-MP vs {f(m0.median)} weeks ({f(m0.lower)} to {f(m0.upper)}) on placebo.
        </>
      }
    >
      <Plot
        ariaLabel="Kaplan–Meier curves for 6-MP and placebo with KMunicate-style table"
        series={[...kmSeries(pl, { id: 'pl', label: 'Placebo', color: SERIES[1], ci: true }), ...kmSeries(mp, { id: 'mp', label: '6-MP', color: SERIES[0], ci: true, extendTo: 35 })]}
        xLabel="Weeks in remission"
        yLabel="Remission probability"
        yDomain={[0, 1]}
        xDomain={[0, 35]}
        height={230}
        riskTable={{
          times,
          title: 'At risk · cumulative censored · cumulative events',
          rows: [
            { label: '6-MP at risk', color: SERIES[0], counts: atRisk(mp, times) },
            { label: '  censored', color: SERIES[0], counts: cumCens(mp) },
            { label: '  events', color: SERIES[0], counts: cumEv(mp) },
            { label: 'Placebo at risk', color: SERIES[1], counts: atRisk(pl, times) },
            { label: '  censored', color: SERIES[1], counts: cumCens(pl) },
            { label: '  events', color: SERIES[1], counts: cumEv(pl) },
          ],
        }}
      />
    </Figure>
  )
}

function NelsonAalenFigure() {
  const pl = useMemo(() => kaplanMeier(LEUK.placebo), [])
  const na = { kind: 'step' as const, id: 'na', label: 'Nelson–Aalen Ĥ(t)', color: SERIES[2], points: [{ x: 0, y: 0 }, ...pl.rows.filter((r) => r.nEvent > 0).map((r) => ({ x: r.time, y: r.cumhaz }))] }
  const mlog = { kind: 'step' as const, id: 'mlog', label: '−log Ŝ_KM(t)', color: SERIES[0], dashed: true, points: [{ x: 0, y: 0 }, ...pl.rows.filter((r) => r.nEvent > 0 && r.surv > 0).map((r) => ({ x: r.time, y: -Math.log(r.surv) }))] }
  return (
    <Figure caption="Placebo arm: the Nelson–Aalen cumulative hazard and −log of the KM estimate agree early and separate in the tail, where d/n is large. The last KM step reaches 0, so −log Ŝ is infinite there.">
      <Plot ariaLabel="Nelson–Aalen and minus log KM" series={[na, mlog]} xLabel="Weeks" yLabel="Cumulative hazard" height={200} xDomain={[0, 25]} />
    </Figure>
  )
}

export default function KaplanMeier() {
  return (
    <ModuleLayout id="kaplan-meier">
      <Section id="idea" title="The product-limit idea" kicker="Estimator">
        <p>
          Surviving to time <M>t</M> means surviving each interval in turn. At each distinct event time <M>t_j</M>, the conditional probability of getting past it, among the <M>n_j</M> still at risk, is estimated by <M>{'1-d_j/n_j'}</M>. Multiplying these gives the Kaplan–Meier (product-limit) estimator <Cite k="kaplanMeier" />:
        </p>
        <MathBlock tex={String.raw`\hat S(t)=\prod_{j:\,t_j\le t}\left(1-\frac{d_j}{n_j}\right)`} caption={<>Censored patients contribute fully to every <M>n_j</M> while observed, then leave. The curve only drops at event times. It is the nonparametric maximum-likelihood estimate of S(t) under independent censoring.</>} />
        <HandCalc />
      </Section>

      <Section id="uncertainty" title="Uncertainty: Greenwood’s formula and the interval scale" kicker="Variance">
        <p>Greenwood’s formula <Cite k="greenwood" /> estimates the variance of the KM estimate:</p>
        <MathBlock tex={String.raw`\widehat{\mathrm{Var}}\{\log \hat S(t)\}=\sum_{j:\,t_j\le t}\frac{d_j}{n_j(n_j-d_j)},\qquad \widehat{\mathrm{Var}}\{\hat S(t)\}=\hat S(t)^2\sum_{j:\,t_j\le t}\frac{d_j}{n_j(n_j-d_j)}`} />
        <p>The pointwise 95% interval can be built on three scales. They give different answers, especially in small samples and near 0 or 1:</p>
        <MathBlock
          tex={String.raw`\text{plain: }\hat S\pm 1.96\,\widehat{\mathrm{SE}}\qquad \text{log: }\hat S\,e^{\pm 1.96\,\sigma}\qquad \text{log-log: }\hat S^{\,\exp(\pm 1.96\,\sigma/\log \hat S)}`}
          caption={<>Here <M>{'\\sigma^2 = \\sum d_j/(n_j(n_j-d_j))'}</M>. R’s survfit defaults to “log”. SAS, Stata and Python lifelines default to log-log. State the scale you used.</>}
        />
        <KMLab />
        <Callout kind="warn" title="Pointwise intervals are not a band">
          A 95% pointwise interval covers S(t) at each <em>single</em> t with 95% probability. It does not mean the whole curve lies inside the shaded region with 95% probability. Simultaneous bands (Hall–Wellner, equal precision) are wider.
        </Callout>
      </Section>

      <Section id="summaries" title="Medians, milestones and follow-up" kicker="Reporting">
        <ul>
          <li>
            <strong>Median survival</strong> is the first time <M>{'\\hat S(t)\\le 0.5'}</M>. If the curve is exactly 0.5 over an interval, the convention is the midpoint of that interval. Its CI comes from where the pointwise CI limits cross 0.5. When the curve stays above 0.5, the median is “not reached”, and so may be its upper limit.
          </li>
          <li>
            <strong>Milestone survival</strong>, <M>{'\\hat S(t^*)'}</M> at a pre-specified time (1-year, 5-year), is often more useful clinically than the median. Choose <M>{'t^*'}</M> in advance. Picking the time point with the biggest difference afterwards is data dredging.
          </li>
          <li>
            <strong>Median follow-up</strong> should be estimated by reverse Kaplan–Meier, swapping the roles of events and censoring <Cite k="schemper" />.
          </li>
        </ul>
        <Quiz q={{ id: 'km-inline-1', stem: 'A trial reports “median follow-up 14 months (median of observed times)”, but many patients died early. Compared with reverse KM, this figure is probably…', options: ['Too short', 'Too long', 'Correct', 'Unrelated to follow-up'], answer: 0, why: 'Early deaths end their observed time early and pull the median down, even though the study kept following survivors. Reverse KM estimates the potential follow-up and is usually longer.' }} />
      </Section>

      <Section id="plots" title="Drawing and reading Kaplan–Meier plots" kicker="Communication">
        <p>
          Consensus recommendations <Cite k="pocock2002" /> <Cite k="kmunicate" /> are simple. Show uncertainty. Show numbers at risk, and ideally cumulative censored and events, at regular times. Use the full 0–1 axis, or mark a broken axis clearly. Do not extend the curve far into a tail held up by a handful of patients.
        </p>
        <LeukPlot />
        <MythFact myth="“The curves separate at 30 weeks, so the treatment effect grows over time.”" fact="Late separation built on a few patients at risk is mostly noise. Read the at-risk numbers and the CI before reading the shape. Formal comparisons are in Module 3." />
      </Section>

      <Section id="nelson-aalen" title="Nelson–Aalen and the cumulative hazard" kicker="Estimator">
        <p>
          Summing <M>{'d_j/n_j'}</M> instead of multiplying <M>{'1-d_j/n_j'}</M> estimates the cumulative hazard directly:
        </p>
        <MathBlock tex={String.raw`\hat H(t)=\sum_{j:\,t_j\le t}\frac{d_j}{n_j},\qquad \widehat{\mathrm{Var}}\{\hat H(t)\}=\sum_{j:\,t_j\le t}\frac{d_j}{n_j^2}`} caption="The plot of Ĥ(t) is a diagnostic for hazard shape: a straight line means a constant hazard, a convex curve a rising one, a concave curve a falling one. It is also the building block for Cox baselines, recurrent-event MCFs and multi-state models." />
        <NelsonAalenFigure />
      </Section>

      <Section id="truncation" title="Delayed entry (left truncation)" kicker="Lab">
        <p>When patients enter observation after the time origin, they must join the risk set at their entry time. Otherwise early risk sets are padded with people who could not have had the event yet.</p>
        <DelayedEntryLab />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival); library(ggsurvfit)
fit <- survfit(Surv(weeks, relapse) ~ arm, data = leuk, conf.type = "log-log")
summary(fit, times = c(10, 20))            # milestone survival with CIs
quantile(fit, probs = 0.5)                 # median and CI
print(fit, rmean = 30)                     # restricted mean to 30 weeks
survfit(Surv(weeks, 1 - relapse) ~ 1, data = leuk)   # reverse KM: follow-up
survfit2(Surv(weeks, relapse) ~ arm, data = leuk) |>
  ggsurvfit() + add_confidence_interval() + add_risktable()`}
          python={`from lifelines import KaplanMeierFitter
from lifelines.plotting import add_at_risk_counts
from lifelines.utils import median_survival_times
kmf = KaplanMeierFitter()                  # log(-log) CIs by default
ax = None
for arm, g in leuk.groupby("arm"):
    kmf.fit(g["weeks"], g["relapse"], label=arm)
    ax = kmf.plot_survival_function(ax=ax)
    print(arm, kmf.median_survival_time_, median_survival_times(kmf.confidence_interval_))
add_at_risk_counts(kmf, ax=ax)`}
        />
      </Section>

      <Takeaways
        items={[
          'KM multiplies conditional survival probabilities at event times; censored patients count in risk sets until they leave.',
          'Greenwood gives the variance; log or log-log intervals behave better than plain ones. Say which you used.',
          'Report the median with its CI (or “not reached”), pre-specified milestones, and median follow-up by reverse KM.',
          'Plot with numbers at risk and CIs, and distrust tails supported by few patients.',
          'With delayed entry, start risk-set membership at entry; ignoring it overestimates survival.',
        ]}
      />
    </ModuleLayout>
  )
}

