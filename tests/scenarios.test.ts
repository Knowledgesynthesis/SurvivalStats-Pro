/** The labs claim specific statistical behaviour; these checks make sure the simulations deliver it. */
import { describe, expect, it } from 'vitest'
import { simSingle, simInformative, simDelayedEntry, simTwoArm, twoArmSpec, simCompeting, simImmortal } from '../src/lib/scenarios'
import { kaplanMeier, survAt } from '../src/lib/stats/km'
import { coxph } from '../src/lib/stats/cox'
import { cumulativeIncidence } from '../src/lib/stats/competingRisks'

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length

describe('lab simulations behave as described', () => {
  it('KM is unbiased under independent censoring (naive-censoring lab)', () => {
    const est = Array.from({ length: 300 }, (_, s) => survAt(kaplanMeier(simSingle(s + 1, 400, 12, 0.6, 36)), 12))
    expect(Math.abs(mean(est) - 0.5)).toBeLessThan(0.006)
  })
  it('target censored share is roughly achieved', () => {
    const d = simSingle(5, 4000, 12, 0.4, 1000)
    expect(Math.abs(d.status.filter((s) => !s).length / 4000 - 0.4)).toBeLessThan(0.03)
  })
  it('informative censoring biases KM upward; independent does not', () => {
    const bias = (dep: number) => mean(Array.from({ length: 100 }, (_, s) => { const d = simInformative(s + 1, 600, dep); return survAt(kaplanMeier(d), 24) - d.trueSurv(24) }))
    expect(Math.abs(bias(1))).toBeLessThan(0.01)
    expect(bias(5)).toBeGreaterThan(0.04)
  })
  it('delayed-entry KM is unbiased; ignoring entry is biased upward', () => {
    const r = Array.from({ length: 80 }, (_, s) => {
      const d = simDelayedEntry(s + 1, 600, 24)
      return [survAt(kaplanMeier(d), 30) - d.trueSurv(30), survAt(kaplanMeier({ time: d.time, status: d.status }), 30) - d.trueSurv(30)]
    })
    expect(Math.abs(mean(r.map((x) => x[0])))).toBeLessThan(0.02)
    expect(mean(r.map((x) => x[1]))).toBeGreaterThan(0.05)
  })
  it('PH two-arm scenario recovers the HR', () => {
    const spec = twoArmSpec('ph', 12, 0.6, 6)
    const hrs = Array.from({ length: 60 }, (_, s) => { const d = simTwoArm(s + 1, 300, spec, 48); return coxph({ time: d.time, status: d.status, x: d.group.map((g) => [g]) }).beta[0] })
    expect(Math.abs(Math.exp(mean(hrs)) - 0.6)).toBeLessThan(0.03)
  })
  it('Aalen–Johansen matches the exact CIF in the competing-risks simulation', () => {
    const errs = Array.from({ length: 60 }, (_, s) => {
      const d = simCompeting(s + 1, 800, 0.04, 0.03, 1, 1)
      const aj = cumulativeIncidence({ time: d.time, cause: d.cause })
      let f = 0
      for (const r of aj.rows) if (r.time <= 24) f = r.cif[0]
      return f - d.trueCIF(1, 0)(24)
    })
    expect(Math.abs(mean(errs))).toBeLessThan(0.01)
  })
  it('immortal time: naive analysis finds a spurious benefit; time-dependent Cox does not', () => {
    const res = Array.from({ length: 40 }, (_, s) => {
      const rows = simImmortal(s + 1, 600, 1)
      const naive = coxph({ time: rows.map((r) => r.time), status: rows.map((r) => r.status), x: rows.map((r) => [r.responded]) }).beta[0]
      const start: number[] = [], stop: number[] = [], st: number[] = [], x: number[][] = []
      for (const r of rows) {
        if (r.responded && r.R > 0) {
          start.push(0); stop.push(r.R); st.push(0); x.push([0])
          start.push(r.R); stop.push(r.time); st.push(r.status); x.push([1])
        } else { start.push(0); stop.push(r.time); st.push(r.status); x.push([0]) }
      }
      const td = coxph({ start, time: stop, status: st, x }).beta[0]
      return [naive, td]
    })
    expect(Math.exp(mean(res.map((r) => r[0])))).toBeLessThan(0.6)
    expect(Math.abs(Math.exp(mean(res.map((r) => r[1]))) - 1)).toBeLessThan(0.08)
  })
})
