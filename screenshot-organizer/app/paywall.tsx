import React from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { colors, fonts, spacing, radii, shadows } from '../src/lib/theme'
import { useEntitlementStore } from '../src/state/entitlement.store'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export default function PaywallScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { setEntitlement } = useEntitlementStore()

  const handleUpgrade = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setEntitlement('lifetime')
    router.back()
  }

  const handleWait = () => {
    router.back()
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={handleWait} />
      
      <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.handle} />

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <View style={styles.progressRing}>
              <View style={styles.lockCircle}>
                <Ionicons name="lock-closed" size={36} color={colors.primary} />
              </View>
            </View>
            <View style={styles.capacityBadge}>
              <Text style={styles.capacityText}>Capacity Full</Text>
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Trust Capacity{'\n'}
              <Text style={styles.titleHighlight}>Reached</Text>
            </Text>
            <Text style={styles.description}>
              The Trust-First model limits free accounts to 15 deletes per session to prevent accidental data loss.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
              <View style={styles.upgradeContent}>
                <Ionicons name="flash" size={24} color={colors.textPrimary} />
                <Text style={styles.upgradeText}>Unlock Unlimited</Text>
              </View>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>$4.99</Text>
              </View>
            </Pressable>

            <Pressable style={styles.waitButton} onPress={handleWait}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={styles.waitText}>Wait 24h for next session</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 11, 20, 0.9)',
  },
  modal: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 64,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  progressRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capacityBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  capacityText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.backgroundDeep,
    letterSpacing: 0.5,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    lineHeight: 40,
  },
  titleHighlight: {
    color: colors.primary,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.md,
    maxWidth: 280,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upgradeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.lg,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  waitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  waitText: {
    fontSize: 14,
    color: colors.textMuted,
  },
})
