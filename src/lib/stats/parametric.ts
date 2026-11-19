/**
 * Parametric survival distributions and maximum-likelihood fitting to right-censored data.
 * Parameterisations follow R flexsurv (and survreg for the AFT families):
 *   exponential(rate)            h = λ
 *   weibull(shape k, scale b)    S = exp(−(t/b)^k)
 *   gompertz(shape b, rate a)    h = a·e^{bt}   (b < 0 ⇒ a cured fraction: S(∞) > 0)
 *   loglogistic(shape β, scale α) S = 1 / (1 + (t/α)^β)
 *   lognormal(meanlog μ, sdlog σ) S = 1 − Φ((ln t − μ)/σ)
 * The log-likelihood is on the original time scale: ℓ = Σ δᵢ log h(tᵢ) − H(tᵢ).
 */
import { minimize } from './optimize'
import { dnorm, pnorm } from './special'
import type { Vec } from './linalg'

export type DistName = 'exponential' | 'weibull' | 'gompertz' | 'loglogistic' | 'lognormal'

export type Params = Record<string, number>

export interface Distribution {
  name: DistName
  label: string
  paramNames: string[]
  hazardShape: string
  fromTheta: (th: Vec) => Params
  toTheta: (p: Params) => Vec
  H: (t: number, p: Params) => number
  logh: (t: number, p: Params) => number
}

const logSurvLognormal = (t: number, p: Params) => {
  const z = (Math.log(t) - p.meanlog) / p.sdlog
  return Math.log(Math.max(pnorm(-z), 1e-300))
}

export const DISTRIBUTIONS: Record<DistName, Distribution> = {
  exponential: {
    name: 'exponential',
    label: 'Exponential',
    paramNames: ['rate'],
    hazardShape: 'Constant',
    fromTheta: (th) => ({ rate: Math.exp(th[0]) }),
    toTheta: (p) => [Math.log(p.rate)],
    H: (t, p) => p.rate * t,
    logh: (_t, p) => Math.log(p.rate),
  },
  weibull: {
    name: 'weibull',
    label: 'Weibull',
    paramNames: ['shape', 'scale'],
    hazardShape: 'Monotone: rising (k > 1), falling (k < 1), constant (k = 1)',
    fromTheta: (th) => ({ shape: Math.exp(th[0]), scale: Math.exp(th[1]) }),
    toTheta: (p) => [Math.log(p.shape), Math.log(p.scale)],
    H: (t, p) => Math.pow(t / p.scale, p.shape),
    logh: (t, p) => Math.log(p.shape / p.scale) + (p.shape - 1) * Math.log(t / p.scale),
  },
  gompertz: {
    name: 'gompertz',
    label: 'Gompertz',
    paramNames: ['shape', 'rate'],
    hazardShape: 'Exponentially rising (b > 0) or falling (b < 0)',
    fromTheta: (th) => ({ shape: th[0], rate: Math.exp(th[1]) }),
    toTheta: (p) => [p.shape, Math.log(p.rate)],
    H: (t, p) => (Math.abs(p.shape) < 1e-10 ? p.rate * t : (p.rate / p.shape) * Math.expm1(p.shape * t)),
    logh: (t, p) => Math.log(p.rate) + p.shape * t,
  },
  loglogistic: {
    name: 'loglogistic',
    label: 'Log-logistic',
    paramNames: ['shape', 'scale'],
    hazardShape: 'Rises then falls (β > 1) or monotone falling (β ≤ 1)',
    fromTheta: (th) => ({ shape: Math.exp(th[0]), scale: Math.exp(th[1]) }),
    toTheta: (p) => [Math.log(p.shape), Math.log(p.scale)],
    H: (t, p) => Math.log1p(Math.pow(t / p.scale, p.shape)),
    logh: (t, p) => {
      const u = Math.pow(t / p.scale, p.shape)
      return Math.log(p.shape / p.scale) + (p.shape - 1) * Math.log(t / p.scale) - Math.log1p(u)
    },
  },
  lognormal: {
    name: 'lognormal',
    label: 'Log-normal',
    paramNames: ['meanlog', 'sdlog'],
    hazardShape: 'Rises then falls',
    fromTheta: (th) => ({ meanlog: th[0], sdlog: Math.exp(th[1]) }),
    toTheta: (p) => [p.meanlog, Math.log(p.sdlog)],
    H: (t, p) => -logSurvLognormal(t, p),
    logh: (t, p) => {
      const z = (Math.log(t) - p.meanlog) / p.sdlog
      const logf = Math.log(dnorm(z)) - Math.log(p.sdlog * t)
      return logf - logSurvLognormal(t, p)
    },
  },
}

export const surv = (d: Distribution, t: number, p: Params) => (t <= 0 ? 1 : Math.exp(-d.H(t, p)))
export const hazard = (d: Distribution, t: number, p: Params) => (t <= 0 ? (d.name === 'exponential' ? p.rate : d.name === 'gompertz' ? p.rate : NaN) : Math.exp(d.logh(t, p)))
export const density = (d: Distribution, t: number, p: Params) => hazard(d, t, p) * surv(d, t, p)

/** Median (time where S = 0.5), by bisection; Infinity if never reached (e.g., Gompertz with cure). */
export function distQuantile(d: Distribution, p: Params, prob = 0.5): number {
  const target = -Math.log(1 - prob)
  let hi = 1
  let guard = 0
  while (d.H(hi, p) < target && guard++ < 200) hi *= 2
  if (guard >= 200) return Infinity
  let lo = 0
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (d.H(mid, p) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Mean survival time ∫₀^∞ S(t) dt, numerically (Infinity when S(∞) > 0). */
export function distMean(d: Distribution, p: Params, upper?: number): number {
  const tMax = upper ?? distQuantile(d, p, 0.99999)
  if (!Number.isFinite(tMax)) return Infinity
  const n = 4000
  let a = 0
  for (let i = 0; i < n; i++) {
    const t0 = (i * tMax) / n
    const t1 = ((i + 1) * tMax) / n
    a += ((surv(d, t0, p) + surv(d, t1, p)) / 2) * (t1 - t0)
  }
  return a
}

export interface ParametricFit {
  dist: Distribution
  params: Params
  theta: Vec
  loglik: number
  k: number
  aic: number
  bic: number
  converged: boolean
}

export function logLik(d: Distribution, p: Params, time: number[], status: number[]): number {
  let ll = 0
  for (let i = 0; i < time.length; i++) {
    const t = Math.max(time[i], 1e-10)
    if (status[i]) ll += d.logh(t, p)
    ll -= d.H(t, p)
  }
  return ll
}

export function fitParametric(name: DistName, time: number[], status: number[]): ParametricFit {
  const d = DISTRIBUTIONS[name]
  const n = time.length
  const D = status.reduce((a, b) => a + b, 0)
  const sumT = time.reduce((a, b) => a + b, 0)
  const rate0 = Math.max(D, 0.5) / sumT
  const med0 = Math.log(2) / rate0
  const starts: Vec[] = (() => {
    switch (name) {
      case 'exponential':
        return [[Math.log(rate0)]]
      case 'weibull':
        return [[0, Math.log(1 / rate0)], [Math.log(2), Math.log(med0)], [Math.log(0.6), Math.log(1 / rate0)]]
      case 'gompertz':
        return [[0, Math.log(rate0)], [rate0 / 2, Math.log(rate0 / 2)], [-rate0 / 2, Math.log(rate0 * 1.5)]]
      case 'loglogistic':
        return [[0, Math.log(med0)], [Math.log(2), Math.log(med0)]]
      case 'lognormal':
        return [[Math.log(med0), 0], [Math.log(med0), Math.log(0.5)]]
    }
  })()
  const negLL = (th: Vec) => -logLik(d, d.fromTheta(th), time, status)
  let theta: Vec
  let value: number
  if (name === 'exponential') {
    theta = [Math.log(Math.max(D, 1e-8) / sumT)]
    value = negLL(theta)
  } else {
    const r = minimize(negLL, starts)
    theta = r.x
    value = r.value
  }
  const k = d.paramNames.length
  const loglik = -value
  return {
    dist: d,
    params: d.fromTheta(theta),
    theta,
    loglik,
    k,
    aic: -2 * loglik + 2 * k,
    bic: -2 * loglik + k * Math.log(n),
    converged: Number.isFinite(loglik),
  }
}
