import { Platform } from 'react-native'
import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase, getSupabaseUrl } from '../lib/supabase/client'

// Required for web OAuth completion
WebBrowser.maybeCompleteAuthSession?.()

/** Base64url decode (for code in path from oauth-callback proxy) */
function base64UrlDecode(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64
    return decodeURIComponent(escape(atob(padded)))
  } catch {
    return ''
  }
}

/** Parse OAuth redirect URL: code in query, in path (proxy), or access_token/refresh_token (implicit), or error */
function getParamsFromUrl(url: string): {
  code?: string
  access_token?: string
  refresh_token?: string
  error?: string
} {
  try {
    const parsed = new URL(url)
    const params = parsed.searchParams
    const hash = parsed.hash?.replace(/^#/, '')
    const hashParams = new URLSearchParams(hash || '')
    const get = (k: string) => params.get(k) ?? hashParams.get(k) ?? undefined

    // Code in path: screenshot-organizer://auth/callback/BASE64 or exp://host/--/auth/callback/BASE64 (Expo Go)
    const pathname = parsed.pathname ?? ''
    const pathMatch = pathname.match(/auth\/callback\/(.+)/)
    const codeFromPath = pathMatch?.[1] ? base64UrlDecode(pathMatch[1]) : undefined

    return {
      code: get('code') ?? (codeFromPath || undefined),
      access_token: get('access_token'),
      refresh_token: get('refresh_token'),
      error: get('error_description') ?? get('error'),
    }
  } catch {
    return {}
  }
}

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
  signInWithGoogle: () => Promise<{ error: Error | null }>
  createSessionFromUrl: (url: string) => Promise<{ error: Error | null }>
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

  signInWithGoogle: async () => {
    // Where the app can receive the callback (Expo Go = exp://...; production = custom scheme)
    const appRedirectBase = makeRedirectUri({ scheme: 'screenshot-organizer', path: 'auth/callback' })
    // On Android, use proxy so the app receives the code in the path (query params often stripped from custom scheme)
    const redirectTo =
      Platform.OS === 'android'
        ? `${getSupabaseUrl()}/functions/v1/oauth-callback`
        : appRedirectBase
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        // Proxy uses this to redirect to the app (Expo Go needs exp://... with code in path)
        state: appRedirectBase,
      },
    })
    if (oauthError) return { error: oauthError }
    if (!data?.url) return { error: new Error('No OAuth URL returned') }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type !== 'success' || !result.url) {
      return { error: result.type === 'cancel' ? null : new Error('Sign in was cancelled or failed') }
    }
    return get().createSessionFromUrl(result.url)
  },

  createSessionFromUrl: async (url: string) => {
    const { code, access_token, refresh_token, error: urlError } = getParamsFromUrl(url)
    if (urlError) return { error: new Error(urlError) }

    // PKCE: redirect has ?code=... (works on Android; hash is often stripped)
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) return { error }
      set({ session: data.session, user: data.session?.user ?? null })
      if (data.session?.user) get().checkOnboarding()
      return { error: null }
    }

    // Implicit: redirect has #access_token=... (e.g. web)
    if (access_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token ?? '',
      })
      if (error) return { error }
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null })
      if (session?.user) get().checkOnboarding()
      return { error: null }
    }

    const hint = url.length > 80 ? url.slice(0, 80) + '…' : url
    return { error: new Error(`No access token or code in redirect. Received: ${hint}`) }
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

// Initialize auth state — always clear loading so app never gets stuck (e.g. when Supabase is unreachable on Android)
const AUTH_INIT_TIMEOUT_MS = 5000

function initAuth() {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => resolve(), AUTH_INIT_TIMEOUT_MS)
  })
  const sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setSession(session)
    if (session?.user) {
      useAuthStore.getState().checkOnboarding()
    }
  })
  Promise.race([sessionPromise, timeout])
    .catch(() => { /* ignore: show sign-in and let user retry */ })
    .finally(() => {
      useAuthStore.getState().setLoading(false)
    })
}
initAuth()

// Listen for auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
  if (session?.user) {
    useAuthStore.getState().checkOnboarding()
  }
})
