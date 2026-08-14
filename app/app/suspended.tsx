import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, spacing, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as authRepository from '../src/repositories/authRepository';

// Reached only via _layout.tsx's suspension gate (router.replace, never a
// normal push) whenever a signed-in user's profile.is_active is false.
// Real UI-level lockout: every other route redirects back here on render.
// Doesn't block writes at the RLS layer (a much larger, separate change),
// just stops the app from being usable through this UI.
export default function Suspended() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const profile = useSessionStore((s) => s.profile);
  const clearSession = useSessionStore((s) => s.clear);

  const signOut = async () => {
    await authRepository.signOut();
    clearSession();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Feather name="slash" size={32} color={colors.error} />
        </View>
        <Text style={styles.title}>Account Suspended</Text>
        <Text style={styles.body}>
          {profile?.suspended_reason ||
            'Your account has been suspended by an administrator. Contact support if you believe this is a mistake.'}
        </Text>
        <PrimaryButton label="Sign Out" onPress={signOut} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  button: { marginTop: 32, width: '100%' },
  });
}
