import type { QuizQ } from './blocks'

/** Deterministic option shuffle keyed on the question id, so answer position carries no signal. */
export function shuffleQ(q: QuizQ, salt = 0): QuizQ {
  let h = 2166136261 ^ salt
  for (let i = 0; i < q.id.length; i++) h = Math.imul(h ^ q.id.charCodeAt(i), 16777619)
  const idx = q.options.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995)
    const j = (h >>> 0) % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return { ...q, options: idx.map((i) => q.options[i]), answer: idx.indexOf(q.answer) }
}
