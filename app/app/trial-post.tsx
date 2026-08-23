import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
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
import { Chip } from '../src/components/Chip';
import { Kicker } from '../src/components/Kicker';
import { NoticeBox } from '../src/components/NoticeBox';
import { Button } from '../src/components/Button';
import { useSessionStore } from '../src/store/useSessionStore';
import * as trialsRepository from '../src/repositories/trialsRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 30 TRIAL POSTING.
//
//   "Post a trial"                                             DRAFT
//   1 · COVER PHOTO      [CHANGE]
//   2 · WHAT             "U19 Open Trial"
//   3 · WHEN & WHERE     14 Sep · 08:00 · Kasarani Stadium, Nairobi
//   4 · WHO              [RB] [CM] [ST] [+ Position]
//   5 · ENTRY FEE        "Free entry — locked"
//                        "Matobev does not allow clubs to charge players."
//   [Preview]  [Publish trial]
//
// -- SECTION 5 IS A RULE, NOT A FIELD --
//
// The canvas draws entry fee as permanently locked to free, with the reason
// printed underneath. That is the platform's central safety promise: the whole
// trial-fraud problem this app exists around is clubs and fake scouts charging
// young players to attend. Screen 18 tells players "never pay to attend a
// trial"; this is the other half of that promise, and it would be worthless if
// a club could type a number here.
//
// So there is no fee input at all -- not a disabled one, which would imply the
// field exists and might one day be filled. The trials table has no fee column
// either. The rule is structural.
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

export default function TrialPost() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [positions, setPositions] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const canPublish =
    title.trim().length > 2 && location.trim().length > 1 && !!trialDate && !!deadline;

  const toggle = (p: string) =>
    setPositions((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const publish = async () => {
    if (!canPublish || publishing || !userId) return;
    setPublishing(true);
    try {
      await trialsRepository.createTrial({
        scoutId: userId,
        title: title.trim(),
        club: useSessionStore.getState().club?.name ?? '',
        location: location.trim(),
        positions,
        trialDate,
        applicationDeadline: deadline,
        ageMin: ageMin ? Number(ageMin) : undefined,
        ageMax: ageMax ? Number(ageMax) : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['clubTrials'] });
      await queryClient.invalidateQueries({ queryKey: ['clubHome'] });
      router.back();
    } catch (e) {
      showAlert('Could not publish', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Post a trial</Text>
          <Kicker>Draft</Kicker>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Section n={1} label="What" styles={styles}>
            <Field label="Trial name" value={title} onChangeText={setTitle} placeholder="U19 Open Trial" />
          </Section>

          <Section n={2} label="When & where" styles={styles}>
            <View style={styles.pair}>
              <Field
                label="Trial date"
                value={trialDate}
                onChangeText={setTrialDate}
                placeholder="YYYY-MM-DD"
                style={{ flex: 1 }}
              />
              <Field
                label="Apply by"
                value={deadline}
                onChangeText={setDeadline}
                placeholder="YYYY-MM-DD"
                style={{ flex: 1 }}
              />
            </View>
            <Field
              label="Venue"
              value={location}
              onChangeText={setLocation}
              placeholder="Kasarani Stadium, Nairobi"
            />
          </Section>

          <Section n={3} label="Who" styles={styles}>
            <View style={styles.chips}>
              {POSITIONS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  variant={positions.includes(p) ? 'filled' : 'muted'}
                  selected={positions.includes(p)}
                  onPress={() => toggle(p)}
                />
              ))}
            </View>
            <View style={styles.pair}>
              <Field
                label="Age from"
                value={ageMin}
                onChangeText={setAgeMin}
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
              <Field
                label="Age to"
                value={ageMax}
                onChangeText={setAgeMax}
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
            </View>
          </Section>

          <Section n={4} label="Entry fee" styles={styles}>
            <View style={styles.lockedRow}>
              <Feather name="lock" size={16} color={colors.success} />
              <Text style={styles.lockedText}>Free entry — locked</Text>
            </View>
            <NoticeBox tone="success" icon="shield" style={{ marginTop: spacing.sm }}>
              Matobev does not allow clubs to charge players to attend a trial. This cannot be
              changed.
            </NoticeBox>
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Publish trial"
            variant="navy"
            loading={publishing}
            disabled={!canPublish}
            onPress={publish}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({
  n,
  label,
  styles,
  children,
}: {
  n: number;
  label: string;
  styles: ReturnType<typeof makeStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Kicker style={styles.sectionLabel}>
        {n} · {label}
      </Kicker>
      <View style={{ gap: spacing.lg }}>{children}</View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: cx(18),
    },
    title: {
      flex: 1,
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    section: { marginTop: spacing.xl },
    sectionLabel: { marginBottom: spacing.sm },
    pair: { flexDirection: 'row', gap: spacing.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    lockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.successTint,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    lockedText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.success,
    },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
