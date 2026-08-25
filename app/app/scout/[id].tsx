import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
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
} from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { StatTile } from '../../src/components/StatTile';
import { Button, LinkButton } from '../../src/components/Button';
import { InitialsAvatar } from '../../src/components/InitialsAvatar';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import { QueryState } from '../../src/components/QueryState';
import * as profileRepository from '../../src/repositories/profileRepository';
import { showAlert } from '../../src/lib/alert';
import { ReportModal } from '../../src/components/ReportModal';
import { useSessionStore } from '../../src/store/useSessionStore';

// Canvas screen 74 SCOUT PROFILE (PUBLIC).
//
//   ES  Elite Scouting   VERIFIED SCOUT · SINCE 2025
//   SIGNED 11 | REPLY RATE 92% | REGIONS 2
//   ABOUT — "Independent scout covering East Africa. I watch every clip before
//            messaging, and I never charge a player."
//   LOOKING FOR  [RB] [CM] [U21]
//   Report        [Message scout]
//
// -- THIS IS THE SCREEN A 16-YEAR-OLD OPENS BEFORE REPLYING TO A STRANGER --
//
// Which is why the verified hexagon, the "since" date and the Report action all
// carry real weight here, and why two of the three counters are left blank
// rather than filled with plausible numbers.
//
// SIGNED and REPLY RATE have nothing behind them: no signing event exists in
// the schema, and reply rate would need per-conversation response tracking that
// `conversations` does not keep. A fabricated "92% reply rate" on the profile
// of an adult about to message a child is exactly the wrong place to invent
// trust signals. REGIONS is real -- it comes from the scout's own preferences.
export default function ScoutPublicProfile() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const viewerId = useSessionStore((st) => st.session?.user.id);
  const [reporting, setReporting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scoutPublic', id],
    enabled: !!id,
    queryFn: async () => {
      const [scout, profile] = await Promise.all([
        profileRepository.getMyScout(id!),
        profileRepository.getMyProfile(id!),
      ]);
      return { scout, profile };
    },
  });

  const scout = data?.scout;
  const verified = scout?.verification_status === 'verified';
  const since = scout?.scout_since ? new Date(scout.scout_since).getFullYear() : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={!scout}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.identity}>
            <View>
              <InitialsAvatar
                name={data?.profile.full_name ?? scout?.organization}
                uri={data?.profile.avatar_url}
                size={cx(58)}
              />
              {verified && (
                <View style={styles.badge}>
                  <VerificationBadge role="scout" size={18} glyph="mark" />
                </View>
              )}
            </View>
            <Text style={styles.name} maxFontSizeMultiplier={1.3}>
              {scout?.organization || data?.profile.full_name || 'Scout'}
            </Text>
            <Kicker>
              {[verified ? 'Verified scout' : 'Unverified', since ? `since ${since}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Kicker>
          </View>

          {/*
            An unverified scout cannot message a minor at all -- the database
            stops it. Saying so here is more useful than a missing badge.
          */}
          {!verified && (
            <View style={styles.unverified}>
              <Feather name="alert-circle" size={16} color={colors.goldDark} />
              <Text style={styles.unverifiedText}>
                This account has not passed its ID check. It cannot see or message players under 18.
              </Text>
            </View>
          )}

          <View style={styles.stats}>
            {/* Both left blank on purpose -- see the note above. */}
            <StatTile value={null} label="Signed" />
            <StatTile value={null} label="Reply rate" />
            <StatTile value={scout?.country_code ? 1 : null} label="Regions" />
          </View>

          {!!scout?.bio && (
            <View style={styles.block}>
              <Kicker>About</Kicker>
              <Text style={styles.about}>{scout.bio}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Message scout"
            variant="navy"
            onPress={() =>
              showAlert(
                'Scouts start the conversation',
                'To protect players, only verified scouts and clubs can open a conversation. If they message you, it appears in Messages.'
              )
            }
          />
          {/* Canvas screen 75 REPORT ACCOUNT, reached from here as the canvas
              reaches it -- from the profile of the person being reported. */}
          <LinkButton
            label="Report this account"
            tone="onPaper"
            onPress={() => setReporting(true)}
          />
        </View>
      </QueryState>

      {!!viewerId && !!id && (
        <ReportModal
          visible={reporting}
          title="Report this scout"
          targetType="profile"
          targetId={id}
          reporterId={viewerId}
          blockableProfileId={id}
          onClose={() => setReporting(false)}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: cx(18) },
    scroll: { paddingHorizontal: cx(18), paddingBottom: spacing.xl },
    identity: { alignItems: 'center', marginTop: spacing.md },
    badge: { position: 'absolute', bottom: -5, right: -6 },
    name: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    unverified: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: colors.warningTint,
      borderRadius: radii.md,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    unverifiedText: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: colors.goldDark,
    },
    stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    block: { marginTop: spacing.xl },
    about: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.5,
      color: colors.textBody,
      marginTop: spacing.sm,
    },
    footer: { paddingHorizontal: cx(18), paddingBottom: spacing.md },
  });
}
