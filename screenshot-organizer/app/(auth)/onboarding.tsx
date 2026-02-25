import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  ViewStyle,
  Image,
  ImageBackground,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as MediaLibrary from 'expo-media-library'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../src/state/auth.store'
import { colors, spacing, radii, shadows } from '../../src/lib/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

type SlideId = 'welcome' | 'mechanic' | 'safety'

const SLIDES: SlideId[] = ['welcome', 'mechanic', 'safety']

function WelcomeVisual() {
  return (
    <View style={visualStyles.welcomeContainer}>
      {/* Background image */}
      <ImageBackground
        source={require('../../assets/images/onboarding/welcome-bg.png')}
        style={visualStyles.welcomeBgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', `${colors.background}80`, colors.background]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      
      {/* Back card - rotated -6deg */}
      <View style={[visualStyles.welcomeCard, visualStyles.welcomeCardBack]}>
        <View style={visualStyles.photoGrid}>
          <View style={visualStyles.photoGridItem} />
          <View style={visualStyles.photoGridItem} />
          <View style={visualStyles.photoGridItem} />
          <View style={visualStyles.photoGridItem} />
        </View>
        <View style={[visualStyles.actionBadge, shadows.glowSky]}>
          <MaterialCommunityIcons name="check" size={24} color={colors.background} />
        </View>
      </View>

      {/* Front card - rotated 3deg */}
      <View style={[visualStyles.welcomeCard, visualStyles.welcomeCardFront]}>
        <View style={visualStyles.cardHeader}>
          <View style={visualStyles.imageIconCircle}>
            <MaterialCommunityIcons name="image" size={16} color={colors.textPrimary} />
          </View>
          <View style={visualStyles.blurryBadge}>
            <Text style={visualStyles.blurryBadgeText}>Blurry</Text>
          </View>
        </View>
        <View style={visualStyles.cardImageArea}>
          <MaterialCommunityIcons name="image-broken" size={40} color="rgba(255,255,255,0.2)" />
        </View>
        <View style={visualStyles.cardTextLines}>
          <View style={[visualStyles.textLine, { width: '66%' }]} />
          <View style={[visualStyles.textLine, { width: '50%' }]} />
        </View>
      </View>
    </View>
  )
}

function SwipeVisual() {
  return (
    <View style={visualStyles.swipeContainer}>
      {/* Background stack layers */}
      <View style={[visualStyles.swipeCardStack, visualStyles.swipeCardStack2]} />
      <View style={[visualStyles.swipeCardStack, visualStyles.swipeCardStack1]} />
      
      {/* Main card */}
      <View style={visualStyles.swipeMainCard}>
        {/* Left indicator zone */}
        <LinearGradient
          colors={[`${colors.delete}33`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={visualStyles.swipeIndicatorLeft}
        >
          <MaterialCommunityIcons name="delete" size={32} color={colors.delete} />
        </LinearGradient>

        {/* Right indicator zone */}
        <LinearGradient
          colors={['transparent', `${colors.keep}33`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={visualStyles.swipeIndicatorRight}
        >
          <MaterialCommunityIcons name="check-circle" size={32} color={colors.keep} />
        </LinearGradient>

        {/* Card content area with background image */}
        <ImageBackground
          source={require('../../assets/images/onboarding/mechanic-bg.png')}
          style={visualStyles.swipeCardContent}
          resizeMode="cover"
        >
          {/* Tint overlay */}
          <LinearGradient
            colors={['rgba(26, 58, 47, 0.7)', 'rgba(13, 31, 26, 0.85)']}
            style={StyleSheet.absoluteFill}
          />
          {/* Bottom overlay with metadata */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
            style={visualStyles.swipeMetadataOverlay}
          >
            <View style={visualStyles.swipeMetadataRow}>
              <Text style={visualStyles.swipeScreenshotLabel}>SCREENSHOT</Text>
              <Text style={visualStyles.swipeTimestamp}>Today, 9:41 AM</Text>
            </View>
            <Text style={visualStyles.swipeFilename}>Project_Cyber_V2.png</Text>
            <View style={visualStyles.swipeBadgesRow}>
              <View style={visualStyles.swipeBadge}>
                <Text style={visualStyles.swipeBadgeText}>3.4 MB</Text>
              </View>
              <View style={visualStyles.swipeBadge}>
                <Text style={visualStyles.swipeBadgeText}>PNG</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Center gesture hint */}
        <View style={visualStyles.gestureHintContainer}>
          <MaterialCommunityIcons 
            name="chevron-double-left" 
            size={32} 
            color="rgba(255,255,255,0.4)" 
          />
          <View style={[visualStyles.gestureCircle, shadows.glowSky]}>
            <MaterialCommunityIcons name="gesture-tap" size={24} color={colors.textPrimary} />
          </View>
          <MaterialCommunityIcons 
            name="chevron-double-right" 
            size={32} 
            color="rgba(255,255,255,0.4)" 
          />
        </View>
      </View>
    </View>
  )
}

function ShieldVisual() {
  return (
    <View style={visualStyles.shieldContainer}>
      {/* Background glow */}
      <View style={visualStyles.shieldGlow} />
      
      {/* Shield container */}
      <View style={visualStyles.shieldBox}>
        <MaterialCommunityIcons 
          name="shield-lock" 
          size={96} 
          color={colors.primary} 
          style={visualStyles.shieldIcon}
        />
        {/* 30 DAYS badge */}
        <View style={visualStyles.daysBadge}>
          <MaterialCommunityIcons name="history" size={14} color={colors.primary} />
          <Text style={visualStyles.daysBadgeText}>30 DAYS</Text>
        </View>
      </View>

      {/* Floating checkmark - top right */}
      <View style={[visualStyles.floatingDecor, visualStyles.floatingCheckmark]}>
        <MaterialCommunityIcons name="check-circle" size={24} color={colors.keep} />
      </View>

      {/* Floating restore - bottom left */}
      <View style={[visualStyles.floatingDecor, visualStyles.floatingRestore]}>
        <MaterialCommunityIcons name="delete-restore" size={32} color={colors.textMuted} />
      </View>
    </View>
  )
}

function WelcomeSlide() {
  return (
    <View style={slideStyles.welcomeSlide}>
      <WelcomeVisual />
      <View style={slideStyles.contentSection}>
        <Text style={slideStyles.welcomeTitle}>
          Free up space,{' '}
          <Text style={slideStyles.welcomeTitleHighlight}>effortlessly.</Text>
        </Text>
        <Text style={slideStyles.welcomeSubtitle}>
          Your camera roll is full of receipts, duplicates, and blurry shots. We help you find them and clean them up in minutes.
        </Text>
      </View>
    </View>
  )
}

function MechanicSlide() {
  return (
    <View style={slideStyles.mechanicSlide}>
      <View style={slideStyles.mechanicTextSection}>
        <Text style={slideStyles.mechanicTitle}>Sort with a simple swipe.</Text>
        <Text style={slideStyles.mechanicSubtitle}>
          Swipe <Text style={{ color: colors.delete, fontWeight: '700' }}>Left</Text> to send to Trash.{'\n'}
          Swipe <Text style={{ color: colors.keep, fontWeight: '700' }}>Right</Text> to keep it safe.
        </Text>
      </View>
      <SwipeVisual />
    </View>
  )
}

function SafetySlide() {
  return (
    <View style={slideStyles.safetySlide}>
      <ShieldVisual />
      <View style={slideStyles.safetyTextSection}>
        <Text style={slideStyles.safetyTitle}>
          No accidents.{'\n'}Total control.
        </Text>
        <Text style={slideStyles.safetyDescription}>
          We never permanently delete your photos. Anything you trash simply moves to your phone's native{' '}
          <Text style={{ color: colors.primary, fontWeight: '500' }}>"Recently Deleted"</Text>
          {' '}folder, where it stays safe for 30 days. You can always change your mind.
        </Text>
      </View>
    </View>
  )
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
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

  const requestPermissionAndFinish = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync()
    if (status === 'granted') {
      await finishOnboarding()
    } else {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to find and organize screenshots. Please grant permission in Settings.',
        [{ text: 'OK' }]
      )
    }
  }

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      await requestPermissionAndFinish()
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSkip = async () => {
    await requestPermissionAndFinish()
  }

  const renderCurrentSlide = () => {
    switch (SLIDES[currentIndex]) {
      case 'welcome':
        return <WelcomeSlide />
      case 'mechanic':
        return <MechanicSlide />
      case 'safety':
        return <SafetySlide />
      default:
        return null
    }
  }

  const getButtonStyle = (): ViewStyle => {
    if (currentIndex === 1) {
      return {
        ...styles.button,
        backgroundColor: colors.keep,
        shadowColor: colors.keep,
      }
    }
    if (currentIndex === 2) {
      return {
        ...styles.button,
        borderRadius: radii.xl,
      }
    }
    return styles.button
  }

  const getButtonText = () => {
    if (isFinishing) return 'Please wait...'
    if (currentIndex === 0) return 'Get Started'
    if (currentIndex === 1) return 'Got it'
    return 'Sounds Good'
  }

  const getButtonIcon = () => {
    if (currentIndex === 0) return 'arrow-right'
    if (currentIndex === 2) return 'check'
    return null
  }

  const showHeader = currentIndex > 0
  const showBackButton = currentIndex > 0
  const headerTitle = currentIndex === 1 ? 'How to use' : currentIndex === 2 ? 'Safety Net' : ''

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          {showBackButton ? (
            <Pressable 
              onPress={handleBack} 
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Pressable 
            onPress={handleSkip} 
            accessibilityRole="button" 
            accessibilityLabel="Skip"
            style={styles.skipButton}
          >
            <Text style={[
              styles.skipText,
              currentIndex === 1 && { color: colors.keep }
            ]}>Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Current Slide */}
      <View style={styles.slideContainer}>
        {renderCurrentSlide()}
      </View>

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* Pagination */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex
            const activeColor = currentIndex === 1 ? colors.keep : colors.textPrimary
            return (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  isActive && [
                    styles.paginationDotActive,
                    { backgroundColor: activeColor },
                    currentIndex !== 1 && {
                      shadowColor: '#FFFFFF',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                    }
                  ],
                ]}
              />
            )
          })}
        </View>

        {/* Button */}
        <Pressable
          style={[getButtonStyle(), isFinishing && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isFinishing}
          accessibilityRole="button"
          accessibilityLabel={getButtonText()}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>{getButtonText()}</Text>
            {getButtonIcon() && (
              <MaterialCommunityIcons 
                name={getButtonIcon() as any} 
                size={20} 
                color={colors.background} 
                style={styles.buttonIcon}
              />
            )}
          </View>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 56,
  },
  headerSpacer: {
    width: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 48,
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  slideContainer: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.lg,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighlight,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
  },
  buttonIcon: {
    marginLeft: spacing.xs,
  },
})

const slideStyles = StyleSheet.create({
  welcomeSlide: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentSection: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  welcomeTitleHighlight: {
    color: colors.primary,
    textShadowColor: `${colors.primary}80`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  mechanicSlide: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  mechanicTextSection: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    flexShrink: 0,
  },
  mechanicTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  mechanicSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  safetySlide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  safetyTextSection: {
    alignItems: 'center',
  },
  safetyTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 38,
  },
  safetyDescription: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
})

const visualStyles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: SCREEN_HEIGHT * 0.5,
    width: '100%',
    overflow: 'hidden',
  },
  welcomeBgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: radii.xl,
    overflow: 'hidden',
    opacity: 0.85,
  },
  welcomeCard: {
    width: 192,
    height: 256,
    borderRadius: radii.lg,
    borderWidth: 1,
    position: 'absolute',
  },
  welcomeCardBack: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderColor: 'rgba(255,255,255,0.1)',
    transform: [{ rotate: '-6deg' }, { translateY: 16 }],
  },
  welcomeCardFront: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255,255,255,0.2)',
    transform: [{ rotate: '3deg' }, { translateY: -10 }],
    padding: spacing.md,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    opacity: 0.6,
  },
  photoGridItem: {
    width: 72,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionBadge: {
    position: 'absolute',
    right: -24,
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  imageIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  blurryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  cardImageArea: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTextLines: {
    gap: spacing.sm,
  },
  textLine: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  swipeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  swipeCardStack: {
    position: 'absolute',
    width: '80%',
    maxWidth: 320,
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  swipeCardStack1: {
    backgroundColor: 'rgba(27, 39, 27, 0.8)',
    borderColor: 'rgba(255,255,255,0.1)',
    transform: [{ scale: 0.98 }, { translateY: 4 }],
    zIndex: 1,
  },
  swipeCardStack2: {
    backgroundColor: 'rgba(27, 39, 27, 0.5)',
    borderColor: 'rgba(255,255,255,0.05)',
    transform: [{ scale: 0.95 }, { translateY: 8 }],
    zIndex: 0,
  },
  swipeMainCard: {
    width: '80%',
    maxWidth: 320,
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    zIndex: 2,
  },
  swipeIndicatorLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: spacing.md,
    zIndex: 10,
  },
  swipeIndicatorRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.md,
    zIndex: 10,
  },
  swipeCardContent: {
    flex: 1,
  },
  swipeMetadataOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  swipeMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  swipeScreenshotLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.keep,
    letterSpacing: 2,
  },
  swipeTimestamp: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  swipeFilename: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  swipeBadgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  swipeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  swipeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  gestureHintContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    zIndex: 20,
  },
  gestureCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
    marginBottom: spacing.lg,
  },
  shieldGlow: {
    position: 'absolute',
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: `${colors.primary}33`,
    transform: [{ scale: 0.75 }],
  },
  shieldBox: {
    width: 200,
    height: 200,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  shieldIcon: {
    textShadowColor: `${colors.primary}80`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  daysBadge: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: `${colors.background}E6`,
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  floatingDecor: {
    position: 'absolute',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  floatingCheckmark: {
    top: 20,
    right: 40,
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    transform: [{ rotate: '12deg' }],
  },
  floatingRestore: {
    bottom: 20,
    left: 40,
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    transform: [{ rotate: '-6deg' }],
  },
})
