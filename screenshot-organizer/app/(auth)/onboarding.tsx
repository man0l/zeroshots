import React, { useState, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions, FlatList, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as MediaLibrary from 'expo-media-library'
import { useAuthStore } from '../../src/state/auth.store'
import { colors, fonts, spacing, radii } from '../../src/lib/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'Clean Up Screenshots',
    description: 'Swipe through your screenshots and quickly delete the ones you don\'t need.',
    icon: '🧹',
  },
  {
    id: '2',
    title: 'Trust-First Design',
    description: 'Free accounts can delete up to 15 screenshots per session. Upgrade for unlimited.',
    icon: '🛡️',
  },
  {
    id: '3',
    title: 'Batch Delete',
    description: 'Use the Vault to select and delete multiple screenshots at once.',
    icon: '📦',
  },
  {
    id: '4',
    title: 'Track Your Progress',
    description: 'See how much storage you\'ve reclaimed after each cleanup session.',
    icon: '📊',
  },
]

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const { completeOnboarding } = useAuthStore()

  const finishOnboarding = async () => {
    if (isFinishing) return
    setIsFinishing(true)
    try {
      await completeOnboarding()
      router.replace('/(tabs)/inbox')
    } catch (error) {
      console.error('Failed to finish onboarding:', error)
      Alert.alert('Something went wrong', 'Could not continue right now. Please try again.')
    } finally {
      setIsFinishing(false)
    }
  }

  const handleNext = async () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
      setCurrentIndex(currentIndex + 1)
    } else {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status === 'granted') {
        await finishOnboarding()
      } else {
        Alert.alert(
          'Permission Required',
          'We need access to your photos to find and organize screenshots.',
          [{ text: 'OK' }]
        )
      }
    }
  }

  const handleSkip = () => {
    void finishOnboarding()
  }

  const renderSlide = ({ item }: { item: typeof ONBOARDING_SLIDES[0] }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH - spacing.lg * 2 }]}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  )

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome</Text>
        <Pressable onPress={handleSkip} accessibilityRole="button" accessibilityLabel="Skip">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        scrollEnabled={false}
      />

      <View style={styles.pagination}>
        {ONBOARDING_SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      <Pressable
        style={styles.button}
        onPress={handleNext}
        disabled={isFinishing}
        accessibilityRole="button"
        accessibilityLabel={currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
      >
        <Text style={styles.buttonText}>
          {isFinishing ? 'Please wait...' : currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </Pressable>

      <View style={{ height: insets.bottom + spacing.xl }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  skip: {
    fontSize: 16,
    color: colors.textMuted,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideDescription: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
})
