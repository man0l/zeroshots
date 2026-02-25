import React, { useState, useRef, useEffect } from 'react'
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
  Animated,
  Easing,
} from 'react-native'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as MediaLibrary from 'expo-media-library'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuthStore } from '../../src/state/auth.store'
import { useSettingsStore } from '../../src/state/settings.store'
import { colors, spacing, radii, shadows } from '../../src/lib/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

type SlideId = 'welcome' | 'mechanic' | 'safety' | 'gallery'

const SLIDES: SlideId[] = ['welcome', 'mechanic', 'safety', 'gallery']

const GALLERY_VISUAL_SIZE = 256
const ICON_BOX_SIZE = 160

function GalleryVisual() {
  const nativeDriven = Platform.OS !== 'web'
  const spinAnim = useRef(new Animated.Value(0)).current
  const spinRevAnim = useRef(new Animated.Value(0)).current
  const scanAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: nativeDriven })
    ).start()
    Animated.loop(
      Animated.timing(spinRevAnim, { toValue: 1, duration: 15000, easing: Easing.linear, useNativeDriver: nativeDriven })
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriven }),
        Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: nativeDriven }),
      ])
    ).start()
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: nativeDriven }),
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 900, useNativeDriver: nativeDriven }),
      ])
    ).start()
    return () => {
      spinAnim.stopAnimation()
      spinRevAnim.stopAnimation()
      scanAnim.stopAnimation()
      pulseAnim.stopAnimation()
    }
  }, [])

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const spinRev = spinRevAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] })
  const scanY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-ICON_BOX_SIZE / 2, ICON_BOX_SIZE / 2] })

  return (
    <View style={galleryVisualStyles.container}>
      {/* Outer spinning ring */}
      <Animated.View style={[galleryVisualStyles.outerRing, { transform: [{ rotate: spin }] }]} />
      {/* Inner reverse-spinning dashed ring */}
      <Animated.View style={[galleryVisualStyles.innerRing, { transform: [{ rotate: spinRev }] }]} />

      {/* Central icon box */}
      <View style={galleryVisualStyles.iconBox}>
        <LinearGradient
          colors={[`${colors.primary}1A`, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <MaterialCommunityIcons
          name="account-lock"
          size={64}
          color={colors.primary}
          style={galleryVisualStyles.lockIcon}
        />
        {/* Scanning line */}
        <Animated.View style={[galleryVisualStyles.scanLine, { transform: [{ translateY: scanY }] }]} />
        {/* Particles */}
        <Animated.View style={[galleryVisualStyles.particle, galleryVisualStyles.particle1, { opacity: pulseAnim }]} />
        <Animated.View style={[galleryVisualStyles.particle, galleryVisualStyles.particle2, { opacity: pulseAnim }]} />
      </View>

      {/* "Private" badge – bottom-right of the visual container */}
      <View style={galleryVisualStyles.privateBadge}>
        <MaterialCommunityIcons name="image-multiple" size={18} color={colors.primary} />
        <Text style={galleryVisualStyles.privateBadgeText}>Private</Text>
      </View>
    </View>
  )
}

interface GalleryScreenProps {
  insets: { top: number; bottom: number }
  onAllowAccess: () => Promise<void>
  onSkip: () => Promise<void>
}

function GalleryScreen({ insets, onAllowAccess, onSkip }: GalleryScreenProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAllow = async () => {
    setIsLoading(true)
    await onAllowAccess()
    setIsLoading(false)
  }

  const handleWhyNeeded = () => {
    Alert.alert(
      'Why do we need this?',
      "We scan your photo library on your device to find screenshots and help you organize them. All scanning and any optional AI sorting (you can turn it on in Settings) happens entirely on your device — nothing is sent to the cloud.",
      [{ text: 'Got it' }]
    )
  }

  return (
    <View style={[galleryScreenStyles.container, { paddingTop: insets.top }]}>
      {/* Top nav: 4 progress bars + Skip */}
      <View style={galleryScreenStyles.topNav}>
        <View style={galleryScreenStyles.progressBars}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                galleryScreenStyles.progressBar,
                i === 3
                  ? galleryScreenStyles.progressBarActive
                  : galleryScreenStyles.progressBarDone,
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={onSkip}
          style={galleryScreenStyles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip"
        >
          <Text style={galleryScreenStyles.skipBtnText}>Skip</Text>
        </Pressable>
      </View>

      {/* Visual */}
      <View style={galleryScreenStyles.visualArea}>
        <GalleryVisual />
      </View>

      {/* Text content */}
      <View style={galleryScreenStyles.textSection}>
        <Text style={galleryScreenStyles.title}>
          Let's find your{'\n'}
          <Text style={galleryScreenStyles.titleHighlight}>clutter.</Text>
        </Text>
        <Text style={galleryScreenStyles.description}>
          To start analyzing your screenshots and duplicates, we need access to your photo library.
        </Text>
        <View style={galleryScreenStyles.privacyNote}>
          <MaterialCommunityIcons name="shield-lock" size={14} color={colors.primary} />
          <Text style={galleryScreenStyles.privacyNoteText}>Your photos stay private. You choose what's shared.</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={[galleryScreenStyles.actionsSection, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          style={[galleryScreenStyles.allowButton, isLoading && galleryScreenStyles.allowButtonDisabled]}
          onPress={handleAllow}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Allow Photo Access"
        >
          <View style={galleryScreenStyles.allowButtonContent}>
            <Text style={galleryScreenStyles.allowButtonText}>
              {isLoading ? 'Please wait...' : 'Allow Photo Access'}
            </Text>
            {!isLoading && (
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.background} />
            )}
          </View>
        </Pressable>

        <Pressable
          style={galleryScreenStyles.whyButton}
          onPress={handleWhyNeeded}
          accessibilityRole="button"
        >
          <Text style={galleryScreenStyles.whyButtonText}>Why do we need this?</Text>
        </Pressable>
      </View>
    </View>
  )
}

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
          Free up space,{'\n'}
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

  const handleGalleryAllow = async () => {
    if (Platform.OS === 'web') {
      useSettingsStore.getState().setAiEnabled(true)
      await finishOnboarding()
      return
    }
    const { status } = await MediaLibrary.requestPermissionsAsync()
    if (status === 'granted') {
      useSettingsStore.getState().setAiEnabled(true)
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
      await handleGalleryAllow()
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSkip = () => {
    // Skip educational slides → jump straight to gallery/permission screen
    setCurrentIndex(3)
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

  const slideBackground = currentIndex === 1 ? '#0B1A0E' : colors.background

  if (currentIndex === 3) {
    return (
      <GalleryScreen
        insets={insets}
        onAllowAccess={handleGalleryAllow}
        onSkip={finishOnboarding}
      />
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: slideBackground }]}>
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
        {/* On welcome slide: button first, dots below. On other slides: dots first, button below. */}
        {currentIndex > 0 && (
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => {
              const isActive = index === currentIndex
              const activeColor = currentIndex === 1 ? colors.keep : colors.primary
              return (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    isActive && [
                      styles.paginationDotActive,
                      { backgroundColor: activeColor },
                      {
                        shadowColor: activeColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 10,
                      },
                    ],
                  ]}
                />
              )
            })}
          </View>
        )}

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

        {/* On welcome slide: dots rendered below the button */}
        {currentIndex === 0 && (
          <View style={[styles.pagination, styles.paginationBelow]}>
            {SLIDES.map((_, index) => {
              const isActive = index === currentIndex
              return (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    isActive && [
                      styles.paginationDotActive,
                      { backgroundColor: colors.primary },
                      {
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 10,
                      },
                    ],
                  ]}
                />
              )
            })}
          </View>
        )}
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
  paginationBelow: {
    marginBottom: 0,
    marginTop: spacing.md,
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
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 42,
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
    width: '88%',
    maxWidth: 360,
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
    width: '88%',
    maxWidth: 360,
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
    height: 360,
    marginBottom: spacing.lg,
  },
  shieldGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: `${colors.primary}26`,
    transform: [{ scale: 0.85 }],
  },
  shieldBox: {
    width: 240,
    height: 240,
    borderRadius: 56,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  shieldIcon: {
    textShadowColor: `${colors.primary}80`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  daysBadge: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
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
    top: 28,
    right: 28,
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    transform: [{ rotate: '12deg' }],
  },
  floatingRestore: {
    bottom: 28,
    left: 28,
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    transform: [{ rotate: '-6deg' }],
  },
})

const galleryVisualStyles = StyleSheet.create({
  container: {
    width: GALLERY_VISUAL_SIZE,
    height: GALLERY_VISUAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: GALLERY_VISUAL_SIZE,
    height: GALLERY_VISUAL_SIZE,
    borderRadius: GALLERY_VISUAL_SIZE / 2,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  innerRing: {
    position: 'absolute',
    width: GALLERY_VISUAL_SIZE - 32,
    height: GALLERY_VISUAL_SIZE - 32,
    borderRadius: (GALLERY_VISUAL_SIZE - 32) / 2,
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
    borderStyle: 'dashed',
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    borderRadius: 28,
    backgroundColor: colors.backgroundDeep,
    borderWidth: 1,
    borderColor: `${colors.primary}4D`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  lockIcon: {
    textShadowColor: `${colors.primary}99`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: `${colors.primary}80`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  particle: {
    position: 'absolute',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  particle1: {
    width: 5,
    height: 5,
    top: 24,
    left: 24,
  },
  particle2: {
    width: 7,
    height: 7,
    bottom: 20,
    right: 28,
  },
  privateBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  privateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})

const galleryScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  progressBars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressBar: {
    height: 6,
    width: 32,
    borderRadius: radii.full,
  },
  progressBarDone: {
    backgroundColor: `${colors.primary}30`,
  },
  progressBarActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  visualArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  textSection: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: colors.primary,
    textShadowColor: `${colors.primary}4D`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: 17,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.primary}0D`,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.primary}1A`,
  },
  privacyNoteText: {
    fontSize: 13,
    fontWeight: '600',
    color: `${colors.primary}E6`,
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  allowButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  allowButtonDisabled: {
    opacity: 0.7,
  },
  allowButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  allowButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
  },
  whyButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  whyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
})
