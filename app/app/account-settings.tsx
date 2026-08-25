import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import { cx, fontFamilyDisplay, fontSize, spacing, useThemeColors } from '../src/theme';
import { SettingsRow, SettingsGroup } from '../src/components/SettingsRow';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 63 SETTINGS · ACCOUNT.
//
//   Email    simeon@matobev.co   [VERIFIED]
//   Phone    Not added                    ›
//   Role     Player                       ›
//   Download my data · "Ratings, clips, messages"   ›
//   DANGER ZONE
//   Delete account · "Immediate and permanent"      ›
//
// -- ROLE IS SHOWN, NOT EDITABLE --
//
// The canvas draws a chevron beside it, but `prevent_role_change` is a database
// trigger: a role cannot be changed after signup, by anyone, including an
// admin through this app. Tapping it explains that rather than opening a picker
// that would fail on save.
export default function AccountSettings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const profile = useSessionStore((s) => s.profile);
  const session = useSessionStore((s) => s.session);
  const clearSession = useSessionStore((s) => s.clear);
  const role = useSessionStore((s) => s.role);
  const [deleting, setDeleting] = useState(false);

  const { data: emailConfirmed } = useQuery({
    queryKey: ['emailConfirmedSettings', session?.user.id],
    enabled: !!session,
    queryFn: () => authRepository.isEmailConfirmed(),
  });

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await authRepository.deleteAccount();
      clearSession();
      router.replace('/welcome');
    } catch (err) {
      setDeleting(false);
      showAlert('Could not delete account', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsGroup>
          <SettingsRow
            title="Email"
            subtitle={session?.user.email ?? undefined}
            badge={
              emailConfirmed
                ? { label: 'Verified', tone: 'success' }
                : { label: 'Unverified', tone: 'warning' }
            }
          />
          <SettingsRow
            title="Phone"
            value={profile?.phone ?? 'Not added'}
            onPress={() => router.push({ pathname: '/profile-complete', params: { mode: 'edit' } })}
          />
          <SettingsRow
            title="Role"
            value={role ?? '—'}
            last
            onPress={() =>
              showAlert(
                'Your role cannot be changed',
                'Roles are fixed at signup and enforced by the database, so a player account cannot become a scout account. Create a separate account if you need the other role.'
              )
            }
          />
        </SettingsGroup>

        <SettingsGroup style={styles.group}>
          <SettingsRow
            title="Download my data"
            subtitle="Ratings, clips, messages"
            last
            onPress={() =>
              showAlert(
                'Data export is not automated yet',
                'Contact support and we will send everything held on this account. Under Kenyan data protection law you are entitled to it, and the request is honoured manually until the export is built.'
              )
            }
          />
        </SettingsGroup>

        <SettingsGroup label="Danger zone" style={styles.group}>
          <SettingsRow
            title={deleting ? 'Deleting…' : 'Delete account'}
            subtitle="Immediate and permanent"
            tone="danger"
            last
            onPress={() =>
              showAlert(
                'Delete account',
                'This permanently deletes your account and everything on it — profile, videos, messages, applications. It cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
                ]
              )
            }
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: cx(18) },
    title: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.display, color: colors.textPrimary },
    scroll: { paddingHorizontal: cx(18), paddingTop: spacing.lg, paddingBottom: spacing.xl },
    group: { marginTop: spacing.xl },
  });
}
