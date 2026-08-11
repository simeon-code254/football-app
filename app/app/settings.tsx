import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

type SettingsRow = { title: string; icon: React.ComponentProps<typeof Feather>['name']; onPress: () => void };

// Real destination for the one sub-section that already has a working
// screen; the rest are genuinely not built yet — a graceful "coming soon"
// alert beats a dead tap with no feedback, and beats pretending a feature
// exists when it doesn't.
const notYetAvailable = (title: string) =>
  showAlert(title, "This section isn't available yet — we're still building it out.");

export default function Settings() {
  const clearSession = useSessionStore((s) => s.clear);
  const [deleting, setDeleting] = useState(false);

  const rows: SettingsRow[] = [
    { title: 'Account', icon: 'user', onPress: () => notYetAvailable('Account') },
    { title: 'Security', icon: 'shield', onPress: () => notYetAvailable('Security') },
    { title: 'Notifications', icon: 'bell', onPress: () => router.push('/notifications') },
    { title: 'Privacy', icon: 'eye-off', onPress: () => notYetAvailable('Privacy') },
    { title: 'Language', icon: 'globe', onPress: () => notYetAvailable('Language') },
    { title: 'Theme', icon: 'moon', onPress: () => notYetAvailable('Theme') },
    { title: 'Help', icon: 'help-circle', onPress: () => notYetAvailable('Help') },
  ];

  const logout = async () => {
    await authRepository.signOut();
    clearSession();
    router.replace('/welcome');
  };

  const confirmDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'This permanently deletes your account and all your data — profile, videos, messages, applications. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: deleteAccount },
      ]
    );
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await authRepository.deleteAccount();
      clearSession();
      router.replace('/welcome');
    } catch (err) {
      setDeleting(false);
      showAlert('Could Not Delete Account', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {rows.map((r) => (
            <Pressable key={r.title} style={styles.row} onPress={r.onPress}>
              <Feather name={r.icon} size={17} color={colors.textBody} style={{ width: 24 }} />
              <Text style={styles.rowText}>{r.title}</Text>
              <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.dangerRow} onPress={logout}>
          <Feather name="log-out" size={17} color={colors.error} style={{ width: 24 }} />
          <Text style={[styles.rowText, { color: colors.error }]}>Logout</Text>
        </Pressable>
        <Pressable style={styles.dangerRow} onPress={confirmDeleteAccount} disabled={deleting}>
          <Feather name="trash-2" size={17} color={colors.textPlaceholder} style={{ width: 24 }} />
          <Text style={[styles.rowText, { color: colors.textPlaceholder }]}>
            {deleting ? 'Deleting…' : 'Delete Account'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8 },
  list: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, marginTop: 10 },
});
