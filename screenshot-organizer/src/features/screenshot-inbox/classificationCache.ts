import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEY = '@screenshot_organizer_classification'

export type CachedTags = Record<string, string[]>

export async function getCachedTags(assetIds: string[]): Promise<CachedTags> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const all: CachedTags = JSON.parse(raw)
    const result: CachedTags = {}
    for (const id of assetIds) {
      if (all[id]?.length) result[id] = all[id]
    }
    return result
  } catch {
    return {}
  }
}

export async function getFullCache(): Promise<CachedTags> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/** Merge new classification results into the persisted cache. */
export async function setCachedTags(updates: CachedTags): Promise<void> {
  if (Object.keys(updates).length === 0) return
  try {
    const existing = await getFullCache()
    const merged: CachedTags = { ...existing }
    for (const [id, tags] of Object.entries(updates)) {
      if (Array.isArray(tags) && tags.length > 0) merged[id] = tags
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged))
  } catch (e) {
    console.warn('Classification cache write failed:', e)
  }
}
