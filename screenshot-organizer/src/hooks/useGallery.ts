import { useEffect, useState, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import * as MediaLibrary from 'expo-media-library'
import { classifyAssets, ClassifiedAsset } from '../features/screenshot-inbox/classifyAssets'
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
const MAX_ASSETS_TO_CLASSIFY = 40
const FREEMIUM_AI_LIMIT = 15 // Matches freemium delete quota

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
    }
  }, [isWeb, permissionStatus?.granted])

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

      const screenshots = media.assets
        .filter(isScreenshot)
        .map(asset => ({
          id: asset.id,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          creationTime: asset.creationTime,
          size: 0,
          filename: asset.filename ?? 'unknown.jpg',
          tags: ['screenshot'], // Default tag
        }))

      setAssets(screenshots)
      
      // Classify images in background — respect AI setting and freemium quota
      if (screenshots.length > 0) {
        const { aiEnabled } = useSettingsStore.getState()
        const { entitlement } = useEntitlementStore.getState()
        // Free plan with AI: cap at freemium limit (15) to control API costs
        // Heuristic classification has no cost cap
        const limit = aiEnabled && entitlement === 'free'
          ? FREEMIUM_AI_LIMIT
          : MAX_ASSETS_TO_CLASSIFY
        classifyScreenshots(screenshots.slice(0, limit))
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

      // Queue with strict concurrency=1: classify each asset sequentially.
      for (const screenshot of screenshots) {
        // Stop if a newer classification run has started.
        if (classificationRunIdRef.current !== runId) return

        const [classified] = await classifyAssets([screenshot])
        if (!classified) continue

        setAssets((prev) =>
          prev.map((asset) =>
            asset.id === classified.id ? { ...asset, tags: classified.tags } : asset
          )
        )
      }
    } catch (err) {
      console.error('Classification error:', err)
    } finally {
      if (classificationRunIdRef.current === runId) {
        setIsClassifying(false)
      }
    }
  }, [])

  const deleteAsset = async (assetId: string) => {
    try {
      await MediaLibrary.deleteAssetsAsync([assetId])
      setAssets(prev => prev.filter(a => a.id !== assetId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete asset'))
      throw err
    }
  }

  const deleteAssets = async (assetIds: string[]) => {
    try {
      await MediaLibrary.deleteAssetsAsync(assetIds)
      setAssets(prev => prev.filter(a => !assetIds.includes(a.id)))
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
