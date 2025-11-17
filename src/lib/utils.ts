import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number to a fixed number of decimal places
 */
export function formatNumber(num: number, decimals: number = 3): string {
  return num.toFixed(decimals)
}

/**
 * Generate a random number between min and max
 */
export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Calculate percentile from sorted array
 */
export function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1

  if (lower === upper) {
    return sorted[lower]
  }

  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}
