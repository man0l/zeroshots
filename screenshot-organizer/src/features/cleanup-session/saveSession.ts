import { supabase, edgeFn } from '../../lib/supabase/client'
import { useSessionStore } from '../../state/session.store'

export async function saveSessionToSupabase(userId: string) {
  const state = useSessionStore.getState()
  
  if (!state.sessionId || state.actions.length === 0) {
    throw new Error('No session to save')
  }

  // Calculate stats
  const deletedCount = state.actions.filter(a => a.action === 'delete').length
  const archivedCount = state.actions.filter(a => a.action === 'archive').length
  const reviewedCount = state.actions.length
  
  // Calculate saved bytes from deleted assets
  const deletedAssets = state.actions
    .filter(a => a.action === 'delete')
    .map(a => state.queue.find(q => q.id === a.assetId))
    .filter(Boolean)
  
  const savedBytes = deletedAssets.reduce((sum, a) => sum + (a?.size || 0), 0)

  // 1. Create cleanup session record
  const { data: sessionRecord, error: sessionError } = await supabase
    .from('cleanup_sessions')
    .insert({
      user_id: userId,
      started_at: new Date(state.startTime!).toISOString(),
      ended_at: new Date().toISOString(),
      reviewed_count: reviewedCount,
      deleted_count: deletedCount,
      archived_count: archivedCount,
      saved_bytes: savedBytes,
    })
    .select()
    .single()

  if (sessionError) throw sessionError

  // 2. Create cleanup actions records
  const actions = state.actions.map(action => ({
    session_id: sessionRecord.id,
    asset_id: action.assetId,
    action: action.action,
    action_at: new Date(action.timestamp).toISOString(),
  }))

  const { error: actionsError } = await supabase
    .from('cleanup_actions')
    .insert(actions)

  if (actionsError) throw actionsError

  // 3. Update usage counters via edge function
  if (deletedCount > 0) {
    const { error: usageError } = await supabase.functions.invoke(edgeFn('usage-enforce'), {
      body: { user_id: userId, count: deletedCount },
    })

    if (usageError) {
      console.error('Failed to update usage counter:', usageError)
      // Don't throw - session is saved, just usage counter might be off
    }
  }

  // 4. Send analytics events
  const { error: analyticsError } = await supabase.functions.invoke(edgeFn('event-ingest'), {
    body: {
      events: [
        {
          user_id: userId,
          name: 'session_completed',
          properties: {
            reviewed_count: reviewedCount,
            deleted_count: deletedCount,
            archived_count: archivedCount,
            saved_bytes: savedBytes,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  })

  if (analyticsError) {
    console.error('Failed to send analytics:', analyticsError)
  }

  return {
    sessionId: sessionRecord.id,
    deletedCount,
    archivedCount,
    savedBytes,
  }
}
