import { useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { Swimmer, type Lane } from '@/components/charts/Swimmer'
import { SERIES, fnSeries, kmSeries } from '@/components/charts/survival'
import { Resample, Segmented, Slider, StatTile } from '@/components/ui/controls'
import { kaplanMeier, rmst, survAt } from '@/lib/stats/km'
import { DISTRIBUTIONS, distQuantile, hazard, surv, type DistName, type Params } from '@/lib/stats/parametric'
import { simInformative, simSingle, LN2 } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

// ---- Lab 1: calendar time vs analysis time ----
const PATIENTS = [
  { id: 'P1', entry: 0.5, event: 9 },
  { id: 'P2', entry: 1.5, event: 30 },
  { id: 'P3', entry: 3, event: 14, lost: 8 },
  { id: 'P4', entry: 4, event: 12 },
  { id: 'P5', entry: 6, event: 40 },
  { id: 'P6', entry: 8, event: 19 },
  { id: 'P7', entry: 9.5, event: 16 },
  { id: 'P8', entry: 12, event: 34 },
  { id: 'P9', entry: 14, event: 22, lost: 18 },
  { id: 'P10', entry: 17, event: 21 },
]

function CalendarLab() {
  const [lock, setLock] = useState(24)
  const [view, setView] = useState<'calendar' | 'analysis'>('calendar')
  const rows = PATIENTS.map((p) => {
    const evCal = p.entry + p.event
    const lostCal = p.lost !== undefined ? p.entry + p.lost : Infinity
    const endCal = Math.min(evCal, lostCal, lock)
    const outcome: Lane['outcome'] = evCal <= Math.min(lostCal, lock) ? 'event' : 'censor'
    const reason = outcome === 'event' ? 'event' : lostCal < lock ? 'lost to follow-up' : 'alive at database lock'
    return { ...p, endCal, T: Math.max(0, endCal - p.entry), delta: outcome === 'event' ? 1 : 0, outcome, reason }
  }).filter((r) => r.entry < lock)
  const lanes: Lane[] = rows.map((r) => (view === 'calendar' ? { id: r.id, start: r.entry, end: r.endCal, outcome: r.outcome } : { id: r.id, start: 0, end: r.T, outcome: r.outcome }))
  return (
    <Lab
      title="Calendar time → analysis time"
      goal="Patients enrol at different dates. Each one’s outcome is the pair (T, δ): time from their own entry, and whether the event was seen. Move the database lock and watch events turn into censored observations."
      controls={
        <>
          <Slider label="Database lock (month of study)" value={lock} onChange={setLock} min={12} max={60} step={1} />
          <Segmented label="Time axis" value={view} onChange={setView} options={[{ value: 'calendar', label: 'Calendar time' }, { value: 'analysis', label: 'Time since entry' }]} />
        </>
      }
    >
      <Swimmer lanes={lanes} xMax={view === 'calendar' ? 60 : 45} xLabel={view === 'calendar' ? 'Months since the study opened' : 'Months since each patient’s entry (analysis time)'} refX={view === 'calendar' ? lock : undefined} refLabel="database lock" />
      <Table
        className="mt-4"
        head={['Patient', 'Entry (month)', 'T (months)', 'δ', 'Why']}
        rows={rows.map((r) => [r.id, fmt(r.entry, 1), fmt(r.T, 1), r.delta, r.reason])}
      />
    </Lab>
  )
}

// ---- Lab 2: what naive handling of censoring does ----
function NaiveLab() {
  const [share, setShare] = useState(0.4)
  const [seed, setSeed] = useState(1)
  const median = 12
  const followUp = 36
  const d = useMemo(() => simSingle(seed, 400, median, share, followUp), [seed, share])
  const km = useMemo(() => kaplanMeier(d), [d])
  const grid = Array.from({ length: 73 }, (_, i) => i * 0.5)
  const n = d.time.length
  const dropCensored = (t: number) => {
    let alive = 0
    let known = 0
    for (let i = 0; i < n; i++) {
      if (d.time[i] > t) {
        alive++
        known++
      } else if (d.status[i]) known++
    }
    return known ? alive / known : NaN
  }
  const censoredAsSurvivors = (t: number) => d.time.filter((v, i) => v > t || !d.status[i]).length / n
  const series: Series[] = [
    fnSeries(d.trueSurv, 0, followUp, 120, { id: 'truth', label: 'Truth', color: 'var(--ink-2)', dashed: true }),
    ...kmSeries(km, { id: 'km', label: 'Kaplan–Meier', color: SERIES[0], censorMarks: false }),
    { kind: 'step', id: 'drop', label: 'Drop the censored', color: SERIES[1], points: grid.map((t) => ({ x: t, y: dropCensored(t) })) },
    { kind: 'step', id: 'alive', label: 'Count censored as survivors', color: SERIES[2], points: grid.map((t) => ({ x: t, y: censoredAsSurvivors(t) })) },
  ]
  const censored = d.status.filter((s) => !s).length
  const rate = LN2 / median
  const trueRmst = (1 - Math.exp(-rate * followUp)) / rate
  const naiveMean = d.time.reduce((a, b) => a + b, 0) / n
  return (
    <Lab
      title="Three ways to handle censoring — only one is right"
      goal="400 simulated patients, exponential survival with true median 12 months, 36 months of follow-up. Compare each estimate with the dashed truth."
      controls={
        <>
          <Slider label="Share lost to follow-up (target)" value={share} onChange={setShare} min={0} max={0.7} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <Plot ariaLabel="Survival estimates under three censoring strategies" series={series} xLabel="Months" yLabel="Proportion event-free" yDomain={[0, 1]} xDomain={[0, followUp]} height={260} />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Censored" value={`${censored} / ${n}`} />
        <StatTile label="S(12): truth / KM" value={`0.50 / ${fmt(survAt(km, 12), 2)}`} />
        <StatTile label="S(12): drop censored" value={fmt(dropCensored(12), 2)} tone="bad" />
        <StatTile label="S(12): censored = alive" value={fmt(censoredAsSurvivors(12), 2)} tone="bad" />
        <StatTile label="True mean to 36 mo" value={fmt(trueRmst, 1)} />
        <StatTile label="KM restricted mean" value={fmt(rmst(km, followUp).rmst, 1)} tone="good" />
        <StatTile label="Mean of observed times" value={fmt(naiveMean, 1)} tone="bad" sub="censored times are lower bounds" />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Set loss to follow-up to 0%. Do the four curves agree?', see: 'Almost. The only censoring left is administrative, at 36 months, so nothing before 36 months is hidden and every method sees the same data up to there.' },
            { do: 'Raise loss to follow-up to 60%. Which naive method is too pessimistic, and which too optimistic?', see: 'Dropping censored patients removes people who were known to be alive, leaving the events, so it is too pessimistic. Counting the censored as survivors forever is too optimistic. Kaplan–Meier keeps them in the risk set exactly as long as they were observed, then removes them, and stays on the truth.' },
            { do: 'Resample several times at 60% loss. What happens to the KM curve versus the truth?', see: 'It wobbles around the truth, which is random error, but never drifts systematically. That is the difference between variance and bias.' },
          ]}
        />
      </div>
    </Lab>
  )
}

// ---- Lab 3: hazard explorer ----
function paramsFor(name: DistName, median: number, shape: number): Params {
  switch (name) {
    case 'exponential':
      return { rate: LN2 / median }
    case 'weibull':
      return { shape, scale: median / Math.pow(LN2, 1 / shape) }
    case 'gompertz': {
      const b = shape
      const a = Math.abs(b) < 1e-9 ? LN2 / median : (LN2 * b) / Math.expm1(b * median)
      return { shape: b, rate: a }
    }
    case 'loglogistic':
      return { shape, scale: median }
    case 'lognormal':
      return { meanlog: Math.log(median), sdlog: shape }
  }
}
const shapeSpec: Record<DistName, { label: string; min: number; max: number; step: number; def: number } | null> = {
  exponential: null,
  weibull: { label: 'Shape k', min: 0.3, max: 4, step: 0.05, def: 1.5 },
  gompertz: { label: 'Shape b (per month)', min: -0.15, max: 0.3, step: 0.005, def: 0.05 },
  loglogistic: { label: 'Shape β', min: 0.5, max: 5, step: 0.05, def: 2.5 },
  lognormal: { label: 'σ (sdlog)', min: 0.2, max: 2, step: 0.05, def: 0.8 },
}

function HazardExplorer() {
  const [name, setName] = useState<DistName>('weibull')
  const [median, setMedian] = useState(12)
  const [shapes, setShapes] = useState<Record<DistName, number>>({ exponential: 1, weibull: 1.5, gompertz: 0.05, loglogistic: 2.5, lognormal: 0.8 })
  const shape = shapes[name]
  const d = DISTRIBUTIONS[name]
  const p = paramsFor(name, median, shape)
  const tMax = 48
  const hz = fnSeries((t) => hazard(d, Math.max(t, 1e-3), p), 0, tMax, 200, { id: 'h', label: 'h(t)', color: SERIES[1] })
  const sv = fnSeries((t) => surv(d, t, p), 0, tMax, 200, { id: 's', label: 'S(t)', color: SERIES[0] })
  const ch = fnSeries((t) => -Math.log(Math.max(surv(d, t, p), 1e-300)), 0, tMax, 200, { id: 'H', label: 'H(t)', color: SERIES[2] })
  const spec = shapeSpec[name]
  const cureFrac = name === 'gompertz' && shape < 0 ? Math.exp(-p.rate / -shape) : 0
  return (
    <Lab
      title="Hazard shapes and what they do to survival"
      goal="Pick a distribution and a shape while holding the median fixed. The same median can hide very different hazards, and so very different prognoses."
      controls={
        <>
          <Segmented label="Distribution" value={name} onChange={setName} options={(Object.keys(DISTRIBUTIONS) as DistName[]).map((k) => ({ value: k, label: DISTRIBUTIONS[k].label }))} />
          <Slider label="Median (months)" value={median} onChange={setMedian} min={3} max={30} step={1} />
          {spec && <Slider label={spec.label} value={shape} onChange={(v) => setShapes((s) => ({ ...s, [name]: v }))} min={spec.min} max={spec.max} step={spec.step} />}
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Hazard h(t)</div>
          <Plot ariaLabel="Hazard function" series={[hz]} xLabel="Months" yLabel="Events per person-month" height={170} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Survival S(t)</div>
          <Plot ariaLabel="Survival function" series={[sv]} xLabel="Months" yLabel="S(t)" yDomain={[0, 1]} height={170} refLines={[{ y: 0.5 }, { x: median }]} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Cumulative hazard H(t)</div>
          <Plot ariaLabel="Cumulative hazard function" series={[ch]} xLabel="Months" yLabel="H(t)" height={170} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Hazard shape" value={<span className="text-sm">{d.hazardShape}</span>} />
        <StatTile label="S(6) / S(24)" value={`${fmt(surv(d, 6, p), 2)} / ${fmt(surv(d, 24, p), 2)}`} />
        <StatTile label="90th percentile of T" value={`${fmt(distQuantile(d, p, 0.9), 1)} mo`} />
        <StatTile label="Never fail (cured)" value={cureFrac > 0 ? `${fmt(cureFrac * 100, 0)}%` : '0%'} sub={name === 'gompertz' ? 'b < 0 ⇒ S(∞) > 0' : undefined} />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Weibull, shape k = 1. What does the hazard look like?', see: 'Flat: k = 1 is the exponential. The cumulative hazard is a straight line, and S(t) = e^(−λt).' },
            { do: 'Weibull, k = 0.5 versus k = 3, same median. Which has more early deaths, and which a longer tail?', see: 'k = 0.5 front-loads the risk (a falling hazard), so many fail early but survivors last long. k = 3 has few early failures and then a steep collapse around the median. Same median, opposite clinical stories.' },
            { do: 'Log-logistic with β = 3. Where does the hazard peak?', see: 'It rises then falls. This is useful for, say, risk of relapse that peaks some months after treatment. Weibull and Gompertz cannot produce this shape.' },
            { do: 'Gompertz with a negative shape.', see: 'The hazard decays to zero so fast that a fraction never fails, S(∞) > 0. This is a crude cure model. Be careful extrapolating it (Module 6).' },
          ]}
        />
      </div>
    </Lab>
  )
}

// ---- Lab 4: informative censoring ----
function InformativeLab() {
  const [dep, setDep] = useState(1)
  const [seed, setSeed] = useState(3)
  const d = useMemo(() => simInformative(seed, 600, dep), [seed, dep])
  const km = useMemo(() => kaplanMeier(d), [d])
  const t = 24
  return (
    <Lab
      title="When censoring is not independent"
      goal="40% of patients are frail (hazard 5× higher). Dependence > 1 makes frail patients drop out faster than robust ones, for example because they are too unwell to attend. The truth is known exactly."
      controls={
        <>
          <Slider label="Dropout dependence on frailty" value={dep} onChange={setDep} min={1} max={6} step={0.5} format={(v) => (v === 1 ? 'none (independent)' : `${v}×`)} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <Plot
        ariaLabel="Kaplan–Meier versus truth under informative censoring"
        series={[fnSeries(d.trueSurv, 0, 36, 120, { id: 'truth', label: 'Truth', color: 'var(--ink-2)', dashed: true }), ...kmSeries(km, { id: 'km', label: 'Kaplan–Meier', color: SERIES[0], ci: true, censorMarks: false })]}
        xLabel="Months"
        yLabel="Proportion event-free"
        yDomain={[0, 1]}
        xDomain={[0, 36]}
        height={240}
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile label="True S(24)" value={fmt(d.trueSurv(t), 2)} />
        <StatTile label="KM S(24)" value={fmt(survAt(km, t), 2)} tone={Math.abs(survAt(km, t) - d.trueSurv(t)) > 0.04 ? 'bad' : 'good'} />
        <StatTile label="Censored" value={`${Math.round((100 * d.status.filter((s) => !s).length) / d.time.length)}%`} />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        No diagnostic in the observed data can prove censoring is independent. It is an assumption you argue from how follow-up works. When it is doubtful, run sensitivity analyses (for example, inverse-probability-of-censoring weighting using predictors of dropout, or tipping-point analyses).
      </p>
    </Lab>
  )
}

export default function Foundations() {
  return (
    <ModuleLayout id="foundations">
      <Section id="outcome" title="What a time-to-event outcome is" kicker="Definitions">
        <p>A time-to-event outcome needs four decisions, written down before any data are touched:</p>
        <Table
          head={['Decision', 'Question', 'Example (heart-failure trial)']}
          rows={[
            ['Time origin', 'When does the clock start for each person?', 'Randomisation (not diagnosis, not first symptom)'],
            ['Event', 'What exactly ends follow-up as an event?', 'Cardiovascular death or first heart-failure hospitalisation (composite)'],
            ['Time scale', 'What is “time”?', 'Days since randomisation (alternatives: age, calendar time)'],
            ['End of follow-up', 'When and why does observation stop?', 'Database lock, withdrawal, loss to follow-up'],
          ]}
        />
        <p>
          Each patient then contributes the pair <M>{'(T_i,\\ \\delta_i)'}</M>, where <M>{'T_i = \\min(\\text{event time}, \\text{censoring time})'}</M> and <M>{'\\delta_i = 1'}</M> if the event was observed. Every method in this course is a different way of using these pairs without pretending to know what we have not seen.
        </p>
        <Callout kind="practice">
          The time origin should be the moment a patient becomes eligible and the strategies being compared diverge. In a trial that is randomisation. In observational data, choosing it badly creates immortal-time bias (Module 8). Choose a time scale that matches how risk evolves: <em>age</em> is often a better time scale than time-on-study in cohort studies of chronic disease.
        </Callout>
        <CalendarLab />
      </Section>

      <Section id="censoring" title="Censoring and truncation" kicker="Incomplete observation">
        <p>
          <strong>Censoring</strong> means we know only that the event time lies in some range:
        </p>
        <ul>
          <li>
            <strong>Right censoring:</strong> the event had not happened by the last contact (study end, withdrawal, loss to follow-up). This is by far the most common type, and the default in this course.
          </li>
          <li>
            <strong>Left censoring:</strong> the event happened before a known time, but we do not know when. An example is HIV seroconversion before the first test.
          </li>
          <li>
            <strong>Interval censoring:</strong> the event happened between two visits. Examples are tumour progression found at a scheduled scan, or diabetes found at an annual check. Treating the detection date as the event date biases times upward, and much more so with sparse visits.
          </li>
        </ul>
        <p>
          <strong>Left truncation</strong> (delayed entry) is different. People enter observation only if they are still event-free at their entry time. Those who had the event earlier are not censored; they are invisible. The fix is to start each person’s risk-set membership at their entry time (Module 2 lab).
        </p>
        <Quiz q={{ id: 'f-inline-1', stem: 'A cohort recruits patients with cirrhosis from a clinic, on average 3 years after diagnosis, and analyses survival from diagnosis. The problem to handle is…', options: ['Left truncation: patients who died before reaching the clinic are never seen', 'Right censoring only', 'Interval censoring', 'Competing risks'], answer: 0, why: 'Including patients from diagnosis would credit them with years in which they could not have died, because they had to survive to be recruited. Use delayed-entry risk sets, or use time since recruitment as the time scale.' }} />
      </Section>

      <Section id="naive" title="Why censored patients cannot be dropped or ignored" kicker="Lab">
        <p>
          It is tempting to analyse only patients with complete follow-up, or to treat the censored as survivors. Both are biased in predictable directions, and the bias grows with the amount of censoring. This happens even when censoring is completely random.
        </p>
        <NaiveLab />
        <MythFact myth="“40% censoring is too much; the data are unusable.”" fact="Censoring costs precision, but under independent censoring Kaplan–Meier and Cox stay unbiased. What matters is whether censoring is related to prognosis, not how much there is." />
      </Section>

      <Section id="functions" title="Survival, density, hazard and cumulative hazard" kicker="The four functions">
        <p>
          Let <M>T</M> be the (possibly unobserved) event time. Four functions describe its distribution. Knowing any one gives you the others.
        </p>
        <MathBlock
          tex={String.raw`S(t)=P(T>t),\qquad f(t)=-\frac{dS(t)}{dt},\qquad h(t)=\lim_{\Delta\to 0}\frac{P(t\le T<t+\Delta\mid T\ge t)}{\Delta}=\frac{f(t)}{S(t)}`}
          caption={
            <>
              <M>{'S(t)'}</M> is the probability of still being event-free at <M>t</M>. The hazard <M>{'h(t)'}</M> is the event <em>rate</em> among those still at risk, in events per person-time. It is not a probability, and it can exceed 1.
            </>
          }
        />
        <MathBlock tex={String.raw`H(t)=\int_0^t h(u)\,du,\qquad S(t)=\exp\{-H(t)\},\qquad f(t)=h(t)\,S(t)`} caption="The cumulative hazard accumulates risk over time. S(t) = exp(−H(t)) is the identity that links rates to probabilities, and it is why hazard ratios and survival curves are connected but not interchangeable." />
        <Callout kind="tip">
          Think of the hazard as a <strong>speed</strong> and <M>{'1-S(t)'}</M> as the <strong>distance travelled</strong>. A constant hazard of 0.1 per year does not give 10% risk per year forever. It gives <M>{'1-e^{-0.1t}'}</M>, which is 9.5% after one year, 39% after five and 63% after ten.
        </Callout>
        <HazardExplorer />
        <Quiz q={{ id: 'f-inline-2', stem: 'Two treatments have the same median survival of 12 months. Which statement must be true?', options: ['Their hazards are equal', 'Their survival curves cross or touch at 12 months, where both equal 0.5', 'Their 24-month survival is the same', 'Their mean survival is the same'], answer: 1, why: 'Equal medians only pin down one point, S(12) = 0.5. The hazard shapes, tails and means can be completely different, as the explorer shows. Never summarise survival by the median alone.' }} />
      </Section>

      <Section id="independence" title="The assumption behind everything: independent censoring" kicker="Lab">
        <p>
          Kaplan–Meier, the log-rank test and Cox regression all assume that, at any time <M>t</M>, patients censored at <M>t</M> have the same future risk as those who remain under observation (conditional on covariates in the model). Administrative censoring at a fixed date usually satisfies this. Dropout because of worsening health does not.
        </p>
        <InformativeLab />
        <Callout kind="warn" title="Competing events are not censoring">
          Death from another cause is not independent censoring for, say, cancer relapse. The patient will never relapse. Treating competing events as censored targets a hypothetical world in which they could not occur. Module 7 shows what to estimate instead.
        </Callout>
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <p>Survival data are stored as the pair (time, status). In R the response is built with <code>Surv()</code>; in Python, time and event are passed as separate arrays.</p>
        <CodeTabs
          r={`library(survival)
# right-censored outcome: time and status (1 = event, 0 = censored)
y <- Surv(time = df$months, event = df$died)
# delayed entry: (entry, exit, status)
y_lt <- Surv(df$entry, df$exit, df$died)
# interval-censored: event between two visits
y_ic <- Surv(df$last_neg, df$first_pos, type = "interval2")`}
          python={`from lifelines import KaplanMeierFitter
kmf = KaplanMeierFitter()
# right-censored: durations and event indicators
kmf.fit(durations=df["months"], event_observed=df["died"])
# delayed entry (left truncation)
kmf.fit(df["exit"], df["died"], entry=df["entry"])`}
        />
      </Section>

      <Takeaways
        items={[
          'Define the time origin, event, time scale and end of follow-up before analysis; each patient contributes (T, δ).',
          'Censoring hides when the event happens; truncation hides who is in the data. They need different handling.',
          'Dropping censored patients biases survival down; counting them as survivors biases it up; Kaplan–Meier is unbiased under independent censoring.',
          'The hazard is a rate among those at risk; S(t) = exp(−H(t)) links it to probabilities. Equal medians can hide very different hazards.',
          'Independent censoring cannot be verified from the data. Argue it from the design, and run sensitivity analyses when it is doubtful.',
        ]}
      />
      <p className="text-sm text-ink-2">
        Further reading: Clark et al. give an accessible clinical introduction <Cite k="clark2003" />. Klein &amp; Moeschberger cover censoring and truncation in depth <Cite k="klein" />.
      </p>
    </ModuleLayout>
  )
}
