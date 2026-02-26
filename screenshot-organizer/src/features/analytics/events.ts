import { supabase, edgeFn } from '../../lib/supabase/client'
import { useSettingsStore } from '../../state/settings.store'

/** Event payload for so-event-ingest edge function */
export interface IngestEvent {
  user_id: string | null
  event_name: string
  properties?: Record<string, unknown>
  timestamp?: string
}

/** Send events via so-event-ingest edge function (bypasses Kong credential stripping). */
export async function ingestEvents(events: IngestEvent[]): Promise<{ error?: Error }> {
  if (events.length === 0) return {}
  try {
    const { error } = await supabase.functions.invoke(edgeFn('event-ingest'), {
      body: { events },
    })
    if (error) return { error }
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) }
  }
}

export type EventName =
  | 'session_started'
  | 'session_completed'
  | 'asset_deleted'
  | 'asset_kept'
  | 'asset_archived'
  | 'asset_undone'
  | 'paywall_shown'
  | 'purchase_initiated'
  | 'purchase_completed'
  | 'purchase_failed'

export interface EventProperties {
  [key: string]: string | number | boolean | null
}

export function trackEvent(name: EventName, properties?: EventProperties): void {
  if (__DEV__) {
    console.log('[Analytics]', name, properties)
  }

  const { analyticsEnabled } = useSettingsStore.getState()
  if (!analyticsEnabled) return

  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      if (!userId) {
        if (__DEV__) console.warn('[Analytics] Skipping event — no authenticated user')
        return
      }

      const { error } = await ingestEvents([{
        user_id: userId,
        event_name: name,
        properties: properties ?? {},
        timestamp: new Date().toISOString(),
      }])

      if (error && __DEV__) {
        console.warn('[Analytics] Failed to send event:', error)
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[Analytics] Failed to send event:', e)
      }
    }
  })()
}

export const events = {
  sessionStarted: (assetCount: number) => 
    trackEvent('session_started', { asset_count: assetCount }),
  
  sessionCompleted: (deleted: number, archived: number, bytesSaved: number) =>
    trackEvent('session_completed', { 
      deleted_count: deleted, 
      archived_count: archived, 
      bytes_saved: bytesSaved 
    }),
  
  assetDeleted: (assetId: string, size: number) =>
    trackEvent('asset_deleted', { asset_id: assetId, size_bytes: size }),
  
  assetKept: (assetId: string) =>
    trackEvent('asset_kept', { asset_id: assetId }),
  
  assetArchived: (assetId: string) =>
    trackEvent('asset_archived', { asset_id: assetId }),
  
  assetUndone: (assetId: string, previousAction: string) =>
    trackEvent('asset_undone', { asset_id: assetId, previous_action: previousAction }),
  
  paywallShown: (deletesUsed: number) =>
    trackEvent('paywall_shown', { deletes_used: deletesUsed }),
  
  purchaseInitiated: () =>
    trackEvent('purchase_initiated'),
  
  purchaseCompleted: () =>
    trackEvent('purchase_completed'),
  
  purchaseFailed: (error: string) =>
    trackEvent('purchase_failed', { error }),
}
