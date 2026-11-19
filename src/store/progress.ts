import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Mastery {
  score: number
  total: number
  passed: boolean
  at: number
}

export interface ExamRecord {
  at: number
  score: number
  total: number
  byTopic: Record<string, [number, number]>
}

interface ProgressState {
  visited: Record<string, number>
  /** inline check-your-understanding questions: id → answered correctly on first try */
  answers: Record<string, { choice: number; correct: boolean }>
  mastery: Record<string, Mastery>
  exams: ExamRecord[]
  visit: (moduleId: string) => void
  answer: (questionId: string, choice: number, correct: boolean) => void
  setMastery: (moduleId: string, m: Mastery) => void
  addExam: (r: ExamRecord) => void
  reset: () => void
}

export const PASS_MARK = 0.8

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      visited: {},
      answers: {},
      mastery: {},
      exams: [],
      visit: (id) => set((s) => ({ visited: { ...s.visited, [id]: Date.now() } })),
      answer: (qid, choice, correct) => set((s) => (s.answers[qid] ? s : { answers: { ...s.answers, [qid]: { choice, correct } } })),
      setMastery: (id, m) =>
        set((s) => {
          const prev = s.mastery[id]
          // keep the best attempt
          if (prev && prev.score / prev.total >= m.score / m.total) return s
          return { mastery: { ...s.mastery, [id]: m } }
        }),
      addExam: (r) => set((s) => ({ exams: [...s.exams.slice(-19), r] })),
      reset: () => set({ visited: {}, answers: {}, mastery: {}, exams: [] }),
    }),
    { name: 'ssp-progress-v2' },
  ),
)

interface ThemeState {
  isDarkMode: boolean
  toggle: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true,
      toggle: () =>
        set((s) => {
          const next = !s.isDarkMode
          document.documentElement.classList.toggle('dark', next)
          return { isDarkMode: next }
        }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) document.documentElement.classList.toggle('dark', state.isDarkMode)
      },
    },
  ),
)
