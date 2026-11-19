/** Derivative-free optimisation and numerical Hessians for small maximum-likelihood problems. */
import { invert, type Mat, type Vec } from './linalg'

/** Nelder–Mead simplex minimisation. */
export function nelderMead(f: (x: Vec) => number, x0: Vec, opts: { step?: number; maxIter?: number; tol?: number } = {}): { x: Vec; value: number; iterations: number } {
  const n = x0.length
  const step = opts.step ?? 0.5
  const maxIter = opts.maxIter ?? 2000
  const tol = opts.tol ?? 1e-12
  const safe = (x: Vec) => {
    const v = f(x)
    return Number.isFinite(v) ? v : 1e300
  }
  let simplex: { x: Vec; v: number }[] = [{ x: x0.slice(), v: safe(x0) }]
  for (let i = 0; i < n; i++) {
    const x = x0.slice()
    x[i] += x[i] !== 0 ? step * Math.max(1, Math.abs(x[i])) * 0.5 : step
    simplex.push({ x, v: safe(x) })
  }
  let it = 0
  for (; it < maxIter; it++) {
    simplex.sort((a, b) => a.v - b.v)
    const best = simplex[0]
    const worst = simplex[n]
    if (Math.abs(worst.v - best.v) <= tol * (Math.abs(best.v) + tol)) break
    const centroid = new Array(n).fill(0)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i].x[j] / n
    const pt = (coef: number) => centroid.map((c, j) => c + coef * (worst.x[j] - c))
    const xr = pt(-1)
    const vr = safe(xr)
    if (vr < best.v) {
      const xe = pt(-2)
      const ve = safe(xe)
      simplex[n] = ve < vr ? { x: xe, v: ve } : { x: xr, v: vr }
    } else if (vr < simplex[n - 1].v) {
      simplex[n] = { x: xr, v: vr }
    } else {
      const outside = vr < worst.v
      const xc = pt(outside ? -0.5 : 0.5)
      const vc = safe(xc)
      if (vc < (outside ? vr : worst.v)) simplex[n] = { x: xc, v: vc }
      else {
        simplex = simplex.map((s, i) => {
          if (i === 0) return s
          const x = s.x.map((v, j) => best.x[j] + 0.5 * (v - best.x[j]))
          return { x, v: safe(x) }
        })
      }
    }
  }
  simplex.sort((a, b) => a.v - b.v)
  return { x: simplex[0].x, value: simplex[0].v, iterations: it }
}

/** Central-difference Hessian. */
export function numericHessian(f: (x: Vec) => number, x: Vec, h = 1e-4): Mat {
  const n = x.length
  const H: Mat = Array.from({ length: n }, () => new Array(n).fill(0))
  const fx = f(x)
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const hi = h * Math.max(1, Math.abs(x[i]))
      const hj = h * Math.max(1, Math.abs(x[j]))
      let v: number
      if (i === j) {
        const xp = x.slice()
        const xm = x.slice()
        xp[i] += hi
        xm[i] -= hi
        v = (f(xp) - 2 * fx + f(xm)) / (hi * hi)
      } else {
        const a = x.slice(), b = x.slice(), c = x.slice(), d = x.slice()
        a[i] += hi; a[j] += hj
        b[i] += hi; b[j] -= hj
        c[i] -= hi; c[j] += hj
        d[i] -= hi; d[j] -= hj
        v = (f(a) - f(b) - f(c) + f(d)) / (4 * hi * hj)
      }
      H[i][j] = v
      H[j][i] = v
    }
  }
  return H
}

/** Minimise with Nelder–Mead from several starts, then polish with Newton steps on a numerical Hessian. */
export function minimize(f: (x: Vec) => number, starts: Vec[]): { x: Vec; value: number; hessian: Mat; vcov: Mat | null } {
  let best = { x: starts[0], value: Infinity }
  for (const s of starts) {
    let r = nelderMead(f, s)
    r = nelderMead(f, r.x, { step: 0.1 })
    if (r.value < best.value) best = r
  }
  // Newton polish
  let x = best.x
  for (let k = 0; k < 8; k++) {
    const H = numericHessian(f, x)
    const g = x.map((_, i) => {
      const h = 1e-6 * Math.max(1, Math.abs(x[i]))
      const xp = x.slice()
      const xm = x.slice()
      xp[i] += h
      xm[i] -= h
      return (f(xp) - f(xm)) / (2 * h)
    })
    const Hi = invert(H)
    if (!Hi) break
    const step = Hi.map((row) => row.reduce((s, v, j) => s + v * g[j], 0))
    const xn = x.map((v, i) => v - step[i])
    if (f(xn) <= f(x) + 1e-12) x = xn
    else break
  }
  const hessian = numericHessian(f, x)
  return { x, value: f(x), hessian, vcov: invert(hessian) }
}
