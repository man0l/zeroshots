import React, { useCallback } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable, Platform, Linking } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { useKeptIdsStore } from '../../src/state/keptIds.store'
import { useEntitlementStore } from '../../src/state/entitlement.store'
import { useSettingsStore } from '../../src/state/settings.store'
import { events } from '../../src/features/analytics/events'
import { colors, fonts, spacing, radii, shadows, swipeThresholds } from '../../src/lib/theme'
import { getTagColor, classifyAssets } from '../../src/features/screenshot-inbox/classifyAssets'
import { setCachedTags } from '../../src/features/screenshot-inbox/classificationCache'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/state/auth.store'
import { saveSessionToSupabase } from '../../src/features/cleanup-session/saveSession'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_OUT = SCREEN_WIDTH * 0.8
const CARD_WIDTH = SCREEN_WIDTH - 32

export default function InboxScreen() {
  const isWebPreview = Platform.OS === 'web'
  const expoGoUrl = React.useMemo(() => {
    if (!isWebPreview || typeof window === 'undefined') return null
    return `exp://${window.location.host}`
  }, [isWebPreview])
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { assets, isLoading, permissionStatus, requestPermission, loadScreenshots, deleteAsset } = useGallery()
  const [permissionMessage, setPermissionMessage] = React.useState<string | null>(null)
  const [webMessage, setWebMessage] = React.useState<string | null>(null)
  const sessionAssetIdsRef = React.useRef('')
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
  const { aiEnabled } = useSettingsStore()

  const translateX = useSharedValue(0)
  const scale = useSharedValue(1)

  const keptIds = useKeptIdsStore((s) => s.ids)
  const [keptIdsHydrated, setKeptIdsHydrated] = React.useState(false)
  React.useEffect(() => {
    const check = () => setKeptIdsHydrated(true)
    if (useKeptIdsStore.persist.hasHydrated()) check()
    return useKeptIdsStore.persist.onFinishHydration(check)
  }, [])
  // Start or restart session when the gallery asset set changes (e.g. after adding a screenshot or pull-to-refresh)
  // Exclude assets the user has already kept — they're done with triage
  const toTriage = React.useMemo(() => {
    const keptSet = new Set(keptIds)
    return assets.filter((a) => !keptSet.has(a.id))
  }, [assets, keptIds])

  React.useEffect(() => {
    if (!keptIdsHydrated) return
    if (toTriage.length === 0) {
      if (assets.length > 0) {
        // All assets have been kept — nothing left to triage
        endSession()
      }
      return
    }
    // Don't restart mid-session (e.g. when user keeps — we just advance, not rebuild)
    if (isRunning) return
    const ids = toTriage.map((a) => a.id).sort().join(',')
    if (ids !== sessionAssetIdsRef.current) {
      sessionAssetIdsRef.current = ids
      startSession(toTriage)
      events.sessionStarted(toTriage.length)
    }
  }, [toTriage, assets.length, startSession, endSession, isRunning, keptIdsHydrated])

  const handleRefresh = useCallback(async () => {
    endSession()
    await loadScreenshots()
  }, [endSession, loadScreenshots])

  const handleAction = useCallback(async (action: 'keep' | 'delete' | 'archive') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const state = useSessionStore.getState()
    const asset = state.queue[state.currentIndex]
    if (!asset) return

    // On-demand classification: if this asset is effectively untagged, run one-off tagging before we act.
    if (aiEnabled) {
      if (asset && (!asset.tags || asset.tags.length === 0)) {
        try {
          const [classified] = await classifyAssets([asset])
          if (classified?.tags?.length) {
            await setCachedTags({ [classified.id]: classified.tags })
          }
        } catch (e) {
          if (__DEV__) {
            console.warn('[Stack] On-swipe classification failed', e)
          }
        }
      }
    }

    if (action === 'delete' && entitlement === 'free' && deletesRemaining <= 0) {
      const { trustLimit } = useEntitlementStore.getState()
      events.paywallShown(trustLimit - deletesRemaining)
      router.push('/paywall')
      return
    }

    recordAction(action)

    if (action === 'delete') {
      events.assetDeleted(asset.id, asset.size ?? 0)
      useEntitlementStore.getState().decrementDeletes()
      try {
        await deleteAsset(asset.id)
      } catch (e) {
        console.error('Failed to delete asset from library:', e)
      }
    } else if (action === 'keep') {
      events.assetKept(asset.id)
      useKeptIdsStore.getState().addKept(asset.id)
    } else if (action === 'archive') {
      events.assetArchived(asset.id)
    }

    translateX.value = withSpring(
      action === 'keep' ? SWIPE_OUT : action === 'delete' ? -SWIPE_OUT : 0,
      { damping: 20, stiffness: 100 }
    )

    setTimeout(() => {
      nextAsset()
      translateX.value = 0
    }, 200)
  }, [aiEnabled, entitlement, deletesRemaining, deleteAsset])

  const handleSwipeLeft = useCallback(() => { void handleAction('delete') }, [handleAction])
  const handleSwipeRight = useCallback(() => { void handleAction('keep') }, [handleAction])

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

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission()
    if (!result?.granted) {
      if (result?.canAskAgain === false) {
        setPermissionMessage('Permission denied. Tap "Open Settings" to enable Photos access.')
      } else {
        setPermissionMessage('Permission not granted. Please allow access to continue.')
      }
    } else {
      setPermissionMessage(null)
    }
  }, [requestPermission])

  if (!permissionStatus?.granted && !isWebPreview) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Gallery Access Required</Text>
          <Pressable
            style={styles.permissionButton}
            onPress={handleRequestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant Permission"
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          {permissionStatus?.canAskAgain === false && (
            <Pressable
              style={[styles.permissionButton, styles.secondaryPermissionButton]}
              onPress={() => Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
            >
              <Text style={[styles.permissionButtonText, styles.secondaryPermissionButtonText]}>
                Open Settings
              </Text>
            </Pressable>
          )}
          {permissionMessage && (
            <Text style={styles.permissionHelpText}>{permissionMessage}</Text>
          )}
        </View>
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      </View>
    )
  }

  if (!isRunning) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{isWebPreview ? 'Web Preview Mode' : 'No Screenshots Found'}</Text>
          <Text style={styles.emptySubtitle}>
            {isWebPreview
              ? 'Browser preview cannot access your device gallery. Open this app in native Expo Go to triage real screenshots.'
              : 'No screenshots are available to review yet.'}
          </Text>
          {isWebPreview && expoGoUrl && (
            <Pressable
              style={styles.permissionButton}
              onPress={async () => {
                try {
                  await Linking.openURL(expoGoUrl)
                  setWebMessage(null)
                } catch {
                  setWebMessage('Could not open Expo Go automatically. Open Expo Go and scan/run the exp:// URL manually.')
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Open in Expo Go"
            >
              <Text style={styles.permissionButtonText}>Open in Expo Go</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.finishButton, isWebPreview && styles.webSecondaryButton]}
            onPress={() => router.push('/library')}
            accessibilityRole="button"
            accessibilityLabel="Open Vault"
          >
            <Text style={[styles.finishButtonText, isWebPreview && styles.webSecondaryButtonText]}>Open Vault</Text>
          </Pressable>
          {webMessage && (
            <Text style={styles.permissionHelpText}>{webMessage}</Text>
          )}
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
              events.sessionCompleted(stats.deletedCount, stats.archivedCount, stats.savedBytes)
              const { user } = useAuthStore.getState()
              if (user) {
                void saveSessionToSupabase(user.id).catch(e => {
                  if (__DEV__) console.warn('[Session] Auto-save failed:', e)
                })
              }
              router.push('/review-session')
            }}
            accessibilityRole="button"
            accessibilityLabel="View Summary"
          >
            <Text style={styles.finishButtonText}>View Summary</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  const createdAt = Number(currentAsset.creationTime || Date.now())
  const daysOld = Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)))
  const trustPercent = entitlement === 'free' ? (deletesRemaining / 15) * 100 : 100
  const contentBottomPadding = insets.bottom + 72

  return (
    <View style={[styles.container, { paddingBottom: contentBottomPadding }]}>
      {/* Ambient top glow */}
      <View style={styles.ambientGlow} />

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
                  { width: `${trustPercent}%` }
                ]} 
              />
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          {!isWebPreview && (
            <Pressable
              style={styles.gridButton}
              onPress={handleRefresh}
              accessibilityRole="button"
              accessibilityLabel="Refresh gallery"
            >
              <Ionicons name="refresh" size={24} color={colors.textMuted} />
            </Pressable>
          )}
          <Pressable 
            style={styles.gridButton}
            onPress={() => router.push('/library')}
          >
            <Ionicons name="grid-outline" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.cardContainer}>
        {/* Stacked card shadows */}
        <View style={[styles.stackedCard, styles.stackedCard2]} />
        <View style={[styles.stackedCard, styles.stackedCard1]} />

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <Image 
              source={currentAsset.uri ? { uri: currentAsset.uri } : undefined}
              style={styles.cardImage}
              contentFit="cover"
            />

            {/* Tag badge - top right */}
            <View style={styles.tagContainer}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagHash}>#</Text>
                <Text style={styles.tagText}>
                  {currentAsset.tags?.[0]?.toUpperCase() || 'SCREENSHOT'}
                </Text>
              </View>
            </View>

            {/* Bottom gradient overlay */}
            <View style={styles.cardGradient} />

            {/* Bottom info */}
            <View style={styles.cardInfo}>
              <View style={styles.ageRow}>
                <Text style={styles.ageText}>{daysOld}d</Text>
                <Text style={styles.ageLabel}>old</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Ionicons name="server-outline" size={14} color={colors.primary} />
                  <Text style={styles.metaText}>
                    {currentAsset.size > 0
                      ? currentAsset.size >= 1024 * 1024
                        ? `${(currentAsset.size / 1024 / 1024).toFixed(1)} MB`
                        : `${Math.round(currentAsset.size / 1024)} KB`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.metaBadge}>
                  <Ionicons name="image-outline" size={14} color={colors.primary} />
                  <Text style={styles.metaText}>PNG</Text>
                </View>
                <Text style={styles.resolutionText}>
                  {currentAsset.width || 1125} × {currentAsset.height || 2436}
                </Text>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleAction('delete')}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Ionicons name="close" size={32} color={colors.delete} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.archiveButton]}
          onPress={() => handleAction('archive')}
          accessibilityRole="button"
          accessibilityLabel="Archive"
        >
          <Ionicons name="archive-outline" size={24} color={colors.archive} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.keepButton]}
          onPress={() => handleAction('keep')}
          accessibilityRole="button"
          accessibilityLabel="Keep"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: '25%',
    width: '50%',
    height: 300,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderRadius: 150,
    transform: [{ scaleX: 2 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
    zIndex: 30,
  },
  trustBadge: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
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
    marginTop: 2,
  },
  trustValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fonts.display,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    zIndex: 20,
  },
  stackedCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    aspectRatio: 3 / 4.5,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stackedCard2: {
    opacity: 0.2,
    transform: [{ scale: 0.92 }, { translateY: 8 }],
  },
  stackedCard1: {
    opacity: 0.4,
    transform: [{ scale: 0.96 }, { translateY: 4 }],
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 3 / 4.5,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  tagContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tagHash: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.primary,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    right: 32,
    zIndex: 10,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  ageText: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: fonts.display,
    color: colors.delete,
    textShadowColor: 'rgba(239, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  ageLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.display,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaText: {
    fontSize: 11,
    fontFamily: fonts.mono,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  resolutionText: {
    fontSize: 10,
    fontFamily: fonts.mono,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    zIndex: 30,
  },
  actionButton: {
    borderRadius: radii.full,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    maxWidth: 80,
    aspectRatio: 1,
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
    flex: 1,
    maxWidth: 80,
    aspectRatio: 1,
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
    zIndex: 30,
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
    fontFamily: fonts.display,
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
    fontFamily: fonts.display,
    color: colors.background,
  },
  webSecondaryButton: {
    marginTop: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textPrimary,
  },
  webSecondaryButtonText: {
    color: colors.textPrimary,
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
  secondaryPermissionButton: {
    marginTop: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryPermissionButtonText: {
    color: colors.primary,
  },
  permissionHelpText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
})
