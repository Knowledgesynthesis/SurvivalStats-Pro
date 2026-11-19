import { useDeferredValue, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { SERIES, fnSeries, kmSeries } from '@/components/charts/survival'
import { Resample, Segmented, Slider, StatTile } from '@/components/ui/controls'
import { kaplanMeier } from '@/lib/stats/km'
import { DISTRIBUTIONS, fitParametric, hazard, surv, type DistName, type Params } from '@/lib/stats/parametric'
import { mulberry32, rexp, runif } from '@/lib/stats/random'
import { sampleGompertz, sampleLogNormal, sampleWeibull, roundTo } from '@/lib/stats/simulate'
import { LN2 } from '@/lib/scenarios'
import { cn, fmt } from '@/lib/utils'

// ---------- AFT vs PH ----------
type Base = 'weibull' | 'loglogistic' | 'lognormal'
function AFTLab() {
  const [base, setBase] = useState<Base>('loglogistic')
  const [shape, setShape] = useState(2.5)
  const [phi, setPhi] = useState(1.5)
  const d = DISTRIBUTIONS[base]
  const median = 12
  const p: Params = base === 'weibull' ? { shape, scale: median / Math.pow(LN2, 1 / shape) } : base === 'loglogistic' ? { shape, scale: median } : { meanlog: Math.log(median), sdlog: 1 / shape }
  const S0 = (t: number) => surv(d, t, p)
  const S1 = (t: number) => surv(d, t / phi, p)
  const hr = (t: number) => hazard(d, t / phi, p) / phi / hazard(d, t, p)
  const tMax = 60
  return (
    <Lab
      title="Accelerated failure time vs proportional hazards"
      goal="Under AFT, treatment stretches time: S₁(t) = S₀(t/φ). Is the implied hazard ratio constant? It depends on the baseline distribution."
      controls={
        <>
          <Segmented label="Baseline distribution" value={base} onChange={setBase} options={[{ value: 'weibull', label: 'Weibull' }, { value: 'loglogistic', label: 'Log-logistic' }, { value: 'lognormal', label: 'Log-normal' }]} />
          <Slider label={base === 'lognormal' ? 'Shape (1/σ)' : 'Shape'} value={shape} onChange={setShape} min={0.5} max={4} step={0.1} />
          <Slider label="Time ratio φ" value={phi} onChange={setPhi} min={0.5} max={3} step={0.05} />
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Survival</div>
          <Plot ariaLabel="Baseline and accelerated survival" series={[fnSeries(S0, 0, tMax, 150, { id: 's0', label: 'Control S₀(t)', color: SERIES[1] }), fnSeries(S1, 0, tMax, 150, { id: 's1', label: 'Treated S₀(t/φ)', color: SERIES[0] })]} xLabel="Months" yLabel="Survival" yDomain={[0, 1]} height={200} refLines={[{ y: 0.5 }]} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Implied hazard ratio over time</div>
          <Plot ariaLabel="Implied hazard ratio over time" series={[fnSeries((t) => hr(Math.max(t, 0.05)), 0.05, tMax, 150, { id: 'hr', label: 'HR(t)', color: SERIES[2] })]} xLabel="Months" yLabel="h₁(t)/h₀(t)" height={200} refLines={[{ y: 1 }]} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Median ratio" value={fmt(phi, 2)} sub={`${median} → ${fmt(median * phi, 1)} months`} />
        <StatTile label="HR at 1 month" value={fmt(hr(1), 2)} />
        <StatTile label="HR at 48 months" value={fmt(hr(48), 2)} />
        <StatTile label="Constant HR?" value={base === 'weibull' ? 'Yes' : 'No'} sub={base === 'weibull' ? `HR = φ^(−k) = ${fmt(Math.pow(phi, -shape), 2)}` : 'HR(t) changes over time'} />
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Only the Weibull (with the exponential as a special case) is both an AFT and a PH model. For the log-logistic, a constant time ratio implies an HR that starts at <M>{'\\varphi^{-\\beta}'}</M> and drifts to 1. Treatment benefit is front-loaded on the hazard scale even though it is constant on the time scale.
      </p>
    </Lab>
  )
}

// ---------- fit & extrapolate ----------
type Truth = 'weibull' | 'lognormal' | 'gompertz' | 'cure'
const TRUTHS: Record<Truth, { label: string; sample: (r: () => number) => number; S: (t: number) => number }> = {
  weibull: { label: 'Weibull, falling hazard (k = 0.8)', sample: (r) => sampleWeibull(r, 0.8, 30), S: (t) => Math.exp(-Math.pow(t / 30, 0.8)) },
  lognormal: { label: 'Log-normal (rise then fall)', sample: (r) => sampleLogNormal(r, Math.log(24), 1.1), S: (t) => surv(DISTRIBUTIONS.lognormal, t, { meanlog: Math.log(24), sdlog: 1.1 }) },
  gompertz: { label: 'Gompertz, rising hazard', sample: (r) => sampleGompertz(r, 0.04, 0.01), S: (t) => surv(DISTRIBUTIONS.gompertz, t, { shape: 0.04, rate: 0.01 }) },
  cure: { label: '30% cured + Weibull for the rest', sample: (r) => (r() < 0.3 ? Infinity : sampleWeibull(r, 1.2, 15)), S: (t) => 0.3 + 0.7 * Math.exp(-Math.pow(t / 15, 1.2)) },
}

function ExtrapolationLab() {
  const [truth, setTruth] = useState<Truth>('lognormal')
  const [tau, setTau] = useState(24)
  const [n, setN] = useState(300)
  const [seed, setSeed] = useState(3)
  const horizon = 120
  const dTau = useDeferredValue(tau)
  const dN = useDeferredValue(n)
  const data = useMemo(() => {
    const tau = dTau
    const n = dN
    const rng = mulberry32(seed)
    const time: number[] = []
    const status: number[] = []
    for (let i = 0; i < n; i++) {
      const T = TRUTHS[truth].sample(rng)
      const entry = runif(rng, 0, tau * 0.5)
      const C = Math.min(tau - entry, rexp(rng, 0.01))
      time.push(roundTo(Math.max(0.01, Math.min(T, C)), 3))
      status.push(T <= C ? 1 : 0)
    }
    return { time, status }
  }, [truth, dTau, dN, seed])
  const km = useMemo(() => kaplanMeier(data), [data])
  const fits = useMemo(() => (Object.keys(DISTRIBUTIONS) as DistName[]).map((k) => fitParametric(k, data.time, data.status)), [data])
  const bestAIC = Math.min(...fits.map((f) => f.aic))
  const lifeYears = (S: (t: number) => number) => {
    let a = 0
    const steps = 600
    for (let i = 0; i < steps; i++) {
      const t0 = (i * horizon) / steps
      const t1 = ((i + 1) * horizon) / steps
      a += ((S(t0) + S(t1)) / 2) * (t1 - t0)
    }
    return a
  }
  const truthS = TRUTHS[truth].S
  const colors = [SERIES[0], SERIES[1], SERIES[2], SERIES[3], SERIES[6]]
  const series: Series[] = [
    ...kmSeries(km, { id: 'km', label: 'Kaplan–Meier (observed)', color: 'var(--ink)', censorMarks: false }),
    fnSeries(truthS, 0, horizon, 200, { id: 'truth', label: 'Truth', color: 'var(--ink-2)', dashed: true, width: 1.5 }),
    ...fits.map((f, i) => fnSeries((t) => surv(f.dist, t, f.params), 0, horizon, 200, { id: f.dist.name, label: f.dist.label, color: colors[i], width: 1.75 })),
  ]
  return (
    <Lab
      title="Same data, five models, five different futures"
      goal="Data are observed only up to τ months. Five distributions are fitted by maximum likelihood and extrapolated to 10 years. The truth is known."
      controls={
        <>
          <Segmented label="True distribution" value={truth} onChange={setTruth} options={(Object.keys(TRUTHS) as Truth[]).map((k) => ({ value: k, label: k === 'cure' ? 'Cure fraction' : DISTRIBUTIONS[k as DistName].label }))} />
          <Slider label="Maximum follow-up τ (months)" value={tau} onChange={setTau} min={12} max={84} step={6} />
          <Slider label="Patients" value={n} onChange={setN} min={80} max={1000} step={20} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="mb-2 text-sm text-ink-2">Truth: {TRUTHS[truth].label}</div>
      <Plot ariaLabel="Parametric fits and extrapolations" series={series} xLabel="Months" yLabel="Survival probability" yDomain={[0, 1]} xDomain={[0, horizon]} height={280} shades={[{ x0: tau, x1: horizon, label: 'extrapolation' }]} />
      <div className="not-lesson mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm tabular">
          <thead className="bg-surface-2 text-left text-ink-2">
            <tr>
              <th className="px-3 py-2 font-semibold">Model</th>
              <th className="px-3 py-2 font-semibold">ΔAIC</th>
              <th className="px-3 py-2 font-semibold">S(τ)</th>
              <th className="px-3 py-2 font-semibold">S(60)</th>
              <th className="px-3 py-2 font-semibold">S(120)</th>
              <th className="px-3 py-2 font-semibold">Mean months to 120</th>
            </tr>
          </thead>
          <tbody>
            {fits.map((f, i) => {
              const S = (t: number) => surv(f.dist, t, f.params)
              return (
                <tr key={f.dist.name} className={cn('border-t border-grid', f.aic === bestAIC && 'bg-accent/[0.06]')}>
                  <td className="px-3 py-1.5 text-ink">
                    <span className="mr-2 inline-block h-0.5 w-3 align-middle" style={{ background: colors[i] }} />
                    {f.dist.label}
                  </td>
                  <td className="px-3 py-1.5">{fmt(f.aic - bestAIC, 1)}</td>
                  <td className="px-3 py-1.5">{fmt(S(tau), 2)}</td>
                  <td className="px-3 py-1.5">{fmt(S(60), 2)}</td>
                  <td className="px-3 py-1.5">{fmt(S(120), 2)}</td>
                  <td className="px-3 py-1.5">{fmt(lifeYears(S), 1)}</td>
                </tr>
              )
            })}
            <tr className="border-t border-axis font-medium">
              <td className="px-3 py-1.5 text-ink">Truth</td>
              <td className="px-3 py-1.5">—</td>
              <td className="px-3 py-1.5">{fmt(truthS(tau), 2)}</td>
              <td className="px-3 py-1.5">{fmt(truthS(60), 2)}</td>
              <td className="px-3 py-1.5">{fmt(truthS(120), 2)}</td>
              <td className="px-3 py-1.5">{fmt(lifeYears(truthS), 1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Log-normal truth, τ = 24. Compare the 120-month survival across the models.', see: 'All curves hug the KM inside the observed window, yet 10-year survival ranges several-fold. AIC differences are small; the data within 24 months cannot tell the tails apart.' },
            { do: 'Increase τ to 84 months.', see: 'The models converge and the lowest-AIC model gets close to the truth. Extrapolation error shrinks as the observed window covers more of the curve. Mature data are the best remedy.' },
            { do: 'Cure-fraction truth.', see: 'Standard models all go to zero eventually, so every one underestimates long-term survival. Plateaus need mixture-cure or relative-survival models, justified by external evidence such as registry or general-population data.' },
            { do: 'Gompertz truth (rising, ageing-like hazard).', see: 'Models with falling or rise-and-fall hazards (log-normal, log-logistic) overestimate the tail. Clinical knowledge about how hazards behave long-term should constrain the model choice (NICE DSU TSD 14).' },
          ]}
        />
      </div>
    </Lab>
  )
}

export default function Parametric() {
  return (
    <ModuleLayout id="parametric">
      <Section id="families" title="The workhorse distributions" kicker="Hazard shapes">
        <p>A parametric model fixes the shape of the hazard with a few parameters. Choose the family for its hazard shape, which is what determines the tail.</p>
        <Table
          head={['Family', 'S(t)', 'Hazard shape', 'PH?', 'AFT?']}
          rows={[
            ['Exponential', <M key="e">{'e^{-\\lambda t}'}</M>, 'Constant', 'Yes', 'Yes'],
            ['Weibull', <M key="w">{'e^{-(t/b)^k}'}</M>, 'Monotone (k < 1 falling, k > 1 rising)', 'Yes', 'Yes'],
            ['Gompertz', <M key="g">{'\\exp\\{-\\tfrac{a}{b}(e^{bt}-1)\\}'}</M>, 'Exponentially rising (b > 0) or falling (b < 0)', 'Yes', 'No'],
            ['Log-logistic', <M key="ll">{'1/(1+(t/\\alpha)^\\beta)'}</M>, 'Rises then falls (β > 1), or falling', 'No (proportional odds)', 'Yes'],
            ['Log-normal', <M key="ln">{'1-\\Phi\\{(\\ln t-\\mu)/\\sigma\\}'}</M>, 'Rises then falls', 'No', 'Yes'],
            ['Generalised gamma', '3 parameters', 'Nests Weibull, log-normal, gamma', 'No', 'Yes'],
          ]}
        />
        <p>
          Parameters are estimated by maximising <M>{'\\ell=\\sum_i \\delta_i\\log h(t_i)-H(t_i)'}</M>. Events contribute their density and censored patients their survival probability. The fits in this module reproduce R’s <code>survreg</code> (and, for the Gompertz, a direct <code>optim</code> maximisation) to 6 or more digits.
        </p>
      </Section>

      <Section id="aft" title="Two ways covariates can act: hazards or time" kicker="Lab">
        <MathBlock
          tex={String.raw`\text{PH: } h(t\mid x)=h_0(t)e^{\beta x}\qquad\qquad \text{AFT: } S(t\mid x)=S_0\!\left(t\,e^{-\gamma x}\right),\ \ \log T=\mu+\gamma x+\sigma\varepsilon`}
          caption={<>In an AFT model <M>{'e^{\\gamma}'}</M> is a <strong>time ratio</strong>: every quantile of survival time is multiplied by it. A time ratio of 1.5 means medians, and all other percentiles, are 50% longer. Many clinicians find this easier to grasp than a hazard ratio.</>}
        />
        <AFTLab />
        <Quiz q={{ id: 'par-inline-1', stem: 'A Weibull AFT model with shape k = 2 estimates a time ratio of 1.25 for treatment. The corresponding hazard ratio is…', options: ['0.64', '0.80', '1.25', '1.56'], answer: 0, why: '$\\mathrm{HR}=\\varphi^{-k}=1.25^{-2}=0.64$. The same Weibull fit can be reported either way. R’s survreg reports the AFT form, and flexsurv can give either.' }} />
      </Section>

      <Section id="extrapolation" title="Fitting, comparing and extrapolating" kicker="Lab">
        <p>
          Within the observed follow-up, Kaplan–Meier and Cox need no distributional assumption. Parametric models become necessary when you must <strong>extrapolate</strong>, for instance to estimate lifetime benefit in a cost-effectiveness model, or when you want smooth hazards and closed-form predictions.
        </p>
        <ExtrapolationLab />
        <Callout kind="practice" title="How health-technology assessment handles this">
          NICE DSU TSD 14 <Cite k="latimerTSD14" /> asks analysts to fit a range of models, assess fit visually and with AIC/BIC, check the implied hazards against clinical plausibility and external data, and show how decisions change across plausible extrapolations. TSD 21 <Cite k="rutherfordTSD21" /> adds flexible approaches: spline-based models, cure models, relative survival using general-population mortality, and piecewise models.
        </Callout>
        <MythFact myth="“The lowest-AIC model gives the most accurate long-term prediction.”" fact="AIC measures fit to the observed period. Long-term behaviour is extrapolation; it needs external evidence and clinical reasoning, not another information criterion." />
      </Section>

      <Section id="flexible" title="Flexible parametric (Royston–Parmar) models" kicker="Beyond fixed shapes">
        <p>Royston–Parmar models <Cite k="roystonParmar2002" /> model the log cumulative hazard as a restricted cubic spline in log time:</p>
        <MathBlock tex={String.raw`\log H(t\mid x)=s(\log t;\,\boldsymbol\gamma)+\beta^\top x`} caption={<>With one degree of freedom, <M>{'s'}</M> is linear and the model is a Weibull. More knots let the baseline follow almost any shape. The model stays PH in x, and time-varying effects come from adding spline × covariate terms. You get smooth hazards, survival and RMST, plus relative survival and cure extensions <Cite k="roystonLambert" />.</>} />
        <ul>
          <li>Use 3–5 knots placed at quantiles of the uncensored log times. Results are usually insensitive to exact placement.</li>
          <li>Natural splines are linear beyond the boundary knots, so extrapolation still rests on assumptions. Check the implied long-term hazard.</li>
        </ul>
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(flexsurv)
fits <- lapply(c("exp","weibull","gompertz","llogis","lnorm","gengamma"),
               function(dist) flexsurvreg(Surv(months, died) ~ trt, data = d, dist = dist))
sapply(fits, AIC)
summary(fits[[2]], t = c(60, 120), type = "survival")   # extrapolated survival
flexsurvspline(Surv(months, died) ~ trt, data = d, k = 3)  # Royston-Parmar, 3 internal knots
survreg(Surv(months, died) ~ trt, data = d, dist = "weibull")  # AFT parameterisation`}
          python={`from lifelines import WeibullAFTFitter, LogNormalAFTFitter, LogLogisticAFTFitter
from lifelines import WeibullFitter, LogNormalFitter, ExponentialFitter
for F in (ExponentialFitter, WeibullFitter, LogNormalFitter):
    f = F().fit(d["months"], d["died"]); print(F.__name__, f.AIC_)
aft = WeibullAFTFitter().fit(d[["months", "died", "trt"]], "months", "died")
aft.print_summary()        # exp(coef) of lambda_ = time ratio`}
        />
      </Section>

      <Takeaways
        items={[
          'Choose a parametric family for its hazard shape: constant, monotone or rise-and-fall.',
          'PH models give hazard ratios; AFT models give time ratios. Only the Weibull is both: HR = φ^(−k).',
          'Fit by maximum likelihood; compare with AIC/BIC and against the KM curve.',
          'Within follow-up, models agree; beyond it they can diverge wildly. Extrapolation must be justified by external data and clinical plausibility.',
          'Royston–Parmar spline models give smooth, flexible baselines and are standard in HTA and population studies.',
        ]}
      />
    </ModuleLayout>
  )
}
