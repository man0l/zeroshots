import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useGallery } from '../../src/hooks/useGallery'
import { useSessionStore } from '../../src/state/session.store'
import { useEntitlementStore } from '../../src/state/entitlement.store'
import { colors, fonts, spacing, radii, shadows, swipeThresholds } from '../../src/lib/theme'
import { getTagColor } from '../../src/features/screenshot-inbox/classifyAssets'
import { useRouter } from 'expo-router'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_OUT = SCREEN_WIDTH * 0.8

export default function InboxScreen() {
  const router = useRouter()
  const { assets, isLoading, permissionStatus, requestPermission } = useGallery()
  const { 
    queue, 
    currentIndex, 
    startSession, 
    recordAction, 
    nextAsset,
    deletesUsed,
    isRunning,
    endSession,
  } = useSessionStore()
  const { entitlement, deletesRemaining } = useEntitlementStore()

  const translateX = useSharedValue(0)
  const scale = useSharedValue(1)

  React.useEffect(() => {
    if (assets.length > 0 && !isRunning) {
      startSession(assets)
    }
  }, [assets.length])

  const handleAction = useCallback((action: 'keep' | 'delete' | 'archive') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    
    if (action === 'delete' && entitlement === 'free' && deletesRemaining <= 0) {
      router.push('/paywall')
      return
    }

    recordAction(action)
    
    if (action === 'delete') {
      useEntitlementStore.getState().decrementDeletes()
    }

    translateX.value = withSpring(
      action === 'keep' ? SWIPE_OUT : action === 'delete' ? -SWIPE_OUT : 0,
      { damping: 20, stiffness: 100 }
    )

    setTimeout(() => {
      nextAsset()
      translateX.value = 0
    }, 200)
  }, [entitlement, deletesRemaining])

  const handleSwipeLeft = useCallback(() => handleAction('delete'), [handleAction])
  const handleSwipeRight = useCallback(() => handleAction('keep'), [handleAction])

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX
      scale.value = 1 - Math.abs(event.translationX) / 1000
    })
    .onEnd((event) => {
      const { translationX, velocityX } = event
      
      if (translationX > swipeThresholds.distance || velocityX > swipeThresholds.velocity) {
        runOnJS(handleSwipeRight)()
      } else if (translationX < -swipeThresholds.distance || velocityX < -swipeThresholds.velocity) {
        runOnJS(handleSwipeLeft)()
      } else {
        translateX.value = withSpring(0)
        scale.value = withSpring(1)
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }))

  const currentAsset = queue[currentIndex]

  if (!permissionStatus?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Gallery Access Required</Text>
          <Pressable style={styles.permissionButton} onPress={() => requestPermission()}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  if (isLoading || !isRunning) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      </View>
    )
  }

  if (!currentAsset) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>All Done!</Text>
          <Text style={styles.emptySubtitle}>You've reviewed all screenshots</Text>
          <Pressable 
            style={styles.finishButton}
            onPress={() => {
              const stats = endSession()
              router.push('/review-session')
            }}
          >
            <Text style={styles.finishButtonText}>View Summary</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const daysOld = Math.floor((Date.now() - currentAsset.creationTime) / (1000 * 60 * 60 * 24))

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.trustBadge}>
          <Text style={styles.trustLabel}>Daily Trust</Text>
          <View style={styles.trustRow}>
            <Text style={styles.trustValue}>
              {entitlement === 'free' ? `${deletesRemaining}/15` : '∞'}
            </Text>
            <View style={styles.trustBar}>
              <View 
                style={[
                  styles.trustBarFill,
                  { width: `${entitlement === 'free' ? (deletesRemaining / 15) * 100 : 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>
        <Pressable 
          style={styles.gridButton}
          onPress={() => router.push('/library')}
        >
          <Ionicons name="grid-outline" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.cardContainer}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <Image 
              source={{ uri: currentAsset.uri }}
              style={styles.cardImage}
              contentFit="cover"
            />
            <View style={styles.cardOverlay}>
              <View style={styles.tagBadge}>
                <Text style={[styles.tagText, { color: getTagColor(currentAsset.tags?.[0] || 'screenshot') }]}>
                  #{currentAsset.tags?.[0]?.toUpperCase() || 'SCREENSHOT'}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.ageText}>{daysOld}d old</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="save-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText}>{(currentAsset.size / 1024 / 1024).toFixed(1)} MB</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="image-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText}>PNG</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        <Pressable 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleAction('delete')}
        >
          <Ionicons name="close" size={32} color={colors.delete} />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.archiveButton]}
          onPress={() => handleAction('archive')}
        >
          <Ionicons name="archive-outline" size={24} color={colors.archive} />
        </Pressable>
        <Pressable 
          style={[styles.actionButton, styles.keepButton]}
          onPress={() => handleAction('keep')}
        >
          <Ionicons name="checkmark-done" size={32} color={colors.keep} />
        </Pressable>
      </View>

      <View style={styles.swipeHints}>
        <Text style={[styles.swipeHint, { color: colors.delete }]}>Swipe Left to Kill</Text>
        <View style={styles.swipeDivider} />
        <Text style={[styles.swipeHint, { color: colors.keep }]}>Swipe Right to Keep</Text>
      </View>
    </View>
  )
}

import { Ionicons } from '@expo/vector-icons'

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
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  trustBadge: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trustLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  trustBar: {
    width: 64,
    height: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  gridButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 3 / 4,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  tagBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.primary,
  },
  cardInfo: {
    backgroundColor: 'transparent',
  },
  ageText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.delete,
    textShadowColor: colors.delete,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaText: {
    fontSize: 11,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  actionButton: {
    borderRadius: radii.full,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 80,
    height: 80,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    ...shadows.glowRed,
  },
  archiveButton: {
    width: 56,
    height: 56,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    ...shadows.glowPurple,
  },
  keepButton: {
    width: 80,
    height: 80,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    ...shadows.glowGreen,
  },
  swipeHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    opacity: 0.3,
  },
  swipeHint: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  swipeDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  finishButton: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
})
