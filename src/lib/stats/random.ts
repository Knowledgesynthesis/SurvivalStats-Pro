/**
 * Seedable pseudo-random number generation.
 *
 * mulberry32 is a small, fast 32-bit generator with good statistical quality for
 * simulation-based teaching. It never returns exactly 0, so -log(u) is always finite.
 */

export type RNG = () => number

export function mulberry32(seed: number): RNG {
  let a = (seed >>> 0) ^ 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    return r === 0 ? 2.3283064365386963e-10 : r
  }
}

/** Standard normal deviate (Box–Muller). */
export function rnorm(rng: RNG, mean = 0, sd = 1): number {
  const u1 = rng()
  const u2 = rng()
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/** Exponential deviate with the given rate (mean 1/rate). */
export function rexp(rng: RNG, rate: number): number {
  return -Math.log(rng()) / rate
}

/** Uniform deviate on [a, b). */
export function runif(rng: RNG, a = 0, b = 1): number {
  return a + (b - a) * rng()
}

export function rbern(rng: RNG, p: number): number {
  return rng() < p ? 1 : 0
}

/** Gamma deviate (shape k, scale θ) via Marsaglia & Tsang (2000). */
export function rgamma(rng: RNG, shape: number, scale = 1): number {
  if (shape < 1) {
    // Boost: Gamma(k) = Gamma(k+1) * U^(1/k)
    return rgamma(rng, shape + 1, scale) * Math.pow(rng(), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number
    let v: number
    do {
      x = rnorm(rng)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rng()
    if (u < 1 - 0.0331 * x ** 4) return d * v * scale
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale
  }
}

/** Poisson deviate (inversion; adequate for the small means used in teaching). */
export function rpois(rng: RNG, mean: number): number {
  if (mean <= 0) return 0
  if (mean > 50) return Math.max(0, Math.round(rnorm(rng, mean, Math.sqrt(mean))))
  const L = Math.exp(-mean)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(rng: RNG, arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
