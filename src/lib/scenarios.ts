/**
 * Data-generating mechanisms for the labs. Each returns the simulated data together with
 * the exact truth it was generated from, so every estimate on screen can be compared with
 * the value it is supposed to estimate.
 */
import { mulberry32, rbern, rexp, rgamma, rnorm, runif } from './stats/random'
import { piecewiseCumHaz, samplePiecewiseExp, sampleWeibull, roundTo } from './stats/simulate'

export const LN2 = Math.log(2)

// ---------------- single sample with censoring ----------------
export interface SingleSample {
  time: number[]
  status: number[]
  trueSurv: (t: number) => number
}

/** Exponential survival with a given median; random exponential dropout tuned to a target censored share; admin censoring at `followUp`. */
export function simSingle(seed: number, n: number, median: number, censorShare: number, followUp: number, shape = 1): SingleSample {
  const rng = mulberry32(seed)
  const scale = median / Math.pow(LN2, 1 / shape)
  // approximate dropout rate for the target share before admin censoring (exponential approx)
  const rate = LN2 / median
  const drop = censorShare > 0 ? (rate * censorShare) / Math.max(1e-6, 1 - censorShare) : 0
  const time: number[] = []
  const status: number[] = []
  for (let i = 0; i < n; i++) {
    const T = sampleWeibull(rng, shape, scale)
    const C = Math.min(drop > 0 ? rexp(rng, drop) : Infinity, followUp)
    time.push(roundTo(Math.max(0.01, Math.min(T, C)), 2))
    status.push(T <= C ? 1 : 0)
  }
  return { time, status, trueSurv: (t) => Math.exp(-Math.pow(t / scale, shape)) }
}

// ---------------- informative censoring ----------------
/** Two latent risk groups; dropout hazard depends on risk group by factor `dependence` (1 = independent). */
export function simInformative(seed: number, n: number, dependence: number) {
  const rng = mulberry32(seed)
  const pFrail = 0.4
  const lamLow = 0.03
  const lamHigh = 0.15
  const baseDrop = 0.03
  const time: number[] = []
  const status: number[] = []
  for (let i = 0; i < n; i++) {
    const frail = rbern(rng, pFrail)
    const T = rexp(rng, frail ? lamHigh : lamLow)
    // frail patients drop out `dependence` times faster, robust ones 1/dependence times
    const C = Math.min(rexp(rng, baseDrop * (frail ? dependence : 1 / dependence)), 36)
    time.push(roundTo(Math.max(0.01, Math.min(T, C)), 2))
    status.push(T <= C ? 1 : 0)
  }
  return { time, status, trueSurv: (t: number) => pFrail * Math.exp(-lamHigh * t) + (1 - pFrail) * Math.exp(-lamLow * t) }
}

// ---------------- delayed entry ----------------
/** Weibull (falling hazard) from diagnosis; enrolment uniformly within `maxEntry`; only those alive at entry are seen. */
export function simDelayedEntry(seed: number, n: number, maxEntry: number) {
  const rng = mulberry32(seed)
  const shape = 0.7
  const scale = 30
  const entry: number[] = []
  const time: number[] = []
  const status: number[] = []
  let screened = 0
  while (time.length < n && screened < n * 50) {
    screened++
    const T = sampleWeibull(rng, shape, scale)
    const A = runif(rng, 0, maxEntry)
    if (T <= A) continue // died before enrolment: never observed
    const C = A + 48
    entry.push(roundTo(A, 2))
    time.push(roundTo(Math.min(T, C), 2))
    status.push(T <= C ? 1 : 0)
  }
  for (let i = 0; i < time.length; i++) if (time[i] <= entry[i]) time[i] = roundTo(entry[i] + 0.01, 2)
  return { entry, time, status, screened, trueSurv: (t: number) => Math.exp(-Math.pow(t / scale, shape)) }
}

// ---------------- two-arm trials with (non-)proportional hazards ----------------
export type Shape2 = 'ph' | 'delayed' | 'crossing' | 'waning'

export interface ArmSpec {
  cuts: number[]
  rates: number[]
}

/** Piecewise-exponential hazards for control and treatment in four canonical scenarios. */
export function twoArmSpec(shape: Shape2, medianControl: number, hr: number, change: number): { control: ArmSpec; treat: ArmSpec; label: string } {
  const lc = LN2 / medianControl
  const control = { cuts: [0], rates: [lc] }
  switch (shape) {
    case 'ph':
      return { control, treat: { cuts: [0], rates: [lc * hr] }, label: `Proportional hazards: HR = ${hr.toFixed(2)} throughout` }
    case 'delayed':
      return { control, treat: { cuts: [0, change], rates: [lc, lc * hr] }, label: `Delayed effect: HR = 1 until ${change}, then ${hr.toFixed(2)}` }
    case 'waning':
      return { control, treat: { cuts: [0, change], rates: [lc * hr, lc] }, label: `Waning effect: HR = ${hr.toFixed(2)} until ${change}, then 1` }
    case 'crossing':
      return { control, treat: { cuts: [0, change], rates: [lc / hr, lc * hr] }, label: `Crossing: HR = ${(1 / hr).toFixed(2)} until ${change}, then ${hr.toFixed(2)}` }
  }
}

export function simTwoArm(seed: number, nPerArm: number, spec: { control: ArmSpec; treat: ArmSpec }, followUp: number, accrual = 0, dropout = 0) {
  const rng = mulberry32(seed)
  const time: number[] = []
  const status: number[] = []
  const group: number[] = []
  for (const [g, arm] of [[0, spec.control], [1, spec.treat]] as const) {
    for (let i = 0; i < nPerArm; i++) {
      const T = samplePiecewiseExp(rng, arm.cuts, arm.rates)
      const entry = accrual > 0 ? runif(rng, 0, accrual) : 0
      const C = Math.min(followUp - entry, dropout > 0 ? rexp(rng, dropout) : Infinity)
      time.push(roundTo(Math.max(0.01, Math.min(T, C)), 2))
      status.push(T <= C ? 1 : 0)
      group.push(g)
    }
  }
  const trueSurv = (arm: ArmSpec) => (t: number) => Math.exp(-piecewiseCumHaz(t, arm.cuts, arm.rates))
  return { time, status, group, trueControl: trueSurv(spec.control), trueTreat: trueSurv(spec.treat) }
}

// ---------------- Cox regression trial ----------------
export interface CoxSim {
  time: number[]
  status: number[]
  trt: number[]
  age: number[]
  marker: number[]
  /** true survival for a covariate profile */
  trueSurv: (t: number, trt: number, age: number, marker: number) => number
}

/** Weibull baseline (shape 1.2, median 24 months at trt=0, age=60, marker=0) with PH effects. */
export function simCoxTrial(seed: number, n: number, hrTrt: number, hrAge10: number, hrMarker: number, followUp = 48, dropout = 0.01): CoxSim {
  const rng = mulberry32(seed)
  const shape = 1.2
  const scale = 24 / Math.pow(LN2, 1 / shape)
  const bT = Math.log(hrTrt)
  const bA = Math.log(hrAge10) / 10
  const bM = Math.log(hrMarker)
  const out: CoxSim = {
    time: [],
    status: [],
    trt: [],
    age: [],
    marker: [],
    trueSurv: (t, trt, age, marker) => Math.exp(-Math.pow(t / scale, shape) * Math.exp(bT * trt + bA * (age - 60) + bM * marker)),
  }
  for (let i = 0; i < n; i++) {
    const trt = i % 2
    const age = Math.round(Math.min(90, Math.max(30, rnorm(rng, 62, 10))))
    const marker = roundTo(rnorm(rng), 2)
    const lp = bT * trt + bA * (age - 60) + bM * marker
    const T = scale * Math.pow(-Math.log(rng()) / Math.exp(lp), 1 / shape)
    const C = Math.min(runif(rng, followUp * 0.5, followUp), dropout > 0 ? rexp(rng, dropout) : Infinity)
    out.time.push(roundTo(Math.max(0.01, Math.min(T, C)), 2))
    out.status.push(T <= C ? 1 : 0)
    out.trt.push(trt)
    out.age.push(age)
    out.marker.push(marker)
  }
  return out
}

// ---------------- competing risks ----------------
/** Constant cause-specific hazards; treatment multiplies them by csHR1 and csHR2. */
export function simCompeting(seed: number, n: number, lam1: number, lam2: number, csHR1: number, csHR2: number, censorRate = 0.02, followUp = 60) {
  const rng = mulberry32(seed)
  const time: number[] = []
  const cause: number[] = []
  const trt: number[] = []
  for (let i = 0; i < n; i++) {
    const g = i % 2
    const l1 = lam1 * (g ? csHR1 : 1)
    const l2 = lam2 * (g ? csHR2 : 1)
    const T = rexp(rng, l1 + l2)
    const c = rng() < l1 / (l1 + l2) ? 1 : 2
    const C = Math.min(censorRate > 0 ? rexp(rng, censorRate) : Infinity, followUp)
    time.push(roundTo(Math.max(0.01, Math.min(T, C)), 2))
    cause.push(T <= C ? c : 0)
    trt.push(g)
  }
  /** exact CIF for cause k in arm g */
  const trueCIF = (k: 1 | 2, g: 0 | 1) => (t: number) => {
    const l1 = lam1 * (g ? csHR1 : 1)
    const l2 = lam2 * (g ? csHR2 : 1)
    const l = l1 + l2
    return ((k === 1 ? l1 : l2) / l) * (1 - Math.exp(-l * t))
  }
  return { time, cause, trt, trueCIF }
}

// ---------------- immortal time ----------------
/**
 * Death hazard λ; "response" occurs at an exponential time with rate μ if before death.
 * After response, the death hazard is multiplied by `trueHR` (1 = response does nothing).
 */
export function simImmortal(seed: number, n: number, trueHR: number, mu = 0.15, lam = 0.05, followUp = 36) {
  const rng = mulberry32(seed)
  const rows: { id: number; R: number; T: number; C: number; status: number; time: number; responded: number }[] = []
  for (let i = 0; i < n; i++) {
    const R = rexp(rng, mu)
    let T = rexp(rng, lam)
    if (R < T) {
      // remaining time after response scaled by the post-response hazard ratio
      T = R + (T - R) / trueHR
    }
    const C = Math.min(followUp, runif(rng, followUp * 0.6, followUp * 1.4))
    const time = roundTo(Math.max(0.01, Math.min(T, C)), 2)
    const responded = R < Math.min(T, C) ? 1 : 0
    rows.push({ id: i, R: roundTo(R, 2), T, C, status: T <= C ? 1 : 0, time, responded })
  }
  return rows
}

// ---------------- recurrent events ----------------
export function simRecurrent(seed: number, n: number, baseRate: number, rateRatio: number, frailtyVar: number, followUp: number) {
  const rng = mulberry32(seed)
  const rows: { id: number; start: number; stop: number; status: number; trt: number; k: number }[] = []
  const counts: number[] = []
  for (let i = 0; i < n; i++) {
    const trt = i % 2
    const z = frailtyVar > 0 ? rgamma(rng, 1 / frailtyVar, frailtyVar) : 1
    const fu = runif(rng, followUp * 0.5, followUp)
    const rate = baseRate * z * (trt ? rateRatio : 1)
    let t = 0
    let k = 0
    for (;;) {
      const next = t + rexp(rng, rate)
      if (next >= fu) {
        rows.push({ id: i, start: roundTo(t, 3), stop: roundTo(fu, 3), status: 0, trt, k: k + 1 })
        break
      }
      k++
      rows.push({ id: i, start: roundTo(t, 3), stop: roundTo(next, 3), status: 1, trt, k })
      t = next
      if (k > 60) break
    }
    counts.push(k)
  }
  return { rows: rows.filter((r) => r.stop > r.start), counts }
}

// ---------------- illness–death ----------------
export function simIllnessDeath(seed: number, n: number, a01: number, a02: number, a12: number, followUp: number) {
  const rng = mulberry32(seed)
  const intervals: { id: number; start: number; stop: number; from: number; to: number | null }[] = []
  for (let i = 0; i < n; i++) {
    const C = runif(rng, followUp * 0.6, followUp)
    const t1 = rexp(rng, a01)
    const t2 = rexp(rng, a02)
    if (Math.min(t1, t2) >= C) {
      intervals.push({ id: i, start: 0, stop: roundTo(C, 3), from: 0, to: null })
      continue
    }
    if (t2 < t1) {
      intervals.push({ id: i, start: 0, stop: roundTo(t2, 3), from: 0, to: 2 })
      continue
    }
    intervals.push({ id: i, start: 0, stop: roundTo(t1, 3), from: 0, to: 1 })
    const d = t1 + rexp(rng, a12)
    intervals.push({ id: i, start: roundTo(t1, 3), stop: roundTo(Math.min(d, C), 3), from: 1, to: d < C ? 2 : null })
  }
  return intervals.filter((r) => r.stop > r.start)
}

// ---------------- prediction model data ----------------
export interface PredSim {
  time: number[]
  status: number[]
  x: number[][]
  lpTrue: number[]
}

/**
 * Weibull PH data with `pTrue` informative predictors (β = 0.6, −0.5, 0.4, …) and `pNoise` noise predictors.
 * `baseShift` multiplies the baseline hazard (calibration-in-the-large), `caseMix` scales predictor SD.
 */
export function simPrediction(seed: number, n: number, opts: { pNoise?: number; baseShift?: number; caseMix?: number; horizon?: number } = {}): PredSim {
  const rng = mulberry32(seed)
  const betas = [0.6, -0.5, 0.4, 0.3, -0.25]
  const pNoise = opts.pNoise ?? 0
  const shift = opts.baseShift ?? 1
  const sd = opts.caseMix ?? 1
  const shape = 1.3
  const scale = 10
  const out: PredSim = { time: [], status: [], x: [], lpTrue: [] }
  for (let i = 0; i < n; i++) {
    const xt = betas.map(() => rnorm(rng, 0, sd))
    const xn = Array.from({ length: pNoise }, () => rnorm(rng))
    const lp = xt.reduce((s, v, j) => s + v * betas[j], 0)
    const T = scale * Math.pow(-Math.log(rng()) / (Math.exp(lp) * shift), 1 / shape)
    const C = Math.min(runif(rng, 4, 12), rexp(rng, 0.03))
    out.time.push(roundTo(Math.max(0.01, Math.min(T, C)), 3))
    out.status.push(T <= C ? 1 : 0)
    out.x.push([...xt, ...xn].map((v) => roundTo(v, 3)))
    out.lpTrue.push(lp)
  }
  return out
}

/** True S(t | lp) for simPrediction's generating model. */
export const predTrueSurv = (t: number, lp: number, shift = 1) => Math.exp(-Math.pow(t / 10, 1.3) * Math.exp(lp) * shift)
