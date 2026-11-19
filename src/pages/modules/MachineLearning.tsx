import { useDeferredValue, useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import { ModuleLayout } from '@/components/learn/ModuleLayout'
import { Callout, CodeTabs, Lab, MythFact, Quiz, Section, Table, Takeaways, TryThis, Cite } from '@/components/learn/blocks'
import { MathBlock } from '@/components/learn/Math'
import { Plot, type Series } from '@/components/charts/Plot'
import { SERIES } from '@/components/charts/survival'
import { Button, Resample, Slider, StatTile } from '@/components/ui/controls'
import { coxph } from '@/lib/stats/cox'
import { harrellC } from '@/lib/stats/validation'
import { simPrediction } from '@/lib/scenarios'
import { fmt } from '@/lib/utils'

const TRUE_BETA = [0.6, -0.5, 0.4, 0.3, -0.25]

function evaluate(nDev: number, pNoise: number, lambda: number, seed: number, test: ReturnType<typeof simPrediction>) {
  const dev = simPrediction(seed, nDev, { pNoise })
  const fit = coxph({ time: dev.time, status: dev.status, x: dev.x }, { ridge: lambda, maxIter: 40 })
  const lpTest = test.x.map((row) => row.slice(0, 5 + pNoise).reduce((s, v, j) => s + v * fit.beta[j], 0))
  const testC = harrellC(test.time, test.status, lpTest).c
  const slope = coxph({ time: test.time, status: test.status, x: lpTest.map((v) => [v]) }).beta[0]
  return { fit, appC: harrellC(dev.time, dev.status, fit.linearPredictor).c, testC, slope, events: dev.status.reduce((a, b) => a + b, 0) }
}

function OverfitLab() {
  const [nDev, setNDev] = useState(200)
  const [pNoise, setPNoise] = useState(20)
  const [logLam, setLogLam] = useState(-1)
  const [seed, setSeed] = useState(3)
  const [path, setPath] = useState<{ lam: number; testC: number; slope: number }[] | null>(null)
  const lambda = logLam <= -1 ? 0 : Math.pow(10, logLam)
  const test = useMemo(() => simPrediction(99_999, 3000, { pNoise: 40 }), [])
  const dN = useDeferredValue(nDev)
  const dP = useDeferredValue(pNoise)
  const dL = useDeferredValue(lambda)
  const stale = dN !== nDev || dP !== pNoise || dL !== lambda
  const r = useMemo(() => evaluate(dN, dP, dL, seed, test), [dN, dP, dL, seed, test])
  const coefSeries: Series[] = [
    { kind: 'scatter', id: 'est', label: 'Estimated β', color: SERIES[0], points: r.fit.beta.map((b, j) => ({ x: j + 1, y: b })), r: 4, opacity: 0.9 },
    { kind: 'scatter', id: 'tru', label: 'True β', color: SERIES[1], points: r.fit.beta.map((_, j) => ({ x: j + 1, y: j < 5 ? TRUE_BETA[j] : 0 })), r: 3, opacity: 0.9, hollow: true },
  ]
  const runPath = () => {
    const lams = [0, 0.3, 1, 3, 10, 30, 100, 300]
    setPath(lams.map((lam) => ({ lam, ...evaluate(nDev, pNoise, lam, seed, test) })))
  }
  return (
    <Lab
      title="Overfitting, and how shrinkage fixes it"
      goal="Five real predictors plus noise predictors with no effect. A Cox model (optionally ridge-penalised) is fitted on the development sample and judged on 3,000 new patients."
      controls={
        <>
          <Slider label="Development sample size" value={nDev} onChange={(v) => { setNDev(v); setPath(null) }} min={100} max={2000} step={50} />
          <Slider label="Noise predictors" value={pNoise} onChange={(v) => { setPNoise(v); setPath(null) }} min={0} max={40} step={1} />
          <Slider label="Ridge penalty λ" value={logLam} onChange={setLogLam} min={-1} max={2.5} step={0.1} format={() => (lambda === 0 ? '0 (ordinary Cox)' : fmt(lambda, lambda < 1 ? 2 : 1))} />
          <div className="flex items-end">
            <Resample seed={seed} onClick={() => { setSeed((s) => s + 1); setPath(null) }} />
          </div>
        </>
      }
    >
      <div className={`grid grid-cols-2 gap-2 transition-opacity sm:grid-cols-4 ${stale ? 'opacity-60' : ''}`}>
        <StatTile label="Events / parameters" value={`${r.events} / ${5 + pNoise}`} sub={`${fmt(r.events / (5 + pNoise), 1)} events per parameter`} />
        <StatTile label="Apparent C (training)" value={fmt(r.appC, 3)} />
        <StatTile label="Test C (new patients)" value={fmt(r.testC, 3)} tone={r.appC - r.testC > 0.04 ? 'bad' : 'good'} sub={`optimism ${fmt(r.appC - r.testC, 3)}`} />
        <StatTile label="Test calibration slope" value={fmt(r.slope, 2)} tone={Math.abs(r.slope - 1) > 0.15 ? 'bad' : 'good'} sub="ideal 1" />
      </div>
      <div className="mt-4">
        <div className="mb-1 text-sm font-medium text-ink">Coefficients: predictors 1–5 are real, the rest are noise</div>
        <Plot ariaLabel="Estimated and true coefficients" series={coefSeries} xLabel="Predictor" yLabel="β" height={200} xDomain={[0, 6 + pNoise]} refLines={[{ y: 0 }]} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={runPath}>
          <Play size={14} /> Sweep λ (8 fits)
        </Button>
        <span className="text-xs text-muted">In practice λ is chosen by cross-validation on the development data only.</span>
      </div>
      {path && (
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-ink">Test C across λ</div>
            <Plot ariaLabel="Test concordance by penalty" series={[{ kind: 'line', id: 'c', label: 'Test C', color: SERIES[0], points: path.map((p) => ({ x: Math.log10(p.lam + 0.1), y: p.testC })) }]} xLabel="log₁₀(λ + 0.1)" yLabel="Test C" height={170} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-sm font-medium text-ink">Test calibration slope across λ</div>
            <Plot ariaLabel="Calibration slope by penalty" series={[{ kind: 'line', id: 's', label: 'Slope', color: SERIES[1], points: path.map((p) => ({ x: Math.log10(p.lam + 0.1), y: p.slope })) }]} xLabel="log₁₀(λ + 0.1)" yLabel="Calibration slope" height={170} refLines={[{ y: 1, label: 'ideal' }]} />
          </div>
        </div>
      )}
      <div className="mt-4">
        <TryThis
          items={[
            { do: '200 patients, 20 noise predictors, no penalty. Compare apparent and test C, and the slope.', see: 'The apparent C is inflated and the test C lower. The slope is well below 1: predictions are too extreme. Noise coefficients are far from zero.' },
            { do: 'Raise λ gradually.', see: 'Coefficients shrink toward zero, the noise ones most visibly. The calibration slope moves toward 1 and test C usually improves slightly. Too much penalty over-shrinks: slope > 1 and lost discrimination.' },
            { do: 'Set 2,000 patients with no penalty.', see: 'With plenty of events per parameter, ordinary Cox regression barely overfits. Shrinkage matters most when data are scarce relative to model complexity, and the same is true of every ML method.' },
          ]}
        />
      </div>
    </Lab>
  )
}

export default function MachineLearning() {
  return (
    <ModuleLayout id="machine-learning">
      <Section id="overfitting" title="The central problem: overfitting" kicker="Lab">
        <p>
          Flexible models fit noise unless their complexity is controlled. Penalised regression controls it explicitly <Cite k="tibshirani1997" /> <Cite k="simon2011" />:
        </p>
        <MathBlock tex={String.raw`\hat\beta_\lambda=\arg\max_\beta\Big\{\ell(\beta)-\lambda\big[\alpha\|\beta\|_1+\tfrac{1-\alpha}{2}\|\beta\|_2^2\big]\Big\}`} caption="α = 0 gives ridge (shrinks all coefficients), α = 1 gives the lasso (sets some exactly to zero), and values in between give the elastic net. Standardise predictors first so that the penalty treats them equally. The lab below uses ridge, and reproduces R’s coxph(ridge()) exactly." />
        <OverfitLab />
      </Section>

      <Section id="methods" title="The main machine-learning survival methods" kicker="Overview">
        <Table
          head={['Method', 'How it handles censoring', 'Strengths', 'Watch out for']}
          rows={[
            ['Penalised Cox (lasso, ridge, elastic net)', 'Cox partial likelihood + penalty', 'Interpretable HRs, high-dimensional data (p > n)', 'Still assumes PH and linearity unless you add terms; lasso selection is unstable'],
            ['Random survival forests', 'Trees split by log-rank; Nelson–Aalen in leaves', 'Non-linearity and interactions found automatically; no PH needed', 'Needs many events; variable importance can mislead with correlated predictors; calibration often poor'],
            ['Gradient boosting (CoxBoost, XGBoost Cox/AFT)', 'Boosts Cox or AFT loss', 'Strong on tabular data with interactions', 'Many tuning parameters; risk of leakage in tuning'],
            ['Neural Cox (DeepSurv), Cox-Time', 'Network replaces the linear predictor in the partial likelihood', 'Images, text, complex inputs', 'DeepSurv keeps PH; large data needed'],
            ['Discrete-time networks (DeepHit, N-MTLR)', 'Likelihood over time bins', 'Non-PH, competing risks', 'Results depend on time discretisation; calibration'],
          ]}
        />
        <p>
          References: <Cite k="ishwaran2008" /> <Cite k="katzman2018" />.
        </p>
      </Section>

      <Section id="evidence" title="What the evidence shows" kicker="Evidence">
        <p>
          For typical clinical tabular data, flexible ML rarely beats well-specified regression. A systematic review of clinical prediction models with binary outcomes found no average discrimination benefit of ML over logistic regression <Cite k="christodoulou2019" />. A 2025 systematic review and meta-analysis of ML vs Cox regression for cancer survival prediction in real-world data found no meaningful difference: pooled standardised mean difference in C-index/AUC of 0.01 (95% CI −0.01 to 0.03) <Cite k="bhattacharya2025" />. Both reviews flagged weak reporting and inconsistent comparisons in many ML studies.
        </p>
        <MythFact myth="“A random survival forest is better than Cox because it is more flexible.”" fact="Flexibility helps only when there is signal it can capture and enough events to learn it without overfitting. Benchmark against a carefully specified Cox model (splines for continuous predictors, sensible interactions) on the same validation data, and compare calibration, not only C." />
        <Callout kind="key" title="When ML is worth trying">
          <ul>
            <li>Very large datasets (tens of thousands of events) with plausible complex interactions.</li>
            <li>Unstructured inputs (images, waveforms, text) that regression cannot use directly.</li>
            <li>High-dimensional omics, where penalised Cox is the established starting point.</li>
          </ul>
        </Callout>
      </Section>

      <Section id="rules" title="The same rules apply" kicker="Practice">
        <ul>
          <li>
            <strong>Validate honestly</strong>: tune hyperparameters inside cross-validation (nested CV), never on the test set. Bootstrap or external validation estimates optimism.
          </li>
          <li>
            <strong>Report calibration</strong> at the horizon (plot, slope, O/E) and the IPCW Brier/IPA, as in Module 11.
          </li>
          <li>
            <strong>Handle competing risks and censoring</strong> properly. Many off-the-shelf ML pipelines treat censored patients as negatives, which is the Module 1 bias.
          </li>
          <li>
            <strong>Report with TRIPOD+AI</strong> <Cite k="tripodAI" /> and appraise with PROBAST+AI <Cite k="probastAI" />. Both cover regression and AI methods.
          </li>
        </ul>
        <Quiz q={{ id: 'ml-inline-1', stem: 'A team tunes a random survival forest on 5-fold CV, picks the best fold-averaged C, and reports that C as model performance. The issue is…', options: ['Optimistic bias: the same CV results were used both to choose hyperparameters and to estimate performance; use nested CV or a separate validation set', 'No issue', 'They should have used Harrell’s C', 'Forests cannot be cross-validated'], answer: 0, why: 'Selecting the maximum over many configurations overfits the CV estimate. Nested cross-validation (tuning inside each training fold) gives an honest estimate.' }} />
      </Section>

      <Section id="code" title="In software" kicker="Practice">
        <CodeTabs
          r={`library(glmnet); library(randomForestSRC)
y <- Surv(d$time, d$status)
cv <- cv.glmnet(as.matrix(X), y, family = "cox", alpha = 1)       # lasso, lambda by CV
coef(cv, s = "lambda.1se")
rsf <- rfsrc(Surv(time, status) ~ ., data = d, ntree = 1000, importance = TRUE)
predict(rsf, newdata = val)$survival                                # predicted curves
# xgboost: objective = "survival:cox" or "survival:aft"`}
          python={`from sksurv.linear_model import CoxnetSurvivalAnalysis
from sksurv.ensemble import RandomSurvivalForest, GradientBoostingSurvivalAnalysis
from sksurv.util import Surv
y = Surv.from_arrays(d["status"].astype(bool), d["time"])
coxnet = CoxnetSurvivalAnalysis(l1_ratio=1.0).fit(X, y)
rsf = RandomSurvivalForest(n_estimators=500, min_samples_leaf=15, random_state=0).fit(X, y)
surv_fns = rsf.predict_survival_function(X_val)
# deep models: pycox (DeepSurv/CoxPH, DeepHit, Cox-Time)`}
        />
      </Section>

      <Takeaways
        items={[
          'Overfitting shows as an apparent-vs-test performance gap and a calibration slope below 1; shrinkage counters it.',
          'Penalised Cox, survival forests, boosting and neural models differ in what they assume and in how much data they need.',
          'Current evidence shows no average advantage of ML over well-specified Cox models for clinical tabular data.',
          'Tune inside cross-validation, report calibration, handle censoring and competing risks correctly.',
          'Apply TRIPOD+AI and PROBAST+AI to ML models exactly as to regression.',
        ]}
      />
    </ModuleLayout>
  )
}

