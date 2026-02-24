import { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { useAuthStore } from '../../src/state/auth.store'
import { colors } from '../../src/lib/theme'

export default function AuthCallback() {
  const router = useRouter()
  const { createSessionFromUrl, session } = useAuthStore()

  useEffect(() => {
    Linking.getInitialURL().then(async (url) => {
      if (!url) return
      const { error } = await createSessionFromUrl(url)
      if (error) console.warn('OAuth callback error:', error.message)
    })
  }, [createSessionFromUrl])

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
