import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@screenshot_organizer_settings'

interface SettingsState {
  aiEnabled: boolean
  analyticsEnabled: boolean
  mlLogsEnabled: boolean
  setAiEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  setMlLogsEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // AI is OFF by default — user must explicitly opt in during onboarding
      aiEnabled: false,
      analyticsEnabled: true,
      // ML logs are OFF by default — explicit opt-in since they are stored server-side
      mlLogsEnabled: false,

      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
      setMlLogsEnabled: (mlLogsEnabled) => set({ mlLogsEnabled }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
