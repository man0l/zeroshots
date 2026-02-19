import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'

interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  isOnboarded: boolean
  
  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setOnboarded: (onboarded: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  checkOnboarding: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isOnboarded: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  },

  signUp: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },

  checkOnboarding: async () => {
    const { user } = get()
    if (!user) return

    // Check if user has completed onboarding by looking at their profile
    const { data } = await supabase
      .from('users')
      .select('created_at')
      .eq('id', user.id)
      .single()

    // Consider onboarded if user record exists and is older than 1 minute
    if (data) {
      const createdAt = new Date(data.created_at)
      const oneMinuteAgo = new Date(Date.now() - 60000)
      set({ isOnboarded: createdAt < oneMinuteAgo })
    }
  },
}))

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
  useAuthStore.getState().setLoading(false)
  if (session?.user) {
    useAuthStore.getState().checkOnboarding()
  }
})

// Listen for auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
  if (session?.user) {
    useAuthStore.getState().checkOnboarding()
  }
})
