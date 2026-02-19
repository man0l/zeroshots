import { useEffect, useState, useCallback } from 'react'
import * as MediaLibrary from 'expo-media-library'
import { QueuedAsset } from '../state/session.store'
import { classifyAssets, ClassifiedAsset } from '../features/screenshot-inbox/classifyAssets'

export function useGallery() {
  const [assets, setAssets] = useState<ClassifiedAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClassifying, setIsClassifying] = useState(false)
  const [permissionStatus, requestPermission] = MediaLibrary.usePermissions()
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (permissionStatus?.granted) {
      loadScreenshots()
    }
  }, [permissionStatus?.granted])

  const loadScreenshots = async () => {
    try {
      setIsLoading(true)
      
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ['creationTime'],
        first: 1000,
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
          filename: asset.filename,
          tags: ['screenshot'], // Default tag
        }))

      setAssets(screenshots)
      
      // Classify images in background
      if (screenshots.length > 0) {
        classifyScreenshots(screenshots)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load gallery'))
    } finally {
      setIsLoading(false)
    }
  }

  const classifyScreenshots = useCallback(async (screenshots: ClassifiedAsset[]) => {
    try {
      setIsClassifying(true)
      const classified = await classifyAssets(screenshots)
      setAssets(classified)
    } catch (err) {
      console.error('Classification error:', err)
    } finally {
      setIsClassifying(false)
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

  return {
    assets,
    isLoading,
    isClassifying,
    permissionStatus,
    requestPermission,
    error,
    loadScreenshots,
    deleteAsset,
    deleteAssets,
    getUniqueTags,
    filterByTag,
  }
}

function isScreenshot(asset: MediaLibrary.Asset): boolean {
  const filename = asset.filename.toLowerCase()
  
  if (filename.includes('screenshot') || filename.includes('img-')) {
    return true
  }

  if (asset.uri.toLowerCase().includes('screenshots')) {
    return true
  }

  return false
}
