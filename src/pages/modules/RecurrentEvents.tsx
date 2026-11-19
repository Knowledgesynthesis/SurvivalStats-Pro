import { useDeferredValue, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { Swimmer, type Lane } from '@/components/charts/Swimmer'
import { SERIES, fnSeries } from '@/components/charts/survival'
import { Resample, Slider, StatTile } from '@/components/ui/controls'
import { coxph } from '@/lib/stats/cox'
import { simRecurrent } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

type Row = { id: number; start: number; stop: number; status: number; trt: number; k: number }

/** Nelson–Aalen estimate of the mean cumulative function for one group. */
function mcf(rows: Row[]) {
  const end = new Map<number, number>()
  for (const r of rows) end.set(r.id, Math.max(end.get(r.id) ?? 0, r.stop))
  const ends = Array.from(end.values()).sort((a, b) => a - b)
  const ev = rows.filter((r) => r.status).map((r) => r.stop).sort((a, b) => a - b)
  const out = [{ x: 0, y: 0 }]
  let m = 0
  let i = 0
  let p = 0
  while (i < ev.length) {
    const t = ev[i]
    let d = 0
    while (i < ev.length && ev[i] === t) {
      d++
      i++
    }
    while (p < ends.length && ends[p] < t) p++
    const atRisk = ends.length - p
    if (atRisk > 0) m += d / atRisk
    out.push({ x: t, y: m })
  }
  return out
}

function RecurrentLab() {
  const [rate, setRate] = useState(0.15)
  const [rr, setRr] = useState(0.7)
  const [fv, setFv] = useState(1)
  const [n, setN] = useState(400)
  const [seed, setSeed] = useState(6)
  const fu = 24
  const dn = useDeferredValue(n)
  const dRate = useDeferredValue(rate)
  const dRr = useDeferredValue(rr)
  const dFv = useDeferredValue(fv)
  const sim = useMemo(() => simRecurrent(seed, dn, dRate, dRr, dFv, fu), [seed, dn, dRate, dRr, dFv])
  const res = useMemo(() => {
    const rows = sim.rows
    const ag = coxph({ start: rows.map((r) => r.start), time: rows.map((r) => r.stop), status: rows.map((r) => r.status), x: rows.map((r) => [r.trt]), cluster: rows.map((r) => r.id) }, { ties: 'breslow' }).coefs[0]
    const first = rows.filter((r) => r.k === 1)
    const fe = coxph({ time: first.map((r) => r.stop), status: first.map((r) => r.status), x: first.map((r) => [r.trt]) }).coefs[0]
    const pwp = coxph({ time: rows.map((r) => r.stop - r.start), status: rows.map((r) => r.status), x: rows.map((r) => [r.trt]), strata: rows.map((r) => Math.min(r.k, 4)), cluster: rows.map((r) => r.id) }, { ties: 'breslow' }).coefs[0]
    return { ag, fe, pwp, m0: mcf(rows.filter((r) => r.trt === 0)), m1: mcf(rows.filter((r) => r.trt === 1)) }
  }, [sim])
  const lanes: Lane[] = useMemo(() => {
    const ids = Array.from(new Set(sim.rows.map((r) => r.id))).slice(0, 8)
    return ids.map((id) => {
      const rs = sim.rows.filter((r) => r.id === id)
      return { id: `#${id + 1} ${rs[0].trt ? 'T' : 'C'}`, start: 0, end: Math.max(...rs.map((r) => r.stop)), outcome: 'censor' as const, events: rs.filter((r) => r.status).map((r) => r.stop) }
    })
  }, [sim])
  const counts = sim.counts
  const maxC = Math.min(12, Math.max(...counts))
  const hist = Array.from({ length: maxC + 1 }, (_, k) => counts.filter((c) => (k === maxC ? c >= k : c === k)).length)
  const series: Series[] = [
    { kind: 'step', id: 'm0', label: 'Control MCF', color: SERIES[1], points: res.m0 },
    { kind: 'step', id: 'm1', label: 'Treated MCF', color: SERIES[0], points: res.m1 },
    fnSeries((t) => rate * t, 0, fu, 50, { id: 't0', label: 'Control truth', color: SERIES[1], dashed: true, width: 1.25 }),
    fnSeries((t) => rate * rr * t, 0, fu, 50, { id: 't1', label: 'Treated truth', color: SERIES[0], dashed: true, width: 1.25 }),
  ]
  return (
    <Lab
      title="Recurrent events with between-patient heterogeneity"
      goal="Each patient has a personal event rate (gamma frailty, mean 1) times a treatment rate ratio, followed for 12–24 months. Compare analyses that use all events with one that uses only the first."
      controls={
        <>
          <Slider label="Control event rate (per month)" value={rate} onChange={setRate} min={0.03} max={0.4} step={0.01} />
          <Slider label="True rate ratio (treated vs control)" value={rr} onChange={setRr} min={0.4} max={1.5} step={0.05} />
          <Slider label="Frailty variance" value={fv} onChange={setFv} min={0} max={3} step={0.1} hint="0 = all patients share the same rate" />
          <Slider label="Patients" value={n} onChange={setN} min={100} max={1500} step={50} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Mean cumulative number of events</div>
          <Plot ariaLabel="Mean cumulative function by arm" series={series} xLabel="Months" yLabel="Events per patient" xDomain={[0, fu]} height={230} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Events per patient</div>
          <div className="flex h-[230px] items-end gap-1 border-b border-axis pb-0.5" role="img" aria-label="Histogram of events per patient">
            {hist.map((h, k) => (
              <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-muted tabular">{h}</span>
                <div className="w-full max-w-6 rounded-t-[4px] bg-[var(--s1)]" style={{ height: `${(h / Math.max(...hist)) * 180}px` }} />
                <span className="text-[10px] text-ink-2 tabular">{k === maxC ? `${k}+` : k}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 text-center text-xs text-ink-2">Number of events</div>
        </div>
      </div>
      <Table
        className="mt-4"
        head={['Model', 'Estimate (95% CI)', 'What it targets']}
        rows={[
          ['Andersen–Gill, naive SE', `${fmt(res.ag.hr, 2)} (${fmt(Math.exp(Math.log(res.ag.hr) - 1.96 * res.ag.se), 2)}–${fmt(Math.exp(Math.log(res.ag.hr) + 1.96 * res.ag.se), 2)})`, 'Rate ratio; CI too narrow with heterogeneity'],
          ['Andersen–Gill, robust SE', `${fmt(res.ag.hr, 2)} (${fmt(res.ag.lower, 2)}–${fmt(res.ag.upper, 2)})`, `Rate ratio; truth ${fmt(rr, 2)}`],
          ['PWP gap time (strata = event number)', `${fmt(res.pwp.hr, 2)} (${fmt(res.pwp.lower, 2)}–${fmt(res.pwp.upper, 2)})`, 'Event-specific hazard ratio, conditional on prior events'],
          ['Time to first event only', `${fmt(res.fe.hr, 2)} (${fmt(res.fe.lower, 2)}–${fmt(res.fe.upper, 2)})`, 'Marginal HR for first event (attenuated by frailty)'],
        ]}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Total events" value={counts.reduce((a, b) => a + b, 0)} />
        <StatTile label="Patients with ≥ 1 event" value={`${counts.filter((c) => c > 0).length} / ${n}`} />
        <StatTile label="Naive / robust SE" value={`${fmt(res.ag.se, 3)} / ${fmt(res.ag.robustSe ?? NaN, 3)}`} />
        <StatTile label="Max events in one patient" value={Math.max(...counts)} />
      </div>
      <div className="mt-4">
        <div className="mb-1 text-sm font-medium text-ink">First eight patients (T = treated, C = control)</div>
        <Swimmer lanes={lanes} xMax={fu} xLabel="Months (filled = event, open = end of follow-up)" />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Set frailty variance to 0. Compare naive and robust SEs.', see: 'They agree: with no heterogeneity, events within a patient are independent given covariates. The Poisson-process assumption behind the naive variance holds.' },
            { do: 'Set frailty variance to 2.', see: 'The robust SE becomes much larger than the naive one, so the naive CI is far too narrow. The histogram shows a few patients with many events and many with none. Always use cluster-robust variance (or a frailty model).' },
            { do: 'With high frailty, compare the first-event HR with the Andersen–Gill rate ratio.', see: 'The first-event HR is pulled toward 1. Frail patients have their first event early in both arms, diluting the contrast. The AG rate ratio stays near the true conditional ratio.' },
          ]}
        />
      </div>
    </Lab>
  )
}

export default function RecurrentEvents() {
  return (
    <ModuleLayout id="recurrent-events">
      <Section id="structures" title="Questions and data structures" kicker="Framework">
        <p>
          With recurrent events, “time to first event” throws away later events, and treating every event as independent ignores within-patient correlation. Choose the model by the question <Cite k="amorim2015" /> <Cite k="cookLawless" />:
        </p>
        <Table
          head={['Model', 'Risk set for event k', 'Time scale', 'Answers']}
          rows={[
            ['Andersen–Gill (AG)', 'Everyone under observation, whatever their number of prior events', 'Total time', 'Overall rate ratio; mean number of events'],
            ['PWP total time', 'Only those who have had k − 1 events (stratified by k)', 'Total time', 'Effect on the k-th event, given k − 1'],
            ['PWP gap time', 'As above', 'Time since previous event', 'Effect on the time between events'],
            ['WLW (marginal)', 'Everyone, for each event number separately', 'Total time', 'Marginal effect on time to the k-th event'],
            ['Frailty (shared)', 'As AG, plus a random patient effect', 'Total time', 'Conditional (patient-level) rate ratio and heterogeneity'],
          ]}
        />
        <MathBlock tex={String.raw`\text{AG: } \lambda_i(t)=Y_i(t)\,\lambda_0(t)\,e^{\beta^\top x_i},\qquad \widehat{\mathrm{MCF}}(t)=\sum_{t_j\le t}\frac{d_j}{Y(t_j)}`} caption={<>Here <M>{'Y_i(t)'}</M> is 1 while patient i is under observation. The MCF (mean cumulative function) is the expected number of events per patient by time t, the recurrent-event analogue of 1 − S(t).</>} />
      </Section>

      <Section id="lab" title="Rates, heterogeneity and robust variance" kicker="Lab">
        <RecurrentLab />
        <Callout kind="key">
          Use the Lin–Wei robust (sandwich) variance clustered on patient for AG and PWP models <Cite k="linWei1989" />. The point estimate stays valid when patients differ in propensity, but the naive variance does not.
        </Callout>
      </Section>

      <Section id="terminal" title="When death stops the recurrences" kicker="Terminal events">
        <p>
          In heart failure, COPD or cancer, death ends the possibility of further hospitalisations, and sicker patients die sooner. Censoring at death answers a hypothetical question (no deaths). Two common approaches answer real-world questions:
        </p>
        <ul>
          <li>
            <strong>Ghosh–Lin</strong> <Cite k="ghoshLin2000" />: the expected number of events by t, accounting for death. Its nonparametric estimator is <M>{'\\sum_{t_j\\le t}\\hat S(t_j^-)\\,d_j/Y(t_j)'}</M>. It has the same structure as the cumulative incidence: you must be alive to have an event.
          </li>
          <li>
            <strong>Composite endpoints</strong> (recurrent hospitalisations plus death) analysed with the LWYY/AG model, or win-ratio methods. These are common in contemporary heart-failure trials.
          </li>
        </ul>
        <Quiz q={{ id: 're-inline-1', stem: 'A drug reduces deaths but not the hospitalisation rate among those alive. Compared with placebo, the expected number of hospitalisations per patient (Ghosh–Lin) over 2 years will be…', options: ['Higher, because patients live longer and so have more time to be hospitalised', 'Lower', 'The same', 'Undefined'], answer: 0, why: 'Exactly as with competing risks, reducing the terminal event increases exposure time for recurrences. Report the effect on death alongside any recurrent-event estimate.' }} />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival)
# Andersen–Gill with robust SE (one row per gap, counting-process form)
coxph(Surv(tstart, tstop, event) ~ trt + cluster(id), data = rec)
# PWP gap time
coxph(Surv(tstop - tstart, event) ~ trt + strata(enum) + cluster(id), data = rec)
# shared gamma frailty
coxph(Surv(tstart, tstop, event) ~ trt + frailty(id), data = rec)
# MCF
plot(survfit(Surv(tstart, tstop, event) ~ trt, data = rec), cumhaz = TRUE)
# with death as a terminal event (Ghosh–Lin): e.g., reReg::mcf()`}
          python={`from lifelines import CoxPHFitter
# Andersen–Gill: lifelines needs start/stop via CoxTimeVaryingFitter;
# robust SE clustered on id via CoxPHFitter(...).fit(..., cluster_col="id") on gap-time data
cph = CoxPHFitter().fit(rec[["gap", "event", "trt", "id"]], "gap", "event", cluster_col="id", strata=["enum"])
cph.print_summary()   # PWP gap-time model with robust SE`}
        />
      </Section>

      <Takeaways
        items={[
          'Use all events when the burden of recurrences matters; first-event analyses answer a narrower question.',
          'Choose AG, PWP, WLW or frailty models by the question each answers.',
          'Always use cluster-robust standard errors (or a frailty term) for recurrent events.',
          'The MCF estimates the expected number of events over time; with a terminal event use the Ghosh–Lin version.',
          'Treatments that reduce death can increase the expected number of non-fatal events; report both.',
        ]}
      />
    </ModuleLayout>
  )
}
