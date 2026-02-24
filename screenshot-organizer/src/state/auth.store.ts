import { Platform } from 'react-native'
import { create } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase, getSupabaseUrl, edgeFn } from '../lib/supabase/client'

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
  backendUnreachable: boolean
  
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
  completeOnboarding: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isOnboarded: false,
  backendUnreachable: false,

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
    // Web should use full-page OAuth redirect (not openAuthSessionAsync), so
    // Supabase can manage callback parsing/session from URL without PKCE verifier issues.
    if (Platform.OS === 'web') {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/sign-in`
        : makeRedirectUri({ path: 'sign-in' })
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      })
      return { error }
    }

    // On Android: use proxy URL so GoTrue redirects there; state = where to send the code (Expo Go = exp://, dev build = custom scheme)
    const appRedirectBase =
      Platform.OS === 'android'
        ? makeRedirectUri({ path: 'auth/callback' }) // Expo Go returns exp://...; dev build returns custom scheme
        : makeRedirectUri({ scheme: 'screenshot-organizer', path: 'auth/callback' })
    const redirectTo =
      Platform.OS === 'android'
        ? `${getSupabaseUrl()}/functions/v1/${edgeFn('oauth-callback')}`
        : appRedirectBase
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
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
    // Ignore normal app launch URLs (e.g. exp://host:8081) that are not OAuth callbacks.
    // Sign-in screen listens to Linking URLs, and Expo Go initial URL is not an auth redirect.
    const isAuthCallbackUrl = /auth\/callback/i.test(url)
    if (!isAuthCallbackUrl && !code && !access_token && !urlError) {
      return { error: null }
    }
    if (urlError) return { error: new Error(urlError) }

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) return { error }
      set({ session: data.session, user: data.session?.user ?? null })
      if (data.session?.user) get().checkOnboarding()
      return { error: null }
    }

    // Legacy implicit flow fallback (access_token in hash fragment)
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

    const { data } = await supabase
      .from('users')
      .select('is_onboarded')
      .eq('id', user.id)
      .single()

    if (data) {
      set({ isOnboarded: data.is_onboarded })
    }
  },

  completeOnboarding: async () => {
    const { user } = get()
    if (!user) return

    await supabase
      .from('users')
      .update({ is_onboarded: true })
      .eq('id', user.id)

    set({ isOnboarded: true })
  },
}))

const AUTH_INIT_TIMEOUT_MS = 5000

function initAuth() {
  let resolved = false
  const sessionPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    resolved = true
    useAuthStore.getState().setSession(session)
    if (session?.user) {
      useAuthStore.getState().checkOnboarding()
    }
  })
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      if (!resolved) {
        useAuthStore.setState({ backendUnreachable: true })
      }
      resolve()
    }, AUTH_INIT_TIMEOUT_MS)
  })
  Promise.race([sessionPromise, timeout])
    .catch(() => {
      useAuthStore.setState({ backendUnreachable: true })
    })
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
