import { useEffect, useState, useCallback, useRef } from 'react'
import { Platform, AppState, type AppStateStatus } from 'react-native'
import * as MediaLibrary from 'expo-media-library'
import { classifyAssets, ClassifiedAsset } from '../features/screenshot-inbox/classifyAssets'
import { getCachedTags, setCachedTags } from '../features/screenshot-inbox/classificationCache'
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
const MAX_ASSETS_TO_LOAD = 300
// AI classification cap per load to avoid heavy processing; applies to all plans.
const MAX_ASSETS_TO_CLASSIFY = 40

export function useGallery() {
  const isWeb = Platform.OS === 'web'
  const [assets, setAssets] = useState<ClassifiedAsset[]>([])
  const [isLoading, setIsLoading] = useState(!isWeb)
  const [isClassifying, setIsClassifying] = useState(false)
  const [permissionStatus, requestPermission] = Platform.OS === 'web'
    ? [{ granted: true, canAskAgain: true, expires: 'never', status: 'granted' } as MediaLibrary.PermissionResponse, async () => ({ granted: true, canAskAgain: true, expires: 'never', status: 'granted' } as MediaLibrary.PermissionResponse)]
    : MediaLibrary.usePermissions()
  const [error, setError] = useState<Error | null>(null)
  const classificationRunIdRef = useRef(0)

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

  // Reload gallery when app comes back to foreground (e.g. after taking a new screenshot)
  useEffect(() => {
    if (Platform.OS === 'web' || !permissionStatus?.granted) return
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        loadScreenshots()
      }
    })
    return () => subscription.remove()
  }, [permissionStatus?.granted])

  const loadScreenshots = async () => {
    try {
      setIsLoading(true)
      // Cancel any in-flight classification loop from previous loads.
      classificationRunIdRef.current += 1
      
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: MAX_ASSETS_TO_LOAD,
      })

      const ids = media.assets.filter(isScreenshot).map(a => a.id)
      const cached = await getCachedTags(ids)

      const screenshots: ClassifiedAsset[] = media.assets
        .filter(isScreenshot)
        .map(asset => ({
          id: asset.id,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          creationTime: asset.creationTime,
          size: 0,
          filename: asset.filename ?? 'unknown.jpg',
          tags: cached[asset.id] ?? ['screenshot'],
        }))

      // In dev, when gallery is empty (e.g. emulator), show demo assets so you can test the UI and flows
      const useDemoAssets = __DEV__ && screenshots.length === 0
      const assetsToSet = useDemoAssets
        ? MOCK_ASSETS.map((a, i) => ({ ...a, id: `demo-${i}` }))
        : screenshots

      setAssets(assetsToSet)

      // Only classify real assets that have no cached tags — respect AI setting (skip for demo)
      if (!useDemoAssets && screenshots.length > 0) {
        const { aiEnabled } = useSettingsStore.getState()
        const limit = aiEnabled ? MAX_ASSETS_TO_CLASSIFY : 0
        const toClassify = screenshots.filter(a => !cached[a.id]?.length).slice(0, limit)
        if (toClassify.length > 0) {
          classifyScreenshots(toClassify)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load gallery'))
    } finally {
      setIsLoading(false)
    }
  }

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

  const requestGalleryPermission = useCallback(async () => {
    if (isWeb) {
      return null
    }
    return requestPermission()
  }, [isWeb, requestPermission])

  return {
    assets,
    isLoading,
    isClassifying,
    permissionStatus,
    requestPermission: requestGalleryPermission,
    error,
    loadScreenshots,
    deleteAsset,
    deleteAssets,
    getUniqueTags,
    filterByTag,
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
