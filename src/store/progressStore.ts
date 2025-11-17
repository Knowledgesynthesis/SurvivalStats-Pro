import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ModuleProgress {
  moduleId: string
  completed: boolean
  lastAccessed: number
  interactivesCompleted: string[]
  assessmentScores: { [key: string]: number }
}

interface ProgressState {
  modules: { [key: string]: ModuleProgress }
  markModuleComplete: (moduleId: string) => void
  markInteractiveComplete: (moduleId: string, interactiveId: string) => void
  setAssessmentScore: (moduleId: string, assessmentId: string, score: number) => void
  updateLastAccessed: (moduleId: string) => void
  getModuleProgress: (moduleId: string) => ModuleProgress | undefined
  getTotalProgress: () => number
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      modules: {},

      markModuleComplete: (moduleId: string) => set((state) => ({
        modules: {
          ...state.modules,
          [moduleId]: {
            ...state.modules[moduleId],
            moduleId,
            completed: true,
            lastAccessed: Date.now(),
            interactivesCompleted: state.modules[moduleId]?.interactivesCompleted || [],
            assessmentScores: state.modules[moduleId]?.assessmentScores || {},
          }
        }
      })),

      markInteractiveComplete: (moduleId: string, interactiveId: string) => set((state) => {
        const module = state.modules[moduleId] || {
          moduleId,
          completed: false,
          lastAccessed: Date.now(),
          interactivesCompleted: [],
          assessmentScores: {},
        }

        const interactives = module.interactivesCompleted.includes(interactiveId)
          ? module.interactivesCompleted
          : [...module.interactivesCompleted, interactiveId]

        return {
          modules: {
            ...state.modules,
            [moduleId]: {
              ...module,
              interactivesCompleted: interactives,
              lastAccessed: Date.now(),
            }
          }
        }
      }),

      setAssessmentScore: (moduleId: string, assessmentId: string, score: number) => set((state) => {
        const module = state.modules[moduleId] || {
          moduleId,
          completed: false,
          lastAccessed: Date.now(),
          interactivesCompleted: [],
          assessmentScores: {},
        }

        return {
          modules: {
            ...state.modules,
            [moduleId]: {
              ...module,
              assessmentScores: {
                ...module.assessmentScores,
                [assessmentId]: score,
              },
              lastAccessed: Date.now(),
            }
          }
        }
      }),

      updateLastAccessed: (moduleId: string) => set((state) => {
        const module = state.modules[moduleId] || {
          moduleId,
          completed: false,
          lastAccessed: Date.now(),
          interactivesCompleted: [],
          assessmentScores: {},
        }

        return {
          modules: {
            ...state.modules,
            [moduleId]: {
              ...module,
              lastAccessed: Date.now(),
            }
          }
        }
      }),

      getModuleProgress: (moduleId: string) => {
        return get().modules[moduleId]
      },

      getTotalProgress: () => {
        const modules = get().modules
        const moduleIds = Object.keys(modules)
        if (moduleIds.length === 0) return 0

        const completedCount = moduleIds.filter(id => modules[id].completed).length
        return (completedCount / moduleIds.length) * 100
      },
    }),
    {
      name: 'progress-storage',
    }
  )
)
