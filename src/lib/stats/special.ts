/**
 * Special functions and reference distributions, accurate to near double precision.
 * Validated against R (pnorm, qnorm, pchisq, lgamma) in tests/special.test.ts.
 */

const SQRT2PI = 2.5066282746310002

/** Standard normal CDF Φ(x) — Hart (1968) as given by West (2005), ~1e-15 accuracy. */
export function pnorm(x: number): number {
  const ax = Math.abs(x)
  let c: number
  if (ax > 37) {
    c = 0
  } else {
    const e = Math.exp((-ax * ax) / 2)
    if (ax < 7.07106781186547) {
      let b = 3.52624965998911e-2 * ax + 0.700383064443688
      b = b * ax + 6.37396220353165
      b = b * ax + 33.912866078383
      b = b * ax + 112.079291497871
      b = b * ax + 221.213596169931
      b = b * ax + 220.206867912376
      c = e * b
      b = 8.83883476483184e-2 * ax + 1.75566716318264
      b = b * ax + 16.064177579207
      b = b * ax + 86.7807322029461
      b = b * ax + 296.564248779674
      b = b * ax + 637.333633378831
      b = b * ax + 793.826512519948
      b = b * ax + 440.413735824752
      c = c / b
    } else {
      let b = ax + 0.65
      b = ax + 4 / b
      b = ax + 3 / b
      b = ax + 2 / b
      b = ax + 1 / b
      c = e / b / SQRT2PI
    }
  }
  return x > 0 ? 1 - c : c
}

/** Standard normal density. */
export function dnorm(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT2PI
}

/** Standard normal quantile Φ⁻¹(p) — Acklam's algorithm + one Halley refinement. */
export function qnorm(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const plow = 0.02425
  let x: number
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p))
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= 1 - plow) {
    const q = p - 0.5
    const r = q * q
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  // Halley step
  const e = pnorm(x) - p
  const u = e * SQRT2PI * Math.exp((x * x) / 2)
  return x - u / (1 + (x * u) / 2)
}

/** log Γ(x) for x > 0 — Lanczos approximation (g = 7, n = 9). */
export function lgamma(x: number): number {
  const g = 7
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x)
  x -= 1
  let a = coef[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += coef[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/** Regularized lower incomplete gamma P(a, x). */
export function pgammaReg(a: number, x: number): number {
  if (x <= 0) return 0
  if (x < a + 1) {
    // series
    let sum = 1 / a
    let term = sum
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a))
  }
  return 1 - qgammaRegUpper(a, x)
}

/** Regularized upper incomplete gamma Q(a, x) via Lentz continued fraction (x ≥ a + 1). */
function qgammaRegUpper(a: number, x: number): number {
  const tiny = 1e-300
  let b = x + 1 - a
  let c = 1 / tiny
  let d = 1 / b
  let h = d
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < tiny) d = tiny
    c = b + an / c
    if (Math.abs(c) < tiny) c = tiny
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-16) break
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h
}

/** Upper tail of the χ² distribution: P(X > x), X ~ χ²(df). Accurate deep into the tail. */
export function pchisqUpper(x: number, df: number): number {
  if (x <= 0) return 1
  const a = df / 2
  const h = x / 2
  if (h < a + 1) return 1 - pgammaReg(a, h)
  return qgammaRegUpper(a, h)
}

/** Two-sided p-value for a standard normal statistic. */
export function pTwoSided(z: number): number {
  return 2 * pnorm(-Math.abs(z))
}

/** z critical value for a two-sided (1 − α) interval. */
export function zCrit(level = 0.95): number {
  return qnorm(1 - (1 - level) / 2)
}
