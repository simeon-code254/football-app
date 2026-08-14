import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';
import { showAlert } from '../src/lib/alert';

export default function SecuritySettings() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const clearSession = useSessionStore((s) => s.clear);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const changePassword = async () => {
    if (newPassword.length < 6) {
      showAlert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("Passwords don't match", 'Re-enter both fields to match.');
      return;
    }
    setChanging(true);
    try {
      await authRepository.changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showAlert('Password updated', 'Your password has been changed.');
    } catch (err) {
      showAlert('Could not change password', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setChanging(false);
    }
  };

  const confirmSignOutAll = () => {
    showAlert(
      'Sign Out of All Devices',
      'This ends every active session on every device, including this one. You\'ll need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out Everywhere', style: 'destructive', onPress: signOutAll },
      ]
    );
  };

  const signOutAll = async () => {
    setSigningOutAll(true);
    try {
      await authRepository.signOutAllDevices();
      clearSession();
      router.replace('/welcome');
    } catch (err) {
      setSigningOutAll(false);
      showAlert('Could not sign out', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Change Password</Text>
        <View style={styles.card}>
          <AppTextField
            label="New password"
            icon="lock"
            isPassword
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <View style={{ height: 12 }} />
          <AppTextField
            label="Confirm new password"
            icon="lock"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />
          <PrimaryButton
            label={changing ? 'Updating…' : 'Update Password'}
            onPress={changePassword}
            disabled={changing || !newPassword || !confirmPassword}
            style={{ marginTop: 16 }}
            height={46}
          />
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Sessions</Text>
        <Pressable style={styles.dangerCard} onPress={confirmSignOutAll} disabled={signingOutAll}>
          <Feather name="log-out" size={17} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>{signingOutAll ? 'Signing out…' : 'Sign Out of All Devices'}</Text>
            <Text style={styles.dangerSub}>Revokes every active session, not just this one.</Text>
          </View>
        </Pressable>
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
    sectionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    card: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16 },
    dangerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.dangerTint,
      borderRadius: radii.lg,
      padding: 16,
    },
    dangerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.error },
    dangerSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  });
}
