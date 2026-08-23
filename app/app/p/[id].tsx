import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Button, LinkButton } from '../../src/components/Button';
import { QueryState } from '../../src/components/QueryState';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';

// Canvas screen 44 DEEP LINK · SHARED PROFILE.
//
//   navy cover, gold initials tile
//   "Simeon Odhiambo"
//   "RB · KENYA · 78 OVR"
//   "Shared from Matobev · sign up to see full attributes and footage"
//   [Open in app]
//
// The short `/p/<id>` route is the shareable one -- it is what the Share
// button on screen 17 produces, so it has to be short and it has to work for
// someone with no account.
//
// -- WHY THIS SHOWS SO LITTLE --
//
// Name, position, country and overall only. The canvas says as much in its own
// copy ("sign up to see full attributes and footage"), but this is enforced by
// the database rather than by the copy: RLS (players_restrict_public_select,
// protect_minors_from_anon) will not return a minor's row to an unauthenticated
// caller at all. So for a shared under-18 profile this screen legitimately
// renders nothing but the sign-up prompt -- that is the privacy rule working,
// not a bug to route around.
export default function SharedProfile() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const signedIn = useSessionStore((s) => s.status) === 'signed-in';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sharedProfile', id],
    enabled: !!id,
    queryFn: () => profileRepository.getPlayerPublicView(id!),
  });

  const initials = (data?.full_name ?? '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          isEmpty={!data}
          emptyIcon="lock"
          emptyMessage="This profile is only visible to verified scouts and clubs."
        >
          <View style={styles.tile}>
            <Text style={styles.tileText}>{initials}</Text>
          </View>
          <Text style={styles.name} maxFontSizeMultiplier={1.3}>
            {data?.full_name ?? 'Player'}
          </Text>
          <Kicker style={styles.meta}>
            {[
              data?.primary_position,
              data?.nationality_name,
              data?.overall_rating != null ? `${data.overall_rating} OVR` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Kicker>
          <Text style={styles.pitch}>
            Shared from Matobev · sign up to see full attributes and footage
          </Text>
        </QueryState>

        <View style={{ flex: 1 }} />

        <Button
          label={signedIn ? 'Open in app' : 'Create a free account'}
          variant="navy"
          onPress={() =>
            signedIn && id
              ? router.replace({ pathname: '/player/[id]', params: { id } })
              : router.replace('/role-select')
          }
        />
        {!signedIn && (
          <LinkButton
            label="I already have an account"
            tone="onPaper"
            onPress={() => router.replace('/login')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, alignItems: 'center', paddingHorizontal: cx(24), paddingTop: cx(48) },
    tile: {
      width: cx(58),
      height: cx(58),
      borderRadius: radii.xl,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.heading,
      color: colors.primaryDark,
    },
    name: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
      marginTop: spacing.lg,
    },
    meta: { marginTop: 4 },
    pitch: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      lineHeight: fontSize.bodySm * 1.45,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
}
