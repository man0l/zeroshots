import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radii } from '../../src/lib/theme'
import { useEntitlementStore } from '../../src/state/entitlement.store'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { entitlement, deletesRemaining, setEntitlement } = useEntitlementStore()

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Current Plan</Text>
            <Text style={styles.value}>
              {entitlement === 'free' ? 'Free' : entitlement === 'premium' ? 'Premium' : 'Lifetime'}
            </Text>
          </View>
          {entitlement === 'free' && (
            <View style={styles.row}>
              <Text style={styles.label}>Deletes Remaining</Text>
              <Text style={styles.value}>{deletesRemaining}/15</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        {entitlement === 'free' ? (
          <Pressable
            style={styles.upgradeCard}
            accessibilityRole="button"
            accessibilityLabel="Unlock Unlimited"
          >
            <View style={styles.upgradeContent}>
              <Ionicons name="infinite" size={24} color={colors.primary} />
              <View>
                <Text style={styles.upgradeTitle}>Unlock Unlimited</Text>
                <Text style={styles.upgradePrice}>$4.99 one-time</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="checkmark-circle" size={20} color={colors.keep} />
              <Text style={styles.activeText}>Active - Unlimited deletes</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => setEntitlement('free')}
            accessibilityRole="button"
            accessibilityLabel="Set Free"
          >
            <Text style={styles.label}>Set Free</Text>
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => setEntitlement('lifetime')}
            accessibilityRole="button"
            accessibilityLabel="Set Lifetime"
          >
            <Text style={styles.label}>Set Lifetime</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  upgradeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  upgradePrice: {
    fontSize: 12,
    color: colors.textMuted,
  },
  activeText: {
    fontSize: 16,
    color: colors.keep,
    marginLeft: spacing.sm,
  },
})
