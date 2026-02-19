import { create } from 'zustand'

export type Entitlement = 'free' | 'premium' | 'lifetime'

interface EntitlementState {
  entitlement: Entitlement
  isLoading: boolean
  trustLimit: number
  deletesRemaining: number
  
  setEntitlement: (entitlement: Entitlement) => void
  decrementDeletes: () => void
  resetDaily: () => void
  setLoading: (loading: boolean) => void
}

const DEFAULT_TRUST_LIMIT = 15

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  entitlement: 'free',
  isLoading: true,
  trustLimit: DEFAULT_TRUST_LIMIT,
  deletesRemaining: DEFAULT_TRUST_LIMIT,

  setEntitlement: (entitlement) => {
    const isUnlimited = entitlement === 'premium' || entitlement === 'lifetime'
    set({
      entitlement,
      trustLimit: isUnlimited ? Infinity : DEFAULT_TRUST_LIMIT,
      deletesRemaining: isUnlimited ? Infinity : get().deletesRemaining,
    })
  },

  decrementDeletes: () => {
    const state = get()
    if (state.entitlement !== 'free') return
    set({ deletesRemaining: Math.max(0, state.deletesRemaining - 1) })
  },

  resetDaily: () => {
    const state = get()
    if (state.entitlement === 'free') {
      set({ deletesRemaining: DEFAULT_TRUST_LIMIT })
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}))
