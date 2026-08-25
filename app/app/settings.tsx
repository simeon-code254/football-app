import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontFamilyDisplay, fontSize, radii, spacing, useThemeColors } from '../src/theme';
import { Kicker } from '../src/components/Kicker';

/** First and last initial, matching InitialsAvatar's rule. */
function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { unregisterPush } from '../src/lib/push';
import { showAlert } from '../src/lib/alert';

type SettingsRow = { title: string; icon: React.ComponentProps<typeof Feather>['name']; onPress: () => void };

export default function Settings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const clearSession = useSessionStore((s) => s.clear);
  const userId = useSessionStore((s) => s.session?.user.id);
  const role = useSessionStore((s) => s.role);
  const profile = useSessionStore((s) => s.profile);
  const [deleting, setDeleting] = useState(false);

  // Shown only to under-18 players. The guardian-consent screen was reachable
  // only by attempting an upload and being refused, which meant a guardian
  // holding the phone had no way to find it, and a player who had already
  // been refused once had no way back to it. It is also where they check
  // whether consent has actually been confirmed yet.
  const { data: player } = useQuery({
    queryKey: ['settingsPlayerDob', userId],
    enabled: !!userId && role === 'player',
    queryFn: () => profileRepository.getMyPlayer(userId!),
  });
  const isMinor = (() => {
    const dob = player?.date_of_birth;
    if (!dob) return false;
    const d = new Date(dob);
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
    return age < 18;
  })();

  // Canvas 33 splits these into ACCOUNT and PREFERENCES rather than running
  // eleven rows together. Guardian consent sits in ACCOUNT for a minor, where
  // it is findable -- it used to be reachable only by attempting an upload and
  // being refused.
  const accountRows: SettingsRow[] = [
    { title: 'Account', icon: 'user', onPress: () => router.push('/account-settings') },
    ...(isMinor
      ? [{ title: 'Parent or guardian', icon: 'users' as const, onPress: () => router.push('/guardian-consent') }]
      : []),
    { title: 'Security', icon: 'shield', onPress: () => router.push('/security-settings') },
    { title: 'Privacy', icon: 'eye-off', onPress: () => router.push('/privacy-settings') },
    { title: 'Blocked accounts', icon: 'slash', onPress: () => router.push('/blocked-accounts') },
  ];

  const preferenceRows: SettingsRow[] = [
    { title: 'Notifications', icon: 'bell', onPress: () => router.push('/notification-settings') },
    { title: 'Language', icon: 'globe', onPress: () => router.push('/language-settings') },
    { title: 'Theme', icon: 'moon', onPress: () => router.push('/theme-settings') },
    { title: 'Help & legal', icon: 'help-circle', onPress: () => router.push('/help-settings') },
  ];

  const logout = async () => {
    // Drop this device's push token FIRST, while the session still exists
    // -- the delete is RLS-scoped to the signed-in profile, so after
    // signOut() it would be rejected and the phone would keep receiving
    // the previous account's notifications.
    if (userId) await unregisterPush(userId);
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
        {/* Canvas 33's identity card: the gold tile, the name, and the role
            line beneath it. */}
        <Pressable
          style={styles.identity}
          onPress={() => router.push(role === 'scout' ? '/scout-edit-profile' : '/(player-tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
        >
          <View style={styles.identityTile}>
            <Text style={styles.identityInitials}>{initialsOf(profile?.full_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityName} numberOfLines={1}>
              {profile?.full_name || 'Your profile'}
            </Text>
            <Kicker size={fontSize.caption} tone="onNavy">
              {[role, player?.primary_position, player?.overall_rating != null ? `rating ${player.overall_rating}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Kicker>
          </View>
          <Feather name="chevron-right" size={16} color={colors.accentOnNavy} />
        </Pressable>

        <Kicker style={styles.groupLabel}>Account</Kicker>
        <View style={styles.list}>
          {accountRows.map((r) => (
            <Pressable key={r.title} style={styles.row} onPress={r.onPress}>
              <Feather name={r.icon} size={17} color={colors.textBody} style={{ width: 24 }} />
              <Text style={styles.rowText}>{r.title}</Text>
              <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
            </Pressable>
          ))}
        </View>

        <Kicker style={styles.groupLabel}>Preferences</Kicker>
        <View style={styles.list}>
          {preferenceRows.map((r) => (
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    content: { padding: 20, paddingTop: 8 },
    list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden', marginBottom: 20 },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.primaryDark,
      borderRadius: radii.lg,
      padding: 14,
      marginBottom: spacing.xl,
    },
    identityTile: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityInitials: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.primaryDark },
    identityName: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.white },
    groupLabel: { marginBottom: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
    dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, marginTop: 10 },
  });
}
