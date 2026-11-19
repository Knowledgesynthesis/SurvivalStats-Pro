import { useDeferredValue, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { M, MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { SERIES, kmSeries } from '@/components/charts/survival'
import { Resample, Slider } from '@/components/ui/controls'
import { coxph, survProbAt } from '@/lib/stats/cox'
import { kaplanMeier, survAt } from '@/lib/stats/km'
import { calibrationGroups, calibrationSlope, harrellC, ipa, unoC } from '@/lib/stats/validation'
import { simPrediction } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

function ValidationLab() {
  const [nDev, setNDev] = useState(600)
  const [shift, setShift] = useState(1)
  const [caseMix, setCaseMix] = useState(1)
  const [seed, setSeed] = useState(1)
  const horizon = 5
  const dN = useDeferredValue(nDev)
  const dS = useDeferredValue(shift)
  const dC = useDeferredValue(caseMix)
  const res = useMemo(() => {
    const dev = simPrediction(seed, dN)
    const fit = coxph({ time: dev.time, status: dev.status, x: dev.x })
    const val = simPrediction(seed + 10_000, 1500, { baseShift: dS, caseMix: dC })
    const lp = val.x.map((row) => row.reduce((s, v, j) => s + (v - fit.center[j]) * fit.beta[j], 0))
    const pS = val.x.map((row) => survProbAt(fit, row, horizon))
    const pRisk = pS.map((s) => 1 - s)
    const appC = harrellC(dev.time, dev.status, fit.linearPredictor).c
    const hc = harrellC(val.time, val.status, lp).c
    const uc = unoC(val.time, val.status, lp, 8)
    const slope = calibrationSlope(val.time, val.status, lp)
    const groups = calibrationGroups(val.time, val.status, pRisk, horizon, 10)
    const obs = 1 - survAt(kaplanMeier({ time: val.time, status: val.status }), horizon)
    const exp = pRisk.reduce((a, b) => a + b, 0) / pRisk.length
    const acc = ipa(val.time, val.status, pS, horizon)
    // KM by predicted-risk tertile
    const order = pRisk.map((_, i) => i).sort((a, b) => pRisk[a] - pRisk[b])
    const tert = [0, 1, 2].map((g) => {
      const idx = order.slice(Math.floor((g * order.length) / 3), Math.floor(((g + 1) * order.length) / 3))
      return kaplanMeier({ time: idx.map((i) => val.time[i]), status: idx.map((i) => val.status[i]) })
    })
    return { fit, appC, hc, uc, slope, groups, obs, exp, acc, tert, events: dev.status.reduce((a, b) => a + b, 0) }
  }, [dN, dS, dC, seed])
  const calSeries: Series[] = [
    { kind: 'line', id: 'ideal', label: 'Perfect calibration', color: 'var(--muted)', dashed: true, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], noTooltip: true },
    ...res.groups.map((g) => ({ kind: 'line' as const, id: `e${g.group}`, label: '95% CI', color: SERIES[0], width: 1.25, points: [{ x: g.predicted, y: g.lower }, { x: g.predicted, y: g.upper }], hideLegend: true, noTooltip: true })),
    { kind: 'scatter', id: 'grp', label: 'Risk decile (observed vs predicted)', color: SERIES[0], points: res.groups.map((g) => ({ x: g.predicted, y: g.observed })), r: 4.5, opacity: 1 },
  ]
  const maxR = Math.min(1, Math.max(0.2, ...res.groups.map((g) => Math.max(g.predicted, g.upper))) * 1.05)
  return (
    <Lab
      title="Discrimination and calibration are different things"
      goal="A Cox model with five true predictors is developed on one sample, then validated on 1,500 new patients, who may come from a population with a different baseline risk or a narrower case mix. Horizon: 5 years."
      controls={
        <>
          <Slider label="Development sample size" value={nDev} onChange={setNDev} min={100} max={3000} step={100} />
          <Slider label="Baseline hazard in validation population" value={shift} onChange={setShift} min={0.4} max={2.5} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
          <Slider label="Case-mix spread (predictor SD)" value={caseMix} onChange={setCaseMix} min={0.4} max={1.6} step={0.05} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => setSeed((s) => s + 1)} />
          </div>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Calibration at 5 years (deciles of predicted risk)</div>
          <Plot ariaLabel="Calibration plot" series={calSeries} xLabel="Predicted 5-year risk" yLabel="Observed 5-year risk (1 − KM)" xDomain={[0, maxR]} yDomain={[0, maxR]} height={240} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-sm font-medium text-ink">Validation KM by predicted-risk tertile</div>
          <Plot
            ariaLabel="Kaplan–Meier by predicted risk tertile"
            series={[...kmSeries(res.tert[0], { id: 'lo', label: 'Low risk', color: SERIES[2], censorMarks: false }), ...kmSeries(res.tert[1], { id: 'mid', label: 'Middle', color: SERIES[3], censorMarks: false }), ...kmSeries(res.tert[2], { id: 'hi', label: 'High risk', color: SERIES[7], censorMarks: false })]}
            xLabel="Years"
            yLabel="Survival"
            yDomain={[0, 1]}
            xDomain={[0, 10]}
            height={240}
          />
        </div>
      </div>
      <Table
        className="mt-4"
        head={['Measure', 'Value', 'Ideal', 'Assesses']}
        rows={[
          ['Apparent C (development)', fmt(res.appC, 3), '—', 'Optimistic: same data used to fit'],
          ['Harrell’s C (validation)', fmt(res.hc, 3), '1', 'Ranking (discrimination)'],
          ['Uno’s C, τ = 8 (validation)', fmt(res.uc, 3), '1', 'Ranking, less censoring-dependent'],
          ['Calibration slope', `${fmt(res.slope.slope, 2)} (SE ${fmt(res.slope.se, 2)})`, '1', 'Spread of predictions (< 1 = too extreme)'],
          ['Observed / expected risk at 5 y', `${fmt(res.obs, 3)} / ${fmt(res.exp, 3)} = ${fmt(res.obs / res.exp, 2)}`, '1', 'Calibration-in-the-large'],
          ['Brier score at 5 y (null model)', `${fmt(res.acc.bsModel, 3)} (${fmt(res.acc.bsNull, 3)})`, '0', 'Overall accuracy (IPCW)'],
          ['Index of prediction accuracy', fmt(res.acc.ipa, 3), '1 (0 = no better than null)', 'Discrimination + calibration'],
        ]}
      />
      <div className="mt-1">
        <TryThis
          items={[
            { do: 'Double the baseline hazard in the validation population (2×). What happens to C, and to calibration?', see: 'C barely moves, because rankings are unchanged, but observed risks lie well above predicted: O/E ≫ 1 and the deciles sit above the diagonal. A model can rank perfectly and still give wrong risks. Recalibrate the baseline before use in a new setting.' },
            { do: 'Narrow the case mix (SD 0.5) without changing anything else.', see: 'C falls substantially although the model is exactly right. Discrimination depends on how heterogeneous the population is, so a C-index is not a fixed property of a model.' },
            { do: 'Use a development sample of 100.', see: 'The apparent C is optimistic, and the calibration slope drops below 1: predictions are too extreme. This is classic overfitting, which shrinkage or larger samples fix (Module 12).' },
          ]}
        />
      </div>
    </Lab>
  )
}

export default function Prediction() {
  return (
    <ModuleLayout id="prediction">
      <Section id="goal" title="What a survival prediction model must deliver" kicker="Purpose">
        <p>
          A prognostic model predicts an individual’s absolute risk by a horizon, <M>{'\\hat F(t^*\\mid x)=1-\\hat S(t^*\\mid x)'}</M>, to support decisions. Its usefulness has three components <Cite k="steyerberg" />:
        </p>
        <ul>
          <li>
            <strong>Discrimination</strong>: do patients who have the event earlier get higher predicted risks?
          </li>
          <li>
            <strong>Calibration</strong>: among patients predicted 20%, do about 20% have the event by <M>{'t^*'}</M>? This is the “Achilles heel” of prediction <Cite k="vanCalster2019" />.
          </li>
          <li>
            <strong>Clinical utility</strong>: does using the model lead to better decisions than the alternatives? Decision-curve analysis (net benefit) addresses this.
          </li>
        </ul>
        <MythFact myth="“The model has C = 0.80, so it is ready for clinical use.”" fact="C says nothing about whether predicted risks are numerically right, and depends on case mix. Report calibration (plot, slope, O/E) at clinically relevant horizons, and validate in the target population." />
      </Section>

      <Section id="discrimination" title="Concordance: Harrell’s and Uno’s C" kicker="Discrimination">
        <MathBlock tex={String.raw`C=P\{\hat\eta_i>\hat\eta_j\mid T_i<T_j\},\qquad \hat C_{\text{Harrell}}=\frac{\#\text{concordant}+\tfrac12\#\text{tied risk}}{\#\text{usable pairs}}`} caption={<>A pair is usable if the shorter time is an event. Harrell’s C <Cite k="harrell1982" /> depends on the censoring pattern. Uno’s C <Cite k="uno2011" /> reweights pairs by the inverse squared censoring survival and truncates at τ, giving a censoring-independent target. Time-dependent AUC at a horizon is another option.</>} />
      </Section>

      <Section id="calibration" title="Calibration and overall accuracy" kicker="Lab">
        <p>Calibration is assessed at a horizon <M>{'t^*'}</M>, in increasing order of stringency:</p>
        <ul>
          <li>
            <strong>Calibration-in-the-large</strong>: observed risk (1 − KM) against mean predicted risk.
          </li>
          <li>
            <strong>Calibration slope</strong>: the coefficient of the linear predictor in a Cox model fitted on validation data. A slope below 1 means predictions are too extreme (overfitting); above 1, too modest.
          </li>
          <li>
            <strong>Calibration curve</strong>: observed against predicted across the risk range. Smooth curves (hazard regression, or pseudo-observations with splines) are preferred to deciles, and the integrated calibration index (ICI) summarises them <Cite k="austin2020ici" />.
          </li>
        </ul>
        <MathBlock tex={String.raw`\mathrm{BS}(t)=\frac1n\sum_i\left[\frac{\hat S(t\mid x_i)^2\,\mathbb 1(T_i\le t,\delta_i=1)}{\hat G(T_i^-)}+\frac{\{1-\hat S(t\mid x_i)\}^2\,\mathbb 1(T_i>t)}{\hat G(t)}\right],\qquad \mathrm{IPA}=1-\frac{\mathrm{BS}_{\text{model}}}{\mathrm{BS}_{\text{null}}}`} caption={<>The IPCW Brier score <Cite k="graf1999" /> weights observed outcomes by the inverse probability of remaining uncensored, Ĝ. IPA <Cite k="kattan2018" /> scales it against a no-covariate model, so 0 means no better than the overall KM.</>} />
        <ValidationLab />
      </Section>

      <Section id="validation" title="Validation, sample size and reporting" kicker="Practice">
        <Table
          head={['Step', 'Recommendation']}
          rows={[
            ['Sample size for development', 'Calculate it (Riley et al. criteria: small overfitting, precise baseline risk and R²). The “10 events per variable” rule is not sufficient (pmsampsize).'],
            ['Internal validation', 'Bootstrap the whole modelling process (including variable selection) to estimate optimism; avoid single random splits in small data.'],
            ['External validation', 'New data from the intended setting; report C, calibration plot/slope/O/E at fixed horizons, and net benefit; plan its size too.'],
            ['Updating', 'If miscalibrated: recalibrate the baseline hazard (intercept), then the slope, before refitting.'],
            ['Competing risks', 'Predict the CIF (Fine–Gray or cause-specific models), not 1 − KM; validate against the Aalen–Johansen estimate.'],
            ['Reporting & appraisal', 'TRIPOD+AI (2024) for reporting; PROBAST+AI (2025) for risk of bias.'],
          ]}
        />
        <p>
          References: <Cite k="riley2019" /> <Cite k="riley2024" /> <Cite k="roystonAltman2013" /> <Cite k="tripodAI" /> <Cite k="probastAI" /> <Cite k="wolbers2009" />.
        </p>
        <Callout kind="practice" title="Publishing a usable model">
          Report the full model: coefficients <em>and</em> the baseline survival at the prediction horizon, <M>{'S_0(t^*)'}</M> (with the covariate centring used). Without the baseline, nobody can compute an absolute risk or validate calibration.
        </Callout>
        <Quiz q={{ id: 'pred-inline-1', stem: 'A model developed in a trial population is applied to routine care, where everyone’s 5-year risk is truly 1.5 times higher. The quickest fix that preserves discrimination is…', options: ['Recalibrate the baseline survival (or intercept) in local data', 'Refit all coefficients from scratch', 'Use a different C-statistic', 'Add more predictors'], answer: 0, why: 'A uniform baseline shift does not change rankings. Updating $S_0(t^*)$ restores calibration-in-the-large with little data. Re-estimating the slope or the coefficients needs progressively more data.' }} />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(survival); library(riskRegression)
fit <- coxph(Surv(time, status) ~ x1 + x2 + x3, data = dev, x = TRUE)
concordance(fit, newdata = val)                                    # Harrell's C
concordance(fit, newdata = val, timewt = "n/G2", ymax = 8)         # Uno-type C
sc <- Score(list(cox = fit), Surv(time, status) ~ 1, data = val, times = 5,
            metrics = c("auc", "brier"), summary = "ipa", plots = "calibration")
plotCalibration(sc)
val$lp <- predict(fit, newdata = val, type = "lp")
coxph(Surv(time, status) ~ lp, data = val)                         # calibration slope
# sample size: pmsampsize::pmsampsize(type = "s", ...)`}
          python={`from sksurv.metrics import concordance_index_censored, concordance_index_ipcw, brier_score
from sksurv.util import Surv
y_tr = Surv.from_arrays(dev["status"].astype(bool), dev["time"])
y_va = Surv.from_arrays(val["status"].astype(bool), val["time"])
concordance_index_censored(y_va["event"], y_va["time"], risk)      # Harrell
concordance_index_ipcw(y_tr, y_va, risk, tau=8)                    # Uno
brier_score(y_tr, y_va, surv_prob_at_5y, times=[5])`}
        />
      </Section>

      <Takeaways
        items={[
          'A prediction model must discriminate and be calibrated in the population of use; check both at clinically relevant horizons.',
          'C depends only on ranks and on case mix; a shifted baseline leaves C intact while ruining calibration.',
          'Use calibration slope, O/E and calibration curves; summarise accuracy with the IPCW Brier score and IPA.',
          'Plan sample size formally, validate internally with the bootstrap and externally in new data, and recalibrate before refitting.',
          'Report with TRIPOD+AI, including the baseline survival at the horizon.',
        ]}
      />
    </ModuleLayout>
  )
}
