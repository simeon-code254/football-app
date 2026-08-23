import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  cx,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Field, SelectRow } from '../src/components/Field';
import { Chip } from '../src/components/Chip';
import { Kicker } from '../src/components/Kicker';
import { NoticeBox, ProgressSteps } from '../src/components/NoticeBox';
import { Button } from '../src/components/Button';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 47 SCOUT PATH · ORG (step 2 of 4).
//
//   "Who do you scout for?"
//   ORGANISATION      Elite Scouting Ltd
//   ROLE              Independent scout ▾
//   REGIONS COVERED   [East Africa] [Kenya] [+ Add]
//   "Players see your organisation before they reply. Verified scouts get
//    replies 4× more often."
//   [Continue to ID check]
//
// -- ONE CLAIM DROPPED --
//
// "Verified scouts get replies 4× more often" is a measured statistic about
// this platform, and nothing measures it: `conversations` records no reply
// rate. The first half of that sentence is kept because it is simply true --
// the organisation is shown on every message -- and the second is replaced
// with what verification actually does, which is stronger and checkable.
const ROLES = ['Independent scout', 'Club scout', 'Agency scout', 'Academy staff'];

const REGIONS = [
  'East Africa',
  'West Africa',
  'Southern Africa',
  'North Africa',
  'Central Africa',
  'Europe',
];

export default function ScoutOnboarding() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const hydrate = useSessionStore((s) => s.hydrate);
  const session = useSessionStore((s) => s.session);

  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canContinue = organization.trim().length > 1 && !!role;

  const toggleRegion = (r: string) =>
    setRegions((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const submit = async () => {
    if (!canContinue || saving || !userId) return;
    setSaving(true);
    try {
      await profileRepository.updateScout(userId, {
        organization: organization.trim(),
        // `scouts` has no role or regions column; the role goes into the bio
        // line players actually see rather than being dropped silently, and
        // regions are a scouting preference, stored where search reads them.
        bio: role ? `${role}${regions.length ? ` · ${regions.join(', ')}` : ''}` : undefined,
      });
      await hydrate(session);
      router.replace('/scout-verification');
    } catch (e) {
      showAlert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ProgressSteps step={2} total={4} />
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Who do you scout for?
          </Text>

          <View style={styles.fields}>
            <Field
              label="Organisation"
              value={organization}
              onChangeText={setOrganization}
              autoCapitalize="words"
              placeholder="Elite Scouting Ltd"
            />
            <SelectRow
              label="Role"
              value={role}
              placeholder="Choose one"
              onPress={() =>
                showAlert('Your role', 'Pick the closest description.', [
                  ...ROLES.map((r) => ({ text: r, onPress: () => setRole(r) })),
                  { text: 'Cancel', style: 'cancel' as const },
                ])
              }
            />

            <View>
              <Kicker style={{ marginBottom: spacing.sm }}>Regions covered</Kicker>
              <View style={styles.chips}>
                {REGIONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    variant={regions.includes(r) ? 'filled' : 'muted'}
                    selected={regions.includes(r)}
                    onPress={() => toggleRegion(r)}
                  />
                ))}
              </View>
            </View>
          </View>

          <NoticeBox style={styles.notice}>
            Players see your organisation before they reply. Verification is what lets you see and
            message anyone under 18 at all.
          </NoticeBox>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Continue to ID check"
            variant="navy"
            loading={saving}
            disabled={!canContinue}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: cx(22), paddingBottom: spacing.xl },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    fields: { gap: spacing.lg, marginTop: spacing.xl },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    notice: { marginTop: spacing.xl },
    footer: { paddingHorizontal: cx(22), paddingBottom: spacing.md },
  });
}
