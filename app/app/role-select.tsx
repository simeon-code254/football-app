import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';

type Role = 'player' | 'scout';

const ROLES: { key: Role; label: string; icon: React.ComponentProps<typeof Feather>['name']; description: string }[] = [
  {
    key: 'player',
    label: 'PLAYER',
    icon: 'user',
    description:
      'Showcase your football talent, upload highlight videos, get AI-powered performance analysis, and connect with scouts worldwide.',
  },
  {
    key: 'scout',
    label: 'SCOUT',
    icon: 'search',
    description:
      'Find talented players, evaluate AI performance reports, create trials, build scouting shortlists, and contact players directly.',
  },
];

// Matches Matobev v4.dc.html's ROLE SELECTION block.
export default function RoleSelect() {
  const [selected, setSelected] = useState<Role | null>(null);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.sub}>Choose how you'll use Matobev</Text>

        {ROLES.map((role) => {
          const isSelected = selected === role.key;
          return (
            <Pressable
              key={role.key}
              onPress={() => setSelected(role.key)}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? '#F0F5FF' : colors.surface,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconChip, { backgroundColor: isSelected ? '#E0EAFF' : colors.surfaceMuted }]}>
                  <Feather name={role.icon} size={22} color={isSelected ? colors.primary : '#9CA3AF'} />
                </View>
                <Text style={styles.cardTitle}>{role.label}</Text>
              </View>
              <Text style={styles.cardBody}>{role.description}</Text>
            </Pressable>
          );
        })}

        <PrimaryButton
          label={selected ? `Continue as ${selected === 'player' ? 'Player' : 'Scout'}` : 'Continue'}
          onPress={() => selected && router.push({ pathname: '/signup', params: { role: selected } })}
          disabled={!selected}
          style={styles.continueBtn}
        />

        <Pressable onPress={() => router.push('/login')} style={styles.loginRow}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 4 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary, marginBottom: 4 },
  sub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginBottom: 28 },
  card: { borderRadius: radii.xl, borderWidth: 2, padding: 20, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconChip: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  cardBody: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 20 },
  continueBtn: { marginTop: 12 },
  loginRow: { marginTop: 14, alignItems: 'center' },
  loginText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  loginLink: { color: colors.primary, fontFamily: fontFamily.semiBold },
});
