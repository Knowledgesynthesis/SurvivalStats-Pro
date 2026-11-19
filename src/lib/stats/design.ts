/**
 * Sample size and power for comparing two survival distributions under proportional hazards.
 *   Schoenfeld (1983): D = (z₁₋α/₂ + z₁₋β)² / (π(1 − π) (log HR)²)
 *   Freedman (1982), 1:1: D = (z₁₋α/₂ + z₁₋β)² (1 + HR)² / (1 − HR)²
 * The number of patients follows from the probability of observing an event, assuming
 * exponential survival, uniform accrual over `accrual` and additional follow-up `followUp`
 * (Collett, Modelling Survival Data in Medical Research, ch. 10).
 */
import { pnorm, qnorm } from './special'

export function eventsSchoenfeld(hr: number, alpha = 0.05, power = 0.8, allocation = 0.5): number {
  const z = qnorm(1 - alpha / 2) + qnorm(power)
  return (z * z) / (allocation * (1 - allocation) * Math.log(hr) ** 2)
}

export function eventsFreedman(hr: number, alpha = 0.05, power = 0.8): number {
  const z = qnorm(1 - alpha / 2) + qnorm(power)
  return (z * z * (1 + hr) ** 2) / (1 - hr) ** 2
}

/** Power achieved with D events (Schoenfeld approximation). */
export function powerSchoenfeld(events: number, hr: number, alpha = 0.05, allocation = 0.5): number {
  return pnorm(Math.sqrt(events * allocation * (1 - allocation)) * Math.abs(Math.log(hr)) - qnorm(1 - alpha / 2))
}

/** P(event observed) for exponential survival with rate λ, uniform accrual on [0, a], extra follow-up f. */
export function probEvent(rate: number, accrual: number, followUp: number): number {
  if (accrual <= 0) return 1 - Math.exp(-rate * followUp)
  return 1 - (Math.exp(-rate * followUp) - Math.exp(-rate * (accrual + followUp))) / (rate * accrual)
}

export interface TrialDesign {
  events: number
  patients: number
  pEventControl: number
  pEventTreatment: number
}

/** Full design: events by Schoenfeld, patients from the event probability in each arm. */
export function designTrial(opts: { medianControl: number; hr: number; alpha: number; power: number; accrual: number; followUp: number; allocation?: number; dropout?: number }): TrialDesign {
  const alloc = opts.allocation ?? 0.5
  const events = Math.ceil(eventsSchoenfeld(opts.hr, opts.alpha, opts.power, alloc))
  const lc = Math.log(2) / opts.medianControl
  const lt = lc * opts.hr
  const pc = probEvent(lc, opts.accrual, opts.followUp)
  const pt = probEvent(lt, opts.accrual, opts.followUp)
  const pAvg = (1 - alloc) * pc + alloc * pt
  const inflate = 1 / (1 - (opts.dropout ?? 0))
  return { events, patients: Math.ceil((events / pAvg) * inflate), pEventControl: pc, pEventTreatment: pt }
}
