import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { openLegal } from '../src/lib/legal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { ScoutSafetyNotice } from '../src/components/ScoutSafetyNotice';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';

// TODO: replace with the real support inbox before shipping -- this is a
// placeholder address, not a verified one.
const SUPPORT_EMAIL = 'support@matobev.com';


const FAQS: { q: string; a: string }[] = [
  {
    q: 'How are AI ratings calculated?',
    a: 'Upload a highlight with AI Analysis enabled and our pipeline estimates attributes like Pace and Physical from your movement in the clip. Each rating shows a confidence level (High/Medium/Low) — treat it as a starting point, not a final verdict.',
  },
  {
    q: 'Why is my rating "Provisional"?',
    a: "You'll see this while only some attributes have been assessed yet. It fills in as you upload more analyzed highlights.",
  },
  {
    q: 'How does scout verification work?',
    a: 'Submit your ID and proof of organization from Scout Verification. Our team reviews it manually — you\'ll get a real notification either way, with a reason if it\'s rejected.',
  },
  {
    q: 'Can I undo a deleted account?',
    a: 'No — account deletion is permanent and removes your profile, videos, messages, and applications immediately.',
  },
  {
    q: 'How do I report inappropriate content?',
    a: 'Tap the flag icon on a video, profile, or in a message thread. Reports go straight to our moderation team and are never visible to the person you reported.',
  },
];

export default function HelpSettings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Help</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.contactCard} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <View style={styles.contactIcon}>
            <Feather name="mail" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSub}>{SUPPORT_EMAIL}</Text>
          </View>
          <Feather name="external-link" size={16} color={colors.textPlaceholder} />
        </Pressable>

        <Text style={styles.sectionLabel}>Legal</Text>
        <View style={styles.list}>
          {[
            { label: 'Privacy Policy', doc: 'privacy' as const, icon: 'shield' as const },
            { label: 'Terms of Service', doc: 'terms' as const, icon: 'file-text' as const },
          ].map((item, i) => (
            <Pressable
              key={item.doc}
              style={[styles.legalRow, i === 0 && styles.legalRowFirst]}
              onPress={() => openLegal(item.doc)}
              accessibilityRole="link"
              accessibilityLabel={item.label}
            >
              <Feather name={item.icon} size={16} color={colors.textMuted} />
              <Text style={styles.legalLabel}>{item.label}</Text>
              <Feather name="external-link" size={15} color={colors.textPlaceholder} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Your safety</Text>
        <ScoutSafetyNotice />

        <Text style={styles.sectionLabel}>Frequently Asked</Text>
        <View style={styles.list}>
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <Pressable
                key={item.q}
                style={[styles.row, i < FAQS.length - 1 && styles.rowBorder]}
                onPress={() => setOpenIndex(open ? null : i)}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.rowQuestion}>{item.q}</Text>
                  <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textPlaceholder} />
                </View>
                {open && <Text style={styles.rowAnswer}>{item.a}</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    content: { padding: 20 },
    legalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    legalRowFirst: { borderTopWidth: 0 },
    legalLabel: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textPrimary },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.infoTint,
      borderRadius: radii.lg,
      padding: 16,
      marginBottom: 24,
    },
    contactIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    contactTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
    contactSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
    sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    list: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
    row: { paddingHorizontal: 14, paddingVertical: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    rowQuestion: { flex: 1, fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
    rowAnswer: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, marginTop: 8, lineHeight: 19 },
  });
}
