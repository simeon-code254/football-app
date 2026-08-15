import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';

export default function AccountSettings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const email = useSessionStore((s) => s.session?.user.email);
  const role = useSessionStore((s) => s.role);

  const rows = [
    {
      icon: 'edit-2' as const,
      title: 'Edit Profile',
      sub: 'Name, photo, bio, and other details',
      onPress: () => router.push({ pathname: '/profile-complete', params: { mode: 'edit' } }),
    },
    {
      icon: 'lock' as const,
      title: 'Change Password',
      sub: 'Update your password or sign out of all devices',
      onPress: () => router.push('/security-settings'),
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Signed in as</Text>
        <View style={styles.emailCard}>
          <Feather name="mail" size={16} color={colors.textMuted} />
          <Text style={styles.emailText}>{email ?? '—'}</Text>
        </View>
        {role && (
          <Text style={styles.roleNote}>
            Account type: <Text style={styles.roleValue}>{role === 'scout' ? 'Scout' : 'Player'}</Text>
          </Text>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Manage</Text>
        <View style={styles.list}>
          {rows.map((r, i) => (
            <Pressable key={r.title} style={[styles.row, i < rows.length - 1 && styles.rowBorder]} onPress={r.onPress}>
              <View style={styles.rowIcon}>
                <Feather name={r.icon} size={17} color={colors.textBody} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.title}</Text>
                <Text style={styles.rowSub}>{r.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
    content: { padding: 20 },
    sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    emailCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 14 },
    emailText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textPrimary },
    roleNote: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 10 },
    roleValue: { fontFamily: fontFamily.semiBold, color: colors.textBody },
    list: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowIcon: { width: 28, alignItems: 'center' },
    rowTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
    rowSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  });
}
