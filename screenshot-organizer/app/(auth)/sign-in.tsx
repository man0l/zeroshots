import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/state/auth.store'
import { getSupabaseUrl } from '../../src/lib/supabase/client'
import { colors, fonts, spacing, radii } from '../../src/lib/theme'

export default function SignInScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { createSessionFromUrl, backendUnreachable } = useAuthStore()

  // Handle OAuth / magic link redirect into app
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      createSessionFromUrl(url).then(({ error: urlError }) => {
        if (urlError) setError(urlError.message)
      })
    })
    Linking.getInitialURL().then((url) => {
      if (url) createSessionFromUrl(url).then(({ error: urlError }) => { if (urlError) setError(urlError.message) })
    })
    return () => subscription.remove()
  }, [createSessionFromUrl])

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    if (isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { signIn, signUp } = useAuthStore.getState()
    
    const result = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password)

    setLoading(false)

    if (result.error) {
      setError(result.error.message)
    } else if (isSignUp) {
      setSuccess('Account created! Check your email to confirm.')
      setIsSignUp(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleLoading(true)
    const result = await useAuthStore.getState().signInWithGoogle()
    setGoogleLoading(false)
    if (result.error) setError(result.error.message)
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Screenshot Organizer</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </Text>
        </View>

        <View style={styles.form}>
        {backendUnreachable && !error && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>Cannot reach the backend at {getSupabaseUrl()}. Check that Supabase is running.</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* Google first so it's always visible without scrolling */}
        <Pressable
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <View style={styles.googleButtonContent}>
              <Ionicons name="logo-google" size={22} color="#EA4335" />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null) }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null) }}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            editable={!loading}
          />
          {isSignUp && (
            <Text style={styles.passwordHint}>Minimum 6 characters</Text>
          )}
        </View>

        <Pressable 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={isSignUp ? 'Create Account' : 'Sign In'}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </Pressable>

        <Pressable 
          style={styles.switchButton}
          onPress={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null) }}
          disabled={loading || googleLoading}
          accessibilityRole="button"
          accessibilityLabel={isSignUp ? 'Sign In' : 'Sign Up'}
        >
          <Text style={styles.switchText}>
            {isSignUp 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>
      </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>
            Self-hosted Supabase backend{'\n'}
            {getSupabaseUrl()}
          </Text>
          <Text style={[styles.hint, styles.redirectHint]}>
            Error 400 redirect_uri_mismatch? In Google Console → Credentials → your OAuth client → Authorized redirect URIs add exactly:{'\n'}
            http://localhost:8080/auth/v1/callback
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.delete,
    fontSize: 14,
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  successText: {
    color: colors.keep,
    fontSize: 14,
  },
  warningBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  warningText: {
    color: '#FBBF24',
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  switchButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  switchText: {
    color: colors.primary,
    fontSize: 14,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  redirectHint: {
    marginTop: spacing.sm,
    fontSize: 11,
  },
})
