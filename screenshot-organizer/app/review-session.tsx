import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Share, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { colors, fonts, spacing, radii, shadows } from '../src/lib/theme'
import { useSessionStore } from '../src/state/session.store'
import { useAuthStore } from '../src/state/auth.store'
import { saveSessionToSupabase } from '../src/features/cleanup-session/saveSession'

export default function ReviewSessionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { actions, queue, resetSession } = useSessionStore()
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const stats = React.useMemo(() => {
    const deletedCount = actions.filter(a => a.action === 'delete').length
    const archivedCount = actions.filter(a => a.action === 'archive').length
    const reviewedCount = actions.length
    const deletedAssets = actions
      .filter(a => a.action === 'delete')
      .map(a => queue.find(q => q.id === a.assetId))
      .filter(Boolean)
    const savedBytes = deletedAssets.reduce((sum, a) => sum + (a?.size || 0), 0)
    
    return { deletedCount, archivedCount, reviewedCount, savedBytes }
  }, [actions, queue])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(0)}GB`
    }
    return `${mb.toFixed(0)}MB`
  }

  const handleShare = async () => {
    Haptics.selectionAsync()
    try {
      await Share.share({
        message: `I just cleaned up ${stats.deletedCount} screenshots and saved ${formatBytes(stats.savedBytes)} with Screenshot Organizer!`,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleFinish = async () => {
    if (isSaved) {
      // Already saved, just navigate
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      resetSession()
      router.replace('/(tabs)/inbox')
      return
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to save sessions')
      return
    }

    setIsSaving(true)
    
    try {
      // Save session to Supabase
      await saveSessionToSupabase(user.id)
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setIsSaved(true)
      
      // Show success feedback
      Alert.alert(
        'Session Saved!',
        `Your cleanup session has been saved to the cloud.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              resetSession()
              router.replace('/(tabs)/inbox')
            },
          },
        ]
      )
    } catch (error) {
      console.error('Failed to save session:', error)
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert(
        'Save Failed',
        'Failed to save session to the cloud. Your progress is still saved locally. Continue anyway?',
        [
          { text: 'Retry', onPress: () => handleFinish() },
          { 
            text: 'Continue', 
            onPress: () => {
              resetSession()
              router.replace('/(tabs)/inbox')
            },
            style: 'cancel'
          },
        ]
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.headerTitle}>Session Recap</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.heroContainer}>
          <Text style={styles.heroLabel}>Storage Reclaimed</Text>
          <Text style={styles.heroValue}>
            {formatBytes(stats.savedBytes)}
            <Text style={styles.heroUnit}>
              {stats.savedBytes >= 1024 * 1024 * 1024 ? 'GB' : 'MB'}
            </Text>
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statGlow, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]} />
            <Ionicons name="trash-outline" size={24} color={colors.delete} />
            <Text style={styles.statValue}>{stats.deletedCount}</Text>
            <Text style={styles.statLabel}>Deleted</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statGlow, { backgroundColor: 'rgba(139, 92, 246, 0.3)' }]} />
            <Ionicons name="sparkles-outline" size={24} color={colors.archive} />
            <Text style={styles.statValue}>{stats.archivedCount}</Text>
            <Text style={styles.statLabel}>Archived</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statGlow, { backgroundColor: 'rgba(148, 163, 184, 0.2)' }]} />
            <Ionicons name="flash-outline" size={24} color={colors.textMuted} />
            <Text style={styles.statValue}>{stats.reviewedCount}</Text>
            <Text style={styles.statLabel}>Reviewed</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={[styles.finishButton, (isSaving || isSaved) && styles.finishButtonDisabled]} 
            onPress={handleFinish}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.finishButtonText}>
                  {isSaved ? 'SESSION SAVED ✓' : 'FINISH SESSION'}
                </Text>
                {!isSaved && <Ionicons name="arrow-forward" size={20} color={colors.background} />}
              </>
            )}
          </Pressable>

          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={colors.textMuted} />
            <Text style={styles.shareButtonText}>Share Stats</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.homeIndicator}>
        <View style={styles.homeIndicatorBar} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl * 2,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.textPrimary,
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  heroUnit: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxl * 2,
  },
  statCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  statGlow: {
    position: 'absolute',
    bottom: -16,
    right: -16,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    width: '100%',
    gap: spacing.lg,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textPrimary,
    height: 64,
    borderRadius: radii.lg,
    ...shadows.glowSky,
  },
  finishButtonDisabled: {
    backgroundColor: colors.keep,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  homeIndicator: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  homeIndicatorBar: {
    width: 128,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
})
