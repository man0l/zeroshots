import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts } from 'expo-font'
import { View, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { colors } from '../src/lib/theme'
import { useAuthStore } from '../src/state/auth.store'

export default function RootLayout() {
  // Custom fonts loaded from /assets/fonts/. Files must exist for successful loading.
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: require('../assets/fonts/SpaceGrotesk-Regular.ttf'),
    Inter: require('../assets/fonts/Inter-Regular.ttf'),
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  })
  
  const segments = useSegments()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const { session, isLoading, isOnboarded } = useAuthStore()

  useEffect(() => {
    if (isLoading || !fontsLoaded) return

    const inAuthGroup = segments[0] === '(auth)'
    
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
    }

    setIsReady(true)
  }, [session, isLoading, segments, isOnboarded, fontsLoaded])

  if (!fontsLoaded || isLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
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
      </Stack>
    </GestureHandlerRootView>
  )
}

