import { useDeferredValue, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { SERIES, fnSeries, kmSeries } from '@/components/charts/survival'
import { Resample, Segmented, Slider, StatTile } from '@/components/ui/controls'
import { kaplanMeier, rmst } from '@/lib/stats/km'
import { coxph, coxZph } from '@/lib/stats/cox'
import { lowess } from '@/lib/stats/smooth'
import { mulberry32, rexp, rgamma } from '@/lib/stats/random'
import { pTwoSided } from '@/lib/stats/special'
import { simTwoArm, twoArmSpec, type Shape2 } from '@/lib/scenarios'
import { fmt, fmtP } from '@/lib/utils'

/** Cox model with separate treatment effects before and after a cut point (counting-process split). */
function piecewiseCox(time: number[], status: number[], group: number[], cut: number) {
  const start: number[] = []
  const stop: number[] = []
  const st: number[] = []
  const x: number[][] = []
  for (let i = 0; i < time.length; i++) {
    if (time[i] > cut) {
      start.push(0), stop.push(cut), st.push(0), x.push([group[i], 0])
      start.push(cut), stop.push(time[i]), st.push(status[i]), x.push([0, group[i]])
    } else {
      start.push(0), stop.push(time[i]), st.push(status[i]), x.push([group[i], 0])
    }
  }
  return coxph({ start, time: stop, status: st, x }, { names: [`HR before ${cut}`, `HR after ${cut}`] })
}

function DiagnoseLab() {
  const [shape, setShape] = useState<Shape2>('waning')
  const [hr, setHr] = useState(0.45)
  const [change, setChange] = useState(8)
  const [nArm, setNArm] = useState(200)
  const [seed, setSeed] = useState(5)
  const followUp = 36
  const spec = useMemo(() => twoArmSpec(shape, 10, hr, change), [shape, hr, change])
  const dn = useDeferredValue(nArm)
  const d = useMemo(() => simTwoArm(seed, dn, spec, followUp, 12), [seed, dn, spec])
  const arms = useMemo(() => [0, 1].map((g) => kaplanMeier({ time: d.time.filter((_, i) => d.group[i] === g), status: d.status.filter((_, i) => d.group[i] === g) })), [d])
  const fit = useMemo(() => coxph({ time: d.time, status: d.status, x: d.group.map((g) => [g]) }, { names: ['Treatment'] }), [d])
  const zph = useMemo(() => coxZph(fit, d, 'km'), [fit, d])
  const pw = useMemo(() => piecewiseCox(d.time, d.status, d.group, change), [d, change])
  const sm = useMemo(() => lowess(zph.scaled.map((s) => s.time), zph.scaled.map((s) => s.values[0]), 0.5), [zph])
  const r1 = rmst(arms[1], 30)
  const r0 = rmst(arms[0], 30)
  const rdiff = r1.rmst - r0.rmst
  const rse = Math.sqrt(r1.se ** 2 + r0.se ** 2)
  // true log HR(t)
  const trueLogHR = (t: number) => {
    const at = (a: { cuts: number[]; rates: number[] }) => {
      let k = 0
      while (k + 1 < a.cuts.length && t >= a.cuts[k + 1]) k++
      return a.rates[Math.min(k, a.rates.length - 1)]
    }
    return Math.log(at(spec.treat) / at(spec.control))
  }
  const loglog = (fitK: (typeof arms)[number], id: string, label: string, color: string): Series => ({
    kind: 'step',
    id,
    label,
    color,
    points: fitK.rows.filter((r) => r.nEvent > 0 && r.surv > 0 && r.surv < 1).map((r) => ({ x: Math.log(r.time), y: Math.log(-Math.log(r.surv)) })),
  })
  return (
    <Lab
      title="Diagnosing non-proportional hazards"
      goal="Two simulated arms (control median 10 months). The true log hazard ratio over time is known (dashed). The smoothed scaled Schoenfeld residuals estimate it from the data."
      controls={
        <>
          <Segmented label="True effect pattern" value={shape} onChange={setShape} options={[{ value: 'ph', label: 'Proportional' }, { value: 'waning', label: 'Waning' }, { value: 'delayed', label: 'Delayed' }, { value: 'crossing', label: 'Crossing' }]} />
          <Slider label="Hazard ratio while active" value={hr} onChange={setHr} min={0.25} max={1} step={0.05} />
          <Slider label="Change point (months)" value={change} onChange={setChange} min={3} max={20} step={1} />
          <Slider label="Patients per arm" value={nArm} onChange={setNArm} min={50} max={800} step={25} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Kaplan–Meier</div>
          <Plot ariaLabel="Kaplan–Meier by arm" series={[...kmSeries(arms[0], { id: 'c', label: 'Control', color: SERIES[1], censorMarks: false }), ...kmSeries(arms[1], { id: 't', label: 'Treatment', color: SERIES[0], censorMarks: false })]} xLabel="Months" yLabel="Survival" yDomain={[0, 1]} xDomain={[0, followUp]} height={200} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">log(−log Ŝ) against log time</div>
          <Plot ariaLabel="Log minus log survival plot" series={[loglog(arms[0], 'llc', 'Control', SERIES[1]), loglog(arms[1], 'llt', 'Treatment', SERIES[0])]} xLabel="log(months)" yLabel="log(−log S)" height={200} />
        </div>
      </div>
      <div className="mt-5 min-w-0">
        <div className="mb-1 text-sm font-medium text-ink">Scaled Schoenfeld residuals: an estimate of β(t), the log HR over time</div>
        <Plot
          ariaLabel="Scaled Schoenfeld residuals with smooth"
          series={[
            { kind: 'scatter', id: 'res', label: 'Scaled residual (one per event)', color: 'var(--muted)', points: zph.scaled.map((s) => ({ x: s.time, y: s.values[0] })), r: 2.2, opacity: 0.45 },
            { kind: 'line', id: 'smooth', label: 'LOWESS smooth', color: SERIES[0], points: sm.x.map((xv, i) => ({ x: xv, y: sm.y[i] })), width: 2.5 },
            fnSeries(trueLogHR, 0.01, followUp, 300, { id: 'true', label: 'True log HR(t)', color: SERIES[1], dashed: true }),
          ]}
          xLabel="Months"
          yLabel="β(t)"
          height={230}
          yDomain={[-4, 3]}
          refLines={[{ y: fit.beta[0], label: `Cox estimate ${fmt(fit.beta[0], 2)}` }, { y: 0 }]}
        />
      </div>
      <Table
        className="mt-4"
        head={['Summary', 'Estimate', 'Comment']}
        rows={[
          ['Cox HR (single number)', `${fmt(fit.coefs[0].hr, 2)} (${fmt(fit.coefs[0].lower, 2)}–${fmt(fit.coefs[0].upper, 2)})`, 'an event-weighted average of HR(t)'],
          ['Grambsch–Therneau test', `χ² ${fmt(zph.terms[0].chisq, 2)}, p ${fmtP(zph.terms[0].p)}`, 'slope of β(t) against 1 − KM(t)'],
          [`Piecewise HR, ≤ ${change} months`, `${fmt(pw.coefs[0].hr, 2)} (${fmt(pw.coefs[0].lower, 2)}–${fmt(pw.coefs[0].upper, 2)})`, 'time-split Cox model'],
          [`Piecewise HR, > ${change} months`, `${fmt(pw.coefs[1].hr, 2)} (${fmt(pw.coefs[1].lower, 2)}–${fmt(pw.coefs[1].upper, 2)})`, ''],
          ['RMST difference to 30 months', `${fmt(rdiff, 2)} mo (${fmt(rdiff - 1.96 * rse, 2)} to ${fmt(rdiff + 1.96 * rse, 2)}), p ${fmtP(pTwoSided(rdiff / rse))}`, 'no PH assumption'],
        ]}
      />
      <TryThis
        items={[
          { do: 'Proportional pattern: does the smooth stay flat, and are the log-log curves parallel?', see: 'Roughly flat around the Cox estimate, with random wiggles, and the GT test is usually non-significant. Parallel log-log curves are a necessary consequence of PH.' },
          { do: 'Waning effect, 800 per arm. Compare the single Cox HR with the two piecewise HRs.', see: 'The single HR sits between the early benefit and the later null effect. Quoting it as “the” effect misdescribes both periods.' },
          { do: 'Crossing pattern. Where do the log-log curves meet?', see: 'They cross, and the smooth β(t) changes sign. A single HR near 1 here would hide early harm and late benefit.' },
          { do: 'Proportional pattern with 50 per arm versus 800 per arm, HR 0.9 versus 0.45.', see: 'With small samples the GT test rarely rejects even under real non-PH (low power). With huge samples it flags tiny, unimportant departures. Judge the size and shape of β(t), not just the p-value.' },
        ]}
      />
    </Lab>
  )
}

// ---------- frailty: hazards of hazard ratios ----------
function FrailtyLab() {
  const [hr, setHr] = useState(0.5)
  const [v, setV] = useState(1)
  const lam = 0.15
  const H0 = (t: number) => lam * t
  const margHR = (t: number) => (v === 0 ? hr : (hr * (1 + v * H0(t))) / (1 + v * hr * H0(t)))
  const margS = (t: number, r: number) => (v === 0 ? Math.exp(-r * H0(t)) : Math.pow(1 + v * r * H0(t), -1 / v))
  const est = useMemo(() => {
    const rng = mulberry32(123)
    const time: number[] = []
    const status: number[] = []
    const x: number[][] = []
    for (let i = 0; i < 4000; i++) {
      const g = i % 2
      const z = v > 0 ? rgamma(rng, 1 / v, v) : 1
      const T = rexp(rng, lam * z * (g ? hr : 1))
      const C = 10
      time.push(Math.min(T, C))
      status.push(T <= C ? 1 : 0)
      x.push([g])
    }
    return coxph({ time, status, x }).coefs[0]
  }, [hr, v])
  return (
    <Lab
      title="The hazards of hazard ratios: frailty and selection"
      goal="Every individual’s hazard is multiplied by the same HR at all times, but people differ in unmeasured frailty (gamma distributed, mean 1). Watch the population-level HR drift."
      controls={
        <>
          <Slider label="Individual (conditional) HR" value={hr} onChange={setHr} min={0.2} max={1} step={0.05} />
          <Slider label="Frailty variance" value={v} onChange={setV} min={0} max={3} step={0.1} hint="0 = everyone identical" />
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Population (marginal) HR over time</div>
          <Plot ariaLabel="Marginal hazard ratio over time" series={[fnSeries(margHR, 0, 10, 100, { id: 'm', label: 'Marginal HR(t)', color: SERIES[0] })]} xLabel="Years" yLabel="Hazard ratio" yDomain={[0, 1.05]} height={200} refLines={[{ y: hr, label: 'individual HR' }, { y: 1 }]} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Population survival</div>
          <Plot ariaLabel="Marginal survival curves" series={[fnSeries((t) => margS(t, 1), 0, 10, 100, { id: 'c', label: 'Control', color: SERIES[1] }), fnSeries((t) => margS(t, hr), 0, 10, 100, { id: 't', label: 'Treated', color: SERIES[0] })]} xLabel="Years" yLabel="Survival" yDomain={[0, 1]} height={200} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Marginal HR at 1 year" value={fmt(margHR(1), 2)} />
        <StatTile label="Marginal HR at 8 years" value={fmt(margHR(8), 2)} />
        <StatTile label="Cox HR, 4,000 simulated" value={fmt(est.hr, 2)} sub={`${fmt(est.lower, 2)}–${fmt(est.upper, 2)}`} />
        <StatTile label="Individual HR" value={fmt(hr, 2)} />
      </div>
      <MathBlock tex={String.raw`\mathrm{HR}_{\text{marg}}(t)=\mathrm{HR}\cdot\frac{1+\sigma^2H_0(t)}{1+\sigma^2\,\mathrm{HR}\,H_0(t)}`} caption={<>Gamma frailty with variance σ². High-frailty control patients die early, so the surviving control group is progressively “tougher”, and the ratio of population hazards moves toward 1 even though nobody’s individual effect changed <Cite k="hernan2010" /> <Cite k="aalen2015" />.</>} />
    </Lab>
  )
}

export default function PHAssumption() {
  return (
    <ModuleLayout id="ph-assumption">
      <Section id="meaning" title="What proportional hazards means, and why it fails" kicker="Assumption">
        <p>
          PH means <M>{'h_1(t)/h_0(t)=\\mathrm{HR}'}</M> for all t. Equivalently <M>{'S_1(t)=S_0(t)^{\\mathrm{HR}}'}</M>, so the curves cannot cross and <M>{'\\log(-\\log S)'}</M> curves are parallel. Clinically, PH often fails:
        </p>
        <ul>
          <li>
            <strong>Delayed effects</strong>: immunotherapy, screening, and vaccines with build-up time.
          </li>
          <li>
            <strong>Waning effects</strong>: an early benefit that wears off, such as drugs stopped after a fixed course.
          </li>
          <li>
            <strong>Crossing hazards</strong>: surgery against medical therapy (early operative risk, later benefit).
          </li>
          <li>
            <strong>Selection by survival</strong>: even with constant individual effects, population HRs drift (last section).
          </li>
        </ul>
        <Callout kind="key">
          When PH fails, the Cox HR is still estimable. It becomes a weighted average of the time-varying <M>{'\\mathrm{HR}(t)'}</M>, with weights that depend on the event and censoring distributions. It is therefore no longer a stable, transportable summary.
        </Callout>
      </Section>

      <Section id="diagnose" title="Diagnostics that show how the effect changes" kicker="Lab">
        <p>
          The <strong>scaled Schoenfeld residuals</strong> <Cite k="schoenfeld1982" /> <Cite k="grambsch1994" /> have expectation approximately <M>{'\\beta(t)'}</M>. Plotting them against time with a smoother shows how the log hazard ratio changes. Regressing them on a function of time, here <M>{'1-\\hat S(t)'}</M>, gives the Grambsch–Therneau test.
        </p>
        <MathBlock tex={String.raw`r^*_k=\hat\beta+d\,\widehat{\mathrm{Var}}(\hat\beta)\,r_k,\qquad r_k=x_{(k)}-\bar x(\hat\beta,t_k),\qquad E[r^*_k]\approx\beta(t_k)`} caption={<>Here <M>{'r_k'}</M> is the Schoenfeld residual for the k-th event: the covariate of the person who failed minus the risk-weighted average covariate in the risk set, and d is the number of events.</>} />
        <DiagnoseLab />
      </Section>

      <Section id="remedies" title="What to do when PH fails" kicker="Remedies">
        <Table
          head={['Approach', 'What it gives', 'Use when']}
          rows={[
            ['Stratify on the variable', 'Separate baseline hazards; no HR for that variable', 'A nuisance covariate (centre, sex) violates PH'],
            ['Time-split (piecewise) HR', 'HR in pre-specified intervals', 'Effects plausibly change at known times (e.g., after surgery)'],
            [<span key="tt">Time-varying coefficient <M>{'\\beta(t)=\\beta_0+\\beta_1 g(t)'}</M></span>, 'HR as a smooth function of time', 'Describing a waning or growing effect'],
            ['RMST difference', 'Mean event-free time gained up to τ', 'Primary effect measure robust to non-PH'],
            ['Milestone survival / risk differences', 'Absolute differences at fixed times', 'Communicating with patients; regulatory secondary endpoints'],
            ['AFT or flexible parametric models', 'Time ratios; smooth time-dependent HRs', 'Modelling the full hazard shape (Module 6)'],
          ]}
        />
        <Callout kind="warn" title="Never use a time-varying covariate defined by the future">
          In R, <code>coxph(... + tt(x))</code> fits <M>{'\\beta(t)'}</M> correctly. Creating <code>x * time</code> as an ordinary column, using each patient’s <em>final</em> follow-up time, is a serious and common error: it encodes the outcome into the predictor.
        </Callout>
      </Section>

      <Section id="test-or-not" title="Should you test proportional hazards at all?" kicker="Current debate">
        <p>
          Stensrud &amp; Hernán <Cite k="stensrud2020" /> argue that hazards are almost never exactly proportional, so a non-significant test is mostly a sign of low power. In their view, the HR should be presented as a weighted average or replaced by survival-curve contrasts. Sjölander &amp; Dickman <Cite k="sjolander2024" /> reply that no model assumption holds exactly; the useful question is whether PH is a <em>good enough</em> approximation for the purpose. Both positions agree in practice:
        </p>
        <ul>
          <li>Look at the shape of <M>{'\\beta(t)'}</M> and the curves, not only the p-value.</li>
          <li>Pre-specify an analysis that remains interpretable if PH fails (RMST, milestones).</li>
          <li>Report absolute survival differences alongside any hazard ratio.</li>
        </ul>
        <Quiz q={{ id: 'ph-inline-1', stem: 'In a trial of 4,000 patients the PH test gives p = 0.003, but β(t) varies only from −0.30 to −0.20 over follow-up. A sensible response is…', options: ['Report the Cox HR, note that the effect is modestly stronger early, and add RMST or milestone differences', 'Discard the Cox model entirely', 'Stratify by treatment', 'Switch to Fine–Gray'], answer: 0, why: 'With large samples, trivial departures become “significant”. The HR range of 0.74 to 0.82 is clinically homogeneous, so the average HR is a reasonable summary. Stratifying by treatment would remove the treatment effect altogether.' }} />
      </Section>

      <Section id="frailty" title="Why population hazard ratios drift over time" kicker="Lab">
        <p>
          A hazard is defined among people <em>still at risk</em>. Who remains at risk changes over time and can differ between arms. So even in a randomised trial, the HR after the first few months compares groups that are no longer exchangeable. This is a key reason the HR is hard to give a causal, per-period meaning <Cite k="hernan2010" /> <Cite k="aalen2015" />.
        </p>
        <FrailtyLab />
        <Callout kind="practice">
          Do not read a declining HR in later intervals as “the treatment stops working” without considering selection. Contrasts of survival curves (risk differences, RMST) remain causal in a randomised trial, because they compare whole randomised groups.
        </Callout>
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival)
fit <- coxph(Surv(time, status) ~ trt + age, data = d)
z <- cox.zph(fit, transform = "km"); z; plot(z[1])   # beta(t) for trt with CI band
# piecewise HR via survSplit
ds <- survSplit(Surv(time, status) ~ ., data = d, cut = 6, episode = "period")
coxph(Surv(tstart, time, status) ~ trt:strata(period) + age, data = ds)
# smooth time-varying coefficient
coxph(Surv(time, status) ~ trt + tt(trt), data = d, tt = function(x, t, ...) x * log(t))
# stratify a nuisance variable
coxph(Surv(time, status) ~ trt + strata(centre), data = d)`}
          python={`from lifelines import CoxPHFitter
from lifelines.statistics import proportional_hazard_test
cph = CoxPHFitter().fit(d, "time", "status")
proportional_hazard_test(cph, d, time_transform="km").print_summary()
cph.check_assumptions(d, p_value_threshold=0.05, show_plots=True)   # scaled Schoenfeld plots
CoxPHFitter().fit(d, "time", "status", strata=["centre"])`}
        />
      </Section>

      <Takeaways
        items={[
          'PH means a constant HR, parallel log(−log S) curves and survival curves that never cross.',
          'Scaled Schoenfeld residuals estimate β(t); look at their shape rather than relying on the test’s p-value.',
          'When PH fails the Cox HR is a weighted average; report piecewise or time-varying HRs, RMST or milestone differences.',
          'Never build time interactions from each patient’s final follow-up time; use tt() or split the data.',
          'Unmeasured heterogeneity makes population HRs drift toward 1 over time even when individual effects are constant.',
        ]}
      />
    </ModuleLayout>
  )
}
