import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Switch, Alert, Platform, TextInput, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import { colors, spacing, radii } from '../../src/lib/theme'
import { useEntitlementStore } from '../../src/state/entitlement.store'
import { useSettingsStore } from '../../src/state/settings.store'
import { VALID_TAGS } from '../../src/features/screenshot-inbox/onDeviceTagMapping'
import { testOnDeviceLabeling } from '../../src/features/screenshot-inbox/classifyAssets'
import { fetchTagSuggestions, type TagSuggestion } from '../../src/features/analytics/tagSuggestions'

const TEST_IMAGE_URL = 'https://picsum.photos/seed/mlkit/400/300'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { entitlement, deletesRemaining, setEntitlement } = useEntitlementStore()
  const { aiEnabled, setAiEnabled, mlLogsEnabled, setMlLogsEnabled, customTags, addCustomTag, removeCustomTag, hiddenStaticTags, hideStaticTag, showStaticTag } = useSettingsStore()
  const [newTagInput, setNewTagInput] = useState('')
  const [mlKitTestStatus, setMlKitTestStatus] = useState<string | null>(null)
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[] | null>(null)
  const [tagSuggestionsLoading, setTagSuggestionsLoading] = useState(false)
  const [tagSuggestionsError, setTagSuggestionsError] = useState<string | null>(null)

  const loadTagSuggestions = React.useCallback(() => {
    if (!mlLogsEnabled) return
    setTagSuggestionsError(null)
    setTagSuggestionsLoading(true)
    fetchTagSuggestions({ minCount: 1, limit: 10 })
      .then(({ data, error }) => {
        if (error) {
          setTagSuggestionsError(error.message || 'Could not load suggestions')
          setTagSuggestions(null)
        } else {
          setTagSuggestions(data ?? [])
        }
      })
      .finally(() => setTagSuggestionsLoading(false))
  }, [mlLogsEnabled])

  useEffect(() => {
    if (!mlLogsEnabled) {
      setTagSuggestions(null)
      setTagSuggestionsError(null)
      return
    }
    loadTagSuggestions()
  }, [mlLogsEnabled, loadTagSuggestions])

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
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
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
          <View style={styles.row} testID="store-ml-logs-row">
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
              accessibilityLabel="Store ML logs"
            />
          </View>
          {mlLogsEnabled && (
            <View style={styles.suggestedTagsSection} testID="tag-suggestions-section">
              <Text style={styles.suggestedTagsLabel}>Suggested tags from your usage</Text>
              {tagSuggestionsLoading ? (
                <Text style={styles.suggestedTagsMuted}>Loading…</Text>
              ) : tagSuggestionsError ? (
                <Pressable onPress={loadTagSuggestions} accessibilityRole="button" accessibilityLabel="Retry loading suggestions">
                  <Text style={styles.suggestedTagsMuted}>{tagSuggestionsError}. Tap to retry.</Text>
                </Pressable>
              ) : tagSuggestions && tagSuggestions.length > 0 ? (
                <View style={styles.suggestionList}>
                  {tagSuggestions.map(s => (
                    <View key={s.rawLabel} style={styles.suggestionRow}>
                      <Text style={styles.suggestedTagsText}>{s.rawLabel} <Text style={styles.suggestedTagsMuted}>({s.count}×)</Text></Text>
                      <Pressable
                        style={styles.addTagButton}
                        onPress={() => addCustomTag(s.rawLabel)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${s.rawLabel} as custom tag`}
                      >
                        <Text style={styles.addTagButtonText}>+ Add</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.suggestedTagsMuted}>
                  No unmapped labels yet. Classify more screenshots to see suggestions.
                </Text>
              )}
            </View>
          )}
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

      {/* Custom Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Tags</Text>
        <View style={styles.card}>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              value={newTagInput}
              onChangeText={setNewTagInput}
              placeholder="Add a tag…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (newTagInput.trim()) {
                  addCustomTag(newTagInput.trim())
                  setNewTagInput('')
                }
              }}
            />
            <Pressable
              style={[styles.addTagButton, !newTagInput.trim() && { opacity: 0.4 }]}
              disabled={!newTagInput.trim()}
              onPress={() => {
                if (newTagInput.trim()) {
                  addCustomTag(newTagInput.trim())
                  setNewTagInput('')
                }
              }}
              accessibilityRole="button"
              accessibilityLabel="Add tag"
            >
              <Text style={styles.addTagButtonText}>Add</Text>
            </Pressable>
          </View>
          {customTags.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customTagsRow}>
              {customTags.map(tag => (
                <Pressable
                  key={tag}
                  style={styles.customTagChip}
                  onPress={() => removeCustomTag(tag)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove tag ${tag}`}
                  accessibilityHint="Tap to remove"
                >
                  <Text style={styles.customTagChipText}>#{tag}</Text>
                  <Text style={styles.customTagRemove}>✕</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.suggestedTagsMuted}>No custom tags yet. Add one above.</Text>
          )}
        </View>
      </View>

      {/* Built-in Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Built-in Tags</Text>
        <View style={styles.card}>
          <Text style={styles.aiSubLabel}>
            Hidden tags won't appear in the tag picker or filter bar. Assets already tagged keep their tags.
          </Text>
          <View style={styles.builtInTagsGrid}>
            {VALID_TAGS.map(tag => {
              const hidden = hiddenStaticTags.includes(tag)
              return (
                <Pressable
                  key={tag}
                  style={[styles.builtInTagChip, hidden && styles.builtInTagChipHidden]}
                  onPress={() => hidden ? showStaticTag(tag) : hideStaticTag(tag)}
                  accessibilityRole="button"
                  accessibilityLabel={hidden ? `Show tag ${tag}` : `Hide tag ${tag}`}
                  accessibilityState={{ selected: !hidden }}
                >
                  <Text style={[styles.builtInTagChipText, hidden && styles.builtInTagChipTextHidden]}>
                    {hidden ? '–' : '✓'} {tag}
                  </Text>
                </Pressable>
              )
            })}
          </View>
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
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
  suggestedTagsSection: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.slateBorder,
    gap: spacing.xs,
  },
  suggestedTagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  suggestedTagsText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  suggestedTagsMuted: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
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
  builtInTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  builtInTagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  builtInTagChipHidden: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  builtInTagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  builtInTagChipTextHidden: {
    color: colors.textMuted,
  },
  suggestionList: {
    gap: spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addTagButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  addTagButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  customTagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  customTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  customTagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  customTagRemove: {
    fontSize: 10,
    color: colors.textMuted,
  },
})
