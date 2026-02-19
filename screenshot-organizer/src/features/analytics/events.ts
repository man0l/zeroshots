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
  console.log('[Analytics]', name, properties)
  
  // In production, send to Supabase edge function
  // await supabase.functions.invoke('event-ingest', {
  //   body: { event_name: name, properties }
  // })
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
