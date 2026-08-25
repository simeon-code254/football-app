import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Field } from '../src/components/Field';
import { ProgressSteps } from '../src/components/NoticeBox';
import { Kicker } from '../src/components/Kicker';
import { Button } from '../src/components/Button';
import { useSessionStore } from '../src/store/useSessionStore';
import * as clubsRepository from '../src/repositories/clubsRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 49 CLUB PATH · DETAILS (step 2 of 4).
//
//   CLUB · STEP 2 OF 4
//   "Your club"
//   [CREST] "Upload your crest. It appears on every trial you post and every
//            message you send."
//   CLUB NAME / LEAGUE / FOUNDED / REGISTRATION NO.
//   [Continue to verification]
//
// -- REGISTRATION NUMBER IS THE ONE THAT MATTERS --
//
// It is what an admin checks against the league to grant the gold badge
// (screen 80: "Registration number checked against the league"). Everything
// else here is presentation; this field is the evidence. It is optional at
// this step because a club can finish signing up and supply it during
// verification, but the copy says what it is for so it is not mistaken for a
// vanity field.
export default function ClubOnboarding() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const clubId = useSessionStore((s) => s.session?.user.id);
  const hydrate = useSessionStore((s) => s.hydrate);
  const session = useSessionStore((s) => s.session);

  const [name, setName] = useState('');
  const [league, setLeague] = useState('');
  const [founded, setFounded] = useState('');
  const [registration, setRegistration] = useState('');
  const [saving, setSaving] = useState(false);

  const foundedValid =
    !founded || (/^\d{4}$/.test(founded) && Number(founded) >= 1850 && Number(founded) <= new Date().getFullYear());
  const canContinue = name.trim().length > 1 && foundedValid;

  const submit = async () => {
    if (!canContinue || saving || !clubId) return;
    setSaving(true);
    try {
      await clubsRepository.updateClub(clubId, {
        name: name.trim(),
        league: league.trim() || null,
        founded: founded ? Number(founded) : null,
        registration_no: registration.trim() || null,
      });
      await hydrate(session);
      router.replace('/checkout');
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
            Your club
          </Text>

          <Pressable
            style={styles.crestRow}
            onPress={() =>
              showAlert(
                'Crest upload',
                'Pick a square PNG or SVG, at least 512px. This is not wired to the picker yet — you can add it from Edit club profile once you are in.'
              )
            }
            accessibilityRole="button"
          >
            <View style={styles.crestBox}>
              <Feather name="upload" size={18} color={colors.textMuted} />
              <Kicker size={fontSize.caption} style={{ marginTop: 4 }}>
                Crest
              </Kicker>
            </View>
            <Text style={styles.crestHint}>
              Upload your crest. It appears on every trial you post and every message you send.
            </Text>
          </Pressable>

          <View style={styles.fields}>
            <Field label="Club name" value={name} onChangeText={setName} autoCapitalize="words" />
            <View style={styles.pair}>
              <Field
                label="League"
                value={league}
                onChangeText={setLeague}
                autoCapitalize="characters"
                style={{ flex: 1 }}
              />
              <Field
                label="Founded"
                value={founded}
                onChangeText={setFounded}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1996"
                error={foundedValid ? undefined : 'Enter a four-digit year.'}
                style={{ flex: 1 }}
              />
            </View>
            <Field
              label="Registration no."
              value={registration}
              onChangeText={setRegistration}
              autoCapitalize="characters"
              hint="Checked against the league when your gold badge is reviewed."
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Continue to verification"
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
    crestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xl },
    crestBox: {
      width: cx(58),
      height: cx(58),
      borderRadius: radii.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.borderDashed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crestHint: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: colors.textMuted,
    },
    fields: { gap: spacing.lg, marginTop: spacing.xl },
    pair: { flexDirection: 'row', gap: spacing.md },
    footer: { paddingHorizontal: cx(22), paddingBottom: spacing.md },
  });
}
