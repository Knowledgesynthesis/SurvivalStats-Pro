import { useDeferredValue, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type BandSeries, type Series } from '@/components/charts/Plot'
import { Swimmer, type Lane } from '@/components/charts/Swimmer'
import { SERIES, fnSeries } from '@/components/charts/survival'
import { Button, Resample, Slider, StatTile } from '@/components/ui/controls'
import { cumulativeIncidence, fineGray, causeSpecificCox, naiveOneMinusKM } from '@/lib/stats/competingRisks'
import { simCompeting } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

const LANES: Lane[] = [
  { id: '1', start: 0, end: 14, outcome: 'event' },
  { id: '2', start: 0, end: 6, outcome: 'competing' },
  { id: '3', start: 0, end: 30, outcome: 'censor' },
  { id: '4', start: 0, end: 22, outcome: 'competing' },
  { id: '5', start: 0, end: 9, outcome: 'event' },
  { id: '6', start: 0, end: 18, outcome: 'censor' },
]

function cifAt(rows: { time: number; cif: number[] }[], k: number, t: number) {
  let v = 0
  for (const r of rows) {
    if (r.time <= t) v = r.cif[k] ?? 0
    else break
  }
  return v
}

// ---------- CIF vs 1 − KM ----------
function CIFLab() {
  const [lam1, setLam1] = useState(0.02)
  const [lam2, setLam2] = useState(0.03)
  const [seed, setSeed] = useState(2)
  const d = useMemo(() => simCompeting(seed, 600, lam1, lam2, 1, 1, 0.01, 60), [seed, lam1, lam2])
  const ctrl = useMemo(() => ({ time: d.time.filter((_, i) => d.trt[i] === 0), cause: d.cause.filter((_, i) => d.trt[i] === 0) }), [d])
  const aj = useMemo(() => cumulativeIncidence(ctrl), [ctrl])
  const naive = useMemo(() => naiveOneMinusKM(ctrl, 1), [ctrl])
  const true1 = d.trueCIF(1, 0)
  const true2 = d.trueCIF(2, 0)
  const t = 36
  const n36 = naive.filter((r) => r.time <= t).at(-1)?.risk ?? 0
  const series: Series[] = [
    fnSeries(true1, 0, 60, 120, { id: 't1', label: 'True CIF', color: 'var(--ink-2)', dashed: true, width: 1.5 }),
    { kind: 'step', id: 'aj', label: 'Aalen–Johansen CIF', color: SERIES[0], points: [{ x: 0, y: 0 }, ...aj.rows.map((r) => ({ x: r.time, y: r.cif[0] ?? 0 }))] },
    { kind: 'step', id: 'naive', label: '1 − KM (competing censored)', color: SERIES[7], points: [{ x: 0, y: 0 }, ...naive.map((r) => ({ x: r.time, y: r.risk }))] },
  ]
  // stacked: event 1, event 2, event-free
  const grid = aj.rows.map((r) => r.time)
  const stack: BandSeries[] = [
    { kind: 'band', id: 'e1', label: 'Event of interest', color: SERIES[0], step: true, opacity: 0.85, gapEdge: true, points: [{ x: 0, y0: 0, y1: 0 }, ...grid.map((tt) => ({ x: tt, y0: 0, y1: cifAt(aj.rows, 0, tt) }))] },
    { kind: 'band', id: 'e2', label: 'Competing event', color: SERIES[6], step: true, opacity: 0.85, gapEdge: true, points: [{ x: 0, y0: 0, y1: 0 }, ...grid.map((tt) => ({ x: tt, y0: cifAt(aj.rows, 0, tt), y1: cifAt(aj.rows, 0, tt) + cifAt(aj.rows, 1, tt) }))] },
    { kind: 'band', id: 'free', label: 'Event-free', color: 'var(--muted)', step: true, opacity: 0.22, points: [{ x: 0, y0: 0, y1: 1 }, ...grid.map((tt) => ({ x: tt, y0: cifAt(aj.rows, 0, tt) + cifAt(aj.rows, 1, tt), y1: 1 }))] },
  ]
  return (
    <Lab
      title="Cumulative incidence vs 1 − Kaplan–Meier"
      goal="300 patients face a relapse hazard and a competing hazard of death without relapse, both constant (per month). The exact cumulative incidence of relapse is known."
      controls={
        <>
          <Slider label="Relapse hazard (per month)" value={lam1} onChange={setLam1} min={0.005} max={0.06} step={0.005} />
          <Slider label="Competing death hazard (per month)" value={lam2} onChange={setLam2} min={0} max={0.08} step={0.005} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Risk of relapse</div>
          <Plot ariaLabel="Cumulative incidence of relapse, correct and naive" series={series} xLabel="Months" yLabel="Cumulative probability" yDomain={[0, 1]} xDomain={[0, 60]} height={240} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Where everyone is (sums to 1)</div>
          <Plot ariaLabel="Stacked state probabilities" series={stack} xLabel="Months" yLabel="Probability" yDomain={[0, 1]} xDomain={[0, 60]} height={240} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="True risk by 36 months" value={fmt(true1(t), 3)} />
        <StatTile label="Aalen–Johansen" value={fmt(cifAt(aj.rows, 0, t), 3)} tone="good" />
        <StatTile label="1 − KM" value={fmt(n36, 3)} tone={n36 - true1(t) > 0.03 ? 'bad' : undefined} />
        <StatTile label="True competing risk by 36" value={fmt(true2(t), 3)} />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Set the competing hazard to 0.', see: 'With nothing competing, 1 − KM and the CIF coincide. The difference is entirely caused by the competing event.' },
            { do: 'Make the competing hazard twice the relapse hazard.', see: '1 − KM badly overstates relapse risk. It estimates the risk in a world where nobody can die first, which is not the world your patients live in.' },
            { do: 'Look at the stacked plot: do relapse and competing-death CIFs plus event-free probability sum to 1?', see: 'Yes, at every time. 1 − KM curves for each cause, by contrast, can sum to more than 1.' },
          ]}
        />
      </div>
    </Lab>
  )
}

// ---------- csHR vs sHR ----------
function HazardsLab() {
  const [cs1, setCs1] = useState(1)
  const [cs2, setCs2] = useState(0.5)
  const [seed, setSeed] = useState(4)
  const d1 = useDeferredValue(cs1)
  const d2 = useDeferredValue(cs2)
  const d = useMemo(() => simCompeting(seed, 1000, 0.03, 0.03, d1, d2, 0.005, 60), [seed, d1, d2])
  const res = useMemo(() => {
    const data = { time: d.time, cause: d.cause }
    const x = d.trt.map((g) => [g])
    const c1 = causeSpecificCox(data, x, 1).coefs[0]
    const c2 = causeSpecificCox(data, x, 2).coefs[0]
    const f1 = fineGray(data, x, 1).fit.coefs[0]
    const f2 = fineGray(data, x, 2).fit.coefs[0]
    const arms = [0, 1].map((g) => cumulativeIncidence({ time: d.time.filter((_, i) => d.trt[i] === g), cause: d.cause.filter((_, i) => d.trt[i] === g) }))
    return { c1, c2, f1, f2, arms }
  }, [d])
  const cifSeries = (k: 0 | 1): Series[] => [
    { kind: 'step', id: `c${k}`, label: 'Control', color: SERIES[1], points: [{ x: 0, y: 0 }, ...res.arms[0].rows.map((r) => ({ x: r.time, y: r.cif[k] ?? 0 }))] },
    { kind: 'step', id: `t${k}`, label: 'Treated', color: SERIES[0], points: [{ x: 0, y: 0 }, ...res.arms[1].rows.map((r) => ({ x: r.time, y: r.cif[k] ?? 0 }))] },
    fnSeries(d.trueCIF((k + 1) as 1 | 2, 0), 0, 60, 80, { id: `tc${k}`, label: 'Control (truth)', color: SERIES[1], dashed: true, width: 1.25 }),
    fnSeries(d.trueCIF((k + 1) as 1 | 2, 1), 0, 60, 80, { id: `tt${k}`, label: 'Treated (truth)', color: SERIES[0], dashed: true, width: 1.25 }),
  ]
  const ci = (c: { hr: number; lower: number; upper: number }) => `${fmt(c.hr, 2)} (${fmt(c.lower, 2)}–${fmt(c.upper, 2)})`
  const preset = (a: number, b: number) => () => {
    setCs1(a)
    setCs2(b)
  }
  return (
    <Lab
      title="Cause-specific vs subdistribution hazard ratios"
      goal="A randomised trial of 1,000 patients with two causes of failure (each with baseline hazard 0.03 per month). Set the true effect of treatment on each cause-specific hazard, then compare what the two kinds of regression report."
      controls={
        <>
          <Slider label="True cause-specific HR: relapse" value={cs1} onChange={setCs1} min={0.3} max={2} step={0.05} />
          <Slider label="True cause-specific HR: death without relapse" value={cs2} onChange={setCs2} min={0.3} max={2} step={0.05} />
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" onClick={preset(1, 0.5)}>
              Only prevents death
            </Button>
            <Button variant="outline" onClick={preset(0.6, 1)}>
              Only prevents relapse
            </Button>
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Cumulative incidence of relapse</div>
          <Plot ariaLabel="CIF of relapse by arm" series={cifSeries(0)} xLabel="Months" yLabel="Probability" yDomain={[0, 0.8]} xDomain={[0, 60]} height={210} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Cumulative incidence of death without relapse</div>
          <Plot ariaLabel="CIF of competing death by arm" series={cifSeries(1)} xLabel="Months" yLabel="Probability" yDomain={[0, 0.8]} xDomain={[0, 60]} height={210} />
        </div>
      </div>
      <Table
        className="mt-4"
        head={['', 'Cause-specific HR (Cox, competing censored)', 'Subdistribution HR (Fine–Gray, robust CI)']}
        rows={[
          ['Relapse', <span key="a">{ci(res.c1)} · truth {fmt(cs1, 2)}</span>, ci(res.f1)],
          ['Death without relapse', <span key="b">{ci(res.c2)} · truth {fmt(cs2, 2)}</span>, ci(res.f2)],
        ]}
      />
      <TryThis
        items={[
          { do: 'Press “Only prevents death”. What do the two relapse HRs say?', see: 'The cause-specific HR for relapse is about 1: treatment does not change the relapse rate among people alive and relapse-free. The subdistribution HR is above 1, because more treated patients survive long enough to relapse, so their cumulative incidence is higher. Both are correct, and they answer different questions.' },
          { do: 'Press “Only prevents relapse”.', see: 'Now both relapse HRs are below 1, but the Fine–Gray HR for death without relapse moves above 1: fewer relapses leave more people exposed to the competing death. This is why all causes must be reported (Latouche et al. 2013).' },
        ]}
      />
    </Lab>
  )
}

export default function CompetingRisks() {
  return (
    <ModuleLayout id="competing-risks">
      <Section id="what" title="When another event gets there first" kicker="Definitions">
        <p>
          A <strong>competing event</strong> precludes the event of interest, or fundamentally changes its probability. Examples: death before relapse, transplant before death on the waiting list, death from other causes in elderly cancer patients, and dialysis before kidney failure.
        </p>
        <Swimmer lanes={LANES} xMax={32} xLabel="Months since transplant" />
        <p>Three quantities, each answering a different question:</p>
        <MathBlock
          tex={String.raw`\underbrace{h_k(t)=\lim_{\Delta\to0}\tfrac{P(t\le T<t+\Delta,\,J=k\mid T\ge t)}{\Delta}}_{\text{cause-specific hazard}}\qquad \underbrace{F_k(t)=P(T\le t,\,J=k)=\int_0^t S(u^-)\,h_k(u)\,du}_{\text{cumulative incidence}}`}
          caption={<>Here <M>{'S(t)=\\exp\\{-\\sum_k H_k(t)\\}'}</M> is overall event-free survival. The cumulative incidence of cause k depends on <em>every</em> cause-specific hazard: a treatment that lowers competing mortality raises the CIF of the event of interest.</>}
        />
        <MathBlock tex={String.raw`\tilde h_k(t)=-\frac{d}{dt}\log\{1-F_k(t)\}\quad\text{(subdistribution hazard: those who had a competing event stay in the risk set)}`} />
      </Section>

      <Section id="cif" title="Estimating absolute risk: Aalen–Johansen" kicker="Lab">
        <MathBlock tex={String.raw`\hat F_k(t)=\sum_{j:\,t_j\le t}\hat S(t_j^-)\,\frac{d_{kj}}{n_j}`} caption={<>To fail from cause k at <M>{'t_j'}</M> you must first be event-free just before <M>{'t_j'}</M>, which is the role of <M>{'\\hat S(t_j^-)'}</M>, the all-cause Kaplan–Meier <Cite k="aalenJohansen1978" />. Our implementation matches R’s multi-state <code>survfit</code> exactly.</>} />
        <CIFLab />
        <MythFact myth="“Censor the deaths and use Kaplan–Meier; that is conservative.”" fact="It is anti-conservative for risk: 1 − KM overestimates the cumulative incidence whenever competing events occur. It answers a hypothetical question, a world where nobody dies of other causes, and assumes that world’s risk applies after death." />
      </Section>

      <Section id="regression" title="Regression: cause-specific Cox vs Fine–Gray" kicker="Lab">
        <Table
          head={['', 'Cause-specific Cox', 'Fine–Gray (subdistribution)']}
          rows={[
            ['Models', 'Rate of cause k among those still event-free', 'Hazard of the CIF; those with competing events remain “at risk”'],
            ['How to fit', 'Ordinary Cox, competing events censored', 'Weighted Cox with IPCW weights (finegray / crr)'],
            ['HR answers', '“Does x change the rate of k among those at risk?” (aetiology)', '“Does x change the cumulative incidence of k?” (prognosis)'],
            ['Absolute risk', 'Combine all cause-specific models', 'Directly from one model'],
            ['Caveats', 'One HR does not determine the CIF', 'HR not a rate among people at risk; per-cause models can give ΣCIF > 1'],
          ]}
        />
        <HazardsLab />
        <Callout kind="warn" title="Interpreting a subdistribution HR">
          A subdistribution HR keeps people who have already died in the risk set, so it is not the effect on a rate among living patients <Cite k="andersenKeiding2012" />. Interpret it only through its effect on the cumulative incidence. When separate Fine–Gray models are fitted for each cause, the predicted CIFs can sum to more than 1 <Cite k="austin2021" />; cause-specific models combined via Aalen–Johansen do not have this problem.
        </Callout>
        <Quiz q={{ id: 'cr-inline-1', stem: 'In older patients with cancer, a new drug increases non-cancer deaths (cause-specific HR 1.6) and has no effect on the cancer-death rate (cause-specific HR 1.0). The Fine–Gray HR for cancer death will most likely be…', options: ['Below 1, because fewer patients survive long enough to die of cancer', 'Exactly 1', 'Above 1', 'Undefined'], answer: 0, why: 'Higher competing mortality depletes the population at risk of cancer death, lowering the cancer CIF. An sHR below 1 here does not mean the drug “prevents cancer death”. Read it as an effect on cumulative incidence only.' }} />
      </Section>

      <Section id="reporting" title="Reporting a competing-risks analysis" kicker="Practice">
        <ol>
          <li>Name every competing event and how it was defined. Combine rare causes only if that is clinically sensible.</li>
          <li>Show cumulative incidence curves (Aalen–Johansen) for every cause, by group, ideally stacked with event-free survival.</li>
          <li>Report cause-specific HRs for <em>all</em> causes. Add subdistribution HRs if the question is prognostic <Cite k="latouche2013" />.</li>
          <li>Compare CIFs with Gray’s test <Cite k="gray1988" /> or by modelling. Do not use the log-rank test on 1 − KM.</li>
          <li>For individual risk prediction, use Fine–Gray or combine cause-specific models, and validate calibration of the CIF (Module 11).</li>
        </ol>
        <Callout kind="practice" title="Estimands">
          The ICH E9(R1) estimand framework makes the choice explicit. Death can be handled as part of a composite outcome (“relapse or death”), by a while-alive strategy (cumulative incidence), or by a hypothetical strategy (“had nobody died”, which needs strong assumptions). Choose before analysis.
        </Callout>
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival)
d$ev <- factor(d$cause, 0:2, c("censor", "relapse", "death"))
aj <- survfit(Surv(months, ev) ~ arm, data = d)            # Aalen–Johansen CIFs
plot(aj, col = 1:2, lty = c(1, 1, 2, 2))
coxph(Surv(months, ev == "relapse") ~ arm + age, data = d)  # cause-specific Cox
fg <- finegray(Surv(months, ev) ~ ., data = d, etype = "relapse")
coxph(Surv(fgstart, fgstop, fgstatus) ~ arm + age, weights = fgwt, data = fg)   # Fine–Gray
# alternatives: cmprsk::crr(), tidycmprsk::crr(), tidycmprsk::cuminc() (includes Gray's test)`}
          python={`from lifelines import AalenJohansenFitter
ajf = AalenJohansenFitter()
ajf.fit(d["months"], d["cause"], event_of_interest=1)   # cause coded 0 = censored
ajf.plot()
# cause-specific Cox: lifelines CoxPHFitter with event = (cause == 1)
# Fine–Gray: not in lifelines; use R (survival::finegray, cmprsk) via rpy2`}
        />
      </Section>

      <Takeaways
        items={[
          'Competing events are not independent censoring; 1 − KM overstates absolute risk when they occur.',
          'Use the Aalen–Johansen CIF for absolute risk; CIFs and event-free survival sum to 1.',
          'Cause-specific HRs describe rates among those at risk (aetiology); subdistribution HRs describe effects on cumulative incidence (prognosis).',
          'A treatment can change the CIF of an event without touching its cause-specific hazard, by acting on the competing event.',
          'Report CIFs and cause-specific hazards for every cause.',
        ]}
      />
    </ModuleLayout>
  )
}
