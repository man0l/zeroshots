import { create } from 'zustand'

interface SettingsState {
  aiEnabled: boolean
  analyticsEnabled: boolean
  setAiEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  // AI is OFF by default — user must explicitly opt in during onboarding
  aiEnabled: false,
  analyticsEnabled: true,

  setAiEnabled: (aiEnabled) => set({ aiEnabled }),
  setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
}))
