import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Share, ActivityIndicator, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { colors, fonts, spacing, radii } from '../src/lib/theme'
import { useSessionStore } from '../src/state/session.store'
import { useAuthStore } from '../src/state/auth.store'
import { saveSessionToSupabase } from '../src/features/cleanup-session/saveSession'

export default function ReviewSessionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { actions, queue, startTime, resetSession } = useSessionStore()
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const stats = React.useMemo(() => {
    const deletedCount = actions.filter(a => a.action === 'delete').length
    const archivedCount = actions.filter(a => a.action === 'archive').length
    const deletedAssets = actions
      .filter(a => a.action === 'delete')
      .map(a => queue.find(q => q.id === a.assetId))
      .filter(Boolean)
    const savedBytes = deletedAssets.reduce((sum, a) => sum + (a?.size || 0), 0)
    const timeSpent = startTime ? Math.round((Date.now() - startTime) / 1000) : 0
    
    return { deletedCount, archivedCount, savedBytes, timeSpent }
  }, [actions, queue, startTime])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return { value: '0', unit: 'MB' }
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
      return { value: `${(mb / 1024).toFixed(0)}`, unit: 'GB' }
    }
    return { value: `${mb.toFixed(0)}`, unit: 'MB' }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m${s > 0 ? `${s}s` : ''}`
  }

  const handleShare = async () => {
    Haptics.selectionAsync()
    const { value, unit } = formatBytes(stats.savedBytes)
    try {
      await Share.share({
        message: `I just cleaned up ${stats.deletedCount} screenshots and saved ${value} ${unit} with Screenshot Organizer!`,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleFinish = async () => {
    if (isSaved) {
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
      await saveSessionToSupabase(user.id)
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setIsSaved(true)
      
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

  const { value: heroValue, unit: heroUnit } = formatBytes(stats.savedBytes)

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      {/* Decorative blur circles */}
      <View style={styles.decorContainer}>
        <View style={[styles.blurCircle, styles.blurRed]} />
        <View style={[styles.blurCircle, styles.blurPurple]} />
        <View style={[styles.blurCircle, styles.blurGray]} />
      </View>

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.headerTitle}>Session Recap</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Hero storage display */}
        <View style={styles.heroContainer}>
          <Text style={styles.heroLabel}>Storage Reclaimed</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroValue}>{heroValue}</Text>
            <Text style={styles.heroUnit}>{heroUnit}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statGlow, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]} />
            <Ionicons name="trash-outline" size={24} color={colors.delete} />
            <Text style={styles.statValue}>{stats.deletedCount}</Text>
            <Text style={styles.statLabel}>Deleted</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statGlow, { backgroundColor: 'rgba(139, 92, 246, 0.3)' }]} />
            <Ionicons name="sparkles" size={24} color={colors.archive} />
            <Text style={styles.statValue}>{stats.archivedCount}</Text>
            <Text style={styles.statLabel}>Archived</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statGlow, { backgroundColor: 'rgba(148, 163, 184, 0.2)' }]} />
            <Ionicons name="flash" size={24} color={colors.textMuted} />
            <Text style={styles.statValue}>{formatTime(stats.timeSpent)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.finishButton, isSaving && styles.finishButtonSaving]}
            onPress={handleFinish}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Session saved' : 'Finish session'}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.finishButtonText}>
                  {isSaved ? 'SESSION SAVED' : 'FINISH SESSION'}
                </Text>
                {!isSaved && (
                  <Ionicons name="arrow-forward" size={20} color={colors.background} />
                )}
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.shareButton}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share stats"
          >
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
    overflow: 'hidden',
  },
  decorContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  blurRed: {
    top: '40%',
    left: '10%',
    width: 192,
    height: 192,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    transform: [{ translateY: -96 }],
  },
  blurPurple: {
    top: '40%',
    left: '30%',
    width: 256,
    height: 256,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    transform: [{ translateX: -128 }, { translateY: -128 }],
  },
  blurGray: {
    top: '40%',
    right: '10%',
    width: 192,
    height: 192,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    transform: [{ translateY: -96 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    zIndex: 20,
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl + spacing.md,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroValue: {
    fontSize: 80,
    fontWeight: '700',
    fontFamily: fonts.display,
    color: colors.textPrimary,
    letterSpacing: -2,
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  heroUnit: {
    fontSize: 28,
    fontWeight: '500',
    fontFamily: fonts.mono,
    color: colors.textMuted,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.xxl + spacing.md,
    width: '100%',
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
    padding: spacing.md,
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
    fontFamily: fonts.display,
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
    gap: 12,
    backgroundColor: '#F1F5F9',
    height: 64,
    borderRadius: radii.lg,
    // Tech shadow: 0 10px 0 0 #CBD5E1
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  finishButtonSaving: {
    opacity: 0.7,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.display,
    color: colors.background,
    letterSpacing: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
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
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  homeIndicatorBar: {
    width: 128,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
})
