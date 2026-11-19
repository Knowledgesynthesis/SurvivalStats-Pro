import { useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type BandSeries } from '@/components/charts/Plot'
import { SERIES, atRisk, fnSeries, kmSeries } from '@/components/charts/survival'
import { Button, Resample, Segmented, Slider, StatTile } from '@/components/ui/controls'
import { kaplanMeier, rmst, survAt, type KMFit } from '@/lib/stats/km'
import { logRankTest, type LogRankWeight } from '@/lib/stats/logrank'
import { coxph } from '@/lib/stats/cox'
import { pTwoSided, zCrit } from '@/lib/stats/special'
import { designTrial, eventsFreedman, eventsSchoenfeld, powerSchoenfeld } from '@/lib/stats/design'
import { simTwoArm, twoArmSpec, type Shape2 } from '@/lib/scenarios'
import { leukCombined, LEUK } from '@/content/datasets'
import { fmt, fmtP } from '@/lib/utils'

// ---------- log-rank by hand on the 6-MP data ----------
function LogRankTable() {
  const d = leukCombined()
  const times = Array.from(new Set(d.time.filter((_, i) => d.status[i]))).sort((a, b) => a - b)
  let O = 0
  let E = 0
  let V = 0
  const rows = times.map((t) => {
    const n1 = d.time.filter((v, i) => v >= t && d.group[i] === 1).length
    const n0 = d.time.filter((v, i) => v >= t && d.group[i] === 0).length
    const d1 = d.time.filter((v, i) => v === t && d.status[i] && d.group[i] === 1).length
    const d0 = d.time.filter((v, i) => v === t && d.status[i] && d.group[i] === 0).length
    const n = n1 + n0
    const dd = d1 + d0
    const e1 = (dd * n1) / n
    const v = n > 1 ? (n1 * n0 * dd * (n - dd)) / (n * n * (n - 1)) : 0
    O += d1
    E += e1
    V += v
    return [t, n1, n0, d1, d0, fmt(e1, 2), fmt(d1 - e1, 2), fmt(v, 2)]
  })
  const chi = ((O - E) * (O - E)) / V
  return (
    <>
      <Table head={['Week', 'n placebo', 'n 6-MP', 'd placebo', 'd 6-MP', 'E placebo', 'O − E', 'V']} rows={rows} />
      <div className="not-lesson grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Observed relapses, placebo" value={O} />
        <StatTile label="Expected if no difference" value={fmt(E, 2)} />
        <StatTile label="Variance V" value={fmt(V, 2)} />
        <StatTile label="χ² = (O − E)²/V" value={fmt(chi, 2)} sub={`p = ${fmtP(logRankTest(d).p)} (1 df)`} />
      </div>
    </>
  )
}

// ---------- power lab ----------
const TESTS: { id: string; label: string; w: LogRankWeight; note: string }[] = [
  { id: 'lr', label: 'Log-rank', w: { type: 'logrank' }, note: 'equal weights' },
  { id: 'gb', label: 'Gehan–Breslow', w: { type: 'gehan' }, note: 'w = n(t): early' },
  { id: 'fh01', label: 'FH(0,1)', w: { type: 'fh', rho: 0, gamma: 1 }, note: 'w = 1 − S(t−): late' },
]

function rmstDiff(a: KMFit, b: KMFit, tau: number) {
  const r1 = rmst(a, tau)
  const r0 = rmst(b, tau)
  const diff = r1.rmst - r0.rmst
  const se = Math.sqrt(r1.se ** 2 + r0.se ** 2)
  const z = zCrit()
  return { diff, se, lower: diff - z * se, upper: diff + z * se, p: pTwoSided(diff / se), r1, r0 }
}

function PowerLab() {
  const [shape, setShape] = useState<Shape2>('delayed')
  const [hr, setHr] = useState(0.55)
  const [change, setChange] = useState(6)
  const [nArm, setNArm] = useState(150)
  const [seed, setSeed] = useState(4)
  const [power, setPower] = useState<Record<string, number> | null>(null)
  const [running, setRunning] = useState<number | null>(null)
  const cancel = useRef(false)
  const followUp = 30
  const tau = 24
  const spec = useMemo(() => twoArmSpec(shape, 8, hr, change), [shape, hr, change])
  const d = useMemo(() => simTwoArm(seed, nArm, spec, followUp, 12), [seed, nArm, spec])
  const kmC = useMemo(() => kaplanMeier({ time: d.time.filter((_, i) => d.group[i] === 0), status: d.status.filter((_, i) => d.group[i] === 0) }), [d])
  const kmT = useMemo(() => kaplanMeier({ time: d.time.filter((_, i) => d.group[i] === 1), status: d.status.filter((_, i) => d.group[i] === 1) }), [d])
  const results = useMemo(() => TESTS.map((t) => ({ ...t, r: logRankTest(d, t.w) })), [d])
  const cox = useMemo(() => coxph({ time: d.time, status: d.status, x: d.group.map((g) => [g]) }), [d])
  const rd = rmstDiff(kmT, kmC, tau)
  const times = [0, 6, 12, 18, 24, 30]

  const runPower = async () => {
    cancel.current = false
    const reps = 200
    const hits: Record<string, number> = { lr: 0, gb: 0, fh01: 0, rmst: 0, cox: 0 }
    for (let r = 0; r < reps; r++) {
      if (cancel.current) break
      const sim = simTwoArm(1000 + r, nArm, spec, followUp, 12)
      for (const t of TESTS) if (logRankTest(sim, t.w).p < 0.05) hits[t.id]++
      const a = kaplanMeier({ time: sim.time.filter((_, i) => sim.group[i] === 1), status: sim.status.filter((_, i) => sim.group[i] === 1) })
      const b = kaplanMeier({ time: sim.time.filter((_, i) => sim.group[i] === 0), status: sim.status.filter((_, i) => sim.group[i] === 0) })
      if (rmstDiff(a, b, tau).p < 0.05) hits.rmst++
      if (r % 10 === 9) {
        setRunning(r + 1)
        await new Promise((res) => setTimeout(res, 0))
      }
    }
    setPower(Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, v / reps])))
    setRunning(null)
  }

  return (
    <Lab
      title="Which test detects which kind of difference?"
      goal="Two arms of n patients each, control median 8 months, 12 months of accrual and 30 months of study. Choose how the treatment effect evolves over time, then estimate each test’s power over 200 simulated trials."
      controls={
        <>
          <Segmented
            label="Shape of the effect"
            value={shape}
            onChange={(v) => {
              setShape(v)
              setPower(null)
            }}
            options={[
              { value: 'ph', label: 'Proportional' },
              { value: 'delayed', label: 'Delayed' },
              { value: 'waning', label: 'Waning' },
              { value: 'crossing', label: 'Crossing' },
            ]}
          />
          <Slider label="Hazard ratio (when active)" value={hr} onChange={(v) => { setHr(v); setPower(null) }} min={0.3} max={1} step={0.05} />
          <Slider label="Change point (months)" value={change} onChange={(v) => { setChange(v); setPower(null) }} min={2} max={18} step={1} />
          <Slider label="Patients per arm" value={nArm} onChange={(v) => { setNArm(v); setPower(null) }} min={40} max={400} step={10} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="mb-2 text-sm text-ink-2">{spec.label}</div>
      <Plot
        ariaLabel="Kaplan–Meier curves for two arms"
        series={[
          fnSeries(d.trueControl, 0, followUp, 120, { id: 'tc', label: 'True control', color: SERIES[1], dashed: true, width: 1.5 }),
          fnSeries(d.trueTreat, 0, followUp, 120, { id: 'tt', label: 'True treatment', color: SERIES[0], dashed: true, width: 1.5 }),
          ...kmSeries(kmC, { id: 'c', label: 'Control', color: SERIES[1] }),
          ...kmSeries(kmT, { id: 't', label: 'Treatment', color: SERIES[0] }),
        ]}
        xLabel="Months"
        yLabel="Survival probability"
        yDomain={[0, 1]}
        xDomain={[0, followUp]}
        height={250}
        shades={[{ x0: 0, x1: tau, label: `RMST window τ = ${tau}` }]}
        riskTable={{ times, rows: [{ label: 'Treatment', color: SERIES[0], counts: atRisk(kmT, times) }, { label: 'Control', color: SERIES[1], counts: atRisk(kmC, times) }] }}
      />
      <Table
        className="mt-4"
        head={['Analysis', 'Weights', 'This trial', 'Power (200 trials)']}
        rows={[
          ...results.map((t) => [t.label, t.note, `χ² ${fmt(t.r.chisq, 2)}, p ${fmtP(t.r.p)}`, power ? `${Math.round(power[t.id] * 100)}%` : '—']),
          ['RMST difference (τ = 24)', 'no PH needed', `${fmt(rd.diff, 2)} mo (${fmt(rd.lower, 2)} to ${fmt(rd.upper, 2)}), p ${fmtP(rd.p)}`, power ? `${Math.round(power.rmst * 100)}%` : '—'],
          ['Cox hazard ratio', 'averages over time', `${fmt(cox.coefs[0].hr, 2)} (${fmt(cox.coefs[0].lower, 2)}–${fmt(cox.coefs[0].upper, 2)})`, '≈ log-rank'],
        ]}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runPower} disabled={running !== null}>
          <Play size={14} /> {running !== null ? `Simulating… ${running}/200` : 'Estimate power (200 trials)'}
        </Button>
        {running !== null && (
          <Button variant="ghost" onClick={() => (cancel.current = true)}>
            Stop
          </Button>
        )}
        <span className="text-xs text-muted">Two-sided α = 0.05. Estimates have Monte Carlo SE ≈ 3.5 percentage points.</span>
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Proportional hazards, HR 0.6: estimate power. Which test wins?', see: 'The log-rank test is the most powerful rank test under PH, and Cox is equivalent to it. RMST is a little less powerful but answers a more interpretable question.' },
            { do: 'Delayed effect (change point 9 months): estimate power again.', see: 'FH(0,1) gains power because it up-weights late differences. Gehan–Breslow loses power because it up-weights the early period, where there is no difference. The Cox HR is an average that understates the late benefit.' },
            { do: 'Crossing curves: what happens to log-rank power?', see: 'It can collapse: early harm and late benefit cancel in O − E. The curves are still clearly different, and RMST or a time-split analysis tells a more honest story.' },
            { do: 'Waning effect: compare Gehan–Breslow with FH(0,1).', see: 'Now the early-weighted test wins. No single weighting is best everywhere, which is why the test must be pre-specified, and why combination tests (MaxCombo) are used when the shape is uncertain.' },
          ]}
        />
      </div>
    </Lab>
  )
}

// ---------- RMST on the 6-MP data ----------
function RMSTLab() {
  const [tau, setTau] = useState(23)
  const mp = useMemo(() => kaplanMeier(LEUK.mp), [])
  const pl = useMemo(() => kaplanMeier(LEUK.placebo), [])
  const rd = rmstDiff(mp, pl, tau)
  // band between the curves up to tau
  const grid = Array.from(new Set([0, ...mp.rows.map((r) => r.time), ...pl.rows.map((r) => r.time), tau])).filter((t) => t <= tau).sort((a, b) => a - b)
  const band: BandSeries = { kind: 'band', id: 'gap', label: 'RMST difference (area)', color: SERIES[0], step: true, opacity: 0.18, points: grid.map((t) => ({ x: t, y0: survAt(pl, t), y1: survAt(mp, t) })) }
  return (
    <Lab
      title="RMST: the area under each curve, up to τ"
      goal="Freireich 6-MP trial. RMST(τ) is the mean remission time over the first τ weeks. The shaded area between the curves is the RMST difference."
      controls={<Slider label="Restriction time τ (weeks)" value={tau} onChange={setTau} min={4} max={23} step={1} hint="τ should be pre-specified and supported by enough patients at risk in both arms (here the last placebo time is 23)." />}
    >
      <Plot
        ariaLabel="RMST difference as area between Kaplan–Meier curves"
        series={[band, ...kmSeries(pl, { id: 'pl', label: 'Placebo', color: SERIES[1] }), ...kmSeries(mp, { id: 'mp', label: '6-MP', color: SERIES[0], extendTo: 35 })]}
        xLabel="Weeks"
        yLabel="Remission probability"
        yDomain={[0, 1]}
        xDomain={[0, 35]}
        height={230}
        refLines={[{ x: tau, label: 'τ' }]}
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="RMST 6-MP" value={`${fmt(rd.r1.rmst, 1)} wk`} sub={`SE ${fmt(rd.r1.se, 2)}`} />
        <StatTile label="RMST placebo" value={`${fmt(rd.r0.rmst, 1)} wk`} sub={`SE ${fmt(rd.r0.se, 2)}`} />
        <StatTile label="Difference (95% CI)" value={`${fmt(rd.diff, 1)} wk`} sub={`${fmt(rd.lower, 1)} to ${fmt(rd.upper, 1)} · p ${fmtP(rd.p)}`} />
        <StatTile label="Ratio" value={fmt(rd.r1.rmst / rd.r0.rmst, 2)} sub="6-MP / placebo" />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Reading: “Over the first {tau} weeks, patients on 6-MP stayed in remission on average {fmt(rd.diff, 1)} weeks longer than on placebo.” These numbers reproduce R’s <code className="font-mono">print(survfit(...), rmean = τ)</code>.
      </p>
    </Lab>
  )
}

// ---------- sample size ----------
function SampleSizeLab() {
  const [hr, setHr] = useState(0.75)
  const [alpha, setAlpha] = useState(0.05)
  const [pw, setPw] = useState(0.9)
  const [medC, setMedC] = useState(12)
  const [accrual, setAccrual] = useState(24)
  const [fu, setFu] = useState(12)
  const [drop, setDrop] = useState(0.05)
  const des = designTrial({ medianControl: medC, hr, alpha, power: pw, accrual, followUp: fu, dropout: drop })
  const evMax = Math.max(100, Math.ceil(des.events * 1.8))
  const curve = fnSeries((D) => powerSchoenfeld(D, hr, alpha), 1, evMax, 120, { id: 'pw', label: 'Power', color: SERIES[0] })
  return (
    <Lab
      title="Plan a trial: events first, then patients"
      goal="Schoenfeld’s formula gives the number of events. The event probability under exponential survival, uniform accrual and extra follow-up turns that into patients."
      controls={
        <>
          <Slider label="Target hazard ratio" value={hr} onChange={setHr} min={0.5} max={0.9} step={0.01} />
          <Slider label="Two-sided α" value={alpha} onChange={setAlpha} min={0.01} max={0.1} step={0.005} />
          <Slider label="Power" value={pw} onChange={setPw} min={0.7} max={0.95} step={0.01} format={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Control median (months)" value={medC} onChange={setMedC} min={3} max={48} step={1} />
          <Slider label="Accrual period (months)" value={accrual} onChange={setAccrual} min={0} max={48} step={1} />
          <Slider label="Additional follow-up (months)" value={fu} onChange={setFu} min={1} max={36} step={1} />
          <Slider label="Expected dropout" value={drop} onChange={setDrop} min={0} max={0.3} step={0.01} format={(v) => `${Math.round(v * 100)}%`} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Events (Schoenfeld)" value={des.events} />
        <StatTile label="Events (Freedman)" value={Math.ceil(eventsFreedman(hr, alpha, pw))} />
        <StatTile label="Patients (1:1)" value={des.patients} sub={`P(event): control ${fmt(des.pEventControl * 100, 0)}%, treated ${fmt(des.pEventTreatment * 100, 0)}%`} />
        <StatTile label="Events if HR were 0.70" value={Math.ceil(eventsSchoenfeld(0.7, alpha, pw))} />
      </div>
      <div className="mt-4">
        <Plot ariaLabel="Power against number of events" series={[curve]} xLabel="Number of events" yLabel="Power" yDomain={[0, 1]} height={200} refLines={[{ y: pw, label: `${Math.round(pw * 100)}%` }, { x: des.events }]} />
      </div>
      <MathBlock tex={String.raw`D=\frac{(z_{1-\alpha/2}+z_{1-\beta})^2}{\pi(1-\pi)\,(\log \mathrm{HR})^2}`} caption={<>π is the proportion allocated to one arm (0.5 for 1:1). The trial stops recruiting by events, not patients. Under non-proportional hazards these formulas are optimistic, so simulate instead, as in the lab above.</>} />
    </Lab>
  )
}

export default function ComparingGroups() {
  return (
    <ModuleLayout id="comparing-groups">
      <Section id="logrank" title="The log-rank test, step by step" kicker="Hypothesis test">
        <p>
          Under <M>{'H_0: S_1(t)=S_0(t)'}</M> for all <M>t</M>, at each event time the <M>d_j</M> events should split between the groups in proportion to their numbers at risk. The log-rank test <Cite k="mantel" /> <Cite k="petoPeto" /> sums observed minus expected events over all event times:
        </p>
        <MathBlock
          tex={String.raw`U=\sum_j\left(d_{1j}-\frac{d_j\,n_{1j}}{n_j}\right),\qquad V=\sum_j \frac{n_{1j}\,n_{0j}\,d_j\,(n_j-d_j)}{n_j^2\,(n_j-1)},\qquad \chi^2=\frac{U^2}{V}\sim\chi^2_1`}
          caption="With K groups the statistic generalises to a quadratic form on K − 1 degrees of freedom. A stratified version sums U and V within strata (for example, by centre)."
        />
        <p>On the Freireich data, every relapse time contributes one row:</p>
        <LogRankTable />
        <Callout kind="key">
          The log-rank test is the score test of the Cox model with a single group indicator. It is most powerful when hazards are proportional. It tests whether the curves differ at all; it does not estimate <em>how much</em>. Pair it with an effect measure: a hazard ratio, an RMST difference, or milestone survival differences.
        </Callout>
        <Quiz q={{ id: 'cg-inline-1', stem: 'In the placebo arm 21 relapses were observed and 10.75 were expected under H₀. What does O/E > 1 mean?', options: ['Placebo patients relapsed more often than expected if the arms were equivalent', 'Placebo is protective', 'The test is invalid', 'The hazards are proportional'], answer: 0, why: 'O/E = 1.95 in the placebo arm and 9/19.25 = 0.47 in the 6-MP arm. The ratio of these, about 4.2, is a crude hazard ratio for placebo vs 6-MP, close to the Cox estimate of 4.8.' }} />
      </Section>

      <Section id="weights" title="Weighted tests and non-proportional hazards" kicker="Lab">
        <p>
          Weighted log-rank tests multiply each O − E term by a weight <M>{'w(t_j)'}</M>. The weight decides <em>where in time</em> the test looks for a difference:
        </p>
        <Table
          head={['Test', 'Weight w(t)', 'Most sensitive to']}
          rows={[
            ['Log-rank (Mantel)', '1', 'Proportional hazards'],
            ['Gehan–Breslow (generalised Wilcoxon)', <M key="g">{'n(t)'}</M>, 'Early differences (but its weights also depend on censoring)'],
            ['Peto–Peto / FH(1,0)', <M key="pp">{'\\hat S(t-)'}</M>, 'Early differences'],
            ['Fleming–Harrington FH(0,1)', <M key="fh">{'1-\\hat S(t-)'}</M>, 'Late differences (delayed effects)'],
          ]}
        />
        <PowerLab />
        <Callout kind="practice" title="Pre-specify, don’t shop">
          Choosing the test after seeing the curves inflates the type I error. When a delayed effect is plausible, as with many immunotherapy trials, pre-specify an appropriate weighted test, a combination such as the MaxCombo of several FH weights <Cite k="linMaxCombo" />, or an RMST analysis.
        </Callout>
      </Section>

      <Section id="rmst" title="Restricted mean survival time" kicker="Effect measure">
        <p>
          The restricted mean survival time is the area under the survival curve up to a horizon <M>\tau</M>: the mean event-free time over the first <M>\tau</M> units <Cite k="roystonParmarRMST" />. Differences in RMST are on the time scale, need no proportional-hazards assumption, and are easy to explain to patients <Cite k="uno2014" />.
        </p>
        <MathBlock tex={String.raw`\mathrm{RMST}(\tau)=\int_0^{\tau} S(t)\,dt=E[\min(T,\tau)]`} />
        <RMSTLab />
        <MythFact myth="“RMST difference of 1.5 months means treatment adds 1.5 months of life.”" fact="It is 1.5 months more on average over the first τ months only. A longer τ can give a larger (or smaller) difference. Report τ, and choose it before looking at the data." />
      </Section>

      <Section id="sample-size" title="How many patients? Events drive power" kicker="Design">
        <p>
          The information in a log-rank or Cox comparison is approximately proportional to the number of events, about <M>D/4</M> under 1:1 allocation <Cite k="schoenfeld1983" />. Trials are therefore sized and analysed by events; patients and follow-up are just the means of accruing them.
        </p>
        <SampleSizeLab />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival); library(survRM2)
survdiff(Surv(time, status) ~ arm, data = d)            # log-rank
survdiff(Surv(time, status) ~ arm, data = d, rho = 1)   # Peto-Peto / FH(1,0)
survdiff(Surv(time, status) ~ arm + strata(centre), data = d)   # stratified
rmst2(d$time, d$status, arm = d$arm, tau = 24)          # RMST difference & ratio
# nph::logrank.maxtest() or the 'maxcombo' package for MaxCombo tests`}
          python={`from lifelines.statistics import logrank_test
r = logrank_test(t1, t0, event_observed_A=e1, event_observed_B=e0)
# weighted: weightings="wilcoxon" | "tarone-ware" | "peto" | "fleming-harrington" (with p, q)
r = logrank_test(t1, t0, e1, e0, weightings="fleming-harrington", p=0, q=1)
from lifelines.utils import restricted_mean_survival_time
from lifelines import KaplanMeierFitter
rmst1 = restricted_mean_survival_time(KaplanMeierFitter().fit(t1, e1), t=24)`}
        />
      </Section>

      <Takeaways
        items={[
          'The log-rank test compares observed with expected events over all event times; it is optimal under PH and is the Cox score test.',
          'Weighted tests choose where in time to look; choose before seeing the data.',
          'Crossing or delayed curves can defeat the log-rank test; report the curves, RMST or time-specific contrasts.',
          'RMST(τ) is the mean event-free time up to τ, and a PH-free, clinically readable effect measure.',
          'Power depends on events: D = (z₁₋α/₂ + z₁₋β)² / (π(1−π)(log HR)²). Simulate when hazards may be non-proportional.',
        ]}
      />
    </ModuleLayout>
  )
}
