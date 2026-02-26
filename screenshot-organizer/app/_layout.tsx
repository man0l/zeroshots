import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { View, ActivityIndicator, Platform } from 'react-native'
import { useEffect, useState } from 'react'
import { colors } from '../src/lib/theme'
import { useAuthStore } from '../src/state/auth.store'

const BOOTSTRAP_TIMEOUT_MS = 5000

// DEV_BYPASS_AUTH: skip auth redirect on web so screens can be previewed without Supabase
const DEV_BYPASS_AUTH = __DEV__ && Platform.OS === 'web'

export default function RootLayout() {
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false)
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: require('../assets/fonts/SpaceGrotesk-Regular.ttf'),
    Inter: require('../assets/fonts/Inter-Regular.ttf'),
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  })

  const segments = useSegments()
  const router = useRouter()
  const { session, isLoading, isOnboarded } = useAuthStore()

  const isReady = (fontsLoaded && !isLoading) || bootstrapTimedOut

  useEffect(() => {
    const t = setTimeout(() => setBootstrapTimedOut(true), BOOTSTRAP_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!isReady) return
    const PUBLIC_ROUTES = ['review-session', 'paywall', 'privacy-policy']

    if (DEV_BYPASS_AUTH) {
      const inTabs = segments[0] === '(tabs)'
      const inAuth = segments[0] === '(auth)'
      if (!inTabs && !inAuth && !PUBLIC_ROUTES.includes(segments[0])) {
        router.replace('/(tabs)/inbox')
      }
      return
    }

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup && !PUBLIC_ROUTES.includes(segments[0])) {
      router.replace('/(auth)/sign-in')
    } else if (session && inAuthGroup) {
      if (!isOnboarded) {
        router.replace('/(auth)/onboarding')
      } else {
        router.replace('/(tabs)/inbox')
      }
    }
  }, [session, isLoading, segments, isOnboarded, fontsLoaded, bootstrapTimedOut, isReady])

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="review-session"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="privacy-policy"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

