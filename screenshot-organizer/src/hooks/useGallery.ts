import { useEffect, useState, useCallback, useRef } from 'react'
import { Platform, AppState, type AppStateStatus } from 'react-native'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system/legacy'
import type { EventSubscription } from 'expo-modules-core'
import { classifyAssets, ClassifiedAsset } from '../features/screenshot-inbox/classifyAssets'
import { getCachedTags, setCachedTags } from '../features/screenshot-inbox/classificationCache'
import { logMlClassification } from '../features/analytics/mlLogs'
import { useSettingsStore } from '../state/settings.store'
import { useEntitlementStore } from '../state/entitlement.store'

const MOCK_ASSETS: ClassifiedAsset[] = [
  { id: '1', uri: 'https://picsum.photos/seed/ss1/400/600', width: 1125, height: 2436, creationTime: Date.now() - 420 * 86400000, size: 2.8 * 1024 * 1024, filename: 'screenshot_1.png', tags: ['receipt'] },
  { id: '2', uri: 'https://picsum.photos/seed/ss2/400/600', width: 1080, height: 1920, creationTime: Date.now() - 180 * 86400000, size: 1.2 * 1024 * 1024, filename: 'screenshot_2.png', tags: ['meme'] },
  { id: '3', uri: 'https://picsum.photos/seed/ss3/400/600', width: 1170, height: 2532, creationTime: Date.now() - 30 * 86400000, size: 3.5 * 1024 * 1024, filename: 'screenshot_3.png', tags: ['chat'] },
  { id: '4', uri: 'https://picsum.photos/seed/ss4/400/600', width: 1125, height: 2436, creationTime: Date.now() - 7 * 86400000, size: 0.9 * 1024 * 1024, filename: 'screenshot_4.png', tags: ['error'] },
  { id: '5', uri: 'https://picsum.photos/seed/ss5/400/600', width: 1080, height: 1920, creationTime: Date.now() - 90 * 86400000, size: 5.1 * 1024 * 1024, filename: 'screenshot_5.png', tags: ['article'] },
  { id: '6', uri: 'https://picsum.photos/seed/ss6/400/600', width: 1170, height: 2532, creationTime: Date.now() - 3 * 86400000, size: 0.45 * 1024 * 1024, filename: 'screenshot_6.png', tags: ['code'] },
]
const INITIAL_BATCH_SIZE = 150
const PAGE_SIZE = 50
// AI classification cap per load to avoid heavy processing; applies to all plans.
const MAX_ASSETS_TO_CLASSIFY = 40
const SIZE_FETCH_BATCH = 20

/** Fetch file size for an asset via getAssetInfoAsync + FileSystem. Returns 0 on failure. */
async function fetchAssetSize(asset: MediaLibrary.Asset): Promise<number> {
  if (Platform.OS === 'web') return 0
  try {
    // On iOS, allow download from iCloud to get localUri for size
    const options = Platform.OS === 'ios' ? { shouldDownloadFromNetwork: true } : undefined
    const info = await MediaLibrary.getAssetInfoAsync(asset, options)
    let uri = info.localUri ?? (asset.uri?.startsWith('file://') ? asset.uri : null)
    if (!uri && (asset.uri?.startsWith('file://') || asset.uri?.startsWith('content://'))) {
      uri = asset.uri
    }
    if (!uri) {
      if (__DEV__) console.log('[fetchAssetSize] No resolvable URI for asset', asset.id)
      return 0
    }
    const fi = await FileSystem.getInfoAsync(uri)
    if (fi.exists && 'size' in fi && typeof fi.size === 'number') return fi.size
    if (__DEV__) console.log('[fetchAssetSize] FileSystem.getInfoAsync failed or no size for', asset.id)
  } catch (e) {
    if (__DEV__) console.warn('[fetchAssetSize] Error for asset', asset.id, e)
  }
  return 0
}

/** Process raw MediaLibrary assets into ClassifiedAssets with sizes and cached tags. */
async function processAssetsToScreenshots(
  rawAssets: MediaLibrary.Asset[],
  cached: Record<string, string[]>
): Promise<ClassifiedAsset[]> {
  const filtered = rawAssets.filter(isScreenshot)
  const screenshots: ClassifiedAsset[] = []
  for (let i = 0; i < filtered.length; i += SIZE_FETCH_BATCH) {
    const chunk = filtered.slice(i, i + SIZE_FETCH_BATCH)
    const sizes = await Promise.all(chunk.map((a) => fetchAssetSize(a)))
    for (let j = 0; j < chunk.length; j++) {
      const asset = chunk[j]
      screenshots.push({
        id: asset.id,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        size: sizes[j] ?? 0,
        filename: asset.filename ?? 'unknown.jpg',
        tags: cached[asset.id] ?? [],
      })
    }
  }
  return screenshots
}

export function useGallery() {
  const isWeb = Platform.OS === 'web'
  const [assets, setAssets] = useState<ClassifiedAsset[]>([])
  const [isLoading, setIsLoading] = useState(!isWeb)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isClassifying, setIsClassifying] = useState(false)
  const endCursorRef = useRef<string | null>(null)
  const [permissionStatus, requestPermission] = Platform.OS === 'web'
    ? [{ granted: true, canAskAgain: true, expires: 'never', status: 'granted' } as MediaLibrary.PermissionResponse, async () => ({ granted: true, canAskAgain: true, expires: 'never', status: 'granted' } as MediaLibrary.PermissionResponse)]
    : MediaLibrary.usePermissions()
  const [error, setError] = useState<Error | null>(null)
  const classificationRunIdRef = useRef(0)
  const assetsRef = useRef<ClassifiedAsset[]>([])

  // Keep a ref in sync so callbacks don't need assets as a dep (avoids stale-closure issues)
  useEffect(() => { assetsRef.current = assets }, [assets])

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAssets(MOCK_ASSETS)
      setIsLoading(false)
      return
    }
    if (permissionStatus?.granted) {
      loadScreenshots()
      return
    }
    // In dev (e.g. emulator), show demo assets when gallery permission isn't granted so you can still test the UI
    if (__DEV__ && permissionStatus != null) {
      setAssets(MOCK_ASSETS.map((a, i) => ({ ...a, id: `demo-${i}` })))
      setIsLoading(false)
    }
  }, [isWeb, permissionStatus?.granted, permissionStatus])

  const classifyScreenshots = useCallback(async (screenshots: ClassifiedAsset[]) => {
    const runId = ++classificationRunIdRef.current
    try {
      setIsClassifying(true)

      const classified = await classifyAssets(screenshots)
      if (classificationRunIdRef.current !== runId) return

      const updates: Record<string, string[]> = {}
      for (const c of classified) {
        if (c.tags?.length) updates[c.id] = c.tags
      }
      await setCachedTags(updates)

      // Log ML events AFTER cache is persisted. This prevents re-logging on crash-before-cache scenarios:
      // if the app dies after logging but before caching, the next session re-classifies and re-logs (dup).
      // With cache saved first, next session finds the cached result and skips classification entirely.
      const source = Platform.OS === 'ios' ? 'ios_vision' : 'android_mlkit'
      for (const c of classified) {
        if (c.rawLabels !== undefined) {
          void logMlClassification({
            source,
            rawLabels: c.rawLabels,
            tags: c.tags ?? [],
            filename: c.filename,
            createdAt: new Date(c.creationTime).toISOString(),
          })
        }
      }

      setAssets((prev) =>
        prev.map((asset) => {
          const c = classified.find((x) => x.id === asset.id)
          return c ? { ...asset, tags: c.tags } : asset
        })
      )
    } catch (err) {
      console.error('Classification error:', err)
    } finally {
      if (classificationRunIdRef.current === runId) {
        setIsClassifying(false)
      }
    }
  }, [])

  // On app resume: refresh first batch and merge with existing paginated assets.
  // Avoids truncating to 80 when user had loaded more via infinite scroll.
  const refreshFirstBatchPreservingPagination = useCallback(async () => {
    if (Platform.OS === 'web') return
    try {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: INITIAL_BATCH_SIZE,
      })
      endCursorRef.current = media.endCursor ?? null
      setHasNextPage(media.hasNextPage ?? false)
      if (media.assets.length === 0) return

      const ids = media.assets.map((a) => a.id)
      const cached = await getCachedTags(ids)
      const firstBatchScreenshots = await processAssetsToScreenshots(media.assets, cached)
      const firstBatchIds = new Set(firstBatchScreenshots.map((a) => a.id))

      setAssets((prev) => {
        const preserved = prev.filter((a) => !firstBatchIds.has(a.id))
        return [...firstBatchScreenshots, ...preserved]
      })

      const { aiEnabled } = useSettingsStore.getState()
      const limit = aiEnabled ? MAX_ASSETS_TO_CLASSIFY : 0
      const toClassify = firstBatchScreenshots.filter((a) => !cached[a.id]?.length).slice(0, limit)
      if (toClassify.length > 0) {
        classifyScreenshots(toClassify)
      }
    } catch (err) {
      if (__DEV__) console.warn('[useGallery] refreshFirstBatchPreservingPagination failed:', err)
    }
  }, [classifyScreenshots])

  useEffect(() => {
    if (Platform.OS === 'web' || !permissionStatus?.granted) return
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshFirstBatchPreservingPagination()
      }
    })
    return () => subscription.remove()
  }, [permissionStatus?.granted, refreshFirstBatchPreservingPagination])

  // Bug fix: screenshots taken while the app is in the foreground (hardware button) never
  // trigger an AppState transition, so the listener above misses them. MediaLibrary.addListener
  // fires on any media-library change regardless of app state.
  useEffect(() => {
    if (Platform.OS === 'web' || !permissionStatus?.granted) return
    const debounceRef = { timer: null as ReturnType<typeof setTimeout> | null }
    const sub: EventSubscription = MediaLibrary.addListener(() => {
      if (debounceRef.timer) clearTimeout(debounceRef.timer)
      debounceRef.timer = setTimeout(() => {
        refreshFirstBatchPreservingPagination()
      }, 800)
    })
    return () => {
      sub.remove()
      if (debounceRef.timer) clearTimeout(debounceRef.timer)
    }
  }, [permissionStatus?.granted, refreshFirstBatchPreservingPagination])

  const loadScreenshots = useCallback(async () => {
    try {
      setIsLoading(true)
      classificationRunIdRef.current += 1

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: INITIAL_BATCH_SIZE,
      })

      endCursorRef.current = media.endCursor ?? null
      setHasNextPage(media.hasNextPage ?? false)

      const ids = media.assets.map((a) => a.id)
      const cached = await getCachedTags(ids)
      const screenshots = await processAssetsToScreenshots(media.assets, cached)

      const useDemoAssets = __DEV__ && screenshots.length === 0
      const assetsToSet = useDemoAssets
        ? MOCK_ASSETS.map((a, i) => ({ ...a, id: `demo-${i}` }))
        : screenshots

      setAssets(assetsToSet)

      if (!useDemoAssets && screenshots.length > 0) {
        const { aiEnabled } = useSettingsStore.getState()
        const limit = aiEnabled ? MAX_ASSETS_TO_CLASSIFY : 0
        const toClassify = screenshots.filter((a) => !cached[a.id]?.length).slice(0, limit)
        if (toClassify.length > 0) {
          classifyScreenshots(toClassify)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load gallery'))
    } finally {
      setIsLoading(false)
    }
  }, [classifyScreenshots])

  const loadMoreScreenshots = useCallback(async () => {
    if (Platform.OS === 'web' || isLoadingMore || !hasNextPage || !endCursorRef.current) return
    try {
      setIsLoadingMore(true)
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: PAGE_SIZE,
        after: endCursorRef.current,
      })

      endCursorRef.current = media.endCursor ?? null
      setHasNextPage(media.hasNextPage ?? false)

      if (media.assets.length === 0) return

      const ids = media.assets.map((a) => a.id)
      const cached = await getCachedTags(ids)
      const newScreenshots = await processAssetsToScreenshots(media.assets, cached)

      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const deduped = newScreenshots.filter((a) => !existingIds.has(a.id))
        return [...prev, ...deduped]
      })

      if (newScreenshots.length > 0) {
        const { aiEnabled } = useSettingsStore.getState()
        const limit = aiEnabled ? MAX_ASSETS_TO_CLASSIFY : 0
        const toClassify = newScreenshots.filter((a) => !cached[a.id]?.length).slice(0, limit)
        if (toClassify.length > 0) {
          classifyScreenshots(toClassify)
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[useGallery] loadMoreScreenshots failed:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [classifyScreenshots, hasNextPage])

  const deleteAsset = async (assetId: string) => {
    if (assetId.startsWith('demo-')) {
      setAssets(prev => prev.filter(a => a.id !== assetId))
      return
    }
    try {
      await MediaLibrary.deleteAssetsAsync([assetId])
      setAssets(prev => prev.filter(a => a.id !== assetId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete asset'))
      throw err
    }
  }

  const deleteAssets = async (assetIds: string[]) => {
    const realIds = assetIds.filter(id => !id.startsWith('demo-'))
    const demoIds = assetIds.filter(id => id.startsWith('demo-'))
    if (demoIds.length > 0) {
      setAssets(prev => prev.filter(a => !demoIds.includes(a.id)))
    }
    if (realIds.length === 0) return
    try {
      await MediaLibrary.deleteAssetsAsync(realIds)
      setAssets(prev => prev.filter(a => !realIds.includes(a.id)))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete assets'))
      throw err
    }
  }

  // Get unique tags from all assets
  const getUniqueTags = useCallback(() => {
    const tagsSet = new Set<string>()
    assets.forEach(asset => {
      asset.tags?.forEach(tag => tagsSet.add(tag))
    })
    return Array.from(tagsSet).sort()
  }, [assets])

  // Filter assets by tag
  const filterByTag = useCallback((tag: string | null) => {
    if (!tag) return assets
    return assets.filter(asset => asset.tags?.includes(tag))
  }, [assets])

  /** Persist updated tags for an asset and reflect the change in gallery state. */
  const updateAssetTags = useCallback(async (assetId: string, tags: string[]) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, tags } : a))
    await setCachedTags({ [assetId]: tags })
  }, [])

  /**
   * Load any kept asset IDs that are not yet in the gallery (e.g. older photos beyond
   * the initial 150-asset batch). Called by the Vault's "Kept" filter so users see all
   * kept screenshots even if they pre-date the loaded window.
   */
  const loadKeptAssets = useCallback(async (keptIds: string[]) => {
    if (Platform.OS === 'web' || keptIds.length === 0) return
    const loadedIds = new Set(assetsRef.current.map(a => a.id))
    const unloaded = keptIds.filter(id => !loadedIds.has(id))
    if (unloaded.length === 0) return
    const loaded: ClassifiedAsset[] = []
    for (const id of unloaded) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(id)
        if (!info) continue
        const size = await fetchAssetSize(info)
        const cached = await getCachedTags([id])
        loaded.push({
          id: info.id,
          uri: info.uri ?? info.localUri ?? '',
          width: info.width,
          height: info.height,
          creationTime: info.creationTime,
          size,
          filename: info.filename ?? 'unknown.jpg',
          tags: cached[id] ?? ['screenshot'],
        })
      } catch {
        // Asset may have been deleted from the device; skip silently
      }
    }
    if (loaded.length > 0) {
      setAssets(prev => {
        const existingIds = new Set(prev.map(a => a.id))
        return [...prev, ...loaded.filter(a => !existingIds.has(a.id))]
      })
    }
  }, [])

  // Classify the next batch of untagged assets (used by Vault infinite scroll).
  const classifyNextBatch = useCallback(async () => {
    const { aiEnabled } = useSettingsStore.getState()
    if (!aiEnabled || assets.length === 0) return
    // Consider assets that are effectively untagged.
    const candidates = assets.filter(a => !a.tags || a.tags.length === 0)
    if (candidates.length === 0) return
    const toClassify = candidates.slice(0, MAX_ASSETS_TO_CLASSIFY)
    await classifyScreenshots(toClassify)
  }, [assets, classifyScreenshots])

  const requestGalleryPermission = useCallback(async () => {
    if (isWeb) {
      return null
    }
    return requestPermission()
  }, [isWeb, requestPermission])

  return {
    assets,
    isLoading,
    isLoadingMore,
    hasNextPage,
    isClassifying,
    permissionStatus,
    requestPermission: requestGalleryPermission,
    error,
    loadScreenshots,
    loadMoreScreenshots,
    deleteAsset,
    deleteAssets,
    getUniqueTags,
    filterByTag,
    classifyNextBatch,
    updateAssetTags,
    loadKeptAssets,
  }
}

function isScreenshot(asset: MediaLibrary.Asset): boolean {
  const filename = (asset.filename ?? '').toLowerCase()
  const uri = (asset.uri ?? '').toLowerCase()
  
  if (filename.includes('screenshot') || filename.includes('img-')) {
    return true
  }

  if (uri.includes('screenshots')) {
    return true
  }

  return false
}
