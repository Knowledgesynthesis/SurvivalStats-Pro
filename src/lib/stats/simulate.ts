/**
 * Event-time samplers (inverse-transform) and censoring mechanisms used by the labs.
 * Every generator takes an explicit RNG so results are reproducible from a seed.
 */
import { rexp, runif, type RNG } from './random'

/** Weibull with S(t) = exp(−(t/scale)^shape). */
export function sampleWeibull(rng: RNG, shape: number, scale: number): number {
  return scale * Math.pow(-Math.log(rng()), 1 / shape)
}

/** Gompertz with h(t) = rate·e^{shape·t}. Returns Infinity for a "cured" draw when shape < 0. */
export function sampleGompertz(rng: RNG, shape: number, rate: number): number {
  const e = -Math.log(rng())
  if (Math.abs(shape) < 1e-12) return e / rate
  const arg = 1 + (shape * e) / rate
  return arg <= 0 ? Infinity : Math.log(arg) / shape
}

/** Log-logistic with S(t) = 1 / (1 + (t/scale)^shape). */
export function sampleLogLogistic(rng: RNG, shape: number, scale: number): number {
  const u = rng()
  return scale * Math.pow((1 - u) / u, 1 / shape)
}

/** Log-normal. */
export function sampleLogNormal(rng: RNG, meanlog: number, sdlog: number): number {
  const u1 = rng()
  const u2 = rng()
  return Math.exp(meanlog + sdlog * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2))
}

/**
 * Piecewise-constant hazard: rates[k] applies on [cuts[k], cuts[k+1]); cuts[0] must be 0.
 * Inverts the cumulative hazard exactly.
 */
export function samplePiecewiseExp(rng: RNG, cuts: number[], rates: number[]): number {
  let e = -Math.log(rng())
  for (let k = 0; k < rates.length; k++) {
    const a = cuts[k]
    const b = k + 1 < cuts.length ? cuts[k + 1] : Infinity
    const width = b - a
    const h = rates[k] * width
    if (rates[k] > 0 && e <= h) return a + e / rates[k]
    if (!Number.isFinite(b)) return Infinity
    e -= h
  }
  return Infinity
}

/** Cumulative hazard of a piecewise-exponential distribution at t. */
export function piecewiseCumHaz(t: number, cuts: number[], rates: number[]): number {
  let H = 0
  for (let k = 0; k < rates.length; k++) {
    const a = cuts[k]
    const b = k + 1 < cuts.length ? cuts[k + 1] : Infinity
    if (t <= a) break
    H += rates[k] * (Math.min(t, b) - a)
  }
  return H
}

export interface CensoringSpec {
  /** Exponential loss-to-follow-up rate (0 = none). */
  dropoutRate?: number
  /** Administrative end of study (everyone still event-free is censored here). */
  adminTime?: number
  /** Staggered entry: accrual period length; admin censoring at adminTime − entry. */
  accrual?: number
}

export function censor(rng: RNG, T: number, spec: CensoringSpec): { time: number; status: number } {
  let C = Infinity
  if (spec.dropoutRate && spec.dropoutRate > 0) C = Math.min(C, rexp(rng, spec.dropoutRate))
  if (spec.adminTime !== undefined) {
    const entry = spec.accrual ? runif(rng, 0, spec.accrual) : 0
    C = Math.min(C, spec.adminTime - entry)
  }
  return T <= C ? { time: T, status: 1 } : { time: C, status: 0 }
}

/** Dropout rate giving an expected censored fraction p when events are exponential(λ) and censoring is the only competing process. */
export function dropoutRateFor(p: number, eventRate: number): number {
  if (p <= 0) return 0
  return (eventRate * p) / (1 - p)
}

/** Round to a fixed number of decimals (keeps tables readable and creates realistic ties). */
export const roundTo = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d
