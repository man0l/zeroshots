import { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams, useGlobalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import { useAuthStore } from '../../src/state/auth.store'
import { colors } from '../../src/lib/theme'

export default function AuthCallback() {
  const router = useRouter()
  const { createSessionFromUrl, session } = useAuthStore()
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string; code?: string }>()

  useEffect(() => {
    async function handleCallback() {
      // 1. Try building the URL from Expo Router's search params (most reliable for in-app deep links)
      if (params.access_token || params.code) {
        const qs = new URLSearchParams(params as Record<string, string>).toString()
        const syntheticUrl = `screenshot-organizer://auth/callback?${qs}`
        const { error } = await createSessionFromUrl(syntheticUrl)
        if (error) console.warn('OAuth callback error (params):', error.message)
        return
      }

      // 2. Fallback: check the initial URL (cold launch from deep link)
      const url = await Linking.getInitialURL()
      if (url) {
        const { error } = await createSessionFromUrl(url)
        if (error) console.warn('OAuth callback error (initial):', error.message)
        return
      }

      // 3. Fallback: listen for incoming URL (app was in background)
      const sub = Linking.addEventListener('url', async ({ url: eventUrl }) => {
        const { error } = await createSessionFromUrl(eventUrl)
        if (error) console.warn('OAuth callback error (event):', error.message)
      })
      return () => sub.remove()
    }

    handleCallback()
  }, [createSessionFromUrl, params.access_token, params.code])

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/inbox')
    }
  }, [session, router])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textPrimary,
    marginTop: 16,
    fontSize: 16,
  },
})
