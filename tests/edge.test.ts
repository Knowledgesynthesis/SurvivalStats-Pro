/** Degenerate inputs the interactive labs can produce must never crash or return NaN silently. */
import { describe, expect, it } from 'vitest'
import { kaplanMeier, medianSurvival, rmst } from '../src/lib/stats/km'
import { logRankTest } from '../src/lib/stats/logrank'
import { coxph } from '../src/lib/stats/cox'
import { fitParametric } from '../src/lib/stats/parametric'
import { cumulativeIncidence, fineGray, causeSpecificCox } from '../src/lib/stats/competingRisks'
import { harrellC, brierScore, unoC, ipa } from '../src/lib/stats/validation'
import { mulberry32, rexp } from '../src/lib/stats/random'

describe('edge cases', () => {
  it('KM with every observation censored', () => {
    const fit = kaplanMeier({ time: [1, 2, 3], status: [0, 0, 0] })
    expect(fit.rows.every((r) => r.surv === 1)).toBe(true)
    expect(Number.isNaN(medianSurvival(fit).median)).toBe(true)
    expect(rmst(fit, 3).rmst).toBe(3)
  })
  it('KM with a single subject and with the last subject failing', () => {
    expect(kaplanMeier({ time: [5], status: [1] }).rows[0].surv).toBe(0)
    const fit = kaplanMeier({ time: [1, 2, 3], status: [1, 1, 1] }, { ciType: 'log-log' })
    expect(fit.rows.at(-1)!.surv).toBe(0)
    expect(fit.rows.every((r) => Number.isFinite(r.lower) && Number.isFinite(r.upper))).toBe(true)
  })
  it('log-rank when one group has no events', () => {
    const r = logRankTest({ time: [1, 2, 3, 4, 5, 6], status: [1, 1, 1, 0, 0, 0], group: [0, 0, 0, 1, 1, 1] })
    expect(Number.isFinite(r.chisq)).toBe(true)
    expect(r.p).toBeGreaterThan(0)
  })
  it('Cox flags monotone likelihood instead of returning garbage', () => {
    const fit = coxph({ time: [1, 2, 3, 4, 5, 6], status: [1, 1, 1, 0, 0, 0], x: [[1], [1], [1], [0], [0], [0]] })
    expect(fit.possiblyInfinite[0]).toBe(true)
    expect(Number.isFinite(fit.loglik)).toBe(true)
  })
  it('Cox with no events at all', () => {
    const fit = coxph({ time: [1, 2, 3], status: [0, 0, 0], x: [[1], [0], [1]] })
    expect(fit.beta[0]).toBe(0)
    expect(fit.nEvents).toBe(0)
  })
  it('parametric fit with no events stays finite', () => {
    const f = fitParametric('exponential', [1, 2, 3], [0, 0, 0])
    expect(Number.isFinite(f.loglik)).toBe(true)
  })
  it('CIF with no events, and Fine–Gray with no competing events equals Cox', () => {
    const aj = cumulativeIncidence({ time: [1, 2], cause: [0, 0] })
    expect(aj.rows.every((r) => r.surv === 1)).toBe(true)
    const rng = mulberry32(3)
    const time: number[] = []
    const cause: number[] = []
    const x: number[][] = []
    for (let i = 0; i < 80; i++) {
      const z = i % 2
      const t = rexp(rng, 0.1 * Math.exp(0.5 * z))
      const c = rexp(rng, 0.05)
      time.push(Math.min(t, c))
      cause.push(t <= c ? 1 : 0)
      x.push([z])
    }
    const fg = fineGray({ time, cause }, x, 1)
    const cs = causeSpecificCox({ time, cause }, x, 1)
    expect(Math.abs(fg.fit.beta[0] - cs.beta[0])).toBeLessThan(1e-8)
  })
  it('validation metrics: perfect ranking gives C = 1; null model gives IPA = 0', () => {
    const time = [1, 2, 3, 4, 5, 6, 7, 8]
    const status = [1, 1, 0, 1, 1, 0, 1, 1]
    const risk = time.map((t) => -t)
    expect(harrellC(time, status, risk).c).toBe(1)
    expect(unoC(time, status, risk, 8)).toBe(1)
    const km = kaplanMeier({ time, status })
    const s4 = km.rows.filter((r) => r.time <= 4).at(-1)!.surv
    const r = ipa(time, status, time.map(() => s4), 4)
    expect(Math.abs(r.ipa)).toBeLessThan(1e-12)
    expect(brierScore(time, status, time.map(() => 1), 0.5)).toBe(0)
  })
})
