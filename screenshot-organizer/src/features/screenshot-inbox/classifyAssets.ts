import { supabase, edgeFn } from '../../lib/supabase/client'
import { useAuthStore } from '../../state/auth.store'
import { Platform } from 'react-native'

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

// Convert image URI to base64
async function imageToBase64(uri: string): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      // Avoid aggressive image conversion on native devices; metadata-only classification is more stable.
      return null
    }

    const response = await fetch(uri)
    const blob = await response.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        const base64Data = base64.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to convert image to base64:', error)
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
  const { user } = useAuthStore.getState()
  
  if (!user) {
    console.warn('No user logged in, skipping classification')
    return assets.map(a => ({ ...a, tags: ['screenshot'] }))
  }

  const classifiedAssets: ClassifiedAsset[] = []

  for (const asset of assets) {
    try {
      console.log(`Classifying asset: ${asset.filename}`)
      
      // Convert image to base64
      const imageBase64 = await imageToBase64(asset.uri)
      
      // Call classification edge function
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

      if (error) {
        console.warn('Classification failed for asset:', asset.id, error)
        classifiedAssets.push({ ...asset, tags: ['screenshot'] })
      } else {
        console.log(`Classified ${asset.filename} as:`, data.tags)
        classifiedAssets.push({
          ...asset,
          tags: data.tags || ['screenshot'],
        })
      }
    } catch (err) {
      console.error('Error classifying asset:', err)
      classifiedAssets.push({ ...asset, tags: ['screenshot'] })
    }
  }

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
  const { user } = useAuthStore.getState()
  
  if (!user) {
    console.warn('No user logged in, skipping classification')
    return assets.map(a => ({ ...a, tags: ['screenshot'] }))
  }

  const results: ClassifiedAsset[] = []
  const total = assets.length

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    
    try {
      // Convert image to base64
      const imageBase64 = await imageToBase64(asset.uri)
      
      // Call classification edge function
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

      if (error) {
        console.warn('Classification failed:', asset.id, error)
        results.push({ ...asset, tags: ['screenshot'] })
      } else {
        results.push({ ...asset, tags: data.tags || ['screenshot'] })
      }
      
      // Report progress
      onProgress?.(i + 1, total)
      
      // Small delay between requests to avoid rate limiting
      if (i < assets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (err) {
      console.error('Error classifying asset:', err)
      results.push({ ...asset, tags: ['screenshot'] })
    }
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
