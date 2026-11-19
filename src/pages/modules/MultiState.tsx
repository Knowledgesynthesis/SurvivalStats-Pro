import { useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, Quiz, Section, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type BandSeries, type Series } from '@/components/charts/Plot'
import { SERIES } from '@/components/charts/survival'
import { Resample, Slider, StatTile } from '@/components/ui/controls'
import { aalenJohansen, illnessDeathProbs } from '@/lib/stats/multistate'
import { simIllnessDeath } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

function StateDiagram({ a01, a02, a12 }: { a01?: number; a02?: number; a12?: number }) {
  const box = (x: number, y: number, label: string, sub: string, color: string) => (
    <g>
      <rect x={x} y={y} width={132} height={52} rx={12} fill="var(--surface)" stroke={color} strokeWidth={2} />
      <text x={x + 66} y={y + 23} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
        {label}
      </text>
      <text x={x + 66} y={y + 40} textAnchor="middle" fontSize={11} fill="var(--muted)">
        {sub}
      </text>
    </g>
  )
  const lab = (v: number | undefined, name: string) => (v === undefined ? name : `${name} = ${v.toFixed(2)}/yr`)
  return (
    <svg viewBox="0 0 460 210" className="mx-auto w-full max-w-[520px]" role="img" aria-label="Illness–death model state diagram">
      <defs>
        <marker id="ms-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" />
        </marker>
      </defs>
      {box(10, 79, 'Healthy', 'state 0 · start', 'var(--s1)')}
      {box(318, 10, 'Ill', 'state 1 · transient', 'var(--s4)')}
      {box(318, 148, 'Dead', 'state 2 · absorbing', 'var(--s8)')}
      <line x1={142} y1={95} x2={314} y2={44} stroke="var(--ink-2)" strokeWidth={2} markerEnd="url(#ms-arrow)" />
      <line x1={142} y1={115} x2={314} y2={168} stroke="var(--ink-2)" strokeWidth={2} markerEnd="url(#ms-arrow)" />
      <line x1={384} y1={62} x2={384} y2={144} stroke="var(--ink-2)" strokeWidth={2} markerEnd="url(#ms-arrow)" />
      <text x={214} y={56} textAnchor="middle" fontSize={12} fill="var(--ink)">
        {lab(a01, 'α₀₁')}
      </text>
      <text x={214} y={164} textAnchor="middle" fontSize={12} fill="var(--ink)">
        {lab(a02, 'α₀₂')}
      </text>
      <text x={392} y={108} fontSize={12} fill="var(--ink)">
        {lab(a12, 'α₁₂')}
      </text>
    </svg>
  )
}

function IllnessDeathLab() {
  const [a01, setA01] = useState(0.15)
  const [a02, setA02] = useState(0.05)
  const [a12, setA12] = useState(0.3)
  const [n, setN] = useState(500)
  const [seed, setSeed] = useState(3)
  const T = 10
  const rates = { a01, a02, a12 }
  const aj = useMemo(() => aalenJohansen(simIllnessDeath(seed, n, a01, a02, a12, T), 3), [seed, n, a01, a02, a12])
  const grid = Array.from({ length: 101 }, (_, i) => (i * T) / 100)
  const P = grid.map((t) => ({ t, ...illnessDeathProbs(t, rates) }))
  const stack = (id: string, label: string, color: string, lo: (p: (typeof P)[number]) => number, hi: (p: (typeof P)[number]) => number): BandSeries => ({ kind: 'band', id, label, color, opacity: 0.8, gapEdge: true, points: P.map((p) => ({ x: p.t, y0: lo(p), y1: hi(p) })) })
  const series: Series[] = [
    stack('h', 'Healthy', SERIES[0], () => 0, (p) => p.healthy),
    stack('i', 'Ill', SERIES[3], (p) => p.healthy, (p) => p.healthy + p.ill),
    stack('d1', 'Dead after illness', SERIES[7], (p) => p.healthy + p.ill, (p) => p.healthy + p.ill + p.deadAfterIllness),
    stack('d0', 'Dead without illness', SERIES[4], (p) => p.healthy + p.ill + p.deadAfterIllness, () => 1),
    { kind: 'step', id: 'ajh', label: 'Aalen–Johansen: healthy', color: 'var(--ink)', width: 1.5, points: aj.map((r) => ({ x: r.time, y: r.p[0] })) },
    { kind: 'step', id: 'aji', label: 'Aalen–Johansen: healthy + ill', color: 'var(--ink)', width: 1.5, dashed: true, points: aj.map((r) => ({ x: r.time, y: r.p[0] + r.p[1] })) },
  ]
  const at = illnessDeathProbs(5, rates)
  const yearsIn = (k: 'healthy' | 'ill') => P.slice(1).reduce((s, p, i) => s + ((p[k] + P[i][k]) / 2) * (p.t - P[i].t), 0)
  return (
    <Lab
      title="The illness–death model"
      goal="Constant transition intensities (per year). Coloured areas are the exact state-occupation probabilities; the black step lines are Aalen–Johansen estimates from a simulated, right-censored cohort."
      controls={
        <>
          <Slider label="α₀₁ healthy → ill" value={a01} onChange={setA01} min={0} max={0.5} step={0.01} />
          <Slider label="α₀₂ healthy → dead" value={a02} onChange={setA02} min={0} max={0.3} step={0.01} />
          <Slider label="α₁₂ ill → dead" value={a12} onChange={setA12} min={0} max={1} step={0.01} />
          <Slider label="Patients" value={n} onChange={setN} min={100} max={2000} step={100} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <StateDiagram a01={a01} a02={a02} a12={a12} />
      <div className="mt-3">
        <Plot ariaLabel="Stacked state occupation probabilities" series={series} xLabel="Years" yLabel="Probability" yDomain={[0, 1]} xDomain={[0, T]} height={260} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="P(healthy) at 5 y" value={fmt(at.healthy, 3)} />
        <StatTile label="P(ill, alive) at 5 y" value={fmt(at.ill, 3)} />
        <StatTile label="P(dead) at 5 y" value={fmt(at.dead, 3)} sub={`${fmt((at.deadAfterIllness / Math.max(at.dead, 1e-9)) * 100, 0)}% of deaths after illness`} />
        <StatTile label="Expected years (of 10)" value={`${fmt(yearsIn('healthy'), 1)} healthy`} sub={`${fmt(yearsIn('ill'), 1)} ill`} />
      </div>
      <div className="mt-4">
        <TryThis
          items={[
            { do: 'Set α₁₂ = α₀₂ (illness does not change mortality). Does illness still matter for P(dead)?', see: 'No. With equal death rates, total mortality is the same as if illness did not exist, yet the occupation of “ill” still matters for quality of life or costs. Multi-state models separate these.' },
            { do: 'Raise α₁₂ to 1 per year.', see: 'The ill state empties quickly, so the prevalence of living with illness stays low even though incidence is high. Prevalence = incidence × duration.' },
            { do: 'Set α₀₁ = 0.', see: 'The model reduces to ordinary survival with hazard α₀₂. Competing risks (no ill → dead arrow) and simple survival are both special cases of multi-state models.' },
          ]}
        />
      </div>
    </Lab>
  )
}

export default function MultiState() {
  return (
    <ModuleLayout id="multi-state">
      <Section id="states" title="States, transitions and intensities" kicker="Framework">
        <p>
          A multi-state model describes a patient moving between a finite set of states over time. Each allowed transition <M>{'r\\to s'}</M> has an intensity, a transition-specific hazard <Cite k="putter2007" />:
        </p>
        <MathBlock tex={String.raw`\alpha_{rs}(t)=\lim_{\Delta\to0}\frac{P\{X(t+\Delta)=s\mid X(t)=r\}}{\Delta},\qquad \alpha_{rs}(t\mid x)=\alpha_{rs,0}(t)\exp(\beta_{rs}^\top x)`} caption="Each transition can be modelled with its own Cox model, using the patients currently in state r as the risk set. The quantities patients care about, state occupation probabilities, combine all transitions." />
        <StateDiagram />
        <p>Familiar models are special cases:</p>
        <ul>
          <li>
            <strong>Survival</strong>: alive → dead.
          </li>
          <li>
            <strong>Competing risks</strong>: one initial state, several absorbing causes. The cause-specific hazards are the transition intensities.
          </li>
          <li>
            <strong>Illness–death</strong>: healthy → ill → dead, plus healthy → dead. Typical examples are relapse then death, or disability then death.
          </li>
          <li>
            <strong>Progressive models</strong>: response → progression → death, as used in oncology partitioned-survival and state-transition economic models.
          </li>
        </ul>
      </Section>

      <Section id="lab" title="State occupation probabilities" kicker="Lab">
        <MathBlock tex={String.raw`\hat{\mathbf P}(0,t)=\prod_{t_j\le t}\left\{\mathbf I+d\hat{\mathbf A}(t_j)\right\},\qquad d\hat A_{rs}(t_j)=\frac{d_{rs}(t_j)}{Y_r(t_j)}`} caption={<>The Aalen–Johansen estimator <Cite k="aalenJohansen1978" /> generalises Kaplan–Meier (two states) and the cumulative incidence function (competing risks). Our implementation matches R’s multi-state survfit exactly.</>} />
        <IllnessDeathLab />
      </Section>

      <Section id="markov" title="The Markov assumption and clock choice" kicker="Assumptions">
        <p>
          The <strong>Markov</strong> assumption says future transitions depend only on the current state and time since the origin (“clock forward”), not on how long you have been in the current state. Often that is implausible: the death risk after relapse usually depends on time since relapse.
        </p>
        <ul>
          <li>
            <strong>Semi-Markov (clock reset)</strong>: model transitions out of a state on time since entry into it.
          </li>
          <li>Include time of entry, or time spent in the previous state, as a covariate on later transitions, and test it.</li>
          <li>
            Aalen–Johansen <em>state occupation</em> probabilities from the initial state remain consistent even when the process is not Markov (Datta–Satten). Transition probabilities from intermediate states need Markov or landmark-type estimators.
          </li>
        </ul>
        <Callout kind="practice">
          Multi-state models need enough transitions of each type. Check the transition matrix of counts first, and merge sparse states or transitions where clinically justified. Report the state diagram with the number of observed transitions on each arrow.
        </Callout>
        <Quiz q={{ id: 'ms-inline-1', stem: 'Partitioned-survival models in health economics compute P(progressed and alive) as OS(t) − PFS(t). What does this implicitly ignore that a multi-state model makes explicit?', options: ['The structural link between transitions: progression and death are modelled separately, so pre- and post-progression death hazards are not estimated or constrained', 'Censoring', 'The discount rate', 'Nothing; the two approaches are identical'], answer: 0, why: 'Partitioned survival fits OS and PFS curves independently. A state-transition (multi-state) model estimates each transition, which allows checks of plausibility, extrapolation of each transition, and structural sensitivity analyses (NICE DSU TSD 19 discusses this).' }} />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival)
# data in (tstart, tstop, to_state) form, one row per sojourn
fit <- survfit(Surv(tstart, tstop, to) ~ 1, data = ms, id = id,
               istate = from)       # Aalen–Johansen; fit$pstate = occupation probabilities
plot(fit, col = 1:3)
coxph(list(Surv(tstart, tstop, to) ~ 1, 1:2 ~ age, 1:3 + 2:3 ~ trt), data = ms, id = id, istate = from)
# also: mstate (msprep, msfit, probtrans), msm (panel / interval-censored data), flexsurv::fmsm`}
          python={`# Python support is limited: lifelines AalenJohansenFitter handles competing risks only.
# For full multi-state analyses use R (survival, mstate, msm) or the 'pymsm' package.`}
        />
      </Section>

      <Takeaways
        items={[
          'Multi-state models unify survival, competing risks and illness–death; each arrow has its own hazard.',
          'State occupation probabilities combine every transition and always sum to 1.',
          'Aalen–Johansen estimates them nonparametrically and reduces to KM and the CIF as special cases.',
          'Check the Markov assumption; use clock-reset (semi-Markov) models when time in state matters.',
          'Report the state diagram with transition counts, and transition-specific effects alongside occupation probabilities.',
        ]}
      />
    </ModuleLayout>
  )
}
