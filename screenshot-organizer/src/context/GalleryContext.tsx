import React, { createContext, useContext, type ReactNode } from 'react'
import { useGallery } from '../hooks/useGallery'

type GalleryContextValue = ReturnType<typeof useGallery>

const GalleryContext = createContext<GalleryContextValue | null>(null)

export function GalleryProvider({ children }: { children: ReactNode }) {
  const gallery = useGallery()
  return (
    <GalleryContext.Provider value={gallery}>
      {children}
    </GalleryContext.Provider>
  )
}

export function useGalleryContext(): GalleryContextValue {
  const ctx = useContext(GalleryContext)
  if (!ctx) {
    throw new Error('useGalleryContext must be used within GalleryProvider')
  }
  return ctx
}
