import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@screenshot_organizer_kept_ids'

interface KeptIdsState {
  /** Platform asset IDs that the user has explicitly kept (swiped right). Excluded from inbox/vault triage. */
  ids: string[]
  addKept: (id: string) => void
  hasKept: (id: string) => boolean
  /** Clear all kept IDs (e.g. for testing or reset) */
  clearKept: () => void
}

export const useKeptIdsStore = create<KeptIdsState>()(
  persist(
    (set, get) => ({
      ids: [],
      addKept: (id) => {
        set((state) => {
          if (state.ids.includes(id)) return state
          return { ids: [...state.ids, id] }
        })
      },
      hasKept: (id) => get().ids.includes(id),
      clearKept: () => set({ ids: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
