import React, { useState, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useGallery } from '../../src/hooks/useGallery'
import { useKeptIdsStore } from '../../src/state/keptIds.store'
import { useSessionStore } from '../../src/state/session.store'
import { colors, fonts, spacing, radii, shadows } from '../../src/lib/theme'
import { getTagColor } from '../../src/features/screenshot-inbox/classifyAssets'
import { useRouter } from 'expo-router'
// expo-linear-gradient crashes under Fabric (newArchEnabled). Use a plain fade View.


const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_GAP = 1
const GRID_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3

type FilterType = 'all' | 'screenshots' | 'oldest' | 'largest'

export default function LibraryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { assets, deleteAssets, getUniqueTags, filterByTag, classifyNextBatch, loadMoreScreenshots } = useGallery()
  const hasKept = useKeptIdsStore((s) => s.hasKept)
  const actions = useSessionStore((s) => s.actions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /** Asset IDs kept in current session (not yet persisted to keptIds) */
  const sessionKeptIds = React.useMemo(
    () => new Set(actions.filter((a) => a.action === 'keep').map((a) => a.assetId)),
    [actions]
  )

  const isKept = useCallback(
    (id: string) => hasKept(id) || sessionKeptIds.has(id),
    [hasKept, sessionKeptIds]
  )
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const availableTags = React.useMemo(() => getUniqueTags(), [getUniqueTags])

  const filteredAssets = React.useMemo(() => {
    let filtered = activeTag ? filterByTag(activeTag) : [...assets]
    // Exclude assets the user has already kept (swiped right) — they're done with triage
    filtered = filtered.filter((a) => !isKept(a.id))
    switch (activeFilter) {
      case 'oldest':
        filtered.sort((a, b) => a.creationTime - b.creationTime)
        break
      case 'largest':
        filtered.sort((a, b) => b.size - a.size)
        break
      default:
        break
    }
    return filtered
  }, [assets, activeFilter, activeTag, filterByTag, isKept])

  const handleEndReached = useCallback(() => {
    // Load more assets when scrolling to end (limitless scrolling)
    loadMoreScreenshots()
    // Only auto-classify when showing the full, unfiltered library (All Items + All Tags).
    if (activeFilter === 'all' && !activeTag) {
      classifyNextBatch()
    }
  }, [activeFilter, activeTag, classifyNextBatch, loadMoreScreenshots])

  const toggleSelection = useCallback((id: string) => {
    Haptics.selectionAsync()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    
    try {
      await deleteAssets(Array.from(selectedIds))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to delete assets:', error)
    }
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Items' },
    { key: 'screenshots', label: 'Screenshots' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'largest', label: 'Largest' },
  ]

  const renderItem = ({ item, index }: { item: typeof assets[0]; index: number }) => {
    const isSelected = selectedIds.has(item.id)
    
    return (
      <Pressable
        style={[
          styles.gridItem,
          { marginRight: (index + 1) % 3 === 0 ? 0 : GRID_GAP },
          { marginBottom: GRID_GAP },
        ]}
        onPress={() => toggleSelection(item.id)}
      >
        <Image
          source={{ uri: item.uri }}
          style={[
            styles.thumbnail,
            { opacity: isSelected ? 0.6 : 0.9 },
          ]}
          contentFit="cover"
        />
        {isSelected && (
          <>
            <View style={styles.selectionOverlay} />
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={14} color={colors.textPrimary} />
            </View>
          </>
        )}
        {!isSelected && (
          <View style={styles.checkmarkEmpty} />
        )}
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>
            {item.size > 0
              ? item.size > 1024 * 1024
                ? `${(item.size / 1024 / 1024).toFixed(1)}MB`
                : `${Math.round(item.size / 1024)}KB`
              : '—'}
          </Text>
        </View>
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable 
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.title}>Library</Text>
        <Pressable style={styles.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        {filters.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[
              styles.filterButton,
              activeFilter === key && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(key)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={[
              styles.filterText,
              activeFilter === key && styles.filterTextActive,
            ]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tag filters (if available) */}
      {availableTags.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagFiltersContent}
          style={styles.tagFilters}
        >
          <Pressable
            style={[styles.tagButton, !activeTag && styles.tagButtonActive]}
            onPress={() => setActiveTag(null)}
          >
            <Text style={[styles.tagButtonText, !activeTag && styles.tagButtonTextActive]}>
              All Tags
            </Text>
          </Pressable>
          {availableTags.map(tag => (
            <Pressable
              key={tag}
              style={[
                styles.tagButton,
                activeTag === tag && styles.tagButtonActive,
                { borderColor: getTagColor(tag) }
              ]}
              onPress={() => setActiveTag(tag === activeTag ? null : tag)}
            >
              <Text style={[
                styles.tagButtonText,
                activeTag === tag && styles.tagButtonTextActive,
                { color: activeTag === tag ? getTagColor(tag) : colors.textMuted }
              ]}>
                #{tag}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Grid */}
      <View style={styles.gridBorder}>
        <FlatList
          data={filteredAssets}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={3}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
        />
      </View>

      {/* Bottom fade + floating delete + nav */}
      <View style={styles.bottomContainer}>
        <View style={[styles.bottomGradient, { backgroundColor: `${colors.background}CC` }]} />

        <View style={styles.bottomInner}>
          {selectedIds.size > 0 && (
            <Pressable
              style={styles.deleteButton}
              onPress={handleBatchDelete}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${selectedIds.size} selected`}
            >
              <Ionicons name="trash" size={20} color={colors.textPrimary} />
              <Text style={styles.deleteButtonText}>
                Delete ({selectedIds.size})
              </Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: `${colors.background}F2`,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  filters: {
    flexGrow: 0,
    paddingBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  tagFilters: {
    flexGrow: 0,
    paddingBottom: spacing.md,
  },
  tagFiltersContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tagButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  tagButtonTextActive: {
    fontWeight: '700',
  },
  gridBorder: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 240,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.delete,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  checkmarkEmpty: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    opacity: 0,
  },
  sizeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  sizeText: {
    fontSize: 9,
    fontFamily: fonts.mono,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    pointerEvents: 'box-none',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    pointerEvents: 'none',
  },
  bottomInner: {
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.delete,
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: spacing.xl,
    shadowColor: colors.delete,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 15,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: colors.textPrimary,
  },
})
