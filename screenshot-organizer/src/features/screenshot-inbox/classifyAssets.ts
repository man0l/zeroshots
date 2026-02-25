import { supabase, edgeFn } from '../../lib/supabase/client'
import { useAuthStore } from '../../state/auth.store'
import { useSettingsStore } from '../../state/settings.store'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { mapOnDeviceLabelsToTags } from './onDeviceTagMapping'
import ExpoScreenshotClassify from 'expo-screenshot-classify'

export interface ClassifiedAsset {
  id: string
  uri: string
  width: number
  height: number
  creationTime: number
  size: number
  filename: string
  tags?: string[]
}

// On-device heuristic classifier — used when AI is disabled or as fallback
function classifyByHeuristics(
  filename: string,
  width: number,
  height: number,
  size: number
): string[] {
  const tags: string[] = []
  const lower = filename.toLowerCase()

  if (lower.includes('receipt') || lower.includes('invoice') || lower.includes('bill')) tags.push('receipt')
  if (lower.includes('chat') || lower.includes('message') || lower.includes('conversation')) tags.push('chat')
  if (lower.includes('meme') || lower.includes('funny')) tags.push('meme')
  if (lower.includes('error') || lower.includes('crash') || lower.includes('bug')) tags.push('error')
  if (lower.includes('ticket') || lower.includes('boarding')) tags.push('ticket')
  if (lower.includes('map') || lower.includes('direction')) tags.push('map')
  if (lower.includes('code') || lower.includes('terminal')) tags.push('code')
  if (lower.includes('article') || lower.includes('news')) tags.push('article')

  // Aspect ratio hints
  if (width > 0 && height > 0) {
    const ratio = width / height
    if (ratio > 2) tags.push('panoramic')
    if (ratio < 0.6) tags.push('portrait')
  }

  if (tags.length === 0) tags.push('screenshot')
  return tags
}

// On-device classification: returns raw labels from native (Vision on iOS, ML Kit on Android) or [] if unavailable.
async function getOnDeviceLabels(uri: string): Promise<string[]> {
  if (Platform.OS === 'ios' && ExpoScreenshotClassify?.classifyImageAsync) {
    try {
      return await ExpoScreenshotClassify.classifyImageAsync(uri)
    } catch {
      return []
    }
  }
  // Android: ML Kit is used when @react-native-ml-kit/image-labeling is installed (see getOnDeviceLabelsAndroid).
  if (Platform.OS === 'android') {
    return getOnDeviceLabelsAndroid(uri)
  }
  return []
}

// Android: ML Kit image labeling. Returns [] if package unavailable (e.g. Expo Go).
async function getOnDeviceLabelsAndroid(uri: string): Promise<string[]> {
  let tempPath: string | null = null
  try {
    let imageUri = uri
    if (uri.startsWith('content://')) {
      const cacheDir = FileSystem.cacheDirectory
      if (!cacheDir) return []
      tempPath = `${cacheDir}screenshot_classify_${Date.now()}.jpg`
      await FileSystem.copyAsync({ from: uri, to: tempPath })
      imageUri = tempPath
    }
    const ImageLabeling = require('@react-native-ml-kit/image-labeling').default
    const result = await ImageLabeling.label(imageUri)
    if (Array.isArray(result)) {
      return result.map((r: { text?: string; label?: string }) => r?.text ?? r?.label ?? String(r))
    }
    if (result?.labels) {
      return result.labels.map((l: { text?: string; label?: string }) => l?.text ?? l?.label ?? '')
    }
    return []
  } catch {
    return []
  } finally {
    if (tempPath) {
      try {
        await FileSystem.deleteAsync(tempPath, { idempotent: true })
      } catch {
        // ignore cleanup failure; cache will evict
      }
    }
  }
}

// Run async tasks with a concurrency limit; returns results in input order.
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++
      const item = items[i]
      results[i] = await fn(item, i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

// Max image size to send for AI (Gemini limit ~4MB; keep under to avoid timeouts)
const MAX_IMAGE_BYTES_FOR_AI = 3 * 1024 * 1024

// Convert image URI to base64 (web: fetch + FileReader; native: expo-file-system)
async function imageToBase64(
  uri: string,
  sizeBytes?: number
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri)
      const blob = await response.blob()
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          const base64Data = base64.split(',')[1]
          resolve(base64Data ?? null)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }

    // Native (Android/iOS): read file with expo-file-system
    const localUri = uri.startsWith('file://') || uri.startsWith('content://')
      ? uri
      : (uri.startsWith('/') ? `file://${uri}` : uri)

    const info = await FileSystem.getInfoAsync(localUri)
    if (!info.exists || info.isDirectory) return null
    const fileSize = 'size' in info ? info.size : 0
    if (fileSize > MAX_IMAGE_BYTES_FOR_AI) return null
    if (typeof sizeBytes === 'number' && sizeBytes > MAX_IMAGE_BYTES_FOR_AI) return null

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    })
    return base64 || null
  } catch (error) {
    console.warn('Failed to convert image to base64:', error)
    return null
  }
}

export async function classifyAssets(
  assets: Array<{
    id: string
    uri: string
    width: number
    height: number
    creationTime: number
    size: number
    filename: string
  }>
): Promise<ClassifiedAsset[]> {
  const { aiEnabled } = useSettingsStore.getState()

  // AI disabled → classify on-device instantly, no network call
  if (!aiEnabled) {
    return assets.map(a => ({
      ...a,
      tags: classifyByHeuristics(a.filename, a.width, a.height, a.size),
    }))
  }

  // Web: use Gemini (requires user)
  if (Platform.OS === 'web') {
    const { user } = useAuthStore.getState()
    if (!user) {
      return assets.map(a => ({ ...a, tags: classifyByHeuristics(a.filename, a.width, a.height, a.size) }))
    }
    const CONCURRENCY = 2
    return runWithConcurrency(assets, CONCURRENCY, async (asset) => {
      try {
        const imageBase64 = await imageToBase64(asset.uri, asset.size)
        const { data, error } = await supabase.functions.invoke(edgeFn('classify-image'), {
          body: {
            asset_id: asset.id,
            filename: asset.filename,
            width: asset.width,
            height: asset.height,
            size_bytes: asset.size,
            user_id: user.id,
            image_base64: imageBase64,
          },
        })
        if (error) return { ...asset, tags: ['screenshot'] as string[] }
        return { ...asset, tags: (data?.tags as string[]) || ['screenshot'] }
      } catch {
        return { ...asset, tags: ['screenshot'] as string[] }
      }
    })
  }

  // Native (iOS/Android): on-device classification (Vision / ML Kit), no login required
  const CONCURRENCY = 2
  const classifiedAssets = await runWithConcurrency(assets, CONCURRENCY, async (asset) => {
    try {
      const labels = await getOnDeviceLabels(asset.uri)
      const tags = mapOnDeviceLabelsToTags(labels, asset.filename)
      return { ...asset, tags }
    } catch {
      return { ...asset, tags: classifyByHeuristics(asset.filename, asset.width, asset.height, asset.size) }
    }
  })
  return classifiedAssets
}

// Batch classify with progress callback (for vault/grid view)
export async function classifyAssetsBatch(
  assets: Array<{
    id: string
    uri: string
    width: number
    height: number
    creationTime: number
    size: number
    filename: string
  }>,
  onProgress?: (completed: number, total: number) => void
): Promise<ClassifiedAsset[]> {
  const { aiEnabled } = useSettingsStore.getState()

  if (!aiEnabled) {
    const results = assets.map((a, i) => {
      onProgress?.(i + 1, assets.length)
      return { ...a, tags: classifyByHeuristics(a.filename, a.width, a.height, a.size) }
    })
    return results
  }

  // Web: use Gemini (requires user)
  if (Platform.OS === 'web') {
    const { user } = useAuthStore.getState()
    if (!user) {
      return assets.map(a => ({ ...a, tags: classifyByHeuristics(a.filename, a.width, a.height, a.size) }))
    }
    const results: ClassifiedAsset[] = []
    const total = assets.length
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]
      try {
        const imageBase64 = await imageToBase64(asset.uri, asset.size)
        const { data, error } = await supabase.functions.invoke(edgeFn('classify-image'), {
          body: {
            asset_id: asset.id,
            filename: asset.filename,
            width: asset.width,
            height: asset.height,
            size_bytes: asset.size,
            user_id: user.id,
            image_base64: imageBase64,
          },
        })
        results.push({ ...asset, tags: error ? ['screenshot'] : (data?.tags || ['screenshot']) })
      } catch {
        results.push({ ...asset, tags: ['screenshot'] })
      }
      onProgress?.(i + 1, total)
      if (i < assets.length - 1) await new Promise(r => setTimeout(r, 500))
    }
    return results
  }

  // Native: on-device (Vision / ML Kit)
  const results: ClassifiedAsset[] = []
  const total = assets.length
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    try {
      const labels = await getOnDeviceLabels(asset.uri)
      const tags = mapOnDeviceLabelsToTags(labels, asset.filename)
      results.push({ ...asset, tags })
    } catch {
      results.push({ ...asset, tags: classifyByHeuristics(asset.filename, asset.width, asset.height, asset.size) })
    }
    onProgress?.(i + 1, total)
    if (i < assets.length - 1) await new Promise(r => setTimeout(r, 200))
  }
  return results
}

// Get suggested deletes based on tags and age
export function getSuggestedDeletes(assets: ClassifiedAsset[]): ClassifiedAsset[] {
  const now = Date.now()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  const oneMonth = 30 * 24 * 60 * 60 * 1000
  const twoWeeks = 14 * 24 * 60 * 60 * 1000
  
  return assets.filter(asset => {
    const age = now - asset.creationTime
    const tags = asset.tags || []
    
    // Suggest deleting:
    // 1. Old memes (> 1 week)
    if (tags.includes('meme') && age > oneWeek) {
      return true
    }
    
    // 2. Old errors/screenshots (> 1 month)
    if ((tags.includes('error') || tags.includes('screenshot')) && age > oneMonth) {
      return true
    }
    
    // 3. Old chat screenshots (> 2 weeks)
    if (tags.includes('chat') && age > twoWeeks) {
      return true
    }
    
    // 4. Old receipts (> 3 months) - usually not needed after that
    if (tags.includes('receipt') && age > oneMonth * 3) {
      return true
    }
    
    // 5. Old tickets/boarding passes (> 1 week after date)
    if (tags.includes('ticket') && age > oneWeek) {
      return true
    }
    
    return false
  })
}

// Get tag color for UI
export function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    receipt: '#F59E0B', // Amber
    meme: '#EC4899', // Pink
    chat: '#8B5CF6', // Purple
    error: '#EF4444', // Red
    screenshot: '#38BDF8', // Sky Blue
    article: '#10B981', // Green
    photo: '#F97316', // Orange
    document: '#06B6D4', // Cyan
    code: '#84CC16', // Lime
    map: '#6366F1', // Indigo
    ticket: '#14B8A6', // Teal
    small: '#64748B', // Slate
    large: '#94A3B8', // Light Slate
    panoramic: '#A855F7', // Purple
    portrait: '#D946EF', // Fuchsia
  }
  
  return colors[tag] || '#94A3B8' // Default slate
}

// Get tag icon for UI
export function getTagIcon(tag: string): string {
  const icons: Record<string, string> = {
    receipt: 'receipt-outline',
    meme: 'happy-outline',
    chat: 'chatbubble-outline',
    error: 'alert-circle-outline',
    screenshot: 'phone-portrait-outline',
    article: 'newspaper-outline',
    photo: 'camera-outline',
    document: 'document-text-outline',
    code: 'code-slash-outline',
    map: 'map-outline',
    ticket: 'ticket-outline',
  }
  
  return icons[tag] || 'image-outline'
}
