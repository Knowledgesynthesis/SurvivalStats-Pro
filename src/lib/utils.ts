import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number with a fixed number of decimals, rendering NaN/∞ as an en dash or "NR". */
export function fmt(v: number | undefined, d = 2, nr = '–'): string {
  if (v === undefined || Number.isNaN(v)) return nr
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞'
  return v.toFixed(d)
}

/** p-value formatting following common journal style. */
export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return '–'
  if (p < 0.001) return '< 0.001'
  if (p < 0.01) return p.toFixed(3)
  return p.toFixed(2)
}

export function range(n: number, start = 0, step = 1): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step)
}

export function linspace(a: number, b: number, n: number): number[] {
  if (n < 2) return [a]
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))
}
