import { useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { Swimmer, type Lane } from '@/components/charts/Swimmer'
import { Forest } from '@/components/charts/Forest'
import { SERIES, kmSeries } from '@/components/charts/survival'
import { Resample, Slider, StatTile } from '@/components/ui/controls'
import { kaplanMeier, survAt } from '@/lib/stats/km'
import { coxph } from '@/lib/stats/cox'
import { simImmortal, simSingle } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

function ImmortalLab() {
  const [trueHR, setTrueHR] = useState(1)
  const [mu, setMu] = useState(0.15)
  const [L, setL] = useState(6)
  const [n, setN] = useState(800)
  const [seed, setSeed] = useState(1)
  const rows = useMemo(() => simImmortal(seed, n, trueHR, mu), [seed, n, trueHR, mu])
  const res = useMemo(() => {
    const time = rows.map((r) => r.time)
    const status = rows.map((r) => r.status)
    const naive = coxph({ time, status, x: rows.map((r) => [r.responded]) })
    const lm = rows.filter((r) => r.time > L)
    const landmark = coxph({ time: lm.map((r) => r.time - L), status: lm.map((r) => r.status), x: lm.map((r) => [r.responded && r.R <= L ? 1 : 0]) })
    const start: number[] = []
    const stop: number[] = []
    const st: number[] = []
    const x: number[][] = []
    for (const r of rows) {
      if (r.responded && r.R > 0 && r.R < r.time) {
        start.push(0, r.R)
        stop.push(r.R, r.time)
        st.push(0, r.status)
        x.push([0], [1])
      } else {
        start.push(0)
        stop.push(r.time)
        st.push(r.status)
        x.push([0])
      }
    }
    const td = coxph({ start, time: stop, status: st, x })
    const kmNaive = [0, 1].map((g) => kaplanMeier({ time: rows.filter((r) => r.responded === g).map((r) => r.time), status: rows.filter((r) => r.responded === g).map((r) => r.status) }))
    const kmLm = [0, 1].map((g) => {
      const sub = lm.filter((r) => (r.responded && r.R <= L ? 1 : 0) === g)
      return kaplanMeier({ time: sub.map((r) => r.time - L), status: sub.map((r) => r.status) })
    })
    return { naive: naive.coefs[0], landmark: landmark.coefs[0], td: td.coefs[0], kmNaive, kmLm, nLm: lm.length }
  }, [rows, L])
  const lanes: Lane[] = rows.slice(0, 10).map((r) => ({ id: `#${r.id + 1}`, start: 0, end: r.time, outcome: r.status ? 'event' : 'censor', mark: r.responded ? r.R : undefined }))
  const series = (fits: typeof res.kmNaive): Series[] => [...kmSeries(fits[0], { id: 'nr', label: 'Non-responders', color: SERIES[1], censorMarks: false }), ...kmSeries(fits[1], { id: 'r', label: 'Responders', color: SERIES[0], censorMarks: false })]
  return (
    <Lab
      title="Manufacturing a benefit from nothing"
      goal="Patients may “respond” at a random time during follow-up. By default response has no effect on survival (true HR = 1). Compare three ways of analysing responders vs non-responders."
      controls={
        <>
          <Slider label="True HR for death after response" value={trueHR} onChange={setTrueHR} min={0.4} max={1.6} step={0.05} />
          <Slider label="Response rate (per month)" value={mu} onChange={setMu} min={0.03} max={0.5} step={0.01} />
          <Slider label="Landmark time L (months)" value={L} onChange={setL} min={1} max={18} step={1} />
          <Slider label="Patients" value={n} onChange={setN} min={200} max={3000} step={100} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="mb-2 text-sm font-medium text-ink">The first ten patients (green bar = response)</div>
      <Swimmer lanes={lanes} xMax={40} xLabel="Months since start of treatment" markLabel="Response" />
      <div className="mt-5">
        <Forest
          rows={[
            { label: 'Naive: ever-responder', est: res.naive.hr, lo: res.naive.lower, hi: res.naive.upper, truth: trueHR },
            { label: `Landmark at ${L} mo`, est: res.landmark.hr, lo: res.landmark.lower, hi: res.landmark.upper, truth: trueHR },
            { label: 'Time-dependent Cox', est: res.td.hr, lo: res.td.lower, hi: res.td.upper, truth: trueHR },
          ]}
          domain={[0.05, 4]}
        />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Naive: groups defined by eventual response</div>
          <Plot ariaLabel="Naive Kaplan–Meier by eventual response" series={series(res.kmNaive)} xLabel="Months from start" yLabel="Survival" yDomain={[0, 1]} xDomain={[0, 36]} height={190} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Landmark: groups defined at month {L}</div>
          <Plot ariaLabel="Landmark Kaplan–Meier" series={series(res.kmLm)} xLabel={`Months after landmark (${res.nLm} at risk at L)`} yLabel="Survival" yDomain={[0, 1]} xDomain={[0, 36 - L]} height={190} />
        </div>
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Leave the true HR at 1. How strong does the naive “benefit” of response look?', see: 'A large, highly significant spurious benefit, often HR < 0.4. Responders were guaranteed to survive until they responded, and that immortal time is credited to them.' },
            { do: 'Lower the response rate to 0.03 per month.', see: 'Responses happen later, so each responder carries more immortal time and the bias grows. The time-dependent model stays near 1.' },
            { do: 'Set the true HR to 0.6. Which analyses recover it?', see: 'The time-dependent Cox does. The landmark HR is diluted toward 1, because patients who respond after L are counted as non-responders. This is the price of fixing exposure at the landmark.' },
          ]}
        />
      </div>
    </Lab>
  )
}

function ConditionalLab() {
  const [seed, setSeed] = useState(2)
  const d = useMemo(() => simSingle(seed, 800, 24, 0.15, 120, 0.6), [seed])
  const km = useMemo(() => kaplanMeier(d), [d])
  const marks = [0, 12, 24, 48]
  const horizon = 36
  const cond = (s: number): Series => {
    const base = survAt(km, s)
    const pts = [{ x: s, y: 1 }, ...km.rows.filter((r) => r.time > s && r.nEvent > 0 && r.time <= s + 72).map((r) => ({ x: r.time, y: r.surv / base }))]
    return { kind: 'step', id: `c${s}`, label: s === 0 ? 'From diagnosis' : `Given alive at ${s} mo`, color: SERIES[marks.indexOf(s)], points: pts, extendTo: s + 72 }
  }
  return (
    <Lab
      title="Conditional survival: the prognosis of survivors"
      goal="800 patients with a falling hazard (Weibull k = 0.6, median 24 months). Each curve restarts at a landmark among those still alive: S(s + u | T > s) = S(s + u)/S(s)."
      controls={<Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />}
    >
      <Plot ariaLabel="Conditional survival curves" series={marks.map(cond)} xLabel="Months since diagnosis" yLabel="Survival from landmark" yDomain={[0, 1]} xDomain={[0, 120]} height={230} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {marks.map((s) => (
          <StatTile key={s} label={s === 0 ? `P(survive ${horizon} mo)` : `P(next ${horizon} mo | alive at ${s})`} value={fmt(survAt(km, s + horizon) / survAt(km, s), 2)} />
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-2">
        With a falling hazard, prognosis improves the longer a patient survives. This is the basis of “conditional survival” tables that oncology patients find far more relevant than survival from diagnosis. Landmark super-models extend this to updated covariates <Cite k="vanHouwelingen2007" />.
      </p>
    </Lab>
  )
}

export default function TimeDependent() {
  return (
    <ModuleLayout id="time-dependent">
      <Section id="immortal" title="Immortal time: how bias is built into a design" kicker="Mechanism">
        <p>
          Immortal time is follow-up during which, <em>by definition of the exposure groups</em>, the outcome cannot occur. It arises whenever patients are classified at baseline by something that happens later: “responders”, “patients who received a transplant”, “statin users” defined by a prescription filled months after cohort entry <Cite k="suissa2008" /> <Cite k="levesque2010" />. The biased analysis credits the exposed group with time they had to survive in order to become exposed.
        </p>
        <MythFact myth="“Responders live longer, so response causes better survival.”" fact="Analysed from baseline, responders must have survived until response. Anderson, Cain & Gelber showed in 1983 that this alone produces a large apparent benefit; use a landmark or a time-dependent covariate." />
        <ImmortalLab />
      </Section>

      <Section id="counting" title="Time-dependent covariates and the counting-process layout" kicker="Data structure">
        <p>A covariate that changes during follow-up is coded by splitting each patient’s follow-up into intervals on which the covariate is constant:</p>
        <Table
          head={['id', 'start', 'stop', 'status', 'on statin', 'Meaning']}
          rows={[
            ['17', '0', '4', '0', '0', 'months 0–4 unexposed, no event'],
            ['17', '4', '10', '1', '1', 'months 4–10 exposed, dies at 10'],
            ['18', '0', '12', '0', '0', 'never exposed, censored at 12'],
          ]}
        />
        <MathBlock tex={String.raw`h\{t\mid x(t)\}=h_0(t)\exp\{\beta\,x(t)\}`} caption={<>At each event time, the risk set contains whichever row of each patient covers that time, so the comparison is always between people exposed and unexposed <em>at that moment</em>. This is the Andersen–Gill counting-process formulation <Cite k="andersenGill1982" />.</>} />
        <Callout kind="warn" title="Internal vs external covariates">
          <ul>
            <li>
              <strong>External</strong> covariates exist whether or not the patient is alive, such as air pollution, calendar time or a planned dose schedule. Their survival curves can be computed.
            </li>
            <li>
              <strong>Internal</strong> covariates are measured on the patient and stop when they die (biomarkers, blood pressure). A time-dependent Cox model can estimate their association with the hazard. But “survival given a biomarker path” is not well defined, because the path itself carries information about survival. Use landmarking or joint models for prediction.
            </li>
          </ul>
        </Callout>
        <Quiz q={{ id: 'td-inline-1', stem: 'In a time-dependent Cox model, treatment is switched on when CD4 count drops below a threshold (treatment by indication). The treatment HR estimates…', options: ['A causal treatment effect, because the time-dependent coding removes immortal time', 'An association that can still be confounded by the time-varying CD4 that triggers treatment and also affects the outcome; g-methods (e.g., marginal structural models) are needed for causal effects', 'Nothing useful', 'The effect of CD4'], answer: 1, why: 'Time-dependent coding fixes immortal time, but not time-varying confounding affected by prior treatment. Inverse-probability weighting (marginal structural Cox models) or target trial emulation with cloning and censoring address this.' }} />
      </Section>

      <Section id="landmark" title="Landmark analysis and dynamic prediction" kicker="Lab">
        <p>A landmark analysis fixes a time <M>L</M> and:</p>
        <ol>
          <li>includes only patients still at risk at <M>L</M>;</li>
          <li>classifies them by exposure status <em>at</em> <M>L</M>;</li>
          <li>follows them from <M>L</M> onwards.</li>
        </ol>
        <p>
          It answers a clinically natural question: “for a patient alive at 6 months, does having responded by then predict the future?” <Cite k="anderson1983" />. Its limits: results depend on <M>L</M>, which must be pre-specified and clinically motivated, and exposure changes after <M>L</M> are ignored. Report several landmarks if the choice is uncertain.
        </p>
        <ConditionalLab />
      </Section>

      <Section id="target-trial" title="Designing out immortal time: target trial emulation" kicker="Design">
        <p>
          Most immortal-time bias comes from misaligned time zero. Target trial emulation <Cite k="hernanRobins2016" /> specifies the randomised trial you would ideally run (eligibility, treatment strategies, assignment, time zero, outcome) and emulates it with observational data:
        </p>
        <ul>
          <li>Eligibility, treatment assignment and start of follow-up coincide at time zero.</li>
          <li>When treatment can start within a grace period, use “cloning, censoring and weighting”, or sequential trials, rather than classifying by future treatment.</li>
          <li>Report the estimand as for a trial: intention-to-treat analogue, or per-protocol with appropriate weighting.</li>
        </ul>
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival)
# time-dependent covariate with tmerge
td <- tmerge(base, base, id = id, death = event(fu_time, died))
td <- tmerge(td, resp, id = id, responded = tdc(resp_time))   # 0 before, 1 after response
coxph(Surv(tstart, tstop, death) ~ responded + age, data = td)
# landmark at 6 months
lm <- subset(base, fu_time > 6)
lm$resp6 <- with(lm, !is.na(resp_time) & resp_time <= 6)
coxph(Surv(fu_time - 6, died) ~ resp6 + age, data = lm)`}
          python={`from lifelines import CoxTimeVaryingFitter
from lifelines.utils import to_long_format, add_covariate_to_timeline
long = to_long_format(base, duration_col="fu_time")
long = add_covariate_to_timeline(long, resp_events, duration_col="time", id_col="id", event_col="died")
ctv = CoxTimeVaryingFitter().fit(long, id_col="id", event_col="died", start_col="start", stop_col="stop")
ctv.print_summary()`}
        />
      </Section>

      <Takeaways
        items={[
          'Never classify patients at baseline by something that happens later; that creates immortal time and spurious benefit.',
          'Code changing exposures in (start, stop] intervals so each risk set compares current exposure.',
          'A landmark analysis fixes exposure at a pre-specified time among those still at risk; it is simple but ignores later changes.',
          'Internal covariates (biomarkers) support hazard modelling but not direct survival prediction; use landmarking or joint models.',
          'Target trial emulation aligns eligibility, treatment assignment and time zero, avoiding immortal time by design.',
        ]}
      />
    </ModuleLayout>
  )
}
