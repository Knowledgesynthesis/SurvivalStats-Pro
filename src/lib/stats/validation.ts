/**
 * Performance measures for survival prediction models.
 *  - Harrell's C (R `concordance` conventions; tied risk scores count ½, tied event times excluded)
 *  - Uno's C (IPCW-weighted, truncated at τ; Uno et al. 2011)
 *  - Brier score at t with inverse-probability-of-censoring weights (Graf et al. 1999)
 *  - Index of Prediction Accuracy, IPA = 1 − BS_model / BS_null (Kattan & Gerds 2018)
 *  - Grouped calibration at time t and calibration slope
 */
import { kaplanMeier, survAt } from './km'
import { coxph } from './cox'

export interface Concordance {
  c: number
  concordant: number
  discordant: number
  tiedRisk: number
  comparable: number
}

/** risk: higher value = higher predicted risk (e.g., Cox linear predictor). */
export function harrellC(time: number[], status: number[], risk: number[]): Concordance {
  let conc = 0
  let disc = 0
  let tied = 0
  const n = time.length
  for (let i = 0; i < n; i++) {
    if (!status[i]) continue
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const comparable = time[i] < time[j] || (time[i] === time[j] && !status[j])
      if (!comparable) continue
      if (risk[i] > risk[j]) conc++
      else if (risk[i] < risk[j]) disc++
      else tied++
    }
  }
  const comp = conc + disc + tied
  return { c: comp ? (conc + tied / 2) / comp : NaN, concordant: conc, discordant: disc, tiedRisk: tied, comparable: comp }
}

/** Kaplan–Meier of the censoring distribution, with Ĝ(t−) and Ĝ(t) lookups. */
export function censoringSurvival(time: number[], status: number[]) {
  const fit = kaplanMeier({ time, status: status.map((s) => (s ? 0 : 1)) })
  const Gat = (t: number) => survAt(fit, t)
  const Gminus = (t: number) => {
    let g = 1
    for (const r of fit.rows) {
      if (r.time < t) g = r.surv
      else break
    }
    return g
  }
  return { Gat, Gminus }
}

export function unoC(time: number[], status: number[], risk: number[], tau: number): number {
  const { Gminus } = censoringSurvival(time, status)
  let num = 0
  let den = 0
  const n = time.length
  for (let i = 0; i < n; i++) {
    if (!status[i] || time[i] >= tau) continue
    const g = Gminus(time[i])
    if (g <= 0) continue
    const w = 1 / (g * g)
    for (let j = 0; j < n; j++) {
      if (time[i] < time[j]) {
        den += w
        if (risk[i] > risk[j]) num += w
        else if (risk[i] === risk[j]) num += w / 2
      }
    }
  }
  return den ? num / den : NaN
}

/** IPCW Brier score at horizon t. survPred[i] = predicted S(t | xᵢ). */
export function brierScore(time: number[], status: number[], survPred: number[], t: number): number {
  const { Gat, Gminus } = censoringSurvival(time, status)
  const Gt = Gat(t)
  let s = 0
  for (let i = 0; i < time.length; i++) {
    if (time[i] <= t && status[i]) {
      const g = Gminus(time[i])
      if (g > 0) s += (survPred[i] * survPred[i]) / g
    } else if (time[i] > t && Gt > 0) {
      s += ((1 - survPred[i]) * (1 - survPred[i])) / Gt
    }
  }
  return s / time.length
}

/** Null-model (Kaplan–Meier, no covariates) Brier score and IPA. */
export function ipa(time: number[], status: number[], survPred: number[], t: number) {
  const km = kaplanMeier({ time, status })
  const s0 = survAt(km, t)
  const bsNull = brierScore(time, status, time.map(() => s0), t)
  const bsModel = brierScore(time, status, survPred, t)
  return { bsModel, bsNull, ipa: 1 - bsModel / bsNull }
}

export interface CalibrationGroup {
  group: number
  n: number
  predicted: number
  observed: number
  lower: number
  upper: number
}

/** Grouped calibration of predicted risk F(t|x) = 1 − S(t|x) against 1 − KM within risk groups. */
export function calibrationGroups(time: number[], status: number[], predRisk: number[], t: number, groups = 10): CalibrationGroup[] {
  const idx = predRisk.map((_, i) => i).sort((a, b) => predRisk[a] - predRisk[b])
  const out: CalibrationGroup[] = []
  for (let g = 0; g < groups; g++) {
    const lo = Math.floor((g * idx.length) / groups)
    const hi = Math.floor(((g + 1) * idx.length) / groups)
    const members = idx.slice(lo, hi)
    if (members.length < 2) continue
    const km = kaplanMeier({ time: members.map((i) => time[i]), status: members.map((i) => status[i]) })
    let r = km.rows[0]
    let found = false
    for (const row of km.rows) {
      if (row.time <= t) {
        r = row
        found = true
      }
    }
    const surv = found ? r.surv : 1
    out.push({
      group: g + 1,
      n: members.length,
      predicted: members.reduce((s, i) => s + predRisk[i], 0) / members.length,
      observed: 1 - surv,
      lower: found ? 1 - r.upper : 0,
      upper: found ? 1 - r.lower : 0,
    })
  }
  return out
}

/** Calibration slope: coefficient of the (validation-sample) Cox regression on the linear predictor. Ideal = 1. */
export function calibrationSlope(time: number[], status: number[], lp: number[]): { slope: number; se: number } {
  const fit = coxph({ time, status, x: lp.map((v) => [v]) })
  return { slope: fit.beta[0], se: fit.coefs[0].se }
}
