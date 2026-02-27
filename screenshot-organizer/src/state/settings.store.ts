import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@screenshot_organizer_settings'

interface SettingsState {
  aiEnabled: boolean
  analyticsEnabled: boolean
  mlLogsEnabled: boolean
  /** User-defined tag labels shown alongside VALID_TAGS in the tag picker and library filter. */
  customTags: string[]
  setAiEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  setMlLogsEnabled: (enabled: boolean) => void
  addCustomTag: (tag: string) => void
  removeCustomTag: (tag: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // AI is OFF by default — user must explicitly opt in during onboarding
      aiEnabled: false,
      analyticsEnabled: true,
      // ML logs are OFF by default — explicit opt-in since they are stored server-side
      mlLogsEnabled: false,
      customTags: [],

      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
      setMlLogsEnabled: (mlLogsEnabled) => set({ mlLogsEnabled }),
      addCustomTag: (tag) => {
        const t = tag.trim().toLowerCase()
        if (!t || get().customTags.includes(t)) return
        set((s) => ({ customTags: [...s.customTags, t] }))
      },
      removeCustomTag: (tag) => set((s) => ({ customTags: s.customTags.filter(t => t !== tag) })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
