import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { images } from '../src/constants/images';
import { useSessionStore, type Role } from '../src/store/useSessionStore';

// Matches Matobev v4.dc.html's LOGIN block — given a hero photo (the mockup
// had none on this screen, which read as bare) and a password visibility
// toggle, which a static HTML mockup can't express. There's no backend yet
// to tell us which role an account has, so login includes a lightweight
// "continue as" toggle — a real build replaces this with the role read off
// the authenticated user record.
export default function Login() {
  const [role, setRoleLocal] = useState<Role>('player');
  const setRole = useSessionStore((s) => s.setRole);
  const setScoutVerified = useSessionStore((s) => s.setScoutVerified);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={{ uri: images.authHero }} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient colors={['rgba(10,22,40,0.15)', 'rgba(10,22,40,0.75)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTop}>
          <IconButton icon="chevron-left" light onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        <View style={styles.roleToggle}>
          {(['player', 'scout'] as const).map((r) => {
            const active = role === r;
            return (
              <Pressable key={r} style={[styles.roleOption, active && styles.roleOptionActive]} onPress={() => setRoleLocal(r)}>
                <Text style={[styles.roleOptionText, active && styles.roleOptionTextActive]}>
                  Continue as {r === 'player' ? 'Player' : 'Scout'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fields}>
          <AppTextField label="Email" icon="mail" placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <AppTextField label="Password" icon="lock" placeholder="Enter password" isPassword />
        </View>

        <Pressable style={styles.forgotRow} onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn}>
            <AntDesign name="google" size={20} color="#EA4335" />
          </Pressable>
          <Pressable style={styles.socialBtn}>
            <AntDesign name="apple" size={20} color="#000" />
          </Pressable>
        </View>

        <PrimaryButton
          label="Sign In"
          onPress={() => {
            setRole(role);
            if (role === 'scout') {
              setScoutVerified(true);
              router.replace('/(scout-tabs)/home');
            } else {
              router.replace('/(player-tabs)/home');
            }
          }}
          style={styles.submitBtn}
        />

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Text style={styles.signupLink} onPress={() => router.push('/welcome')}>
            Sign Up
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 180 },
  heroImage: { width: '100%', height: '100%' },
  heroTop: { position: 'absolute', top: 8, left: 20 },
  content: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 32, flexGrow: 1 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.displayLg, color: colors.textPrimary, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginBottom: 28 },
  roleToggle: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, padding: 4, marginBottom: 20 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: radii.pill, alignItems: 'center' },
  roleOptionActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  roleOptionText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
  roleOptionTextActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  fields: { gap: 14, marginBottom: 12 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 24 },
  forgotText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.primary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divider: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: '#9CA3AF' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1,
    height: 46,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: { marginTop: 'auto' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  signupText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  signupLink: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.primary },
});
