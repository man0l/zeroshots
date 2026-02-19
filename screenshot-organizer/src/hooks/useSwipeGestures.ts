import { useEffect } from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { swipeThresholds } from '../lib/theme'

type SwipeDirection = 'left' | 'right' | null

interface UseSwipeGesturesProps {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  enabled?: boolean
}

export function useSwipeGestures({ onSwipeLeft, onSwipeRight, enabled = true }: UseSwipeGesturesProps) {
  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((event) => {
      // Gesture is active
    })
    .onEnd((event) => {
      const { translationX, velocityX } = event
      
      const swipedRight = 
        translationX > swipeThresholds.distance || 
        velocityX > swipeThresholds.velocity
      
      const swipedLeft = 
        translationX < -swipeThresholds.distance || 
        velocityX < -swipeThresholds.velocity

      if (swipedRight) {
        runOnJS(onSwipeRight)()
      } else if (swipedLeft) {
        runOnJS(onSwipeLeft)()
      }
    })

  return { panGesture }
}
