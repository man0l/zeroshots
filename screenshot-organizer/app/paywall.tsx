import React from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, fonts, spacing, radii } from '../src/lib/theme'
import { useEntitlementStore } from '../src/state/entitlement.store'

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
      {/* Dark overlay backdrop */}
      <Pressable style={styles.backdrop} onPress={handleWait} />
      
      {/* Glass modal from bottom */}
      <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <View style={styles.content}>
          {/* Progress ring with lock icon */}
          <View style={styles.iconContainer}>
            {/* Glow behind the ring */}
            <View style={styles.iconGlow} />
            
            {/* Outer ring */}
            <View style={styles.progressRing}>
              {/* Inner lock circle */}
              <View style={styles.lockCircle}>
                <Ionicons name="lock-closed" size={36} color={colors.primary} />
              </View>
            </View>

            {/* "Capacity Full" badge */}
            <View style={styles.capacityBadge}>
              <Text style={styles.capacityText}>Capacity Full</Text>
            </View>
          </View>

          {/* Title and description */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              Trust Capacity{'\n'}
              <Text style={styles.titleHighlight}>Reached</Text>
            </Text>
            <Text style={styles.description}>
              The Trust-First model limits free accounts to 15 deletes per session to prevent accidental data loss.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Gradient upgrade button: cyan → purple */}
            <Pressable
              style={styles.upgradeButtonOuter}
              onPress={handleUpgrade}
              accessibilityRole="button"
              accessibilityLabel="Unlock Unlimited"
            >
              <LinearGradient
                colors={['#06B6D4', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <View style={styles.upgradeContent}>
                  <Ionicons name="flash" size={24} color={colors.textPrimary} />
                  <Text style={styles.upgradeText}>Unlock Unlimited</Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>$4.99</Text>
                </View>
              </LinearGradient>
            </Pressable>

            {/* Wait option */}
            <Pressable
              style={styles.waitButton}
              onPress={handleWait}
              accessibilityRole="button"
              accessibilityLabel="Wait 24h for next session"
            >
              <Ionicons name="time-outline" size={18} color="rgba(100, 116, 139, 1)" />
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
    borderBottomWidth: 0,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    padding: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  capacityBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radii.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  capacityText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: fonts.display,
    color: colors.backgroundDeep,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: fonts.display,
    textAlign: 'center',
    color: colors.textPrimary,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: colors.primary,
    textShadowColor: 'rgba(56, 189, 248, 0.4)',
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
    gap: 20,
    paddingHorizontal: spacing.sm,
  },
  upgradeButtonOuter: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.archive,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upgradeText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.display,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  priceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.lg,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.display,
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
    color: 'rgba(100, 116, 139, 1)',
    fontWeight: '500',
  },
})
