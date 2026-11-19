/**
 * LOWESS scatterplot smoother — a direct port of R's stats::lowess (C routine clowess,
 * Cleveland 1979), including the δ-interpolation shortcut, so diagnostic smooths match R.
 */
export function lowess(xIn: number[], yIn: number[], f = 2 / 3, iter = 3, deltaIn?: number): { x: number[]; y: number[] } {
  const n = xIn.length
  if (n < 2) return { x: xIn.slice(), y: yIn.slice() }
  const order = xIn.map((_, i) => i).sort((a, b) => xIn[a] - xIn[b])
  const x = order.map((i) => xIn[i])
  const y = order.map((i) => yIn[i])
  const delta = deltaIn ?? 0.01 * (x[n - 1] - x[0])
  const ns = Math.max(2, Math.min(n, Math.floor(f * n + 1e-7)))
  const ys = new Array(n).fill(0)
  const rw = new Array(n).fill(1)
  const res = new Array(n).fill(0)

  // local weighted linear fit at xs using points nleft..nright (0-based)
  const lowest = (xs: number, nleft: number, nright: number, userw: boolean): number | null => {
    const range = x[n - 1] - x[0]
    const h = Math.max(xs - x[nleft], x[nright] - xs)
    const h9 = 0.999 * h
    const h1 = 0.001 * h
    const w = new Array(n).fill(0)
    let a = 0
    let j = nleft
    while (j < n) {
      const r = Math.abs(x[j] - xs)
      if (r <= h9) {
        w[j] = r <= h1 ? 1 : (1 - (r / h) ** 3) ** 3
        if (userw) w[j] *= rw[j]
        a += w[j]
      } else if (x[j] > xs) break
      j++
    }
    const nrt = j - 1
    if (a <= 0) return null
    for (let k = nleft; k <= nrt; k++) w[k] /= a
    if (h > 0) {
      a = 0
      for (let k = nleft; k <= nrt; k++) a += w[k] * x[k]
      let b = xs - a
      let c = 0
      for (let k = nleft; k <= nrt; k++) c += w[k] * (x[k] - a) * (x[k] - a)
      if (Math.sqrt(c) > 0.001 * range) {
        b /= c
        for (let k = nleft; k <= nrt; k++) w[k] *= b * (x[k] - a) + 1
      }
    }
    let out = 0
    for (let k = nleft; k <= nrt; k++) out += w[k] * y[k]
    return out
  }

  for (let it = 1; it <= iter + 1; it++) {
    let nleft = 0
    let nright = ns - 1
    let last = -1
    let i = 0
    for (;;) {
      if (nright < n - 1) {
        const d1 = x[i] - x[nleft]
        const d2 = x[nright + 1] - x[i]
        if (d1 > d2) {
          nleft++
          nright++
          continue
        }
      }
      const fit = lowest(x[i], nleft, nright, it > 1)
      ys[i] = fit === null ? y[i] : fit
      if (last < i - 1) {
        const denom = x[i] - x[last]
        for (let j = last + 1; j < i; j++) {
          const alpha = (x[j] - x[last]) / denom
          ys[j] = alpha * ys[i] + (1 - alpha) * ys[last]
        }
      }
      last = i
      const cut = x[last] + delta
      for (i = last + 1; i < n; i++) {
        if (x[i] > cut) break
        if (x[i] === x[last]) {
          ys[i] = ys[last]
          last = i
        }
      }
      i = Math.max(last + 1, i - 1)
      if (last >= n - 1) break
    }
    for (let k = 0; k < n; k++) res[k] = y[k] - ys[k]
    if (it > iter) break
    const sc = res.reduce((s, r) => s + Math.abs(r), 0) / n
    const abs = res.map(Math.abs).sort((a, b) => a - b)
    const m1 = Math.floor(n / 2)
    const cmad = n % 2 === 0 ? 3 * (abs[m1] + abs[n - m1 - 1]) : 6 * abs[m1]
    if (cmad < 1e-7 * sc) break
    const c9 = 0.999 * cmad
    const c1 = 0.001 * cmad
    for (let k = 0; k < n; k++) {
      const r = Math.abs(res[k])
      rw[k] = r <= c1 ? 1 : r <= c9 ? (1 - (r / cmad) ** 2) ** 2 : 0
    }
  }
  return { x, y: ys }
}
