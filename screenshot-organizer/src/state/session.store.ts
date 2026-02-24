import { create } from 'zustand'

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
}

function createSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useSessionStore = create<SessionState>((set, get) => ({
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
}))
