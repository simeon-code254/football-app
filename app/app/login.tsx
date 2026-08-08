import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, AntDesign } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';

// Matches Matobev v4.dc.html's LOGIN block.
export default function Login() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.sub}>Sign in to continue</Text>

        <View style={styles.fields}>
          <AppTextField label="Email" icon="mail" placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <AppTextField label="Password" icon="lock" placeholder="Enter password" secureTextEntry />
        </View>

        <Pressable style={styles.forgotRow}>
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

        <PrimaryButton label="Sign In" onPress={() => router.replace('/(tabs)/home')} style={styles.submitBtn} />

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
  header: { paddingHorizontal: 20, paddingTop: 4 },
  content: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, flexGrow: 1 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.displayLg, color: colors.textPrimary, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginBottom: 28 },
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
