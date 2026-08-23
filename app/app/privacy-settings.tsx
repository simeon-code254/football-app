import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What we store',
    body:
      'Your profile (name, photo, bio, position, nationality, physical stats), the videos you upload, messages you send, trial applications, and AI-generated performance ratings derived from videos you submit for analysis.',
  },
  {
    title: 'Who can see it',
    body:
      'Verified scouts can see your public profile and highlight videos. Other players can see your public highlights on Reels. Scout notes and saved-player lists about you are private to that scout — you never see them, and they never see each other\'s.',
  },
  {
    title: 'AI analysis',
    body:
      'Videos you submit with AI Analysis enabled are processed to estimate performance attributes (pace, physical, etc.). Ratings are marked with a confidence level and are decision support, not a verdict — never treated as fact by the app itself.',
  },
  {
    title: 'Moderation',
    body:
      'Reports you file are reviewed by our team and are not visible to the person you reported. If your account is suspended or a video is removed, you\'ll see the reason (if one was given) and a real notification.',
  },
  {
    title: 'Your data',
    body:
      'You can delete your account at any time from Settings. This permanently removes your profile, videos, messages, and applications — it cannot be undone.',
  },
];

export default function PrivacySettings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardBody}>{s.body}</Text>
          </View>
        ))}

        <Pressable style={styles.deleteRow} onPress={() => router.push('/settings')}>
          <Feather name="trash-2" size={16} color={colors.error} />
          <Text style={styles.deleteText}>Delete my account</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    content: { padding: 20, gap: 14 },
    card: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16 },
    cardTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary, marginBottom: 6 },
    cardBody: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 20 },
    deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 14, marginTop: 6 },
    deleteText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.error },
  });
}
