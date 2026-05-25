import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectState {
  activeProjectIds: string[]
  activateProject: (id: string) => void
  deactivateProject: (id: string) => void
  isActive: (id: string) => boolean
}

const projectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      activeProjectIds: [],
      activateProject: (id) =>
        set((s) => ({
          activeProjectIds: s.activeProjectIds.includes(id)
            ? s.activeProjectIds
            : [...s.activeProjectIds, id],
        })),
      deactivateProject: (id) =>
        set((s) => ({
          activeProjectIds: s.activeProjectIds.filter((x) => x !== id),
        })),
      isActive: (id) => get().activeProjectIds.includes(id),
    }),
    { name: 'project-store' }
  )
)

export default projectStore
