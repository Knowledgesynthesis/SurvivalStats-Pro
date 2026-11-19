/**
 * Multi-state models: the Aalen–Johansen estimator of state occupation probabilities for a
 * Markov process with right censoring, and closed forms for the illness–death model with
 * constant transition intensities.
 */

export interface MSInterval {
  id: number
  start: number
  stop: number
  /** state occupied during (start, stop] */
  from: number
  /** state entered at `stop`; null = censored */
  to: number | null
}

/**
 * Aalen–Johansen: p(t) = p(0) ∏ (I + dÂ(u)), dÂ_hj(u) = d_hj(u) / Y_h(u).
 * `nStates` states 0..nStates−1; everyone starts in state 0 at time 0 unless `initial` given.
 */
export function aalenJohansen(intervals: MSInterval[], nStates: number, initial?: number[]): { time: number; p: number[] }[] {
  // initial distribution: the state each subject occupies at the start of their first interval
  let p0 = initial
  if (!p0) {
    const first = new Map<number, MSInterval>()
    for (const r of intervals) {
      const f = first.get(r.id)
      if (!f || r.start < f.start) first.set(r.id, r)
    }
    p0 = new Array(nStates).fill(0)
    for (const r of first.values()) p0[r.from] += 1 / first.size
  }
  const times = Array.from(new Set(intervals.filter((r) => r.to !== null).map((r) => r.stop))).sort((a, b) => a - b)
  let p = p0.slice()
  const out = [{ time: 0, p: p.slice() }]
  for (const t of times) {
    const Y = new Array(nStates).fill(0)
    const d = Array.from({ length: nStates }, () => new Array(nStates).fill(0))
    for (const r of intervals) {
      if (r.start < t && t <= r.stop) Y[r.from]++
      if (r.stop === t && r.to !== null) d[r.from][r.to]++
    }
    const next = p.slice()
    for (let h = 0; h < nStates; h++) {
      if (Y[h] === 0) continue
      for (let j = 0; j < nStates; j++) {
        if (d[h][j] === 0) continue
        const move = (p[h] * d[h][j]) / Y[h]
        next[h] -= move
        next[j] += move
      }
    }
    p = next
    out.push({ time: t, p: p.slice() })
  }
  return out
}

export interface IllnessDeathRates {
  /** healthy → ill */
  a01: number
  /** healthy → dead */
  a02: number
  /** ill → dead */
  a12: number
}

/** Exact state occupation probabilities for the Markov illness–death model with constant intensities. */
export function illnessDeathProbs(t: number, { a01, a02, a12 }: IllnessDeathRates) {
  const a0 = a01 + a02
  const p0 = Math.exp(-a0 * t)
  const p1 = Math.abs(a0 - a12) < 1e-12 ? a01 * t * Math.exp(-a12 * t) : (a01 / (a0 - a12)) * (Math.exp(-a12 * t) - Math.exp(-a0 * t))
  const deadNoIllness = a0 > 0 ? (a02 / a0) * (1 - p0) : 0
  const deadAfterIllness = Math.max(0, 1 - p0 - p1 - deadNoIllness)
  return { healthy: p0, ill: p1, deadNoIllness, deadAfterIllness, dead: deadNoIllness + deadAfterIllness }
}
