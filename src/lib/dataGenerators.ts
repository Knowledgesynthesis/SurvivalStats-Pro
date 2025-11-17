/**
 * Synthetic data generators for survival analysis education
 * All data is completely synthetic and generated for educational purposes only
 */

import { SurvivalDataPoint, CompetingRiskData, RecurrentEventData } from '@/types/survival'

/**
 * Generate synthetic survival data with exponential distribution
 */
export function generateExponentialData(
  n: number,
  lambda: number,
  censoringRate: number = 0.3,
  seed?: number
): SurvivalDataPoint[] {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  const data: SurvivalDataPoint[] = []

  for (let i = 0; i < n; i++) {
    // Generate event time from exponential distribution
    const eventTime = -Math.log(rng()) / lambda

    // Generate censoring time
    const censorTime = -Math.log(rng()) / (lambda * censoringRate / (1 - censoringRate))

    // Observed time is minimum of event and censoring time
    const observedTime = Math.min(eventTime, censorTime)
    const event = eventTime <= censorTime

    data.push({
      id: `subject_${i + 1}`,
      time: Math.round(observedTime * 100) / 100,
      event,
    })
  }

  return data
}

/**
 * Generate synthetic survival data with Weibull distribution
 */
export function generateWeibullData(
  n: number,
  lambda: number,
  k: number,
  censoringRate: number = 0.3,
  seed?: number
): SurvivalDataPoint[] {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  const data: SurvivalDataPoint[] = []

  for (let i = 0; i < n; i++) {
    // Generate event time from Weibull distribution
    const u = rng()
    const eventTime = Math.pow(-Math.log(u) / lambda, 1 / k)

    // Generate censoring time
    const censorTime = -Math.log(rng()) / (lambda * censoringRate / (1 - censoringRate))

    const observedTime = Math.min(eventTime, censorTime)
    const event = eventTime <= censorTime

    data.push({
      id: `subject_${i + 1}`,
      time: Math.round(observedTime * 100) / 100,
      event,
    })
  }

  return data
}

/**
 * Generate synthetic survival data with two groups (for comparing survival curves)
 */
export function generateTwoGroupData(
  n1: number,
  n2: number,
  lambda1: number,
  lambda2: number,
  censoringRate: number = 0.3,
  seed?: number
): { group1: SurvivalDataPoint[]; group2: SurvivalDataPoint[] } {
  const group1 = generateExponentialData(n1, lambda1, censoringRate, seed)
  const group2 = generateExponentialData(n2, lambda2, censoringRate, seed ? seed + 1000 : undefined)

  // Add group covariate
  group1.forEach(d => {
    d.covariates = { group: 0 }
  })
  group2.forEach(d => {
    d.covariates = { group: 1 }
  })

  return { group1, group2 }
}

/**
 * Generate synthetic competing risks data
 */
export function generateCompetingRisksData(
  n: number,
  lambda1: number, // hazard for event type 1
  lambda2: number, // hazard for event type 2
  censoringRate: number = 0.2,
  seed?: number
): CompetingRiskData[] {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  const data: CompetingRiskData[] = []

  for (let i = 0; i < n; i++) {
    // Generate times for both competing events
    const time1 = -Math.log(rng()) / lambda1
    const time2 = -Math.log(rng()) / lambda2
    const censorTime = -Math.log(rng()) / (lambda1 * censoringRate / (1 - censoringRate))

    // Determine which event occurs first
    const minTime = Math.min(time1, time2, censorTime)
    let eventType = 0 // censored

    if (minTime === time1) {
      eventType = 1
    } else if (minTime === time2) {
      eventType = 2
    }

    data.push({
      id: `subject_${i + 1}`,
      time: Math.round(minTime * 100) / 100,
      eventType,
    })
  }

  return data
}

/**
 * Generate synthetic recurrent event data
 */
export function generateRecurrentEventData(
  n: number,
  meanEventsPerSubject: number,
  followUpTime: number,
  seed?: number
): RecurrentEventData[] {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  const data: RecurrentEventData[] = []

  for (let i = 0; i < n; i++) {
    // Generate number of events for this subject (Poisson distribution approximation)
    const numEvents = Math.floor(-Math.log(rng()) * meanEventsPerSubject)

    const eventTimes: number[] = []

    for (let j = 0; j < numEvents; j++) {
      const eventTime = rng() * followUpTime
      eventTimes.push(Math.round(eventTime * 100) / 100)
    }

    // Sort event times
    eventTimes.sort((a, b) => a - b)

    // Filter out events beyond follow-up
    const filteredEventTimes = eventTimes.filter(t => t <= followUpTime)

    data.push({
      id: `subject_${i + 1}`,
      eventTimes: filteredEventTimes,
      endOfFollowUp: followUpTime,
    })
  }

  return data
}

/**
 * Generate survival data with covariates (for Cox model)
 */
export function generateDataWithCovariates(
  n: number,
  baselineHazard: number,
  coefficients: { [key: string]: number },
  censoringRate: number = 0.3,
  seed?: number
): SurvivalDataPoint[] {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  const data: SurvivalDataPoint[] = []

  for (let i = 0; i < n; i++) {
    // Generate covariates
    const age = 40 + rng() * 40 // age between 40 and 80
    const treatment = rng() < 0.5 ? 0 : 1 // binary treatment
    const biomarker = rng() * 10 // continuous biomarker 0-10

    const covariates = { age, treatment, biomarker }

    // Calculate linear predictor
    let linearPredictor = 0
    for (const [key, value] of Object.entries(covariates)) {
      if (coefficients[key] !== undefined) {
        linearPredictor += coefficients[key] * value
      }
    }

    // Individual hazard (proportional hazards model)
    const individualHazard = baselineHazard * Math.exp(linearPredictor)

    // Generate event time
    const eventTime = -Math.log(rng()) / individualHazard

    // Generate censoring time
    const censorTime = -Math.log(rng()) / (baselineHazard * censoringRate / (1 - censoringRate))

    const observedTime = Math.min(eventTime, censorTime)
    const event = eventTime <= censorTime

    data.push({
      id: `subject_${i + 1}`,
      time: Math.round(observedTime * 100) / 100,
      event,
      covariates: {
        age: Math.round(age),
        treatment,
        biomarker: Math.round(biomarker * 100) / 100,
      },
    })
  }

  return data
}

/**
 * Seeded random number generator for reproducibility
 */
function seededRandom(seed: number): () => number {
  let state = seed
  return function() {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

/**
 * Generate data with time-varying hazard (for demonstrating non-PH)
 */
export function generateNonProportionalHazardsData(
  n: number,
  seed?: number
): { group1: SurvivalDataPoint[]; group2: SurvivalDataPoint[] } {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random

  const group1: SurvivalDataPoint[] = []
  const group2: SurvivalDataPoint[] = []

  for (let i = 0; i < n / 2; i++) {
    // Group 1: constant hazard
    const time1 = -Math.log(rng()) / 0.1
    const censor1 = rng() > 0.7
    group1.push({
      id: `g1_subject_${i + 1}`,
      time: Math.round(time1 * 100) / 100,
      event: !censor1,
      covariates: { group: 0 },
    })

    // Group 2: increasing hazard over time (Weibull with k > 1)
    const u = rng()
    const time2 = Math.pow(-Math.log(u) / 0.08, 1 / 2) // Weibull with k=2
    const censor2 = rng() > 0.7
    group2.push({
      id: `g2_subject_${i + 1}`,
      time: Math.round(time2 * 100) / 100,
      event: !censor2,
      covariates: { group: 1 },
    })
  }

  return { group1, group2 }
}
