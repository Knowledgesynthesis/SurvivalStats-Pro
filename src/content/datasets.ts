/**
 * Freireich et al. (1963) 6-mercaptopurine vs placebo trial in acute leukaemia:
 * weeks in remission, as tabulated by Gehan (1965) and used in most survival textbooks.
 * status: 1 = relapse, 0 = censored (still in remission).
 */
export const LEUK = {
  mp: { time: [6, 6, 6, 7, 10, 13, 16, 22, 23, 6, 9, 10, 11, 17, 19, 20, 25, 32, 32, 34, 35], status: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  placebo: { time: [1, 1, 2, 2, 3, 4, 4, 5, 5, 8, 8, 8, 8, 11, 11, 12, 12, 15, 17, 22, 23], status: new Array(21).fill(1) as number[] },
}

export const leukCombined = () => ({
  time: [...LEUK.mp.time, ...LEUK.placebo.time],
  status: [...LEUK.mp.status, ...LEUK.placebo.status],
  group: [...LEUK.mp.time.map(() => 0), ...LEUK.placebo.time.map(() => 1)],
})
