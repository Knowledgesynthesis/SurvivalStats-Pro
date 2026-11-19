/**
 * K-sample weighted log-rank tests (optionally stratified), matching R `survdiff`
 * for the Fleming–Harrington G(ρ) family, plus Gehan–Breslow and Tarone–Ware weights.
 */
import { invert, quadForm } from './linalg'
import { pchisqUpper } from './special'

export type LogRankWeight =
  | { type: 'logrank' }
  | { type: 'gehan' } // Gehan–Breslow generalized Wilcoxon: w = n(t)
  | { type: 'tarone' } // Tarone–Ware: w = √n(t)
  | { type: 'fh'; rho: number; gamma: number } // Fleming–Harrington: w = S(t−)^ρ (1 − S(t−))^γ, pooled KM

export interface LogRankInput {
  time: number[]
  status: number[]
  group: (number | string)[]
  strata?: (number | string)[]
}

export interface LogRankResult {
  groups: (number | string)[]
  n: number[]
  observed: number[]
  expected: number[]
  /** (O − E) per group (weighted if weights ≠ 1). */
  oMinusE: number[]
  variance: number[][]
  chisq: number
  df: number
  p: number
  /** Peto one-step HR estimate for 2 groups: exp((O₂ − E₂)/V) for group 2 vs group 1 (log-rank weights only). */
  hrPeto?: number
}

export function logRankTest(input: LogRankInput, weight: LogRankWeight = { type: 'logrank' }): LogRankResult {
  const groups = Array.from(new Set(input.group)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const K = groups.length
  const gIndex = new Map(groups.map((g, i) => [g, i]))
  const strataVals = input.strata ? Array.from(new Set(input.strata)) : [0]

  const obs = new Array(K).fill(0)
  const exp = new Array(K).fill(0)
  const oe = new Array(K).fill(0)
  const V = Array.from({ length: K }, () => new Array(K).fill(0))
  const nPer = new Array(K).fill(0)
  input.group.forEach((g) => nPer[gIndex.get(g)!]++)

  for (const s of strataVals) {
    const idx = input.time.map((_, i) => i).filter((i) => !input.strata || input.strata[i] === s)
    const evTimes = Array.from(new Set(idx.filter((i) => input.status[i]).map((i) => input.time[i]))).sort((a, b) => a - b)
    let pooledS = 1
    for (const t of evTimes) {
      const nj = new Array(K).fill(0)
      const dj = new Array(K).fill(0)
      for (const i of idx) {
        const k = gIndex.get(input.group[i])!
        if (input.time[i] >= t) nj[k]++
        if (input.time[i] === t && input.status[i]) dj[k]++
      }
      const nT = nj.reduce((a, b) => a + b, 0)
      const dT = dj.reduce((a, b) => a + b, 0)
      if (nT === 0 || dT === 0) continue
      let w = 1
      switch (weight.type) {
        case 'gehan':
          w = nT
          break
        case 'tarone':
          w = Math.sqrt(nT)
          break
        case 'fh':
          w = Math.pow(pooledS, weight.rho) * Math.pow(1 - pooledS, weight.gamma)
          break
      }
      const varFactor = nT > 1 ? (dT * (nT - dT)) / (nT - 1) : 0
      for (let k = 0; k < K; k++) {
        const e = (dT * nj[k]) / nT
        obs[k] += dj[k]
        exp[k] += e
        oe[k] += w * (dj[k] - e)
        for (let l = 0; l < K; l++) {
          const delta = k === l ? 1 : 0
          V[k][l] += ((w * w * varFactor * nj[k]) / nT) * (delta - nj[l] / nT)
        }
      }
      pooledS *= 1 - dT / nT
    }
  }

  // χ² on K−1 df using the first K−1 groups (generalized inverse)
  const sub = oe.slice(0, K - 1)
  const Vsub = V.slice(0, K - 1).map((r) => r.slice(0, K - 1))
  const inv = invert(Vsub)
  const chisq = inv ? quadForm(sub, inv) : 0
  const df = K - 1
  const result: LogRankResult = {
    groups,
    n: nPer,
    observed: obs,
    expected: exp,
    oMinusE: oe,
    variance: V,
    chisq,
    df,
    p: pchisqUpper(chisq, df),
  }
  if (K === 2 && weight.type === 'logrank' && V[1][1] > 0) result.hrPeto = Math.exp(oe[1] / V[1][1])
  return result
}
