/**
 * Cox proportional hazards regression by Newton–Raphson on the partial likelihood.
 *
 * Supports Breslow and Efron ties, counting-process (start, stop] data (time-varying
 * covariates, delayed entry), strata, case weights, an optional ridge (L2) penalty,
 * and the robust (sandwich) variance with clustering. Conventions follow R
 * `survival::coxph`; see tests/cox.test.ts for line-by-line agreement.
 */
import { invert, matVec, quadForm, zerosMat, zeros, type Mat, type Vec } from './linalg'
import { pTwoSided, pchisqUpper, zCrit } from './special'

export interface CoxData {
  /** Stop time (or follow-up time for right-censored data). */
  time: number[]
  status: number[]
  /** n × p covariate matrix. */
  x: number[][]
  /** Start time for (start, stop] intervals. Default 0 for everyone. */
  start?: number[]
  strata?: (number | string)[]
  weights?: number[]
  /** Cluster id (e.g., subject id for recurrent events). Enables robust SE. */
  cluster?: (number | string)[]
}

export interface CoxOptions {
  ties?: 'efron' | 'breslow'
  /** Ridge penalty λ: maximizes ℓ(β) − (λ/2)‖β‖². */
  ridge?: number
  maxIter?: number
  tol?: number
  level?: number
  names?: string[]
}

export interface CoxCoef {
  name: string
  coef: number
  se: number
  robustSe?: number
  z: number
  p: number
  hr: number
  lower: number
  upper: number
}

export interface CoxFit {
  coefs: CoxCoef[]
  beta: Vec
  vcov: Mat
  robustVcov?: Mat
  loglik0: number
  loglik: number
  lrTest: { chisq: number; df: number; p: number }
  waldTest: { chisq: number; df: number; p: number }
  scoreTest: { chisq: number; df: number; p: number }
  iterations: number
  converged: boolean
  /** Per-coefficient flag for monotone likelihood (estimate drifting to ±∞, e.g., a group with no events). */
  possiblyInfinite: boolean[]
  nEvents: number
  n: number
  ties: 'efron' | 'breslow'
  center: Vec
  /** Baseline cumulative hazard at x = center, per stratum, at event times. */
  baseline: Map<string, { time: number; cumhaz: number }[]>
  /** One row per event: time, stratum, unscaled Schoenfeld residual. */
  schoenfeld: { time: number; stratum: string; resid: Vec }[]
  martingale: Vec
  linearPredictor: Vec
}

interface Prepared {
  n: number
  p: number
  x: Mat // centered
  time: number[]
  start: number[]
  status: number[]
  w: number[]
  strataKeys: string[]
  strata: Map<string, number[]>
  center: Vec
}

function prepare(d: CoxData): Prepared {
  const n = d.time.length
  const p = d.x[0]?.length ?? 0
  const w = d.weights ?? new Array(n).fill(1)
  const wsum = w.reduce((a, b) => a + b, 0)
  // Like survival 3.x: centre continuous covariates at their (weighted) mean but leave 0/1
  // indicators uncentred, so the baseline hazard refers to the reference group.
  const center = zeros(p)
  for (let j = 0; j < p; j++) {
    const binary = d.x.every((row) => row[j] === 0 || row[j] === 1)
    if (binary) continue
    for (let i = 0; i < n; i++) center[j] += (w[i] * d.x[i][j]) / wsum
  }
  const x = d.x.map((row) => row.map((v, j) => v - center[j]))
  const start = d.start ?? new Array(n).fill(-Infinity)
  const strata = new Map<string, number[]>()
  for (let i = 0; i < n; i++) {
    const k = d.strata ? String(d.strata[i]) : '_'
    if (!strata.has(k)) strata.set(k, [])
    strata.get(k)!.push(i)
  }
  return { n, p, x, time: d.time, start, status: d.status, w, strataKeys: Array.from(strata.keys()), strata, center }
}

interface EventBlock {
  stratum: string
  time: number
  deaths: number[]
  /** Risk-set sums at this time (centered scale). */
  S0: number
  S1: Vec
  S2: Mat
  E0: number
  E1: Vec
  E2: Mat
}

/** Sweep each stratum backwards in time, yielding risk-set sums at every distinct event time. */
function sweep(P: Prepared, beta: Vec, needS2: boolean, onBlock: (b: EventBlock, r: number[]) => void) {
  const { p, x, time, start, status, w } = P
  const r = x.map((row) => {
    let eta = 0
    for (let j = 0; j < p; j++) eta += row[j] * beta[j]
    return Math.exp(eta)
  })
  for (const key of P.strataKeys) {
    const idx = P.strata.get(key)!
    const byStop = idx.slice().sort((a, b) => time[b] - time[a])
    const byStart = idx.slice().sort((a, b) => start[b] - start[a])
    const deathsAt = new Map<number, number[]>()
    for (const i of idx) {
      if (!status[i]) continue
      const arr = deathsAt.get(time[i])
      if (arr) arr.push(i)
      else deathsAt.set(time[i], [i])
    }
    const evTimes = Array.from(deathsAt.keys()).sort((a, b) => b - a)
    let S0 = 0
    const S1 = zeros(p)
    const S2 = needS2 ? zerosMat(p) : []
    let ip = 0
    let iq = 0
    const add = (i: number, sign: number) => {
      const wr = sign * w[i] * r[i]
      S0 += wr
      for (let j = 0; j < p; j++) {
        S1[j] += wr * x[i][j]
        if (needS2) for (let k = 0; k <= j; k++) S2[j][k] += wr * x[i][j] * x[i][k]
      }
    }
    for (const t of evTimes) {
      while (ip < byStop.length && time[byStop[ip]] >= t) add(byStop[ip++], 1)
      while (iq < byStart.length && start[byStart[iq]] >= t) add(byStart[iq++], -1)
      const deaths = deathsAt.get(t)!
      let E0 = 0
      const E1 = zeros(p)
      const E2 = needS2 ? zerosMat(p) : []
      for (const i of deaths) {
        const wr = w[i] * r[i]
        E0 += wr
        for (let j = 0; j < p; j++) {
          E1[j] += wr * x[i][j]
          if (needS2) for (let k = 0; k <= j; k++) E2[j][k] += wr * x[i][j] * x[i][k]
        }
      }
      const sym = (M: Mat) => {
        if (!needS2) return M
        const out = M.map((row) => row.slice())
        for (let j = 0; j < p; j++) for (let k = j + 1; k < p; k++) out[j][k] = out[k][j]
        return out
      }
      onBlock({ stratum: key, time: t, deaths, S0, S1: S1.slice(), S2: sym(S2), E0, E1, E2: sym(E2) }, r)
    }
  }
}

function logLikGradInfo(P: Prepared, beta: Vec, ties: 'efron' | 'breslow', ridge: number) {
  const { p, x, w } = P
  let ll = 0
  const U = zeros(p)
  const I = zerosMat(p)
  sweep(P, beta, true, (b, r) => {
    const d = b.deaths.length
    let wD = 0
    for (const i of b.deaths) {
      wD += w[i]
      ll += w[i] * Math.log(r[i])
      for (let j = 0; j < p; j++) U[j] += w[i] * x[i][j]
    }
    if (ties === 'breslow' || d === 1) {
      ll -= wD * Math.log(b.S0)
      for (let j = 0; j < p; j++) {
        const m = b.S1[j] / b.S0
        U[j] -= wD * m
        for (let k = 0; k < p; k++) I[j][k] += wD * (b.S2[j][k] / b.S0 - m * (b.S1[k] / b.S0))
      }
    } else {
      const meanW = wD / d
      for (let kk = 0; kk < d; kk++) {
        const f = kk / d
        const den = b.S0 - f * b.E0
        ll -= meanW * Math.log(den)
        const a1 = b.S1.map((v, j) => v - f * b.E1[j])
        for (let j = 0; j < p; j++) {
          U[j] -= (meanW * a1[j]) / den
          for (let k = 0; k < p; k++) {
            const a2 = b.S2[j][k] - f * b.E2[j][k]
            I[j][k] += meanW * (a2 / den - (a1[j] * a1[k]) / (den * den))
          }
        }
      }
    }
  })
  if (ridge > 0) {
    for (let j = 0; j < p; j++) {
      ll -= (ridge / 2) * beta[j] * beta[j]
      U[j] -= ridge * beta[j]
      I[j][j] += ridge
    }
  }
  return { ll, U, I }
}

export function coxph(data: CoxData, opts: CoxOptions = {}): CoxFit {
  const ties = opts.ties ?? 'efron'
  const ridge = opts.ridge ?? 0
  const maxIter = opts.maxIter ?? 30
  const tol = opts.tol ?? 1e-9
  const P = prepare(data)
  const p = P.p
  let beta = zeros(p)
  let cur = logLikGradInfo(P, beta, ties, ridge)
  const ll0 = cur.ll
  const I0inv = invert(cur.I)
  const score0 = I0inv ? quadForm(cur.U, I0inv) : NaN
  let iter = 0
  let converged = false
  for (; iter < maxIter; iter++) {
    const Iinv = invert(cur.I)
    if (!Iinv) break
    const step = matVec(Iinv, cur.U)
    let newBeta = beta.map((b, j) => b + step[j])
    let next = logLikGradInfo(P, newBeta, ties, ridge)
    let halvings = 0
    while ((!Number.isFinite(next.ll) || next.ll < cur.ll - 1e-12) && halvings < 20) {
      newBeta = newBeta.map((b, j) => (b + beta[j]) / 2)
      next = logLikGradInfo(P, newBeta, ties, ridge)
      halvings++
    }
    const done = Math.abs(next.ll - cur.ll) <= tol * Math.max(1, Math.abs(cur.ll))
    beta = newBeta
    cur = next
    if (done) {
      converged = true
      iter++
      break
    }
  }
  const vcov = invert(cur.I) ?? zerosMat(p)
  const z = zCrit(opts.level ?? 0.95)

  // ---- post-fit quantities: baseline hazard, Schoenfeld & score residuals ----
  const baseline = new Map<string, { time: number; cumhaz: number }[]>()
  // dLambdaDeath: the hazard increment "experienced" by a subject who dies at a tied time.
  // Under Efron each tied death carries only part of the later terms: Σₖ (1 − k/d)·w̄/(S0 − (k/d)E0).
  const blocks: { stratum: string; time: number; dLambda: number; dLambdaDeath: number; xbar: Vec }[] = []
  const blockIndex = new Map<string, (typeof blocks)[number]>()
  const schoenfeld: { time: number; stratum: string; resid: Vec }[] = []
  sweep(P, beta, false, (b) => {
    const d = b.deaths.length
    let wD = 0
    for (const i of b.deaths) wD += P.w[i]
    let dLambda = 0
    let dLambdaDeath = 0
    const xbar = zeros(p)
    if (ties === 'breslow' || d === 1) {
      dLambda = wD / b.S0
      dLambdaDeath = dLambda
      for (let j = 0; j < p; j++) xbar[j] = b.S1[j] / b.S0
    } else {
      const meanW = wD / d
      for (let kk = 0; kk < d; kk++) {
        const f = kk / d
        const den = b.S0 - f * b.E0
        dLambda += meanW / den
        dLambdaDeath += ((1 - f) * meanW) / den
        for (let j = 0; j < p; j++) xbar[j] += (b.S1[j] - f * b.E1[j]) / den / d
      }
    }
    const blk = { stratum: b.stratum, time: b.time, dLambda, dLambdaDeath, xbar }
    blocks.push(blk)
    blockIndex.set(`${b.stratum}\u0000${b.time}`, blk)
    for (const i of b.deaths) schoenfeld.push({ time: b.time, stratum: b.stratum, resid: P.x[i].map((v, j) => v - xbar[j]) })
  })
  schoenfeld.sort((a, b) => a.time - b.time)

  // cumulative sums per stratum (ascending)
  const cum = new Map<string, { t: number[]; A0: number[]; A1: Vec[] }>()
  for (const key of P.strataKeys) {
    const bs = blocks.filter((b) => b.stratum === key).sort((a, b) => a.time - b.time)
    const t: number[] = []
    const A0: number[] = []
    const A1: Vec[] = []
    let a0 = 0
    let a1 = zeros(p)
    const base: { time: number; cumhaz: number }[] = []
    for (const b of bs) {
      a0 += b.dLambda
      a1 = a1.map((v, j) => v + b.xbar[j] * b.dLambda)
      t.push(b.time)
      A0.push(a0)
      A1.push(a1.slice())
      base.push({ time: b.time, cumhaz: a0 })
    }
    cum.set(key, { t, A0, A1 })
    baseline.set(key, base)
  }
  const lookup = (key: string, s: number) => {
    const c = cum.get(key)!
    let lo = 0
    let hi = c.t.length - 1
    let ans = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (c.t[mid] <= s) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return ans < 0 ? { A0: 0, A1: zeros(p) } : { A0: c.A0[ans], A1: c.A1[ans] }
  }

  const lp: Vec = []
  const martingale: Vec = []
  const scoreRes: Vec[] = []
  for (let i = 0; i < P.n; i++) {
    const key = data.strata ? String(data.strata[i]) : '_'
    let eta = 0
    for (let j = 0; j < p; j++) eta += P.x[i][j] * beta[j]
    lp.push(eta)
    const ri = Math.exp(eta)
    const hi = lookup(key, P.time[i])
    const lo = Number.isFinite(P.start[i]) ? lookup(key, P.start[i]) : { A0: 0, A1: zeros(p) }
    const dA0 = hi.A0 - lo.A0
    const sr = zeros(p)
    let expected = ri * dA0
    if (P.status[i]) {
      const blk = blockIndex.get(`${key}\u0000${P.time[i]}`)!
      expected -= ri * (blk.dLambda - blk.dLambdaDeath)
      for (let j = 0; j < p; j++) sr[j] += P.x[i][j] - blk.xbar[j]
    }
    martingale.push(P.status[i] - expected)
    for (let j = 0; j < p; j++) sr[j] -= ri * (P.x[i][j] * dA0 - (hi.A1[j] - lo.A1[j]))
    scoreRes.push(sr)
  }

  let robustVcov: Mat | undefined
  if (data.cluster) {
    const clusters = new Map<string, Vec>()
    for (let i = 0; i < P.n; i++) {
      const c = data.cluster ? String(data.cluster[i]) : String(i)
      if (!clusters.has(c)) clusters.set(c, zeros(p))
      const acc = clusters.get(c)!
      for (let j = 0; j < p; j++) acc[j] += P.w[i] * scoreRes[i][j]
    }
    const B = zerosMat(p)
    for (const L of clusters.values()) for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) B[j][k] += L[j] * L[k]
    const VB = vcov.map((row) => B[0].map((_, k) => row.reduce((s, v, l) => s + v * B[l][k], 0)))
    robustVcov = VB.map((row) => vcov[0].map((_, k) => row.reduce((s, v, l) => s + v * vcov[l][k], 0)))
  }

  const names = opts.names ?? beta.map((_, j) => `x${j + 1}`)
  const coefs: CoxCoef[] = beta.map((b, j) => {
    const se = Math.sqrt(vcov[j][j])
    const rse = robustVcov ? Math.sqrt(robustVcov[j][j]) : undefined
    const useSe = rse ?? se
    return {
      name: names[j],
      coef: b,
      se,
      robustSe: rse,
      z: b / useSe,
      p: pTwoSided(b / useSe),
      hr: Math.exp(b),
      lower: Math.exp(b - z * useSe),
      upper: Math.exp(b + z * useSe),
    }
  })
  const Vinv = invert(vcov)
  const wald = Vinv ? quadForm(beta, Vinv) : NaN
  const lr = 2 * (cur.ll - ll0)
  const nEvents = data.status.reduce((a, b) => a + (b ? 1 : 0), 0)
  return {
    coefs,
    beta,
    vcov,
    robustVcov,
    loglik0: ll0,
    loglik: cur.ll,
    lrTest: { chisq: lr, df: p, p: pchisqUpper(lr, p) },
    waldTest: { chisq: wald, df: p, p: pchisqUpper(wald, p) },
    scoreTest: { chisq: score0, df: p, p: pchisqUpper(score0, p) },
    iterations: iter,
    converged,
    possiblyInfinite: beta.map((b, j) => {
      const col = data.x.map((r) => r[j])
      const m = col.reduce((a, v) => a + v, 0) / col.length
      const sd = Math.sqrt(col.reduce((a, v) => a + (v - m) ** 2, 0) / Math.max(1, col.length - 1))
      return Math.abs(b) * (sd || 1) > 8 || !Number.isFinite(b)
    }),
    nEvents,
    n: P.n,
    ties,
    center: P.center,
    baseline,
    schoenfeld,
    martingale,
    linearPredictor: lp,
  }
}

/** Predicted survival curve S(t | x) = exp(−Λ₀(t) · exp((x − x̄)ᵀβ)) at the baseline step times. */
export function predictSurvival(fit: CoxFit, x: Vec, stratum = '_'): { time: number; surv: number }[] {
  const base = fit.baseline.get(stratum) ?? []
  let eta = 0
  for (let j = 0; j < x.length; j++) eta += (x[j] - fit.center[j]) * fit.beta[j]
  const r = Math.exp(eta)
  return [{ time: 0, surv: 1 }, ...base.map((b) => ({ time: b.time, surv: Math.exp(-b.cumhaz * r) }))]
}

/** Survival probability at a single time for covariate vector x. */
export function survProbAt(fit: CoxFit, x: Vec, t: number, stratum = '_'): number {
  const base = fit.baseline.get(stratum) ?? []
  let H = 0
  for (const b of base) {
    if (b.time <= t) H = b.cumhaz
    else break
  }
  let eta = 0
  for (let j = 0; j < x.length; j++) eta += (x[j] - fit.center[j]) * fit.beta[j]
  return Math.exp(-H * Math.exp(eta))
}

export interface ZphResult {
  terms: { name: string; rho: number; chisq: number; p: number }[]
  global: { chisq: number; df: number; p: number }
  /** Scaled Schoenfeld residuals β + d·V·r per event (for plotting), with transformed time. */
  scaled: { time: number; gTime: number; values: Vec }[]
}

/**
 * Grambsch–Therneau test of proportional hazards using scaled Schoenfeld residuals
 * (the classic approximation used by survival::cox.zph before version 3.0):
 * for each covariate, regress β̂ + d·V·rₖ on g(tₖ) and test the slope.
 * g = 'km' (1 − left-continuous pooled KM), 'rank', 'identity' or 'log'.
 */
export function coxZph(fit: CoxFit, data: { time: number[]; status: number[] }, transform: 'km' | 'rank' | 'identity' | 'log' = 'km'): ZphResult {
  const sr = fit.schoenfeld
  const d = sr.length
  const p = fit.beta.length
  const V = fit.vcov
  const times = sr.map((s) => s.time)
  let g: number[]
  if (transform === 'identity') g = times
  else if (transform === 'log') g = times.map(Math.log)
  else if (transform === 'rank') {
    const sorted = times.slice().sort((a, b) => a - b)
    g = times.map((t) => {
      const first = sorted.indexOf(t)
      const last = sorted.lastIndexOf(t)
      return (first + last) / 2 + 1
    })
  } else {
    // 1 − KM(t−) of the pooled data
    const uniq = Array.from(new Set(data.time.filter((_, i) => data.status[i]))).sort((a, b) => a - b)
    const kmBefore = new Map<number, number>()
    let s = 1
    for (const t of uniq) {
      kmBefore.set(t, s)
      const nr = data.time.filter((v) => v >= t).length
      const dd = data.time.filter((v, i) => v === t && data.status[i]).length
      s *= 1 - dd / nr
    }
    g = times.map((t) => 1 - kmBefore.get(t)!)
  }
  const gbar = g.reduce((a, b) => a + b, 0) / d
  const xx = g.map((v) => v - gbar)
  const sxx = xx.reduce((a, b) => a + b * b, 0)
  const r2 = sr.map((s) => matVec(V, s.resid).map((v) => v * d)) // scaled minus β
  const terms = fit.coefs.map((c, j) => {
    let test = 0
    for (let k = 0; k < d; k++) test += xx[k] * r2[k][j]
    const chisq = (test * test) / (V[j][j] * d * sxx)
    // correlation between g and scaled residual
    const col = r2.map((r) => r[j])
    const mean = col.reduce((a, b) => a + b, 0) / d
    const syy = col.reduce((a, b) => a + (b - mean) ** 2, 0)
    const rho = test / Math.sqrt(sxx * syy)
    return { name: c.name, rho, chisq, p: pchisqUpper(chisq, 1) }
  })
  const tvec = zeros(p)
  for (let k = 0; k < d; k++) for (let j = 0; j < p; j++) tvec[j] += xx[k] * sr[k].resid[j]
  const gchisq = (quadForm(tvec, V) * d) / sxx
  return {
    terms,
    global: { chisq: gchisq, df: p, p: pchisqUpper(gchisq, p) },
    scaled: sr.map((s, k) => ({ time: s.time, gTime: g[k], values: r2[k].map((v, j) => v + fit.beta[j]) })),
  }
}
