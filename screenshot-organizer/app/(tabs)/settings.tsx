import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Switch, Alert, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import { colors, spacing, radii } from '../../src/lib/theme'
import { useEntitlementStore } from '../../src/state/entitlement.store'
import { useSettingsStore } from '../../src/state/settings.store'
import { testOnDeviceLabeling } from '../../src/features/screenshot-inbox/classifyAssets'

const TEST_IMAGE_URL = 'https://picsum.photos/seed/mlkit/400/300'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { entitlement, deletesRemaining, setEntitlement } = useEntitlementStore()
  const { aiEnabled, setAiEnabled, mlLogsEnabled, setMlLogsEnabled } = useSettingsStore()
  const [mlKitTestStatus, setMlKitTestStatus] = useState<string | null>(null)

  const runTestMlKit = async () => {
    setMlKitTestStatus('…')
    try {
      const cacheDir = FileSystem.cacheDirectory
      if (!cacheDir) {
        Alert.alert('ML Kit test', 'No cache directory')
        setMlKitTestStatus('No cache')
        return
      }
      const localPath = `${cacheDir}mlkit_test_${Date.now()}.jpg`
      await FileSystem.downloadAsync(TEST_IMAGE_URL, localPath)
      const uri = localPath.startsWith('file://') ? localPath : `file://${localPath}`
      const { rawLabels, tags } = await testOnDeviceLabeling(uri)
      await FileSystem.deleteAsync(localPath, { idempotent: true })
      const raw = rawLabels.length ? rawLabels.join(', ') : '(none)'
      const tagStr = tags.join(', ')
      Alert.alert(
        'ML Kit test',
        `Raw labels: ${raw}\n\nMapped tags: ${tagStr}\n\nCheck Metro/logcat for [ML Kit] logs.`
      )
      setMlKitTestStatus(rawLabels.length > 0 ? 'OK' : '0 labels')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('[Test ML Kit]', e)
      Alert.alert('ML Kit test failed', msg)
      setMlKitTestStatus('Err')
    } finally {
      setTimeout(() => setMlKitTestStatus(null), 3000)
    }
  }

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

      {/* AI Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Features</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.aiLabelGroup}>
              <Text style={styles.label}>AI Smart Scan</Text>
              <Text style={styles.aiSubLabel}>
                {aiEnabled
                  ? 'On-device classification is enabled for new photos.'
                  : 'On-device only — no photos are classified automatically.'}
              </Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={setAiEnabled}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.surfaceHighlight}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.aiLabelGroup}>
              <Text style={styles.label}>Store ML logs</Text>
              <Text style={styles.aiSubLabel}>
                Save anonymized label + tag summaries to Supabase to debug and improve classification. No images are uploaded.
              </Text>
            </View>
            <Switch
              value={mlLogsEnabled}
              onValueChange={setMlLogsEnabled}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.surfaceHighlight}
            />
          </View>
          <Pressable
            onPress={() => router.push('/privacy-policy')}
            style={styles.privacyRow}
            accessibilityRole="link"
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
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
          {__DEV__ && Platform.OS !== 'web' && (
            <Pressable
              style={styles.row}
              onPress={runTestMlKit}
              accessibilityRole="button"
              accessibilityLabel="Test ML Kit with downloaded image"
            >
              <Text style={styles.label}>Test ML Kit</Text>
              {mlKitTestStatus != null && (
                <Text style={styles.mlKitStatus}>{mlKitTestStatus}</Text>
              )}
            </Pressable>
          )}
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
  aiLabelGroup: {
    flex: 1,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  aiSubLabel: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slateBorder,
  },
  privacyLinkText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  mlKitStatus: {
    fontSize: 14,
    color: colors.textMuted,
  },
})
