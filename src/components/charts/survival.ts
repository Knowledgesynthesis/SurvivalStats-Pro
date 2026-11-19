import type { KMFit } from '@/lib/stats/km'
import type { BandSeries, Pt, Series, StepSeries } from './Plot'

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)']

/** Kaplan–Meier step curve (with censor ticks) and optional pointwise CI band. */
export function kmSeries(fit: KMFit, opts: { id: string; label: string; color: string; ci?: boolean; censorMarks?: boolean; extendTo?: number; dashed?: boolean; value?: 'surv' | 'risk' }): Series[] {
  const risk = opts.value === 'risk'
  const v = (s: number) => (risk ? 1 - s : s)
  const pts: Pt[] = [{ x: 0, y: v(1) }]
  const lo: { x: number; y0: number; y1: number }[] = [{ x: 0, y0: v(1), y1: v(1) }]
  const censor: Pt[] = []
  for (const r of fit.rows) {
    if (r.nEvent > 0) {
      pts.push({ x: r.time, y: v(r.surv) })
      const a = v(r.lower)
      const b = v(r.upper)
      lo.push({ x: r.time, y0: Math.min(a, b), y1: Math.max(a, b) })
    }
    if (r.nCensor > 0) censor.push({ x: r.time, y: v(r.surv) })
  }
  const last = fit.rows.length ? fit.rows[fit.rows.length - 1].time : 0
  const extendTo = opts.extendTo ?? last
  const step: StepSeries = { kind: 'step', id: opts.id, label: opts.label, color: opts.color, points: pts, extendTo, censor: opts.censorMarks === false ? undefined : censor, dashed: opts.dashed }
  const out: Series[] = []
  if (opts.ci) {
    const band: BandSeries = { kind: 'band', id: `${opts.id}-ci`, label: `${opts.label} 95% CI`, color: opts.color, points: [...lo, { ...lo[lo.length - 1], x: extendTo }], step: true, hideLegend: true, noTooltip: true }
    out.push(band)
  }
  out.push(step)
  return out
}

/** A smooth function sampled on a grid, as a line series. */
export function fnSeries(f: (t: number) => number, t0: number, t1: number, n: number, opts: { id: string; label: string; color: string; dashed?: boolean; width?: number }): Series {
  const points: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n
    const y = f(t)
    points.push({ x: t, y: Number.isFinite(y) ? y : NaN })
  }
  return { kind: 'line', ...opts, points }
}

/** Number at risk at chosen times from a KM fit. */
export function atRisk(fit: KMFit, times: number[]): number[] {
  return times.map((t) => {
    const next = fit.rows.find((r) => r.time >= t)
    return next ? next.nRisk : 0
  })
}
