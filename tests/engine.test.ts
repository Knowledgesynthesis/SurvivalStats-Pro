/**
 * Validates the statistics engine against R 4.3 / survival 3.5.8.
 * Reference values are produced by tests/reference/make_fixtures.R.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { kaplanMeier, medianSurvival, rmst } from '../src/lib/stats/km'
import { logRankTest } from '../src/lib/stats/logrank'
import { coxph, coxZph } from '../src/lib/stats/cox'
import { fitParametric } from '../src/lib/stats/parametric'
import { cumulativeIncidence, fineGray, causeSpecificCox } from '../src/lib/stats/competingRisks'
import { aalenJohansen, illnessDeathProbs } from '../src/lib/stats/multistate'
import { harrellC } from '../src/lib/stats/validation'
import { pnorm, qnorm, pchisqUpper, lgamma } from '../src/lib/stats/special'
import { lowess } from '../src/lib/stats/smooth'
import { eventsSchoenfeld, powerSchoenfeld } from '../src/lib/stats/design'
import { mulberry32 } from '../src/lib/stats/random'
import { samplePiecewiseExp, piecewiseCumHaz } from '../src/lib/stats/simulate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const R: any = JSON.parse(readFileSync(new URL('./fixtures/r_reference.json', import.meta.url), 'utf8'))
const A = (v: unknown): number[] => (Array.isArray(v) ? v : [v]) as number[]
const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)))
const closeArr = (a: number[], bIn: number[] | number, tol = 1e-6) => {
  const b = A(bIn)
  expect(a.length).toBe(b.length)
  a.forEach((v, i) => close(v, b[i], tol))
}
const cols = (d: Record<string, unknown[]>, names: string[]) => (d[names[0]] as number[]).map((_, i) => names.map((n) => d[n][i] as number))

describe('special functions', () => {
  it('pnorm / qnorm / pchisq / lgamma match R', () => {
    R.special.z.forEach((z: number, i: number) => close(pnorm(z), R.special.pnorm[i], 1e-12))
    R.special.p.forEach((p: number, i: number) => close(qnorm(p), R.special.qnorm[i], 1e-9))
    R.special.chisq_x.forEach((x: number, i: number) => {
      const ref = R.special.pchisq_upper[i]
      expect(Math.abs(pchisqUpper(x, R.special.chisq_df[i]) - ref) / ref).toBeLessThan(1e-9)
    })
    R.special.lgamma_x.forEach((x: number, i: number) => close(lgamma(x), R.special.lgamma[i], 1e-12))
  })
})

describe('Kaplan–Meier (Freireich 6-MP arm)', () => {
  const mp = { time: [] as number[], status: [] as number[] }
  R.leuk.time.forEach((t: number, i: number) => {
    if (R.leuk.placebo[i] === 0) {
      mp.time.push(t)
      mp.status.push(R.leuk.status[i])
    }
  })
  for (const [type, key] of [['log', 'log'], ['log-log', 'loglog'], ['plain', 'plain']] as const) {
    it(`survival, Greenwood SE and ${type} CI match survfit`, () => {
      const fit = kaplanMeier(mp, { ciType: type })
      const ref = R.km_leuk[key]
      closeArr(fit.rows.map((r) => r.time), ref.time, 0)
      closeArr(fit.rows.map((r) => r.nRisk), ref.n_risk, 0)
      closeArr(fit.rows.map((r) => r.surv), ref.surv, 1e-12)
      closeArr(fit.rows.map((r) => r.sigma), ref.std_err, 1e-12)
      closeArr(fit.rows.map((r) => r.cumhaz), ref.cumhaz, 1e-12)
      fit.rows.forEach((r, i) => {
        if (ref.lower[i] !== null && ref.lower[i] !== 'NA') close(r.lower, ref.lower[i], 1e-10)
        if (ref.upper[i] !== null && ref.upper[i] !== 'NA') close(r.upper, ref.upper[i], 1e-10)
      })
    })
  }
  it('textbook values: S(6)=0.857, S(23)=0.448', () => {
    const fit = kaplanMeier(mp)
    close(fit.rows.find((r) => r.time === 6)!.surv, 18 / 21, 1e-12)
    close(fit.rows.find((r) => r.time === 23)!.surv, 0.4482, 1e-3)
  })
  it('median and CI match R', () => {
    const m = medianSurvival(kaplanMeier(mp))
    expect(m.median).toBe(R.km_leuk.median_mp[0])
    expect(m.lower).toBe(R.km_leuk.median_mp[1])
    const placebo = {
      time: R.leuk.time.filter((_: number, i: number) => R.leuk.placebo[i] === 1),
      status: R.leuk.status.filter((_: number, i: number) => R.leuk.placebo[i] === 1),
    }
    const mp2 = medianSurvival(kaplanMeier(placebo))
    expect(mp2.median).toBe(R.km_leuk.median_pl[0])
    expect(mp2.lower).toBe(R.km_leuk.median_pl[1])
    expect(mp2.upper).toBe(R.km_leuk.median_pl[2])
  })
  it('RMST(30) and SE match survfit rmean', () => {
    const r = rmst(kaplanMeier(mp), 30)
    close(r.rmst, R.km_leuk.rmean_mp[0], 1e-10)
    close(r.se, R.km_leuk.rmean_mp[1], 1e-8)
  })
})

describe('Kaplan–Meier with ties, medians and left truncation (simulated d1)', () => {
  const d1 = R.d1
  it('median, CI and RMST(15)', () => {
    const fit = kaplanMeier({ time: d1.time, status: d1.status })
    const m = medianSurvival(fit)
    close(m.median, R.km_d1.median[0], 1e-12)
    close(m.lower, R.km_d1.median[1], 1e-12)
    close(m.upper, R.km_d1.median[2], 1e-12)
    const r = rmst(fit, 15)
    close(r.rmst, R.km_d1.rmean[0], 1e-10)
    close(r.se, R.km_d1.rmean[1], 1e-8)
  })
  it('delayed entry risk sets', () => {
    const fit = kaplanMeier({ time: d1.time, status: d1.status, entry: R.d1_entry })
    closeArr(fit.rows.map((r) => r.time), R.km_d1_trunc.time, 0)
    closeArr(fit.rows.map((r) => r.nRisk), R.km_d1_trunc.n_risk, 0)
    closeArr(fit.rows.map((r) => r.surv), R.km_d1_trunc.surv, 1e-12)
  })
})

describe('log-rank family', () => {
  it('two-group log-rank and Peto–Peto (ρ = 1) match survdiff', () => {
    const lr = logRankTest({ time: R.leuk.time, status: R.leuk.status, group: R.leuk.placebo })
    close(lr.chisq, R.logrank_leuk.chisq, 1e-10)
    closeArr(lr.observed, R.logrank_leuk.obs, 1e-12)
    closeArr(lr.expected, R.logrank_leuk.exp, 1e-10)
    const fh = logRankTest({ time: R.leuk.time, status: R.leuk.status, group: R.leuk.placebo }, { type: 'fh', rho: 1, gamma: 0 })
    close(fh.chisq, R.logrank_leuk.chisq_rho1, 1e-10)
  })
  it('three-group and stratified log-rank', () => {
    const lr3 = logRankTest({ time: R.d1.time, status: R.d1.status, group: R.d1.g })
    close(lr3.chisq, R.logrank_d1_3grp.chisq, 1e-9)
    const st = logRankTest({ time: R.d1.time, status: R.d1.status, group: R.d1.x2, strata: R.d1.g })
    close(st.chisq, R.logrank_d1_3grp.chisq_strat, 1e-9)
  })
})

describe('Cox proportional hazards', () => {
  for (const ties of ['efron', 'breslow'] as const) {
    it(`leukemia (${ties}): coef, SE, log-likelihood, score/Wald tests, concordance`, () => {
      const fit = coxph({ time: R.leuk.time, status: R.leuk.status, x: R.leuk.placebo.map((v: number) => [v]) }, { ties })
      const ref = R[`cox_leuk_${ties}`]
      close(fit.beta[0], A(ref.coef)[0], 1e-7)
      close(fit.coefs[0].se, A(ref.se)[0], 1e-6)
      close(fit.loglik0, ref.loglik[0], 1e-10)
      close(fit.loglik, ref.loglik[1], 1e-9)
      close(fit.scoreTest.chisq, ref.score, 1e-9)
      close(fit.waldTest.chisq, ref.wald, 1e-6)
      close(harrellC(R.leuk.time, R.leuk.status, fit.linearPredictor).c, ref.concordance, 1e-10)
    })
    it(`3 covariates with ties (${ties}): estimates, baseline hazard, residuals, PH test`, () => {
      const x = cols(R.d1, ['x1', 'x2', 'x3'])
      const fit = coxph({ time: R.d1.time, status: R.d1.status, x }, { ties })
      const ref = R[`cox_d1_${ties}`]
      closeArr(fit.beta, ref.coef, 1e-7)
      closeArr(fit.coefs.map((c) => c.se), ref.se, 1e-6)
      close(fit.loglik, ref.loglik[1], 1e-10)
      close(fit.scoreTest.chisq, ref.score, 1e-8)
      close(harrellC(R.d1.time, R.d1.status, fit.linearPredictor).c, ref.concordance, 1e-10)
      const base = fit.baseline.get('_')!
      closeArr(base.map((b) => b.cumhaz), ref.basehaz.filter((_: number, i: number) => base.some((b) => b.time === ref.basehaz_time[i])), 1e-7)
      const sch = fit.schoenfeld.map((s) => s.resid)
      expect(sch.length).toBe(ref.schoenfeld.length)
      // R orders tied event times by the input order within each time; compare per-time sums
      const byTime = (rows: number[][], times: number[]) => {
        const m = new Map<number, number[]>()
        rows.forEach((r, i) => m.set(times[i], (m.get(times[i]) ?? [0, 0, 0]).map((v, j) => v + r[j])))
        return m
      }
      const mine = byTime(sch, fit.schoenfeld.map((s) => s.time))
      const theirs = byTime(ref.schoenfeld, ref.sch_time)
      for (const [t, v] of theirs) closeArr(mine.get(t)!, v, 1e-7)
      closeArr(fit.martingale, ref.martingale, 1e-7)
      const zph = coxZph(fit, { time: R.d1.time, status: R.d1.status }, 'km')
      closeArr(zph.terms.map((t) => t.chisq), ref.zph_old_chisq, 1e-6)
      close(zph.global.chisq, ref.zph_old_global, 1e-6)
    })
  }
  it('ridge penalty matches coxph(ridge(theta = 5))', () => {
    const fit = coxph({ time: R.d1.time, status: R.d1.status, x: cols(R.d1, ['x1', 'x2', 'x3']) }, { ties: 'breslow', ridge: 5 })
    closeArr(fit.beta, R.cox_d1_ridge5.coef, 1e-6)
  })
  it('stratified Cox', () => {
    const fit = coxph({ time: R.d1.time, status: R.d1.status, x: cols(R.d1, ['x1', 'x2']), strata: R.d1.g })
    closeArr(fit.beta, R.cox_d1_strata.coef, 1e-7)
    closeArr(fit.coefs.map((c) => c.se), R.cox_d1_strata.se, 1e-6)
    close(fit.loglik, R.cox_d1_strata.loglik[1], 1e-10)
  })
  it('counting-process (start, stop] time-varying covariate', () => {
    const fit = coxph({ start: R.cp.start, time: R.cp.stop, status: R.cp.status, x: R.cp.z.map((v: number) => [v]) })
    close(fit.beta[0], A(R.cox_cp.coef)[0], 1e-7)
    close(fit.coefs[0].se, A(R.cox_cp.se)[0], 1e-6)
    close(fit.loglik, R.cox_cp.loglik[1], 1e-10)
  })
  it('Andersen–Gill recurrent events: naive and robust (clustered) SE', () => {
    const fit = coxph({ start: R.rec.start, time: R.rec.stop, status: R.rec.status, x: R.rec.x.map((v: number) => [v]), cluster: R.rec.id }, { ties: 'breslow' })
    close(fit.beta[0], A(R.cox_rec.coef)[0], 1e-7)
    close(fit.coefs[0].se, A(R.cox_rec.se_naive)[0], 1e-6)
    close(fit.coefs[0].robustSe!, A(R.cox_rec.se_robust)[0], 1e-5)
  })
})

describe('competing risks', () => {
  const cr = { time: R.cr.time as number[], cause: R.cr.cause as number[] }
  it('Aalen–Johansen CIF matches survfit multi-state', () => {
    const aj = cumulativeIncidence(cr)
    const ref = R.cif_cr
    // R pstate columns: (s0), 1, 2
    const t = aj.rows.map((r) => r.time)
    closeArr(t, ref.time, 0)
    aj.rows.forEach((r, i) => {
      close(r.surv, ref.pstate[i][0], 1e-10)
      close(r.cif[0], ref.pstate[i][1], 1e-10)
      close(r.cif[1], ref.pstate[i][2], 1e-10)
    })
  })
  it('Fine–Gray matches finegray() + coxph()', () => {
    const x = cols(R.cr, ['z1', 'z2'])
    const fg = fineGray(cr, x, 1)
    closeArr(fg.fit.beta, R.finegray_cr.coef, 1e-6)
    closeArr(fg.fit.coefs.map((c) => c.se), R.finegray_cr.se, 1e-5)
    closeArr(fg.fit.coefs.map((c) => c.robustSe!), R.finegray_cr.se_robust, 1e-4)
  })
  it('cause-specific Cox', () => {
    const fit = causeSpecificCox(cr, cols(R.cr, ['z1', 'z2']), 1)
    closeArr(fit.beta, R.cscox_cr.coef, 1e-7)
  })
})

describe('multi-state', () => {
  it('Aalen–Johansen state occupation matches survfit (illness–death)', () => {
    const code = (s: string) => ({ healthy: 0, ill: 1, dead: 2 })[s] as number
    const intervals = R.ms.id.map((id: number, i: number) => ({
      id,
      start: R.ms.start[i],
      stop: R.ms.stop[i],
      from: code(R.ms.from[i]),
      to: R.ms.to[i] === 'censor' ? null : code(R.ms.to[i]),
    }))
    const aj = aalenJohansen(intervals, 3)
    const ref = R.aj_ms
    const idx = (s: string) => ref.states.indexOf(s)
    // compare at R's reported times (R includes censoring times; ours only transition times)
    ref.time.forEach((t: number, i: number) => {
      let row = aj[0]
      for (const r of aj) if (r.time <= t) row = r
      close(row.p[0], ref.pstate[i][idx('healthy')], 1e-10)
      close(row.p[1], ref.pstate[i][idx('ill')], 1e-10)
      close(row.p[2], ref.pstate[i][idx('dead')], 1e-10)
    })
  })
  it('closed-form illness–death probabilities sum to one and match simulation', () => {
    const rates = { a01: 0.15, a02: 0.07, a12: 0.25 }
    const p = illnessDeathProbs(6, rates)
    close(p.healthy + p.ill + p.dead, 1, 1e-12)
    const rng = mulberry32(7)
    let ill = 0
    const N = 40000
    for (let i = 0; i < N; i++) {
      const a = -Math.log(rng()) / rates.a01
      const b = -Math.log(rng()) / rates.a02
      if (a < b && a < 6) {
        const d = a - Math.log(rng()) / rates.a12
        if (d > 6) ill++
      }
    }
    close(ill / N, p.ill, 0.03)
  })
})

describe('parametric MLE', () => {
  const { time, status } = R.par
  it('exponential / Weibull / log-normal / log-logistic match survreg', () => {
    const e = fitParametric('exponential', time, status)
    close(e.params.rate, Math.exp(-A(R.survreg.exponential.coef)[0]), 1e-6)
    close(e.loglik, R.survreg.exponential.loglik, 1e-8)
    const w = fitParametric('weibull', time, status)
    close(w.params.shape, 1 / R.survreg.weibull.scale, 1e-5)
    close(w.params.scale, Math.exp(A(R.survreg.weibull.coef)[0]), 1e-5)
    close(w.loglik, R.survreg.weibull.loglik, 1e-8)
    const ln = fitParametric('lognormal', time, status)
    close(ln.params.meanlog, A(R.survreg.lognormal.coef)[0], 1e-5)
    close(ln.params.sdlog, R.survreg.lognormal.scale, 1e-5)
    close(ln.loglik, R.survreg.lognormal.loglik, 1e-8)
    const ll = fitParametric('loglogistic', time, status)
    close(ll.params.shape, 1 / R.survreg.loglogistic.scale, 1e-5)
    close(ll.loglik, R.survreg.loglogistic.loglik, 1e-8)
  })
  it('Gompertz matches optim()', () => {
    const g = fitParametric('gompertz', time, status)
    close(g.loglik, R.gompertz.loglik, 1e-8)
    close(g.params.shape, R.gompertz.shape, 1e-4)
    close(g.params.rate, R.gompertz.rate, 1e-4)
  })
})

describe('utilities', () => {
  it('lowess matches R', () => {
    const lw = lowess(R.lowess.x, R.lowess.y)
    closeArr(lw.y, R.lowess.fy, 1e-9)
  })
  it('Schoenfeld sample size: HR 0.7, 80% power → 247 events', () => {
    expect(Math.ceil(eventsSchoenfeld(0.7))).toBe(247)
    close(powerSchoenfeld(247, 0.7), 0.8, 2e-3)
  })
  it('piecewise-exponential sampler reproduces its survival function', () => {
    const rng = mulberry32(42)
    const cuts = [0, 3, 8]
    const rates = [0.05, 0.2, 0.1]
    const N = 50000
    let alive5 = 0
    for (let i = 0; i < N; i++) if (samplePiecewiseExp(rng, cuts, rates) > 5) alive5++
    close(alive5 / N, Math.exp(-piecewiseCumHaz(5, cuts, rates)), 0.01)
  })
})
