import React from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, spacing, radii } from '../src/lib/theme'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )
}

function InlineLink({ label, url }: { label: string; url: string }) {
  return (
    <Text style={styles.link} onPress={() => Linking.openURL(url)}>
      {label}
    </Text>
  )
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <Text style={styles.highlight}>{children}</Text>
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: February 25, 2026</Text>

        <Section title="1. Introduction">
          <Body>
            Screenshot Organizer ("we", "our", or "us") is committed to protecting your privacy.
            This policy explains exactly what data is processed when you use our app, under what
            conditions data leaves your device, and your rights as a user.
          </Body>
          <Body>
            We designed this app with a privacy-first approach: by default, all processing happens
            on your device. Cloud features (including AI classification) are strictly opt-in and
            clearly labelled.
          </Body>
        </Section>

        <Section title="2. Data We Process">
          <Body>
            <Highlight>Photo library metadata</Highlight> — When you grant gallery access, we read
            metadata such as filename, dimensions, creation date, and file size to identify
            screenshots. This metadata never leaves your device.
          </Body>
          <Body>
            <Highlight>Photo content (AI only, opt-in)</Highlight> — If and only if you enable
            AI-Powered Sorting, a compressed representation of each photo is sent to Google's
            Gemini API for content classification. This requires your explicit opt-in during
            onboarding or in Settings → AI Features.
          </Body>
          <Body>
            <Highlight>Usage analytics (opt-out available)</Highlight> — We collect anonymised
            events such as "session completed" or "AI classification used" to improve the app. No
            photo content is included. You can disable this in Settings → Analytics.
          </Body>
        </Section>

        <Section title="3. AI Classification & Google Gemini">
          <Body>
            When AI Sorting is <Highlight>enabled</Highlight>:
          </Body>
          <Bullet>
            Thumbnails of your screenshots are sent over HTTPS to Google's Gemini 1.5 Flash API
            for content type detection (e.g. receipt, chat, meme, error).
          </Bullet>
          <Bullet>
            Google processes the image under their own privacy policy. We configure requests with
            minimal sampling (temperature 0.1) and no training opt-in.
          </Bullet>
          <Bullet>
            For free-tier users, AI classification is applied to up to 15 images per session,
            matching the free plan's processing quota.
          </Bullet>
          <Bullet>
            Classification results (tags only, never the image itself) are stored locally.
          </Bullet>

          <Body style={{ marginTop: spacing.md }}>
            When AI Sorting is <Highlight>disabled</Highlight>:
          </Body>
          <Bullet>
            All classification uses on-device filename heuristics and image metadata only.
          </Bullet>
          <Bullet>
            No image data is ever transmitted. Everything stays on your device.
          </Bullet>

          <View style={styles.noteBox}>
            <MaterialCommunityIcons name="shield-check" size={16} color={colors.primary} />
            <Text style={styles.noteText}>
              You can withdraw AI consent at any time via Settings → AI Features. Disabling it
              stops all future image transmissions immediately.
            </Text>
          </View>
        </Section>

        <Section title="4. What We Do NOT Do">
          <Bullet>Store your photos on our servers</Bullet>
          <Bullet>Sell your data to third parties</Bullet>
          <Bullet>Use your photos for advertising targeting</Bullet>
          <Bullet>Train AI models on your photos</Bullet>
          <Bullet>Share your data with data brokers</Bullet>
          <Bullet>Require account creation for core functionality</Bullet>
        </Section>

        <Section title="5. Data Storage & Retention">
          <Body>
            App preferences (AI toggle, subscription status) are stored securely on your device
            using the platform's secure local storage. No personal data is stored on our servers
            unless you create an account.
          </Body>
          <Body>
            If you create an account, authentication tokens are stored via Supabase and expire
            after 7 days of inactivity. You can delete your account and all associated data at
            any time from Settings → Account.
          </Body>
        </Section>

        <Section title="6. Your Rights (GDPR & CCPA)">
          <Body>
            Depending on where you live, you may have the following rights:
          </Body>
          <Bullet>
            <Highlight>Access</Highlight>: Request a copy of the data we hold about you.
          </Bullet>
          <Bullet>
            <Highlight>Deletion</Highlight>: Delete all data associated with your account.
          </Bullet>
          <Bullet>
            <Highlight>Correction</Highlight>: Correct inaccurate personal data.
          </Bullet>
          <Bullet>
            <Highlight>Portability</Highlight>: Receive your data in a machine-readable format.
          </Bullet>
          <Bullet>
            <Highlight>Opt-out</Highlight>: Withdraw AI consent or disable analytics at any time
            in Settings without affecting core app functionality.
          </Bullet>
          <Bullet>
            <Highlight>Complaint</Highlight>: Lodge a complaint with your national Data Protection
            Authority (EU users: your country's DPA; UK users: ICO).
          </Bullet>
          <Body>
            To exercise any of these rights, contact us at{' '}
            <InlineLink label="privacy@screenshotorganizer.app" url="mailto:privacy@screenshotorganizer.app" />.
            We respond within 30 days.
          </Body>
        </Section>

        <Section title="7. Third-Party Services">
          <Body>
            We use the following third-party services. Each has its own privacy policy:
          </Body>
          <View style={styles.serviceRow}>
            <MaterialCommunityIcons name="google" size={18} color={colors.textMuted} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>Google Gemini (AI, opt-in only)</Text>
              <InlineLink label="policies.google.com" url="https://policies.google.com" />
            </View>
          </View>
          <View style={styles.serviceRow}>
            <MaterialCommunityIcons name="credit-card-outline" size={18} color={colors.textMuted} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>RevenueCat (subscription management)</Text>
              <InlineLink label="revenuecat.com/privacy" url="https://www.revenuecat.com/privacy" />
            </View>
          </View>
          <View style={styles.serviceRow}>
            <MaterialCommunityIcons name="database-outline" size={18} color={colors.textMuted} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>Supabase (auth & analytics)</Text>
              <InlineLink label="supabase.com/privacy" url="https://supabase.com/privacy" />
            </View>
          </View>
        </Section>

        <Section title="8. Children's Privacy">
          <Body>
            This app is not directed at children under 13 (or under 16 in the EU). We do not
            knowingly collect personal data from children. If you believe a child has provided
            data, please contact us immediately.
          </Body>
        </Section>

        <Section title="9. Changes to This Policy">
          <Body>
            We may update this policy to reflect product changes or legal requirements. Material
            changes (e.g. new data sharing) will be notified via an in-app notice at least 14
            days before taking effect. Continued use after that date constitutes acceptance.
          </Body>
        </Section>

        <Section title="10. Contact">
          <Body>
            For privacy questions, data requests, or complaints:
          </Body>
          <Bullet>
            Email: <InlineLink label="privacy@screenshotorganizer.app" url="mailto:privacy@screenshotorganizer.app" />
          </Bullet>
          <Bullet>
            Response time: within 30 days (GDPR-compliant)
          </Bullet>
        </Section>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slateBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  lastUpdated: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 23,
  },
  highlight: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bulletDot: {
    fontSize: 15,
    color: colors.primary,
    lineHeight: 23,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 23,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}0D`,
    borderWidth: 1,
    borderColor: `${colors.primary}26`,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: `${colors.primary}E6`,
    lineHeight: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  serviceInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
})
