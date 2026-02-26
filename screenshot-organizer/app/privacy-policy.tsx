import React from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  type TextStyle,
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

function Body({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.body, style]}>{children}</Text>
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
        <Text style={styles.lastUpdated}>Last updated: February 26, 2026</Text>

        <Section title="1. Introduction">
          <Body>
            Screenshot Organizer ("we", "our", or "us") is committed to protecting your privacy.
            This policy explains exactly what data is processed when you use our app, under what
            conditions data leaves your device, and your rights as a user.
          </Body>
          <Body>
            We designed this app with a privacy-first approach: all photo scanning and AI
            classification run entirely on your device. No photo content is sent to the cloud for
            classification.
          </Body>
        </Section>

        <Section title="2. Data We Process">
          <Body>
            <Highlight>Photo library metadata</Highlight> — When you grant gallery access, we read
            metadata such as filename, dimensions, creation date, and file size to identify
            screenshots. This metadata never leaves your device.
          </Body>
          <Body>
            <Highlight>Photo content (on-device only)</Highlight> — If you enable AI sorting in
            Settings, images are analysed on your device using the platform's built-in APIs (Apple
            Vision on iOS, Google ML Kit on Android). No photo content is sent to our servers or
            to Google's cloud for classification.
          </Body>
          <Body>
            <Highlight>Usage analytics (opt-out available)</Highlight> — We collect anonymised
            events such as "session completed" to improve the app. No photo content is included.
            You can disable this in Settings → AI Features (analytics toggle).
          </Body>
          <Body>
            <Highlight>ML classification logs (opt-in only)</Highlight> — If you explicitly turn
            on "Store ML logs" in Settings → AI Features, we save anonymised label and tag
            summaries (e.g. "receipt", "photo") to our servers to debug and improve
            classification. No images or photo content are uploaded; this is off by default and
            you can turn it off at any time.
          </Body>
        </Section>

        <Section title="3. AI Classification (On-Device Only)">
          <Body>
            When AI Sorting is <Highlight>enabled</Highlight> in Settings:
          </Body>
          <Bullet>
            Images are analysed on your device using Apple Vision (iOS) or Google ML Kit (Android).
            Processing happens locally; no photo content is sent to the cloud.
          </Bullet>
          <Bullet>
            The result is a set of tags (e.g. receipt, chat, meme, document) that we store only on
            your device to help you sort screenshots.
          </Bullet>
          <Bullet>
            You can turn AI sorting off at any time in Settings → AI Features. When off, we use a
            default tag only; no image analysis is performed.
          </Bullet>
          <Bullet>
            <Highlight>Store ML logs</Highlight> is a separate, opt-in setting (off by default).
            Only when you turn it on do we send anonymised label and tag summaries to our servers.
            No images are ever sent. You can disable it at any time in Settings → AI Features.
          </Bullet>

          <Body style={{ marginTop: spacing.md }}>
            When AI Sorting is <Highlight>disabled</Highlight>:
          </Body>
          <Bullet>
            No image analysis runs. Screenshots are tagged with a default label only.
          </Bullet>
          <Bullet>
            All data stays on your device. Nothing is transmitted for classification.
          </Bullet>

          <View style={styles.noteBox}>
            <MaterialCommunityIcons name="shield-check" size={16} color={colors.primary} />
            <Text style={styles.noteText}>
              AI classification is entirely on-device. No photo content is ever sent to our
              servers or to third-party cloud APIs for sorting.
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
            <Highlight>Opt-out / Opt-in</Highlight>: Turn off AI sorting or disable analytics at
            any time in Settings. "Store ML logs" is opt-in only (off by default); turn it off
            anytime to stop sending any classification summaries. Core app functionality does not
            depend on these settings.
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
            We use the following third-party services. Each has its own privacy policy. AI
            classification uses on-device APIs (Apple Vision, Google ML Kit); no image data is
            sent to these providers' cloud services.
          </Body>
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
