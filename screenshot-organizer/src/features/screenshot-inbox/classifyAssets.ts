import { useSettingsStore } from '../../state/settings.store'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { mapOnDeviceLabelsToTags } from './onDeviceTagMapping'
import ExpoScreenshotClassify from 'expo-screenshot-classify'
import { logMlClassification } from '../analytics/mlLogs'

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

// Default when no classification is run (AI off, or no local AI result).
const DEFAULT_TAG = 'screenshot'

// Module-level dedup: tracks asset IDs already logged this app session.
// Prevents double-logging when multiple useGallery instances classify the same asset concurrently.
const loggedAssetIds = new Set<string>()

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
// Native module expects file:// URIs for local paths (Uri.parse + InputImage.fromFilePath).
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
    // ML Kit Android expects a proper file URI for local paths (scheme file://).
    if (imageUri.startsWith('/') && !imageUri.startsWith('file://')) {
      imageUri = `file://${imageUri}`
    }
    if (__DEV__) {
      console.log('[ML Kit] label() called with URI:', imageUri.replace(/^file:\/\/[^/]+/, 'file://…'))
    }
    const ImageLabeling = require('@react-native-ml-kit/image-labeling').default
    const result = await ImageLabeling.label(imageUri)
    if (__DEV__) {
      console.log('[ML Kit] raw result:', Array.isArray(result) ? `array[${result.length}]` : typeof result, result)
    }
    if (Array.isArray(result)) {
      const labels = result.map((r: { text?: string; label?: string }) => r?.text ?? r?.label ?? String(r)).filter(Boolean)
      if (__DEV__ && labels.length > 0) console.log('[ML Kit] labels:', labels)
      return labels
    }
    if (result?.labels) {
      return result.labels.map((l: { text?: string; label?: string }) => l?.text ?? l?.label ?? '').filter(Boolean)
    }
    if (__DEV__) console.log('[ML Kit] no labels (unexpected result shape)')
    return []
  } catch (e) {
    if (__DEV__) console.warn('[ML Kit] label() failed:', e)
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

/**
 * Dev-only: run on-device labeling on a single image URI and return raw labels + mapped tags.
 * Use from Settings "Test ML Kit" to verify ML Kit without the gallery (e.g. in emulator).
 */
export async function testOnDeviceLabeling(uri: string): Promise<{ rawLabels: string[]; tags: string[] }> {
  const rawLabels = await getOnDeviceLabels(uri)
  const tags = mapOnDeviceLabelsToTags(rawLabels, 'test.jpg')
  // Log test classification as well (helps debug ML behavior when user opts in).
  const source = Platform.OS === 'ios' ? 'ios_vision' : Platform.OS === 'android' ? 'android_mlkit' : 'android_mlkit'
  void logMlClassification({
    source,
    rawLabels,
    tags,
    filename: 'mlkit_test.jpg',
  })
  return { rawLabels, tags }
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

  // AI disabled → no classification
  if (!aiEnabled) {
    return assets.map(a => ({ ...a, tags: [DEFAULT_TAG] }))
  }

  // On-device only (Vision on iOS, ML Kit on Android). No result = default tag only.
  const CONCURRENCY = 2
  const classifiedAssets = await runWithConcurrency(assets, CONCURRENCY, async (asset) => {
    try {
      const labels = await getOnDeviceLabels(asset.uri)
      if (labels.length === 0) {
        if (!loggedAssetIds.has(asset.id)) {
          loggedAssetIds.add(asset.id)
          void logMlClassification({
            source: Platform.OS === 'ios' ? 'ios_vision' : 'android_mlkit',
            rawLabels: [],
            tags: [DEFAULT_TAG],
            filename: asset.filename,
            createdAt: new Date(asset.creationTime).toISOString(),
          })
        }
        return { ...asset, tags: [DEFAULT_TAG] }
      }
      const tags = mapOnDeviceLabelsToTags(labels, asset.filename)
      if (!loggedAssetIds.has(asset.id)) {
        loggedAssetIds.add(asset.id)
        void logMlClassification({
          source: Platform.OS === 'ios' ? 'ios_vision' : 'android_mlkit',
          rawLabels: labels,
          tags,
          filename: asset.filename,
          createdAt: new Date(asset.creationTime).toISOString(),
        })
      }
      return { ...asset, tags }
    } catch {
      return { ...asset, tags: [DEFAULT_TAG] }
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
      return { ...a, tags: [DEFAULT_TAG] }
    })
    return results
  }

  // On-device only. No local AI result = default tag only.
  const results: ClassifiedAsset[] = []
  const total = assets.length
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    try {
      const labels = await getOnDeviceLabels(asset.uri)
      if (labels.length === 0) {
        const classified = { ...asset, tags: [DEFAULT_TAG] }
        results.push(classified)
        if (!loggedAssetIds.has(asset.id)) {
          loggedAssetIds.add(asset.id)
          void logMlClassification({
            source: Platform.OS === 'ios' ? 'ios_vision' : 'android_mlkit',
            rawLabels: [],
            tags: classified.tags ?? [],
            filename: classified.filename,
            createdAt: new Date(classified.creationTime).toISOString(),
          })
        }
      } else {
        const tags = mapOnDeviceLabelsToTags(labels, asset.filename)
        const classified = { ...asset, tags }
        results.push(classified)
        if (!loggedAssetIds.has(asset.id)) {
          loggedAssetIds.add(asset.id)
          void logMlClassification({
            source: Platform.OS === 'ios' ? 'ios_vision' : 'android_mlkit',
            rawLabels: labels,
            tags,
            filename: classified.filename,
            createdAt: new Date(classified.creationTime).toISOString(),
          })
        }
      }
    } catch {
      results.push({ ...asset, tags: [DEFAULT_TAG] })
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

    if (tags.includes('meme') && age > oneWeek) return true
    if ((tags.includes('error') || tags.includes('screenshot') || tags.includes('ui')) && age > oneMonth) return true
    if (tags.includes('chat') && age > twoWeeks) return true
    if (tags.includes('receipt') && age > oneMonth * 3) return true
    if (tags.includes('ticket') && age > oneWeek) return true
    if (tags.includes('shopping') && age > oneMonth) return true
    if (tags.includes('recipe') && age > oneMonth) return true
    if (tags.includes('calendar') && age > oneWeek) return true
    if (tags.includes('email') && age > oneMonth) return true

    return false
  })
}

// Get tag color for UI
export function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    receipt: '#F59E0B',
    chat: '#8B5CF6',
    meme: '#EC4899',
    error: '#EF4444',
    article: '#10B981',
    photo: '#F97316',
    document: '#06B6D4',
    code: '#84CC16',
    map: '#6366F1',
    ticket: '#14B8A6',
    email: '#3B82F6',
    social: '#EC4899',
    shopping: '#F59E0B',
    finance: '#10B981',
    notes: '#8B5CF6',
    game: '#6366F1',
    recipe: '#EF4444',
    calendar: '#06B6D4',
    settings: '#64748B',
    ui: '#38BDF8',
    screenshot: '#38BDF8',
    small: '#64748B',
    large: '#94A3B8',
    panoramic: '#A855F7',
    portrait: '#D946EF',
  }
  return colors[tag] || '#94A3B8'
}

// Get tag icon for UI
export function getTagIcon(tag: string): string {
  const icons: Record<string, string> = {
    receipt: 'receipt-outline',
    chat: 'chatbubble-outline',
    meme: 'happy-outline',
    error: 'alert-circle-outline',
    article: 'newspaper-outline',
    photo: 'camera-outline',
    document: 'document-text-outline',
    code: 'code-slash-outline',
    map: 'map-outline',
    ticket: 'ticket-outline',
    email: 'mail-outline',
    social: 'share-social-outline',
    shopping: 'cart-outline',
    finance: 'wallet-outline',
    notes: 'list-outline',
    game: 'game-controller-outline',
    recipe: 'restaurant-outline',
    calendar: 'calendar-outline',
    settings: 'settings-outline',
    ui: 'phone-portrait-outline',
    screenshot: 'phone-portrait-outline',
  }
  return icons[tag] || 'image-outline'
}
