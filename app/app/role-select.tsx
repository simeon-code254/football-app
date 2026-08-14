import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { images } from '../src/constants/images';

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

// Matches Matobev v4.dc.html's ROLE SELECTION block — given a hero photo (the
// mockup had none on this screen, which read as bare white space up top).
export default function RoleSelect() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [selected, setSelected] = useState<Role | null>(null);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.hero}>
        <Image source={{ uri: images.onboardSlide3 }} style={styles.heroImage} contentFit="cover" />
        <LinearGradient colors={['rgba(10,22,40,0.1)', 'rgba(10,22,40,0.7)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTop}>
          <IconButton icon="chevron-left" light accessibilityLabel="Go back" onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                  backgroundColor: isSelected ? colors.infoTint : colors.surface,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconChip, { backgroundColor: isSelected ? '#E0EAFF' : colors.surfaceMuted }]}>
                  <Feather name={role.icon} size={22} color={isSelected ? colors.primary : colors.textDisabled} />
                </View>
                <Text style={styles.cardTitle}>{role.label}</Text>
              </View>
              <Text style={styles.cardBody}>{role.description}</Text>
            </Pressable>
          );
        })}

        <PrimaryButton
          label={selected ? `Continue as ${selected === 'player' ? 'Player' : 'Scout'}` : 'Continue'}
          onPress={() => {
            if (!selected) return;
            router.push({ pathname: '/signup', params: { role: selected } });
          }}
          disabled={!selected}
          style={styles.continueBtn}
        />

        <Pressable onPress={() => router.push('/login')} style={styles.loginRow}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 150 },
  heroImage: { width: '100%', height: '100%' },
  heroTop: { position: 'absolute', top: 8, left: 20 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32 },
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
}
