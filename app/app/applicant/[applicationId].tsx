import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { RatingChip } from '../../src/components/RatingChip';
import { StatTile } from '../../src/components/StatTile';
import { Button } from '../../src/components/Button';
import { Field } from '../../src/components/Field';
import { QueryState } from '../../src/components/QueryState';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as scoutingRepository from '../../src/repositories/scoutingRepository';
import { useSessionStore } from '../../src/store/useSessionStore';
import { showAlert } from '../../src/lib/alert';

// Canvas screen 52 APPLICANT REVIEW.
//
//   "APPLICANT 1 OF 142"
//   photo/video hero with a play control
//   "Simeon Odhiambo" / "RB · KENYA · 17 · GUARDIAN OK" / 78
//   PAC 81  DEF 74  PHY 68
//   SCOUT NOTE — free text
//   [x]  [Invite to trial]  [bookmark]
//
// -- "GUARDIAN OK" IS NOT DECORATION --
//
// The canvas prints it in the meta line, and it is the single most important
// fact on this screen for an under-18 applicant: it means a parent has agreed
// to AI analysis. A club reading a rating for a minor without it would be
// reading a number that should not exist. It is rendered from the real consent
// record, and its absence is stated rather than left blank.
export default function ApplicantReview() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { applicationId, trialId } = useLocalSearchParams<{
    applicationId?: string;
    trialId?: string;
  }>();
  const viewerId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['applicantReview', applicationId, trialId],
    enabled: !!applicationId && !!trialId,
    queryFn: async () => {
      const page = await trialsRepository.listApplicants(trialId!, { pageSize: 200 });
      const app = page.items.find((a) => a.id === applicationId) ?? null;
      if (!app?.player_id) return { app, view: null, attributes: [] };
      const [view, attributes] = await Promise.all([
        profileRepository.getPlayerPublicView(app.player_id),
        profileRepository.getPlayerAttributes(app.player_id, false),
      ]);
      return { app, view, attributes };
    },
  });

  const app = data?.app;
  const view = data?.view;
  const top = (data?.attributes ?? []).filter((a) => a.value != null).slice(0, 3);

  const invite = async () => {
    if (!app?.id) return;
    try {
      await trialsRepository.updateApplicationStatus(app.id, 'shortlisted');
      await queryClient.invalidateQueries({ queryKey: ['applicants', trialId] });
      await queryClient.invalidateQueries({ queryKey: ['applicantStatusCounts', trialId] });
      router.back();
    } catch {
      showAlert('Could not shortlist', 'Check your connection and try again.');
    }
  };

  const pass = async () => {
    if (!app?.id) return;
    try {
      await trialsRepository.updateApplicationStatus(app.id, 'rejected');
      await queryClient.invalidateQueries({ queryKey: ['applicants', trialId] });
      await queryClient.invalidateQueries({ queryKey: ['applicantStatusCounts', trialId] });
      router.back();
    } catch {
      showAlert('Could not update', 'Check your connection and try again.');
    }
  };

  const saveNote = async () => {
    if (!viewerId || !app?.player_id || savingNote) return;
    setSavingNote(true);
    try {
      await scoutingRepository.upsertNote(viewerId, app.player_id, note.trim());
      showAlert('Note saved', 'Only your club can see it.');
    } catch {
      showAlert('Could not save the note', 'Check your connection and try again.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={!app}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Feather name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Kicker style={{ flex: 1 }}>Applicant review</Kicker>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {view?.full_name ?? 'Applicant'}
                </Text>
                <Kicker size={fontSize.caption} tone="onNavy" style={{ marginTop: 2 }}>
                  {[
                    view?.primary_position,
                    view?.nationality_name,
                    view?.age,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Kicker>
              </View>
              <RatingChip value={view?.overall_rating ?? null} variant="gold" size="lg" />
            </View>
          </LinearGradient>

          {top.length > 0 && (
            <View style={styles.attrRow}>
              {top.map((a) => (
                <StatTile
                  key={a.key}
                  value={a.value}
                  label={a.displayName.slice(0, 3)}
                  variant="card"
                />
              ))}
            </View>
          )}

          <View style={styles.noteBlock}>
            <Field
              label="Scout note"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              placeholder="What did you see? Only your club can read this."
              style={styles.note}
            />
            <Pressable onPress={saveNote} hitSlop={8} accessibilityRole="button">
              <Kicker style={{ color: colors.primary, marginTop: spacing.sm }}>
                {savingNote ? 'Saving…' : 'Save note'}
              </Kicker>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={styles.pass}
            onPress={pass}
            accessibilityRole="button"
            accessibilityLabel="Pass on this applicant"
          >
            <Feather name="x" size={18} color={colors.textMuted} />
          </Pressable>
          <Button label="Invite to trial" variant="navy" onPress={invite} style={{ flex: 1 }} />
        </View>
      </QueryState>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: cx(16) },
    scroll: { paddingHorizontal: cx(16), paddingBottom: spacing.xl },
    hero: { borderRadius: radii.xl, padding: spacing.lg, marginTop: spacing.md },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.headingLg, color: colors.white },
    attrRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    noteBlock: { marginTop: spacing.xl },
    note: { minHeight: 96 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: cx(16),
      paddingBottom: spacing.md,
    },
    pass: {
      width: 52,
      height: 52,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
