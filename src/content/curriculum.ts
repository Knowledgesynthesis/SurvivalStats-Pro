import type { RefKey } from './references'

export interface ModuleMeta {
  id: string
  n: number
  part: string
  title: string
  short: string
  /** one sentence: why a working analyst needs this */
  why: string
  minutes: number
  objectives: string[]
  prereqs: string[]
  refs: RefKey[]
}

export const PARTS = ['I · Foundations', 'II · Comparing groups', 'III · Regression', 'IV · Beyond one event', 'V · Prediction'] as const

export const MODULES: ModuleMeta[] = [
  {
    id: 'foundations',
    n: 1,
    part: PARTS[0],
    title: 'Time, events and censoring',
    short: 'Foundations',
    why: 'Every later method is a way of using incomplete follow-up correctly; get the time origin or the censoring wrong and no model can rescue the analysis.',
    minutes: 35,
    objectives: [
      'Define a time-to-event outcome precisely: time origin, event, time scale and end of follow-up.',
      'Distinguish right, left and interval censoring from left truncation (delayed entry).',
      'Move fluently between S(t), f(t), h(t) and H(t), and read hazard shapes.',
      'Show with simulation why dropping or mis-coding censored patients biases results.',
      'State the independent-censoring assumption and recognise when it is implausible.',
    ],
    prereqs: ['Probability, densities and cumulative distribution functions', 'Logarithms and exponentials'],
    refs: ['clark2003', 'klein', 'collett', 'kalbfleisch'],
  },
  {
    id: 'kaplan-meier',
    n: 2,
    part: PARTS[0],
    title: 'Kaplan–Meier and Nelson–Aalen estimation',
    short: 'Kaplan–Meier',
    why: 'The Kaplan–Meier curve is the most reported figure in clinical research; you need to compute it, read its uncertainty and spot when it misleads.',
    minutes: 45,
    objectives: [
      'Compute a Kaplan–Meier estimate by hand, including tied events and censoring.',
      'Explain Greenwood’s variance and why log-log intervals behave better than “plain” ones.',
      'Report medians with confidence intervals and median follow-up by reverse Kaplan–Meier.',
      'Recognise the unreliable tail, and plot curves following current recommendations.',
      'Handle delayed entry with risk sets, and anticipate bias under informative censoring.',
    ],
    prereqs: ['Module 1'],
    refs: ['kaplanMeier', 'greenwood', 'freireich', 'schemper', 'pocock2002', 'kmunicate', 'klein'],
  },
  {
    id: 'comparing-groups',
    n: 3,
    part: PARTS[1],
    title: 'Comparing groups: log-rank, weighted tests and RMST',
    short: 'Comparing groups',
    why: 'Choosing the comparison — and the effect measure — decides what a trial can detect and what its result means.',
    minutes: 45,
    objectives: [
      'Compute and interpret the log-rank test from observed and expected events.',
      'Explain how Wilcoxon-type and Fleming–Harrington weights shift power to early or late differences.',
      'Estimate and interpret the restricted mean survival time (RMST) difference.',
      'Size a trial by the number of events (Schoenfeld) and convert events into patients.',
      'Recognise designs where the log-rank test loses power (crossing or delayed separation).',
    ],
    prereqs: ['Module 2'],
    refs: ['mantel', 'petoPeto', 'gehan', 'blandAltmanLogrank', 'roystonParmarRMST', 'uno2014', 'linMaxCombo', 'schoenfeld1983', 'freedman1982'],
  },
  {
    id: 'cox',
    n: 4,
    part: PARTS[2],
    title: 'Cox proportional hazards regression',
    short: 'Cox regression',
    why: 'The Cox model is the default regression for survival data; using it well means knowing exactly what a hazard ratio does and does not say.',
    minutes: 55,
    objectives: [
      'Write the Cox model and explain why the partial likelihood does not need the baseline hazard.',
      'Interpret coefficients as log hazard ratios, including continuous and adjusted effects.',
      'Translate hazard ratios into absolute risks and survival curves for specific patients.',
      'Explain ties (Breslow vs Efron), confidence-interval coverage and non-collapsibility.',
      'Avoid the classic misreadings of hazard ratios.',
    ],
    prereqs: ['Module 2', 'Basic regression (linear or logistic)'],
    refs: ['cox1972', 'breslow1974', 'efron1977', 'therneau', 'gail1984', 'daniel2021', 'fdaCovariate'],
  },
  {
    id: 'ph-assumption',
    n: 5,
    part: PARTS[2],
    title: 'Proportional hazards: checking it and living without it',
    short: 'Non-proportional hazards',
    why: 'Treatment effects that change over time are common (immunotherapy, surgery, screening); a single hazard ratio can then hide or invert the clinical story.',
    minutes: 45,
    objectives: [
      'Use log-minus-log plots and scaled Schoenfeld residuals to see how a hazard ratio changes over time.',
      'Interpret the Grambsch–Therneau test without over-relying on its p-value.',
      'Choose a remedy: stratification, time-varying coefficients, piecewise effects or RMST.',
      'Explain why a population hazard ratio can drift over time even when individual effects are constant.',
    ],
    prereqs: ['Module 4'],
    refs: ['schoenfeld1982', 'grambsch1994', 'stensrud2020', 'sjolander2024', 'hernan2010', 'aalen2015', 'uno2014', 'therneau'],
  },
  {
    id: 'parametric',
    n: 6,
    part: PARTS[2],
    title: 'Parametric and flexible parametric models',
    short: 'Parametric models',
    why: 'Health-economic models, smooth hazards and any extrapolation beyond follow-up require a parametric model — and a sense of how fragile extrapolation is.',
    minutes: 40,
    objectives: [
      'Match exponential, Weibull, Gompertz, log-logistic and log-normal models to hazard shapes.',
      'Contrast accelerated failure time (time ratio) and proportional hazards interpretations.',
      'Fit models by maximum likelihood to censored data and compare them with AIC/BIC.',
      'Show why models that fit the observed data equally well can extrapolate very differently.',
      'Know when to use flexible (Royston–Parmar spline) models.',
    ],
    prereqs: ['Module 1', 'Module 4 (for the PH comparison)'],
    refs: ['collett', 'latimerTSD14', 'rutherfordTSD21', 'roystonParmar2002', 'roystonLambert', 'jackson2016'],
  },
  {
    id: 'competing-risks',
    n: 7,
    part: PARTS[3],
    title: 'Competing risks',
    short: 'Competing risks',
    why: 'When another event can pre-empt the one you study, 1 − Kaplan–Meier overstates risk and a single hazard ratio can point the wrong way.',
    minutes: 50,
    objectives: [
      'Recognise competing events and why they are not independent censoring.',
      'Estimate cumulative incidence with the Aalen–Johansen estimator.',
      'Contrast cause-specific and subdistribution (Fine–Gray) hazard ratios and the questions they answer.',
      'Report a competing-risks analysis completely: all causes, both hazards, cumulative incidences.',
    ],
    prereqs: ['Modules 2 and 4'],
    refs: ['putter2007', 'austin2016', 'latouche2013', 'fineGray1999', 'gray1988', 'aalenJohansen1978', 'andersenKeiding2012', 'austin2021', 'beyersmann'],
  },
  {
    id: 'time-dependent',
    n: 8,
    part: PARTS[3],
    title: 'Time-varying exposures, immortal time and landmarking',
    short: 'Immortal time & landmarks',
    why: 'Immortal-time bias has manufactured spurious “benefits” in many observational studies; the fixes are simple once you see the mechanism.',
    minutes: 45,
    objectives: [
      'Explain how classifying patients by something that happens after time zero creates immortal time.',
      'Set up counting-process (start, stop] data for a time-varying covariate.',
      'Apply landmark analysis and know what it estimates.',
      'Distinguish external from internal time-varying covariates, and use landmarking for dynamic prediction.',
    ],
    prereqs: ['Module 4'],
    refs: ['anderson1983', 'suissa2008', 'levesque2010', 'vanHouwelingen2007', 'hernanRobins2016', 'therneau'],
  },
  {
    id: 'recurrent-events',
    n: 9,
    part: PARTS[3],
    title: 'Recurrent events',
    short: 'Recurrent events',
    why: 'Hospitalisations, exacerbations and infections recur; analysing only the first event throws away information and answers a narrower question.',
    minutes: 35,
    objectives: [
      'Estimate the mean cumulative function (expected number of events over time).',
      'Fit Andersen–Gill models with robust (clustered) standard errors.',
      'Choose between Andersen–Gill, PWP, WLW and frailty models by question.',
      'Handle death as a terminal event that stops recurrences.',
    ],
    prereqs: ['Module 4', 'Module 8 (counting-process data)'],
    refs: ['andersenGill1982', 'pwp1981', 'wlw1989', 'linWei1989', 'ghoshLin2000', 'amorim2015', 'cookLawless'],
  },
  {
    id: 'multi-state',
    n: 10,
    part: PARTS[3],
    title: 'Multi-state models',
    short: 'Multi-state models',
    why: 'Disease courses pass through intermediate states; multi-state models unify competing risks, illness–death and response–relapse in one framework.',
    minutes: 35,
    objectives: [
      'Draw the state diagram for a clinical question and name each transition hazard.',
      'Estimate state occupation probabilities with the Aalen–Johansen estimator.',
      'Explain the Markov assumption and when a clock-reset (semi-Markov) model is needed.',
    ],
    prereqs: ['Module 7'],
    refs: ['putter2007', 'aalenJohansen1978', 'andersenKeiding2012', 'mstate', 'beyersmann'],
  },
  {
    id: 'prediction',
    n: 11,
    part: PARTS[4],
    title: 'Survival prediction: discrimination, calibration and validation',
    short: 'Prediction & validation',
    why: 'A prognostic model is only useful if its predicted risks are both well-ranked and numerically right in the population where it is used.',
    minutes: 50,
    objectives: [
      'Compute and interpret Harrell’s and Uno’s C, and explain what they ignore.',
      'Assess calibration at a time horizon and with the calibration slope.',
      'Use the IPCW Brier score and the index of prediction accuracy.',
      'Plan validation and sample size, and report with TRIPOD+AI.',
    ],
    prereqs: ['Module 4'],
    refs: ['harrell1982', 'uno2011', 'graf1999', 'kattan2018', 'vanCalster2019', 'austin2020ici', 'riley2019', 'riley2024', 'roystonAltman2013', 'tripodAI', 'probastAI', 'steyerberg'],
  },
  {
    id: 'machine-learning',
    n: 12,
    part: PARTS[4],
    title: 'Machine learning for survival data',
    short: 'Machine learning',
    why: 'Penalised Cox models, survival forests and neural networks are now routine; judging them requires knowing what overfitting looks like and what the evidence shows.',
    minutes: 35,
    objectives: [
      'Demonstrate overfitting and how shrinkage (ridge/lasso) counters it.',
      'Explain random survival forests, boosting and neural survival models at a working level.',
      'Weigh the empirical evidence comparing machine learning with Cox regression.',
      'Apply the same validation and reporting standards to ML as to regression models.',
    ],
    prereqs: ['Module 11'],
    refs: ['tibshirani1997', 'simon2011', 'ishwaran2008', 'katzman2018', 'christodoulou2019', 'bhattacharya2025', 'tripodAI', 'probastAI'],
  },
]

export const moduleById = (id: string) => MODULES.find((m) => m.id === id)
