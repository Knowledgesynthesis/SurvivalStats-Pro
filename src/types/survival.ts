/**
 * Core data types for survival analysis
 */

export interface SurvivalDataPoint {
  id: string
  time: number
  event: boolean // true = event occurred, false = censored
  covariates?: Record<string, number | string>
}

export interface KaplanMeierResult {
  time: number[]
  survival: number[]
  nRisk: number[]
  nEvent: number[]
  confidenceLower?: number[]
  confidenceUpper?: number[]
}

export interface HazardData {
  time: number
  hazard: number
  cumulativeHazard: number
}

export interface CoxModelResult {
  coefficients: { [key: string]: number }
  hazardRatios: { [key: string]: number }
  standardErrors: { [key: string]: number }
  pValues: { [key: string]: number }
  concordanceIndex: number
}

export interface SchoenfelResidual {
  time: number
  residuals: { [covariate: string]: number }
}

export interface CompetingRiskData {
  id: string
  time: number
  eventType: number // 0 = censored, 1+ = competing events
  covariates?: Record<string, number | string>
}

export interface CumulativeIncidenceFunction {
  time: number[]
  cif: number[] // cumulative incidence for specific event type
  eventType: number
}

export interface ParametricModelFit {
  distribution: 'exponential' | 'weibull' | 'gompertz' | 'lognormal' | 'loglogistic'
  parameters: Record<string, number>
  survival: (t: number) => number
  hazard: (t: number) => number
  aic: number
  bic: number
}

export interface MultiStateTransition {
  from: string
  to: string
  transitionIntensity: number
}

export interface MultiStateModel {
  states: string[]
  transitions: MultiStateTransition[]
}

export interface RecurrentEventData {
  id: string
  eventTimes: number[]
  endOfFollowUp: number
  covariates?: Record<string, number | string>
}

export interface LandmarkAnalysisResult {
  landmarkTime: number
  kmResult: KaplanMeierResult
  includedSubjects: number
}

export interface CalibrationData {
  predictedProbability: number[]
  observedProbability: number[]
}

export interface ValidationMetrics {
  cIndex: number
  brierScore: number
  calibrationSlope: number
  calibrationIntercept: number
}
