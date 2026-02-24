import { useAuthStore } from '../state/auth.store'

export function useAuth() {
  const { session, user, isLoading, isOnboarded, backendUnreachable, signIn, signUp, signOut, completeOnboarding } = useAuthStore()

  return {
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    isOnboarded,
    backendUnreachable,
    signIn,
    signUp,
    signOut,
    completeOnboarding,
  }
}
