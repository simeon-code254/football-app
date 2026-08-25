import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
  useIsDark,
  elevation,
} from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { StatTile } from '../../src/components/StatTile';
import { DeadlinePill } from '../../src/components/DeadlinePill';
import { Button } from '../../src/components/Button';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import { QueryState } from '../../src/components/QueryState';
import * as clubsRepository from '../../src/repositories/clubsRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';

// Canvas screen 54 CLUB PROFILE (PUBLIC).
//
//   navy cover, gold crest tile, "Nairobi FC"
//   "VERIFIED · KPL · EST. 1996"
//   TRIALS 3 | SIGNED 7 | FOLLOWERS 4.1k
//   ABOUT
//   OPEN TRIALS -> [APPLY]
//   [Follow club]
//
// -- TWO COUNTERS THE CANVAS SHOWS THAT THIS DOES NOT --
//
// SIGNED and FOLLOWERS. Nothing records either: there is no signing event in
// the schema, and `follows` is player-to-player with no club side. Both render
// an em dash rather than a number, which StatTile is built for. Inventing "7
// signed" on a public club page would be a marketing claim the database cannot
// support, and a player choosing which trial to travel to might act on it.
export default function ClubPublicProfile() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clubPublic', id],
    enabled: !!id,
    queryFn: async () => {
      const [club, trialsPage] = await Promise.all([
        clubsRepository.getClub(id!),
        trialsRepository.listMyTrials(id!, { pageSize: 20 }),
      ]);
      return { club, trials: trialsPage.items.filter((t) => t.status === 'open') };
    },
  });

  const club = data?.club;
  const verified = club?.verification_status === 'verified';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient id="clubGlow" cx="85%" cy="0%" r="58%">
                <Stop offset="0" stopColor="#FFC53D" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#FFC53D" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#clubGlow)" />
          </Svg>
          <SafeAreaView edges={['top']}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityLabel="Go back"
              style={styles.back}
            >
              <Feather name="chevron-left" size={22} color={colors.white} />
            </Pressable>
          </SafeAreaView>
        </View>

        <QueryState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={!club}>
          <View style={styles.identity}>
            <View style={[styles.crest, elevation('raised', isDark)]}>
              <Text style={styles.crestText}>{initials(club?.name)}</Text>
              {verified && (
                <View style={styles.crestBadge}>
                  <VerificationBadge role="club" size={18} glyph="mark" />
                </View>
              )}
            </View>
            <Text style={styles.name} maxFontSizeMultiplier={1.3}>
              {club?.name ?? 'Club'}
            </Text>
            <Kicker>
              {[verified ? 'Verified' : null, club?.league, club?.founded ? `est. ${club.founded}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Kicker>
          </View>

          <View style={styles.stats}>
            <StatTile value={data?.trials.length ?? 0} label="Open trials" />
            {/* Nothing records signings or club followers -- see the note above. */}
            <StatTile value={null} label="Signed" />
            <StatTile value={null} label="Followers" />
          </View>

          {!!club?.about && (
            <View style={styles.block}>
              <Kicker>About</Kicker>
              <Text style={styles.about}>{club.about}</Text>
            </View>
          )}

          <View style={styles.block}>
            <Kicker>Open trials</Kicker>
            <View style={styles.trials}>
              {(data?.trials ?? []).map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.trialRow}
                  onPress={() => router.push({ pathname: '/trial/[id]', params: { id: t.id } })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trialTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Kicker size={fontSize.caption}>
                      {[t.trial_date, t.location].filter(Boolean).join(' · ')}
                    </Kicker>
                  </View>
                  <DeadlinePill deadline={t.application_deadline} />
                </Pressable>
              ))}
              {!data?.trials.length && (
                <Text style={styles.empty}>No open trials right now.</Text>
              )}
            </View>
          </View>
        </QueryState>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Follow club"
          variant="navy"
          onPress={() =>
            router.push({ pathname: '/club/[id]', params: { id: id ?? '' } })
          }
        />
      </View>
    </SafeAreaView>
  );
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: spacing.xl },
    cover: { height: cx(120), backgroundColor: colors.primaryDark, overflow: 'hidden' },
    back: { padding: spacing.md },
    identity: { alignItems: 'center', marginTop: -cx(30) },
    crest: {
      width: cx(64),
      height: cx(64),
      borderRadius: radii.xl,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crestBadge: { position: 'absolute', bottom: -5, right: -6 },
    crestText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.primaryDark,
    },
    name: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    stats: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: cx(16), marginTop: spacing.lg },
    block: { paddingHorizontal: cx(16), marginTop: spacing.xl },
    about: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: colors.textBody,
      marginTop: spacing.sm,
    },
    trials: { gap: spacing.sm, marginTop: spacing.sm },
    trialRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    trialTitle: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    empty: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
    footer: { paddingHorizontal: cx(16), paddingBottom: spacing.md },
  });
}
