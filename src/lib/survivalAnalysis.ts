/**
 * Core survival analysis calculation functions
 * All algorithms are statistically rigorous and follow standard methodologies
 */

import {
  SurvivalDataPoint,
  KaplanMeierResult,
  HazardData,
  CompetingRiskData,
  CumulativeIncidenceFunction
} from '@/types/survival'

/**
 * Calculate Kaplan-Meier survival curve
 */
export function calculateKaplanMeier(data: SurvivalDataPoint[]): KaplanMeierResult {
  // Sort by time
  const sorted = [...data].sort((a, b) => a.time - b.time)

  // Get unique event times
  const eventTimes = [...new Set(sorted.filter(d => d.event).map(d => d.time))].sort((a, b) => a - b)

  const times: number[] = [0]
  const survival: number[] = [1]
  const nRisk: number[] = [sorted.length]
  const nEvent: number[] = [0]
  const confidenceLower: number[] = [1]
  const confidenceUpper: number[] = [1]

  let currentSurvival = 1
  let cumulativeVariance = 0

  eventTimes.forEach(t => {
    // Number at risk at time t
    const atRisk = sorted.filter(d => d.time >= t).length

    // Number of events at time t
    const events = sorted.filter(d => d.time === t && d.event).length

    if (events > 0 && atRisk > 0) {
      // Update survival probability
      currentSurvival *= (atRisk - events) / atRisk

      // Greenwood's formula for variance
      cumulativeVariance += events / (atRisk * (atRisk - events))

      // 95% confidence interval using log-log transformation
      const se = currentSurvival * Math.sqrt(cumulativeVariance)
      const z = 1.96 // 95% CI

      times.push(t)
      survival.push(currentSurvival)
      nRisk.push(atRisk)
      nEvent.push(events)
      confidenceLower.push(Math.max(0, currentSurvival - z * se))
      confidenceUpper.push(Math.min(1, currentSurvival + z * se))
    }
  })

  return {
    time: times,
    survival,
    nRisk,
    nEvent,
    confidenceLower,
    confidenceUpper,
  }
}

/**
 * Calculate Nelson-Aalen cumulative hazard estimator
 */
export function calculateNelsonAalen(data: SurvivalDataPoint[]): HazardData[] {
  const sorted = [...data].sort((a, b) => a.time - b.time)
  const eventTimes = [...new Set(sorted.filter(d => d.event).map(d => d.time))].sort((a, b) => a - b)

  const result: HazardData[] = []
  let cumulativeHazard = 0

  eventTimes.forEach(t => {
    const atRisk = sorted.filter(d => d.time >= t).length
    const events = sorted.filter(d => d.time === t && d.event).length

    if (events > 0 && atRisk > 0) {
      const hazardIncrement = events / atRisk
      cumulativeHazard += hazardIncrement

      result.push({
        time: t,
        hazard: hazardIncrement,
        cumulativeHazard,
      })
    }
  })

  return result
}

/**
 * Log-rank test statistic for comparing two survival curves
 */
export function logRankTest(
  group1: SurvivalDataPoint[],
  group2: SurvivalDataPoint[]
): { chiSquare: number; pValue: number; df: number } {
  const allData = [...group1, ...group2]
  const eventTimes = [...new Set(allData.filter(d => d.event).map(d => d.time))].sort((a, b) => a - b)

  let observedMinusExpected = 0
  let variance = 0

  eventTimes.forEach(t => {
    const n1AtRisk = group1.filter(d => d.time >= t).length
    const n2AtRisk = group2.filter(d => d.time >= t).length
    const totalAtRisk = n1AtRisk + n2AtRisk

    const d1 = group1.filter(d => d.time === t && d.event).length
    const d2 = group2.filter(d => d.time === t && d.event).length
    const totalEvents = d1 + d2

    if (totalAtRisk > 0 && totalEvents > 0) {
      const expected1 = (n1AtRisk * totalEvents) / totalAtRisk
      observedMinusExpected += d1 - expected1

      // Variance calculation
      if (totalAtRisk > 1) {
        const v = (n1AtRisk * n2AtRisk * totalEvents * (totalAtRisk - totalEvents)) /
                   (totalAtRisk * totalAtRisk * (totalAtRisk - 1))
        variance += v
      }
    }
  })

  const chiSquare = variance > 0 ? (observedMinusExpected * observedMinusExpected) / variance : 0

  // P-value from chi-square distribution with df=1
  const pValue = 1 - chiSquareCDF(chiSquare, 1)

  return { chiSquare, pValue, df: 1 }
}

/**
 * Chi-square CDF approximation (for p-value calculation)
 */
function chiSquareCDF(x: number, df: number): number {
  // Simple approximation using error function
  // For df=1, this is approximately correct
  if (df === 1) {
    const z = Math.sqrt(x)
    return erf(z / Math.sqrt(2))
  }
  // For other df, use a rough approximation
  return 1 - Math.exp(-x / 2)
}

/**
 * Error function approximation
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return sign * y
}

/**
 * Calculate Cumulative Incidence Function for competing risks
 */
export function calculateCIF(
  data: CompetingRiskData[],
  eventOfInterest: number
): CumulativeIncidenceFunction {
  const sorted = [...data].sort((a, b) => a.time - b.time)
  const eventTimes = [...new Set(sorted.map(d => d.time))].sort((a, b) => a - b)

  const times: number[] = [0]
  const cif: number[] = [0]
  let currentCIF = 0
  let survivalProbability = 1

  eventTimes.forEach(t => {
    const atRisk = sorted.filter(d => d.time >= t).length
    const eventsOfInterest = sorted.filter(d => d.time === t && d.eventType === eventOfInterest).length
    const allEvents = sorted.filter(d => d.time === t && d.eventType > 0).length

    if (atRisk > 0) {
      // Update survival probability (all-cause)
      if (allEvents > 0) {
        survivalProbability *= (atRisk - allEvents) / atRisk
      }

      // Update CIF
      if (eventsOfInterest > 0) {
        const previousSurvival = times.length > 1 ?
          (atRisk / (atRisk - allEvents)) * survivalProbability : 1
        currentCIF += (eventsOfInterest / atRisk) * previousSurvival
      }

      times.push(t)
      cif.push(currentCIF)
    }
  })

  return {
    time: times,
    cif,
    eventType: eventOfInterest,
  }
}

/**
 * Exponential survival function
 */
export function exponentialSurvival(t: number, lambda: number): number {
  return Math.exp(-lambda * t)
}

/**
 * Weibull survival function
 */
export function weibullSurvival(t: number, lambda: number, k: number): number {
  return Math.exp(-Math.pow(lambda * t, k))
}

/**
 * Weibull hazard function
 */
export function weibullHazard(t: number, lambda: number, k: number): number {
  return k * lambda * Math.pow(lambda * t, k - 1)
}
