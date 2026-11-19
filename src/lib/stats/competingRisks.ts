/**
 * Competing risks: Aalen–Johansen cumulative incidence, the naive 1 − KM (for contrast),
 * cause-specific Cox and the Fine–Gray subdistribution hazard model.
 *
 * Fine–Gray follows R survival::finegray: subjects with a competing event stay in the risk
 * set after their event with weight Ĝ(t−)/Ĝ(Tᵢ−), where Ĝ is the Kaplan–Meier estimate of the
 * censoring distribution (censorings tied with events are taken to occur just after them).
 * The weighted Cox fit uses a robust (sandwich) variance clustered on subject.
 */
import { coxph, type CoxFit, type CoxOptions } from './cox'
import { kaplanMeier } from './km'

export interface CRData {
  time: number[]
  /** 0 = censored, 1..K = cause of failure. */
  cause: number[]
}

export interface CIFRow {
  time: number
  nRisk: number
  /** All-cause Kaplan–Meier S(t). */
  surv: number
  /** CIF per cause, index k−1 for cause k. */
  cif: number[]
}

/** Aalen–Johansen estimator: F_k(t) = Σ_{t_j ≤ t} Ŝ(t_j−) d_kj / n_j. */
export function cumulativeIncidence(data: CRData): { causes: number[]; rows: CIFRow[] } {
  const causes = Array.from(new Set(data.cause.filter((c) => c > 0))).sort((a, b) => a - b)
  const K = causes.length ? Math.max(...causes) : 0
  const times = Array.from(new Set(data.time)).sort((a, b) => a - b)
  const order = data.time.map((_, i) => i).sort((a, b) => data.time[a] - data.time[b])
  let ptr = 0
  let nRisk = data.time.length
  let s = 1
  const F = new Array(K).fill(0)
  const rows: CIFRow[] = []
  for (const t of times) {
    const dk = new Array(K).fill(0)
    let leaving = 0
    while (ptr < order.length && data.time[order[ptr]] === t) {
      const c = data.cause[order[ptr]]
      if (c > 0) dk[c - 1]++
      leaving++
      ptr++
    }
    const dAll = dk.reduce((a, b) => a + b, 0)
    if (dAll > 0) {
      for (let k = 0; k < K; k++) F[k] += (s * dk[k]) / nRisk
      s *= 1 - dAll / nRisk
    }
    rows.push({ time: t, nRisk, surv: s, cif: F.slice() })
    nRisk -= leaving
  }
  return { causes, rows }
}

/** 1 − KM for one cause, treating competing events as censored (biased upward; shown for contrast). */
export function naiveOneMinusKM(data: CRData, cause: number) {
  const fit = kaplanMeier({ time: data.time, status: data.cause.map((c) => (c === cause ? 1 : 0)) })
  return fit.rows.map((r) => ({ time: r.time, risk: 1 - r.surv }))
}

/** Censoring-distribution KM Ĝ with events-before-censorings ordering at ties. Returns Ĝ(t−) lookup. */
function censoringKM(time: number[], cause: number[]) {
  const ctimes = Array.from(new Set(time.filter((_, i) => cause[i] === 0))).sort((a, b) => a - b)
  const steps: { time: number; G: number }[] = []
  let G = 1
  for (const c of ctimes) {
    let atRisk = 0
    let nc = 0
    for (let i = 0; i < time.length; i++) {
      if (time[i] > c || (time[i] === c && cause[i] === 0)) atRisk++
      if (time[i] === c && cause[i] === 0) nc++
    }
    G *= 1 - nc / atRisk
    steps.push({ time: c, G })
  }
  /** Ĝ(t−): product over censoring times strictly less than t. */
  const Gminus = (t: number) => {
    let g = 1
    for (const st of steps) {
      if (st.time < t) g = st.G
      else break
    }
    return g
  }
  /** Ĝ(t): product over censoring times ≤ t. */
  const Gat = (t: number) => {
    let g = 1
    for (const st of steps) {
      if (st.time <= t) g = st.G
      else break
    }
    return g
  }
  return { steps, Gminus, Gat }
}

export interface FineGrayResult {
  fit: CoxFit
  expandedRows: number
}

/** Fine–Gray model for `cause` with covariate matrix x (n × p). */
export function fineGray(data: CRData, x: number[][], cause: number, opts: CoxOptions = {}): FineGrayResult {
  const n = data.time.length
  const { steps, Gminus, Gat } = censoringKM(data.time, data.cause)
  const eventTimes = data.time.filter((_, i) => data.cause[i] === cause)
  const lastEvent = eventTimes.length ? Math.max(...eventTimes) : 0
  const start: number[] = []
  const stop: number[] = []
  const status: number[] = []
  const w: number[] = []
  const xx: number[][] = []
  const id: number[] = []
  for (let i = 0; i < n; i++) {
    const ti = data.time[i]
    const ci = data.cause[i]
    start.push(0)
    stop.push(ti)
    status.push(ci === cause ? 1 : 0)
    w.push(1)
    xx.push(x[i])
    id.push(i)
    if (ci > 0 && ci !== cause && ti < lastEvent) {
      // extend follow-up beyond the competing event; weights change at censoring times
      const g0 = Gminus(ti)
      const cuts = steps.filter((s) => s.time > ti && s.time < lastEvent).map((s) => s.time)
      const bounds = [ti, ...cuts, lastEvent]
      for (let k = 0; k < bounds.length - 1; k++) {
        const a = bounds[k]
        const b = bounds[k + 1]
        if (b <= a) continue
        // no censoring time lies strictly inside (a, b), so for event times t in (a, b]
        // Ĝ(t−) = Ĝ(a) (censorings at a precede t; censorings at b follow an event at b)
        const gw = Gat(a) / g0
        if (gw <= 0) continue
        start.push(a)
        stop.push(b)
        status.push(0)
        w.push(gw)
        xx.push(x[i])
        id.push(i)
      }
    }
  }
  const fit = coxph({ time: stop, start, status, x: xx, weights: w, cluster: id }, opts)
  return { fit, expandedRows: stop.length }
}

/** Cause-specific Cox model: competing events treated as censored. */
export function causeSpecificCox(data: CRData, x: number[][], cause: number, opts: CoxOptions = {}): CoxFit {
  return coxph({ time: data.time, status: data.cause.map((c) => (c === cause ? 1 : 0)), x }, opts)
}
