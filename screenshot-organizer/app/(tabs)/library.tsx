import React, { useState, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable,
  Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { useGallery } from '../../src/hooks/useGallery'
import { colors, fonts, spacing, radii, shadows } from '../../src/lib/theme'
import { getTagColor } from '../../src/features/screenshot-inbox/classifyAssets'
import { useRouter } from 'expo-router'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_SIZE = (SCREEN_WIDTH - 2) / 3

type FilterType = 'all' | 'screenshots' | 'oldest' | 'largest'

export default function LibraryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { assets, deleteAssets, getUniqueTags, filterByTag } = useGallery()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const availableTags = React.useMemo(() => getUniqueTags(), [getUniqueTags])

  const filteredAssets = React.useMemo(() => {
    let filtered = activeTag ? filterByTag(activeTag) : [...assets]
    
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
  }, [assets, activeFilter, activeTag, filterByTag])

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

  const renderFilter = (filter: FilterType, label: string) => (
    <Pressable
      key={filter}
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text style={[
        styles.filterText,
        activeFilter === filter && styles.filterTextActive,
      ]}>
        {label}
      </Text>
    </Pressable>
  )

  const renderItem = ({ item }: { item: typeof assets[0] }) => {
    const isSelected = selectedIds.has(item.id)
    
    return (
      <Pressable
        style={styles.gridItem}
        onPress={() => toggleSelection(item.id)}
      >
        <Image
          source={{ uri: item.uri }}
          style={[styles.thumbnail, isSelected && styles.thumbnailSelected]}
          contentFit="cover"
        />
        {isSelected && (
          <View style={styles.selectionOverlay}>
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={14} color={colors.textPrimary} />
            </View>
          </View>
        )}
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>
            {item.size > 1024 * 1024 
              ? `${(item.size / 1024 / 1024).toFixed(1)}MB`
              : `${Math.round(item.size / 1024)}KB`}
          </Text>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={[styles.tagBadge, { backgroundColor: getTagColor(item.tags[0]) + '40' }]}>
            <Text style={[styles.tagText, { color: getTagColor(item.tags[0]) }]}>
              #{item.tags[0]}
            </Text>
          </View>
        )}
      </Pressable>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.title}>Library</Text>
        <Ionicons name="ellipsis-horizontal" size={24} color={colors.textMuted} />
      </View>

      <View style={styles.filters}>
        {renderFilter('all', 'All Items')}
        {renderFilter('screenshots', 'Screenshots')}
        {renderFilter('oldest', 'Oldest')}
        {renderFilter('largest', 'Largest')}
      </View>

      {availableTags.length > 0 && (
        <View style={styles.tagFilters}>
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
        </View>
      )}

      <FlatList
        data={filteredAssets}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={3}
        style={styles.grid}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      />

      {selectedIds.size > 0 && (
        <View style={[styles.batchActions, { bottom: insets.bottom + 100 }]}>
          <Pressable style={styles.deleteButton} onPress={handleBatchDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.deleteButtonText}>
              Delete ({selectedIds.size})
            </Text>
          </Pressable>
        </View>
      )}

      <BlurView 
        intensity={40} 
        tint="dark" 
        style={[styles.bottomNav, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Pressable style={styles.navItem} onPress={() => router.push('/(tabs)/inbox')}>
          <Ionicons name="layers-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navLabel}>Stack</Text>
        </Pressable>
        <Pressable style={styles.navItemActive}>
          <Ionicons name="grid" size={24} color={colors.primary} />
          <Text style={[styles.navLabel, { color: colors.primary }]}>Vault</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Ionicons name="stats-chart-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navLabel}>Stats</Text>
        </Pressable>
      </BlurView>
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
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  grid: {
    flex: 1,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  thumbnailSelected: {
    opacity: 0.6,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: colors.delete,
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
  },
  sizeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  sizeText: {
    fontSize: 9,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
  },
  batchActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.delete,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    ...shadows.glowRed,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.textPrimary,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navItemActive: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  tagFilters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
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
  tagBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  tagText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
})
