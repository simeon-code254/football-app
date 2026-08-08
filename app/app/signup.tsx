import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, fontSize, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { Checkbox } from '../src/components/Checkbox';

// Matches Matobev v4.dc.html's SIGNUP FORM block, including the scout-only
// Organization/Club field.
export default function Signup() {
  const { role } = useLocalSearchParams<{ role?: 'player' | 'scout' }>();
  const isScout = role === 'scout';
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>{isScout ? 'Scout Sign Up' : 'Player Sign Up'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fields}>
          <AppTextField label="Full Name" icon="user" placeholder="Enter full name" />
          {isScout && (
            <AppTextField label="Organization / Club" icon="briefcase" placeholder="Club or organization name" />
          )}
          <AppTextField label="Email Address" icon="mail" placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <AppTextField label="Password" icon="lock" placeholder="Min 8 characters" secureTextEntry />
          <AppTextField label="Confirm Password" icon="lock" placeholder="Re-enter password" secureTextEntry />
        </View>

        <View style={styles.checks}>
          <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)}>
            I accept the <Text style={styles.link}>Terms & Conditions</Text>
          </Checkbox>
          <Checkbox checked={acceptedPrivacy} onToggle={() => setAcceptedPrivacy((v) => !v)}>
            I accept the <Text style={styles.link}>Privacy Policy</Text>
          </Checkbox>
        </View>

        <PrimaryButton
          label={`Create ${isScout ? 'Scout' : 'Player'} Account`}
          disabled={!acceptedTerms || !acceptedPrivacy}
          onPress={() => router.push('/verify-email')}
          style={styles.submitBtn}
        />
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text style={styles.loginLink} onPress={() => router.push('/login')}>
            Login
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, flexGrow: 1 },
  fields: { gap: 14, marginBottom: 16 },
  checks: { gap: 8, marginBottom: 20 },
  link: { color: colors.primary, fontFamily: fontFamily.medium },
  submitBtn: { marginTop: 'auto' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  loginText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  loginLink: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.primary },
});
