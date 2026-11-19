/**
 * Kaplan–Meier, Nelson–Aalen, quantiles and restricted mean survival time.
 *
 * Conventions follow R `survival::survfit` (survival 3.x) so results can be checked
 * line-for-line: Greenwood variance of log S, CI on the "log" (R default),
 * "log-log" (Stata/SAS default) or "plain" scale, the midpoint rule for medians,
 * and left truncation via risk sets {i : entry_i < t ≤ time_i}.
 */
import { zCrit } from './special'

export interface SurvData {
  time: number[]
  /** 1 = event, 0 = censored */
  status: number[]
  /** Optional delayed-entry (left-truncation) times. */
  entry?: number[]
}

export type CIType = 'log' | 'log-log' | 'plain'

export interface KMRow {
  time: number
  nRisk: number
  nEvent: number
  nCensor: number
  surv: number
  /** Greenwood SE of S(t) (delta method: S·σ). */
  seSurv: number
  /** Greenwood σ = sqrt(Σ d/(n(n−d))) — the SE of log S(t). */
  sigma: number
  lower: number
  upper: number
  cumhaz: number
  seCumhaz: number
}

export interface KMFit {
  rows: KMRow[]
  n: number
  events: number
  ciType: CIType
  level: number
}

export function kaplanMeier(data: SurvData, opts: { ciType?: CIType; level?: number } = {}): KMFit {
  const ciType = opts.ciType ?? 'log'
  const level = opts.level ?? 0.95
  const z = zCrit(level)
  const { time, status, entry } = data
  const n = time.length
  const times = Array.from(new Set(time)).sort((a, b) => a - b)

  // counts per unique time
  const dAt = new Map<number, number>()
  const cAt = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const m = status[i] ? dAt : cAt
    m.set(time[i], (m.get(time[i]) ?? 0) + 1)
  }

  // number at risk: without entry, n − (#exits before t); with entry, count directly
  const sortedTime = time.slice().sort((a, b) => a - b)
  const sortedEntry = entry ? entry.slice().sort((a, b) => a - b) : null
  const countLess = (arr: number[], t: number) => {
    let lo = 0
    let hi = arr.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (arr[mid] < t) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  const rows: KMRow[] = []
  let s = 1
  let g = 0 // Greenwood sum
  let H = 0
  let vH = 0
  let events = 0
  for (const t of times) {
    const exitedBefore = countLess(sortedTime, t)
    const entered = sortedEntry ? countLess(sortedEntry, t) : n
    const nRisk = entered - exitedBefore
    const d = dAt.get(t) ?? 0
    const c = cAt.get(t) ?? 0
    events += d
    if (d > 0 && nRisk > 0) {
      s *= 1 - d / nRisk
      g += nRisk > d ? d / (nRisk * (nRisk - d)) : Infinity
      H += d / nRisk
      vH += d / (nRisk * nRisk)
    }
    const sigma = Math.sqrt(g)
    const [lower, upper] = confInt(s, sigma, z, ciType)
    rows.push({ time: t, nRisk, nEvent: d, nCensor: c, surv: s, seSurv: s * sigma, sigma, lower, upper, cumhaz: H, seCumhaz: Math.sqrt(vH) })
  }
  return { rows, n, events, ciType, level }
}

function confInt(s: number, sigma: number, z: number, type: CIType): [number, number] {
  if (s <= 0) return [0, 0]
  if (sigma === 0) return [s, s]
  if (!Number.isFinite(sigma)) return [0, 1]
  switch (type) {
    case 'plain':
      return [Math.max(0, s - z * s * sigma), Math.min(1, s + z * s * sigma)]
    case 'log':
      return [s * Math.exp(-z * sigma), Math.min(1, s * Math.exp(z * sigma))]
    case 'log-log': {
      const ls = Math.log(s)
      if (ls === 0) return [1, 1]
      const w = (z * sigma) / Math.abs(ls)
      return [Math.pow(s, Math.exp(w)), Math.pow(s, Math.exp(-w))]
    }
  }
}

/** Right-continuous step-function lookup: value of the curve at time t. */
export function stepValue<T extends { time: number }>(rows: T[], t: number, key: (r: T) => number, initial = 1): number {
  let lo = 0
  let hi = rows.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (rows[mid].time <= t) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans < 0 ? initial : key(rows[ans])
}

export const survAt = (fit: KMFit, t: number) => stepValue(fit.rows, t, (r) => r.surv)

/**
 * Quantile of the survival distribution, R-style: the first time S(t) ≤ 1 − p; if the
 * curve sits exactly at 1 − p over an interval, the midpoint of that interval is used.
 * Returns NaN when not reached.
 */
export function survQuantile(fit: KMFit, p = 0.5, which: 'surv' | 'lower' | 'upper' = 'surv'): number {
  const target = 1 - p
  const eps = 1e-10
  for (let i = 0; i < fit.rows.length; i++) {
    const v = fit.rows[i][which]
    if (v <= target + eps) {
      if (Math.abs(v - target) < eps) {
        // find next time at which the curve drops strictly below
        for (let j = i + 1; j < fit.rows.length; j++) {
          if (fit.rows[j][which] < target - eps) return (fit.rows[i].time + fit.rows[j].time) / 2
        }
        return NaN
      }
      return fit.rows[i].time
    }
  }
  return NaN
}

export interface MedianSummary {
  median: number
  lower: number
  upper: number
}

/** Median with the Brookmeyer–Crowley-type interval obtained by inverting the pointwise CI (as in R). */
export function medianSurvival(fit: KMFit): MedianSummary {
  return {
    median: survQuantile(fit, 0.5, 'surv'),
    lower: survQuantile(fit, 0.5, 'lower'),
    upper: survQuantile(fit, 0.5, 'upper'),
  }
}

/** Reverse Kaplan–Meier (censoring as the "event") — the recommended estimate of median follow-up. */
export function reverseKM(data: SurvData): KMFit {
  return kaplanMeier({ time: data.time, status: data.status.map((s) => (s ? 0 : 1)), entry: data.entry })
}

export interface RMSTResult {
  tau: number
  rmst: number
  se: number
  lower: number
  upper: number
}

/**
 * Restricted mean survival time: area under the KM curve on [0, τ], with the
 * variance used by R `survfit` (print(..., rmean = τ)) and survRM2:
 *   Var = Σ_{t_i ≤ τ} A_i² d_i / (n_i (n_i − d_i)),  A_i = ∫_{t_i}^{τ} S(u) du.
 */
export function rmst(fit: KMFit, tau: number, level = 0.95): RMSTResult {
  const ev = fit.rows.filter((r) => r.nEvent > 0 && r.time <= tau)
  // area under step function
  const knots = [0, ...ev.map((r) => r.time), tau]
  const svals = [1, ...ev.map((r) => r.surv)]
  let area = 0
  const segArea: number[] = []
  for (let i = 0; i < svals.length; i++) {
    const a = (knots[i + 1] - knots[i]) * svals[i]
    segArea.push(a)
    area += a
  }
  // A_i = area from t_i to tau = sum of segments after knot i
  let v = 0
  let tail = 0
  for (let i = ev.length - 1; i >= 0; i--) {
    tail += segArea[i + 1]
    const r = ev[i]
    if (r.nRisk > r.nEvent) v += (tail * tail * r.nEvent) / (r.nRisk * (r.nRisk - r.nEvent))
  }
  const se = Math.sqrt(v)
  const z = zCrit(level)
  return { tau, rmst: area, se, lower: area - z * se, upper: area + z * se }
}

/** Life-table style summary at chosen times (like summary(survfit, times = ...)). */
export function kmAtTimes(fit: KMFit, times: number[]) {
  return times.map((t) => {
    let idx = -1
    for (let i = 0; i < fit.rows.length; i++) if (fit.rows[i].time <= t) idx = i
    const r = idx >= 0 ? fit.rows[idx] : null
    // number at risk at t = at risk at the first recorded time ≥ t
    const next = fit.rows.find((row) => row.time >= t)
    const nRisk = next ? next.nRisk : 0
    return {
      time: t,
      nRisk,
      surv: r ? r.surv : 1,
      lower: r ? r.lower : 1,
      upper: r ? r.upper : 1,
      seSurv: r ? r.seSurv : 0,
    }
  })
}
