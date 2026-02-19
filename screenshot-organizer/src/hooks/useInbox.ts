import { useCallback, useMemo } from 'react'
import { useGallery } from './useGallery'
import { useSessionStore, QueuedAsset, ActionType } from '../state/session.store'
import { useEntitlementStore } from '../state/entitlement.store'
import { events } from '../features/analytics/events'

export function useInbox() {
  const { assets, isLoading, permissionStatus, requestPermission, deleteAsset } = useGallery()
  const {
    queue,
    currentIndex,
    startSession,
    recordAction,
    nextAsset,
    undoLastAction,
    endSession,
    isRunning,
    deletesUsed,
    actions,
  } = useSessionStore()
  const { entitlement, deletesRemaining, decrementDeletes } = useEntitlementStore()

  const currentAsset = queue[currentIndex]
  const progress = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0
  const isEmpty = currentIndex >= queue.length && queue.length > 0

  const initializeSession = useCallback(() => {
    if (assets.length > 0 && !isRunning) {
      startSession(assets)
      events.sessionStarted(assets.length)
    }
  }, [assets, isRunning, startSession])

  const handleAction = useCallback(async (action: ActionType) => {
    if (!currentAsset) return false

    if (action === 'delete' && entitlement === 'free' && deletesRemaining <= 0) {
      events.paywallShown(deletesUsed)
      return 'paywall'
    }

    recordAction(action)
    nextAsset()

    if (action === 'delete') {
      decrementDeletes()
      events.assetDeleted(currentAsset.id, currentAsset.size)
      try {
        await deleteAsset(currentAsset.id)
      } catch (error) {
        console.error('Failed to delete asset:', error)
      }
    } else if (action === 'keep') {
      events.assetKept(currentAsset.id)
    } else if (action === 'archive') {
      events.assetArchived(currentAsset.id)
    }

    return true
  }, [currentAsset, entitlement, deletesRemaining, deletesUsed, recordAction, nextAsset, decrementDeletes, deleteAsset])

  const handleUndo = useCallback(() => {
    const lastAction = actions[actions.length - 1]
    if (lastAction) {
      undoLastAction()
      events.assetUndone(lastAction.assetId, lastAction.action)
    }
  }, [actions, undoLastAction])

  const completeSession = useCallback(() => {
    const stats = endSession()
    events.sessionCompleted(
      stats.deletedCount,
      stats.archivedCount,
      stats.savedBytes
    )
    return stats
  }, [endSession])

  return {
    assets,
    queue,
    currentAsset,
    currentIndex,
    progress,
    isEmpty,
    isLoading,
    isRunning,
    permissionStatus,
    deletesRemaining,
    entitlement,
    
    initializeSession,
    handleAction,
    handleUndo,
    completeSession,
    requestPermission,
  }
}
