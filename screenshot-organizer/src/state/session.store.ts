import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = '@screenshot_organizer_session'

export type ActionType = 'keep' | 'delete' | 'archive'

export interface QueuedAsset {
  id: string
  uri: string
  width: number
  height: number
  creationTime: number
  size: number
  filename: string
  tags?: string[]
}

export interface SessionAction {
  assetId: string
  action: ActionType
  timestamp: number
}

interface SessionState {
  sessionId: string | null
  startTime: number | null
  queue: QueuedAsset[]
  currentIndex: number
  actions: SessionAction[]
  deletesUsed: number
  isRunning: boolean
  
  startSession: (assets: QueuedAsset[]) => void
  appendToQueue: (assets: QueuedAsset[]) => void
  /** Filter queue: remove kept/deleted items, use fresh data from toTriage. Preserve items not in toTriage (pagination overflow). */
  reconcileQueue: (toTriage: QueuedAsset[], keptIds: Set<string>) => void
  endSession: () => {
    deletedCount: number
    archivedCount: number
    reviewedCount: number
    savedBytes: number
    durationMs: number
  }
  recordAction: (action: ActionType) => void
  nextAsset: () => void
  undoLastAction: () => void
  resetSession: () => void
  updateQueueAssetTags: (assetId: string, tags: string[]) => void
}

function createSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  sessionId: null,
  startTime: null,
  queue: [],
  currentIndex: 0,
  actions: [],
  deletesUsed: 0,
  isRunning: false,

  startSession: (assets) => {
    set({
      sessionId: createSessionId(),
      startTime: Date.now(),
      queue: assets,
      currentIndex: 0,
      actions: [],
      deletesUsed: 0,
      isRunning: true,
    })
  },

  appendToQueue: (newAssets) => {
    const state = get()
    const existingIds = new Set(state.queue.map((q) => q.id))
    const toAppend = newAssets.filter((a) => !existingIds.has(a.id))
    if (toAppend.length === 0) return
    set({ queue: [...state.queue, ...toAppend] })
  },

  reconcileQueue: (toTriage, keptIds) => {
    const state = get()
    const triageMap = new Map(toTriage.map((a) => [a.id, a]))
    const deletedIds = new Set(state.actions.filter((a) => a.action === 'delete').map((a) => a.assetId))
    const filtered = state.queue
      .filter((q) => !keptIds.has(q.id) && !deletedIds.has(q.id))
      .map((q) => triageMap.get(q.id) ?? q)
    const currentAsset = state.queue[state.currentIndex]
    const newIndex =
      currentAsset && !keptIds.has(currentAsset.id) && !deletedIds.has(currentAsset.id)
        ? filtered.findIndex((a) => a.id === currentAsset.id)
        : 0
    const clampedIndex = Math.max(0, Math.min(newIndex >= 0 ? newIndex : 0, filtered.length - 1))
    set({ queue: filtered, currentIndex: clampedIndex })
  },

  endSession: () => {
    const state = get()
    const deletedCount = state.actions.filter(a => a.action === 'delete').length
    const archivedCount = state.actions.filter(a => a.action === 'archive').length
    const reviewedCount = state.actions.length
    const deletedAssets = state.actions
      .filter(a => a.action === 'delete')
      .map(a => state.queue.find(q => q.id === a.assetId))
      .filter(Boolean) as QueuedAsset[]
    const savedBytes = deletedAssets.reduce((sum, a) => sum + a.size, 0)
    const durationMs = state.startTime ? Date.now() - state.startTime : 0

    set({ isRunning: false })

    return {
      deletedCount,
      archivedCount,
      reviewedCount,
      savedBytes,
      durationMs,
    }
  },

  recordAction: (action) => {
    const state = get()
    const currentAsset = state.queue[state.currentIndex]
    if (!currentAsset) return

    set({
      actions: [
        ...state.actions,
        { assetId: currentAsset.id, action, timestamp: Date.now() },
      ],
      deletesUsed: action === 'delete' ? state.deletesUsed + 1 : state.deletesUsed,
    })
  },

  nextAsset: () => {
    set(state => ({ currentIndex: state.currentIndex + 1 }))
  },

  undoLastAction: () => {
    const state = get()
    const lastAction = state.actions[state.actions.length - 1]
    if (!lastAction) return

    set({
      actions: state.actions.slice(0, -1),
      currentIndex: Math.max(0, state.currentIndex),
      deletesUsed: lastAction.action === 'delete' ? state.deletesUsed - 1 : state.deletesUsed,
    })
  },

  resetSession: () => {
    set({
      sessionId: null,
      startTime: null,
      queue: [],
      currentIndex: 0,
      actions: [],
      deletesUsed: 0,
      isRunning: false,
    })
  },

  updateQueueAssetTags: (assetId, tags) => {
    set(state => ({
      queue: state.queue.map(q => q.id === assetId ? { ...q, tags } : q),
    }))
  },
}),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
