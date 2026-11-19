import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { Forest } from '@/components/charts/Forest'
import { SERIES, fnSeries } from '@/components/charts/survival'
import { Button, Resample, Slider, StatTile } from '@/components/ui/controls'
import { coxph, predictSurvival } from '@/lib/stats/cox'
import { harrellC } from '@/lib/stats/validation'
import { mulberry32, rexp, rbern } from '@/lib/stats/random'
import { simCoxTrial } from '@/lib/scenarios'
import { cn, fmt, fmtP } from '@/lib/utils'

// ---------- partial likelihood lottery ----------
const TOY = [
  { id: 'A', time: 2, status: 1, x: 0 },
  { id: 'B', time: 3, status: 1, x: 1 },
  { id: 'C', time: 4, status: 0, x: 0 },
  { id: 'D', time: 5, status: 1, x: 0 },
  { id: 'E', time: 7, status: 1, x: 1 },
  { id: 'F', time: 9, status: 0, x: 1 },
]
function logPL(beta: number) {
  let ll = 0
  for (const p of TOY) {
    if (!p.status) continue
    const risk = TOY.filter((q) => q.time >= p.time)
    ll += beta * p.x - Math.log(risk.reduce((s, q) => s + Math.exp(beta * q.x), 0))
  }
  return ll
}
function LotteryLab() {
  const [beta, setBeta] = useState(0)
  const fit = useMemo(() => coxph({ time: TOY.map((p) => p.time), status: TOY.map((p) => p.status), x: TOY.map((p) => [p.x]) }), [])
  const curve = fnSeries(logPL, -3, 3, 120, { id: 'pl', label: 'log partial likelihood', color: SERIES[0] })
  const events = TOY.filter((p) => p.status)
  return (
    <Lab
      title="The partial likelihood as a lottery"
      goal="Six patients; x = 1 means treated. At each event time, ask: given that one person in the risk set failed, what was the probability it was this one? Under the model each person’s ticket weight is exp(βx)."
      controls={<Slider label="β (log hazard ratio for treated)" value={beta} onChange={setBeta} min={-3} max={3} step={0.05} format={(v) => `${v.toFixed(2)}  (HR ${Math.exp(v).toFixed(2)})`} />}
    >
      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-2">
          {events.map((p) => {
            const risk = TOY.filter((q) => q.time >= p.time)
            const tot = risk.reduce((s, q) => s + Math.exp(beta * q.x), 0)
            return (
              <div key={p.id} className="rounded-lg border border-line px-3 py-2">
                <div className="mb-1.5 text-xs text-muted">
                  t = {p.time}: {p.id} fails · risk set {risk.map((q) => q.id).join(', ')}
                </div>
                <div className="flex h-6 w-full overflow-hidden rounded-md">
                  {risk.map((q) => {
                    const share = Math.exp(beta * q.x) / tot
                    return (
                      <div
                        key={q.id}
                        title={`${q.id}: ${(share * 100).toFixed(0)}%`}
                        className={cn('flex items-center justify-center border-r-2 border-surface text-[11px] font-medium text-white last:border-r-0', q.id === p.id ? 'opacity-100' : 'opacity-45')}
                        style={{ width: `${share * 100}%`, background: q.x ? 'var(--s1)' : 'var(--s2)' }}
                      >
                        {share > 0.08 ? q.id : ''}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-1 text-xs text-ink-2 tabular">
                  P(it was {p.id}) = {(Math.exp(beta * p.x) / tot).toFixed(3)}
                </div>
              </div>
            )
          })}
          <div className="text-xs text-ink-2">
            Colours: <span className="font-medium text-ink">blue = treated (x = 1)</span>, orange = control. The solid block is the patient who actually failed.
          </div>
        </div>
        <div className="min-w-0">
          <Plot ariaLabel="Log partial likelihood as a function of beta" series={[curve, { kind: 'scatter', id: 'now', label: 'current β', color: SERIES[1], points: [{ x: beta, y: logPL(beta) }], r: 5, opacity: 1 }]} xLabel="β" yLabel="log partial likelihood" height={230} refLines={[{ x: fit.beta[0], label: 'MLE' }]} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <StatTile label="Product of the four probabilities" value={Math.exp(logPL(beta)).toExponential(2)} />
            <StatTile label="Maximum at" value={<M>{`\\hat\\beta = ${fit.beta[0].toFixed(3)}`}</M>} sub={`HR ${fit.coefs[0].hr.toFixed(2)}, 95% CI ${fit.coefs[0].lower.toFixed(2)}–${fit.coefs[0].upper.toFixed(2)}`} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        The baseline hazard <M>{'h_0(t)'}</M> multiplies every ticket weight equally at a given time, so it cancels from each probability. That is why the Cox model needs no assumption about its shape. With only 6 patients the CI is enormous; Cox regression needs events, not just patients.
      </p>
    </Lab>
  )
}

// ---------- fitting lab ----------
function FitLab() {
  const [n, setN] = useState(400)
  const [hrT, setHrT] = useState(0.7)
  const [hrA, setHrA] = useState(1.4)
  const [hrM, setHrM] = useState(1.25)
  const [seed, setSeed] = useState(2)
  const dn = useDeferredValue(n)
  const dT = useDeferredValue(hrT)
  const dA = useDeferredValue(hrA)
  const dM = useDeferredValue(hrM)
  const d = useMemo(() => simCoxTrial(seed, dn, dT, dA, dM), [seed, dn, dT, dA, dM])
  const fit = useMemo(() => coxph({ time: d.time, status: d.status, x: d.trt.map((t, i) => [t, (d.age[i] - 60) / 10, d.marker[i]]) }, { names: ['Treatment', 'Age (per 10 y)', 'Marker (per SD)'] }), [d])
  const c = harrellC(d.time, d.status, fit.linearPredictor).c
  const truths = [hrT, hrA, hrM]
  const profiles = [
    { label: 'Age 70, untreated', x: [0, 1, 0], color: SERIES[1], args: [0, 70, 0] as const },
    { label: 'Age 70, treated', x: [1, 1, 0], color: SERIES[0], args: [1, 70, 0] as const },
  ]
  const series: Series[] = profiles.flatMap((p) => [
    { kind: 'step' as const, id: p.label, label: `${p.label} (Cox)`, color: p.color, points: predictSurvival(fit, p.x).map((s) => ({ x: s.time, y: s.surv })), extendTo: 48 },
    fnSeries((t) => d.trueSurv(t, p.args[0], p.args[1], p.args[2]), 0, 48, 100, { id: `${p.label}-t`, label: `${p.label} (truth)`, color: p.color, dashed: true, width: 1.5 }),
  ])
  return (
    <Lab
      title="Fit a Cox model and compare it with the truth"
      goal="A simulated trial: 1:1 treatment, age, and a standardised biomarker act multiplicatively on a Weibull baseline hazard. Set the true effects, then see what the Cox model recovers."
      controls={
        <>
          <Slider label="Patients" value={n} onChange={setN} min={60} max={2000} step={20} />
          <Slider label="True HR: treatment" value={hrT} onChange={setHrT} min={0.3} max={1.5} step={0.05} />
          <Slider label="True HR: per 10 years of age" value={hrA} onChange={setHrA} min={0.8} max={2.5} step={0.05} />
          <Slider label="True HR: per SD of marker" value={hrM} onChange={setHrM} min={0.5} max={2} step={0.05} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <Table
        head={['Covariate', <span key="b"><M>{'\\hat\\beta'}</M> (SE)</span>, 'HR (95% CI)', 'p', 'True HR']}
        rows={fit.coefs.map((cf, j) => [cf.name, `${fmt(cf.coef, 3)} (${fmt(cf.se, 3)})`, `${fmt(cf.hr, 2)} (${fmt(cf.lower, 2)}–${fmt(cf.upper, 2)})`, fmtP(cf.p), fmt(truths[j], 2)])}
      />
      <Forest rows={fit.coefs.map((cf, j) => ({ label: cf.name, est: cf.hr, lo: cf.lower, hi: cf.upper, truth: truths[j] }))} />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Events / patients" value={`${fit.nEvents} / ${fit.n}`} />
        <StatTile label="Likelihood-ratio test" value={`χ² ${fmt(fit.lrTest.chisq, 1)}`} sub={`3 df, p ${fmtP(fit.lrTest.p)}`} />
        <StatTile label="Harrell’s C" value={fmt(c, 3)} />
        <StatTile label="Converged" value={fit.converged ? `yes, ${fit.iterations} iterations` : 'no'} />
      </div>
      <div className="mt-5">
        <div className="mb-1 text-sm font-medium text-ink">Predicted survival for two patients (Breslow baseline)</div>
        <Plot ariaLabel="Predicted survival curves" series={series} xLabel="Months" yLabel="Survival probability" yDomain={[0, 1]} xDomain={[0, 48]} height={220} />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Drop to 60 patients and resample a few times. How stable are the estimates?', see: 'Very unstable. With roughly 40 events, three coefficients are fitted from little information. A common rule of thumb asks for at least 10–20 events per parameter for stable estimation, but prediction models need formal sample-size calculations (Module 11).' },
            { do: 'Set the treatment HR to 1. How often is p < 0.05 when you resample?', see: 'About 1 in 20 samples. That is the type I error doing exactly what it promises.' },
            { do: 'Compare the predicted curves for treated and untreated patients at 48 months.', see: 'The HR is constant, but the absolute difference in survival is not. It grows, then shrinks as both curves fall. Patients and clinicians decide on absolute risks, so show them.' },
          ]}
        />
      </div>
    </Lab>
  )
}

// ---------- absolute risk translator ----------
function AbsoluteRiskLab() {
  const [hr, setHr] = useState(0.7)
  const [risk0, setRisk0] = useState(0.3)
  const s1 = Math.pow(1 - risk0, hr)
  const risk1 = 1 - s1
  const arr = risk0 - risk1
  return (
    <Lab title="From hazard ratio to absolute risk" goal="Under proportional hazards S₁(t) = S₀(t)^HR. The same HR means very different absolute benefits depending on baseline risk.">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Slider label="Hazard ratio" value={hr} onChange={setHr} min={0.3} max={1.5} step={0.01} />
        <Slider label="Control risk by time t" value={risk0} onChange={setRisk0} min={0.01} max={0.95} step={0.01} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Treated risk by t" value={`${fmt(risk1 * 100, 1)}%`} />
        <StatTile label="Absolute risk reduction" value={`${fmt(arr * 100, 1)} pp`} />
        <StatTile label="NNT by t" value={arr > 0 ? Math.ceil(1 / arr) : arr < 0 ? `NNH ${Math.ceil(-1 / arr)}` : '∞'} />
        <StatTile label="Risk ratio" value={fmt(risk1 / risk0, 2)} sub={`vs HR ${fmt(hr, 2)}`} />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        The risk ratio approaches the HR only when risks are small. At 60% control risk and HR 0.70, the treated risk is 47%, not 42%.
      </p>
    </Lab>
  )
}

// ---------- coverage simulation ----------
function CoverageLab() {
  const [res, setRes] = useState<{ est: number; lo: number; hi: number }[]>([])
  const [running, setRunning] = useState(false)
  const stop = useRef(false)
  const trueHR = 0.7
  const run = async () => {
    setRunning(true)
    stop.current = false
    const out: { est: number; lo: number; hi: number }[] = []
    for (let r = 0; r < 100 && !stop.current; r++) {
      const d = simCoxTrial(500 + r, 200, trueHR, 1, 1)
      const f = coxph({ time: d.time, status: d.status, x: d.trt.map((t) => [t]) })
      out.push({ est: f.coefs[0].hr, lo: f.coefs[0].lower, hi: f.coefs[0].upper })
      if (r % 10 === 9) {
        setRes(out.slice())
        await new Promise((r2) => setTimeout(r2, 0))
      }
    }
    setRes(out.slice())
    setRunning(false)
  }
  const covered = res.filter((r) => r.lo <= trueHR && r.hi >= trueHR).length
  const sorted = res.slice().sort((a, b) => a.est - b.est)
  const series: Series[] = sorted.flatMap((r, i) => {
    const miss = !(r.lo <= trueHR && r.hi >= trueHR)
    return [{ kind: 'line' as const, id: `ci${i}`, label: miss ? 'Misses the truth' : 'Covers the truth', color: miss ? 'var(--s8)' : 'var(--s1)', points: [{ x: i + 1, y: r.lo }, { x: i + 1, y: r.hi }], width: 1.5, hideLegend: true, noTooltip: true }]
  })
  return (
    <Lab
      title="What “95% confidence” promises"
      goal={`Repeat the same trial 100 times (200 patients, true HR ${trueHR}). Each vertical line is one trial’s 95% CI, sorted by estimate. About 95 should cover the truth.`}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running}>
            <Play size={14} /> {running ? `Running… ${res.length}/100` : 'Run 100 trials'}
          </Button>
          {res.length > 0 && (
            <span className="text-sm text-ink">
              <span className="font-semibold">{covered}</span> of {res.length} intervals contain the true HR.
            </span>
          )}
        </div>
      }
    >
      {res.length ? (
        <Plot ariaLabel="Confidence intervals from repeated trials" series={series} xLabel="Trial (sorted by estimate)" yLabel="Hazard ratio" height={220} refLines={[{ y: trueHR, label: 'true HR' }]} xDomain={[0, 101]} />
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">Press “Run 100 trials”</div>
      )}
      <p className="mt-2 text-sm text-ink-2">
        Red intervals miss. A single trial’s CI either contains the truth or not; the 95% describes the <em>procedure</em> over repetitions. Intervals are symmetric on the log scale, which is why they look stretched upward.
      </p>
    </Lab>
  )
}

// ---------- ties ----------
function TiesLab() {
  const [grain, setGrain] = useState(1)
  const [seed, setSeed] = useState(9)
  const base = useMemo(() => {
    const rng = mulberry32(seed)
    const rows: { t: number; s: number; x: number }[] = []
    for (let i = 0; i < 300; i++) {
      const x = rbern(rng, 0.5)
      const T = rexp(rng, 0.08 * Math.exp(Math.log(0.6) * x))
      const C = Math.min(24, rexp(rng, 0.02))
      rows.push({ t: Math.min(T, C), s: T <= C ? 1 : 0, x })
    }
    return rows
  }, [seed])
  const rounded = base.map((r) => ({ ...r, t: Math.max(grain, Math.ceil(r.t / grain) * grain) }))
  const exact = coxph({ time: base.map((r) => r.t), status: base.map((r) => r.s), x: base.map((r) => [r.x]) })
  const ef = coxph({ time: rounded.map((r) => r.t), status: rounded.map((r) => r.s), x: rounded.map((r) => [r.x]) }, { ties: 'efron' })
  const br = coxph({ time: rounded.map((r) => r.t), status: rounded.map((r) => r.s), x: rounded.map((r) => [r.x]) }, { ties: 'breslow' })
  const distinct = new Set(rounded.filter((r) => r.s).map((r) => r.t)).size
  return (
    <Lab
      title="Ties: Breslow vs Efron"
      goal="300 patients, true HR 0.60, event times recorded to the nearest unit. Coarser recording creates ties. Which approximation stays closer to the untied estimate?"
      controls={
        <>
          <Slider label="Recording grain (months)" value={grain} onChange={setGrain} min={0.25} max={6} step={0.25} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Untied (exact times)" value={fmt(exact.coefs[0].hr, 3)} />
        <StatTile label="Efron, rounded" value={fmt(ef.coefs[0].hr, 3)} tone="good" />
        <StatTile label="Breslow, rounded" value={fmt(br.coefs[0].hr, 3)} tone={Math.abs(br.beta[0] - exact.beta[0]) > Math.abs(ef.beta[0] - exact.beta[0]) + 0.01 ? 'bad' : undefined} />
        <StatTile label="Distinct event times" value={distinct} sub={`${ef.nEvents} events`} />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Breslow treats all tied patients as still at risk for every tied event, which biases the coefficient toward zero as ties increase. Efron progressively removes them <Cite k="efron1977" />. With heavy ties, such as discrete visit schedules, consider a discrete-time model (complementary log-log) or the exact method.
      </p>
    </Lab>
  )
}

// ---------- non-collapsibility ----------
function CollapseLab() {
  const [hrZ, setHrZ] = useState(4)
  const fits = useMemo(() => {
    const rng = mulberry32(77)
    const time: number[] = []
    const status: number[] = []
    const x: number[][] = []
    for (let i = 0; i < 4000; i++) {
      const trt = i % 2
      const z = rbern(rng, 0.5)
      const T = rexp(rng, 0.05 * Math.exp(Math.log(0.5) * trt + Math.log(hrZ) * z))
      const C = Math.min(36, rexp(rng, 0.01))
      time.push(Math.min(T, C))
      status.push(T <= C ? 1 : 0)
      x.push([trt, z])
    }
    const adj = coxph({ time, status, x })
    const unadj = coxph({ time, status, x: x.map((r) => [r[0]]) })
    return { adj, unadj }
  }, [hrZ])
  return (
    <Lab
      title="Non-collapsibility: adjusting changes the HR even without confounding"
      goal="A large randomised trial (4,000 patients), so there is no confounding and little noise. The true conditional treatment HR is 0.50. Z is a balanced binary prognostic factor."
      controls={<Slider label="HR for the prognostic factor Z" value={hrZ} onChange={setHrZ} min={1} max={10} step={0.5} />}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatTile label="Adjusted for Z (conditional)" value={fmt(fits.adj.coefs[0].hr, 3)} sub={`${fmt(fits.adj.coefs[0].lower, 2)}–${fmt(fits.adj.coefs[0].upper, 2)}`} tone="good" />
        <StatTile label="Unadjusted (marginal)" value={fmt(fits.unadj.coefs[0].hr, 3)} sub={`${fmt(fits.unadj.coefs[0].lower, 2)}–${fmt(fits.unadj.coefs[0].upper, 2)}`} />
        <StatTile label="Gap" value={fmt(fits.unadj.coefs[0].hr - fits.adj.coefs[0].hr, 3)} sub="grows with the strength of Z" />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Both are valid estimates of <em>different</em> estimands. The unadjusted HR averages over a population in which high-risk patients are depleted faster on control. Adjusting for prognostic covariates in RCTs is recommended for precision. State whether you report a conditional or a marginal effect, and consider reporting marginal survival curves or risk differences, which are collapsible <Cite k="daniel2021" /> <Cite k="fdaCovariate" />.
      </p>
    </Lab>
  )
}

export default function Cox() {
  return (
    <ModuleLayout id="cox">
      <Section id="model" title="The model" kicker="Semi-parametric regression">
        <p>The Cox model <Cite k="cox1972" /> says that covariates multiply an unspecified baseline hazard:</p>
        <MathBlock
          tex={String.raw`h(t\mid x)=h_0(t)\exp(\beta_1x_1+\dots+\beta_px_p),\qquad \frac{h(t\mid x+1_k)}{h(t\mid x)}=e^{\beta_k}`}
          caption={<>The baseline <M>{'h_0(t)'}</M> can take any shape. Each <M>{'e^{\\beta_k}'}</M> is a hazard ratio for a one-unit change in <M>x_k</M>, holding the other covariates fixed, and is assumed constant over time (proportional hazards, Module 5).</>}
        />
        <p>
          Equivalent forms worth knowing: <M>{'\\log h(t\\mid x) = \\log h_0(t) + \\beta^\\top x'}</M> (linear on the log-hazard scale), and <M>{'S(t\\mid x)=S_0(t)^{\\exp(\\beta^\\top x)}'}</M> (survival curves are powers of one another, so under PH they <strong>cannot cross</strong>).
        </p>
      </Section>

      <Section id="partial-likelihood" title="Estimation without the baseline: the partial likelihood" kicker="Lab">
        <MathBlock tex={String.raw`L(\beta)=\prod_{i:\,\delta_i=1}\frac{\exp(\beta^\top x_i)}{\sum_{j\in R(t_i)}\exp(\beta^\top x_j)}`} caption={<>Here <M>{'R(t_i)'}</M> is the risk set at the i-th event time. Only the <em>order</em> of events and who was at risk matter. Maximise <M>{'\\log L'}</M> by Newton–Raphson; the inverse of minus its second derivative gives the standard errors.</>} />
        <LotteryLab />
      </Section>

      <Section id="fitting" title="Fitting and interpreting a Cox model" kicker="Lab">
        <FitLab />
        <Callout kind="key" title="Reading coefficients">
          <ul>
            <li>Binary: HR = 0.70 for treatment means the event rate among those still event-free is 30% lower at every time.</li>
            <li>Continuous: report a clinically meaningful unit (per 10 years, per SD), and check linearity with splines or martingale residuals, as in <code>rms::rcs()</code>.</li>
            <li>The baseline hazard is estimated afterwards (Breslow), and gives survival curves for any covariate pattern.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="interpretation" title="What a hazard ratio does not say" kicker="Interpretation">
        <MythFact myth="“HR = 0.70: treatment reduces mortality by 30%.”" fact="It reduces the hazard (the instantaneous rate) by 30%. The reduction in risk by time t is smaller, and depends on the baseline risk." />
        <MythFact myth="“HR = 2: patients die twice as fast / survive half as long.”" fact="It doubles the event rate among those still alive. The effect on median survival depends on the baseline hazard shape, and only for the exponential is the median exactly halved." />
        <MythFact myth="“The HR measures how many patients benefit.”" fact="An HR is a population-average contrast of rates. It does not say how many individuals benefit, and it is not a causal per-period effect, because of selection by survival (Module 5)." />
        <AbsoluteRiskLab />
        <Quiz q={{ id: 'cox-inline-1', stem: 'A paper reports HR = 0.80 (95% CI 0.66–0.97) for a statin and 10-year cardiovascular risk of 10% in controls. The best one-line summary for patients is…', options: ['“A 20% lower risk”', '“About 2 fewer events per 100 people over 10 years (10% → about 8.1%)”', '“Statins add 20% more life”', '“Benefit is uncertain because the CI is wide”'], answer: 1, why: '$1-0.90^{0.80}=0.081$, an absolute reduction of about 1.9 percentage points (NNT ≈ 53 over 10 years). Relative measures exaggerate the perceived benefit when baseline risk is low.' }} />
      </Section>

      <Section id="coverage" title="Uncertainty you can see" kicker="Lab">
        <CoverageLab />
      </Section>

      <Section id="ties" title="Tied event times" kicker="Lab">
        <p>
          The partial likelihood assumes events happen one at a time. With tied times, the exact likelihood sums over all possible orderings. The Breslow <Cite k="breslow1974" /> and Efron <Cite k="efron1977" /> approximations avoid this. R defaults to Efron; SAS PHREG and Stata stcox default to Breslow.
        </p>
        <TiesLab />
      </Section>

      <Section id="collapsibility" title="Adjusted vs unadjusted hazard ratios" kicker="Lab">
        <p>
          Hazard ratios are <strong>non-collapsible</strong>: the HR conditional on a prognostic covariate differs from the HR averaged over it, even when that covariate is perfectly balanced <Cite k="gail1984" />. This is not confounding, and it does not mean either estimate is wrong.
        </p>
        <CollapseLab />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival)
fit <- coxph(Surv(months, died) ~ trt + I((age - 60)/10) + marker, data = d)   # Efron ties
summary(fit)                  # HR = exp(coef), 95% CI, Wald/LR/score tests, concordance
nd <- data.frame(trt = 0:1, age = 70, marker = 0)
plot(survfit(fit, newdata = nd), col = 1:2)                  # predicted curves
summary(survfit(fit, newdata = nd), times = 24)$surv        # absolute risk at 24 months
# robust SE: coxph(..., cluster = id);  strata: + strata(centre);  ties = "breslow"`}
          python={`from lifelines import CoxPHFitter
cph = CoxPHFitter()                       # Efron ties
cph.fit(d[["months", "died", "trt", "age10", "marker"]], duration_col="months", event_col="died")
cph.print_summary()                       # exp(coef), CIs, concordance
nd = pd.DataFrame({"trt": [0, 1], "age10": [1, 1], "marker": [0, 0]})
cph.predict_survival_function(nd, times=[24])`}
        />
      </Section>

      <Takeaways
        items={[
          'h(t|x) = h₀(t)·exp(βᵀx); the partial likelihood uses only event order and risk sets, so h₀ is never specified.',
          'exp(β) is a ratio of rates among those still at risk, assumed constant over time; it is not a risk ratio or a time ratio.',
          'Translate HRs into absolute risks for specific patients: S₁(t) = S₀(t)^HR under PH.',
          'Use Efron for ties; with coarse times consider discrete-time models.',
          'Adjusted and unadjusted HRs target different estimands (non-collapsibility). Say which one you report.',
        ]}
      />
    </ModuleLayout>
  )
}
