import { useEffect, useState } from 'react'
import { useAuthStore } from '../state/auth.store'
import { useRouter, useSegments } from 'expo-router'

export function useAuth() {
  const segments = useSegments()
  const router = useRouter()
  const { session, user, isLoading, isOnboarded, signIn, signUp, signOut } = useAuthStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inTabsGroup = segments[0] === '(tabs)'

    if (!session && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/sign-in')
    } else if (session && inAuthGroup) {
      // Redirect to onboarding if authenticated but not onboarded
      if (!isOnboarded) {
        router.replace('/onboarding')
      } else {
        // Redirect to main app if onboarded
        router.replace('/(tabs)/inbox')
      }
    } else if (session && inTabsGroup && !isOnboarded) {
      // Force onboarding if trying to access app without completing it
      router.replace('/onboarding')
    }

    setIsReady(true)
  }, [session, isLoading, segments, isOnboarded])

  return {
    session,
    user,
    isLoading: isLoading || !isReady,
    isAuthenticated: !!session,
    isOnboarded,
    signIn,
    signUp,
    signOut,
  }
}
