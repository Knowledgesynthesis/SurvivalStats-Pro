import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CheckCircle2, ChevronLeft, RotateCcw, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/controls'
import { moduleById } from '@/content/curriculum'

interface QNode {
  kind: 'q'
  q: string
  help?: string
  options: { label: string; hint?: string; next: string }[]
}
interface Leaf {
  kind: 'leaf'
  title: string
  estimate: string[]
  report: string[]
  pitfalls: string[]
  modules: string[]
}

const TREE: Record<string, QNode | Leaf> = {
  start: {
    kind: 'q',
    q: 'What ends (or recurs during) follow-up?',
    help: 'Think about every event that can happen to a patient after time zero.',
    options: [
      { label: 'One kind of event; censoring is the only other way follow-up ends', next: 'tdc' },
      { label: 'Another event can occur first and prevent the event of interest', hint: 'e.g., death before relapse', next: 'cr' },
      { label: 'The same event can happen repeatedly', hint: 'hospitalisations, infections', next: 'rec' },
      { label: 'Patients pass through intermediate states', hint: 'response → progression → death', next: 'ms' },
    ],
  },
  tdc: {
    kind: 'q',
    q: 'Is any exposure or group defined by something that happens after time zero?',
    help: 'e.g., “responders”, “patients who received a transplant”, “ever users of a drug”.',
    options: [
      { label: 'Yes', next: 'leaf-td' },
      { label: 'No, groups and covariates are fixed at time zero', next: 'goal' },
    ],
  },
  goal: {
    kind: 'q',
    q: 'What is the main goal?',
    options: [
      { label: 'Describe survival in one group', next: 'leaf-km' },
      { label: 'Compare groups (e.g., randomised arms)', next: 'ph' },
      { label: 'Estimate adjusted effects of several covariates', next: 'leaf-cox' },
      { label: 'Predict an individual’s risk', next: 'leaf-pred' },
      { label: 'Extrapolate beyond follow-up (e.g., economic model)', next: 'leaf-param' },
    ],
  },
  ph: {
    kind: 'q',
    q: 'Is it plausible that the treatment effect is roughly constant over time?',
    help: 'Delayed effects (immunotherapy), early harms (surgery) or waning effects argue against it.',
    options: [
      { label: 'Yes, proportional hazards is plausible', next: 'leaf-compare-ph' },
      { label: 'No, or unsure', next: 'leaf-compare-nph' },
    ],
  },
  cr: {
    kind: 'q',
    q: 'What question about the event of interest?',
    options: [
      { label: 'Absolute risk: how many will have it by time t?', next: 'leaf-cr-risk' },
      { label: 'Aetiology: does the exposure change its rate among those still at risk?', next: 'leaf-cr-cause' },
    ],
  },
  rec: {
    kind: 'q',
    q: 'Can death (or another terminal event) stop the recurrences?',
    options: [
      { label: 'No, or very rarely', next: 'leaf-rec' },
      { label: 'Yes, and it is related to the recurrences', next: 'leaf-rec-term' },
    ],
  },
  ms: { kind: 'leaf', title: 'Multi-state model', estimate: ['State occupation probabilities (Aalen–Johansen)', 'Transition-specific Cox models for each arrow', 'Expected time in each state up to a horizon'], report: ['State diagram with observed transition counts', 'Stacked state-occupation plot by group', 'Transition-specific HRs with CIs'], pitfalls: ['Too few transitions on some arrows: merge states', 'Markov assumption: check clock-reset alternatives', 'Partitioned-survival shortcuts hide the structure'], modules: ['multi-state', 'competing-risks'] },
  'leaf-td': { kind: 'leaf', title: 'Time-varying exposure: avoid immortal time', estimate: ['Time-dependent Cox model with (start, stop] data', 'Landmark analysis at a pre-specified, clinically motivated time', 'Target trial emulation (cloning–censoring–weighting) for causal questions'], report: ['How and when exposure status was defined', 'Landmark time(s) and number at risk at each', 'Sensitivity to the landmark choice'], pitfalls: ['Classifying patients at baseline by future exposure', 'Time interactions built from final follow-up time', 'Time-varying confounding affected by prior treatment (needs g-methods)'], modules: ['time-dependent'] },
  'leaf-km': { kind: 'leaf', title: 'Kaplan–Meier description', estimate: ['KM curve with log-log (or log) pointwise 95% CIs', 'Median with CI; milestone survival at pre-specified times', 'Median follow-up by reverse KM', 'RMST to a pre-specified τ'], report: ['Numbers at risk (and censored/events) under the plot', 'CI scale used', 'Handling of delayed entry if present'], pitfalls: ['Dropping or mis-coding censored patients', 'Over-reading the tail where few remain at risk', 'Ignoring left truncation', 'Informative censoring'], modules: ['kaplan-meier', 'foundations'] },
  'leaf-compare-ph': { kind: 'leaf', title: 'Group comparison under proportional hazards', estimate: ['Log-rank test (stratified by design factors)', 'Cox HR with 95% CI (adjust for strong prognostic factors for precision)', 'Absolute differences: milestone survival, RMST'], report: ['KM curves by group with numbers at risk', 'HR and absolute effect measures', 'Diagnostics: scaled Schoenfeld plot'], pitfalls: ['Reading the HR as a risk ratio', 'Adjusted vs unadjusted HR (non-collapsibility): say which', 'Post-hoc choice of test or time point'], modules: ['comparing-groups', 'cox', 'ph-assumption'] },
  'leaf-compare-nph': { kind: 'leaf', title: 'Group comparison when hazards may not be proportional', estimate: ['RMST difference to a pre-specified τ (primary or key secondary)', 'Pre-specified weighted log-rank (FH) or MaxCombo test', 'Piecewise HRs or β(t); milestone differences'], report: ['KM curves with CIs and numbers at risk', 'Estimates at several time points, not a single HR', 'The pre-specification of τ and the test'], pitfalls: ['Choosing the weighting after seeing the curves', 'A single average HR hiding crossing effects', 'Interpreting late HRs causally (selection by survival)'], modules: ['comparing-groups', 'ph-assumption'] },
  'leaf-cox': { kind: 'leaf', title: 'Cox regression', estimate: ['Cox model with Efron ties; splines for continuous covariates', 'HRs with 95% CIs per meaningful unit', 'Predicted survival curves for representative patients'], report: ['Number of events and parameters', 'PH and functional-form checks', 'Absolute risks, not only HRs'], pitfalls: ['Too many parameters for the events', 'Non-proportional hazards ignored', 'Treating HRs as risk ratios or as causal per-period effects'], modules: ['cox', 'ph-assumption'] },
  'leaf-pred': { kind: 'leaf', title: 'Clinical prediction model', estimate: ['Cox or flexible parametric model (penalised if needed); CIF models if competing risks', 'Predicted absolute risk at clinically relevant horizons', 'Internal validation by bootstrap; external validation'], report: ['TRIPOD+AI checklist; full model incl. baseline survival at the horizon', 'C (Harrell/Uno), calibration plot, slope and O/E, Brier/IPA', 'Sample-size justification (Riley criteria)'], pitfalls: ['Judging by C alone', 'Ignoring competing risks (1 − KM targets)', 'Optimism from tuning on the evaluation data'], modules: ['prediction', 'machine-learning'] },
  'leaf-param': { kind: 'leaf', title: 'Parametric / flexible parametric modelling', estimate: ['Standard families (exp, Weibull, Gompertz, log-logistic, log-normal, generalised gamma)', 'Royston–Parmar spline models; cure or relative-survival models if a plateau is plausible', 'Mean survival / life-years over the horizon'], report: ['Fit vs KM, AIC/BIC, implied hazards', 'Clinical and external justification for the extrapolation', 'Scenario analyses across plausible models'], pitfalls: ['Choosing the extrapolation by AIC alone', 'Ignoring background mortality', 'Immature data'], modules: ['parametric'] },
  'leaf-cr-risk': { kind: 'leaf', title: 'Competing risks: absolute risk', estimate: ['Aalen–Johansen cumulative incidence for every cause', 'Fine–Gray model, or combined cause-specific models, for covariate-specific risk', 'Gray’s test to compare CIFs'], report: ['Stacked CIFs with event-free survival', 'Subdistribution and cause-specific HRs for all causes'], pitfalls: ['1 − KM with competing events censored', 'Interpreting the sHR as a rate ratio', 'Per-cause Fine–Gray models summing above 1'], modules: ['competing-risks'] },
  'leaf-cr-cause': { kind: 'leaf', title: 'Competing risks: aetiology', estimate: ['Cause-specific Cox model for each cause (competing events censored)', 'CIFs to show the net absolute consequences'], report: ['Cause-specific HRs for every cause', 'CIFs by group'], pitfalls: ['Reporting only the cause of interest', 'Assuming independence of causes to estimate “net” survival'], modules: ['competing-risks'] },
  'leaf-rec': { kind: 'leaf', title: 'Recurrent events', estimate: ['Mean cumulative function by group', 'Andersen–Gill (rate ratio) with robust SE, or negative binomial for counts', 'PWP or WLW for event-specific questions'], report: ['Events per patient distribution', 'Rate ratio with robust CI', 'Time to first event as a secondary analysis'], pitfalls: ['Naive SEs', 'Using only first events when burden matters'], modules: ['recurrent-events'] },
  'leaf-rec-term': { kind: 'leaf', title: 'Recurrent events with a terminal event', estimate: ['Ghosh–Lin mean number of events accounting for death', 'Joint frailty models or composite endpoints (recurrent + death)', 'Separate analysis of the terminal event'], report: ['Effects on both recurrences and death', 'The estimand for death (composite, while-alive, hypothetical)'], pitfalls: ['Censoring at death (hypothetical world)', 'Interpreting fewer events as benefit when patients die sooner'], modules: ['recurrent-events', 'competing-risks'] },
}

export default function ChoosePage() {
  const [path, setPath] = useState<{ node: string; label?: string }[]>([{ node: 'start' }])
  const cur = TREE[path[path.length - 1].node]
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-24 pt-8 sm:px-6">
      <PageHeader kicker="Decision guide" title="Which method do I need?">
        Answer a few questions about your data and question. You get the estimators to use, what to report, the classic traps, and the modules that teach each one.
      </PageHeader>
      {path.length > 1 && (
        <ol className="mb-4 space-y-1 text-sm text-ink-2">
          {path.slice(1).map((p, k) => (
            <li key={k} className="flex gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent-ink" />
              {p.label}
            </li>
          ))}
        </ol>
      )}
      {cur.kind === 'q' ? (
        <div className="rounded-2xl border border-line bg-surface p-5 fade-up" key={path.length}>
          <div className="text-lg font-semibold text-ink">{cur.q}</div>
          {cur.help && <p className="mt-1 text-sm text-ink-2">{cur.help}</p>}
          <div className="mt-4 space-y-2">
            {cur.options.map((o) => (
              <button key={o.label} type="button" onClick={() => setPath((p) => [...p, { node: o.next, label: o.label }])} className="group flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-accent/60 hover:bg-accent/[0.04]">
                <span className="flex-1">
                  <span className="block text-ink">{o.label}</span>
                  {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
                </span>
                <ArrowRight size={16} className="text-muted group-hover:text-accent-ink" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-accent/40 bg-surface p-5 fade-up" key={path.length}>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-ink">Recommended approach</div>
          <div className="mt-1 text-xl font-semibold text-ink">{cur.title}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-semibold text-ink">Estimate</div>
              <ul className="space-y-1 text-sm text-ink">
                {cur.estimate.map((e) => (
                  <li key={e} className="flex gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-good" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-sm font-semibold text-ink">Report</div>
              <ul className="space-y-1 text-sm text-ink">
                {cur.report.map((e) => (
                  <li key={e} className="flex gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent-ink" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 text-sm font-semibold text-ink">Watch out for</div>
            <ul className="space-y-1 text-sm text-ink">
              {cur.pitfalls.map((e) => (
                <li key={e} className="flex gap-2">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warn-ink" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {cur.modules.map((id) => {
              const m = moduleById(id)!
              return (
                <Link key={id} to={`/learn/${id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:brightness-110">
                  Module {m.n}: {m.short} <ArrowRight size={14} />
                </Link>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {path.length > 1 && (
          <Button variant="outline" onClick={() => setPath((p) => p.slice(0, -1))}>
            <ChevronLeft size={14} /> Back
          </Button>
        )}
        {path.length > 1 && (
          <Button variant="ghost" onClick={() => setPath([{ node: 'start' }])}>
            <RotateCcw size={14} /> Start over
          </Button>
        )}
      </div>
    </div>
  )
}
